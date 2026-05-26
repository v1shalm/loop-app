-- 0028 — Notifications read state
--
-- A single timestamp on `profiles` indicating when the user last opened
-- the inbox. Anything created after this timestamp is "unread"; the
-- "Mark all read" button bumps the timestamp to now().
--
-- Notifications themselves are derived data — assignments come from
-- `task_activity_logs` and `tasks.assignee_id`, comments come from
-- `task_comments`. We deliberately avoid a dedicated `notifications`
-- table: it would just duplicate state and require an insert on every
-- noteworthy event. A single read-cursor is the smallest change that
-- gives us "unread count" + "mark all read" semantics, and it's easy
-- to upgrade to per-item read tracking later if needed.

alter table public.profiles
  add column if not exists notifications_last_read_at timestamptz not null default now();

-- RPC: bump the timestamp to now() for the calling user. Used by the
-- inbox's "Mark all read" affordance. Security definer + auth.uid()
-- so the client never has to send the user id explicitly.
create or replace function public.mark_notifications_read()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  update public.profiles
    set notifications_last_read_at = now()
    where id = auth.uid()
  returning notifications_last_read_at;
$$;

grant execute on function public.mark_notifications_read() to authenticated;
