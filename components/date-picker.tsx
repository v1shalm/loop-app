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
import { sileo } from "sileo";
import { CaretLeft, CaretRight, Clock } from "@/components/icons";
import { cn } from "@/lib/utils";

function endOfDayAt6pm(d: Date) {
  const x = new Date(d);
  x.setHours(18, 0, 0, 0);
  return x;
}

// 3-letter day labels matching the reference. All caps + tracked is
// a calendar-genre convention (Apple / Google / Notion / Things all
// do it), so the project's general no-uppercase-eyebrows rule
// doesn't apply here.
const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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

  // Monday-first week to match the reference (and most calendars
  // outside North America). date-fns defaults to Sunday otherwise.
  const start = startOfMonth(view);
  const end = endOfMonth(view);
  const gridStart = startOfWeek(start, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(end, { weekStartsOn: 1 });

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

  // Inline time picker. When the user clicks "Set due time" the row
  // swaps to a native <input type="time"> so they can type or scrub a
  // value. Anchored to the current `value` so changing the time
  // doesn't reset the date.
  const [timeEditing, setTimeEditing] = useState(false);
  const currentTimeStr = value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
    : "18:00";
  const setTime = (hhmm: string) => {
    if (!value) return;
    const [h, m] = hhmm.split(":").map(Number);
    const next = new Date(value);
    next.setHours(h ?? 18, m ?? 0, 0, 0);
    onChange(next);
  };

  return (
    <div className={cn("w-[340px] p-3 max-md:w-[336px]", className)}>
      {/* Month header — title on the left, chevrons clustered on the
          right. Matches the reference layout; reads less like a paged
          nav, more like a section title with attached navigation. */}
      <div className="mb-2 flex items-center">
        <span className="text-[14px] font-semibold tracking-tight text-foreground">
          {format(view, "MMMM yyyy")}
        </span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setView((v) => subMonths(v, 1))}
            aria-label="Previous month"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
          >
            <CaretLeft size={13} weight="bold" />
          </button>
          <button
            onClick={() => setView((v) => addMonths(v, 1))}
            aria-label="Next month"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:scale-[0.94]"
          >
            <CaretRight size={13} weight="bold" />
          </button>
        </div>
      </div>

      {/* Weekday labels — 3-letter caps, calendar convention. */}
      <div className="mb-1 grid grid-cols-7">
        {WEEKDAYS.map((d, i) => (
          <div
            key={i}
            className="grid h-8 place-items-center text-[10px] font-semibold tracking-wide text-muted-foreground/70"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — circular selection state to match the reference's
          filled blue dot. Cells are 40px tall so the click target is
          generous and the grid breathes. */}
      <div className="grid grid-cols-7">
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
                "focus-ring relative grid h-10 place-items-center text-[13px] tabular-nums transition-[color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.94] max-md:h-11 max-md:text-[14px]",
                !inMonth && "text-muted-foreground/35",
                inMonth && !isSel && "text-foreground",
                !isSel && today && "font-semibold text-primary"
              )}
            >
              {/* Inner circle — sized smaller than the cell so the
                  selected pill reads as a discrete dot, not a tile.
                  Hover fills it for non-selected days; selected is
                  always filled blue. */}
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full transition-colors",
                  isSel
                    ? "bg-primary font-semibold text-primary-foreground shadow-[0_1px_2px_oklch(0_0_0/0.1)]"
                    : "group-hover:bg-accent/50 hover:bg-accent/50"
                )}
              >
                {format(d, "d")}
              </span>
              {/* "Today" marker — tiny dot tucked under the number when
                  the day isn't the selected one (the filled selection
                  already announces "now" by itself). */}
              {!isSel && today && (
                <span
                  aria-hidden
                  className="absolute bottom-[2px] size-[3px] rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Set due time — the one action row here. Recurrence lives on
          its own chip next to the date in Quick Add and the task
          drawer, so it isn't duplicated in the calendar. */}
      <div className="mt-2 flex flex-col">
        {/* Set due time. Click to reveal a native time input inline.
            Only meaningful when a date is set, so it goes muted when
            value is null. */}
        {timeEditing && value ? (
          <div className="flex items-center gap-2.5 px-1 py-2">
            <Clock size={15} className="text-muted-foreground" />
            <input
              type="time"
              value={currentTimeStr}
              onChange={(e) => setTime(e.target.value)}
              className="focus-ring h-7 flex-1 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none"
            />
            <button
              type="button"
              onClick={() => setTimeEditing(false)}
              className="focus-ring rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground"
            >
              Done
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!value) {
                sileo.info({ title: "Pick a date first" });
                return;
              }
              setTimeEditing(true);
            }}
            className="focus-ring flex w-full items-center gap-2.5 rounded-md px-1 py-2 text-left text-[13px] transition-colors hover:bg-foreground/[0.04]"
          >
            <Clock size={15} className="text-muted-foreground" />
            <span className="flex-1 text-muted-foreground">
              {value && (value.getHours() !== 18 || value.getMinutes() !== 0)
                ? `Due at ${format(value, "h:mm a")}`
                : "Set due time"}
            </span>
          </button>
        )}
      </div>

      {/* Clear all footer — hairline separated, centered text.
          Matches the reference. Clears the date (which is the only
          thing the picker carries today). */}
      <div className="-mx-3 mt-2 h-px bg-border/60" />
      <button
        type="button"
        onClick={() => {
          onChange(null);
          setTimeEditing(false);
        }}
        disabled={!value}
        className="focus-ring mt-1 flex w-full items-center justify-center rounded-md py-2 text-[12px] font-medium text-foreground transition-colors hover:bg-foreground/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Clear all
      </button>
    </div>
  );
}

export function formatDueShort(due: Date | null): string {
  if (!due) return "Date";
  if (isToday(due)) return "Today";
  if (isSameDay(due, addDays(new Date(), 1))) return "Tomorrow";
  return format(due, "MMM d");
}
