-- Round 2: why did the member's "mark done" silently no-op on the TEST task?
-- Read-only. Run each SELECT and paste results.

-- A) The TEST task + its project's team linkage.
select 'task_and_project' as check,
       tk.id          as task_id,
       tk.title,
       tk.status,
       tk.team_id     as task_team_id,
       tk.author_id,
       p.id           as project_id,
       p.name         as project_name,
       p.team_id      as project_team_id
from public.tasks tk
left join public.projects p on p.id = tk.project_id
where tk.title = 'This is a TEST to see if approvals work or not';

-- B) The author's (mauryav518) memberships relevant to that task.
--    can_see_task(project task) for a non-superadmin needs EITHER
--    team-manager of the project's team, OR (member of that team AND
--    member of that project).
select 'author_memberships' as check,
       u.email,
       exists (select 1 from public.team_members      tm
               join public.tasks t on t.title = 'This is a TEST to see if approvals work or not'
               where tm.user_id = u.id and tm.team_id = t.team_id)        as is_team_member,
       exists (select 1 from public.team_managers      mg
               join public.tasks t on t.title = 'This is a TEST to see if approvals work or not'
               where mg.user_id = u.id and mg.team_id = t.team_id)        as is_team_manager,
       exists (select 1 from public.project_members    pm
               join public.tasks t on t.title = 'This is a TEST to see if approvals work or not'
               where pm.user_id = u.id and pm.project_id = t.project_id)  as is_project_member
from auth.users u
where u.email = 'mauryav518@gmail.com';

-- C) Who actually manages the Product Design team (these are the approvers)?
select 'product_design_managers' as check,
       u.email
from public.team_managers mg
join public.teams t on t.id = mg.team_id
join auth.users u on u.id = mg.user_id
where t.name = 'Product Design';

-- D) Is vishal a superadmin? (decides whether you should see ALL in_review)
select 'vishal_role' as check, wm.role
from auth.users u
join public.workspace_members wm on wm.user_id = u.id
where u.email = 'vishal.maurya@tistmedia.in';
