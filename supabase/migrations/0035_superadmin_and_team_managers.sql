-- 0035 — Superadmins + team managers.
--
-- Two new responsibilities on top of the existing workspace/team/project
-- roles:
--
--   SUPERADMIN — a small group (4–5 people) with company-wide reach. They
--     see every team, project, and task (the team wall in 0036 lets them
--     through), assign team managers, approve any task, and manage the
--     workspace roster including who else is a superadmin. Modelled as a
--     third value of workspace_members.role ('member' | 'admin' |
--     'superadmin'); is_workspace_admin() now also accepts superadmins so
--     they inherit roster powers.
--
--   TEAM MANAGER — the person(s) who sign off a team's work. A team can
--     have SEVERAL managers, and being a manager is orthogonal to the
--     admin/member team role (you can be both). Stored in its own
--     team_managers table rather than overloading team_members.role, so
--     "multiple managers" and the audit trail (who assigned whom) fall out
--     naturally. Only superadmins assign/remove managers. Every team must
--     keep at least one manager — enforced by a trigger that refuses to
--     delete the last one (skipped when the team itself is being dropped).
--
-- The approval gate that managers operate lives in 0037; the team wall
-- that scopes everyone else lives in 0036. This migration only adds the
-- roles, the helpers, and the seed.
--
-- Idempotent and re-runnable.

begin;

-- Defer SQL-function body validation to the end of the transaction. There's
-- a small circular dependency in this migration: is_team_manager() (a helper,
-- section 1) reads public.team_managers, but that table (section 2) carries
-- RLS policies that call the OTHER helpers (is_superadmin / in_my_team) — so
-- neither "table first" nor "helpers first" resolves cleanly. With body
-- checks off, the helper is created against the not-yet-existing table and
-- everything it references exists by COMMIT. Transaction-scoped (set local).
set local check_function_bodies = off;

-- ============================================================
-- 1) Helpers (app_private; not reachable as PostgREST RPC)
-- ============================================================

-- Company-wide god mode.
create or replace function app_private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid())
      and role = 'superadmin'
  );
$$;

-- Is the caller a member of team t? The outer boundary every non-superadmin
-- is scoped to (used by the 0036 team wall). Null team → never a match.
create or replace function app_private.in_my_team(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t is not null and exists (
    select 1 from public.team_members
    where team_id = t and user_id = (select auth.uid())
  );
$$;

-- Is the caller a manager (approver) of team t?
create or replace function app_private.is_team_manager(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.team_managers
    where team_id = t and user_id = (select auth.uid())
  );
$$;

-- is_workspace_admin now also accepts superadmins, so superadmins inherit
-- every workspace-admin power (roster reads/writes) for free. (Redefinition
-- of the 0034 helper.)
create or replace function app_private.is_workspace_admin(ws_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = ws_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('admin', 'superadmin')
  );
$$;

grant execute on function app_private.is_superadmin() to anon, authenticated, service_role;
grant execute on function app_private.in_my_team(uuid) to anon, authenticated, service_role;
grant execute on function app_private.is_team_manager(uuid) to anon, authenticated, service_role;
grant execute on function app_private.is_workspace_admin(uuid) to authenticated;

-- ============================================================
-- 2) team_managers — who can approve a team's tasks
-- ============================================================
-- The (team_id, user_id) pair references team_members so a manager must be
-- a member of the team they manage, and removing them from the team
-- cascades the manager row away (the min-one trigger below still guards the
-- last-manager case). assigned_by is the superadmin who granted it.
create table if not exists public.team_managers (
  team_id     uuid not null,
  user_id     uuid not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, user_id)
    references public.team_members(team_id, user_id) on delete cascade
);

create index if not exists team_managers_team_idx on public.team_managers(team_id);
create index if not exists team_managers_user_idx on public.team_managers(user_id);

alter table public.team_managers enable row level security;

-- Read: team members (to show the manager badge) and superadmins.
drop policy if exists "team_managers_select" on public.team_managers;
create policy "team_managers_select" on public.team_managers
  for select using (
    app_private.is_superadmin() or app_private.in_my_team(team_id)
  );

