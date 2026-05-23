-- 0014 — Multi-assignee on tasks
--
-- Keeps tasks.assignee_id as the "primary" / owner for back-compat with
-- the inbox + my-work queries (those use assignee_id directly). Adds a
-- join table for additional assignees so the drawer can show an avatar
-- stack and the task can have multiple owners.
--
-- The primary assignee is included as a row in task_assignees too so
-- counts and avatar stacks read from a single source of truth. A
-- trigger keeps the table in sync with the primary column.

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists task_assignees_user_id_idx
  on public.task_assignees (user_id);

alter table public.task_assignees enable row level security;

-- Anyone in the workspace can read. Writes are gated by workspace
-- membership (you can't add yourself to a task you can't see).
drop policy if exists "task_assignees_select_all" on public.task_assignees;
create policy "task_assignees_select_all" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_workspace_member(t.workspace_id)
    )
  );

drop policy if exists "task_assignees_modify_members" on public.task_assignees;
create policy "task_assignees_modify_members" on public.task_assignees
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_workspace_member(t.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.is_workspace_member(t.workspace_id)
    )
  );

-- Realtime so avatar stacks update across tabs.
do $$ begin
  alter publication supabase_realtime add table public.task_assignees;
exception when duplicate_object then null; end $$;

-- Backfill: any existing task with a primary assignee gets a matching
-- row in task_assignees so counts read correctly from day one.
insert into public.task_assignees (task_id, user_id)
  select id, assignee_id from public.tasks
  where assignee_id is not null
on conflict do nothing;

-- Trigger: when tasks.assignee_id changes, mirror into task_assignees.
-- Drop+create here so the function can evolve without a migration
-- cascade.
create or replace function public.sync_primary_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Insert is straightforward — add the new primary as an assignee.
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.assignee_id is not null then
    insert into public.task_assignees (task_id, user_id)
      values (new.id, new.assignee_id)
      on conflict do nothing;
  end if;
  -- On update, if the primary changed, we leave the previous primary
  -- in task_assignees (they're still a co-assignee unless the UI
  -- explicitly removes them).
  return new;
end;
$$;

drop trigger if exists tasks_sync_primary_assignee on public.tasks;
create trigger tasks_sync_primary_assignee
  after insert or update of assignee_id on public.tasks
  for each row execute function public.sync_primary_assignee();
