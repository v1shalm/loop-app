-- Recurring tasks.
--
-- Model (same as Todoist/Any.do): a recurring task is ONE row carrying a
-- recurrence rule. Completing it does not set status='done' — instead the
-- app advances its due_at to the next occurrence and the task stays open.
-- This keeps history simple (no exploding row count) and means counts,
-- assignees, comments, and subtasks all carry forward.
--
-- Rule format (compact strings):
--   daily            every day
--   weekdays         Monday-Friday
--   weekly           every 7 days, anchored to the current due weekday
--   weekly:N         every week on weekday N (0=Sun .. 6=Sat)
--   monthly          same day-of-month each month (clamped to month length)
--   yearly           same month/day each year

alter table public.tasks
  add column if not exists recurrence text;

alter table public.tasks
  drop constraint if exists tasks_recurrence_check;

alter table public.tasks
  add constraint tasks_recurrence_check
  check (
    recurrence is null
    or recurrence in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly')
    or recurrence ~ '^weekly:[0-6]$'
  );
