"use client";

import { Plus } from "@/components/icons";
import { useQuickAdd } from "@/components/quick-add-context";

/**
 * "+ Add task" row that lives at the bottom of any task list. Opens the
 * Quick Add modal — same flow as the sidebar + button and the Q shortcut.
 * Padding mirrors TaskRow's px-4 py-3 so the row aligns vertically with
 * the rows above it.
 */
export function AddTaskInline() {
  const { open } = useQuickAdd();
  return (
    <button
      onClick={open}
      className="focus-ring flex w-full items-center gap-3 px-4 py-3 text-left text-[13.5px] font-medium text-muted-foreground transition-[background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-accent/30 hover:text-foreground"
    >
      <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-dashed border-muted-foreground/50 text-muted-foreground">
        <Plus size={11} weight="bold" />
      </span>
      <span>Add task</span>
    </button>
  );
}
