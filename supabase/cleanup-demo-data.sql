-- ─────────────────────────────────────────────────────────────────────────────
-- Remove seeded DEMO data, keeping all real work.  Run in the Supabase dashboard
-- SQL editor (runs as the postgres role, which can delete auth.users).
--
-- SAFETY MODEL:
--   • Runs inside a transaction that ENDS IN ROLLBACK by default — so running it
--     as-is changes NOTHING. It's a dry run that prints before/after counts.
--   • Review the two result sets. When the numbers look right, change the final
--     `rollback;` to `commit;` and run again to apply for real.
--   • Demo accounts are identified ONLY by the @loop.app domain — the one
--     unambiguous marker. Real accounts (e.g. @tistmedia.in) are never touched.
--   • Demo teams/projects are removed ONLY if no real-user work is attached.
--     A team/project that holds any task authored by a real user is KEPT; real
--     tasks themselves are never deleted (at worst they lose a team/project link).
--
-- Demo users are matched inline by email each step (no temp table) so the script
-- is robust in the SQL editor — the rows still exist until step 4 deletes them.
--
-- Pair with: supabase/audit-demo-data.sql (read-only, run that first for context).
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- BEFORE snapshot --------------------------------------------------------------
select 'BEFORE' as phase, 'demo accounts'              as item, count(*) as n from auth.users where email ilike '%@loop.app'
union all select 'BEFORE', 'tasks authored by demo',  count(*) from public.tasks t
      where t.author_id in (select id from auth.users where email ilike '%@loop.app')
union all select 'BEFORE', 'comments by demo',         count(*) from public.task_comments c
      where c.author_id in (select id from auth.users where email ilike '%@loop.app')
union all select 'BEFORE', 'demo teams present',       count(*) from public.teams    where name in ('Design','Engineering','Marketing')
union all select 'BEFORE', 'seeded projects present',  count(*) from public.projects where name in
      ('Team Setup Guide','Brand refresh','Office ops','Dashboard polish','Onboarding revamp','Platform debt','Realtime hardening','Storage & uploads')
order by item;

-- 1) Demo-authored content ------------------------------------------------------
-- Comments the demo users wrote (reactions on them cascade via comment_id).
delete from public.task_comments
 where author_id in (select id from auth.users where email ilike '%@loop.app');

-- Reactions demo users left on real comments (would cascade on user delete too).
delete from public.comment_reactions
 where user_id in (select id from auth.users where email ilike '%@loop.app');

-- Tasks the demo users authored = the seeded sample tasks. Their subtasks,
-- assignees, attachments and comments cascade. A real-authored task that merely
-- has a demo *assignee* is NOT deleted — the assignee just nulls out in step 4.
delete from public.tasks
 where author_id in (select id from auth.users where email ilike '%@loop.app');

-- 2) Seeded demo PROJECTS — only if no real work remains in them ----------------
delete from public.projects p
 where p.name in ('Team Setup Guide','Brand refresh','Office ops',
                  'Dashboard polish','Onboarding revamp','Platform debt',
                  'Realtime hardening','Storage & uploads')
   and not exists (
     select 1 from public.tasks t
       join auth.users u on u.id = t.author_id
      where t.project_id = p.id and u.email not ilike '%@loop.app');

-- 3) Seeded demo TEAMS — only if no real-authored tasks AND no real members -----
delete from public.teams t
 where t.name in ('Design','Engineering','Marketing')
   and not exists (
     select 1 from public.tasks x
       join auth.users u on u.id = x.author_id
      where x.team_id = t.id and u.email not ilike '%@loop.app')
   and not exists (
     select 1 from public.team_members m
       join auth.users u on u.id = m.user_id
      where m.team_id = t.id and u.email not ilike '%@loop.app');

-- 4) The demo accounts themselves -----------------------------------------------
-- Cascades remove their profile, workspace/team memberships and any leftover
-- reactions; SET NULL clears any author/assignee references left on real rows.
delete from auth.users where email ilike '%@loop.app';

-- AFTER snapshot ---------------------------------------------------------------
select 'AFTER' as phase, 'demo accounts left'        as item, count(*) as n from auth.users where email ilike '%@loop.app'
union all select 'AFTER', 'demo teams left',          count(*) from public.teams where name in ('Design','Engineering','Marketing')
union all select 'AFTER', 'seeded projects left',     count(*) from public.projects where name in
      ('Team Setup Guide','Brand refresh','Office ops','Dashboard polish','Onboarding revamp','Platform debt','Realtime hardening','Storage & uploads')
union all select 'AFTER', 'REAL accounts (unchanged)',count(*) from auth.users where email not ilike '%@loop.app'
union all select 'AFTER', 'tasks total remaining',    count(*) from public.tasks
order by item;

-- ───────────────────────────────────────────────────────────────────────────
-- Review the BEFORE/AFTER counts. Real accounts must be unchanged.
-- To APPLY: change the line below to  commit;  and re-run.
rollback;
