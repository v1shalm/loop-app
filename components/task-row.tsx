"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import {
  differenceInCalendarDays,
  format,
  isPast,
  isSameDay,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { DatePicker } from "@/components/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarBlank,
  ChatCircle,
  Check,
  DotsThree,
  Flag,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { deleteTask, setTaskStatus, updateTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type { TaskWithRelations } from "@/lib/queries";
import { useTeamContext } from "@/components/team-provider";
import { Avatar } from "@/components/avatar";

type Priority = 1 | 2 | 3 | 4;

const PRIORITY_LABELS: Record<Priority, string> = {
  1: "High priority",
  2: "Medium priority",
  3: "Low priority",
  4: "No priority",
};

const PRIORITY_TEXT: Record<Priority, string> = {
  1: "text-rose-600",
  2: "text-amber-600",
  3: "text-emerald-600",
  4: "text-muted-foreground",
};

const PRIORITY_FLAG: Record<Priority, string> = {
  1: "text-rose-500",
  2: "text-amber-500",
  3: "text-emerald-500",
  4: "text-muted-foreground/50",
};

export function TaskRow({ task }: { task: TaskWithRelations }) {
  const [done, setDone] = useState(task.status === "done");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { members, currentUserId } = useTeamContext();

  const [optPriority, setOptPriority] = useState<Priority>(
    task.priority as Priority
  );
  const [optDueAt, setOptDueAt] = useState<string | null>(task.due_at);
  const [optAssignee, setOptAssignee] = useState(task.assignee);
  useEffect(() => {
    setOptPriority(task.priority as Priority);
    setOptDueAt(task.due_at);
    setOptAssignee(task.assignee);
  }, [task.priority, task.due_at, task.assignee]);

  const due = optDueAt ? new Date(optDueAt) : null;
  const overdue = due ? isPast(due) && !isToday(due) && !done : false;
  const commentCount = task.comments?.[0]?.count ?? 0;
  const priority = optPriority;

  const toggle = () => {
    setDone(true);
    playSound("completed", priority);
    startTransition(async () => {
      const res = await setTaskStatus(task.id, "done");
      if (res.error) {
        sileo.error({ title: res.error });
        setDone(false);
      }
    });
  };

  const openDrawer = () => {
    const next = new URLSearchParams(params.toString());
    next.set("task", task.id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const reassign = (assigneeId: string) => {
    const target = members.find((m) => m.id === assigneeId);
    const prev = optAssignee;
    if (target) {
      setOptAssignee({
        id: target.id,
        name: target.name,
        initials: target.initials,
        avatar_color: target.avatar_color,
        avatar_url: target.avatar_url ?? null,
      });
    }
    startTransition(async () => {
      const res = await updateTask(task.id, { assigneeId });
      if (res.error) {
        sileo.error({ title: res.error });
        setOptAssignee(prev);
      } else if (target && target.id !== currentUserId) {
        sileo.success({ title: `Assigned to ${target.name}` });
      }
    });
  };

  const setPriority = (p: Priority) => {
    const prev = optPriority;
    setOptPriority(p);
    startTransition(async () => {
      const res = await updateTask(task.id, { priority: p });
      if (res.error) {
        sileo.error({ title: res.error });
        setOptPriority(prev);
      }
    });
  };

  const setDue = (d: Date | null) => {
    const prev = optDueAt;
    setOptDueAt(d ? d.toISOString() : null);
    startTransition(async () => {
      const res = await updateTask(task.id, {
        dueAt: d ? d.toISOString() : null,
      });
      if (res.error) {
        sileo.error({ title: res.error });
        setOptDueAt(prev);
      }
    });
  };

  const remove = () => {
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const dateText = formatTaskDate(due, overdue);
  const dateTone = overdue
    ? "text-rose-600"
    : due && isToday(due)
    ? "text-rose-600"
    : "text-muted-foreground";
  const dateIconTone = overdue || (due && isToday(due))
    ? "text-rose-500"
    : "text-muted-foreground/70";

  return (
    <AnimatePresence initial={false}>
      {!done && (
        <motion.article
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
          className="group rounded-xl border border-border/60 bg-card px-4 py-3 shadow-soft-xs transition-shadow duration-150 ease-[var(--ease-out)] hover:shadow-soft-sm"
        >
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={toggle}
              disabled={pending}
              aria-label={`Mark "${task.title}" complete`}
              className="focus-ring touch-expand mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-border bg-background transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-foreground/40 active:scale-95"
            >
              <Check
                size={11}
                weight="bold"
                className="text-foreground/0 transition-colors group-hover:text-muted-foreground/40"
              />
            </button>

            {/* Title + meta row */}
            <div className="min-w-0 flex-1">
              <button
                onClick={openDrawer}
                aria-label={`Open ${task.title}`}
                className="focus-ring group/title flex w-full min-w-0 items-center text-left"
              >
                <span className="truncate text-[14px] font-semibold leading-snug text-foreground decoration-foreground/40 underline-offset-2 group-hover/title:underline">
                  {task.title}
                </span>
              </button>

              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px]">
                {/* Priority — full label, clickable popover */}
                <Popover>
                  <PopoverTrigger
                    aria-label="Priority"
                    className={cn(
                      "focus-ring -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 font-medium transition-colors hover:bg-accent/40",
                      PRIORITY_TEXT[priority]
                    )}
                  >
                    <Flag
                      size={12}
                      weight={priority < 4 ? "fill" : "regular"}
                      className={PRIORITY_FLAG[priority]}
                    />
                    {PRIORITY_LABELS[priority]}
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px] gap-0 p-1" align="start">
                    {([1, 2, 3, 4] as Priority[]).map((p) => (
                      <PopoverItem
                        key={p}
                        selected={priority === p}
                        onSelect={() => setPriority(p)}
                      >
                        <Flag
                          size={13}
                          weight={p === 4 ? "regular" : "fill"}
                          className={PRIORITY_FLAG[p]}
                        />
                        <span>{PRIORITY_LABELS[p]}</span>
                      </PopoverItem>
                    ))}
                  </PopoverContent>
                </Popover>

                <Dot />

                {/* Date — clickable popover */}
                <Popover>
                  <PopoverTrigger
                    aria-label="Due date"
                    className={cn(
                      "focus-ring -mx-1 inline-flex items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-accent/40",
                      dateTone
                    )}
                  >
                    <CalendarBlank size={12} className={dateIconTone} />
                    <span className="tabular-nums">{dateText}</span>
                  </PopoverTrigger>
                  <PopoverContent className="gap-0 p-0" align="start">
                    <DatePicker value={due} onChange={setDue} />
                  </PopoverContent>
                </Popover>

                {/* Author note — only when someone else assigned this to you */}
                {task.author &&
                  task.author.id !== currentUserId &&
                  task.assignee?.id === currentUserId && (
                    <>
                      <Dot />
                      <span className="text-muted-foreground">
                        Assigned by{" "}
                        <span className="text-foreground">
                          {task.author.name.split(/\s+/)[0]}
                        </span>
                      </span>
                    </>
                  )}
              </div>
            </div>

            {/* Right cluster */}
            <div className="flex shrink-0 items-center gap-1">
              {/* Assignee */}
              <Popover>
                <PopoverTrigger
                  aria-label="Assignee"
                  className="focus-ring grid size-7 place-items-center rounded-full transition-colors hover:bg-accent/40"
                >
                  {optAssignee ? (
                    <Avatar
                      src={optAssignee.avatar_url}
                      initials={optAssignee.initials}
                      color={optAssignee.avatar_color}
                      size={24}
                    />
                  ) : (
                    <span className="grid size-6 place-items-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground/60">
                      +
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-[220px] gap-0 p-1" align="end">
                  {members.length === 0 ? (
                    <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
                      No teammates yet.
                    </p>
                  ) : (
                    members.map((m) => (
                      <PopoverItem
                        key={m.id}
                        selected={optAssignee?.id === m.id}
                        onSelect={() => reassign(m.id)}
                      >
                        <Avatar
                          src={m.avatar_url}
                          initials={m.initials}
                          color={m.avatar_color}
                          size={18}
                        />
                        <span>
                          {m.name}
                          {m.id === currentUserId ? " (you)" : ""}
                        </span>
                      </PopoverItem>
                    ))
                  )}
                </PopoverContent>
              </Popover>

              {/* Comment count — only when there are comments */}
              {commentCount > 0 && (
                <button
                  onClick={openDrawer}
                  aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
                  className="focus-ring inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  <ChatCircle size={13} />
                  <span className="tabular-nums">{commentCount}</span>
                </button>
              )}

              {/* More menu */}
              <Popover>
                <PopoverTrigger
                  aria-label="More actions"
                  className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  <DotsThree size={16} weight="bold" />
                </PopoverTrigger>
                <PopoverContent className="w-[180px] gap-0 p-1" align="end">
                  <PopoverItem onSelect={openDrawer}>
                    <span>Open details</span>
                  </PopoverItem>
                  <PopoverItem onSelect={remove} destructive>
                    <span>Delete task</span>
                  </PopoverItem>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.article>
      )}
    </AnimatePresence>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/40">
      ·
    </span>
  );
}

function PopoverItem({
  children,
  selected,
  onSelect,
  destructive,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        destructive
          ? "text-rose-600 hover:bg-rose-50"
          : selected
          ? "bg-primary/8 font-medium text-primary"
          : "text-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {children}
      {selected && <Check size={14} className="ml-auto text-primary" />}
    </button>
  );
}

// ── Date formatting ─────────────────────────────────────────────────────────

function formatTaskDate(due: Date | null, overdue: boolean): string {
  if (!due) return "No date";

  if (overdue) {
    const days = Math.abs(differenceInCalendarDays(new Date(), due));
    if (days === 0) return "Overdue";
    return `Overdue by ${days} ${days === 1 ? "day" : "days"}`;
  }

  const hasTime = !(due.getHours() === 23 && due.getMinutes() === 59);

  if (isToday(due)) {
    return hasTime ? `Today, ${format(due, "h:mm a")}` : "Today";
  }
  if (isTomorrow(due)) {
    return hasTime ? `Tomorrow, ${format(due, "h:mm a")}` : "Tomorrow";
  }
  if (isYesterday(due)) {
    return hasTime ? `Yesterday, ${format(due, "h:mm a")}` : "Yesterday";
  }

  const thisYear = isSameDay(
    new Date(due.getFullYear(), 0, 1),
    new Date(new Date().getFullYear(), 0, 1)
  );
  return hasTime
    ? format(due, thisYear ? "EEE, d MMM, h:mm a" : "d MMM yyyy")
    : format(due, thisYear ? "EEE, d MMM" : "d MMM yyyy");
}
