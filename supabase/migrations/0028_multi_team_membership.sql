-- Multi-team membership + active-team switching.
--
-- The org model is being reworked so a "team" (department: Design,
-- Engineering, Marketing, ...) is the unit people join, and a person can
-- belong to MANY teams and switch between them. The single workspace
-- remains the implicit company boundary.
--
-- The old model baked "one team per user" into a unique index and into
-- my_team_id() (LIMIT 1). That index caused the invite-accept dead-end
-- ("You are already on another team"). This migration:
--
--   1. drops the one-team-per-user index (multi-membership),
--   2. adds team_active_selection — the team a user is currently viewing,
--   3. redefines app_private.my_team_id() to return that ACTIVE team
--      (falling back to any membership). Every existing RLS policy scopes
--      by `team_id = app_private.my_team_id()`, so switching the active
--      team re-scopes the whole app with NO policy changes,
--   4. backfills workspace_members from team_members so workspace-scoped
--      policies (comments, workspace visibility) hold for everyone,
--   5. rewrites accept_team_invitation to drop the one-team block and to
--      also add a workspace_members row + seed the active team.

begin;

-- 1) Multi-membership ---------------------------------------------------------
drop index if exists public.team_members_one_team_per_user;

-- 2) Active team (the "current workspace" the user is viewing) ----------------
create table if not exists public.team_active_selection (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.team_active_selection enable row level security;

-- A user manages only their own selection row. We don't validate team
-- membership here — my_team_id() ignores a selection the user isn't a
-- member of (and falls back), so a stale row is harmless. The app
-- validates membership before writing for good UX.
drop policy if exists "team_active_selection_self" on public.team_active_selection;
create policy "team_active_selection_self" on public.team_active_selection
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 3) my_team_id() now returns the ACTIVE team --------------------------------
create or replace function app_private.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    -- the active selection, but only if the user is still a member of it
    (
      select s.team_id
      from public.team_active_selection s
      join public.team_members m
        on m.team_id = s.team_id and m.user_id = s.user_id
      where s.user_id = (select auth.uid())
    ),
    -- otherwise the earliest team they joined
    (
      select team_id
      from public.team_members
      where user_id = (select auth.uid())
      order by joined_at
      limit 1
    )
  )
$$;

-- 4) Backfill workspace membership from team membership ----------------------
-- Anyone on a team must be a member of that team's workspace so the
-- workspace-scoped policies (task_comments, workspaces) resolve.
insert into public.workspace_members (workspace_id, user_id, role)
select distinct t.workspace_id, m.user_id, 'member'
from public.team_members m
join public.teams t on t.id = m.team_id
on conflict (workspace_id, user_id) do nothing;

-- 5) Accept-invite RPC: multi-membership + workspace row + active seed -------
create or replace function public.accept_team_invitation(t text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  inv record;
  current_uid uuid := (select auth.uid());
  current_email text;
  ws uuid;
begin
  if current_uid is null then
    raise exception 'Not signed in';
  end if;

  select * into inv from public.team_invitations where token = t;
  if not found then
    raise exception 'Invitation not found';
  end if;
  if inv.status <> 'pending' then
    raise exception 'Invitation is no longer pending';
  end if;
  if inv.expires_at < now() then
    raise exception 'Invitation has expired';
  end if;

  select email into current_email from auth.users where id = current_uid;
  if lower(current_email) <> lower(inv.email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  -- Multi-membership: joining a team no longer conflicts with other teams.
  -- (Idempotent — re-accepting is a no-op.)
  insert into public.team_members (team_id, user_id, role)
    values (inv.team_id, current_uid, inv.role)
    on conflict (team_id, user_id) do nothing;

  -- Make sure they can see the surrounding workspace (comments, etc.).
  select workspace_id into ws from public.teams where id = inv.team_id;
  if ws is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
      values (ws, current_uid, 'member')
      on conflict (workspace_id, user_id) do nothing;
  end if;

  -- If they had no active team yet, land them in the one they just joined.
  insert into public.team_active_selection (user_id, team_id)
    values (current_uid, inv.team_id)
    on conflict (user_id) do nothing;

  update public.team_invitations
    set status = 'accepted', accepted_at = now()
    where id = inv.id;

  return inv.team_id;
end;
$$;

grant execute on function public.accept_team_invitation(text)
  to authenticated, service_role;

commit;
