"use client";

import { Check } from "@/components/icons";
import { useBulkSelection } from "@/components/bulk-selection";
import { cn } from "@/lib/utils";

/**
 * Small toggle pinned to the page header. Off by default. When the user
 * flips it on, task-row checkboxes switch from "mark complete" to "add
 * to selection" and the floating BulkActionBar appears once 1+ rows
 * are selected.
 */
export function BulkSelectToggle() {
  const { mode, setMode } = useBulkSelection();
  return (
    <button
      type="button"
      onClick={() => setMode(!mode)}
      aria-pressed={mode}
      className={cn(
        "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-medium transition-colors duration-150 ease-[var(--ease-out)]",
        mode
          ? "border-primary/60 bg-primary/8 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      <Check size={11} weight={mode ? "bold" : "regular"} />
      {mode ? "Selecting" : "Select"}
    </button>
  );
}
