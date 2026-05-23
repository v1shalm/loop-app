"use client";

import { AddTaskInline } from "@/components/add-task-inline";
import { cn } from "@/lib/utils";

/**
 * Vertical stack of task cards. Two modes:
 *  • default — each TaskRow keeps its own card chrome; this wrapper
 *    spaces them with gap-2 and tacks a free-standing "+ Add task"
 *    button at the bottom.
 *  • flat — rows render without borders inside an outer bordered
 *    container provided by the caller. Hairline dividers between
 *    rows (border-t on every row except the first), and the add row
 *    sits at the bottom with a top hairline. Project page uses this.
 */
export function TaskTable({
  children,
  showAdd = true,
  defaultProjectId,
  flat,
}: {
  children: React.ReactNode;
  showAdd?: boolean;
  defaultProjectId?: string | null;
  flat?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        flat
          ? "overflow-hidden rounded-xl border border-border/60 bg-card"
          : "gap-2"
      )}
    >
      {children}
      {showAdd && (
        <AddTaskInline defaultProjectId={defaultProjectId} flat={flat} />
      )}
    </div>
  );
}
