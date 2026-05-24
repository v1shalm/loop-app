-- Catch-up for the multi-assignee feature on databases where 0014 was
-- never applied, but 0022 already moved is_workspace_member out of the
-- public schema. Running 0014 directly on such a database fails with
-- `function public.is_workspace_member(uuid) does not exist`.
--
-- Same shape as 0014, but every reference uses app_private. Idempotent
-- (`create table if not exists`, `drop policy if exists`, `on conflict
-- do nothing` for the backfill) so it's harmless to re-run.

create table if not exists public.task_assignees (
  task_id     uuid not null references public.tasks(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, user_id)
);

create index if not exists task_assignees_user_id_idx
  on public.task_assignees (user_id);

alter table public.task_assignees enable row level security;

drop policy if exists "task_assignees_select_all" on public.task_assignees;
create policy "task_assignees_select_all" on public.task_assignees
  for select using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and app_private.is_workspace_member(t.workspace_id)
    )
  );

drop policy if exists "task_assignees_modify_members" on public.task_assignees;
create policy "task_assignees_modify_members" on public.task_assignees
  for all
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

-- Realtime so avatar stacks update across tabs.
do $$ begin
  alter publication supabase_realtime add table public.task_assignees;
exception when duplicate_object then null; end $$;

-- Backfill: every existing task with a primary assignee gets a matching
-- row so counts and stacks read correctly from a single source.
insert into public.task_assignees (task_id, user_id)
  select id, assignee_id from public.tasks
  where assignee_id is not null
on conflict do nothing;

-- Sync primary assignee → task_assignees on INSERT/UPDATE. Defined in
-- app_private (not public) so it doesn't get exposed as RPC.
create or replace function app_private.sync_primary_assignee()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.assignee_id is not null then
    insert into public.task_assignees (task_id, user_id)
      values (new.id, new.assignee_id)
      on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke execute on function app_private.sync_primary_assignee() from public;

drop trigger if exists tasks_sync_primary_assignee on public.tasks;
create trigger tasks_sync_primary_assignee
  after insert or update of assignee_id on public.tasks
  for each row execute function app_private.sync_primary_assignee();

-- Tidy up the public.sync_primary_assignee that 0014 would have created
-- on a database that ran migrations in order. Nothing references it
-- anymore on this path, and leaving it in public would add another
-- definer-function-exposed-as-RPC warning the next time the linter runs.
drop function if exists public.sync_primary_assignee();
