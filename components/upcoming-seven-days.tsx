"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { format, isSameDay } from "date-fns";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { sileo } from "sileo";
import { TaskRow } from "@/components/task-row";
import { TaskCardGroup } from "@/components/task-card-group";
import { useQuickAdd } from "@/components/quick-add-context";
import { updateTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/queries";

/**
 * Vertical agenda for /upcoming. The next seven days stack down the
 * page, each as a <TaskCardGroup> — soft-gray outer card with white
 * inner task cards, the same chrome the project page uses.
 *
 * Drag-to-reschedule: grab a task card anywhere and drop it on another
 * day's card to rewrite its due date (to that day, all-day). The whole
 * stack shares one DndContext so a task can travel from any day to any
 * other. We move it between buckets optimistically and persist with
 * `updateTask`, reverting on failure.
 *
 * Dragging is desktop-only; on touch the existing swipe-left gesture
 * already reschedules, and pointer DnD would fight it.
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

  // Local mirror so a drop can re-bucket instantly before the server
  // round-trip; re-sync when fresh data arrives (route revalidation).
  const [items, setItems] = useState(tasks);
  useEffect(() => setItems(tasks), [tasks]);
  const [, startTransition] = useTransition();

  const days = useMemo(() => {
    const buckets: { date: Date; tasks: TaskWithRelations[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      buckets.push({ date: d, tasks: [] });
    }
    for (const t of items) {
      if (!t.due_at) continue;
      const due = new Date(t.due_at);
      const slot = buckets.find((b) => isSameDay(b.date, due));
      if (slot) slot.tasks.push(t);
    }
    return buckets;
  }, [today, items]);

  const sensors = useSensors(
    // 6px activation distance so a grab on the grip that's really a
    // click doesn't fire a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const task = items.find((t) => t.id === active.id);
    if (!task) return;

    const targetDate = new Date(String(over.id));
    // Dropped on the day it already lives in — nothing to do.
    if (task.due_at && isSameDay(new Date(task.due_at), targetDate)) return;

    // 23:59 = the app's "all day" marker (a task with no specific time).
    const due = new Date(targetDate);
    due.setHours(23, 59, 0, 0);
    const iso = due.toISOString();

    const previous = items;
    setItems(items.map((t) => (t.id === task.id ? { ...t, due_at: iso } : t)));
    playSound("dropped");

    startTransition(async () => {
      const res = await updateTask(task.id, { dueAt: iso });
      if (res.error) {
        setItems(previous);
        sileo.error({ title: res.error });
      }
    });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4">
        {days.map((d) => (
          <DayCard
            key={d.date.toISOString()}
            date={d.date}
            tasks={d.tasks}
            isToday={isSameDay(d.date, today)}
          />
        ))}
      </div>
    </DndContext>
  );
}

function DayCard({
  date,
  tasks,
  isToday,
}: {
  date: Date;
  tasks: TaskWithRelations[];
  isToday: boolean;
}) {
  const quickAdd = useQuickAdd();
  const { setNodeRef, isOver } = useDroppable({ id: date.toISOString() });

  const tomorrow = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const isTomorrow = isSameDay(date, tomorrow);

  const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : format(date, "EEEE");
  const subtitle =
    isToday || isTomorrow ? format(date, "EEEE") : format(date, "d MMM");

  const addForDay = () => {
    const due = new Date(date);
    due.setHours(23, 59, 0, 0);
    quickAdd.open({ dueAt: due });
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-xl transition-[box-shadow,outline-color] duration-150 ease-[var(--ease-out)]",
        // Drop-target highlight while a task hovers over this day.
        isOver && "outline outline-2 outline-offset-2 outline-primary/60"
      )}
    >
      <TaskCardGroup
        title={label}
        subtitle={subtitle}
        count={tasks.length}
        onAdd={addForDay}
        showOverflow={false}
      >
        {tasks.length === 0 ? (
          <p className="px-2 py-2 text-[12px] text-muted-foreground/80">
            {isOver ? "Drop to schedule here" : "Nothing scheduled."}
          </p>
        ) : (
          tasks.map((t) => <DraggableTask key={t.id} task={t} />)
        )}
      </TaskCardGroup>
    </div>
  );
}

// The whole card is the drag handle (desktop only). dnd-kit's 6px
// activation distance lets a plain click still open the drawer; after a
// real drag we swallow the trailing synthetic click so the drawer
// doesn't pop open on drop. On touch we attach nothing — the row's own
// swipe-to-reschedule gesture owns the pointer there.
function DraggableTask({ task }: { task: TaskWithRelations }) {
  const isMobile = useIsMobile();
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  // True once a drag has actually started; checked on the trailing click
  // and reset at the start of every fresh press.
  const draggedRef = useRef(false);
  useEffect(() => {
    if (isDragging) draggedRef.current = true;
  }, [isDragging]);

  // Pointer-only: just the drag activators, no `attributes` (which would
  // add role="button"/tabIndex and clash with TaskRow's own button).
  const dragProps = isMobile ? {} : (listeners ?? {});

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...dragProps}
      onPointerDownCapture={() => {
        draggedRef.current = false;
      }}
      onClickCapture={(e) => {
        if (draggedRef.current) {
          // This click is the tail of a drag — block the drawer.
          e.preventDefault();
          e.stopPropagation();
          draggedRef.current = false;
        }
      }}
      className={cn(
        "relative md:cursor-grab md:active:cursor-grabbing",
        isDragging && "z-20 opacity-95"
      )}
    >
      <TaskRow task={task} compact />
    </div>
  );
}
