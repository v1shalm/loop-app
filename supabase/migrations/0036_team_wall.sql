-- 0036 — Team wall (layered over project membership).
--
-- Reinstates team-based separation that 0030 had dropped in favour of
-- pure project privacy. The new rule for a NON-superadmin:
--
--   You can see/work a project (and its tasks) only if
--     (a) the project belongs to a team you're a member of, AND
--     (b) you're a member of that project
--   …OR you're a MANAGER of the project's team (managers oversee the whole
--   team, so they reach every project in it without being added to each),
--   …OR you're a SUPERADMIN (company-wide reach).
--
-- Project-less "Inbox" tasks are unchanged: visible to author + assignees
-- only, no team involved.
--
-- Mechanics:
--   • New central predicate app_private.can_access_project(); can_see_task()
--     is rewritten to route project tasks through it (so comments,
--     attachments, assignees, activity — all already gated by can_see_task
--     — inherit the team wall for free).
--   • projects + tasks policies rewritten to use it, with a superadmin
--     bypass.
--   • tasks.team_id is kept in lock-step with its project's team by a
--     trigger, so the 0037 approval gate can read it cheaply.
--   • create_project_for_me now takes a team and stamps team_id.
--   • Backfill: existing team-less projects inherit their creator's team;
--     tasks inherit their project's team.
--
-- Idempotent and re-runnable.

begin;

-- ============================================================
-- 1) Central access predicates
-- ============================================================

-- Can the caller reach project p? Superadmin → always. Otherwise the
-- project must belong to a team and the caller is either a manager of that
-- team (team-wide oversight) or both a team member and a project member.
create or replace function app_private.can_access_project(p uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_superadmin() or exists (
    select 1 from public.projects pr
    where pr.id = p
      and pr.team_id is not null
      and (
        app_private.is_team_manager(pr.team_id)
        or (app_private.in_my_team(pr.team_id) and app_private.is_project_member(p))
      )
  );
$$;

-- Rewrite can_see_task to fold in the team wall (project tasks) while
-- leaving Inbox tasks on the author/assignee rule. Superadmin short-circuit
-- is inside can_access_project and added here for project-less tasks too.
create or replace function app_private.can_see_task(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app_private.is_superadmin() or exists (
    select 1 from public.tasks ta
    where ta.id = t and (
      (ta.project_id is not null and app_private.can_access_project(ta.project_id))
      or (ta.project_id is null and (
        ta.author_id = (select auth.uid())
        or ta.assignee_id = (select auth.uid())
        or exists (
          select 1 from public.task_assignees a
          where a.task_id = ta.id and a.user_id = (select auth.uid())
        )
      ))
    )
  );
$$;

grant execute on function app_private.can_access_project(uuid) to anon, authenticated, service_role;
grant execute on function app_private.can_see_task(uuid) to anon, authenticated, service_role;

-- ============================================================
-- 2) projects policies — team wall + superadmin bypass
-- ============================================================
do $do$
begin
  if to_regclass('public.projects') is not null then
    drop policy if exists "projects_select_member"    on public.projects;
    -- Drop BOTH the pre-0036 insert-policy name (projects_insert_workspace)
    -- and this migration's own new name (projects_insert_team) so a re-run
    -- doesn't trip on "policy already exists".
    drop policy if exists "projects_insert_workspace" on public.projects;
    drop policy if exists "projects_insert_team"      on public.projects;
    drop policy if exists "projects_update_member"    on public.projects;
    drop policy if exists "projects_delete_member"    on public.projects;

    create policy "projects_select_member" on public.projects
      for select using (app_private.can_access_project(id));

    -- Create a project inside a team you belong to (or as a superadmin).
    -- The create_project_for_me RPC is SECURITY DEFINER and bypasses this,
    -- but direct inserts (e.g. starter project on team creation) still hit it.
    create policy "projects_insert_team" on public.projects
      for insert
      with check (
        app_private.is_superadmin()
        or (
          app_private.is_workspace_member(workspace_id)
          and team_id is not null
          and app_private.in_my_team(team_id)
        )
      );

    create policy "projects_update_member" on public.projects
      for update
      using (app_private.can_access_project(id))
      with check (app_private.can_access_project(id));

    create policy "projects_delete_member" on public.projects
      for delete using (app_private.can_access_project(id));
  end if;
end
$do$;

-- ============================================================
-- 3) tasks policies — route through can_see_task / can_access_project
-- ============================================================
do $do$
begin
  if to_regclass('public.tasks') is not null then
    drop policy if exists "tasks_select_visible" on public.tasks;
    drop policy if exists "tasks_insert_visible" on public.tasks;
    drop policy if exists "tasks_update_visible" on public.tasks;
    drop policy if exists "tasks_delete_visible" on public.tasks;

    create policy "tasks_select_visible" on public.tasks
      for select using (app_private.can_see_task(id));

    create policy "tasks_insert_visible" on public.tasks
      for insert
      with check (
        app_private.is_superadmin()
        or (
          author_id = (select auth.uid())
          and app_private.is_workspace_member(workspace_id)
          and (
            project_id is null
            or app_private.can_access_project(project_id)
          )
        )
      );

    create policy "tasks_update_visible" on public.tasks
      for update
      using (app_private.can_see_task(id))
      with check (app_private.can_see_task(id));

    create policy "tasks_delete_visible" on public.tasks
      for delete using (
        app_private.is_superadmin()
        or (project_id is not null and app_private.can_access_project(project_id))
        or (project_id is null and author_id = (select auth.uid()))
      );
  end if;
