import Link from "next/link";
import { format } from "date-fns";
import { Crosshair, Check } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskTable } from "@/components/task-table";
import { SortableTaskList } from "@/components/sortable-task-list";
import { CompletedSection } from "@/components/completed-section";
import { EmptyState } from "@/components/empty-state";
import { InviteCTA } from "@/components/invite-cta";
import { SectionCount } from "@/components/section-count";
import { RightRail } from "@/components/right-rail";
import {
  getAssignedToMe,
  getCurrentProfile,
  getMembersWithPulse,
  getRecentActivity,
  type TaskWithRelations,
} from "@/lib/queries";

export const metadata = { title: "My Day · Loop" };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 22) return "Good evening";
  return "Working late";
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

  // Two-line greeting strip: line 1 is the time-of-day welcome, line 2
  // is the action-relevant breakdown (due today · completed today). The
  // breakdown reads as discrete facts rather than a sentence so the
  // eye can pick up the number it cares about without re-scanning.
  const dueTodayCount = overdue.length + today.length;
  const breakdownParts: string[] = [];
  if (dueTodayCount > 0) {
    breakdownParts.push(
      `${dueTodayCount} ${dueTodayCount === 1 ? "task" : "tasks"} due today`
    );
  }
  if (completedToday.length > 0) {
    breakdownParts.push(
      `${completedToday.length} completed today`
    );
  }
  const greetingHint =
    breakdownParts.length === 0
      ? "Nothing queued for today."
      : breakdownParts.join(" · ");

  return (
    <div className="min-h-full">
      <PageHeader icon={<Crosshair size={16} />} title="My Day" />

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
                icon={<Crosshair size={32} weight="fill" />}
                title="Nothing's on you right now"
                hint="Add one for yourself, or hand work off to a teammate."
                actionLabel="Assign your first task"
                secondarySlot={<InviteCTA />}
                tips={[
                  "Self-assigned tasks land straight here, no inbox step.",
                  "Use # to drop a task into a project, @ to assign it to someone.",
                  "Use the search bar at the top to jump to anything.",
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
                    <SortableTaskList tasks={s.tasks} />
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
        <SectionCount n={count} />
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
      className="focus-ring group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-sm"
      title="Open to reopen this task"
    >
      <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500">
        <Check size={11} weight="bold" className="text-white" />
      </span>
      <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through decoration-muted-foreground/40 group-hover:text-foreground/70">
        {title}
      </p>
      {at && (
        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground/70">
          {format(new Date(at), "h:mm a")}
        </span>
      )}
    </Link>
  );
}
