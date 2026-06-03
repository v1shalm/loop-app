# Superadmin oversight — design

**Date:** 2026-06-03
**Status:** Draft for review
**Scope owner:** vishal.maurya@tistmedia.in

## 1. Context

The Loop app (Next.js 16, Supabase) already has a superadmin / team-manager / task-approval
feature merged to `main` (migrations 0035–0037). Today:

- `workspace_members.role ∈ {member, admin, superadmin}`. Superadmins are seeded for
  `akshay@tistmedia.in` and `vishal.maurya@tistmedia.in` (migration 0035).
- A separate `team_managers` table holds per-team approvers; being a manager is orthogonal
  to the admin/member role.
- `/approvals` is gated to `isSuperadmin() || managedTeamIds.length > 0` — page redirect
  (`app/(app)/approvals/page.tsx`) **and** sidebar nav visibility (`components/sidebar-v2.tsx:115,230`).
- `/admin` is a superadmin-only console (`components/admin-teams.tsx`) for granting/revoking the
  superadmin role and assigning team managers. It does **not** show projects or tasks today.
- The sidebar project list (`getProjects`, `lib/queries.ts:125`) filters by `project_members`
  membership for **everyone** — intentionally, so the sidebar stays personal. Superadmins
  therefore do not currently see projects they aren't members of.
- `getProject` / `getProjectTasks` / `getProjectDoneTasks` (`lib/queries.ts:768–817`) do **not**
  membership-filter in the app layer; they query by id and rely on RLS. Verified: a superadmin can
  open any `/projects/[id]` once given a link, because RLS 0036 (`can_access_project`) lets them
  through.
- Person-by-person task browsing already exists: `/workspace` roster → `/workspace/[id]` shows a
  person's **open, assigned** tasks (`getTasksAssignedTo`, filters out `done`).

**Hard dependency:** every behavior below is only correct if migrations 0035–0037 are applied to
the live DB, and 0037 is re-run (the approval gate was widened to cover INSERT after first
application — see prior session notes). If RLS isn't live, superadmins cannot reach cross-team data
regardless of UI.

## 2. Goals

1. **Approvals access** — confirm `/approvals` is reachable only by superadmins + team managers.
2. **Superadmin badge** — show a **"Superadmin"** badge for superadmin accounts in: the current
   user's profile menu, the sidebar header, and the people roster + teammate profile (per-person).
3. **All projects** — let superadmins see every project via a dedicated superadmin surface, with
   each project openable.
4. **Tasks by person and by team** — superadmins can browse every task person-by-person (reuse
   `/workspace/[id]`) and team-by-team (new surface under `/admin`). Both show **open + completed**.
5. **Verify** the pre-existing "members can't create tasks" bug and fix it if confirmed.

## 3. Non-goals (YAGNI)

- No change to who can approve, or to the approval rule itself.
- No new roles or permission tiers.
- No flooding the personal sidebar with all projects (the sidebar stays personal).
- No unified "oversight console" — we extend the existing `/admin` and `/workspace` surfaces to
  keep the UI consistent and the build contained.

## 4. Design

### Workstream 0 — Verify member task creation (do first)

Prior notes flagged that a direct `INSERT … WITH CHECK` on `tasks` (and `projects`) may be rejected
for regular members (`auth.uid()` appearing not to resolve inside INSERT WITH CHECK), while
UPDATE/DELETE and SECURITY DEFINER RPCs work. `createTask` uses a direct insert (would be affected);
`createProject` uses a definer RPC (works).

- **Verify:** run the app, sign in as a regular member (e.g. `mia@loop.app` / `alex@loop.app`), and
  attempt to create a task. Record pass/fail with evidence.
- **If broken:** the likely fix is to route `createTask` through a `SECURITY DEFINER` RPC
  (mirroring `create_project_for_me`) that performs the insert with the caller validated inside the
  function, OR correct the INSERT policy so `auth.uid()` resolves. Decide the minimal fix once the
  failure mode is confirmed; do not pre-build a fix for an unconfirmed bug.
- **Rationale:** if members can't create tasks, the core loop is broken — this gates confidence in
  everything else and is addressed before the oversight polish.

### Workstream 1 — Approvals access (no change)

Already correct: `isSuperadmin() || managedTeamIds.length > 0` on both the page redirect and the
sidebar nav (`canApprove`). **No code change.** This workstream is a verification checkpoint only:
confirm a regular member and a non-manager workspace admin neither see the nav link nor can load
`/approvals` (redirected home).

### Workstream 2 — Superadmin badge

- **Component:** extract the existing ShieldCheck + "Superadmin" pill (currently inline in
  `components/workspace-members-dialog.tsx:429`) into a reusable `components/superadmin-badge.tsx`
  with a small size/variant prop. Refactor the dialog to consume it (no visual change there).
- **Data plumbing (per-person role):** `getMembersWithPulse` (`lib/queries.ts:911`) currently builds
  on `getWorkspaceMembers()`, which does not carry the workspace role. Change it to build on
  `getWorkspaceMembersWithRole()` (which already returns `team_role: WorkspaceRole`) so each
  `MemberPulse` carries the workspace role. `getTeammate` inherits it (it reads from
  `getMembersWithPulse`).
- **Wire-ups:**
  - **Profile menu trigger** (`components/profile-menu.tsx:373`): render the badge when
    `useTeamContext().isSuperadmin` (current user).
  - **Sidebar header** (near the workspace name in `components/sidebar-v2.tsx`): render the badge
    when the current user `isSuperadmin`.
  - **People roster** (`app/(app)/workspace/page.tsx` MemberCard) and **teammate profile**
    (`app/(app)/workspace/[id]/page.tsx` header): render the badge when that person's workspace role
    is `superadmin` (per-person, from the plumbed role).

### Workstream 3 — All projects (dedicated superadmin view)

- **Query:** `getAllProjects()` in `lib/queries.ts` — selects every project with no
  `project_members` filter (superadmin reach, RLS-backed). Include open-task counts if cheap (reuse
  the sidebar-count pattern) so the list mirrors the existing project rows.
- **Route:** new superadmin-only page `app/(app)/admin/projects/page.tsx`, server-gated with
  `isSuperadmin()` → redirect home otherwise (mirrors `/admin`). Lists all projects using the
  existing project-row visual language; each row links to `/projects/[id]` (which already works for
  superadmins via RLS).
- **Entry points:** a link/card from `/admin` ("All projects"), plus a small superadmin-only "All
  projects" affordance in the sidebar Projects section header. The personal sidebar list is
  unchanged.

### Workstream 4 — Tasks by person and by team (open + completed)

- **Person-by-person (reuse `/workspace/[id]`):** add a collapsible "Completed" disclosure to the
  teammate profile, mirroring the project pages. New query `getCompletedTasksAssignedTo(userId)`
  (assignee = user, status = done, newest-finished first). The completed section is visible to
  everyone (collapsed by default), consistent with how open assigned tasks are already visible
  there and with the project-page pattern; visibility is still bounded by RLS.
- **Team-by-team (extend `/admin`):**
  - **Queries:** `getTeamTasks(teamId)` (open tasks where `team_id = teamId`, RLS reach) and
    `getTeamDoneTasks(teamId)` (completed), mirroring the project task/done pair. A light
    `getTeamForAdmin(teamId)` supplies the team name + roster for the header (reuse
    `getTeamsAdminOverview` data shape or a focused query).
  - **Route:** new superadmin-only page `app/(app)/admin/teams/[id]/page.tsx`, server-gated with
    `isSuperadmin()` → redirect. Mirrors the project-page layout: a flat, ordered list of the team's
    open tasks (each row showing its assignee) plus a collapsible Completed section, under a roster
    header. Reuses the project-page task components rather than inventing a new grouping.
  - **Entry point:** each team row on `/admin` becomes a link to `/admin/teams/[id]`.

