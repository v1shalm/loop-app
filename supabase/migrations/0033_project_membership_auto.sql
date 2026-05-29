-- 0033 — Notifications always lead somewhere
--
-- Closes the gap where a user receives a notification about a task they
-- cannot see. Cause: RLS on tasks requires project membership, but the
-- "auto-add assignee to project" logic lived only in lib/actions.ts.
-- Any write that bypassed that path (seed data, bulk inserts, future
-- code paths) created notifications pointing at unreachable tasks.
--
-- Fix: DB-level triggers that always add the recipient of a task event
-- to the task's project_members. So if you got a notification, you can
-- open the task. Model is unchanged: same "everyone in the workspace
-- can join any project" rule, just guaranteed instead of best-effort.
--
-- Adds three triggers, all security-definer so they bypass the
-- project_members RLS that normally requires being-a-member-to-add.
-- Plus a one-time backfill that fixes existing notifications.
--
-- Idempotent. Safe to re-run.

-- ── Helper: grant project membership ───────────────────────────────────

create or replace function app_private.ensure_project_membership(
  p_project_id uuid,
  p_user_id uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_project_id is null or p_user_id is null then
    return;
  end if;
  insert into public.project_members (project_id, user_id, role, joined_at)
  values (p_project_id, p_user_id, 'member', now())
  on conflict do nothing;
end;
$$;

revoke execute on function app_private.ensure_project_membership(uuid, uuid) from public;

-- ── Trigger: tasks (primary assignee) ──────────────────────────────────
-- When tasks.assignee_id is set on INSERT or changed on UPDATE, the new
-- assignee joins the task's project. project_id may also change; cover
-- both by reacting to any change in (assignee_id, project_id).

create or replace function app_private.task_assignee_join_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.project_id is null or new.assignee_id is null then
    return null;
  end if;
  perform app_private.ensure_project_membership(new.project_id, new.assignee_id);
  return null;
end;
$$;

revoke execute on function app_private.task_assignee_join_project() from public;

drop trigger if exists tasks_assignee_join_project on public.tasks;
create trigger tasks_assignee_join_project
  after insert or update of assignee_id, project_id on public.tasks
  for each row execute function app_private.task_assignee_join_project();

-- ── Trigger: task_assignees (co-assignees) ─────────────────────────────
-- Co-assignee added → the new user joins the task's project.

create or replace function app_private.coassignee_join_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
begin
  select project_id into v_project_id from public.tasks where id = new.task_id;
  perform app_private.ensure_project_membership(v_project_id, new.user_id);
  return null;
end;
$$;

revoke execute on function app_private.coassignee_join_project() from public;

drop trigger if exists task_assignees_join_project on public.task_assignees;
create trigger task_assignees_join_project
  after insert on public.task_assignees
  for each row execute function app_private.coassignee_join_project();

-- ── Trigger: task_comments (mentions) ──────────────────────────────────
-- @[Name](uuid) mentions grant project access too. If someone is
-- pulled into a conversation, they should be able to open the task.

create or replace function app_private.mention_join_project()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_project_id uuid;
  v_mention uuid;
begin
  select project_id into v_project_id from public.tasks where id = new.task_id;
  if v_project_id is null then
    return null;
  end if;
  for v_mention in
    select distinct ((regexp_matches(new.body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g'))[1])::uuid
  loop
    perform app_private.ensure_project_membership(v_project_id, v_mention);
  end loop;
  return null;
end;
$$;

revoke execute on function app_private.mention_join_project() from public;

drop trigger if exists task_comments_mention_join_project on public.task_comments;
create trigger task_comments_mention_join_project
  after insert on public.task_comments
  for each row execute function app_private.mention_join_project();

-- ── Backfill: heal existing notifications that point at hidden tasks ──
-- For every existing task with both an assignee and a project, ensure
-- the assignee is in project_members. Same for every co-assignee row.
-- Same for every historical @mention in task_comments.

insert into public.project_members (project_id, user_id, role, joined_at)
select distinct t.project_id, t.assignee_id, 'member', coalesce(t.created_at, now())
from public.tasks t
where t.project_id is not null
  and t.assignee_id is not null
on conflict do nothing;

insert into public.project_members (project_id, user_id, role, joined_at)
select distinct t.project_id, ta.user_id, 'member', coalesce(ta.created_at, now())
from public.task_assignees ta
join public.tasks t on t.id = ta.task_id
where t.project_id is not null
on conflict do nothing;

insert into public.project_members (project_id, user_id, role, joined_at)
select distinct t.project_id, m.mention_id, 'member', now()
from public.task_comments c
join public.tasks t on t.id = c.task_id
cross join lateral (
  select ((regexp_matches(c.body, '@\[[^\]]+\]\(([0-9a-f-]{36})\)', 'g'))[1])::uuid as mention_id
) m
where t.project_id is not null
  and m.mention_id is not null
on conflict do nothing;
