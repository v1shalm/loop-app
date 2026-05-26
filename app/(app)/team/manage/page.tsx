import { redirect } from "next/navigation";
import {
  getCurrentProfile,
  getMyTeam,
  getMyTeamRole,
  getPendingInvitations,
  getTeamMembersWithRole,
} from "@/lib/queries";
import { WorkspaceMembersDialogShell } from "@/components/workspace-members-dialog-shell";

export const metadata = { title: "Manage workspace · Loop" };

/**
 * Admin-only workspace management. The page itself is a thin shell — all
 * the UI lives in WorkspaceMembersDialog (rendered open). Closing the
 * dialog navigates back to /team. Server-side data is passed in so the
 * dialog renders instantly with no client-side round-trip.
 *
 * Non-admins redirect to /team (read-only roster) so they never see the
 * management surface.
 */
export default async function ManageTeamPage() {
  const [team, role, members, pendingInvites, profile] = await Promise.all([
    getMyTeam(),
    getMyTeamRole(),
    getTeamMembersWithRole(),
    getPendingInvitations(),
    getCurrentProfile(),
  ]);

  if (role !== "admin" || !profile) {
    redirect("/team");
  }

  return (
    <WorkspaceMembersDialogShell
      team={team}
      currentUserId={profile.id}
      members={members}
      pendingInvites={pendingInvites}
    />
  );
}
