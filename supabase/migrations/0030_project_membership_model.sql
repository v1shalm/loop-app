-- 0030 — Project membership model.
--
-- Conceptual shift: from team-scoped tasks/projects with active-team
-- switching, to private projects with their own membership.
--
--   Workspace = the company. Everyone is a member.
--   Teams (departments) collapse to a free-text `department` label on
--     each profile. The teams / team_members / team_active_selection
--     tables stay in place for now but are no longer referenced by RLS
--     or by the app (kept so the migration is non-destructive).
--   Projects are private. You see a project, and its tasks, activity,
--     attachments, comments, reactions, and assignees, only if you are
--     a member of that project.
--   Tasks with no project ("Inbox" / quick-add without a project) are
--     visible only to the author and the assignees.
--   My Day = your assigned tasks across every project you belong to.
--
-- Existing data is preserved: project_members is backfilled from each
-- project's team's members, plus the project's created_by as 'admin'.
-- task and project workspace_id columns are already populated from the
-- initial schema, so re-scoping doesn't move data around.
--
-- Idempotent and re-runnable.

begin;

-- 1) profiles.department — replaces the structured teams table for
--    grouping people by department in the People directory.
alter table public.profiles
  add column if not exists department text;

-- 2) project_members — who can see a given project.
create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member'
                check (role in ('admin','member')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx
  on public.project_members (user_id);

alter table public.project_members enable row level security;

-- 3) Backfill: keep existing visibility. Every member of a project's
--    current team becomes a project member. The creator is upgraded
--    to 'admin' so they can manage membership.
insert into public.project_members (project_id, user_id, role)
select distinct p.id, tm.user_id, 'member'
from public.projects p
join public.team_members tm on tm.team_id = p.team_id
where p.team_id is not null
on conflict (project_id, user_id) do nothing;

insert into public.project_members (project_id, user_id, role)
select p.id, p.created_by, 'admin'
from public.projects p
where p.created_by is not null
on conflict (project_id, user_id) do update set role = 'admin';

-- 4) Helpers (private schema; not reachable as PostgREST RPC).
create or replace function app_private.is_project_member(p uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p and user_id = (select auth.uid())
  );
$$;

create or replace function app_private.can_see_task(t uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tasks ta
    where ta.id = t and (
      (ta.project_id is not null
        and app_private.is_project_member(ta.project_id))
      or (ta.project_id is null and (
        ta.author_id   = (select auth.uid())
        or ta.assignee_id = (select auth.uid())
        or exists (
          select 1 from public.task_assignees a
          where a.task_id = ta.id
            and a.user_id = (select auth.uid())
        )
      ))
    )
  );
$$;

grant execute on function app_private.is_project_member(uuid)
  to anon, authenticated, service_role;
grant execute on function app_private.can_see_task(uuid)
  to anon, authenticated, service_role;

-- 5) Rewrite RLS — drop the team-scoped policies, install project-scoped
--    ones. Tables wrapped in `if to_regclass` so this is safe to re-run.

-- projects
do $do$
begin
  if to_regclass('public.projects') is not null then
    drop policy if exists "projects_team_scope_select" on public.projects;
    drop policy if exists "projects_team_scope_insert" on public.projects;
    drop policy if exists "projects_team_scope_update" on public.projects;
    drop policy if exists "projects_team_scope_delete" on public.projects;
    drop policy if exists "projects_all_members"       on public.projects;
    -- Drop the new names too so the block is idempotent on re-run.
    drop policy if exists "projects_select_member"     on public.projects;
    drop policy if exists "projects_insert_workspace"  on public.projects;
    drop policy if exists "projects_update_member"     on public.projects;
    drop policy if exists "projects_delete_member"     on public.projects;

    create policy "projects_select_member" on public.projects
      for select using (app_private.is_project_member(id));

    -- Any workspace member can create a project. The createProject
    -- server action immediately inserts a 'admin' project_members row
    -- for the creator so they don't lose visibility of what they just
    -- made.
    create policy "projects_insert_workspace" on public.projects
      for insert
      with check (app_private.is_workspace_member(workspace_id));

    create policy "projects_update_member" on public.projects
      for update
      using (app_private.is_project_member(id))
      with check (app_private.is_project_member(id));

    create policy "projects_delete_member" on public.projects
      for delete using (app_private.is_project_member(id));
  end if;
