-- 0038 — create_task_for_me RPC.
--
-- Members could not create tasks: a direct INSERT into public.tasks is
-- rejected by RLS ("new row violates row-level security policy for table
-- tasks") for everyone except superadmins, even when the member's own task
-- satisfies tasks_insert_visible on paper (author_id = auth.uid(), workspace
-- member, project_id null). Projects never had this problem because they are
-- created through the SECURITY DEFINER function create_project_for_me, which
-- runs as the function owner and isn't subject to the INSERT policy.
--
-- This gives tasks the same treatment: a SECURITY DEFINER RPC that validates
-- the caller in its body (signed in, workspace member or superadmin, and —
-- when the task is filed under a project — able to reach that project) and
-- then inserts. team_id is still stamped by the 0036 trg_tasks_1_sync_team
-- trigger; the 0037 approval gate still runs (a normal 'todo' insert passes).
--
-- Idempotent and re-runnable.

begin;

create or replace function public.create_task_for_me(
  p_title       text,
  p_description text        default null,
  p_priority    int         default 4,
  p_due_at      timestamptz default null,
  p_project_id  uuid        default null,
  p_assignee_id uuid        default null,
  p_recurrence  text        default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid      uuid := (select auth.uid());
  ws       uuid;
  assignee uuid;
  new_id   uuid;
  trimmed  text := btrim(coalesce(p_title, ''));
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if trimmed = '' then raise exception 'Task title required'; end if;
  if length(trimmed) > 500 then raise exception 'Task title too long'; end if;

  assignee := coalesce(p_assignee_id, uid);

  -- Default workspace = earliest created (matches getDefaultWorkspace()).
  select id into ws from public.workspaces order by created_at limit 1;
  if ws is null then raise exception 'No workspace found'; end if;

  -- The caller must belong to the workspace (or be a superadmin).
  if not (app_private.is_superadmin() or app_private.is_workspace_member(ws)) then
    raise exception 'You are not a member of this workspace';
  end if;

  -- If the task is filed under a project, the caller must be able to reach it.
  if p_project_id is not null
     and not app_private.can_access_project(p_project_id) then
    raise exception 'You do not have access to that project';
  end if;

  insert into public.tasks (
    workspace_id, project_id, title, description, priority, due_at,
    assignee_id, author_id, triaged_at, sort_order, recurrence
  )
  values (
    ws,
    p_project_id,
    trimmed,
    p_description,
    coalesce(p_priority, 4),
    p_due_at,
    assignee,
    uid,
    -- Self-assigned tasks are auto-triaged so they skip the Inbox.
    case when assignee = uid then now() else null end,
    (extract(epoch from now()) * 1000)::bigint,
    p_recurrence
  )
  returning id into new_id;

  -- If assigning to someone else on a project, make sure they're a project
  -- member so the task is visible to them (mirrors the old app behaviour).
  if p_project_id is not null and assignee is not null and assignee <> uid then
    insert into public.project_members (project_id, user_id, role)
    values (p_project_id, assignee, 'member')
    on conflict (project_id, user_id) do nothing;
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_task_for_me(
  text, text, int, timestamptz, uuid, uuid, text
) to authenticated, service_role;

commit;
