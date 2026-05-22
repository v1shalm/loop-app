import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  getCurrentProfile,
  getDefaultWorkspace,
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

  const [workspace, projects, members, counts] = await Promise.all([
    getDefaultWorkspace(),
    getProjects(),
    getMembersWithPulse(),
    getSidebarCounts(),
  ]);

  return (
    <AppShell
      user={profile}
      workspace={workspace}
      projects={projects}
      members={members}
      counts={counts}
    >
      {children}
    </AppShell>
  );
}
