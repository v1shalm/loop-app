-- Workflow status — separate from completion (status: todo/done).
-- A task can carry an optional workflow label that fits the design / dev
-- review loop: draft → in_progress → waiting_approval → approved → live
-- (with changes_requested / archived / do_not_use as side branches).

alter table public.tasks
  add column if not exists workflow_status text;

alter table public.tasks
  drop constraint if exists tasks_workflow_status_check;

alter table public.tasks
  add constraint tasks_workflow_status_check
  check (
    workflow_status is null or workflow_status in (
      'draft',
      'in_progress',
      'waiting_approval',
      'changes_requested',
      'approved',
      'live',
      'archived',
      'do_not_use'
    )
  );

create index if not exists tasks_workflow_status_idx
  on public.tasks(workflow_status)
  where workflow_status is not null;
