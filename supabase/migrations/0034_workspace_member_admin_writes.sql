-- 0034_workspace_member_admin_writes.sql
--
-- Bug: on /workspace/manage, "Remove from workspace" (and role changes)
-- appeared to do nothing — the person stayed in the roster.
--
-- Root cause: the roster is read from public.workspace_members, but that
-- table only ever had a SELECT policy (members_select_same_ws). Inserts
-- happen through SECURITY DEFINER bootstrap functions, and there were no
-- DELETE or UPDATE policies at all. So the admin actions fell back to
-- writing public.team_members (which does have admin policies) and never
-- touched the roster table the UI actually reads.
--
-- Fix: give workspace admins the ability to delete/update rows in their
-- own workspace's roster, mirroring the team_members_{delete,update}
-- policy pattern (0021). Admin check runs through a SECURITY DEFINER
-- helper so the policy doesn't recurse on workspace_members' own RLS.
--
-- Idempotent: safe to re-run.

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
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  );
$$;

grant execute on function app_private.is_workspace_admin(uuid) to authenticated;

alter table public.workspace_members enable row level security;

-- A workspace admin can remove any member of their workspace.
drop policy if exists "workspace_members_delete" on public.workspace_members;
create policy "workspace_members_delete" on public.workspace_members
  for delete
  using (app_private.is_workspace_admin(workspace_id));

-- A workspace admin can change a member's role (admin <-> member).
drop policy if exists "workspace_members_update" on public.workspace_members;
create policy "workspace_members_update" on public.workspace_members
  for update
  using (app_private.is_workspace_admin(workspace_id))
  with check (app_private.is_workspace_admin(workspace_id));
