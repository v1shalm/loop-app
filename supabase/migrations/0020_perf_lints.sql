-- Address Supabase performance-linter findings.
--
-- Three kinds of issues, all "warn" or "info" — the app works today
-- but RLS is doing wasted work that gets expensive at scale.
--
--   1. auth_rls_initplan — every `auth.uid()` / `auth.role()` call inside
--      a policy was being re-evaluated for each row. Wrapping them in
--      `(select …)` turns the call into a one-shot InitPlan that
--      Postgres computes once per statement.
--
--   2. multiple_permissive_policies — `projects` / `tasks` carried both
--      the old workspace-scoped policies (`*_all_members` from 0001) and
--      the newer team-scoped ones (`*_team_scope_*` from 0009). Both
--      were evaluated on every query. The team-scoped pair is the
--      tighter authorization model we use today, so the legacy
--      workspace-scoped catch-alls are dropped. `comment_reactions`
--      had the same overlap on SELECT — split the `_modify_self`
--      FOR ALL policy into per-action policies so it no longer
--      covers SELECT (the broader `_select_all` policy stays).
--
--   3. unindexed_foreign_keys — five FK columns had no covering index,
--      which means deletes on the parent table do a seq-scan to find
--      references. Adds one index per FK.
--
-- The `unused_index` warnings the linter also surfaces are NOT acted on
-- here. Those indexes (workspace_id, team_id, workflow_status, user_id)
-- back the team-scoped RLS predicates and `pg_stat_user_indexes` only
-- reports them as "unused" because this database is fresh — they'll
-- start picking up scans the moment real traffic arrives.

-- ============================================================
-- 1) RLS init-plan: wrap auth.* in (select …)
-- ============================================================

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using ((select auth.role()) = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams
  for insert with check ((select auth.uid()) is not null);

drop policy if exists "saved_views_owner_all" on public.saved_views;
create policy "saved_views_owner_all" on public.saved_views
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "team_members_first_admin_bootstrap"
  on public.team_members;
create policy "team_members_first_admin_bootstrap" on public.team_members
  for insert
  with check (
    user_id = (select auth.uid())
    and role = 'admin'
    and not exists (
      select 1 from public.team_members existing
      where existing.team_id = team_members.team_id
    )
  );

-- ============================================================
-- 2) Drop overlapping permissive policies
-- ============================================================

-- projects / tasks: the workspace-scoped catch-alls from 0001 are
-- redundant once the team-scoped pair from 0009 is in place.
drop policy if exists "projects_all_members" on public.projects;
drop policy if exists "tasks_all_members" on public.tasks;

-- comment_reactions: replace the FOR ALL "_modify_self" policy with
-- per-action policies so its SELECT clause stops competing with
-- "_select_all". Reads come from _select_all; writes come from these.
drop policy if exists "comment_reactions_modify_self"
  on public.comment_reactions;

create policy "comment_reactions_insert_self" on public.comment_reactions
  for insert
  with check (user_id = (select auth.uid()));

create policy "comment_reactions_update_self" on public.comment_reactions
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "comment_reactions_delete_self" on public.comment_reactions
  for delete
  using (user_id = (select auth.uid()));

-- ============================================================
-- 3) Covering indexes for previously unindexed foreign keys
-- ============================================================

create index if not exists comment_reactions_user_id_idx
  on public.comment_reactions(user_id);

create index if not exists projects_created_by_idx
  on public.projects(created_by);

create index if not exists task_comments_author_id_idx
  on public.task_comments(author_id);

create index if not exists tasks_author_id_idx
  on public.tasks(author_id);

create index if not exists teams_workspace_id_idx
  on public.teams(workspace_id);
