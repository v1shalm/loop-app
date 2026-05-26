"use client";

import { memo, useEffect, useState, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  animate,
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "motion/react";
import { sileo } from "sileo";
import { useIsMobile } from "@/lib/use-is-mobile";
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
  CheckCircle,
  Copy,
  DotsThree,
  Eye,
  Flag,
  Paperclip,
  Trash,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { deleteTask, setTaskStatus, updateTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { MentionText } from "@/components/mention-text";
import type { TaskWithRelations } from "@/lib/queries";
import { useTeamContext } from "@/components/team-provider";
import { Avatar } from "@/components/avatar";
import { useOptimisticDeletes } from "@/components/optimistic-deletes";

type Priority = 1 | 2 | 3 | 4;

const PRIORITY_LABELS: Record<Priority, string> = {
  1: "High",
  2: "Medium",
  3: "Low",
  4: "None",
};

// Long label used in the popover menu so the meaning stays explicit
// even when the inline pill is just one word.
const PRIORITY_LABELS_LONG: Record<Priority, string> = {
  1: "High priority",
  2: "Medium priority",
  3: "Low priority",
  4: "No priority",
};

const PRIORITY_DOT: Record<Priority, string> = {
  1: "bg-rose-500",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-muted-foreground/40",
};

const PRIORITY_FLAG: Record<Priority, string> = {
  1: "text-rose-500",
  2: "text-amber-500",
  3: "text-emerald-500",
  4: "text-muted-foreground/50",
};

function TaskRowInner({
  task,
  flat,
  compact,
}: {
  task: TaskWithRelations;
  /** When true, drops the card chrome (border, shadow, rounded-xl) so
   *  the row sits flat inside an outer bordered container with its own
   *  divider language. Used on the project page where rows are wrapped
   *  in a single table-like card. */
  flat?: boolean;
  /** For narrow containers (e.g. the Upcoming day columns). Drops the
   *  fixed 150px right cluster + slot reservation so the title gets the
   *  room it needs at narrow widths. */
  compact?: boolean;
}) {
  const [done, setDone] = useState(task.status === "done");
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const params = useSearchParams();
  const { members, currentUserId } = useTeamContext();
  const isMobile = useIsMobile();
  // Horizontal drag offset for the mobile swipe gesture. The underlay
  // indicators read this value to fade in as the user drags.
  const dragX = useMotionValue(0);
  const completeOpacity = useTransform(dragX, [0, 60, 100], [0, 0.7, 1]);
  const rescheduleOpacity = useTransform(dragX, [-100, -60, 0], [1, 0.7, 0]);
  // Shared optimistic-delete store. Lets the drawer's "Delete task"
  // also hide this row instantly (without the drawer, the row would
  // hang around until the server revalidation lands).
  const optimisticDeletes = useOptimisticDeletes();
  const isOptimisticallyDeleted = optimisticDeletes.isHidden(task.id);

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
  const attachmentCount = task.attachments?.[0]?.count ?? 0;
  // Co-assignees beyond the primary. task_assignees includes the
  // primary too, so the "extras" count subtracts 1 for the primary if
  // it's present in the array.
  const totalAssignees = task.assignees?.length ?? 0;
  const extraAssigneeCount = Math.max(
    0,
    totalAssignees - (optAssignee ? 1 : 0)
  );
  const priority = optPriority;

  const undoComplete = () => {
    setDone(false);
    playSound("uncomplete");
    startTransition(async () => {
      const res = await setTaskStatus(task.id, "todo");
      if (res.error) {
        sileo.error({ title: res.error });
        setDone(true);
      }
    });
  };

  const toggle = () => {
    setDone(true);
    playSound("completed", priority);
    startTransition(async () => {
      const res = await setTaskStatus(task.id, "done");
      if (res.error) {
        sileo.error({ title: res.error });
        setDone(false);
        return;
      }
      sileo.success({
        title: "Marked complete",
        description: task.title,
        button: { title: "Undo", onClick: undoComplete },
        duration: 6000,
      });
    });
  };

  const openDrawer = () => {
    const next = new URLSearchParams(params.toString());
    next.set("task", task.id);
    // history.pushState updates the URL without a Next router push.
    // No server component on these routes reads ?task, so the router
    // push would just refetch the RSC payload for nothing and stall
    // the click. useSearchParams in the drawer picks up the change.
    window.history.pushState(null, "", `${pathname}?${next.toString()}`);
  };

  const copyLink = () => {
    // Deep link to this task: current page + ?task=<id> so the
    // recipient lands on the same view with the drawer pre-opened.
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${pathname}?task=${task.id}`;
    void navigator.clipboard.writeText(url).then(
      () => sileo.success({ title: "Link copied" }),
      () => sileo.error({ title: "Couldn't copy link" })
    );
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
    // Optimistic: hide the row immediately so the user sees an instant
    // response, then run the server delete in a transition. The
    // AnimatePresence exit animation runs during the server round-trip
    // so the row is already off-screen by the time revalidation lands.
    // On error, un-hide and surface the failure.
    optimisticDeletes.hide(task.id);
    playSound("deleted");
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.error) {
        sileo.error({ title: res.error });
        optimisticDeletes.unhide(task.id);
      }
    });
  };

  // Mobile swipe-left: bump the due date forward by one day (or set to
  // tomorrow if undated). Mirrors Todoist's swipe-to-reschedule pattern.
  const rescheduleTomorrow = () => {
    const prev = optDueAt;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    setOptDueAt(tomorrow.toISOString());
    playSound("pin");
    startTransition(async () => {
      const res = await updateTask(task.id, { dueAt: tomorrow.toISOString() });
      if (res.error) {
        sileo.error({ title: res.error });
        setOptDueAt(prev);
        return;
      }
      sileo.success({
        title: "Scheduled for tomorrow",
        description: task.title,
        button: {
          title: "Undo",
          onClick: () => {
            setOptDueAt(prev);
            startTransition(async () => {
              await updateTask(task.id, { dueAt: prev });
            });
          },
        },
        duration: 4000,
      });
    });
  };

  const dateText = formatTaskDate(due, overdue);
  // Three tiers of date urgency:
  //   overdue (past due) → rose. You missed the deadline.
  //   today (due today)  → amber. Deadline is today; it's the
  //                        working day, not a failure.
  //   later              → muted. Tertiary tone.
  // Previously today + overdue both rendered rose, which made the
  // Today section look like an overdue list — semantically wrong.
  const dateIsToday = !!(due && isToday(due));
  const dateTone = overdue
    ? "text-rose-500 font-medium"
    : dateIsToday
      ? "text-amber-600 font-medium dark:text-amber-400"
      : "text-muted-foreground";
  const dateIconTone = overdue
    ? "text-rose-500"
    : dateIsToday
      ? "text-amber-600 dark:text-amber-400"
      : "text-muted-foreground/70";

  return (
    <AnimatePresence initial={false}>
      {!done && !isOptimisticallyDeleted && (
        <motion.div
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={{ duration: 0.18, ease: [0.32, 0.72, 0.32, 1] }}
          className="relative"
        >
          {/* Mobile-only swipe underlay. The indicators sit BEHIND the
              row and fade in based on dragX so the user sees what each
              direction will do before they commit. Hidden on desktop. */}
          {isMobile && (
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 flex items-center justify-between overflow-hidden md:hidden",
                flat ? "px-4" : "rounded-xl px-5"
              )}
            >
              <motion.div
                style={{ opacity: completeOpacity }}
                className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600"
              >
                <CheckCircle size={20} weight="fill" />
                <span>Complete</span>
              </motion.div>
              <motion.div
                style={{ opacity: rescheduleOpacity }}
                className="flex items-center gap-2 text-[13px] font-semibold text-amber-600"
              >
                <span>Tomorrow</span>
                <CalendarBlank size={20} weight="fill" />
              </motion.div>
            </div>
          )}
          <motion.div
            drag={isMobile ? "x" : false}
            dragConstraints={{ left: -160, right: 160 }}
            dragElastic={0.15}
            dragDirectionLock
            style={{ x: dragX, touchAction: isMobile ? "pan-y" : undefined }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100 || info.velocity.x > 600) {
                toggle();
              } else if (info.offset.x < -100 || info.velocity.x < -600) {
                rescheduleTomorrow();
              }
              // Spring back smoothly instead of an instant .set(0).
              // Instant resets can look "stuck" mid-frame if the
              // gesture is interrupted (e.g. scroll captures the
              // pointer), and the snap to origin reads as a glitch
              // rather than a deliberate return. A short spring also
              // covers the commit cases — the row animates out via
              // AnimatePresence, so the spring is just a backstop.
              animate(dragX, 0, {
                type: "spring",
                duration: 0.32,
                bounce: 0.18,
              });
            }}
            onClick={openDrawer}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openDrawer();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`Open ${task.title}`}
            className={cn(
              "group transition-shadow duration-150 ease-[var(--ease-out)] focus-ring",
              flat
                ? "bg-transparent px-4 py-3"
                : "cursor-pointer rounded-md border border-border/40 bg-card px-4 py-3.5 shadow-soft-sm hover:shadow-soft-md",
              isMobile && "cursor-grab active:cursor-grabbing"
            )}
          >
          <div className="flex items-start gap-3">
            {/* Completion checkbox — single purpose, always marks
                complete. stopPropagation so the click doesn't bubble
                up to the article and also fire the drawer open. */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle();
              }}
              disabled={pending}
              aria-label={`Mark "${task.title}" complete`}
              className={cn(
                "focus-ring mt-0.5 grid size-6 shrink-0 place-items-center rounded-[6px] border border-border bg-background transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-foreground/40 active:scale-95"
              )}
            >
              <Check
                size={13}
                weight="bold"
                className="text-foreground/0 transition-colors group-hover:text-muted-foreground/40"
              />
            </button>

            {/* Title + meta row. The title is plain text — the whole
                card is the click target now, no inner button needed.
                The article carries role="button" + tabIndex + Enter
                handling so keyboard users still open the drawer
                without a separate focus stop on the title. */}
            <div className="min-w-0 flex-1">
              <span className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground decoration-foreground/40 underline-offset-2 [overflow-wrap:anywhere] group-hover:underline">
                <MentionText text={task.title} />
              </span>

              <div
                className={cn(
                  "mt-1 flex items-center gap-x-2.5 gap-y-1 text-[11px]",
                  // Compact (Upcoming day columns) keeps priority + date on
                  // one row so they read as a single meta line. Default
                  // mode wraps so longer date strings + author chip don't
                  // overflow.
                  compact ? "flex-nowrap" : "flex-wrap"
                )}
              >
                {/* Priority — 5px colored dot + tertiary text label */}
                <Popover>
                  <PopoverTrigger
                    aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
                    onClick={(e) => e.stopPropagation()}
                    className="focus-ring -mx-1 inline-flex h-6 items-center gap-1.5 rounded px-1 py-0.5 text-muted-foreground transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "inline-block size-[5px] shrink-0 rounded-full",
                        PRIORITY_DOT[priority]
                      )}
                    />
                    {PRIORITY_LABELS[priority]}
                  </PopoverTrigger>
                  <PopoverContent className="w-[180px]" align="start">
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
                        <span>{PRIORITY_LABELS_LONG[p]}</span>
                      </PopoverItem>
                    ))}
                  </PopoverContent>
                </Popover>

                <Dot />

                {/* Date — clickable popover. Red + medium weight when
                    overdue or today; otherwise tertiary. */}
                <Popover>
                  <PopoverTrigger
                    aria-label={dateText ? `Due ${dateText}` : "Set due date"}
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      "focus-ring -mx-1 inline-flex h-6 items-center gap-1.5 rounded px-1 py-0.5 transition-colors duration-150 ease-[var(--ease-out)] hover:bg-accent/40",
                      dateTone
                    )}
                  >
                    <CalendarBlank size={11} className={dateIconTone} />
                    {/* Server and client may compute "Today" vs "Tomorrow"
                        differently when the user's clock crosses midnight
                        local but the server is still on UTC. Suppress the
                        hydration warning; the client-rendered value wins.
                        whitespace-nowrap keeps "Today, 6:00 PM" on one
                        line inside narrow compact-mode rows. */}
                    <span
                      className="whitespace-nowrap tabular-nums"
                      suppressHydrationWarning
                    >
                      {dateText}
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto gap-0 p-0" align="start">
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

            {/* Right cluster. Default mode reserves a fixed 150px slot
                with always-rendered counts (opacity-gated) so width never
                shifts. Compact mode (narrow columns like Upcoming) drops
                the reservation: counts only render when non-zero, and the
                cluster sizes to its content so the title gets the room. */}
            <div
              className={cn(
                "flex shrink-0 items-center justify-end",
                // Compact: align with the title (top of the row) so the
                // avatar + dots sit on the same line as the task name,
                // matching the reference for narrow day-column cards.
                // Default mode keeps the cluster vertically centered with
                // the title+meta block.
                compact
                  ? "mt-0.5 w-auto gap-2 self-start"
                  : "w-[150px] gap-3 self-center"
              )}
            >
              {/* Comment count. In default mode the slot is reserved
                  (pointer-events-none + opacity-0 when zero) so adding
                  a comment doesn't shift the avatar. In compact mode
                  the badge only renders when count > 0. */}
              {(compact ? commentCount > 0 : true) && (
                <span
                  aria-label={
                    commentCount > 0
                      ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
                      : undefined
                  }
                  aria-hidden={commentCount === 0 || undefined}
                  className={cn(
                    "inline-flex items-center gap-1 text-[12px] text-muted-foreground",
                    commentCount > 0 ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  <ChatCircle size={12} />
                  <span className="tabular-nums">{commentCount || 0}</span>
                </span>
              )}

              {/* Attachment count. Same pattern as comment count. */}
              {(compact ? attachmentCount > 0 : true) && (
                <span
                  aria-label={
                    attachmentCount > 0
                      ? `${attachmentCount} ${attachmentCount === 1 ? "attachment" : "attachments"}`
                      : undefined
                  }
                  aria-hidden={attachmentCount === 0 || undefined}
                  className={cn(
                    "inline-flex items-center gap-1 text-[12px] text-muted-foreground",
                    attachmentCount > 0 ? "opacity-100" : "pointer-events-none opacity-0"
                  )}
                >
                  <Paperclip size={12} />
                  <span className="tabular-nums">{attachmentCount || 0}</span>
                </span>
              )}

              {/* Assignee — fixed 22px circle. touch-expand bumps the hit
                  area for mobile without changing the visible size, so
                  the slot width never depends on viewport.
                  Co-assignees beyond the primary surface as a tiny "+N"
                  pill overlapping the bottom-right — communicates the
                  task has additional owners without taking width from
                  the row. The popover (and the drawer) is where you
                  edit the list. */}
              <Popover>
                <PopoverTrigger
                  aria-label={
                    optAssignee
                      ? extraAssigneeCount > 0
                        ? `Assigned to ${optAssignee.name ?? "teammate"} and ${extraAssigneeCount} more`
                        : `Assigned to ${optAssignee.name ?? "teammate"}`
                      : "Assign teammate"
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="focus-ring relative grid size-6 shrink-0 place-items-center rounded-full transition-[filter] hover:brightness-95"
                >
                  {optAssignee ? (
                    <Avatar
                      src={optAssignee.avatar_url}
                      initials={optAssignee.initials}
                      color={optAssignee.avatar_color}
                      size={22}
                    />
                  ) : (
                    <span className="grid size-[22px] place-items-center rounded-full border border-dashed border-border text-[10px] text-muted-foreground/60">
                      +
                    </span>
                  )}
                  {extraAssigneeCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-1 grid h-[13px] min-w-[13px] place-items-center rounded-full bg-foreground px-0.5 text-[9px] font-semibold leading-none text-background ring-2 ring-card tabular-nums"
                    >
                      +{extraAssigneeCount}
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-[220px]" align="end">
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

              {/* Dots menu — always rendered. On desktop, hidden by
                  default and fades in on row hover (or when the popover
                  is open / the trigger is keyboard-focused). On mobile
                  there's no hover, so it stays visible. Width is
                  always allocated either way. */}
              <Popover>
                <PopoverTrigger
                  aria-label="More actions"
                  onClick={(e) => e.stopPropagation()}
                  className="focus-ring touch-expand grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-[background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground"
                >
                  <DotsThree size={16} weight="bold" />
                </PopoverTrigger>
                <PopoverContent className="w-[200px]" align="end">
                  <PopoverItem onSelect={openDrawer}>
                    <Eye size={14} weight="regular" className="text-muted-foreground" />
                    <span>Open details</span>
                  </PopoverItem>
                  <PopoverItem onSelect={copyLink}>
                    <Copy size={14} weight="regular" className="text-muted-foreground" />
                    <span>Copy link</span>
                  </PopoverItem>
                  <PopoverItem onSelect={remove} destructive>
                    <Trash size={14} className="text-rose-600" />
                    <span>Delete task</span>
                  </PopoverItem>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// React.memo wrapper. Task lists render dozens of rows; without memo,
// every parent re-render (e.g. a sibling task's status flip, a new
// task created) would re-run every row's heavy render path (motion
// children, date formatting, multiple popover triggers). With memo +
// reference-stable task props from the parent's array, only the row
// whose data changed re-renders.
export const TaskRow = memo(TaskRowInner);

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
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13.5px] transition-colors",
        destructive
          ? "text-rose-600 hover:bg-rose-50"
          : selected
          ? "bg-primary/8 font-medium text-primary"
          : "text-foreground hover:bg-foreground/[0.04] hover:text-foreground"
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
