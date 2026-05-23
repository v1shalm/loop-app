-- Teams + role-based scoping.
--
-- Brief calls for "at least two teams with a few users each, tasks scoped
-- to a team, users assigned only within their team" + "at least two roles
-- with different permissions". We model it as:
--
-- - One workspace = the organization (already exists)
-- - Teams = sub-groups within the workspace
-- - Each user belongs to exactly ONE team (clean model — matches the brief
--   literally; multi-team would add team-switching state with no payoff)
-- - team_members.role is 'admin' or 'member'
-- - Tasks and projects carry a team_id; RLS enforces visibility by team
-- - Admins can manage their team's membership; members work on tasks only

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

alter table public.team_members
  drop constraint if exists team_members_role_check;
alter table public.team_members
  add constraint team_members_role_check
  check (role in ('admin', 'member'));

create index if not exists team_members_user_id_idx on public.team_members(user_id);
create index if not exists team_members_team_id_idx on public.team_members(team_id);

-- One team per user — enforces the chosen model at the DB level
create unique index if not exists team_members_one_team_per_user
  on public.team_members(user_id);

alter table public.tasks
  add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.projects
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists tasks_team_id_idx on public.tasks(team_id);
create index if not exists projects_team_id_idx on public.projects(team_id);

-- Helper: which team does the calling user belong to?
create or replace function public.my_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.team_members where user_id = auth.uid() limit 1
$$;

create or replace function public.is_team_admin(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members
    where team_id = t and user_id = auth.uid() and role = 'admin'
  )
$$;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "teams_select" on public.teams;
create policy "teams_select" on public.teams
  for select using (true);

drop policy if exists "teams_insert" on public.teams;
create policy "teams_insert" on public.teams
  for insert with check (auth.uid() is not null);

drop policy if exists "team_members_select" on public.team_members;
create policy "team_members_select" on public.team_members
  for select using (true);

-- Only admins of the same team can add/remove members
drop policy if exists "team_members_modify_admin" on public.team_members;
create policy "team_members_modify_admin" on public.team_members
  for all
  using (public.is_team_admin(team_id))
  with check (public.is_team_admin(team_id));

-- ── Task RLS layered with team scope ─────────────────────────────────────
-- Keep existing workspace-wide policies (they let any workspace member
-- read), but add a team-aware policy that takes precedence for writes
drop policy if exists "tasks_team_scope_select" on public.tasks;
create policy "tasks_team_scope_select" on public.tasks
  for select using (
    team_id is null or team_id = public.my_team_id()
  );

drop policy if exists "tasks_team_scope_modify" on public.tasks;
create policy "tasks_team_scope_modify" on public.tasks
  for all
  using (team_id is null or team_id = public.my_team_id())
  with check (team_id is null or team_id = public.my_team_id());

drop policy if exists "projects_team_scope_select" on public.projects;
create policy "projects_team_scope_select" on public.projects
  for select using (
    team_id is null or team_id = public.my_team_id()
  );

drop policy if exists "projects_team_scope_modify" on public.projects;
create policy "projects_team_scope_modify" on public.projects
  for all
  using (team_id is null or team_id = public.my_team_id())
  with check (team_id is null or team_id = public.my_team_id());
