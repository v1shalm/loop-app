-- 0041 — Keep every member in at least the General team (no orphans).
--
-- Deleting a team (e.g. cleanup-teams.sql) can leave its members team-less.
-- Because real teams are invite-only and team creation is admin-only (0039), a
-- team-less non-admin would otherwise be stranded at onboarding. This:
--   1) adds an ensure_in_general() RPC the app calls on load to drop a
--      team-less member back into the shared General lobby, and
--   2) re-runs the General backfill to rescue anyone already orphaned.
--
-- Idempotent and re-runnable.

begin;

-- 1) On-demand: put the caller into General if they're team-less ---------------
create or replace function public.ensure_in_general()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid    uuid := (select auth.uid());
  ws     uuid := '00000000-0000-0000-0000-000000000001';
  gen_id uuid;
begin
  if uid is null then return; end if;
  if not exists (select 1 from public.workspaces where id = ws) then
    select id into ws from public.workspaces order by created_at limit 1;
  end if;
  if ws is null then return; end if;

  -- Only people who belong to this workspace, and only if they're on no team.
  if not exists (
    select 1 from public.workspace_members where workspace_id = ws and user_id = uid
  ) then
    return;
  end if;
  if exists (select 1 from public.team_members where user_id = uid) then
    return;
  end if;

  select id into gen_id from public.teams
    where workspace_id = ws and lower(name) = 'general' limit 1;
  if gen_id is null then return; end if;

  insert into public.team_members (team_id, user_id, role)
  values (gen_id, uid, 'member')
  on conflict do nothing;
end;
$$;

grant execute on function public.ensure_in_general() to authenticated, service_role;

-- 2) Rescue anyone cleanup already orphaned -----------------------------------
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

commit;
