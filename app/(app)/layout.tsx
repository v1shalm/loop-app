import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getCurrentProfile,
  getDefaultWorkspace,
  getMyTeam,
  getMyTeams,
  getMyTeamRole,
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
  const [workspace, team, teams, teamRole, projects, members, counts] =
    await Promise.all([
      getDefaultWorkspace(),
      getMyTeam(),
      getMyTeams(),
      getMyTeamRole(),
      getProjects(),
      getWorkspaceMembers(),
      getSidebarCounts(),
      hasTaskSortOrder(),
    ]);

  // A signed-in user without a team has no scope. Bounce them through
  // /onboarding to create one (and pick up the admin role on the team
  // they create). Demo accounts already have a team from the seed and
  // skip this entirely.
  if (!team) {
    redirect("/onboarding");
  }

  return (
    <AppShell
      user={profile}
      workspace={workspace}
      team={team}
      teams={teams}
      teamRole={teamRole}
      projects={projects}
      members={members}
      counts={counts}
    >
      {children}
    </AppShell>
  );
}
