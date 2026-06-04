-- 0040 — add_team_member RPC (invite-from-database).
--
-- Lets a team admin / team manager / superadmin add an ALREADY-registered
-- person to a team directly (no email round-trip). Mirrors the create_*_for_me
-- pattern: a SECURITY DEFINER function validates the caller and inserts, so the
-- caller doesn't need a direct INSERT grant on team_members (the existing RLS
-- only allows a team admin, and the first-admin bootstrap).
--
-- The target must already be a member of the team's workspace (i.e. they've
-- signed in and landed in the lobby), which is the whole point of "invite from
-- the database" — you pick a known person rather than emailing a stranger.
--
-- Idempotent and re-runnable.

begin;

create or replace function public.add_team_member(
  p_team_id uuid,
  p_user_id uuid,
  p_role    text default 'member'
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := (select auth.uid());
  ws  uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_team_id is null or p_user_id is null then
    raise exception 'Team and user are required';
  end if;
  if p_role not in ('admin', 'member') then
    p_role := 'member';
  end if;

  -- Only a superadmin, a team admin, or a team manager may add members.
  if not (
    app_private.is_superadmin()
    or app_private.is_team_admin(p_team_id)
    or app_private.is_team_manager(p_team_id)
  ) then
    raise exception 'You do not have permission to add members to this team';
  end if;

  -- The target must already belong to the team's workspace (be registered).
  select workspace_id into ws from public.teams where id = p_team_id;
  if ws is null then raise exception 'Team not found'; end if;
  if not exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = p_user_id
  ) then
    raise exception 'That person is not in this workspace yet';
  end if;

  insert into public.team_members (team_id, user_id, role)
  values (p_team_id, p_user_id, p_role)
  on conflict (team_id, user_id) do nothing;
end;
$$;

grant execute on function public.add_team_member(uuid, uuid, text)
  to authenticated, service_role;

commit;
