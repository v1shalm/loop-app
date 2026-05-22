import Link from "next/link";
import { notFound } from "next/navigation";
import { format, isPast, isToday } from "date-fns";
import { CaretRight, UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import {
  getTeammate,
  getTasksAssignedTo,
  getCurrentProfile,
} from "@/lib/queries";
import { statusEmoji, statusLabel } from "@/components/status-picker";

interface TeammatePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: TeammatePageProps) {
  const { id } = await params;
  const m = await getTeammate(id);
  return { title: m ? `${m.name} · Loop` : "Teammate · Loop" };
}

export default async function TeammatePage({ params }: TeammatePageProps) {
  const { id } = await params;
  const [me, member, openTasks] = await Promise.all([
    getCurrentProfile(),
    getTeammate(id),
    getTasksAssignedTo(id),
  ]);

  if (!member) notFound();

  const isMe = me?.id === member.id;
  const emoji = statusEmoji(member.status ?? null);
  const label = statusLabel(member.status ?? null);

  const overdue = openTasks.filter(
    (t) => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at))
  );
  const today = openTasks.filter(
    (t) => t.due_at && isToday(new Date(t.due_at))
  );
  const later = openTasks.filter(
    (t) => !t.due_at || (!isToday(new Date(t.due_at)) && !isPast(new Date(t.due_at)))
  );

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<UsersThree size={16} />}
        title={member.name}
        subtitle={isMe ? "That's you" : label ?? "No status set"}
      />

      <div className="mx-auto w-full max-w-[760px] px-8 pb-24 pt-8">
        <Link
          href="/team"
          className="focus-ring mb-4 inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          <CaretRight size={12} className="rotate-180" />
          All teammates
        </Link>

        <header className="mb-6 flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft-sm">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-full text-[18px] font-semibold text-zinc-900"
            style={{
              backgroundColor: member.avatar_color,
              boxShadow: "var(--shadow-avatar)",
            }}
          >
            {member.initials}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[18px] font-semibold tracking-tight text-foreground">
              {member.name}
              {isMe && (
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                  (you)
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {emoji ? (
                <>
                  <span>{emoji}</span> <span>{label}</span>
                </>
              ) : (
                <span className="italic text-muted-foreground/60">
                  No status set
                </span>
              )}
            </p>
          </div>
          <Stat label="Active" value={member.open_tasks} />
          <Stat label="Done today" value={member.completed_today} />
        </header>

        <Section title="Overdue" tone="warn" tasks={overdue} />
        <Section
          title="Today"
          subtitle={format(new Date(), "EEEE, d MMM")}
          tasks={today}
        />
        <Section title="Later" tasks={later} />

        {openTasks.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-border/60 bg-card py-14 text-center shadow-soft-sm">
            <div className="text-3xl">✨</div>
            <p className="mt-3 text-[14px] font-medium text-foreground">
              {isMe ? "You're clear" : `${member.name} is clear`}
            </p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              No open tasks right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-right">
      <div className="text-[18px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
        {label}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  tone,
  tasks,
}: {
  title: string;
  subtitle?: string;
  tone?: "warn";
  tasks: import("@/lib/queries").TaskWithRelations[];
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="mb-8">
      <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
        <div className="flex items-baseline gap-2.5">
          <h2
            className={`text-[15px] font-semibold tracking-tight ${
              tone === "warn" ? "text-priority-1" : "text-foreground"
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
          {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
        </span>
      </header>
      <TaskTable showAdd={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </TaskTable>
    </section>
  );
}
