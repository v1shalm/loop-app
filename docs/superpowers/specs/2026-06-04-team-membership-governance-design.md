# Team & membership governance — the "lobby" model — design

**Date:** 2026-06-04
**Status:** Draft for review
**Relates to:** [2026-06-03-superadmin-oversight-design.md](./2026-06-03-superadmin-oversight-design.md)

## 1. Context — how it works today

- **Sign-in is open.** Google OAuth + magic link, any email. `proxy.ts` gates which
  *routes* need a session, not *who* may sign in.
- **`handle_new_user()`** (a trigger on `auth.users` insert; migrations 0001 → 0005 →
  0022) creates the person's profile and **auto-joins the default workspace**
  (`00000000-0000-0000-0000-000000000001`). It does **not** put them on a team.
- A user with **no team** is redirected by `app/(app)/layout.tsx` to **`/onboarding`**,
  where `create-team-form.tsx` calls `createTeam()`. So today **anyone creates a team**
  to get started. Superadmins skip onboarding.
- **`createTeam()`** (`lib/actions.ts`) can be called by any signed-in user; it also backs
  the "New workspace" dialog in the sidebar switcher.
- **Projects** are created via the `create_project_for_me` RPC; any workspace member can
  create one.
- **Team isolation already exists.** Migration 0036 (the "team wall":
  `can_access_project` / `can_see_task`) means people only see the teams, projects, and
  tasks they belong to. Superadmins bypass it.

## 2. Goal — the lobby model

Anyone can sign in. On first login they land in a shared **General** team (a sandbox) and
are registered in the database. They see **none** of TIST's real work. TIST's real teams
and projects are invite-only and invisible until an admin or manager brings them in.

| Area | Decision |
| --- | --- |
| Sign-in | Open to anyone (any Google account / magic link). No domain gate. |
| First login | Auto-join one shared **General** team; the person is registered. |
| General team | A sandbox, seeded with sample content; shows none of TIST's real teams/projects. |
| Official teams & projects | Invite-only; invisible to non-members (team wall already enforces). |
| Create a team | **Superadmins + workspace admins only.** |
| Create a project | **Any member, within a team they belong to.** |
| Join an official team | **Invite only** — an admin/manager adds a registered person (people-picker) or invites by email. |
| People directory | **Asymmetric** — General-only users see only General; official members can see & search everyone (to invite). |

The point of General: it lets anyone try Loop (good for the take-home) and it *registers*
people so official members can find and invite them — without exposing any real work.

## 3. Non-goals

- No domain restriction on sign-in.
- No change to the team-wall isolation itself (we rely on it).
- No new role tiers — uses `member` / `admin` / `superadmin` + `team_managers` as-is.
- No change to auth providers (Google + magic link stay).

## 4. Design — workstreams

### W1 · The General team + auto-join
- New migration: seed a **General** team in the default workspace at a fixed UUID, with a
  little sample content (one sample project, a few tasks) so it is not an empty room.
- Extend `handle_new_user()` (or a companion trigger) so every new auth user is also added
  to General's `team_members` (role `member`). Idempotent.
- Backfill every existing team-less user into General.
- Net: every signed-in person is always on at least General.

### W2 · Onboarding change (keep the screen, gate the create-team step)
- **Keep the onboarding screen.** For regular new users, remove the "create a team" step —
  they are already in General (W1), so onboarding becomes a light welcome that lands them in
  their General work view; it no longer gates entry behind creating a team.
- The **create-team screen is shown only to admins and superadmins** (reuse the existing
  form). They reach it from onboarding and/or an in-app admin entry (W3).
- `app/(app)/layout.tsx`: stop redirecting team-less users into a create-team wall (after W1
  nobody is team-less; keep an ensure-General safety net).

### W3 · Gate team creation (superadmin + workspace admin)
- `createTeam()` rejects callers who are not superadmin or workspace admin.
- RLS: the `teams` insert policy is limited to `is_workspace_admin()` / `is_superadmin()`.
  Drop the "anyone can create a team" bootstrap from 0035 (General is seeded, not
  user-created), and revisit the matching `team_managers` self-assign bootstrap.
- UI: hide the "New team / workspace" entry for non-admins; give admins a clear
  "Create team" action (in the switcher and/or `/admin`).

### W4 · Project creation (any member, within their team)
- Keep `create_project_for_me`, but ensure a project is created **within a team the caller
  belongs to**; callers may only create projects in their own team(s). General members can
  create projects in General (a harmless sandbox).
