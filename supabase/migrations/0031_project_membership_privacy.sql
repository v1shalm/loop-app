-- 0031 — Project membership privacy fixes (stress-test follow-up to 0030).
--
-- After 0030, projects were nominally private but the project_members
-- INSERT policy allowed any workspace member to add themselves to any
-- project (gating only on workspace membership of the project's
-- workspace, not on existing project membership). This tightens that
-- so projects actually behave as private.
--
-- Also:
--   2) Guard create_project_for_me against empty / oversized names.
--   3) Safety net for any orphan projects (no project_members rows
--      after the 0030 backfill — would happen for legacy projects with
--      both team_id IS NULL and created_by IS NULL).
--
-- Idempotent and re-runnable.

begin;

-- 1) Tighten project_members INSERT: only existing project members can
--    add new members. The RPC create_project_for_me already bootstraps
--    the first member via SECURITY DEFINER, so the catch-22 (the
--    creator can't be the first member because they're not yet a
--    member) doesn't apply here.
drop policy if exists "project_members_insert" on public.project_members;
create policy "project_members_insert" on public.project_members
  for insert with check (app_private.is_project_member(project_id));

-- 2) Input validation on the RPC: name is required, max 60 chars
--    (same constraint the server action applies before calling it).
create or replace function public.create_project_for_me(
  p_name text,
  p_color text default null,
  p_emoji text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid     uuid := (select auth.uid());
  ws      uuid;
  new_id  uuid;
  trimmed text := btrim(coalesce(p_name, ''));
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;
  if trimmed = '' then
    raise exception 'Project name required';
  end if;
  if length(trimmed) > 60 then
    raise exception 'Project name too long';
  end if;

  select workspace_id into ws
  from public.workspace_members
  where user_id = uid
  limit 1;

  if ws is null then
    raise exception 'Not a workspace member';
  end if;

  insert into public.projects (workspace_id, name, color, emoji, created_by)
  values (ws, trimmed, p_color, p_emoji, uid)
  returning id into new_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_id, uid, 'admin');

  return new_id;
end;
$$;

grant execute on function public.create_project_for_me(text, text, text)
  to authenticated, service_role;

-- 3) Orphan-projects safety: any project that ended up with zero
--    project_members rows gets every workspace admin added as a
--    project admin. Prevents projects from being stranded
--    (visible to nobody, deletable by nobody).
insert into public.project_members (project_id, user_id, role)
select p.id, wm.user_id, 'admin'
from public.projects p
join public.workspace_members wm
  on wm.workspace_id = p.workspace_id
 and wm.role = 'admin'
where not exists (
  select 1 from public.project_members pm where pm.project_id = p.id
)
on conflict (project_id, user_id) do nothing;

commit;
