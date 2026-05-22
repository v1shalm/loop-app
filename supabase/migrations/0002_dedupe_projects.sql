-- ─────────────────────────────────────────────────────────────────────────────
-- Loop — 0002 — dedupe projects + add unique constraint
-- Run AFTER 0001_init.sql. Safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────
-- Why: seed.sql originally inserted projects without an effective conflict
-- target, so re-running it created duplicates. This migration:
--   1. Removes existing duplicate projects (keeps the oldest row per name).
--   2. Reparents any tasks that were pointing at the deleted duplicates.
--   3. Adds a (workspace_id, name) unique constraint so it can't happen again.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Reparent tasks pointing at duplicate (newer) project rows to the
--    canonical (oldest) project row of the same name in the same workspace.
update public.tasks t
   set project_id = canonical.id
  from public.projects victim
  join public.projects canonical
    on canonical.workspace_id = victim.workspace_id
   and canonical.name = victim.name
   and canonical.created_at < victim.created_at
   and not exists (
     select 1 from public.projects older
     where older.workspace_id = victim.workspace_id
       and older.name = victim.name
       and older.created_at < canonical.created_at
   )
 where t.project_id = victim.id;

-- 2. Delete duplicate project rows (keep the oldest per workspace_id + name).
delete from public.projects p
 where exists (
   select 1 from public.projects older
   where older.workspace_id = p.workspace_id
     and older.name = p.name
     and older.created_at < p.created_at
 );

-- 3. Add the constraint (idempotent — wrapped in a guard so re-running is safe).
do $$ begin
  alter table public.projects
    add constraint projects_workspace_name_unique
    unique (workspace_id, name);
exception
  when duplicate_object then null;
  when duplicate_table then null;
end $$;
