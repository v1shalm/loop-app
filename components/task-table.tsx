"use client";

import { AddTaskInline } from "@/components/add-task-inline";

/**
 * Card-style container for a group of TaskRows. Renders the hairline-divided
 * row layout from the design reference, with an "+ Add task" footer that
 * opens Quick Add.
 */
export function TaskTable({
  children,
  showAdd = true,
  defaultProjectId,
}: {
  children: React.ReactNode;
  showAdd?: boolean;
  defaultProjectId?: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
      {children}
      {showAdd && (
        <div className="border-t border-border/40">
          <AddTaskInline defaultProjectId={defaultProjectId} />
        </div>
      )}
    </div>
  );
}
