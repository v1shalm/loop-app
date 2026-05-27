"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { sileo } from "sileo";
import { CaretRight, Check } from "@/components/icons";
import { setTaskStatus } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/queries";

/**
 * Collapsible "Completed" disclosure at the foot of a project's task
 * list (Todoist's pattern). Keeps finished work reachable: a completed
 * task no longer just vanishes — you can find it here, open it, or
 * reopen it by un-checking its box. Collapsed by default so it stays
 * out of the way.
 *
 * The shared TaskRow can't be reused here: it deliberately renders
 * nothing for done tasks (it animates them out on completion), so this
 * uses its own compact done-row.
 */
export function ProjectCompletedSection({
  tasks,
}: {
  tasks: TaskWithRelations[];
}) {
  const [open, setOpen] = useState(false);
  if (tasks.length === 0) return null;

  return (
    <section className="mb-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="focus-ring -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent/40"
      >
        <CaretRight
          size={13}
          weight="bold"
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-150 ease-[var(--ease-out)]",
            open && "rotate-90"
          )}
        />
        <span className="text-[13px] font-semibold text-foreground/80">
          Completed
        </span>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {tasks.length}
        </span>
      </button>

      {open && (
        <ul className="mt-1 flex flex-col">
          {tasks.map((t) => (
            <CompletedRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CompletedRow({ task }: { task: TaskWithRelations }) {
  const [reopened, setReopened] = useState(false);
  const [, startTransition] = useTransition();

  // Optimistically drop the row on reopen; it reappears in the open list
  // on revalidation. Restore if the server rejects.
  if (reopened) return null;

  const reopen = () => {
    setReopened(true);
    startTransition(async () => {
      const res = await setTaskStatus(task.id, "todo");
      if (res.error) {
        setReopened(false);
        sileo.error({ title: res.error });
      } else {
        sileo.success({ title: "Reopened", description: task.title });
      }
    });
  };

  return (
    <li className="group/done flex items-center gap-3 border-b border-border/40 py-2 last:border-b-0">
      <button
        type="button"
        onClick={reopen}
        aria-label={`Reopen ${task.title}`}
        className="focus-ring grid size-[18px] shrink-0 place-items-center rounded-[5px] bg-primary text-primary-foreground transition-transform duration-150 ease-[var(--ease-out)] hover:scale-105 active:scale-95"
        title="Reopen task"
      >
        <Check size={11} weight="bold" />
      </button>
      <Link
        href={`?task=${task.id}`}
        scroll={false}
        prefetch={false}
        className="focus-ring min-w-0 flex-1 truncate rounded text-[13px] text-muted-foreground line-through decoration-muted-foreground/40 transition-colors hover:text-foreground/80"
      >
        {task.title}
      </Link>
    </li>
  );
}
