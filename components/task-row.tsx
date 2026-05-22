"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import { isToday, isPast } from "date-fns";
import { DatePicker, formatDueShort } from "@/components/date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarBlank,
  ChatCircle,
  Check,
  Flag,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { setTaskStatus, updateTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type { TaskWithRelations } from "@/lib/queries";
import { useTeamContext } from "@/components/team-provider";
import { Avatar } from "@/components/avatar";

type Priority = 1 | 2 | 3 | 4;

const PRIORITY_LABELS: Record<Priority, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
  4: "None",
};

const PRIORITY_PILL_CLASS: Record<Priority, string> = {
  1: "bg-rose-50 text-rose-700 ring-rose-200/70",
  2: "bg-amber-50 text-amber-700 ring-amber-200/70",
  3: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  4: "",
};

const PRIORITY_FLAG_CLASS: Record<Priority, string> = {
  1: "text-rose-500",
  2: "text-amber-500",
  3: "text-emerald-500",
  4: "text-muted-foreground/50",
};

export function TaskRow({ task }: { task: TaskWithRelations }) {
  const [done, setDone] = useState(task.status === "done");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { members, currentUserId } = useTeamContext();

  // Optimistic mirrors so popover/date changes paint instantly.
  // Sync back to props when the server returns fresh data via revalidatePath.
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
  const overdue = due && isPast(due) && !isToday(due) && !done;
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

  return (
    <AnimatePresence initial={false}>
      {!done && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
          className="group border-b border-border/40 last:border-b-0"
        >
          <div className="grid grid-cols-[auto_minmax(0,1fr)_140px_120px_88px] items-center gap-4 px-4 py-3 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/30">
            {/* Checkbox */}
            <button
              onClick={toggle}
              aria-label={`Mark "${task.title}" complete`}
              className={cn(
                "focus-ring touch-expand grid size-[18px] shrink-0 place-items-center rounded-[5px] border bg-background transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-foreground/40 active:scale-95",
                "border-border"
              )}
            >
              <Check
                size={11}
                weight="bold"
                className="text-foreground/0 transition-colors group-hover:text-muted-foreground/40"
              />
            </button>

            {/* Title + comment count */}
            <button
              onClick={openDrawer}
              className="focus-ring flex min-w-0 items-center gap-2 text-left"
            >
              <span className="truncate text-[14px] font-medium text-foreground">
                {task.title}
              </span>
              {commentCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] text-muted-foreground">
                  <ChatCircle size={13} />
                  {commentCount}
                </span>
              )}
            </button>

            {/* Assignee */}
            <Popover>
              <PopoverTrigger
                aria-label="Assignee"
                className="focus-ring flex items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-accent/40"
              >
                {optAssignee ? (
                  <>
                    <Avatar
                      src={optAssignee.avatar_url}
                      initials={optAssignee.initials}
                      color={optAssignee.avatar_color}
                      size={24}
                    />
                    <span className="truncate text-[13px] text-foreground">
                      {optAssignee.id === currentUserId
                        ? "You"
                        : optAssignee.name.split(" ")[0]}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-muted-foreground/70">
                    Unassigned
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[220px] gap-0 p-1" align="start">
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

            {/* Due date */}
            <Popover>
              <PopoverTrigger
                aria-label="Due date"
                className={cn(
                  "focus-ring flex items-center gap-1.5 rounded-md px-1 py-1 text-left text-[13px] transition-colors hover:bg-accent/40",
                  overdue || (due && isToday(due))
                    ? "text-rose-600"
                    : "text-muted-foreground"
                )}
              >
                <CalendarBlank
                  size={14}
                  className={
                    overdue || (due && isToday(due))
                      ? "text-rose-500"
                      : "text-muted-foreground/70"
                  }
                />
                <span className="tabular-nums">{formatDueShort(due)}</span>
              </PopoverTrigger>
              <PopoverContent className="gap-0 p-0" align="start">
                <DatePicker value={due} onChange={setDue} />
              </PopoverContent>
            </Popover>

            {/* Priority pill */}
            <Popover>
              <PopoverTrigger
                aria-label="Priority"
                className="focus-ring flex items-center justify-start rounded-md px-1 py-1 transition-colors hover:bg-accent/40"
              >
                {priority < 4 ? (
                  <span
                    className={cn(
                      "chip-3d inline-flex items-center rounded-md px-2 py-0.5 text-[11.5px] font-semibold ring-1 ring-inset",
                      PRIORITY_PILL_CLASS[priority]
                    )}
                  >
                    {PRIORITY_LABELS[priority]}
                  </span>
                ) : (
                  <span className="text-[12px] text-muted-foreground/60">
                    None
                  </span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-[180px] gap-0 p-1" align="end">
                {([1, 2, 3, 4] as Priority[]).map((p) => (
                  <PopoverItem
                    key={p}
                    selected={priority === p}
                    onSelect={() => setPriority(p)}
                  >
                    <Flag
                      size={13}
                      weight={p === 4 ? "regular" : "fill"}
                      className={PRIORITY_FLAG_CLASS[p]}
                    />
                    <span>{PRIORITY_LABELS[p]}</span>
                  </PopoverItem>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PopoverItem({
  children,
  selected,
  onSelect,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
        selected
          ? "bg-primary/8 font-medium text-primary"
          : "text-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {children}
      {selected && <Check size={14} className="ml-auto text-primary" />}
    </button>
  );
}
