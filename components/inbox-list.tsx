"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
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
import { RelativeTime } from "@/components/relative-time";
import { sileo } from "sileo";
import {
  ArrowUp,
  CaretDown,
  Check,
  ChatCircle,
  Clock,
  DotsSixVertical,
  Flag,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import {
  addComment,
  deleteSavedView,
  reorderTasks,
  saveView,
  snoozeTask,
  triageTask,
  type SavedView,
} from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type { TaskWithRelations } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { ProjectDot } from "@/components/project-dot";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Filter = "all" | "unread" | "high" | "snoozed";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "high", label: "High priority" },
  { id: "snoozed", label: "Snoozed" },
];

const priorityClass: Record<number, string> = {
  1: "text-priority-1",
  2: "text-priority-2",
  3: "text-priority-3",
  4: "text-priority-4",
};

export function InboxList({
  tasks,
  savedViews: initialViews = [],
}: {
  tasks: TaskWithRelations[];
  savedViews?: SavedView[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [views, setViews] = useState<SavedView[]>(initialViews);

  const projects = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const t of tasks) {
      if (t.project && !seen.has(t.project.id)) {
        seen.set(t.project.id, { id: t.project.id, name: t.project.name });
      }
    }
    return [...seen.values()];
  }, [tasks]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      unread: tasks.filter((t) => !t.triaged_at).length,
      high: tasks.filter((t) => t.priority <= 2).length,
      snoozed: tasks.filter(
        (t) => t.triaged_at && t.due_at && new Date(t.due_at) > new Date()
      ).length,
    }),
    [tasks]
  );

  const visible = useMemo(() => {
    let out = tasks;
    if (projectFilter) {
      out = out.filter((t) => t.project?.id === projectFilter);
    }
    switch (filter) {
      case "unread":
        return out.filter((t) => !t.triaged_at);
      case "high":
        return out.filter((t) => t.priority <= 2);
      case "snoozed":
        return out.filter(
          (t) => t.triaged_at && t.due_at && new Date(t.due_at) > new Date()
        );
      default:
        return out;
    }
  }, [tasks, filter, projectFilter]);

  const applyView = (v: SavedView) => {
    const cfg = (v.config ?? {}) as {
      filter?: Filter;
      projectId?: string | null;
    };
    if (
      cfg.filter === "all" ||
      cfg.filter === "unread" ||
      cfg.filter === "high" ||
      cfg.filter === "snoozed"
    ) {
      setFilter(cfg.filter);
    }
    setProjectFilter(cfg.projectId ?? null);
  };

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const count = counts[f.id];
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "border-primary/60 bg-primary/8 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums",
                  active ? "text-primary" : "text-muted-foreground/70"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Project filter — only when the inbox spans more than one
            project. Otherwise the option is meaningless. */}
        {projects.length > 1 && (
          <ProjectFilterChip
            value={projectFilter}
            projects={projects}
            onChange={setProjectFilter}
          />
        )}

        {/* Saved views — Linear-style. The action also captures the
            project filter so saving a view is a real time-saver. */}
        <SavedViewsChip
          views={views}
          onPick={applyView}
          onSave={async (name) => {
            const res = await saveView({
              scope: "inbox",
              name,
              config: { filter, projectId: projectFilter },
            });
            if (res.error) {
              sileo.error({ title: res.error });
              return;
            }
            if (res.view) setViews((v) => [...v, res.view!]);
          }}
          onDelete={async (id) => {
            const res = await deleteSavedView(id);
            if (res.error) {
              sileo.error({ title: res.error });
              return;
            }
            setViews((v) => v.filter((x) => x.id !== id));
          }}
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-10 text-center text-[13px] text-muted-foreground">
          Nothing matches this filter.
        </p>
      ) : (
        <SortableInbox tasks={visible} />
      )}
    </div>
  );
}

/**
 * Wraps the filtered inbox list in a dnd-kit context so users can drag
 * cards into a new order. Uses the same reorderTasks action as the rest
 * of the app, so a drag in the inbox sticks across views.
 *
 * We keep AnimatePresence on the sortable items so accept/snooze still
 * fades them out — the wrapper div carries dnd-kit's transform, while
 * the motion.div inside carries opacity/y on enter/exit. Both animate
 * different properties so they don't fight.
 */
