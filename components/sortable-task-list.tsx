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
import { playSound } from "@/lib/sounds";
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
export function SortableTaskList({
  tasks,
  flat,
}: {
  tasks: TaskWithRelations[];
  /** Pass-through to TaskRow — drops the card chrome so rows fit
   *  inside an outer bordered container with its own dividers. */
  flat?: boolean;
}) {
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
    playSound("dropped");

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
          <SortableTaskItem key={t.id} task={t} flat={flat} />
        ))}
      </SortableContext>
    </DndContext>
  );
}

function SortableTaskItem({
  task,
  flat,
}: {
  task: TaskWithRelations;
  flat?: boolean;
}) {
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

  // Grip floats absolutely in the gutter to the LEFT of the card, so
  // the card itself stays flush with the section header's left edge.
  // Previously the grip lived in a flex column inside the same row,
  // which pushed every card 24px right and visually misaligned the
  // section headers from the task content. Now the card and the
  // section title share a column; the grip lives in the page padding.
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/draggable relative",
        // Flat mode: hairline divider between rows. The first row's
        // top border is suppressed via first:border-t-0 so it sits
        // flush with the container's own top edge.
        flat && "border-t border-border/40 first:border-t-0",
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
          "focus-ring absolute -left-7 top-4 grid size-5 cursor-grab place-items-center rounded text-muted-foreground/70 transition-[opacity,color,background-color] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:cursor-grabbing",
          // Desktop: hidden at rest, reveals on row hover or handle focus.
          // Mobile: always visible — no hover state on touch, and the
          // grip needs to be discoverable without a long-press affordance.
          "md:opacity-0 md:group-hover/draggable:opacity-100 focus-visible:opacity-100",
          isDragging && "cursor-grabbing opacity-100"
        )}
      >
        <DotsSixVertical size={14} weight="bold" />
      </button>
      <TaskRow task={task} flat={flat} />
    </div>
  );
}
