import Link from "next/link";
import { DotsThree, Flag, Folder, Plus } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  WORKFLOW_STATUS_META,
  type WorkflowStatus,
} from "@/components/workflow-status-picker";
import {
  getProjectsBoard,
  type ProjectBoardColumn,
  type TaskWithRelations,
} from "@/lib/queries";
import { cn } from "@/lib/utils";

export const metadata = { title: "Projects · Loop" };

const PRIORITY_LABEL: Record<number, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
  4: "No priority",
};

const PRIORITY_TONE: Record<number, string> = {
  1: "text-rose-600",
  2: "text-amber-600",
  3: "text-emerald-600",
  4: "text-muted-foreground/70",
};

export default async function ProjectsBoardPage() {
  const columns = await getProjectsBoard();

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader icon={<Folder size={16} />} title="Projects" />

      {columns.length === 0 ? (
        <div className="mx-auto w-full max-w-[760px] px-8 pt-8">
          <EmptyState
            illustrationSrc="/illustrations/No projects.webp"
            illustrationSize={240}
            title="No projects yet"
            hint="Group related tasks under a project to track them as one piece of work."
            actionLabel="Add a task"
            tips={[
              "Open the sidebar Projects header and hit + to make one.",
              "Add #project-name when creating a task to drop it into a project.",
              "Each project gets its own column here, with tasks stacked inside.",
            ]}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-max items-start gap-4 px-6 pb-10 pt-6">
            {columns.map((col) => (
              <BoardColumn key={col.project.id} column={col} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BoardColumn({ column }: { column: ProjectBoardColumn }) {
  const { project, open_count, tasks } = column;
  const status = (project.workflow_status as WorkflowStatus | null) ?? null;
  const meta = status ? WORKFLOW_STATUS_META[status] : null;

  return (
    <section className="flex w-[300px] shrink-0 flex-col gap-2.5 rounded-2xl border border-border/60 bg-foreground/[0.045] pt-2.5 px-1 pb-1 shadow-soft-xs">
      {/* Column header */}
      <header className="flex items-center gap-2 px-2 pt-1.5">
        {meta ? (
          <span className={cn("shrink-0", meta.iconColor)}>{meta.icon}</span>
        ) : (
          <span
            aria-hidden
            className="grid size-3.5 shrink-0 place-items-center rounded-full border border-dashed border-muted-foreground/60"
          />
        )}
        <Link
          href={`/projects/${project.id}`}
          className="focus-ring min-w-0 flex-1 truncate rounded text-[13.5px] font-semibold text-foreground hover:underline"
        >
          {project.name}
        </Link>
        <span className="shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
          {open_count}
        </span>
        <Link
          href={`/projects/${project.id}`}
          aria-label="Add task to project"
          className="focus-ring grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Plus size={13} weight="bold" />
        </Link>
        <Link
          href={`/projects/${project.id}`}
          aria-label="Project actions"
          className="focus-ring grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <DotsThree size={14} weight="bold" />
        </Link>
      </header>

      {/* Cards */}
      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-card/60 p-4 text-center text-[12px] text-muted-foreground">
          Nothing open here.
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {tasks.map((task) => (
            <li key={task.id}>
              <TaskBoardCard task={task} projectId={project.id} />
            </li>
          ))}
        </ul>
      )}

      {open_count > tasks.length && (
        <Link
          href={`/projects/${project.id}`}
          className="focus-ring mt-1 rounded-md px-2 py-1.5 text-center text-[11.5px] text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          View {open_count - tasks.length} more
        </Link>
      )}
    </section>
  );
}

function TaskBoardCard({
  task,
  projectId,
}: {
  task: TaskWithRelations;
  projectId: string;
}) {
  const priority = task.priority as 1 | 2 | 3 | 4;
  const bullets = bulletsFromDescription(task.description);
  const body = bodyFromDescription(task.description);

  return (
    <Link
      href={`/projects/${projectId}?task=${task.id}`}
      scroll={false}
      className="focus-ring group flex flex-col gap-2.5 rounded-xl border border-border/60 bg-card p-3.5 shadow-soft-sm transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-md"
    >
      <h4 className="text-[13.5px] font-semibold leading-snug tracking-tight text-foreground">
        {task.title}
      </h4>

      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1">
          {bullets.map((b, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-[11.5px] leading-snug text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60"
              />
              <span className="line-clamp-2">{b}</span>
            </li>
          ))}
        </ul>
      )}

      {body && (
        <p className="line-clamp-3 whitespace-pre-line text-[11.5px] leading-relaxed text-muted-foreground">
          {body}
        </p>
      )}

      <div className="flex items-center gap-2 pt-0.5">
        <Flag
          size={11}
          weight={priority < 4 ? "fill" : "regular"}
          className={cn("shrink-0", PRIORITY_TONE[priority])}
        />
        <span className="rounded-md bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">
          {PRIORITY_LABEL[priority]}
        </span>
      </div>
    </Link>
  );
}

/**
 * Pulls lines that start with "- ", "• ", or "* " out of the description
 * and surfaces them as bullets on the card. Everything else lands in the
 * body block underneath.
 */
function bulletsFromDescription(desc: string | null | undefined): string[] {
  if (!desc) return [];
  const lines = desc.split(/\r?\n/);
  return lines
    .map((l) => l.match(/^\s*[-•*]\s+(.*)$/)?.[1])
    .filter((x): x is string => Boolean(x))
    .slice(0, 2);
}

function bodyFromDescription(desc: string | null | undefined): string {
  if (!desc) return "";
  const lines = desc.split(/\r?\n/);
  const nonBullet = lines.filter((l) => !/^\s*[-•*]\s+/.test(l));
  return nonBullet.join("\n").trim();
}
