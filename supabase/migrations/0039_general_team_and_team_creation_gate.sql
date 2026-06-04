-- 0039 — Governance: shared "General" team + auto-join, admin-only team creation.
--
-- Part of the lobby model. Anyone who signs in lands in a shared, sandboxed
-- "General" team, so they are registered and never team-less — while creating
-- real teams is restricted to workspace admins + superadmins. Official teams
-- stay invite-only and isolated by the 0036 team wall.
--
-- Without the General auto-join, gating team creation would strand a brand-new
-- user at onboarding (no team, and not allowed to make one). The two changes
-- ship together for that reason.
--
-- Idempotent and re-runnable.

begin;

-- ============================================================
-- 1) Seed the shared General team in the default workspace
-- ============================================================
do $gen$
declare
  ws_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  if not exists (select 1 from public.workspaces where id = ws_id) then
    select id into ws_id from public.workspaces order by created_at limit 1;
  end if;
  if ws_id is null then return; end if;

  if not exists (
    select 1 from public.teams
    where workspace_id = ws_id and lower(name) = 'general'
  ) then
    insert into public.teams (workspace_id, name, color)
    values (ws_id, 'General', '#64748B');
  end if;
end
$gen$;

-- ============================================================
-- 2) New signups auto-join General (the lobby)
-- ============================================================
-- Redefines the 0022 trigger function: same profile + workspace bootstrap,
-- plus a membership row in the shared General team so every new account is
-- registered and never team-less. Real teams remain invite-only.
create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  display_name text;
  init_char    text;
  ws_id        uuid := '00000000-0000-0000-0000-000000000001';
  gen_id       uuid;
  palette      text[] := array[
    '#E8B4A0', '#B4D4E8', '#C4E8B4', '#E8D4B4',
    '#D4B4E8', '#E8C4B4', '#B4E8D4', '#E8E0B4'
  ];
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  init_char := upper(substring(display_name from 1 for 1));

  insert into public.profiles (id, name, initials, avatar_color)
  values (
    new.id,
    display_name,
    init_char,
    palette[1 + (abs(hashtext(new.id::text)) % array_length(palette, 1))]
  )
  on conflict (id) do nothing;

  if exists (select 1 from public.workspaces where id = ws_id) then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'member')
    on conflict do nothing;

    select id into gen_id from public.teams
      where workspace_id = ws_id and lower(name) = 'general'
      limit 1;
    if gen_id is not null then
      insert into public.team_members (team_id, user_id, role)
      values (gen_id, new.id, 'member')
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;
revoke execute on function app_private.handle_new_user() from public;

-- ============================================================
-- 3) Backfill: existing team-less members join General
-- ============================================================
-- Only members who belong to NO team are added, so this never touches people
-- already on a real team and is safe regardless of the multi-team constraint.
do $bf$
declare
  ws_id  uuid := '00000000-0000-0000-0000-000000000001';
  gen_id uuid;
begin
  if not exists (select 1 from public.workspaces where id = ws_id) then
    select id into ws_id from public.workspaces order by created_at limit 1;
  end if;
  if ws_id is null then return; end if;

  select id into gen_id from public.teams
    where workspace_id = ws_id and lower(name) = 'general' limit 1;
  if gen_id is null then return; end if;

  insert into public.team_members (team_id, user_id, role)
  select gen_id, wm.user_id, 'member'
  from public.workspace_members wm
  where wm.workspace_id = ws_id
    and not exists (
      select 1 from public.team_members tm where tm.user_id = wm.user_id
    )
  on conflict do nothing;
end
$bf$;

-- ============================================================
-- 4) Only workspace admins + superadmins can create teams
-- ============================================================
-- Replaces the 0009 "any signed-in user" rule. The General seed + signup
-- trigger run as the function/owner role and bypass this, so the lobby still
-- works; the create_project_for_me path is unaffected (projects, not teams).
drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams
  for insert
  with check (
    app_private.is_superadmin()
    or app_private.is_workspace_admin(workspace_id)
  );

commit;
