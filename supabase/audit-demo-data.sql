-- ─────────────────────────────────────────────────────────────────────────────
-- READ-ONLY audit of demo vs. real data.  Runs ONLY SELECTs — changes nothing.
-- Purpose: before deleting any demo data, see how much of it is tangled up with
-- real data (shared workspace, demo teams holding real tasks, etc.).
--
-- Run in the Supabase dashboard SQL editor, or:
--   npx supabase db query --linked --file supabase/audit-demo-data.sql
--
-- "Demo" = any auth user on the @loop.app domain (demo, alex, mia, ravi, priya,
-- nadia, sam). Real users are everyone else (e.g. @tistmedia.in).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Accounts split demo vs. real -------------------------------------------------
select
  case when u.email like '%@loop.app' then 'DEMO (@loop.app)' else 'REAL' end as kind,
  count(*)                                            as users,
  string_agg(u.email, ', ' order by u.email)          as emails
from auth.users u
group by 1
order by 1;

-- 2) Workspaces (expect a single shared "Loop" workspace …0001) -------------------
select
  w.id, w.name, w.emoji,
  (select count(*) from public.workspace_members m where m.workspace_id = w.id) as members,
  (select count(*) from public.tasks t            where t.workspace_id = w.id) as tasks,
  (select count(*) from public.projects p         where p.workspace_id = w.id) as projects
from public.workspaces w
order by w.name;

-- 3) Teams — and crucially, how many of their tasks/projects were authored by a
--    REAL user (i.e. real work that would lose its team_id if the team is deleted)
select
  t.id, t.name, t.color,
  (select count(*) from public.tasks x where x.team_id = t.id) as tasks_total,
  (select count(*) from public.tasks x
     join auth.users u on u.id = x.author_id
    where x.team_id = t.id and u.email not like '%@loop.app') as tasks_by_REAL_author,
  (select count(*) from public.projects p where p.team_id = t.id) as projects_total,
  (select count(*) from public.team_members tm
     join auth.users u on u.id = tm.user_id
    where tm.team_id = t.id and u.email not like '%@loop.app') as REAL_members
from public.teams t
order by t.name;

-- 4) Projects — the 3 seeded starters plus anything else, with real-author counts
select
  p.id, p.name, p.emoji,
  (select count(*) from public.tasks x where x.project_id = p.id) as tasks_total,
  (select count(*) from public.tasks x
     join auth.users u on u.id = x.author_id
    where x.project_id = p.id and u.email not like '%@loop.app') as tasks_by_REAL_author
from public.projects p
order by p.name;

-- 5) Tasks authored / assigned by demo users (these get author/assignee SET NULL
--    when the demo user is deleted, so they'd be orphaned unless removed first)
select
  count(*) filter (where au.email  like '%@loop.app') as tasks_authored_by_demo,
  count(*) filter (where asg.email like '%@loop.app') as tasks_assigned_to_demo
from public.tasks x
left join auth.users au  on au.id  = x.author_id
left join auth.users asg on asg.id = x.assignee_id;

-- 6) Comments / reactions by demo users ------------------------------------------
select
  (select count(*) from public.task_comments c
     join auth.users u on u.id = c.author_id where u.email like '%@loop.app') as comments_by_demo,
  (select count(*) from public.comment_reactions r
     join auth.users u on u.id = r.user_id   where u.email like '%@loop.app') as reactions_by_demo;
