import Link from "next/link";
import { Folder } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { ProjectDot } from "@/components/project-dot";
import { EmptyState } from "@/components/empty-state";
import {
  WorkflowStatusChip,
  type WorkflowStatus,
} from "@/components/workflow-status-picker";
import { getProjectsOverview, type ProjectOverview } from "@/lib/queries";

export const metadata = { title: "Projects · Loop" };

export default async function ProjectsIndexPage() {
  const overviews = await getProjectsOverview();

  return (
    <div className="min-h-full">
      <PageHeader
        icon={<Folder size={16} />}
        title="Projects"
        subtitle={
          overviews.length === 0
            ? "Nothing yet"
            : `${overviews.length} ${overviews.length === 1 ? "project" : "projects"}`
        }
      />

      <div className="mx-auto w-full max-w-[1100px] px-8 pb-24 pt-8">
        {overviews.length === 0 ? (
          <EmptyState
            icon={<Folder size={22} />}
            title="No projects yet"
            hint="Group related tasks under a project to track them as one piece of work."
            actionLabel="Add a task"
            tips={[
              "Open the sidebar Projects header and hit + to make one.",
              "Add #project-name when creating a task to drop it into a project.",
              "Set a project's status (Draft, In Progress, Live) to track its stage at a glance.",
            ]}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {overviews.map((o) => (
              <ProjectCard key={o.project.id} overview={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ overview }: { overview: ProjectOverview }) {
  const { project, open_count, done_count, recent_titles } = overview;
  const status = (project.workflow_status as WorkflowStatus | null) ?? null;
  const total = open_count + done_count;
  const pct = total === 0 ? 0 : Math.round((done_count / total) * 100);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="focus-ring group flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-md"
    >
      {/* Title row */}
      <div className="flex items-start gap-2.5">
        <ProjectDot project={project} size={10} className="mt-1.5" />
        <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug tracking-tight text-foreground">
          {project.name}
        </h3>
      </div>

      {/* Body — recent task titles as scannable bullets */}
      {recent_titles.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {recent_titles.map((title, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12.5px] leading-snug text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50"
              />
              <span className="truncate">{title}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[12.5px] text-muted-foreground/70">
          {total === 0
            ? "Nothing in here yet."
            : `${done_count} done, nothing open.`}
        </p>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="mt-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer — status chip + count */}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        {status ? (
          <WorkflowStatusChip status={status} />
        ) : (
          <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground/70">
            <span
              aria-hidden
              className="grid size-3 place-items-center rounded-full border border-dashed border-muted-foreground/50"
            />
            No status
          </span>
        )}
        <span className="text-[11.5px] tabular-nums text-muted-foreground">
          {open_count} open · {done_count} done
        </span>
      </div>
    </Link>
  );
}
