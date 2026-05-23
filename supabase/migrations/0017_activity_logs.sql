-- Activity Logs to track task changes
-- This fulfills the "Audit Trail" requirement for large enterprise teams.

create table if not exists public.task_activity_logs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null, -- 'created', 'status_changed', 'assignee_changed', 'deleted', etc.
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

create index if not exists task_activity_logs_task_id_idx on public.task_activity_logs(task_id);
create index if not exists task_activity_logs_created_at_idx on public.task_activity_logs(created_at desc);

-- RLS
alter table public.task_activity_logs enable row level security;

-- A user can see activity logs if they can see the task
drop policy if exists "task_activity_logs_select" on public.task_activity_logs;
create policy "task_activity_logs_select" on public.task_activity_logs
  for select using (
    exists (
      select 1 from public.tasks
      where id = task_activity_logs.task_id
      and (team_id is null or team_id = public.my_team_id())
    )
  );

-- Service role only for inserts via triggers
drop policy if exists "task_activity_logs_insert" on public.task_activity_logs;
create policy "task_activity_logs_insert" on public.task_activity_logs
  for insert with check (false); -- Application should not insert directly, only triggers

-- Triggers for automatic logging
create or replace function public.log_task_activity()
returns trigger
language plpgsql
security definer
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  
  if TG_OP = 'INSERT' then
    insert into public.task_activity_logs (task_id, actor_id, action)
    values (NEW.id, current_user_id, 'created');
  elsif TG_OP = 'UPDATE' then
    if OLD.status IS DISTINCT FROM NEW.status then
      insert into public.task_activity_logs (task_id, actor_id, action, old_value, new_value)
      values (NEW.id, current_user_id, 'status_changed', OLD.status, NEW.status);
    end if;
    if OLD.assignee_id IS DISTINCT FROM NEW.assignee_id then
      insert into public.task_activity_logs (task_id, actor_id, action, old_value, new_value)
      values (NEW.id, current_user_id, 'assignee_changed', OLD.assignee_id::text, NEW.assignee_id::text);
    end if;
  end if;
  
  return null;
end;
$$;

drop trigger if exists log_task_activity_trigger on public.tasks;
create trigger log_task_activity_trigger
  after insert or update on public.tasks
  for each row execute function public.log_task_activity();