-- Write: superadmins assign managers. Exception — the first manager of a
-- brand-new team can be self-assigned by the creator (mirrors the
-- team_members first-admin bootstrap), so "anyone can create a team" still
-- yields a team that satisfies the ≥1-manager rule without a superadmin in
-- the loop. After that one bootstrap row exists, only superadmins manage
-- managers. The composite FK guarantees the target is a team member.
drop policy if exists "team_managers_insert" on public.team_managers;
create policy "team_managers_insert" on public.team_managers
  for insert with check (
    app_private.is_superadmin()
    or (
      user_id = (select auth.uid())
      and not exists (
        select 1 from public.team_managers existing
        where existing.team_id = team_managers.team_id
      )
    )
  );

drop policy if exists "team_managers_delete" on public.team_managers;
create policy "team_managers_delete" on public.team_managers
  for delete using (app_private.is_superadmin());

-- ============================================================
-- 3) "Always ≥1 manager per team" invariant
-- ============================================================
-- Refuse to delete the last manager of a team. Skipped entirely when the
-- parent team no longer exists — i.e. during a team-delete cascade, where
-- the teams row is removed before its team_members / team_managers children,
-- so this must not block tearing a team down.
create or replace function app_private.enforce_min_one_manager()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Team being dropped → let the cascade through.
  if not exists (select 1 from public.teams where id = old.team_id) then
    return old;
  end if;
  -- Last remaining manager → block.
  if not exists (
    select 1 from public.team_managers
    where team_id = old.team_id and user_id <> old.user_id
  ) then
    raise exception 'A team must keep at least one manager. Assign another manager before removing this one.';
  end if;
  return old;
end;
$$;

drop trigger if exists trg_team_managers_min_one on public.team_managers;
create trigger trg_team_managers_min_one
  before delete on public.team_managers
  for each row execute function app_private.enforce_min_one_manager();

-- ============================================================
-- 4) Backfill: every existing team gets an initial manager
-- ============================================================
-- Earliest team admin, falling back to the earliest member. Teams with no
-- members get none (nothing to approve there yet).
insert into public.team_managers (team_id, user_id, assigned_by)
select t.id, pick.user_id, null
from public.teams t
join lateral (
  select tm.user_id
  from public.team_members tm
  where tm.team_id = t.id
  order by (tm.role = 'admin') desc, tm.joined_at asc
  limit 1
) pick on true
where not exists (
  select 1 from public.team_managers m where m.team_id = t.id
)
on conflict (team_id, user_id) do nothing;

-- ============================================================
-- 5) Workspace roster: superadmins manage roles, and only
--    superadmins can grant/revoke the superadmin role itself
-- ============================================================
-- Redefines the 0034 update/delete policies. A workspace admin can manage
-- ordinary members, but the superadmin tier is gated so a regular admin
-- can neither mint a new superadmin nor demote/remove an existing one.
-- In USING, `role` is the existing row; in WITH CHECK, the new row.
do $do$
begin
  if to_regclass('public.workspace_members') is not null then
    drop policy if exists "workspace_members_update" on public.workspace_members;
    create policy "workspace_members_update" on public.workspace_members
      for update
      using (
        app_private.is_workspace_admin(workspace_id)
        and (role <> 'superadmin' or app_private.is_superadmin())
      )
      with check (
        app_private.is_workspace_admin(workspace_id)
        and (role <> 'superadmin' or app_private.is_superadmin())
      );

    drop policy if exists "workspace_members_delete" on public.workspace_members;
    create policy "workspace_members_delete" on public.workspace_members
      for delete
      using (
        app_private.is_workspace_admin(workspace_id)
        and (role <> 'superadmin' or app_private.is_superadmin())
      );
  end if;
end
$do$;

-- ============================================================
-- 6) Seed the initial superadmins
-- ============================================================
-- Matched against auth.users by email. If one of these people hasn't
-- signed in yet there's no auth.users row to match — re-run this block
-- after their first login (it's an idempotent upsert).
do $seed$
declare
  ws_id uuid := '00000000-0000-0000-0000-000000000001';
  emails text[] := array['akshay@tistmedia.in', 'vishal.maurya@tistmedia.in'];
begin
  if to_regclass('public.workspace_members') is null then
    return;
  end if;
  if not exists (select 1 from public.workspaces where id = ws_id) then
    -- Fall back to the first workspace if the default id isn't present.
    select id into ws_id from public.workspaces order by created_at limit 1;
  end if;
  if ws_id is null then
    return;
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  select ws_id, u.id, 'superadmin'
  from auth.users u
  where lower(u.email) = any (emails)
  on conflict (workspace_id, user_id) do update set role = 'superadmin';
end
$seed$;

commit;
