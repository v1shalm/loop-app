"use client";

import { Plus } from "@/components/icons";
import { NotificationsPopover } from "@/components/notifications-popover";
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
        <h1 className="truncate text-[15.5px] font-semibold tracking-[-0.005em] leading-[1.1] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <>
            <span
              aria-hidden
              className="h-4 w-px shrink-0 bg-border"
            />
            <span className="truncate text-[12.5px] leading-[1.1] text-muted-foreground">
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
            {/* Notifications: on desktop, the bell lives in the sidebar
                header next to the collapse icon. On mobile the sidebar
                is hidden, so the bell stays here and degrades to the
                MobileSheet branch the component renders for touch. */}
            <div className="md:hidden">
              <NotificationsPopover currentUserId={controls.currentUserId} />
            </div>
          </>
        )}
      </div>
    </header>
  );
}

/**
 * Desktop-only Add task CTA. The sidebar used to own the brand
 * pink button at the bottom of the rail; it now lives here so the
 * primary affordance sits next to the page context the user is
 * actually looking at. Mobile keeps the FAB. Uses the full
 * --shadow-cta recipe so it reads as the page's most prominent
 * action rather than a soft secondary button.
 */
function AddTaskTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add task"
      className="focus-ring surface-brand surface-brand-hover hidden h-8 items-center gap-1.5 rounded-md px-3 text-[12.5px] font-semibold text-white shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.985] md:inline-flex"
    >
      <Plus size={13} weight="bold" />
      <span>Add task</span>
    </button>
  );
}
