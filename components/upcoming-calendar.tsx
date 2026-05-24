"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  addMonths,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CaretLeft, CaretRight, Flag } from "@/components/icons";
import { SectionCount } from "@/components/section-count";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/queries";

interface CalendarProps {
  tasks: TaskWithRelations[];
}

const PRIORITY_DOT: Record<number, string> = {
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-muted-foreground/60",
};

/**
 * Month grid with task chips per day. Click a day to focus its list at
 * the bottom. Click a chip to open the task drawer (via ?task=...).
 *
 * The header has prev/next month buttons plus a Today button that snaps
 * to the current date. Selected day defaults to today on mount.
 */
export function UpcomingCalendar({ tasks }: CalendarProps) {
  const pathname = usePathname();
  const params = useSearchParams();

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date>(() => new Date());

  // Bucket tasks by ISO day so the grid render is O(days), not O(tasks*days)
  const tasksByDay = useMemo(() => {
    const map = new Map<string, TaskWithRelations[]>();
    for (const t of tasks) {
      if (!t.due_at) continue;
      const key = format(new Date(t.due_at), "yyyy-MM-dd");
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [tasks]);

  const days = useMemo(() => {
    // 6 rows x 7 cols starting from the Monday before the 1st of the month
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first, { weekStartsOn: 1 });
    const all: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(d.getDate() + i);
      all.push(d);
    }
    return all;
  }, [cursor]);

  const selectedKey = format(selected, "yyyy-MM-dd");
  const selectedTasks = tasksByDay.get(selectedKey) ?? [];

  const taskHref = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("task", id);
    return `${pathname}?${next.toString()}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft-xs">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((d) => subMonths(d, 1))}
            aria-label="Previous month"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((d) => addMonths(d, 1))}
            aria-label="Next month"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
        <h3 className="text-[14px] font-semibold tracking-tight text-foreground">
          {format(cursor, "MMMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setCursor(startOfMonth(now));
            setSelected(now);
          }}
          className="focus-ring rounded-md px-2 py-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          Today
        </button>
      </header>

      {/* Weekday strip */}
      <div className="grid grid-cols-7 border-b border-border/60 px-1 pt-1.5 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2">
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-border/40">
        {days.map((d) => {
          const inMonth = isSameMonth(d, cursor);
          const isSel = isSameDay(d, selected);
          const today = isToday(d);
          const dayTasks =
            tasksByDay.get(format(d, "yyyy-MM-dd")) ?? [];
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                "focus-ring relative flex h-[88px] flex-col gap-1 bg-card p-1.5 text-left text-[11px] transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/30",
                isSel && "bg-primary/8",
                !inMonth && "text-muted-foreground/50"
              )}
              aria-pressed={isSel}
            >
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center self-start rounded-full px-1.5 text-[11px] tabular-nums",
                  today
                    ? "bg-primary text-primary-foreground font-semibold"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted-foreground/50"
                )}
              >
                {format(d, "d")}
              </span>
              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {dayTasks.slice(0, 2).map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center gap-1 rounded px-1 py-0.5 text-[10.5px] leading-tight",
                      "bg-foreground/[0.045] text-foreground/80"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block size-1.5 shrink-0 rounded-full",
                        PRIORITY_DOT[t.priority as 1 | 2 | 3 | 4]
                      )}
                    />
                    <span className="truncate">{t.title}</span>
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <span className="px-1 text-[10px] text-muted-foreground/80">
                    +{dayTasks.length - 2} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected-day list */}
      <div className="border-t border-border/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <h4 className="text-[13px] font-semibold tracking-tight text-foreground">
            {isToday(selected) ? "Today" : format(selected, "EEEE, d MMM")}
          </h4>
          <SectionCount n={selectedTasks.length} />
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {selectedTasks.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-3 text-center text-[12.5px] text-muted-foreground/70"
              >
                Nothing scheduled.
              </motion.p>
            ) : (
              selectedTasks.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{
                    type: "spring",
                    duration: 0.3,
                    bounce: 0.15,
                  }}
                >
                  <Link
                    href={taskHref(t.id)}
                    scroll={false}
                    className="focus-ring flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent/40"
                  >
                    <Flag
                      size={11}
                      weight={t.priority < 4 ? "fill" : "regular"}
                      className={cn(
                        "shrink-0",
                        t.priority === 1 && "text-rose-600",
                        t.priority === 2 && "text-amber-600",
                        t.priority === 3 && "text-emerald-600",
                        t.priority === 4 && "text-muted-foreground/70"
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                      {t.title}
                    </span>
                    {t.project && (
                      <span className="shrink-0 text-[11.5px] text-muted-foreground">
                        {t.project.name}
                      </span>
                    )}
                  </Link>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
