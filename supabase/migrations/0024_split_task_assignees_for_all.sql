-- Split task_assignees_modify_members (FOR ALL) into per-action policies.
--
-- Same pattern as 0021 for projects/tasks/team_members: a FOR ALL policy
-- silently covers SELECT, and when there's already a dedicated SELECT
-- policy (task_assignees_select_all) the planner has to evaluate both
-- on every read. Split into INSERT/UPDATE/DELETE so the overlap clears.
--
-- I missed this in 0023 — that migration carried 0014's original
-- (overlapping) policies forward verbatim.

drop policy if exists "task_assignees_modify_members" on public.task_assignees;

create policy "task_assignees_insert_members" on public.task_assignees
  for insert
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

create policy "task_assignees_update_members" on public.task_assignees
  for update
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

create policy "task_assignees_delete_members" on public.task_assignees
  for delete
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );
