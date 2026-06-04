import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ensureInGeneral } from "@/lib/actions";
import {
  getCurrentProfile,
  getDefaultWorkspace,
  getGeneralTeam,
  getMyTeam,
  getMyTeams,
  getMyTeamRole,
  getMyWorkspaceRole,
  getMyManagedTeamIds,
  getApprovalQueueCount,
  getProjects,
  getWorkspaceMembers,
  getSidebarCounts,
  hasTaskSortOrder,
} from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  // The shell only needs the plain member list (assignee pickers,
  // teammate display). The per-member pulse counts (open/done today)
  // are read solely by /workspace and /workspace/[id], which fetch them
  // themselves — so we avoid the two extra task-table scans
  // getMembersWithPulse runs on every navigation.
  //
  // hasTaskSortOrder is warmed here purely for its React cache() entry:
  // every list query awaits it before fetching, so resolving it
  // concurrently with the layout's other queries keeps it off the
  // page's serial critical path (the page reads the cached result
  // instantly instead of issuing a fresh round-trip).
  const [
    workspace,
    team,
    teams,
    teamRole,
    workspaceRole,
    managedTeamIds,
    approvalCount,
    projects,
    members,
    counts,
  ] = await Promise.all([
    getDefaultWorkspace(),
    getMyTeam(),
    getMyTeams(),
    getMyTeamRole(),
    getMyWorkspaceRole(),
    getMyManagedTeamIds(),
    getApprovalQueueCount(),
    getProjects(),
    getWorkspaceMembers(),
    getSidebarCounts(),
    hasTaskSortOrder(),
  ]);

  const isSuperadmin = workspaceRole === "superadmin";

  // A signed-in user without a team has no scope. In the lobby model nobody
  // should be team-less — but a team deletion (e.g. cleanup) can orphan a
  // member after the one-time backfill ran. Rather than strand them at
  // onboarding (which they can't complete — only admins create teams), drop
  // them back into the shared General lobby and continue. Superadmins skip
  // this; they oversee everything and needn't belong to a team.
  let resolvedTeam = team;
  if (!resolvedTeam && !isSuperadmin) {
    await ensureInGeneral();
    resolvedTeam = await getGeneralTeam();
    if (!resolvedTeam) {
      // No General team at all (not seeded yet) — fall back to onboarding.
      redirect("/onboarding");
    }
  }

  return (
    <AppShell
      user={profile}
      workspace={workspace}
      team={resolvedTeam}
      teams={teams}
      teamRole={teamRole}
      isSuperadmin={isSuperadmin}
      managedTeamIds={managedTeamIds}
      approvalCount={approvalCount}
      projects={projects}
      members={members}
      counts={counts}
    >
      {children}
    </AppShell>
  );
}
