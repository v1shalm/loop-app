-- 0037 — Manager approval gate on task completion.
--
-- Tasks gain a fourth status, 'in_review', so the lifecycle becomes
--   todo → doing → in_review → done
-- For a TEAM task (team_id is not null), reaching 'done' is reserved for a
-- manager of that team (or a superadmin). A regular member finishing work
-- moves the task to 'in_review' (submit for approval); the manager then
-- approves it to 'done' or sends it back to 'doing' (request changes).
--
-- Enforcement is a BEFORE INSERT/UPDATE trigger rather than RLS, because the
-- rule depends on the OLD→NEW status transition, which a WITH CHECK clause
-- can't see. It also covers INSERT so a task can't be *born* 'done' (which
-- would skip review entirely). The trigger stamps approved_by / approved_at
-- and manages completed_at so the app doesn't have to special-case it.
--
-- Project-less Inbox / personal tasks (team_id is null) are unaffected —
-- they complete directly, no approval.
--
-- Idempotent and re-runnable.

begin;

-- ============================================================
-- 1) Widen the status check to include 'in_review'
-- ============================================================
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'doing', 'in_review', 'done'));

-- ============================================================
-- 2) Approval bookkeeping columns
-- ============================================================
alter table public.tasks
  add column if not exists submitted_at timestamptz,
  add column if not exists approved_by  uuid references public.profiles(id) on delete set null,
  add column if not exists approved_at   timestamptz;

create index if not exists tasks_approval_idx
  on public.tasks (team_id, status)
  where status = 'in_review';

-- ============================================================
-- 3) The gate
-- ============================================================
create or replace function app_private.task_approval_gate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- INSERT: a team task may not be created already-'done' (or auto-completed)
  -- by a non-manager — that would skip the review gate. A null auth.uid()
  -- means a trusted server/seed context (no logged-in user), which is allowed
  -- through so fixtures and service-role writes aren't blocked.
  if tg_op = 'INSERT' then
    if new.status = 'done' then
      if new.team_id is not null
         and (select auth.uid()) is not null
         and not (app_private.is_team_manager(new.team_id) or app_private.is_superadmin())
      then
        raise exception 'Only a team manager can create an already-completed task.'
          using errcode = 'check_violation';
      end if;
      new.approved_by  := (select auth.uid());
      new.approved_at  := now();
      new.completed_at := coalesce(new.completed_at, now());
    elsif new.status = 'in_review' then
      new.submitted_at := coalesce(new.submitted_at, now());
    end if;
    return new;
  end if;

  -- UPDATE: enforce the transition rules.
  if new.status is distinct from old.status then
    if new.status = 'done' and old.status <> 'done' then
      -- Finalizing a team task is manager/superadmin only.
      if new.team_id is not null
         and not (app_private.is_team_manager(new.team_id) or app_private.is_superadmin())
      then
        raise exception 'Only a team manager can approve and complete this task.'
          using errcode = 'check_violation';
      end if;
      new.approved_by  := (select auth.uid());
      new.approved_at  := now();
      new.completed_at := coalesce(new.completed_at, now());
    elsif new.status = 'in_review' then
      -- Submitted for approval — clear any prior sign-off/completion.
      new.submitted_at := now();
      new.approved_by  := null;
      new.approved_at  := null;
      new.completed_at := null;
    elsif old.status = 'done' then
      -- Reopened from done — clear the approval + completion stamps.
      new.approved_by  := null;
      new.approved_at  := null;
      new.completed_at := null;
    end if;
  end if;
  return new;
end;
$$;

-- Name sorts after the 0036 team-sync trigger (trg_tasks_1_sync_team), so
-- new.team_id is already synced from the project before the gate reads it —
-- on INSERT as well as UPDATE.
drop trigger if exists trg_tasks_2_approval_gate on public.tasks;
create trigger trg_tasks_2_approval_gate
  before insert or update on public.tasks
  for each row execute function app_private.task_approval_gate();

commit;
