import { notFound } from "next/navigation";
import { Hash } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { TaskTable } from "@/components/task-table";
import { SortableTaskList } from "@/components/sortable-task-list";
import { EmptyState } from "@/components/empty-state";
import { ProjectStatusPicker } from "@/components/project-status-picker";
import { ProjectDescription } from "@/components/project-description";
import { MemberStack } from "@/components/member-stack";
import { RelativeTime } from "@/components/relative-time";
import { Avatar } from "@/components/avatar";
import type { WorkflowStatus } from "@/components/workflow-status-picker";
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

  const activeMemberIds = new Set(
    openTasks.map((t) => t.assignee_id).filter(Boolean) as string[]
  );
  const activeMembers = members.filter((m) => activeMemberIds.has(m.id));

  const total = openTasks.length + completedCount;
  const ratio = total === 0 ? 0 : completedCount / total;
  const percent = Math.round(ratio * 100);

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Hash size={16} />}
        title={project.name}
        right={
          <div className="flex items-center gap-3">
            <MemberStack members={activeMembers} max={4} size={22} />
            <ProjectStatusPicker
              projectId={project.id}
              initialStatus={
                (project.workflow_status as WorkflowStatus | null) ?? null
              }
              variant="quiet"
              align="end"
            />
          </div>
        }
      />

      <div className="mx-auto w-full max-w-[820px] px-8 pb-24 pt-8">
        {/* Description — plain paragraph, lives flat on the canvas */}
        <section className="mb-7">
          <ProjectDescription
            projectId={project.id}
            initial={project.description ?? null}
          />
        </section>

        {/* Progress — full-width 4px bar + "X of Y done" in purple,
            with supporting open/done counts as text. Zero-value
            stats are filtered out so the line stays meaningful. */}
        <section className="mb-8">
          <ProgressBlock
            open={openTasks.length}
            completed={completedCount}
            total={total}
            ratio={ratio}
            percent={percent}
          />
        </section>

        {/* Tasks — single bordered container with hairline dividers
            between rows and the Add-task footer welded to the bottom. */}
        <section className="mb-10">
          {openTasks.length === 0 ? (
            <EmptyState
              icon={<Hash size={32} weight="fill" />}
              title="This project is empty"
              hint="Add the first task and tag it to this project."
            />
          ) : (
            <TaskTable defaultProjectId={project.id} flat>
              <SortableTaskList tasks={openTasks} flat />
            </TaskTable>
          )}
        </section>

        {/* Activity feed — quiet label, relative time, 🎉 on completed */}
        <RecentActivity projectId={id} />
      </div>
    </div>
  );
}

function ProgressBlock({
  open,
  completed,
  total,
  ratio,
  percent,
}: {
  open: number;
  completed: number;
  total: number;
  ratio: number;
  percent: number;
}) {
  const supporting: string[] = [];
  if (open > 0) supporting.push(`${open} open`);
  if (completed > 0) supporting.push(`${completed} done`);

  return (
    <div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out)]"
          style={{
            width: `${total === 0 ? 0 : Math.max(0, Math.min(100, percent))}%`,
          }}
        />
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-[12px] text-primary">
          <strong className="font-semibold tabular-nums">{completed}</strong>
          <span className="font-normal text-primary/80"> of </span>
          <strong className="font-semibold tabular-nums">{total}</strong>
          <span className="font-normal text-primary/80"> done</span>
        </p>
        {supporting.length > 0 && (
          <p className="text-[11.5px] tabular-nums text-muted-foreground">
            {supporting.join(" · ")}
          </p>
        )}
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
      "id, title, status, created_at, completed_at, author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url), assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color, avatar_url)"
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
      avatar_url?: string | null;
    } | null;
    assignee: {
      id: string;
      name: string;
      initials: string;
      avatar_color: string;
      avatar_url?: string | null;
    } | null;
  };

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  return (
    <section>
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        Activity
      </p>
      <ul className="flex flex-col">
        {rows.map((r, i) => {
          const completed = r.status === "done" && !!r.completed_at;
          const at = completed ? r.completed_at! : r.created_at;
          const who = completed ? r.assignee : r.author;
          const isLast = i === rows.length - 1;
          return (
            <li
              key={`${r.id}-${completed ? "done" : "add"}`}
              className={
                isLast
                  ? "flex items-center gap-3 py-2.5"
                  : "flex items-center gap-3 border-b border-border/50 py-2.5"
              }
            >
              {who && (
                <Avatar
                  src={who.avatar_url}
                  initials={who.initials}
                  color={who.avatar_color}
                  size={18}
                />
              )}
              <p className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                <span className="text-foreground">
                  {who?.name ?? "Someone"}
                </span>{" "}
                {completed ? "completed" : "added"}{" "}
                <span className="text-foreground">{r.title}</span>
                {completed && (
                  <span aria-hidden className="ml-1">
                    🎉
                  </span>
                )}
              </p>
              <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground/70">
                <RelativeTime date={at} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
