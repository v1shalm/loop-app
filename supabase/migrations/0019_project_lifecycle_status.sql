-- Project status moves from content-workflow vocabulary to lifecycle.
--
-- The old values (draft / in_progress / waiting_approval / changes_requested /
-- approved / live / archived / do_not_use) describe a *deliverable* moving
-- through a review pipeline — that grammar belongs on tasks/assets, not on
-- the project container itself.
--
-- New vocabulary: active / on_hold / completed / archived. Four states,
-- each one meaningful at the project level. Matches what Linear and Asana
-- use for the same concept.

-- Drop the old constraint first. Otherwise the UPDATE below rewrites
-- every matching row, and Postgres re-checks the *old* constraint on
-- rows whose value is already in the new vocabulary (e.g. 'active'
-- written by code that ran ahead of the migration) — failing the
-- migration on data that's already correct.
alter table public.projects
  drop constraint if exists projects_workflow_status_check;

-- Map existing rows so the new constraint will accept them.
update public.projects
   set workflow_status = case workflow_status
     when 'draft'              then 'active'
     when 'in_progress'        then 'active'
     when 'waiting_approval'   then 'active'
     when 'changes_requested'  then 'active'
     when 'approved'           then 'completed'
     when 'live'               then 'completed'
     when 'archived'           then 'archived'
     when 'do_not_use'         then 'archived'
     else workflow_status
   end
 where workflow_status is not null;

alter table public.projects
  add constraint projects_workflow_status_check
  check (
    workflow_status is null or workflow_status in (
      'active',
      'on_hold',
      'completed',
      'archived'
    )
  );
