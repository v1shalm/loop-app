import { redirect } from "next/navigation";
import { ShieldCheck } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { AdminTeams } from "@/components/admin-teams";
import {
  getCurrentProfile,
  getTeamMembersWithRole,
  getTeamsAdminOverview,
  isSuperadmin,
} from "@/lib/queries";

export const metadata = { title: "Workspace admin · Loop" };

/**
 * Superadmin-only control room. Two responsibilities live here:
 *
 *   • Superadmins — grant or revoke company-wide access (migration 0035).
 *   • Team managers — assign/remove the approvers for each team. Every
 *     team must keep at least one (DB-enforced); the UI surfaces that.
 *
 * Gated server-side: a non-superadmin is bounced home. RLS would already
 * deny the writes, but redirecting keeps the surface invisible to everyone
 * else. Each team's roster is fetched here so the client can toggle manager
 * status without a per-team round-trip.
 */
export default async function AdminPage() {
  const [superadmin, profile] = await Promise.all([
    isSuperadmin(),
    getCurrentProfile(),
  ]);

  if (!superadmin || !profile) {
    redirect("/");
  }

  // getTeamsAdminOverview returns each team with its full roster (members +
  // manager flags) already attached, in a fixed number of queries — no
  // per-team round-trips.
  const [teams, members] = await Promise.all([
    getTeamsAdminOverview(),
    getTeamMembersWithRole(),
  ]);

  return (
    <div className="min-h-full">
      <PageHeader icon={<ShieldCheck size={16} />} title="Workspace admin" />

      <div className="mx-auto w-full max-w-[860px] px-8 pb-24 pt-10">
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
            Workspace admin
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Manage company-wide access and the approvers for each team.
          </p>
        </header>

        <AdminTeams
          teams={teams}
          members={members}
          currentUserId={profile.id}
        />
      </div>
    </div>
  );
}
