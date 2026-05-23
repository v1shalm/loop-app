import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getCurrentProfile,
  getDefaultWorkspace,
  getMyTeam,
  getMyTeamRole,
  getProjects,
  getMembersWithPulse,
  getSidebarCounts,
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

  const [workspace, team, teamRole, projects, members, counts] =
    await Promise.all([
      getDefaultWorkspace(),
      getMyTeam(),
      getMyTeamRole(),
      getProjects(),
      getMembersWithPulse(),
      getSidebarCounts(),
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
      teamRole={teamRole}
      projects={projects}
      members={members}
      counts={counts}
    >
      {children}
    </AppShell>
  );
}
