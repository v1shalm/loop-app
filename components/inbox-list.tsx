"use client";

import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { RelativeTime } from "@/components/relative-time";
import { sileo } from "sileo";
import {
  ArrowUp,
  CaretDown,
  Check,
  ChatCircle,
  Clock,
  Flag,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { addComment, snoozeTask, triageTask } from "@/lib/actions";
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

export function InboxList({ tasks }: { tasks: TaskWithRelations[] }) {
  const [filter, setFilter] = useState<Filter>("all");

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
    switch (filter) {
      case "unread":
        return tasks.filter((t) => !t.triaged_at);
      case "high":
        return tasks.filter((t) => t.priority <= 2);
      case "snoozed":
        return tasks.filter(
          (t) => t.triaged_at && t.due_at && new Date(t.due_at) > new Date()
        );
      default:
        return tasks;
    }
  }, [tasks, filter]);

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
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-card/40 px-4 py-10 text-center text-[13px] text-muted-foreground">
          Nothing matches this filter.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {visible.map((t) => (
              <motion.li
                key={t.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
              >
                <InboxItem task={t} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
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
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
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
