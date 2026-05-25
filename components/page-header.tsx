"use client";

import { MagnifyingGlass, Plus } from "@/components/icons";
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
        <h1 className="truncate text-[15.5px] font-semibold leading-none tracking-[-0.005em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <>
            <span
              aria-hidden
              className="h-3.5 w-px shrink-0 bg-border"
            />
            <span className="truncate text-[12.5px] leading-none text-muted-foreground">
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
            <QuickAddTrigger onClick={quickAdd.open} />
            <SearchTrigger onClick={controls.openSearch} />
            <NotificationsPopover currentUserId={controls.currentUserId} />
          </>
        )}
      </div>
    </header>
  );
}

function SearchTrigger({ onClick }: { onClick: () => void }) {
  // Desktop only — mobile already has a Search tab in the bottom nav
  // (components/mobile-bottom-nav.tsx). Rendering a second search
  // trigger here would be a duplicate affordance and crowd the top bar
  // out of room for the page title.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Search"
      className="focus-ring hidden h-8 items-center gap-2 rounded-md border border-border/70 bg-card/60 px-2.5 text-left text-[12.5px] text-muted-foreground transition-[border-color,background-color,transform] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-card active:scale-[0.992] md:inline-flex md:w-[220px]"
    >
      <MagnifyingGlass size={13} className="text-muted-foreground/70" />
      <span className="flex-1 truncate">Search or jump to…</span>
    </button>
  );
}

/**
 * Desktop-only Quick Add trigger. The sidebar still owns the brand CTA
 * and mobile has the FAB; this is a second, closer-to-hand entry point
 * for users whose attention is on a list rather than the sidebar.
 * Uses the secondary CTA shadow recipe so it reads as an action
 * without competing with the sidebar's primary pink button.
 */
function QuickAddTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Quick add task"
      className="focus-ring hidden h-8 items-center gap-1.5 rounded-md border border-border/70 bg-card px-2.5 text-[12.5px] font-medium text-foreground shadow-[var(--shadow-cta-secondary)] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 active:scale-[0.985] md:inline-flex"
    >
      <Plus size={13} weight="bold" className="text-muted-foreground" />
      <span>Quick add</span>
    </button>
  );
}
