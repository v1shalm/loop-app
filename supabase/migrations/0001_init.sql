-- ─────────────────────────────────────────────────────────────────────────────
-- Loop — initial schema
-- Run this once in your Supabase project's SQL Editor.
-- Idempotent: safe to re-run; uses IF NOT EXISTS / CREATE OR REPLACE.
-- ─────────────────────────────────────────────────────────────────────────────

-- Default workspace id, referenced by handle_new_user() so anyone who signs up
-- is auto-joined to the Loop workspace.
-- (Change this UUID if you want a different default workspace.)
do $$ begin
  perform set_config('app.tist_workspace_id', '00000000-0000-0000-0000-000000000001', false);
end $$;

-- ── Profiles ─────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  initials      text not null,
  avatar_color  text not null default '#E8B4A0',
  created_at    timestamptz not null default now()
);

-- ── Workspaces ───────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  emoji       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id)   on delete cascade,
  role          text not null default 'member',
  joined_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists workspace_members_user_idx
  on public.workspace_members (user_id);

-- ── Projects ─────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  name          text not null,
  emoji         text,
  color         text,
  created_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);

create index if not exists projects_workspace_idx
  on public.projects (workspace_id);

do $$ begin
  alter table public.projects
    add constraint projects_workspace_name_unique
    unique (workspace_id, name);
exception when duplicate_object then null;
  when duplicate_table then null;
end $$;

-- ── Tasks ────────────────────────────────────────────────────────────────────
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null,
  title         text not null,
  description   text,
  status        text not null default 'todo'
                  check (status in ('todo','doing','done')),
  priority      int  not null default 4
                  check (priority between 1 and 4),
  due_at        timestamptz,
  assignee_id   uuid references public.profiles(id) on delete set null,
  author_id     uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists tasks_workspace_status_idx
  on public.tasks (workspace_id, status);
create index if not exists tasks_assignee_idx
  on public.tasks (assignee_id);
create index if not exists tasks_due_idx
  on public.tasks (due_at);
create index if not exists tasks_project_idx
  on public.tasks (project_id);

-- ── Comments ─────────────────────────────────────────────────────────────────
create table if not exists public.task_comments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references public.tasks(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);

create index if not exists task_comments_task_idx
  on public.task_comments (task_id);

-- ── Helper: is the caller a member of a workspace? ───────────────────────────
create or replace function public.is_workspace_member(ws_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws_id and user_id = auth.uid()
  );
$$;

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.workspaces       enable row level security;
alter table public.workspace_members enable row level security;
alter table public.projects         enable row level security;
alter table public.tasks            enable row level security;
alter table public.task_comments    enable row level security;

-- Profiles: any signed-in user can read (for avatars), only self can update.
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Workspaces: only members can read.
drop policy if exists "workspaces_select_members" on public.workspaces;
create policy "workspaces_select_members" on public.workspaces
  for select using (public.is_workspace_member(id));

-- Workspace members: members can read their own membership rows.
drop policy if exists "members_select_same_ws" on public.workspace_members;
create policy "members_select_same_ws" on public.workspace_members
  for select using (public.is_workspace_member(workspace_id));

-- Projects: members can do everything in their workspace.
drop policy if exists "projects_all_members" on public.projects;
create policy "projects_all_members" on public.projects
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Tasks: members can do everything in their workspace.
drop policy if exists "tasks_all_members" on public.tasks;
create policy "tasks_all_members" on public.tasks
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Comments: members of the task's workspace can read/write.
drop policy if exists "comments_all_members" on public.task_comments;
create policy "comments_all_members" on public.task_comments
  for all
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id and public.is_workspace_member(t.workspace_id)
    )
  );

-- ── New-user trigger: create profile, auto-join Loop workspace ──────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  display_name text;
  init_char    text;
  ws_id        uuid := '00000000-0000-0000-0000-000000000001';
  palette      text[] := array[
    '#E8B4A0', '#B4D4E8', '#C4E8B4', '#E8D4B4',
    '#D4B4E8', '#E8C4B4', '#B4E8D4', '#E8E0B4'
  ];
begin
  display_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  init_char := upper(substring(display_name from 1 for 1));

  insert into public.profiles (id, name, initials, avatar_color)
  values (
    new.id,
    display_name,
    init_char,
    palette[1 + (abs(hashtext(new.id::text)) % array_length(palette, 1))]
  )
  on conflict (id) do nothing;

  -- Auto-join the default workspace if it exists.
  if exists (select 1 from public.workspaces where id = ws_id) then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (ws_id, new.id, 'member')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Realtime: stream task + comment changes to subscribers ───────────────────
do $$ begin
  alter publication supabase_realtime add table public.tasks;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.task_comments;
exception when duplicate_object then null; end $$;
