import { format } from "date-fns";
import { CalendarDots } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import { EmptyState } from "@/components/empty-state";
import { RightRail } from "@/components/right-rail";
import {
  getCurrentProfile,
  getMembersWithPulse,
  getMyStats,
  getRecentActivity,
  getUpcomingBuckets,
} from "@/lib/queries";

export const metadata = { title: "Upcoming · Loop" };

export default async function UpcomingPage() {
  const [{ tomorrow, thisWeek, nextWeek }, profile, members, activity, stats] =
    await Promise.all([
      getUpcomingBuckets(),
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
      />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {total === 0 ? (
              <EmptyState
                emoji="🗓️"
                title="Nothing on the horizon"
                hint="Schedule something for later this week or pass work to a teammate."
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
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </header>
      {tasks.length === 0 ? (
        <p className="px-3 py-3 text-[12.5px] text-muted-foreground/70">
          Nothing scheduled.
        </p>
      ) : (
        <TaskTable showAdd={false}>
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </TaskTable>
      )}
    </section>
  );
}
