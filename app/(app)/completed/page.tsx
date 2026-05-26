import Link from "next/link";
import { format, isSameDay, isThisWeek, isToday, isYesterday } from "date-fns";
import { Check } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { SectionCount } from "@/components/section-count";
import { getCompletedAssignedToMe, type TaskWithRelations } from "@/lib/queries";

export const metadata = { title: "Completed · Loop" };

export default async function CompletedPage() {
  const tasks = await getCompletedAssignedToMe();

  // Group by completion date — Today / Yesterday / This week / Earlier.
  // Anything without a completed_at is dropped (a done task with no
  // timestamp is almost certainly a seed artefact and not actionable).
  const groups: { key: string; label: string; tasks: TaskWithRelations[] }[] = [
    { key: "today", label: "Today", tasks: [] },
    { key: "yesterday", label: "Yesterday", tasks: [] },
    { key: "this-week", label: "Earlier this week", tasks: [] },
    { key: "earlier", label: "Earlier", tasks: [] },
  ];
  for (const t of tasks) {
    if (!t.completed_at) continue;
    const at = new Date(t.completed_at);
    if (isToday(at)) groups[0].tasks.push(t);
    else if (isYesterday(at)) groups[1].tasks.push(t);
    else if (isThisWeek(at)) groups[2].tasks.push(t);
    else groups[3].tasks.push(t);
  }
  const visible = groups.filter((g) => g.tasks.length > 0);

  return (
    <div className="min-h-full">
      <PageHeader icon={<Check size={16} />} title="Completed" />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-10">
        {visible.length === 0 ? (
          <EmptyState
            icon={<Check size={32} weight="fill" />}
            title="Nothing completed yet"
            hint="Tasks you finish land here, grouped by the day."
          />
        ) : (
          visible.map((g) => (
            <section key={g.key} className="mb-8">
              <header className="mb-3 flex items-baseline justify-between">
                <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                  {g.label}
                </h2>
                <SectionCount n={g.tasks.length} />
              </header>
              <div className="flex flex-col gap-2">
                {g.tasks.map((t) => (
                  <CompletedRow
                    key={t.id}
                    id={t.id}
                    title={t.title}
                    at={t.completed_at}
                    showDate={g.key !== "today"}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function CompletedRow({
  id,
  title,
  at,
  showDate,
}: {
  id: string;
  title: string;
  at: string | null;
  showDate: boolean;
}) {
  const completedAt = at ? new Date(at) : null;
  const trailing = completedAt
    ? showDate
      ? format(completedAt, "d MMM, h:mm a")
      : format(completedAt, "h:mm a")
    : null;
  // Suppress the duplicated section label on this-week's matching day
  // (e.g. don't say "Mon, 10:14" inside the "Earlier this week" group
  // when we just labelled the group itself).
  void isSameDay;

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
      {trailing && (
        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground/70">
          {trailing}
        </span>
      )}
    </Link>
  );
}