end
$do$;

-- ============================================================
-- 4) project_members — let managers & superadmins read/manage rosters
-- ============================================================
do $do$
begin
  if to_regclass('public.project_members') is not null then
    drop policy if exists "project_members_select" on public.project_members;
    create policy "project_members_select" on public.project_members
      for select using (app_private.can_access_project(project_id));

    -- Add members to a project you can access (a member, a team manager,
    -- or a superadmin). Tightened from the workspace-wide 0030/0031 rule so
    -- the team wall holds for membership too.
    drop policy if exists "project_members_insert" on public.project_members;
    create policy "project_members_insert" on public.project_members
      for insert with check (app_private.can_access_project(project_id));

    drop policy if exists "project_members_delete" on public.project_members;
    create policy "project_members_delete" on public.project_members
      for delete using (app_private.can_access_project(project_id));
  end if;
end
$do$;

-- ============================================================
-- 5) Keep tasks.team_id in lock-step with the project's team
-- ============================================================
create or replace function app_private.task_sync_team()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.project_id is not null then
    select team_id into new.team_id from public.projects where id = new.project_id;
  else
    new.team_id := null;
  end if;
  return new;
end;
$$;

-- Name sorts before the 0037 approval trigger so team_id is correct when the
-- gate reads it.
drop trigger if exists trg_tasks_1_sync_team on public.tasks;
create trigger trg_tasks_1_sync_team
  before insert or update of project_id on public.tasks
  for each row execute function app_private.task_sync_team();

-- ============================================================
-- 6) create_project_for_me now requires a team
-- ============================================================
drop function if exists public.create_project_for_me(text, text, text);

create or replace function public.create_project_for_me(
  p_name text,
  p_team_id uuid,
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
  if uid is null then raise exception 'Not signed in'; end if;
  if trimmed = '' then raise exception 'Project name required'; end if;
  if length(trimmed) > 60 then raise exception 'Project name too long'; end if;
  if p_team_id is null then raise exception 'A project must belong to a team'; end if;

  if not (
    app_private.is_superadmin()
    or exists (
      select 1 from public.team_members
      where team_id = p_team_id and user_id = uid
    )
  ) then
    raise exception 'You are not a member of that team';
  end if;

  select workspace_id into ws from public.teams where id = p_team_id;
  if ws is null then raise exception 'Team not found'; end if;

  insert into public.projects (workspace_id, team_id, name, color, emoji, created_by)
  values (ws, p_team_id, trimmed, p_color, p_emoji, uid)
  returning id into new_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_id, uid, 'admin')
  on conflict (project_id, user_id) do nothing;

  return new_id;
end;
$$;

grant execute on function public.create_project_for_me(text, uuid, text, text)
  to authenticated, service_role;

-- ============================================================
-- 7) Backfill team_id on existing data
-- ============================================================
-- Projects with no team inherit their creator's earliest team. Anything
-- left null (no creator, or creator on no team) stays superadmin-only until
-- resolved in the admin screen — no data is lost.
update public.projects p
set team_id = (
  select tm.team_id
  from public.team_members tm
  where tm.user_id = p.created_by
  order by tm.joined_at
  limit 1
)
where p.team_id is null
  and p.created_by is not null
  and exists (
    select 1 from public.team_members tm where tm.user_id = p.created_by
  );

-- Tasks inherit their project's team; project-less tasks have no team.
update public.tasks t
set team_id = p.team_id
from public.projects p
where t.project_id = p.id
  and t.team_id is distinct from p.team_id;

update public.tasks
set team_id = null
where project_id is null and team_id is not null;

commit;