end
$do$;

-- tasks
do $do$
begin
  if to_regclass('public.tasks') is not null then
    drop policy if exists "tasks_team_scope_select" on public.tasks;
    drop policy if exists "tasks_team_scope_insert" on public.tasks;
    drop policy if exists "tasks_team_scope_update" on public.tasks;
    drop policy if exists "tasks_team_scope_delete" on public.tasks;
    drop policy if exists "tasks_all_members"       on public.tasks;
    -- Drop the new names too so the block is idempotent on re-run.
    drop policy if exists "tasks_select_visible"    on public.tasks;
    drop policy if exists "tasks_insert_visible"    on public.tasks;
    drop policy if exists "tasks_update_visible"    on public.tasks;
    drop policy if exists "tasks_delete_visible"    on public.tasks;

    create policy "tasks_select_visible" on public.tasks
      for select using (
        (project_id is not null
          and app_private.is_project_member(project_id))
        or (project_id is null and (
          author_id = (select auth.uid())
          or assignee_id = (select auth.uid())
          or exists (
            select 1 from public.task_assignees a
            where a.task_id = tasks.id
              and a.user_id = (select auth.uid())
          )
        ))
      );

    create policy "tasks_insert_visible" on public.tasks
      for insert
      with check (
        author_id = (select auth.uid())
        and app_private.is_workspace_member(workspace_id)
        and (
          project_id is null
          or app_private.is_project_member(project_id)
        )
      );

    create policy "tasks_update_visible" on public.tasks
      for update
      using (
        (project_id is not null
          and app_private.is_project_member(project_id))
        or (project_id is null and (
          author_id = (select auth.uid())
          or assignee_id = (select auth.uid())
        ))
      )
      with check (
        (project_id is not null
          and app_private.is_project_member(project_id))
        or (project_id is null and (
          author_id = (select auth.uid())
          or assignee_id = (select auth.uid())
        ))
      );

    create policy "tasks_delete_visible" on public.tasks
      for delete using (
        (project_id is not null
          and app_private.is_project_member(project_id))
        or (project_id is null and author_id = (select auth.uid()))
      );
  end if;
end
$do$;

-- task_comments — drop workspace-scoped, install can_see_task scoped
do $do$
begin
  if to_regclass('public.task_comments') is not null then
    drop policy if exists "comments_all_members"     on public.task_comments;
    -- Drop the new names too so the block is idempotent on re-run.
    drop policy if exists "comments_select_visible"  on public.task_comments;
    drop policy if exists "comments_insert_visible"  on public.task_comments;
    drop policy if exists "comments_update_visible"  on public.task_comments;
    drop policy if exists "comments_delete_visible"  on public.task_comments;

    create policy "comments_select_visible" on public.task_comments
      for select using (app_private.can_see_task(task_id));

    create policy "comments_insert_visible" on public.task_comments
      for insert with check (app_private.can_see_task(task_id));

    create policy "comments_update_visible" on public.task_comments
      for update
      using (app_private.can_see_task(task_id))
      with check (app_private.can_see_task(task_id));

    create policy "comments_delete_visible" on public.task_comments
      for delete using (app_private.can_see_task(task_id));
  end if;
end
$do$;

-- comment_reactions — gate by access to the underlying comment's task
do $do$
begin
  if to_regclass('public.comment_reactions') is not null then
    drop policy if exists "comment_reactions_select_all"
      on public.comment_reactions;
    drop policy if exists "comment_reactions_select_visible"
      on public.comment_reactions;

    create policy "comment_reactions_select_visible" on public.comment_reactions
      for select using (
        exists (
          select 1 from public.task_comments c
          where c.id = comment_id
            and app_private.can_see_task(c.task_id)
        )
      );
  end if;
end
$do$;

