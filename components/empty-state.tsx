"use client";

import { Plus } from "@/components/icons";
import { useQuickAdd } from "@/components/quick-add-context";

interface EmptyStateProps {
  emoji: string;
  title: string;
  hint: string;
  /** Action label. Defaults to "Add task" which opens Quick Add. */
  actionLabel?: string;
  /** Override the action handler; defaults to opening Quick Add. */
  onAction?: () => void;
}

/**
 * Standard empty state used on Today / Upcoming / Inbox / project pages.
 * Replaces the old "Press Q to add" dead-text pattern with an inline CTA
 * that actually opens Quick Add. Reuses the same flow as the sidebar +
 * button so non-tech users don't need to know about keyboard shortcuts.
 */
export function EmptyState({
  emoji,
  title,
  hint,
  actionLabel = "Add task",
  onAction,
}: EmptyStateProps) {
  const { open } = useQuickAdd();
  const action = onAction ?? open;

  return (
    <div className="grid place-items-center rounded-2xl border border-border/60 bg-card py-12 text-center shadow-soft-xs">
      <div className="text-4xl">{emoji}</div>
      <p className="mt-3 text-[14px] font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-[360px] text-[12.5px] text-muted-foreground">
        {hint}
      </p>
      <button
        onClick={action}
        className="focus-ring surface-brand surface-brand-hover mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
      >
        <Plus size={13} weight="bold" />
        {actionLabel}
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground/70">
        or press{" "}
        <kbd className="chip-3d ml-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 font-mono text-[10px] font-medium text-foreground">
          Q
        </kbd>
      </p>
    </div>
  );
}
