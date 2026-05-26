"use client";

import { useMemo } from "react";
import { format, isSameDay } from "date-fns";
import { TaskRow } from "@/components/task-row";
import { TaskCardGroup } from "@/components/task-card-group";
import type { TaskWithRelations } from "@/lib/queries";

/**
 * Horizontal seven-column view for /upcoming. Each column is a
 * <TaskCardGroup> — the same shared card-of-cards chrome we use on
 * the project page — so the visual matches one-to-one regardless of
 * which surface you're on. Tasks inside render with their own card
 * chrome (TaskRow default mode) so a day column reads as a soft-gray
 * outer card containing white inner task cards.
 */
export function UpcomingSevenDays({
  tasks,
}: {
  tasks: TaskWithRelations[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const columns = useMemo(() => {
    const buckets: { date: Date; tasks: TaskWithRelations[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      buckets.push({ date: d, tasks: [] });
    }
    for (const t of tasks) {
      if (!t.due_at) continue;
      const due = new Date(t.due_at);
      const slot = buckets.find((b) => isSameDay(b.date, due));
      if (slot) slot.tasks.push(t);
    }
    return buckets;
  }, [today, tasks]);

  // One clean horizontal strip that scrolls, matching the projects
  // board. The previous flex-wrap packed the seven fixed-width columns
  // into an uneven multi-row grid (3 + 3 + 1) that read as broken.
  return (
    <div className="-mx-8 overflow-x-auto px-8 pb-2">
      <div className="flex min-w-max items-start gap-5">
        {columns.map((col) => (
          <DayColumn
            key={col.date.toISOString()}
            date={col.date}
            tasks={col.tasks}
            isToday={isSameDay(col.date, today)}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  tasks,
  isToday,
}: {
  date: Date;
  tasks: TaskWithRelations[];
  isToday: boolean;
}) {
  const tomorrow = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const isTomorrow = isSameDay(date, tomorrow);

  const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : format(date, "EEEE");
  const subtitle = isToday || isTomorrow ? format(date, "EEEE") : format(date, "d MMM");

  return (
    <TaskCardGroup title={label} subtitle={subtitle} count={tasks.length} width="320px">
      {tasks.length === 0 ? (
        <p className="px-2 py-2 text-[12px] text-muted-foreground/80">
          Nothing scheduled.
        </p>
      ) : (
        tasks.map((t) => <TaskRow key={t.id} task={t} compact />)
      )}
    </TaskCardGroup>
  );
}
