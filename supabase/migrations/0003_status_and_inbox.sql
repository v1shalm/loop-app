-- 0003 — Team Pulse statuses + Inbox triage state
--
-- profiles.status: user-set mood shown next to teammate names in the Team
-- Pulse sidebar section. Nullable so users can have no status.
--
-- tasks.triaged_at: when the assignee acknowledged a task assigned to them
-- by someone else. Untriaged + open + author-isn't-me = Inbox.

alter table public.profiles
  add column if not exists status text;

alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status is null or status in ('coffee', 'focus', 'done', 'busy'));

alter table public.tasks
  add column if not exists triaged_at timestamptz;

-- Speeds up the Inbox query: untriaged open assignments per user.
create index if not exists tasks_inbox_idx
  on public.tasks (assignee_id, triaged_at, status)
  where triaged_at is null;
