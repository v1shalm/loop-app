import {
  CalendarBlank,
  DotsThree,
  Flag,
  SlidersHorizontal,
} from "@/components/icons";
import { format } from "date-fns";
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
  getTodayTasks,
} from "@/lib/queries";

export const metadata = { title: "Today · Loop" };

export default async function TodayPage() {
  const [tasks, profile, members, activity, stats] = await Promise.all([
    getTodayTasks(),
    getCurrentProfile(),
    getMembersWithPulse(),
    getRecentActivity(),
    getMyStats(),
  ]);

  // High-priority surfaced separately so the urgent stuff doesn't get lost
  // in a long day. The rest stays in the date-ordered Due today section.
  const priority = tasks.filter((t) => t.priority <= 2);
  const dueToday = tasks.filter((t) => t.priority > 2);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<CalendarBlank size={16} />}
        title="Today"
        subtitle={format(new Date(), "EEEE, MMMM d")}
        right={
          <>
            <HeaderIconBtn label="Filter">
              <SlidersHorizontal size={16} />
            </HeaderIconBtn>
            <HeaderIconBtn label="More">
              <DotsThree size={16} weight="bold" />
            </HeaderIconBtn>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {tasks.length === 0 ? (
              <EmptyState
                emoji="🌤️"
                title="Your today is clear"
                hint="Nothing's due. Add something for yourself, or assign a task to a teammate."
              />
            ) : (
              <>
                {priority.length > 0 && (
                  <section className="mb-8">
                    <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
                      <div className="flex items-baseline gap-2.5">
                        <h2 className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-foreground">
                          <Flag
                            size={13}
                            weight="fill"
                            className="text-priority-1"
                          />
                          Priority
                        </h2>
                        <span className="text-[12.5px] text-muted-foreground">
                          Urgent and high-priority
                        </span>
                      </div>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {priority.length}{" "}
                        {priority.length === 1 ? "task" : "tasks"}
                      </span>
                    </header>
                    <TaskTable showAdd={false}>
                      {priority.map((t) => (
                        <TaskRow key={t.id} task={t} />
                      ))}
                    </TaskTable>
                  </section>
                )}

                {dueToday.length > 0 && (
                  <section>
                    <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
                      <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                        Due today
                      </h2>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {dueToday.length}{" "}
                        {dueToday.length === 1 ? "task" : "tasks"}
                      </span>
                    </header>
                    <TaskTable>
                      {dueToday.map((t) => (
                        <TaskRow key={t.id} task={t} />
                      ))}
                    </TaskTable>
                  </section>
                )}
              </>
            )}
          </div>

          {profile && (
            <RightRail
              completedToday={stats.completed_today}
              activeToday={tasks.length}
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

function HeaderIconBtn({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
    >
      {children}
    </button>
  );
}