function SortableInbox({ tasks }: { tasks: TaskWithRelations[] }) {
  const [ordered, setOrdered] = useState(tasks);
  useEffect(() => setOrdered(tasks), [tasks]);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
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
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {ordered.map((t) => (
              <SortableInboxItem key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableInboxItem({ task }: { task: TaskWithRelations }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Grip column lives outside the card so the card's content surface
  // stays clean — matches Todoist's pattern.
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10")}
    >
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
        className="group/draggable flex items-start gap-1"
      >
        <button
          type="button"
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          {...attributes}
          {...listeners}
          className={cn(
            "focus-ring mt-5 grid size-5 shrink-0 cursor-grab place-items-center rounded text-muted-foreground/45 transition-[opacity,color,background-color] duration-150 ease-[var(--ease-out)] hover:bg-accent/50 hover:text-foreground active:cursor-grabbing",
            "opacity-0 group-hover/draggable:opacity-100 focus-visible:opacity-100",
            isDragging && "cursor-grabbing opacity-100"
          )}
        >
          <DotsSixVertical size={14} weight="bold" />
        </button>
        <div className="min-w-0 flex-1">
          <InboxItem task={task} />
        </div>
      </motion.div>
    </li>
  );
}

function InboxItem({ task }: { task: TaskWithRelations }) {
  const [pending, startTransition] = useTransition();
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");

  const dueLabel = task.due_at
    ? format(new Date(task.due_at), "EEE, d MMM")
    : null;
  const snoozedUntil =
    task.triaged_at && task.due_at && new Date(task.due_at) > new Date()
      ? new Date(task.due_at)
      : null;

  const accept = () => {
    if (pending) return;
    playSound("added");
    startTransition(async () => {
      const res = await triageTask(task.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.success({ title: "Task accepted" });
    });
  };

  const snooze = (until?: Date) => {
    if (pending) return;
    const wake = until ?? defaultSnoozeUntil();
    startTransition(async () => {
      const res = await snoozeTask(task.id, wake.toISOString());
      if (res.error) sileo.error({ title: res.error });
      else
        sileo.info({
          title: `Snoozed until ${formatWake(wake)}`,
        });
    });
  };

  const sendReply = () => {
    const text = reply.trim();
    if (!text || pending) return;
    startTransition(async () => {
      const res = await addComment(task.id, text);
      if (res.error) {
        sileo.error({ title: res.error });
        return;
      }
      setReply("");
      setReplyOpen(false);
      sileo.success({
        title: "Reply sent",
        description: `${task.author?.name?.split(/\s+/)[0] ?? "They"}'ll see it on the task`,
      });
    });
  };

  return (
    <article className="rounded-xl border border-border/60 bg-card p-4 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-sm">
      <div className="flex items-start gap-3">
        {task.author && (
          <span className="mt-0.5" title={task.author.name}>
            <Avatar
              src={task.author.avatar_url}
              initials={task.author.initials}
              color={task.author.avatar_color}
              size={32}
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11.5px] text-muted-foreground">
            <span className="font-medium text-foreground">
              {task.author?.name ?? "Someone"}
            </span>{" "}
            sent you · <RelativeTime date={task.created_at} />
          </p>
          <p className="mt-1 text-[14px] font-medium leading-snug text-foreground">
            {task.title}
          </p>
          {task.description && (
            <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
              {task.description}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
            {task.project && (
              <span className="inline-flex items-center gap-1.5">
                <ProjectDot project={task.project} size={7} />
                <span>{task.project.name}</span>
              </span>
            )}
            {dueLabel && !snoozedUntil && (
              <span className="inline-flex items-center gap-1">
                <Clock size={12} />
                {dueLabel}
              </span>
            )}
            {task.priority < 4 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  priorityClass[task.priority]
                )}
              >
                <Flag size={12} weight="fill" />P{task.priority}
              </span>
            )}
            {snoozedUntil && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                <Clock size={11} weight="fill" />
                Back {formatWake(snoozedUntil)}
              </span>
            )}
          </div>

          {/* Inline reply composer */}
          {replyOpen && (
            <div className="mt-3 rounded-lg border border-border/60 bg-background focus-within:border-ring/40">
              <textarea
                autoFocus
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sendReply();
                  }
                  if (e.key === "Escape") {
                    setReplyOpen(false);
                    setReply("");
                  }
                }}
                rows={2}
                placeholder={`Ask ${task.author?.name?.split(/\s+/)[0] ?? "them"} a question...`}
                className="w-full resize-none rounded-t-lg bg-transparent px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-2">
                <span className="text-[11px] text-muted-foreground/70">
                  Posts as a comment on this task
                </span>
                <Button
                  onClick={sendReply}
                  disabled={!reply.trim() || pending}
                  size="icon-sm"
                  variant="default"
                  aria-label="Send reply"
                  className="rounded-full"
                >
                  <ArrowUp size={13} weight="bold" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          onClick={() => setReplyOpen((v) => !v)}
          disabled={pending}
          className={cn(
            "focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors disabled:opacity-50",
            replyOpen
              ? "bg-accent/50 text-foreground"
              : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
          )}
        >
          <ChatCircle size={13} />
          {replyOpen ? "Cancel reply" : "Reply"}
        </button>

        <div className="flex items-center gap-2">
          <SnoozeButton onSnooze={snooze} pending={pending} />
          <button
            onClick={accept}
            disabled={pending}
            className="focus-ring surface-brand surface-brand-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50"
          >
            <Check size={13} weight="bold" />
            Accept
          </button>
        </div>
      </div>
    </article>
  );
}

function SnoozeButton({
  onSnooze,
  pending,
}: {
  onSnooze: (until?: Date) => void;
  pending: boolean;
}) {
  const tomorrow9 = new Date();
  tomorrow9.setDate(tomorrow9.getDate() + 1);
  tomorrow9.setHours(9, 0, 0, 0);

  const friday = nextWeekday(5, 9); // Friday 9am
  const nextMonday = nextWeekday(1, 9);
  const inAWeek = new Date();
  inAWeek.setDate(inAWeek.getDate() + 7);

  return (
    <Popover>
      <PopoverTrigger
        disabled={pending}
        className="focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
      >
        <Clock size={13} />
        Snooze
        <CaretDown size={10} weight="bold" className="opacity-70" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[200px] gap-0 p-1" sideOffset={4}>
        <SnoozeRow
          label="Tomorrow"
          when={`9:00 AM, ${format(tomorrow9, "EEE")}`}
          onClick={() => onSnooze(tomorrow9)}
        />
        {nextMonday.getTime() !== tomorrow9.getTime() && (
          <SnoozeRow
            label="Next Monday"
            when={`9:00 AM, ${format(nextMonday, "d MMM")}`}
            onClick={() => onSnooze(nextMonday)}
          />
        )}
        {friday.getTime() !== tomorrow9.getTime() && (
          <SnoozeRow
            label="Friday"
            when={`9:00 AM, ${format(friday, "d MMM")}`}
            onClick={() => onSnooze(friday)}
          />
        )}
        <SnoozeRow
          label="In a week"
          when={format(inAWeek, "EEE, d MMM")}
          onClick={() => onSnooze(inAWeek)}
        />
      </PopoverContent>
    </Popover>
  );
}

function SnoozeRow({
  label,
  when,
  onClick,
}: {
  label: string;
  when: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
    >
      <span className="text-[13px] text-foreground">{label}</span>
      <span className="text-[11px] tabular-nums text-muted-foreground">
        {when}
      </span>
    </button>
  );
}

function defaultSnoozeUntil(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function formatWake(d: Date): string {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate() + 1;
  if (sameDay) return `Tomorrow ${format(d, "h:mm a")}`;
  return format(d, "EEE, d MMM");
}

/** Next occurrence of `targetDay` (0=Sun..6=Sat) at hour:00. */
function nextWeekday(targetDay: number, hour: number): Date {
  const d = new Date();
  const diff = (targetDay - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// ── Project filter chip ────────────────────────────────────────────────────

function ProjectFilterChip({
  value,
  projects,
  onChange,
}: {
  value: string | null;
  projects: { id: string; name: string }[];
  onChange: (id: string | null) => void;
}) {
  const active = projects.find((p) => p.id === value);
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors",
          value
            ? "border-primary/60 bg-primary/8 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        )}
      >
        {active ? active.name : "All projects"}
        <CaretDown size={10} weight="bold" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] gap-0 p-1">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/40",
            value === null && "bg-accent/40 font-medium"
          )}
        >
          <span className="inline-block size-2 rounded-full border border-dashed border-muted-foreground/60" />
          All projects
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onChange(p.id)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/40",
              value === p.id && "bg-accent/40 font-medium"
            )}
          >
            <span className="inline-block size-2 rounded-full bg-foreground/30" />
            <span className="truncate">{p.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Saved views chip ───────────────────────────────────────────────────────

function SavedViewsChip({
  views,
  onPick,
  onSave,
  onDelete,
}: {
  views: SavedView[];
  onPick: (v: SavedView) => void;
  onSave: (name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await onSave(trimmed);
      setName("");
      setNaming(false);
      setOpen(false);
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed border-border bg-transparent px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground">
        Saved views
        <CaretDown size={10} weight="bold" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[240px] gap-0 p-1">
        {views.length === 0 ? (
          <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
            No saved views yet.
          </p>
        ) : (
          <div className="flex flex-col">
            {views.map((v) => (
              <div
                key={v.id}
                className="group flex items-center rounded-md transition-colors hover:bg-accent/40"
              >
                <button
                  type="button"
                  onClick={() => {
                    onPick(v);
                    setOpen(false);
                  }}
                  className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-[13px]"
                >
                  <span className="truncate">{v.name}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => onDelete(v.id))
                  }
                  aria-label={`Delete saved view ${v.name}`}
                  className="focus-ring mr-1 grid size-6 place-items-center rounded text-muted-foreground/60 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="my-1 h-px bg-border/60" />

        {naming ? (
          <form onSubmit={submit} className="flex items-center gap-1 p-1">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="View name"
              maxLength={40}
              className="focus-ring h-7 flex-1 rounded-md border border-border bg-background px-2 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="focus-ring inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-[11.5px] font-semibold text-primary-foreground disabled:opacity-60"
            >
              Save
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setNaming(true)}
            className="focus-ring flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] text-primary transition-colors hover:bg-primary/8"
          >
            + Save current filter as a view
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
