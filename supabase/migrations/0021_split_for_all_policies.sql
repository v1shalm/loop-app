-- Knock out the remaining multiple_permissive_policies warnings.
--
-- Same shape as the comment_reactions fix in 0020: every `FOR ALL` policy
-- silently covers SELECT, and when there's already a dedicated SELECT
-- policy on the same table, Postgres has to evaluate both for every
-- read. Splitting the `FOR ALL` policies into per-action policies
-- (INSERT/UPDATE/DELETE) drops the SELECT collision without changing
-- any authorization behaviour.
--
-- `team_members` is the one table where two policies *legitimately* both
-- apply to INSERT (the normal admin-add-member path and the bootstrap
-- path for the very first member). Those are merged into a single
-- INSERT policy with OR-ed checks so the linter sees one permissive
-- policy per (role, action).

-- ============================================================
-- projects — split team_scope_modify into per-action policies
-- ============================================================

drop policy if exists "projects_team_scope_modify" on public.projects;

create policy "projects_team_scope_insert" on public.projects
  for insert
  with check (team_id is null or team_id = public.my_team_id());

create policy "projects_team_scope_update" on public.projects
  for update
  using (team_id is null or team_id = public.my_team_id())
  with check (team_id is null or team_id = public.my_team_id());

create policy "projects_team_scope_delete" on public.projects
  for delete
  using (team_id is null or team_id = public.my_team_id());

-- ============================================================
-- tasks — same split as projects
-- ============================================================

drop policy if exists "tasks_team_scope_modify" on public.tasks;

create policy "tasks_team_scope_insert" on public.tasks
  for insert
  with check (team_id is null or team_id = public.my_team_id());

create policy "tasks_team_scope_update" on public.tasks
  for update
  using (team_id is null or team_id = public.my_team_id())
  with check (team_id is null or team_id = public.my_team_id());

create policy "tasks_team_scope_delete" on public.tasks
  for delete
  using (team_id is null or team_id = public.my_team_id());

-- ============================================================
-- team_members — merge bootstrap + admin INSERT into one policy,
-- split admin FOR ALL into UPDATE + DELETE
-- ============================================================

drop policy if exists "team_members_modify_admin" on public.team_members;
drop policy if exists "team_members_first_admin_bootstrap"
  on public.team_members;

-- INSERT: either an existing admin of the team is adding a member,
-- OR the team is empty and the caller is bootstrapping themselves
-- as the first admin (preserves the 0016 behaviour).
create policy "team_members_insert" on public.team_members
  for insert
  with check (
    public.is_team_admin(team_id)
    or (
      user_id = (select auth.uid())
      and role = 'admin'
      and not exists (
        select 1 from public.team_members existing
        where existing.team_id = team_members.team_id
      )
    )
  );

create policy "team_members_update" on public.team_members
  for update
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

create policy "team_members_delete" on public.team_members
  for delete
  using (public.is_team_admin(team_id));
