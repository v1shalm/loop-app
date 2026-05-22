import { format } from "date-fns";
import { Crosshair, CheckCircle } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import { CompletedSection } from "@/components/completed-section";
import { EmptyState } from "@/components/empty-state";
import {
  getAssignedToMe,
  getCurrentProfile,
  type TaskWithRelations,
} from "@/lib/queries";

export const metadata = { title: "Assigned to me · Loop" };

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Burning the midnight oil";
}

export default async function AssignedToMePage() {
  const [{ overdue, today, upcoming, completedToday }, profile] =
    await Promise.all([getAssignedToMe(), getCurrentProfile()]);
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
        title="Assigned to me"
        subtitle={
          activeCount === 0
            ? "All clear"
            : `${activeCount} active · ${completedToday.length} done today`
        }
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-10">
        {/* Greeting */}
        <header className="mb-10">
          <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            {greetingHint}
          </p>
        </header>

        {activeCount === 0 && completedToday.length === 0 ? (
          <EmptyState
            emoji="🙌"
            title="Nothing's on you right now"
            hint="Add one for yourself, or wait for a teammate to assign you something."
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
              <div className="mb-8 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
                {/* AddTaskInline already lives in TaskTable footer — render
                    a bare card with only the footer for the no-active case
                    so the user still has the quick-add affordance. */}
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
                    title={t.title}
                    at={t.completed_at}
                  />
                ))
              )}
            </CompletedSection>
          </>
        )}
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
  title,
  at,
}: {
  title: string;
  at: string | null;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-3 last:border-b-0">
      <CheckCircle
        size={16}
        weight="fill"
        className="shrink-0 text-emerald-600"
      />
      <p className="min-w-0 flex-1 truncate text-[13.5px] text-muted-foreground line-through decoration-muted-foreground/40">
        {title}
      </p>
      {at && (
        <span className="text-[11.5px] tabular-nums text-muted-foreground/70">
          {format(new Date(at), "h:mm a")}
        </span>
      )}
    </div>
  );
}
