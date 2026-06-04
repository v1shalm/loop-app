-- ─────────────────────────────────────────────────────────────────────────────
-- Delete teams NOT made by a real person.  Run in the Supabase dashboard SQL
-- editor (postgres role). Rollback-by-default — running as-is changes nothing.
--
-- WHY MEMBERSHIP, NOT CREATOR:
--   public.teams has no "created_by" column, so there's no stored record of who
--   made a team. Proxy: when a real person creates a team in the app they become
--   its ADMIN (first-admin bootstrap, migration 0016). Seeded demo teams have
--   only @loop.app members. So:
--     KEEP   = a real (non-@loop.app) user is an ADMIN of the team.
--     DELETE = no real admin (purely demo/seeded, or real users only joined).
--   (No teams were created by the assistant — only unran SQL scripts existed.)
--
-- EFFECT OF DELETING A TEAM:
--   Cascades its team_members / active-selection / invitations / wall posts, and
--   SET-NULLs team_id on any tasks/projects in it. Real tasks/projects are NEVER
--   deleted — at worst a real task that was backfilled into a demo team loses its
--   team link (becomes "no team"). Review the preview before committing.
--
-- TO APPLY: review the PREVIEW + AFTER counts, then change `rollback;` to `commit;`.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- PREVIEW — every team, who's in it, and the verdict --------------------------
select
  t.id,
  t.name,
  count(*) filter (where u.email not ilike '%@loop.app' and m.role = 'admin') as real_admins,
  count(*) filter (where u.email not ilike '%@loop.app')                      as real_members,
  count(*) filter (where u.email ilike '%@loop.app')                          as demo_members,
  case
    when count(*) filter (where u.email not ilike '%@loop.app' and m.role = 'admin') > 0
    then 'KEEP'
    else 'DELETE'
  end as verdict
from public.teams t
left join public.team_members m on m.team_id = t.id
left join auth.users u         on u.id = m.user_id
group by t.id, t.name
order by verdict, t.name;

-- DELETE — teams with no real admin -------------------------------------------
delete from public.teams t
 where not exists (
   select 1
     from public.team_members m
     join auth.users u on u.id = m.user_id
    where m.team_id = t.id
      and m.role = 'admin'
      and u.email not ilike '%@loop.app');

-- AFTER — teams that remain ----------------------------------------------------
select t.id, t.name,
       (select count(*) from public.team_members m where m.team_id = t.id) as members
from public.teams t
order by t.name;

-- Real tasks/projects that just lost their team link (now "no team"), if any.
select 'tasks with no team'    as item, count(*) from public.tasks    where team_id is null
union all
select 'projects with no team',        count(*) from public.projects where team_id is null;

-- ───────────────────────────────────────────────────────────────────────────
-- Review PREVIEW (verdicts) + AFTER. To APPLY, change the line below to commit;
rollback;
