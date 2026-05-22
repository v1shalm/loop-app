"use client";

import { CaretRight } from "@/components/icons";

interface SidebarEmptyCardProps {
  /** Visual cue rendered above the message. Stacked dots, dashed plus, etc. */
  graphic: React.ReactNode;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Empty-state card that lives inside a sidebar Section.
 * Matches the white-card + soft-shadow chrome used on the rest of the
 * app. Used by Projects and Team Pulse when those lists are empty.
 */
export function SidebarEmptyCard({
  graphic,
  hint,
  actionLabel,
  onAction,
}: SidebarEmptyCardProps) {
  return (
    <div className="mx-1 mt-1 rounded-lg border border-border/60 bg-card p-3 shadow-soft-xs">
      <div className="grid place-items-center py-1">{graphic}</div>
      <p className="mt-2 text-center text-[11.5px] leading-snug text-muted-foreground">
        {hint}
      </p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="focus-ring mt-2.5 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11.5px] font-medium text-foreground transition-colors hover:bg-accent/40"
        >
          {actionLabel}
          <CaretRight size={10} weight="bold" />
        </button>
      )}
    </div>
  );
}

/**
 * "Stacked dashed tile" graphic for the Projects empty card.
 * Three overlapping rounded squares suggesting "create a project".
 */
export function ProjectsEmptyGraphic() {
  return (
    <div className="relative grid h-9 w-12 place-items-center">
      <div className="absolute left-0 top-1 size-8 rotate-[-6deg] rounded-md border border-dashed border-muted-foreground/40 bg-muted/30" />
      <div className="absolute right-0 top-1 size-8 rotate-[6deg] rounded-md border border-dashed border-muted-foreground/40 bg-muted/30" />
      <div className="absolute size-8 rounded-md border border-border bg-card shadow-soft-xs" />
    </div>
  );
}

/**
 * Three subtle stacked avatars for the Team Pulse empty card.
 */
export function TeamPulseEmptyGraphic() {
  return (
    <div className="flex -space-x-2">
      <span className="grid size-7 place-items-center rounded-full border border-card bg-muted text-[10px] font-semibold text-muted-foreground shadow-soft-xs">
        +
      </span>
      <span className="grid size-7 place-items-center rounded-full border border-card bg-muted/70 text-[10px] font-semibold text-muted-foreground/70 shadow-soft-xs">
        ?
      </span>
      <span className="grid size-7 place-items-center rounded-full border border-card bg-muted/50 text-[10px] text-muted-foreground/50 shadow-soft-xs">
        ·
      </span>
    </div>
  );
}
