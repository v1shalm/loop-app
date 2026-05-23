-- 0013 — Subtasks
--
-- One task can be the child of another (Todoist's killer feature). A
-- single nullable parent_task_id is enough; we don't model arbitrary
-- nesting on purpose. Two levels (parent + children) cover the use case
-- and keep the drawer UI predictable. Deeper nesting would force a tree
-- view that's a separate product.
--
-- on delete cascade: when a parent is deleted, its subtasks go with it.
-- Otherwise subtasks would orphan and the queries that pull subtasks by
-- parent_task_id would just stop finding them (worse).

alter table public.tasks
  add column if not exists parent_task_id uuid
    references public.tasks(id) on delete cascade;

create index if not exists tasks_parent_task_idx
  on public.tasks(parent_task_id)
  where parent_task_id is not null;

-- Guard against accidental self-reference at the DB. A subtask cannot
-- point at itself; a parent cannot become its own subtask via UI tools.
do $$ begin
  alter table public.tasks
    add constraint tasks_no_self_parent
    check (parent_task_id is null or parent_task_id <> id);
exception when duplicate_object then null; end $$;
