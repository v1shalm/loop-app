-- Address the Supabase security-linter findings about SECURITY DEFINER
-- functions being callable via /rest/v1/rpc/<name>.
--
-- PostgREST exposes any function in the `public` schema as an RPC endpoint
-- if anon/authenticated have EXECUTE on it. We need EXECUTE for these
-- helpers because they're called from RLS policy expressions — Postgres
-- still checks the calling role's privileges even though SECURITY DEFINER
-- means the body runs as the function owner. We can't revoke EXECUTE
-- without breaking RLS, and we can't switch to SECURITY INVOKER because
-- the helpers query the very tables their callers are filtering on
-- (recursion / RLS deadlock).
--
-- The Supabase-recommended fix: move the functions into a schema that
-- PostgREST doesn't expose. RLS policies call them by fully-qualified
-- name (`app_private.is_team_admin(...)`), and they stop appearing
-- under /rpc/ entirely.
--
-- `handle_new_user` is a trigger function — it doesn't need to be
-- callable as RPC at all. Same private-schema move.
--
-- Whole thing is wrapped in a transaction so there's never a moment
-- where a policy is dropped but its replacement hasn't been created
-- (which would default-deny under RLS).

begin;

-- ============================================================
-- 1) Private schema for SECURITY DEFINER helpers
-- ============================================================

create schema if not exists app_private;
grant usage on schema app_private to anon, authenticated, service_role;

-- ============================================================
-- 2) Recreate the helpers inside app_private
-- ============================================================

create or replace function app_private.is_workspace_member(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = (select auth.uid())
  );
$$;

create or replace function app_private.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select team_id
  from public.team_members
  where user_id = (select auth.uid())
  limit 1
$$;

create or replace function app_private.is_team_admin(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.team_members
    where team_id = t
      and user_id = (select auth.uid())
      and role = 'admin'
  )
$$;

grant execute on function app_private.is_workspace_member(uuid)
  to anon, authenticated, service_role;
grant execute on function app_private.my_team_id()
  to anon, authenticated, service_role;
grant execute on function app_private.is_team_admin(uuid)
  to anon, authenticated, service_role;

-- ============================================================
-- 3) Rewire every RLS policy that referenced the public helpers
-- ============================================================

-- workspaces
drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members" on public.workspaces
  for select using (app_private.is_workspace_member(id));

-- workspace_members
drop policy if exists "members_select_same_ws" on public.workspace_members;
create policy "members_select_same_ws" on public.workspace_members
  for select using (app_private.is_workspace_member(workspace_id));

-- task_comments
drop policy if exists "comments_all_members" on public.task_comments;
create policy "comments_all_members" on public.task_comments
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

-- comment_reactions
drop policy if exists "comment_reactions_select_all" on public.comment_reactions;
create policy "comment_reactions_select_all" on public.comment_reactions
  for select using (
    exists (
      select 1 from public.task_comments c
      join public.tasks t on t.id = c.task_id
      where c.id = comment_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

-- task_assignees
drop policy if exists "task_assignees_select_all" on public.task_assignees;
create policy "task_assignees_select_all" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

drop policy if exists "task_assignees_modify_members" on public.task_assignees;
create policy "task_assignees_modify_members" on public.task_assignees
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

-- task_activity_logs
drop policy if exists "task_activity_logs_select" on public.task_activity_logs;
create policy "task_activity_logs_select" on public.task_activity_logs
  for select using (
    exists (
      select 1 from public.tasks
      where id = task_activity_logs.task_id
        and (team_id is null or team_id = app_private.my_team_id())
    )
  );

-- projects (team-scoped quartet from 0021)
drop policy if exists "projects_team_scope_select" on public.projects;
create policy "projects_team_scope_select" on public.projects
  for select using (
    team_id is null or team_id = app_private.my_team_id()
  );

drop policy if exists "projects_team_scope_insert" on public.projects;
create policy "projects_team_scope_insert" on public.projects
  for insert
  with check (team_id is null or team_id = app_private.my_team_id());

drop policy if exists "projects_team_scope_update" on public.projects;
create policy "projects_team_scope_update" on public.projects
  for update
  using (team_id is null or team_id = app_private.my_team_id())
  with check (team_id is null or team_id = app_private.my_team_id());

drop policy if exists "projects_team_scope_delete" on public.projects;
create policy "projects_team_scope_delete" on public.projects
  for delete
  using (team_id is null or team_id = app_private.my_team_id());

-- tasks (team-scoped quartet from 0021)
drop policy if exists "tasks_team_scope_select" on public.tasks;
create policy "tasks_team_scope_select" on public.tasks
  for select using (
    team_id is null or team_id = app_private.my_team_id()
  );

drop policy if exists "tasks_team_scope_insert" on public.tasks;
create policy "tasks_team_scope_insert" on public.tasks
  for insert
  with check (team_id is null or team_id = app_private.my_team_id());

drop policy if exists "tasks_team_scope_update" on public.tasks;
create policy "tasks_team_scope_update" on public.tasks
  for update
  using (team_id is null or team_id = app_private.my_team_id())
  with check (team_id is null or team_id = app_private.my_team_id());

drop policy if exists "tasks_team_scope_delete" on public.tasks;
create policy "tasks_team_scope_delete" on public.tasks
  for delete
  using (team_id is null or team_id = app_private.my_team_id());

-- team_members (insert / update / delete from 0021)
drop policy if exists "team_members_insert" on public.team_members;
create policy "team_members_insert" on public.team_members
  for insert
  with check (
    app_private.is_team_admin(team_id)
    or (
      user_id = (select auth.uid())
      and role = 'admin'
      and not exists (
        select 1 from public.team_members existing
        where existing.team_id = team_members.team_id
      )
    )
  );

drop policy if exists "team_members_update" on public.team_members;
create policy "team_members_update" on public.team_members
  for update
  using (app_private.is_team_admin(team_id))
  with check (app_private.is_team_admin(team_id));

drop policy if exists "team_members_delete" on public.team_members;
create policy "team_members_delete" on public.team_members
  for delete
  using (app_private.is_team_admin(team_id));

-- ============================================================
-- 4) Drop the public helpers — nothing references them anymore
-- ============================================================

drop function if exists public.is_workspace_member(uuid);
drop function if exists public.my_team_id();
drop function if exists public.is_team_admin(uuid);

-- ============================================================
-- 5) handle_new_user — move the trigger function too
-- ============================================================

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
  end if;

  return new;
end;
$$;

-- Trigger functions don't need EXECUTE granted to callers — Postgres
-- invokes them via the trigger machinery, not as an SQL call. Revoke
-- the default PUBLIC grant so it isn't reachable as RPC.
revoke execute on function app_private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

drop function if exists public.handle_new_user();

commit;
