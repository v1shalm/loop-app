-- 0026 — Threaded comments
--
-- Adds parent_comment_id to task_comments so a comment can be a reply
-- to another comment. Top-level comments have parent_comment_id null;
-- replies set it to their root. The UI groups by parent so a long
-- discussion stays readable (Slack-style threads, collapsed by default).
--
-- We deliberately stay one-level-deep — a reply can't itself spawn
-- replies. The drawer only renders parent → children, not parent →
-- children → grandchildren. Keeps the data model + UI simple for an
-- internal team tool; nobody wants 5-level nested arguments.

alter table public.task_comments
  add column if not exists parent_comment_id uuid
  references public.task_comments(id) on delete cascade;

create index if not exists task_comments_parent_idx
  on public.task_comments (parent_comment_id);

-- Safety: a reply must point to a comment on the same task. Without
-- this you could thread across tasks, which would surface a comment in
-- a discussion the parent never belonged to.
create or replace function public.enforce_comment_same_task()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_task uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;
  select task_id into parent_task
  from public.task_comments
  where id = new.parent_comment_id;
  if parent_task is null then
    raise exception 'parent comment % not found', new.parent_comment_id;
  end if;
  if parent_task <> new.task_id then
    raise exception 'parent comment % belongs to a different task', new.parent_comment_id;
  end if;
  -- One-level only: forbid replying to a reply.
  if exists (
    select 1 from public.task_comments
    where id = new.parent_comment_id and parent_comment_id is not null
  ) then
    raise exception 'cannot reply to a reply; reply to the root comment instead';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_comment_same_task on public.task_comments;
create trigger trg_enforce_comment_same_task
  before insert or update on public.task_comments
  for each row execute function public.enforce_comment_same_task();
