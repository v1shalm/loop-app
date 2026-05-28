-- 0032 — Real notifications table
--
-- Replaces the derived bell feed (tasks + task_comments joined in the
-- client) with a single `notifications` table populated by triggers.
-- Lets us notify on completion, reschedule, comments to non-assignees,
-- and @mentions without each one needing its own bespoke query.
--
-- The cursor approach (profiles.notifications_last_read_at) still drives
-- the unread count. We don't add a per-row read flag; one cursor is
-- enough for "mark all read".
--
-- Idempotent. Safe to re-run.

-- ── Table ──────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  actor_id      uuid          references public.profiles(id) on delete set null,
  task_id       uuid          references public.tasks(id) on delete cascade,
  comment_id    uuid          references public.task_comments(id) on delete cascade,
  kind          text not null check (kind in ('assigned','completed','rescheduled','comment','mention')),
  payload       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_task_idx
  on public.notifications (task_id);

-- One 'assigned' row per (recipient, task). Stops the primary-assignee
-- path and the task_assignees-sync path from double-inserting.
create unique index if not exists notifications_assigned_unique
  on public.notifications (recipient_id, task_id)
  where kind = 'assigned';

-- ── RLS ────────────────────────────────────────────────────────────────

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self" on public.notifications
  for select using (recipient_id = auth.uid());

-- No insert/update/delete policies for end users. Triggers (security
-- definer) write rows. Recipients can only read.

-- Realtime so toasts fire the moment a row lands.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ── Trigger: tasks ─────────────────────────────────────────────────────
-- Covers: assignment on INSERT, re-assignment on UPDATE, completion,
-- reschedule (due_at change). All notifications skip the actor.

create or replace function app_private.notify_on_task_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
begin
  if (tg_op = 'INSERT') then
    if new.assignee_id is not null
       and new.assignee_id is distinct from v_actor then
      insert into public.notifications (recipient_id, actor_id, task_id, kind, payload)
      values (new.assignee_id, v_actor, new.id, 'assigned',
              jsonb_build_object('task_title', new.title))
      on conflict do nothing;
    end if;
    return null;
  end if;

  -- UPDATE branch
  if (new.assignee_id is distinct from old.assignee_id
      and new.assignee_id is not null
      and new.assignee_id is distinct from v_actor) then
    insert into public.notifications (recipient_id, actor_id, task_id, kind, payload)
    values (new.assignee_id, v_actor, new.id, 'assigned',
            jsonb_build_object('task_title', new.title))
    on conflict do nothing;
  end if;

  if (new.status = 'done'
      and old.status is distinct from 'done'
      and new.author_id is not null
      and new.author_id is distinct from v_actor) then
    insert into public.notifications (recipient_id, actor_id, task_id, kind, payload)
    values (new.author_id, v_actor, new.id, 'completed',
            jsonb_build_object('task_title', new.title));
  end if;

  if (new.due_at is distinct from old.due_at
      and new.author_id is not null
      and new.author_id is distinct from v_actor) then
    insert into public.notifications (recipient_id, actor_id, task_id, kind, payload)
    values (new.author_id, v_actor, new.id, 'rescheduled',
            jsonb_build_object(
              'task_title', new.title,
              'from_due_at', old.due_at,
              'to_due_at', new.due_at
            ));
  end if;

  return null;
end;
$$;

revoke execute on function app_private.notify_on_task_change() from public;

drop trigger if exists tasks_notify_after_iu on public.tasks;
create trigger tasks_notify_after_iu
  after insert or update on public.tasks
  for each row execute function app_private.notify_on_task_change();

-- ── Trigger: task_assignees (co-assignees) ─────────────────────────────
-- The primary-assignee path is covered by notify_on_task_change. This
-- handles adds to task_assignees that aren't a primary-assignee sync.
-- The unique partial index on (recipient_id, task_id) where kind='assigned'
-- collapses the double-fire silently.

