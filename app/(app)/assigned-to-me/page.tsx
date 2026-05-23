import Link from "next/link";
import { format } from "date-fns";
import { Crosshair, CheckCircle } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import { CompletedSection } from "@/components/completed-section";
import { EmptyState, Kbd } from "@/components/empty-state";
import { BulkSelectToggle } from "@/components/bulk-select-toggle";
import { RightRail } from "@/components/right-rail";
import {
  getAssignedToMe,
  getCurrentProfile,
  getMembersWithPulse,
  getRecentActivity,
  type TaskWithRelations,
} from "@/lib/queries";

export const metadata = { title: "My work · Loop" };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Burning the midnight oil";
}

export default async function AssignedToMePage() {
  const [
    { overdue, today, upcoming, completedToday },
    profile,
    members,
    activity,
  ] = await Promise.all([
    getAssignedToMe(),
    getCurrentProfile(),
    getMembersWithPulse(),
    getRecentActivity(),
  ]);
  const activeCount = overdue.length + today.length + upcoming.length;
  const firstName = profile?.name?.split(/\s+/)[0] ?? "friend";

  // Active sections in render order. The last one renders the "+ Add task"
  // footer so the page has exactly one quick-add affordance, attached to
  // the most relevant group.
  const sections: {
    key: "overdue" | "today" | "upcoming";
    title: string;
    subtitle?: string;
    tone?: "warn";
    tasks: TaskWithRelations[];
  }[] = [];
  if (overdue.length > 0) {
    sections.push({
      key: "overdue",
      title: "Overdue",
      tone: "warn",
      tasks: overdue,
    });
  }
  if (today.length > 0) {
    sections.push({
      key: "today",
      title: "Today",
      subtitle: format(new Date(), "EEEE, d MMM"),
      tasks: today,
    });
  }
  if (upcoming.length > 0) {
    sections.push({
      key: "upcoming",
      title: "Upcoming",
      tasks: upcoming,
    });
  }
  const lastIdx = sections.length - 1;

  const greetingHint =
    activeCount === 0
      ? completedToday.length > 0
        ? `${completedToday.length} done today. Take a breath.`
        : "All clear. Take a breath."
      : `${activeCount} ${activeCount === 1 ? "task" : "tasks"} on you today.`;

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Crosshair size={16} />}
        title="My work"
        subtitle={
          activeCount === 0
            ? "All clear"
            : `${activeCount} active · ${completedToday.length} done today`
        }
        right={<BulkSelectToggle />}
      />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-10">
        {/* Greeting */}
        <header className="mb-10">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            {greetingHint}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {activeCount === 0 && completedToday.length === 0 ? (
              <EmptyState
                icon={<Crosshair size={22} />}
                title="Nothing's on you right now"
                hint="Add one for yourself, or invite a teammate to share the load."
                actionLabel="Assign your first task"
                secondary={{
                  label: "Invite a teammate",
                  href: "/team",
                }}
                tips={[
                  "Self-assigned tasks land straight here, no inbox step.",
                  "Use # to drop a task into a project, @ to assign it to someone.",
                  <>
                    Press <Kbd>Cmd</Kbd>
                    <Kbd>K</Kbd> to jump anywhere, <Kbd>Q</Kbd> to add a task.
                  </>,
                ]}
              />
            ) : (
              <>
                {sections.map((s, i) => (
                  <Section
                    key={s.key}
                    title={s.title}
                    subtitle={s.subtitle}
                    count={s.tasks.length}
                    tone={s.tone}
                    addFooter={i === lastIdx}
                  >
                    {s.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} />
                    ))}
                  </Section>
                ))}

                {sections.length === 0 && (
                  <div className="mb-8">
                    <TaskTable>{null}</TaskTable>
                  </div>
                )}

                <CompletedSection count={completedToday.length}>
                  {completedToday.length === 0 ? (
                    <p className="px-4 py-4 text-[12.5px] text-muted-foreground">
                      Nothing completed yet today.
                    </p>
                  ) : (
                    completedToday.map((t) => (
                      <CompletedRow
                        key={t.id}
                        id={t.id}
                        title={t.title}
                        at={t.completed_at}
                      />
                    ))
                  )}
                </CompletedSection>
              </>
            )}
          </div>

          {profile && (
            <RightRail
              completedToday={completedToday.length}
              activeToday={today.length + overdue.length}
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

function Section({
  title,
  subtitle,
  count,
  tone,
  addFooter,
  children,
}: {
  title: string;
  subtitle?: string;
  count: number;
  tone?: "warn";
  addFooter?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <header className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-2.5">
          <h2
            className={`text-[15px] font-semibold tracking-tight ${
              tone === "warn" ? "text-rose-600" : "text-foreground"
            }`}
          >
            {title}
          </h2>
          {subtitle && (
            <span className="text-[12.5px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {count} {count === 1 ? "task" : "tasks"}
        </span>
      </header>
      <TaskTable showAdd={addFooter}>{children}</TaskTable>
    </section>
  );
}

function CompletedRow({
  id,
  title,
  at,
}: {
  id: string;
  title: string;
  at: string | null;
}) {
  return (
    <Link
      href={`/assigned-to-me?task=${id}`}
      scroll={false}
      className="focus-ring group flex items-center gap-3 rounded-xl border border-border/60 bg-emerald-50/40 px-4 py-3 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-sm dark:bg-emerald-500/8 dark:border-emerald-400/20"
      title="Open to reopen this task"
    >
      <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-emerald-600 text-emerald-50 dark:bg-emerald-500/80">
        <CheckCircle size={13} weight="fill" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through decoration-muted-foreground/40 group-hover:text-foreground/70">
        {title}
      </p>
      {at && (
        <span className="shrink-0 text-[11.5px] tabular-nums text-emerald-700/80 dark:text-emerald-300/80">
          {format(new Date(at), "h:mm a")}
        </span>
      )}
    </Link>
  );
}
