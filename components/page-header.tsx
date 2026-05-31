"use client";

import { Plus } from "@/components/icons";
import { NotificationsBell } from "@/components/notifications-drawer";
import { useAppControls } from "@/components/app-controls-context";
import { useQuickAdd } from "@/components/quick-add-context";
import { cn } from "@/lib/utils";

/**
 * Sticky top bar present on every route. Three slots:
 *
 *   [ icon + title (+ subtitle) ]  …  [ page-specific actions ]  |  [ search ] [ bell ]
 *
 * The right-most controls (search + notifications) live here rather
 * than the sidebar so they stay visible when the sidebar collapses,
 * are reachable from every page without sidebar context, and free the
 * sidebar to do nothing but navigation. They are sourced from the
 * AppControlsContext provided by AppShell.
 */
export function PageHeader({
  icon,
  title,
  subtitle,
  right,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const controls = useAppControls();
  const quickAdd = useQuickAdd();

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background px-5",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="grid size-[18px] shrink-0 place-items-center text-muted-foreground">
            {icon}
          </span>
        )}
        <h1 className="truncate text-[15px] font-semibold tracking-[-0.005em] leading-[1.1] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <>
            <span
              aria-hidden
              className="h-4 w-px shrink-0 bg-border"
            />
            <span className="truncate text-[12px] leading-[1.1] text-muted-foreground">
              {subtitle}
            </span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1">
        {right}
        {controls && (
          <>
            {right && (
              <span
                aria-hidden
                className="mx-1 h-4 w-px shrink-0 bg-border/70 max-md:hidden"
              />
            )}
            <AddTaskTrigger onClick={quickAdd.open} />
            {/* Notifications. Sits right next to the Add task CTA on
                every route. Click toggles the slide-in drawer on
                desktop; on mobile it opens a bottom sheet from the same
                trigger. */}
            <NotificationsBell />
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Add task CTA. Lives in the topbar next to the bell on every route,
 * so the primary affordance sits next to the page context the user
 * is looking at. Same button for both breakpoints — on mobile the
 * text label collapses and the button becomes a compact "+" icon
 * (replaces the previous floating FAB), on desktop it expands to a
 * full "+ Add task" pill. Uses --shadow-cta so it reads as the
 * page's most prominent action.
 */
function AddTaskTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add task"
      className="focus-ring surface-brand surface-brand-hover inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985] md:px-3"
    >
      <Plus size={14} weight="bold" />
      <span className="max-md:hidden">Add task</span>
    </button>
  );
}
