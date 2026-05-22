import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { Hash, CheckCircle, UsersThree } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskRow } from "@/components/task-row";
import { TaskTable } from "@/components/task-table";
import { EmptyState } from "@/components/empty-state";
import {
  getProject,
  getProjectTasks,
  getMembersWithPulse,
} from "@/lib/queries";
import { getSupabaseServer } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const p = await getProject(id);
  return { title: p ? `${p.name} · Loop` : "Project · Loop" };
}

export default async function ProjectPage({ params }: PageProps) {
  const { id } = await params;
  const [project, openTasks, members, completedCount] = await Promise.all([
    getProject(id),
    getProjectTasks(id),
    getMembersWithPulse(),
    countDoneInProject(id),
  ]);

  if (!project) notFound();

  // Unique assignees on the open tasks for this project
  const activeMemberIds = new Set(
    openTasks.map((t) => t.assignee_id).filter(Boolean) as string[]
  );
  const activeMembers = members.filter((m) => activeMemberIds.has(m.id));

  const total = openTasks.length + completedCount;
  const ratio = total === 0 ? 0 : completedCount / total;

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Hash size={16} />}
        title={project.name}
        subtitle={
          openTasks.length === 0
            ? "All clear"
            : `${openTasks.length} open ${openTasks.length === 1 ? "task" : "tasks"}`
        }
      />

      <div className="mx-auto w-full max-w-[820px] px-8 pb-24 pt-8">
        {/* Overview */}
        <section className="mb-8 grid grid-cols-3 gap-3">
          <StatTile
            icon={<Hash size={16} className="text-muted-foreground" />}
            label="Open"
            value={openTasks.length}
          />
          <StatTile
            icon={
              <CheckCircle
                size={16}
                weight="fill"
                className="text-emerald-600"
              />
            }
            label="Completed"
            value={completedCount}
            sub={total > 0 ? `${Math.round(ratio * 100)}% done` : undefined}
          />
          <StatTile
            icon={<UsersThree size={16} className="text-muted-foreground" />}
            label="Working on it"
            value={activeMembers.length}
          />
        </section>

        {/* Tasks */}
        <section className="mb-8">
          <header className="mb-2 flex items-baseline justify-between border-b border-border/50 pb-2">
            <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
              Tasks
            </h2>
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {openTasks.length} {openTasks.length === 1 ? "task" : "tasks"}
            </span>
          </header>
          {openTasks.length === 0 ? (
            <EmptyState
              icon={<Hash size={22} />}
              title="This project is empty"
              hint="Add the first task and pick this project from the picker."
            />
          ) : (
            <TaskTable>
              {openTasks.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </TaskTable>
          )}
        </section>

        {/* Members */}
        {activeMembers.length > 0 && (
          <section className="mb-8">
            <header className="mb-2 border-b border-border/50 pb-2">
              <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
                Members
              </h2>
            </header>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => (
                <Link
                  key={m.id}
                  href={`/team/${m.id}`}
                  className="focus-ring flex items-center gap-2 rounded-full border border-border/60 bg-card px-2.5 py-1.5 transition-colors hover:bg-accent/40"
                >
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-zinc-900"
                    style={{
                      backgroundColor: m.avatar_color,
                      boxShadow: "var(--shadow-avatar)",
                    }}
                  >
                    {m.initials}
                  </span>
                  <span className="text-[12.5px] text-foreground">{m.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recent activity */}
        <RecentActivity projectId={id} />
      </div>
    </div>
  );
}

async function countDoneInProject(projectId: string): Promise<number> {
  const supabase = await getSupabaseServer();
  if (!supabase) return 0;
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "done");
  return count ?? 0;
}

async function RecentActivity({ projectId }: { projectId: string }) {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const since = new Date();
  since.setDate(since.getDate() - 14);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from("tasks")
    .select(
      "id, title, status, created_at, completed_at, author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color), assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color)"
    )
    .eq("project_id", projectId)
    .or(
      `created_at.gte.${since.toISOString()},completed_at.gte.${since.toISOString()}`
    )
    .order("created_at", { ascending: false })
    .limit(8) as any);

  type Row = {
    id: string;
    title: string;
    status: "todo" | "doing" | "done";
    created_at: string;
    completed_at: string | null;
    author: {
      id: string;
      name: string;
      initials: string;
      avatar_color: string;
    } | null;
    assignee: {
      id: string;
      name: string;
      initials: string;
      avatar_color: string;
    } | null;
  };

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  return (
    <section className="mb-8">
      <header className="mb-2 border-b border-border/50 pb-2">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Recent activity
        </h2>
      </header>
      <ul className="flex flex-col">
        {rows.map((r) => {
          const completed = r.status === "done" && r.completed_at;
          const at = completed ? r.completed_at! : r.created_at;
          const who = completed ? r.assignee : r.author;
          return (
            <li
              key={`${r.id}-${completed ? "done" : "add"}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            >
              {who && (
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-semibold text-zinc-900"
                  style={{
                    backgroundColor: who.avatar_color,
                    boxShadow: "var(--shadow-avatar)",
                  }}
                >
                  {who.initials}
                </span>
              )}
              <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                <span className="text-foreground">{who?.name ?? "Someone"}</span>{" "}
                {completed ? "completed" : "added"}{" "}
                <span className="text-foreground">{r.title}</span>
              </p>
              <span className="text-[11.5px] tabular-nums text-muted-foreground/70">
                {format(new Date(at), "d MMM, h:mm a")}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft-xs">
      <div className="mb-2 grid size-8 place-items-center rounded-lg bg-muted">
        {icon}
      </div>
      <div className="text-[22px] font-semibold leading-none tabular-nums text-foreground">
        {value}
      </div>
      <p className="mt-1 text-[12px] text-muted-foreground">{label}</p>
      {sub && (
        <p className="mt-0.5 text-[11.5px] text-muted-foreground/80">{sub}</p>
      )}
    </div>
  );
}