create or replace function app_private.notify_on_assignee_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_title text;
begin
  if new.user_id is null or new.user_id = v_actor then
    return null;
  end if;
  select title into v_title from public.tasks where id = new.task_id;
  insert into public.notifications (recipient_id, actor_id, task_id, kind, payload)
  values (new.user_id, v_actor, new.task_id, 'assigned',
          jsonb_build_object('task_title', coalesce(v_title, 'a task')))
  on conflict do nothing;
  return null;
end;
$$;

revoke execute on function app_private.notify_on_assignee_insert() from public;

drop trigger if exists task_assignees_notify_after_i on public.task_assignees;
create trigger task_assignees_notify_after_i
  after insert on public.task_assignees
  for each row execute function app_private.notify_on_assignee_insert();

-- ── Trigger: task_comments ─────────────────────────────────────────────
-- Notify task author + assignee + co-assignees + prior commenters
-- (minus the comment author). Anyone @mentioned in the body gets a
-- 'mention' notification instead of a 'comment' notification so the
-- bell can highlight it.

create or replace function app_private.notify_on_comment_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_task record;
  v_recip uuid;
  v_mentions uuid[];
  v_preview text;
begin
  select id, title, author_id, assignee_id
    into v_task
    from public.tasks where id = new.task_id;

  -- Parse @[Name](uuid) mentions. Distinct, exclude the comment author.
  v_mentions := array(
    select distinct ((regexp_matches(new.body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g'))[1])::uuid
  );
  v_mentions := array(
    select x from unnest(v_mentions) x where x is not null and x <> new.author_id
  );

  v_preview := left(new.body, 200);

  -- 'mention' notifications first
  foreach v_recip in array v_mentions loop
    insert into public.notifications
      (recipient_id, actor_id, task_id, comment_id, kind, payload)
    values (v_recip, new.author_id, new.task_id, new.id, 'mention',
            jsonb_build_object('task_title', v_task.title, 'preview', v_preview));
  end loop;

  -- 'comment' notifications for the rest of the stakeholders
  for v_recip in
    select distinct user_id from (
      select v_task.author_id   as user_id
      union
      select v_task.assignee_id
      union
      select user_id from public.task_assignees where task_id = new.task_id
      union
      select author_id from public.task_comments where task_id = new.task_id
    ) x
    where user_id is not null
      and user_id <> new.author_id
      and not (user_id = any (v_mentions))
  loop
    insert into public.notifications
      (recipient_id, actor_id, task_id, comment_id, kind, payload)
    values (v_recip, new.author_id, new.task_id, new.id, 'comment',
            jsonb_build_object('task_title', v_task.title, 'preview', v_preview));
  end loop;

  return null;
end;
$$;

revoke execute on function app_private.notify_on_comment_insert() from public;

drop trigger if exists task_comments_notify_after_i on public.task_comments;
create trigger task_comments_notify_after_i
  after insert on public.task_comments
  for each row execute function app_private.notify_on_comment_insert();

-- ── Backfill (last 14 days) ────────────────────────────────────────────
-- So the bell isn't empty for users who already have history. Matches
-- the lookback the derived feed used. Guarded so re-running the
-- migration doesn't duplicate comment notifications (assignments are
-- already protected by the unique partial index).

do $$ begin
  if not exists (select 1 from public.notifications limit 1) then
    insert into public.notifications (recipient_id, actor_id, task_id, kind, payload, created_at)
    select t.assignee_id, t.author_id, t.id, 'assigned',
           jsonb_build_object('task_title', t.title),
           t.created_at
    from public.tasks t
    where t.assignee_id is not null
      and t.author_id is not null
      and t.assignee_id <> t.author_id
      and t.created_at > now() - interval '14 days'
    on conflict do nothing;

    insert into public.notifications (recipient_id, actor_id, task_id, comment_id, kind, payload, created_at)
    select t.assignee_id, c.author_id, t.id, c.id, 'comment',
           jsonb_build_object('task_title', t.title, 'preview', left(c.body, 200)),
           c.created_at
    from public.task_comments c
    join public.tasks t on t.id = c.task_id
    where t.assignee_id is not null
      and t.assignee_id <> c.author_id
      and c.created_at > now() - interval '14 days';
  end if;
end $$;
