"use client";

import { useEffect, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { sileo } from "sileo";
import { DotsSixVertical } from "@/components/icons";
import { TaskRow } from "@/components/task-row";
import { reorderTasks } from "@/lib/actions";
import { cn } from "@/lib/utils";
import type { TaskWithRelations } from "@/lib/queries";

/**
 * Sortable wrapper around a list of TaskRows.
 *
 * Wraps tasks in @dnd-kit's DndContext + SortableContext, hands a grip
 * handle to each row via TaskRow's `dragHandle` slot, and persists the
 * new order via `reorderTasks`. We render optimistically — the list
 * resequences instantly on drop, then the server action lands; on
 * failure we revert and toast the error.
 */
export function SortableTaskList({ tasks }: { tasks: TaskWithRelations[] }) {
  // Local mirror so the optimistic reorder can land before the server
  // round-trip. We re-sync when the server-provided order changes
  // (e.g. after a route revalidation triggers fresh data).
  const [ordered, setOrdered] = useState(tasks);
  useEffect(() => setOrdered(tasks), [tasks]);

  const [, startTransition] = useTransition();

  const sensors = useSensors(
    // 6px activation distance prevents accidental drags when the user is
    // really just clicking the checkbox or another control inside the row.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = ordered.findIndex((t) => t.id === active.id);
    const newIndex = ordered.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(ordered, oldIndex, newIndex);
    const previous = ordered;
    setOrdered(next);

    startTransition(async () => {
      const res = await reorderTasks(next.map((t) => t.id));
      if (res.error) {
        setOrdered(previous);
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
      <SortableContext
        items={ordered.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        {ordered.map((t) => (
          <SortableTaskItem key={t.id} task={t} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskItem({ task }: { task: TaskWithRelations }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  // Grip lives in its own column to the LEFT of the card, never inside.
  // Reveals on hover of the whole row; stays visible while the row is
  // being dragged. The card itself keeps every pixel of its content
  // surface for actual data.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/draggable relative flex items-start gap-1",
        isDragging && "z-10 opacity-95 [&_article]:shadow-soft-md"
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
        className={cn(
          "focus-ring mt-4 grid size-5 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/45 transition-[opacity,color,background-color] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:cursor-grabbing",
          "opacity-0 group-hover/draggable:opacity-100 focus-visible:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
      >
        <DotsSixVertical size={14} weight="bold" />
      </button>
      <div className="min-w-0 flex-1">
        <TaskRow task={task} />
      </div>
    </div>
  );
}