## 5. Data layer summary

| Query | New / Changed | Purpose |
| --- | --- | --- |
| `getMembersWithPulse` | Changed | carry per-person `WorkspaceRole` (base on `getWorkspaceMembersWithRole`) |
| `getAllProjects()` | New | every project, no membership filter (superadmin) |
| `getCompletedTasksAssignedTo(userId)` | New | a person's completed tasks |
| `getTeamTasks(teamId)` | New | a team's open tasks |
| `getTeamDoneTasks(teamId)` | New | a team's completed tasks |
| `getTeamForAdmin(teamId)` | New (or reuse) | team name + roster for the team page header |

## 6. Access control

- All new pages (`/admin/projects`, `/admin/teams/[id]`) are server-gated with `isSuperadmin()` and
  redirect non-superadmins home, matching `/admin`.
- RLS (0035–0037) is the underlying enforcement (defense-in-depth); the redirects keep the surfaces
  invisible to everyone else.
- New oversight queries rely on superadmin RLS reach; they return full data only for superadmins
  (the pages are superadmin-gated anyway).

## 7. UI / component impact

- New: `components/superadmin-badge.tsx`, `app/(app)/admin/projects/page.tsx`,
  `app/(app)/admin/teams/[id]/page.tsx`, and a small team-tasks/all-projects list component(s) reusing
  existing task-bucket / project-row styling.
- Changed: `workspace-members-dialog.tsx` (consume the extracted badge), `profile-menu.tsx`,
  `sidebar-v2.tsx`, `workspace/page.tsx`, `workspace/[id]/page.tsx`, `admin-teams.tsx` (team rows
  become links), `lib/queries.ts`.
- UI consistency: all new surfaces reuse existing components (project rows, task buckets, rosters,
  `PageHeader`), so they match the app's visual language. The only deliberate brand note is the badge
  word "Superadmin" (chosen by the owner over warmer alternatives).

## 8. Verification plan

- **W0:** member task-creation tested in the running app (member account), with evidence.
- **W1:** member + non-manager admin cannot see/reach `/approvals`.
- **W2:** superadmin sees the badge in profile menu, sidebar, roster, and teammate profile; a
  non-superadmin does not.
- **W3:** `/admin/projects` lists every project; clicking opens the project page with its tasks; a
  non-superadmin is redirected.
- **W4:** `/admin/teams/[id]` lists the team's open + completed tasks; `/workspace/[id]` shows a
  completed section; non-superadmin redirected from `/admin/teams/[id]`.
- **Global:** `tsc --noEmit`, `eslint`, and `next build` clean.

## 9. Decisions log

- Approvals access: **superadmins + managers, no change** ("admins" = the superadmin accounts).
- Badge label: **"Superadmin"** (owner chose the literal role name over "Owner"/"Admin").
- Badge placement: profile menu (self) + sidebar header (self) + people roster & teammate profile
  (per-person).
- All projects: **dedicated `/admin/projects` view**; sidebar stays personal.
- Team tasks: **extend `/admin`** (team row → `/admin/teams/[id]`); person tasks reuse `/workspace/[id]`.
- Oversight task scope: **open + completed** (completed in a collapsible section).
- Pre-existing member task-creation bug: **verify as part of this work** (W0), fix if confirmed.

## 10. Open dependencies / risks

- Migrations 0035–0037 must be applied to the live DB; **0037 must be re-run** (idempotent) so the
  approval gate covers INSERT. Without this, superadmin RLS reach and the approval gate are not live.
- Prior regression: widening `TeamMember.team_role` to `WorkspaceRole` made superadmins render
  read-only in `workspace-members-dialog.tsx`. Out of scope here but noted; revisit if it interferes
  with the badge refactor.
