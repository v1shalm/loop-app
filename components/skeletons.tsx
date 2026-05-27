/**
 * Skeleton primitives. Used by route-level loading.tsx files so each
 * route's first paint matches the final layout (no shift when data
 * lands). Pulse animation comes from --keyframe loop-skeleton-fade in
 * globals.css; the small per-row delay creates a "wave" pulse rather
 * than every line breathing in unison.
 *
 * Why a shared file: every route's loading state shares the same row /
 * card / rail vocabulary, so centralising it keeps a single visual
 * grammar across routes and makes future tweaks one-edit.
 */

import { cn } from "@/lib/utils";

interface BarProps {
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}

/** Single soft-grey bar with a pulsing fade. */
export function SkeletonBar({ className, delay = 0, style }: BarProps) {
  return (
    <div
      className={cn("rounded-md bg-muted/60", className)}
      style={{
        animation: "loop-skeleton-fade 1.4s ease-out infinite",
        animationDelay: `${delay}ms`,
        ...style,
      }}
    />
  );
}

/** Filled circular skeleton — for avatars, project dots, the like. */
export function SkeletonCircle({
  size = 22,
  delay = 0,
  className,
}: {
  size?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("shrink-0 rounded-full bg-muted/60", className)}
      style={{
        width: size,
        height: size,
        animation: "loop-skeleton-fade 1.4s ease-out infinite",
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

/**
 * One task row in skeleton form. Mirrors the real TaskRow's footprint:
 * checkbox, title (2 lines), meta chips, right cluster (counts + avatar
 * + dots menu). Matches both `flat` and default-card modes via the
 * `flat` prop so the same primitive serves project-page inline rows
 * and standalone card lists.
 */
export function TaskRowSkeleton({
  delay = 0,
  flat,
  titleWidth = "70%",
}: {
  delay?: number;
  flat?: boolean;
  /** Pixel or percentage width for the title bar. Vary across rows so
   *  the list reads as natural copy, not identical placeholders. */
  titleWidth?: string;
}) {
  return (
    <div
      className={cn(
        flat
          ? "flex items-start gap-3 px-4 py-3"
          : "flex items-start gap-3 rounded-md border border-border/40 bg-card px-4 py-3.5 shadow-soft-sm"
      )}
    >
      <div
        className="mt-0.5 size-6 shrink-0 rounded-[6px] border border-border bg-background"
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-2">
        <SkeletonBar
          className="h-3.5"
          delay={delay}
          style={{ width: titleWidth }}
        />
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-2.5 w-12" delay={delay + 80} />
          <SkeletonBar className="h-2.5 w-16" delay={delay + 140} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 self-center">
        <SkeletonCircle size={22} delay={delay + 100} />
        <SkeletonBar className="h-5 w-5 rounded" delay={delay + 160} />
      </div>
    </div>
  );
}

/**
 * Section header skeleton: title bar + small trailing count, with the
 * thin underline rule that the real headers carry.
 */
export function SkeletonSectionHeader({
  titleWidth = "8rem",
  delay = 0,
}: {
  titleWidth?: string;
  delay?: number;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between border-b border-border/50 pb-2">
      <SkeletonBar
        className="h-4"
        delay={delay}
        style={{ width: titleWidth }}
      />
      <SkeletonBar className="h-3 w-8" delay={delay + 80} />
    </div>
  );
}

/**
 * Topbar placeholder — matches the 56px PageHeader's slot: icon,
 * vertical divider, title bar. Replaces the live PageHeader during
 * route transitions when only the children swap and the layout chrome
 * (sidebar, page header position) stays put.
 */
export function SkeletonPageHeader() {
  return (
    <div className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/70 bg-background px-5">
      <SkeletonBar className="size-7 rounded-md" />
      <SkeletonBar className="h-5 w-32" delay={60} />
    </div>
  );
}

/**
 * Right-rail skeleton. Two stacked cards: stats summary and recent
 * activity. Sized to the 300px column the real RightRail uses. Hidden
 * below lg: the real rail also stacks below the main content on narrow
 * screens.
 */
export function SkeletonRightRail() {
  return (
    <aside className="hidden flex-col gap-4 lg:flex">
      {/* Stats card */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <SkeletonBar className="mb-3 h-3 w-20" />
        <div className="flex items-end gap-4">
          <div>
            <SkeletonBar className="h-7 w-10" delay={60} />
            <SkeletonBar className="mt-1.5 h-2.5 w-14" delay={120} />
          </div>
          <div>
            <SkeletonBar className="h-7 w-10" delay={100} />
            <SkeletonBar className="mt-1.5 h-2.5 w-14" delay={160} />
          </div>
        </div>
      </div>

      {/* Activity card */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <SkeletonBar className="mb-3 h-3 w-20" delay={140} />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-2.5">
              <SkeletonCircle size={20} delay={i * 70 + 160} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkeletonBar className="h-2.5 w-3/4" delay={i * 70 + 220} />
                <SkeletonBar className="h-2 w-12" delay={i * 70 + 280} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

/**
 * Single day card for the /upcoming vertical agenda. Full-width gray
 * outer card (matching TaskCardGroup chrome) with a title + subtitle
 * header, then a few stacked white task rows — or a slim "nothing
 * scheduled" bar when the day is empty. Mirrors UpcomingSevenDays so
 * the canvas doesn't reflow when real data arrives.
 */
export function SkeletonDayRow({
  delay = 0,
  rows = 2,
}: {
  delay?: number;
  rows?: number;
}) {
  return (
    <div className="rounded-xl bg-slate-100/70 px-1.5 pt-3 pb-1.5 ring-1 ring-inset ring-slate-200/60 dark:bg-[oklch(0.205_0.005_250)] dark:ring-[oklch(0.27_0.006_250)]">
      <div className="mb-3 flex items-center gap-2 px-1">
        <SkeletonBar className="h-4 w-20" delay={delay} />
        <SkeletonBar className="h-3 w-12" delay={delay + 60} />
        <SkeletonBar className="ml-auto size-5 rounded-md" delay={delay + 120} />
      </div>
      {rows > 0 ? (
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: rows }).map((_, i) => (
            <TaskRowSkeleton key={i} delay={delay + i * 100} />
          ))}
        </div>
      ) : (
        <SkeletonBar className="mx-1 mb-2 h-3 w-28" delay={delay + 80} />
      )}
    </div>
  );
}

/**
 * Project column for the /projects index — wider card, multiple
 * stacked task rows. Subtitle bar mimics the project description.
 */
export function SkeletonProjectColumn({
  delay = 0,
  rows = 4,
}: {
  delay?: number;
  rows?: number;
}) {
  return (
    <div className="w-[340px] shrink-0 rounded-2xl bg-card/70 p-3">
      <div className="mb-3 flex items-center gap-2 px-1">
        <SkeletonCircle size={20} delay={delay} />
        <SkeletonBar className="h-4 w-24" delay={delay + 60} />
        <SkeletonBar className="ml-auto h-3 w-8" delay={delay + 120} />
      </div>
      <div className="flex flex-col gap-1.5">
        {Array.from({ length: rows }).map((_, i) => (
          <TaskRowSkeleton key={i} delay={delay + i * 100} />
        ))}
      </div>
    </div>
  );
}
