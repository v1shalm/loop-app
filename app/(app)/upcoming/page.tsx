import { format } from "date-fns";
import { CalendarDots } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskTable } from "@/components/task-table";
import { SortableTaskList } from "@/components/sortable-task-list";
import { EmptyState } from "@/components/empty-state";
import { InviteCTA } from "@/components/invite-cta";
import { SectionCount } from "@/components/section-count";
import { RightRail } from "@/components/right-rail";
import { UpcomingCalendar } from "@/components/upcoming-calendar";
import { UpcomingViewToggle } from "@/components/upcoming-view-toggle";
import { BulkSelectToggle } from "@/components/bulk-select-toggle";
import {
  getCurrentProfile,
  getMembersWithPulse,
  getMyStats,
  getRecentActivity,
  getUpcomingBuckets,
  getUpcomingTasksInRange,
} from "@/lib/queries";

export const metadata = { title: "Upcoming · Loop" };

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function UpcomingPage({ searchParams }: PageProps) {
  const { view } = await searchParams;
  const mode: "list" | "calendar" = view === "calendar" ? "calendar" : "list";

  // Calendar wants a 6-week window starting from this Monday; list view
  // keeps its existing tomorrow / this-week / next-week buckets.
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 60);
  rangeEnd.setHours(23, 59, 59, 999);

  const [
    { tomorrow, thisWeek, nextWeek },
    rangeTasks,
    profile,
    members,
    activity,
    stats,
  ] = await Promise.all([
    getUpcomingBuckets(),
    mode === "calendar"
      ? getUpcomingTasksInRange(rangeStart, rangeEnd)
      : Promise.resolve([]),
    getCurrentProfile(),
    getMembersWithPulse(),
    getRecentActivity(),
    getMyStats(),
  ]);
  const total = tomorrow.length + thisWeek.length + nextWeek.length;

  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<CalendarDots size={16} />}
        title="Upcoming"
        subtitle="Next two weeks"
        right={
          <>
            {mode === "list" && <BulkSelectToggle />}
            <UpcomingViewToggle current={mode} />
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {mode === "calendar" ? (
              <UpcomingCalendar tasks={rangeTasks} />
            ) : total === 0 ? (
              <EmptyState
                icon={<CalendarDots size={32} weight="fill" />}
                title="Nothing scheduled"
                hint="Schedule something for later this week or pass work to a teammate."
                actionLabel="Add a task"
                secondarySlot={<InviteCTA />}
                tips={[
                  "Tasks due tomorrow through the next two weeks show up grouped here.",
                  "Drag a date on a task to move it between buckets.",
                  "Toggle to the calendar view above to plan a full week visually.",
                ]}
              />
            ) : (
              <>
                <Bucket
                  title="Tomorrow"
                  subtitle={format(tomorrowDate, "EEEE, d MMM")}
                  tasks={tomorrow}
                />
                <Bucket title="This week" tasks={thisWeek} />
                <Bucket title="Next week" tasks={nextWeek} />
              </>
            )}
          </div>

          {profile && (
            <RightRail
              completedToday={stats.completed_today}
              activeToday={tomorrow.length + thisWeek.length}
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

function Bucket({
  title,
  subtitle,
  tasks,
}: {
  title: string;
  subtitle?: string;
  tasks: import("@/lib/queries").TaskWithRelations[];
}) {
  return (
    <section className="mb-8">
      <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[12.5px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        <SectionCount n={tasks.length} />
      </header>
      {tasks.length === 0 ? (
        <p className="px-3 py-3 text-[12.5px] text-muted-foreground/70">
          Nothing scheduled.
        </p>
      ) : (
        <TaskTable showAdd={false}>
          <SortableTaskList tasks={tasks} />
        </TaskTable>
      )}
    </section>
  );
}
