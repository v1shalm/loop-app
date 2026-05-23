-- 0016 — Bootstrap policy for first team admin
--
-- Migration 0009's team_members_modify_admin policy requires the caller
-- to ALREADY be an admin of the team for any insert. That works for
-- every member added after the team exists, but breaks the very first
-- insert: when a fresh team has no members yet, nobody passes the
-- admin check, and the creator's own "make me admin" row is rejected
-- with `new row violates row-level security policy for table
-- "team_members"`.
--
-- This adds an INSERT-only bootstrap policy that lets a user add
-- themselves as the FIRST admin of a team that has no members yet.
-- After the first row exists, the existence check fails on subsequent
-- attempts, and the admin-only policy from 0009 takes over for further
-- adds. PostgreSQL OR's together policies for the same action, so both
-- coexist cleanly.
--
-- Race-safety: the unique index team_members_one_team_per_user (also
-- from 0009) prevents a user from ever having more than one team, so
-- even if two callers race to claim the same team_id, neither can wedge
-- themselves into a state they couldn't already reach.

drop policy if exists "team_members_first_admin_bootstrap" on public.team_members;
create policy "team_members_first_admin_bootstrap" on public.team_members
  for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and not exists (
      select 1 from public.team_members existing
      where existing.team_id = team_members.team_id
    )
  );
