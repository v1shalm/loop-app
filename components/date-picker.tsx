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
    <div className={cn("w-[280px] p-2", className)}>
      {/* Quick chips */}
      <div className="mb-2 flex flex-wrap gap-1">
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
                "focus-ring rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
                active
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:bg-accent"
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
            className="focus-ring ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X size={11} weight="bold" />
            Clear
          </button>
        )}
      </div>

      {/* Month nav */}
      <div className="mb-1 flex items-center justify-between px-1.5">
        <button
          onClick={() => setView((v) => subMonths(v, 1))}
          aria-label="Previous month"
          className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CaretLeft size={13} weight="bold" />
        </button>
        <span className="text-[13px] font-semibold tracking-tight text-foreground">
          {format(view, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setView((v) => addMonths(v, 1))}
          aria-label="Next month"
          className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <CaretRight size={13} weight="bold" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="grid h-6 place-items-center text-[10.5px] font-medium text-muted-foreground/70"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const inMonth = isSameMonth(d, view);
          const isSel = value && isSameDay(d, value);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              onClick={() => select(d)}
              className={cn(
                "focus-ring grid h-7 place-items-center rounded-md text-[12px] tabular-nums transition-colors",
                !inMonth && "text-muted-foreground/40",
                inMonth && !isSel && "text-foreground hover:bg-accent",
                isSel && "bg-primary text-primary-foreground font-semibold",
                !isSel && today && "ring-1 ring-inset ring-primary/50 text-primary"
              )}
            >
              {format(d, "d")}
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
