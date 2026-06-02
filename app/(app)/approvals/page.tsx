import { redirect } from "next/navigation";
import { CheckCircle } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ApprovalQueue } from "@/components/approval-queue";
import {
  getCurrentProfile,
  getMyManagedTeamIds,
  getTasksAwaitingMyApproval,
  isSuperadmin,
} from "@/lib/queries";

export const metadata = { title: "Approvals · Loop" };

/**
 * Manager / superadmin approval queue. Surfaces every team task sitting in
 * 'in_review' that the current user can sign off (tasks in teams they
 * manage, or everything for a superadmin). The DB enforces who may
 * actually finalize a task (migration 0037) — this page just gives the
 * approvers a focused place to clear the backlog.
 *
 * Anyone who can't approve anything is bounced home: the route is only
 * linked from the sidebar for managers/superadmins, but a stray visit
 * shouldn't render an empty management surface.
 */
export default async function ApprovalsPage() {
  const [superadmin, managed, profile] = await Promise.all([
    isSuperadmin(),
    getMyManagedTeamIds(),
    getCurrentProfile(),
  ]);

  if ((!superadmin && managed.length === 0) || !profile) {
    redirect("/");
  }

  const tasks = await getTasksAwaitingMyApproval();

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<CheckCircle size={16} />}
        title="Approvals"
        subtitle={
          tasks.length > 0
            ? `${tasks.length} awaiting review`
            : "All clear"
        }
      />

      <div className="mx-auto w-full max-w-[820px] px-8 pb-24 pt-10">
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
            Awaiting your approval
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            {tasks.length > 0
              ? "Sign off finished work, or send it back with a note."
              : "When your team submits work for review, it lands here."}
          </p>
        </header>

        {tasks.length === 0 ? (
          <EmptyState
            tone="accent"
            icon={<CheckCircle size={20} weight="bold" />}
            title="Nothing to approve"
            hint="Your team's submitted work will show up here for sign-off. Enjoy the calm."
            showAction={false}
            tips={[
              "Members submit a task for review by checking it off; you get the final approve.",
              "Send a task back with a note and it returns to the assignee as a comment.",
              "Superadmins see every team's queue; managers see the teams they run.",
            ]}
          />
        ) : (
          <ApprovalQueue tasks={tasks} currentUserId={profile.id} />
        )}
      </div>
    </div>
  );
}
