import Link from "next/link";
import { Folder } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  WORKFLOW_STATUS_META,
  type WorkflowStatus,
} from "@/components/workflow-status-picker";
import { getProjectsOverview, type ProjectOverview } from "@/lib/queries";
import { cn } from "@/lib/utils";

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
  const { project, recent_titles } = overview;
  const status = (project.workflow_status as WorkflowStatus | null) ?? null;
  const description = project.description ?? null;
  const meta = status ? WORKFLOW_STATUS_META[status] : null;

  // Card shows up to 2 short bullets so the body paragraph still has room.
  const bullets = recent_titles.slice(0, 2);

  return (
    <Link
      href={`/projects/${project.id}`}
      className="focus-ring group flex h-full flex-col gap-3.5 rounded-2xl border border-border/60 bg-card p-5 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-md"
    >
      {/* Title — large, can wrap to multiple lines */}
      <h3 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.005em] text-foreground">
        {project.name}
      </h3>

      {/* Bullets — short scannable points */}
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {bullets.map((title, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-[12.5px] leading-snug text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60"
              />
              <span className="line-clamp-2">{title}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Body paragraph — project description */}
      {description && (
        <p className="line-clamp-4 whitespace-pre-line text-[12.5px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      {/* Spacer to push footer down */}
      <div className="flex-1" />

      {/* Footer — dotted circle / status icon + tag chip */}
      <div className="flex items-center gap-2 pt-1">
        {meta ? (
          <span className={cn("shrink-0", meta.iconColor)}>{meta.icon}</span>
        ) : (
          <span
            aria-hidden
            className="grid size-3.5 shrink-0 place-items-center rounded-full border border-dashed border-muted-foreground/60"
          />
        )}
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11.5px] font-medium text-muted-foreground">
          {meta ? meta.label : "No status"}
        </span>
      </div>
    </Link>
  );
}
