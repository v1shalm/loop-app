"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CaretLeft, CaretRight, X } from "@/components/icons";
import { cn } from "@/lib/utils";

function endOfDayAt6pm(d: Date) {
  const x = new Date(d);
  x.setHours(18, 0, 0, 0);
  return x;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface DatePickerProps {
  value: Date | null;
  onChange: (next: Date | null) => void;
  className?: string;
}

/**
 * Custom calendar picker — month grid + quick chips. Used by Quick Add,
 * the task drawer, and the inline date cell on TaskRow. Auto-anchors the
 * time component to 6pm for new selections so "Today" feels like end-of-day.
 */
export function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [view, setView] = useState<Date>(value ?? new Date());

  const start = startOfMonth(view);
  const end = endOfMonth(view);
  const gridStart = startOfWeek(start);
  const gridEnd = endOfWeek(end);

  const days = useMemo(() => {
    const out: Date[] = [];
    let cur = gridStart;
    while (cur <= gridEnd) {
      out.push(cur);
      cur = addDays(cur, 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const select = (d: Date) => {
    onChange(endOfDayAt6pm(d));
  };

  const chips: { label: string; build: () => Date | null }[] = [
    { label: "Today", build: () => endOfDayAt6pm(new Date()) },
    { label: "Tomorrow", build: () => endOfDayAt6pm(addDays(new Date(), 1)) },
    { label: "Next week", build: () => endOfDayAt6pm(addDays(new Date(), 7)) },
  ];

  return (
    <div className={cn("w-[316px] p-3.5", className)}>
      {/* Quick chips */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {chips.map((c) => {
          const built = c.build();
          const active = built && value && isSameDay(built, value);
          return (
            <button
              key={c.label}
              onClick={() => {
                const d = c.build();
                if (d) {
                  setView(d);
                  onChange(d);
                }
              }}
              className={cn(
                "focus-ring rounded-full border px-3 py-1.5 text-[12px] font-medium transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.97]",
                active
                  ? "border-primary/60 bg-primary/12 text-primary"
                  : "border-border bg-card text-foreground hover:border-border/80 hover:bg-accent/50"
              )}
            >
              {c.label}
            </button>
          );
        })}
        {value && (
          <button
            onClick={() => onChange(null)}
            aria-label="Clear date"
            className="focus-ring ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <X size={12} weight="bold" />
            Clear
          </button>
        )}
      </div>

      {/* Hairline between quick-pick row and the calendar so the eye knows
          where the structural sections divide without the chips and grid
          feeling glued together. */}
      <div className="mb-2 h-px bg-border/60" />

      {/* Month nav */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setView((v) => subMonths(v, 1))}
          aria-label="Previous month"
          className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
        >
          <CaretLeft size={14} weight="bold" />
        </button>
        <span className="text-[13.5px] font-semibold tracking-tight text-foreground">
          {format(view, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setView((v) => addMonths(v, 1))}
          aria-label="Next month"
          className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
        >
          <CaretRight size={14} weight="bold" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="grid h-7 place-items-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const inMonth = isSameMonth(d, view);
          const isSel = value && isSameDay(d, value);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => select(d)}
              aria-pressed={isSel ? true : undefined}
              className={cn(
                "focus-ring relative grid size-9 place-items-center rounded-lg text-[13px] tabular-nums transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.94]",
                !inMonth && "text-muted-foreground/35",
                inMonth && !isSel && "text-foreground hover:bg-accent/50",
                isSel &&
                  "bg-primary font-semibold text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/0.08),inset_0_1px_0_oklch(1_0_0/0.18)]",
                !isSel && today && "font-semibold text-primary"
              )}
            >
              {format(d, "d")}
              {/* "Today" dot — sits below the number when the day isn't the
                  selected one. Lighter than a ring, easier to read against
                  the colored cells. */}
              {!isSel && today && (
                <span
                  aria-hidden
                  className="absolute bottom-1 size-1 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function formatDueShort(due: Date | null): string {
  if (!due) return "Date";
  if (isToday(due)) return "Today";
  if (isSameDay(due, addDays(new Date(), 1))) return "Tomorrow";
  return format(due, "MMM d");
}