-- task_assignees — was split into select / insert / update / delete in
-- 0024; replace each with a can_see_task gate.
do $do$
begin
  if to_regclass('public.task_assignees') is not null then
    drop policy if exists "task_assignees_select_all"      on public.task_assignees;
    drop policy if exists "task_assignees_insert_members"  on public.task_assignees;
    drop policy if exists "task_assignees_update_members"  on public.task_assignees;
    drop policy if exists "task_assignees_delete_members"  on public.task_assignees;
    -- Drop the new names too so the block is idempotent on re-run.
    drop policy if exists "task_assignees_select_visible"  on public.task_assignees;
    drop policy if exists "task_assignees_insert_visible"  on public.task_assignees;
    drop policy if exists "task_assignees_update_visible"  on public.task_assignees;
    drop policy if exists "task_assignees_delete_visible"  on public.task_assignees;

    create policy "task_assignees_select_visible" on public.task_assignees
      for select using (app_private.can_see_task(task_id));

    create policy "task_assignees_insert_visible" on public.task_assignees
      for insert with check (app_private.can_see_task(task_id));

    create policy "task_assignees_update_visible" on public.task_assignees
      for update
      using (app_private.can_see_task(task_id))
      with check (app_private.can_see_task(task_id));

    create policy "task_assignees_delete_visible" on public.task_assignees
      for delete using (app_private.can_see_task(task_id));
  end if;
end
$do$;

-- task_activity_logs — replace team-scoped select
do $do$
begin
  if to_regclass('public.task_activity_logs') is not null then
    drop policy if exists "task_activity_logs_select" on public.task_activity_logs;
    create policy "task_activity_logs_select" on public.task_activity_logs
      for select using (app_private.can_see_task(task_id));
  end if;
end
$do$;

-- task_attachments — three policies, all re-gated by can_see_task
do $do$
begin
  if to_regclass('public.task_attachments') is not null then
    drop policy if exists "task_attachments_select" on public.task_attachments;
    create policy "task_attachments_select" on public.task_attachments
      for select using (app_private.can_see_task(task_id));

    drop policy if exists "task_attachments_insert" on public.task_attachments;
    create policy "task_attachments_insert" on public.task_attachments
      for insert with check (
        created_by = (select auth.uid())
        and app_private.can_see_task(task_id)
      );

    drop policy if exists "task_attachments_delete" on public.task_attachments;
    create policy "task_attachments_delete" on public.task_attachments
      for delete using (
        created_by = (select auth.uid())
        or exists (
          select 1 from public.tasks t
          where t.id = task_attachments.task_id
            and (
              t.author_id   = (select auth.uid())
              or t.assignee_id = (select auth.uid())
            )
        )
      );
  end if;
end
$do$;

-- 6) project_members policies. Open membership: any workspace member
--    can add a person to a project, and project members can see the
--    full roster.
drop policy if exists "project_members_select" on public.project_members;
create policy "project_members_select" on public.project_members
  for select using (app_private.is_project_member(project_id));

drop policy if exists "project_members_insert" on public.project_members;
create policy "project_members_insert" on public.project_members
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and app_private.is_workspace_member(p.workspace_id)
    )
  );

drop policy if exists "project_members_delete" on public.project_members;
create policy "project_members_delete" on public.project_members
  for delete using (app_private.is_project_member(project_id));

-- 7) Realtime: stream project membership changes too.
do $$ begin
  alter publication supabase_realtime add table public.project_members;
exception when duplicate_object then null; end $$;

-- 8) RPC: create_project_for_me — atomically inserts the project AND
--    the creator's project_members row. Without this, the creator
--    can't read back the new project's id (RLS blocks SELECT until
--    they're a member, and they can't become a member until the
--    project exists). SECURITY DEFINER bypasses the catch-22.
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
  uid uuid := (select auth.uid());
  ws  uuid;
  new_id uuid;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  -- The creator's workspace (the company). One workspace per user in
  -- this model; pick the first membership row.
  select workspace_id into ws
  from public.workspace_members
  where user_id = uid
  limit 1;

  if ws is null then
    raise exception 'Not a workspace member';
  end if;

  insert into public.projects (workspace_id, name, color, emoji, created_by)
  values (ws, p_name, p_color, p_emoji, uid)
  returning id into new_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_id, uid, 'admin');

  return new_id;
end;
$$;

grant execute on function public.create_project_for_me(text, text, text)
  to authenticated, service_role;

commit;