- UI: the "add project" affordance stays for members, scoped to their team.

### W5 · Invite from the database
- Official team admins/managers can bring someone in two ways:
  1. **Pick a registered user** (search the directory) and add them to the team.
  2. **Invite by email** for someone who has not signed in yet (existing token flow).
- For a registered user, **direct-add** (no accept step): the admin/manager adds them and
  they immediately become a team member and start seeing **that team's** projects and tasks.
  Email invites (token + accept) remain only for people who have not signed in yet.
- Reuse `team_invitations` for email; add an "add existing member" path.

### W6 · Asymmetric people directory
- `/people`, `/workspace`, and search: a viewer who is **only in General** sees only General
  members. A viewer who belongs to an official team (or is admin/superadmin) sees everyone,
  so they can invite.
- Enforce in the query layer **and** in RLS on the `profiles` / `workspace_members` reads.
  Today these list every workspace member — tighten to the asymmetric rule.

### W7 · Sanity check — isolation holds for General
- Confirm the team wall (0036) keeps General-only users from seeing official teams,
  projects, and tasks. Add this to the verification pass.

## 5. Data / RLS changes

A new migration, e.g. `00XX_general_team_and_governance.sql`:
- Seed the General team (+ sample content).
- Extend `handle_new_user()` to auto-join General; backfill existing team-less users.
- `teams` insert policy → admin/superadmin only; drop the member bootstrap.
- Project creation stays via the RPC, scoped to the caller's team.
- `profiles` / `workspace_members` select policies → the asymmetric directory rule.

## 6. Access-control summary

- **Sign in:** anyone.
- **See General:** anyone signed in.
- **See an official team / project / task:** members of it, plus superadmins.
- **Create a team:** superadmin + workspace admin.
- **Create a project:** any member, within a team they belong to.
- **Invite to an official team:** that team's admins/managers, plus superadmins.
- **Directory:** asymmetric (General-only → General; official members → everyone).

## 7. UI impact

- Onboarding screen retired/repurposed; new users land in General.
- "New team / workspace" entry hidden for non-admins; an admin-gated "Create team" action added.
- Invite dialog gains a registered-user people-picker (for official members).
- `/people` + `/workspace` respect the asymmetric rule.

## 8. Edge cases

- **Fresh workspace, no superadmin yet:** the seeded superadmins (akshay@, vishal@)
  bootstrap; General is seeded by migration, so the app is never empty.
- **Removed from all official teams:** the person falls back to General — never team-less.
- **Last admin of a team leaving:** there is already a min-one-*manager* rule (0035);
  consider an analogous note for team admins (out of scope unless it bites).
- **General clutter over time** (many signups, stray sample projects): decide a policy later
  (read-mostly General, or periodic cleanup). Low priority.
- **Superadmins** still see everything.

## 9. Verification plan

- A brand-new, non-TIST Google account signs in → lands in General → sees only General's
  sample content; **no** TIST teams, projects, or people.
- That account **cannot** create a team (no entry; the action is rejected).
- That account **can** create a project inside General; **cannot** in any official team.
- A TIST admin can find that account in the directory and add/invite it to an official team;
  afterwards the account sees that team.
- A General-only account **cannot** see the TIST roster; a TIST member **can**.
- `tsc`, `eslint`, `next build` clean, plus a manual run-through.

## 10. Decisions log

- Sign-in: open, no domain gate.
- Auto-join: General team on first login; registered in the database.
- General: sandbox, sample-seeded, isolated by the team wall.
- Create team: superadmin + workspace admin.
- Create project: any member, within their team.
- Join an official team: invite only (people-picker for registered users + email fallback).
- Adding a *registered* user to a team: **direct add** — instant membership; they
  immediately see that team's projects/tasks. Email invite + accept stays only for
  not-yet-registered people.
- Onboarding: **keep the screen**; remove the create-team step from the regular path and
  show the create-team screen to **admins/superadmins only**.
- People directory: asymmetric.

## 11. Open questions

- General clutter policy over time — read-mostly General, or periodic cleanup. Low priority.

## 12. Dependencies

- Relies on the team wall (0036) and superadmin roles (0035) already being live in the DB
  (and 0037 re-run, per the superadmin spec).
- Complements the parked superadmin-oversight spec — same access model, different surfaces.
