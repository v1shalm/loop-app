import { redirect } from "next/navigation";
import { UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ManageTeamUI } from "@/components/manage-team-ui";
import {
  getMyTeam,
  getMyTeamRole,
  getTeamMembersWithRole,
} from "@/lib/queries";

export const metadata = { title: "Manage team · Loop" };

/**
 * Admin-only — server component gates by role before the client UI renders.
 * Members redirect to /team (read-only list) so they never see the controls.
 */
export default async function ManageTeamPage() {
  const [team, role, members] = await Promise.all([
    getMyTeam(),
    getMyTeamRole(),
    getTeamMembersWithRole(),
  ]);

  if (role !== "admin") {
    redirect("/team");
  }

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<UsersThree size={16} />}
        title={team ? `Manage ${team.name}` : "Manage team"}
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        <ManageTeamUI members={members} />
      </div>
    </div>
  );
}
