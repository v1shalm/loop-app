import { cn } from "@/lib/utils";

export interface MetricItem {
  label: string;
  value: number | string;
  /** Optional tinted value text — for highlighting success metrics. */
  tone?: "default" | "emerald" | "amber" | "rose" | "primary";
}

/**
 * Compact inline metric row. Replaces the boxy "icon-in-square + giant
 * number + label" stat-card grid that read as templated AI output.
 *
 * Each metric renders as a tight pair: a bold tabular-nums number and a
 * muted single-word label, separated from siblings by a hairline dot.
 * Optional progress bar floats to the right edge. No card wrapper, no
 * shadow — just a typographic strip that lives flat in the page rhythm.
 */
export function MetricStrip({
  metrics,
  progress,
  className,
}: {
  metrics: MetricItem[];
  /** Optional 0–1 ratio. Renders a thin bar + percent on the right. */
  progress?: { ratio: number; label?: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-5 gap-y-2 text-[13px]",
        className
      )}
    >
      {metrics.map((m, i) => (
        <div key={m.label} className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-[17px] font-semibold tabular-nums leading-none tracking-tight",
              m.tone === "emerald" &&
                "text-emerald-600 dark:text-emerald-300",
              m.tone === "amber" &&
                "text-amber-600 dark:text-amber-300",
              m.tone === "rose" && "text-rose-600 dark:text-rose-300",
              m.tone === "primary" && "text-primary",
              (!m.tone || m.tone === "default") && "text-foreground"
            )}
          >
            {m.value}
          </span>
          <span className="text-[12.5px] text-muted-foreground">
            {m.label}
          </span>
          {i < metrics.length - 1 && (
            <span
              aria-hidden
              className="ml-3 text-muted-foreground/40"
            >
              ·
            </span>
          )}
        </div>
      ))}
      {progress && (
        <div className="ml-auto flex items-center gap-2.5">
          <div className="h-[5px] w-28 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-[var(--ease-out)]"
              style={{
                width: `${Math.round(
                  Math.min(1, Math.max(0, progress.ratio)) * 100
                )}%`,
              }}
            />
          </div>
          <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground">
            {progress.label ??
              `${Math.round(progress.ratio * 100)}%`}
          </span>
        </div>
      )}
    </div>
  );
}
