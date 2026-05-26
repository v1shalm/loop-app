import { Tray } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { InboxList } from "@/components/inbox-list";
import { EmptyState } from "@/components/empty-state";
import { InviteCTA } from "@/components/invite-cta";
import { SectionCount } from "@/components/section-count";
import { RightRail } from "@/components/right-rail";
import {
  getCurrentProfile,
  getInboxAssignments,
  getMembersWithPulse,
  getMyStats,
  getRecentActivity,
} from "@/lib/queries";
import { listSavedViews } from "@/lib/actions";

export const metadata = { title: "Inbox · Loop" };

export default async function InboxPage() {
  const [tasks, profile, members, activity, stats, savedViewsRes] =
    await Promise.all([
      getInboxAssignments(),
      getCurrentProfile(),
      getMembersWithPulse(),
      getRecentActivity(),
      getMyStats(),
      listSavedViews("inbox"),
    ]);
  const savedViews = savedViewsRes.views ?? [];

  return (
    <div className="min-h-full">
      <PageHeader icon={<Tray size={16} />} title="Inbox" />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {tasks.length === 0 ? (
              <EmptyState
                illustrationSrc="/illustrations/Empty-inbox.png"
                illustrationSize={240}
                title="Inbox is empty"
                hint="New assignments from teammates land here. Nothing to triage right now."
                actionLabel="Assign your first task"
                secondarySlot={<InviteCTA />}
                tips={[
                  "Tasks someone else assigns to you appear here first.",
                  "Hit Accept to add them to your day, or Mark later to push them out a week.",
                  "Use the search bar at the top to jump to any task, project, or teammate.",
                ]}
              />
            ) : (
              <>
                <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
                  <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                    New assignments
                  </h2>
                  <SectionCount n={tasks.length} />
                </header>
                <InboxList tasks={tasks} savedViews={savedViews} />
              </>
            )}
          </div>

          {profile && (
            <RightRail
              completedToday={stats.completed_today}
              activeToday={stats.open_assigned}
              members={members}
              currentUserId={profile.id}
              activity={activity}
            />
          )}
        </div>
      </div>
    </div>
  );
}
