"use client";

import { AddTaskInline } from "@/components/add-task-inline";

/**
 * Vertical stack of task cards. Each row is now its own card (TaskRow)
 * with its own border and shadow, so this wrapper only handles spacing
 * between cards and the "+ Add task" footer.
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
    <div className="flex flex-col gap-2">
      {children}
      {showAdd && <AddTaskInline defaultProjectId={defaultProjectId} />}
    </div>
  );
}
