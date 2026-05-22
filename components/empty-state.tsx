"use client";

import { Plus } from "@/components/icons";
import { useQuickAdd } from "@/components/quick-add-context";

interface EmptyStateProps {
  emoji: string;
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Set to false to render the empty state without a CTA. */
  showAction?: boolean;
}

/**
 * Centered empty state used on Today / Upcoming / Inbox / project pages.
 * Sits in a tall card that anchors the eye in the middle of the page
 * instead of clinging to the top.
 */
export function EmptyState({
  emoji,
  title,
  hint,
  actionLabel = "Add task",
  onAction,
  showAction = true,
}: EmptyStateProps) {
  const { open } = useQuickAdd();
  const action = onAction ?? open;

  return (
    <div className="grid min-h-[440px] place-items-center rounded-2xl border border-border/60 bg-card px-6 py-12 text-center shadow-soft-xs">
      <div className="max-w-[360px]">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl border border-border/60 bg-muted/40 text-[32px] shadow-soft-xs">
          {emoji}
        </div>
        <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
          {hint}
        </p>
        {showAction && (
          <>
            <button
              onClick={action}
              className="focus-ring surface-brand surface-brand-hover mt-5 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
            >
              <Plus size={13} weight="bold" />
              {actionLabel}
            </button>
            <p className="mt-2.5 text-[11.5px] text-muted-foreground/70">
              or press{" "}
              <kbd className="chip-3d ml-px inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-background px-1 text-[10.5px] font-semibold text-foreground">
                Q
              </kbd>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
