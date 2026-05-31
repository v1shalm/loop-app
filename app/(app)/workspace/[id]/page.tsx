import Link from "next/link";
import { notFound } from "next/navigation";
import { format, isPast, isToday } from "date-fns";
import { CaretRight, CheckCircle, UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { SectionCount } from "@/components/section-count";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import {
  getTeammate,
  getTasksAssignedTo,
  getCurrentProfile,
} from "@/lib/queries";
import { statusLabel } from "@/components/status-picker";
import { Avatar } from "@/components/avatar";

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
          href="/workspace"
          className="focus-ring mb-4 inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <CaretRight size={12} className="rotate-180" />
          All teammates
        </Link>

        {/* Card uses flex-wrap so the two stats drop onto a second row on
            narrow viewports. Without this, on a 360px phone the stats
            stole horizontal space from the name+status column and the
            three columns overlapped each other (name wrapped to two
            lines, "(you)" landed on top of the Active value). */}
        <header className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-4 rounded-2xl border border-border/60 bg-card p-5 shadow-soft-sm">
          <Avatar
            src={member.avatar_url}
            initials={member.initials}
            color={member.avatar_color}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold tracking-tight text-foreground">
              {member.name}
              {isMe && (
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                  (you)
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {label ? (
                <span>{label}</span>
              ) : (
                <span className="text-muted-foreground/60">
                  No status set
                </span>
              )}
            </p>
          </div>
          {/* basis-full on mobile forces the stats container onto its
              own row (flex-wrap kicks in). On desktop the basis is auto,
              so they stay inline to the right as before. md:text-right
              preserves the previous desktop alignment via inheritance;
              the wrapped mobile row reads left-aligned by default. */}
          <div className="flex items-baseline gap-8 max-md:basis-full max-md:border-t max-md:border-border/40 max-md:pt-4 md:text-right">
            <Stat label="Active" value={member.open_tasks} />
            <Stat label="Done today" value={member.completed_today} />
          </div>
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
            <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
              <CheckCircle size={20} weight="fill" />
            </span>
            <p className="mt-3 text-[14px] font-medium text-foreground">
              {isMe ? "You're clear" : `${member.name} is clear`}
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              No open tasks right now.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  // Alignment is owned by the parent container (text-right inline on
  // desktop, default left when wrapped onto a second row on mobile).
  return (
    <div>
      <div className="text-[17px] font-semibold tabular-nums text-foreground">
        {value}
      </div>
      <div className="text-[12px] font-medium text-muted-foreground/80">
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
            <span className="text-[12px] text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
        <SectionCount n={tasks.length} />
      </header>
      <TaskTable showAdd={false}>
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </TaskTable>
    </section>
  );
}
