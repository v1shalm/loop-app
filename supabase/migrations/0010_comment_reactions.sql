-- 0010 — Reactions on task comments
--
-- One row per (comment, user, emoji). Composite primary key gives us
-- toggle behaviour for free: insert to add, delete to remove. Read path
-- aggregates with a count + a boolean "did I react" for the current user.

create table if not exists public.comment_reactions (
  comment_id  uuid not null references public.task_comments(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  primary key (comment_id, user_id, emoji)
);

create index if not exists comment_reactions_comment_id_idx
  on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

-- A user can read every reaction on every comment they can read (RLS on
-- task_comments already constrains visibility by workspace).
drop policy if exists "comment_reactions_select_all" on public.comment_reactions;
create policy "comment_reactions_select_all" on public.comment_reactions
  for select using (
    exists (
      select 1 from public.task_comments c
      join public.tasks t on t.id = c.task_id
      where c.id = comment_id
        and public.is_workspace_member(t.workspace_id)
    )
  );

-- A user can only insert/delete their own reactions.
drop policy if exists "comment_reactions_modify_self" on public.comment_reactions;
create policy "comment_reactions_modify_self" on public.comment_reactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Realtime so reactions broadcast across tabs
do $$ begin
  alter publication supabase_realtime add table public.comment_reactions;
exception when duplicate_object then null; end $$;
