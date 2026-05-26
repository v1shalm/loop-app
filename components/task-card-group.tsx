"use client";

import { DotsThree, Plus } from "@/components/icons";
import { SectionCount } from "@/components/section-count";

/**
 * Card-of-cards container: a soft muted-gray outer surface with a
 * header row (title + optional subtitle + count + inline `+` / `⋯`),
 * and the children stacked inside as their own white-card task rows.
 *
 * Used as the single source of truth for sectioned task groupings:
 * Upcoming's seven day columns, the project page's task list, any
 * other place we want the "Starter project · 2 · + · ⋯" visual the
 * design references use.
 *
 * Inner task rows render as themselves (TaskRow in its default,
 * non-flat card mode) so the call sites keep all the row's
 * interactive surfaces — checkbox, pickers, drawer launcher, dots
 * menu — intact. This component only owns the outer chrome and the
 * header.
 */
export function TaskCardGroup({
  title,
  subtitle,
  count,
  showAdd = true,
  showOverflow = true,
  onAdd,
  children,
  width,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  showAdd?: boolean;
  showOverflow?: boolean;
  onAdd?: () => void;
  children: React.ReactNode;
  /** Optional fixed width — used by Upcoming's horizontal day strip
   *  so all columns share the same dimension. Omit on full-width
   *  surfaces (project page) where the group should stretch. */
  width?: string;
}) {
  return (
    <section
      className="flex shrink-0 flex-col gap-3 rounded-xl bg-slate-100/70 px-1.5 pt-3 pb-1.5 ring-1 ring-inset ring-slate-200/60 dark:bg-[oklch(0.205_0.005_250)] dark:ring-[oklch(0.27_0.006_250)]"
      style={width ? { width } : undefined}
    >
      <header className="flex items-center gap-2 px-1">
        <h2 className="text-[14px] font-semibold tracking-tight leading-[1.1] text-foreground">
          {title}
        </h2>
        {subtitle && (
          <>
            <span
              aria-hidden
              className="h-3.5 w-px shrink-0 bg-border/70 dark:bg-border/50"
            />
            <span className="text-[12px] leading-[1.1] text-muted-foreground">
              {subtitle}
            </span>
          </>
        )}
        {typeof count === "number" && (
          <span className="ml-auto">
            <SectionCount n={count} />
          </span>
        )}
        {showAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add to ${title}`}
            className={`focus-ring grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground ${typeof count === "number" ? "" : "ml-auto"}`}
          >
            <Plus size={13} weight="bold" />
          </button>
        )}
        {showOverflow && (
          <button
            type="button"
            aria-label={`${title} actions`}
            className="focus-ring grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <DotsThree size={14} weight="bold" />
          </button>
        )}
      </header>

      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}
