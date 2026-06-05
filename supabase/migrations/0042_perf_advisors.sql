-- 0042 — Performance advisor fixes.
--
-- From the Supabase performance advisor:
--   1) auth_rls_initplan: the notifications_select_self policy re-evaluates
--      auth.uid() once PER ROW. Wrapping it in (select auth.uid()) lets the
--      planner hoist it to an initplan (evaluated once per query). Big win on
--      any recipient_id scan as the table grows.
--   2) unindexed_foreign_keys: add covering indexes for 7 FK columns so joins
--      and — more importantly — parent-row deletes don't sequential-scan the
--      child table to find referencing rows.
--
-- Unused-index advisories are intentionally NOT acted on: the project is
-- early-stage with little query history, so "unused" reflects no traffic yet,
-- not redundancy. They back real access patterns (workspace/team scoping,
-- comment threading). Revisit once pg_stat_statements has real data.
--
-- Idempotent and re-runnable.

begin;

-- 1) RLS init-plan: evaluate auth.uid() once, not per row --------------------
drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select using (recipient_id = (select auth.uid()));

-- 2) Covering indexes for foreign keys ---------------------------------------
create index if not exists notifications_actor_id_idx
  on public.notifications (actor_id);
create index if not exists notifications_comment_id_idx
  on public.notifications (comment_id);
create index if not exists task_attachments_created_by_idx
  on public.task_attachments (created_by);
create index if not exists tasks_approved_by_idx
  on public.tasks (approved_by);
create index if not exists team_active_selection_team_id_idx
  on public.team_active_selection (team_id);
create index if not exists team_invitations_invited_by_idx
  on public.team_invitations (invited_by);
create index if not exists team_managers_assigned_by_idx
  on public.team_managers (assigned_by);

commit;
