-- Move workflow_status from tasks → projects.
--
-- Realization after shipping it on tasks: workflow stages (Draft → In
-- progress → Approved → Live) describe a *deliverable* moving through
-- review, which is a project-level concept, not a task-level one. On
-- individual tasks it conflicted with the todo/done checkbox and added
-- noise in the drawer header.

-- 1. Drop from tasks.
alter table public.tasks
  drop constraint if exists tasks_workflow_status_check;

drop index if exists public.tasks_workflow_status_idx;

alter table public.tasks
  drop column if exists workflow_status;

-- 2. Add to projects.
alter table public.projects
  add column if not exists workflow_status text;

alter table public.projects
  drop constraint if exists projects_workflow_status_check;

alter table public.projects
  add constraint projects_workflow_status_check
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

create index if not exists projects_workflow_status_idx
  on public.projects(workflow_status)
  where workflow_status is not null;
