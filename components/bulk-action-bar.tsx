"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import {
  CalendarBlank,
  Check,
  CircleNotch,
  Trash,
  UserPlus,
  X,
} from "@/components/icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar } from "@/components/avatar";
import { useBulkSelection } from "@/components/bulk-selection";
import {
  bulkDeleteTasks,
  bulkSetTaskAssignee,
  bulkSetTaskDueDate,
  bulkSetTaskStatus,
} from "@/lib/actions";
import type { Profile } from "@/lib/queries";
import { playSound } from "@/lib/sounds";
import { cn } from "@/lib/utils";

/**
 * Floating action bar at the bottom of the canvas, shown whenever the
 * selection model has 1+ ids. Springs in from below the viewport on
 * mount and back out on clear.
 *
 * Actions kept deliberately minimal: complete, reassign, reschedule,
 * delete. Anything more belongs in the drawer where a user is on a
 * single task.
 */
export function BulkActionBar({ members }: { members: Profile[] }) {
  const { ids, mode, clear, setMode } = useBulkSelection();
  const [pending, startTransition] = useTransition();
  const count = ids.size;

  const run = (fn: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const res = await fn();
      if (res.error) sileo.error({ title: res.error });
      else {
        sileo.success({ title: `Updated ${count} ${count === 1 ? "task" : "tasks"}` });
        setMode(false);
      }
    });

  const onComplete = () =>
    run(() => bulkSetTaskStatus([...ids], "done"));
  const onDelete = () => {
    playSound("deleted");
    return run(() => bulkDeleteTasks([...ids]));
  };
  const onAssign = (userId: string) =>
    run(() => bulkSetTaskAssignee([...ids], userId));
  const onSchedule = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(14, 30, 0, 0);
    return run(() => bulkSetTaskDueDate([...ids], d.toISOString()));
  };

  return (
    <AnimatePresence>
      {mode && count > 0 && (
        <motion.div
          key="bulk-bar"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
          role="toolbar"
          aria-label="Bulk actions"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 max-md:bottom-[calc(64px+env(safe-area-inset-bottom,0px))]"
        >
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card px-2 py-1.5 shadow-soft-md ring-1 ring-foreground/5">
            <span className="px-2.5 text-[12.5px] font-medium tabular-nums text-foreground">
              {count} selected
            </span>

            <div aria-hidden className="h-5 w-px bg-border/70" />

            <BarButton onClick={onComplete} disabled={pending} icon={<Check size={13} weight="bold" />}>
              Complete
            </BarButton>

            <AssignDropdown members={members} onPick={onAssign} disabled={pending} />

            <ScheduleDropdown onPick={onSchedule} disabled={pending} />

            <BarButton
              onClick={onDelete}
              disabled={pending}
              icon={<Trash size={13} />}
              destructive
            >
              Delete
            </BarButton>

            {pending && (
              <CircleNotch size={13} className="ml-1 animate-spin text-muted-foreground" />
            )}

            <div aria-hidden className="h-5 w-px bg-border/70" />

            <button
              type="button"
              onClick={clear}
              aria-label="Clear selection"
              className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.92]"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BarButton({
  onClick,
  disabled,
  icon,
  children,
  destructive,
}: {
  onClick?: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.96] disabled:opacity-60",
        destructive
          ? "text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15"
          : "text-foreground hover:bg-accent/40"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function AssignDropdown({
  members,
  onPick,
  disabled,
}: {
  members: Profile[];
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.96] disabled:opacity-60"
      >
        <UserPlus size={13} />
        Reassign
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} className="w-[220px] gap-0 p-1">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assign to
        </p>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              onPick(m.id);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.985]"
          >
            <Avatar
              src={m.avatar_url}
              initials={m.initials}
              color={m.avatar_color}
              size={20}
            />
            <span className="truncate">{m.name}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const QUICK_SCHEDULES: { label: string; offset: number }[] = [
  { label: "Today", offset: 0 },
  { label: "Tomorrow", offset: 1 },
  { label: "In three days", offset: 3 },
  { label: "Next week", offset: 7 },
];

function ScheduleDropdown({
  onPick,
  disabled,
}: {
  onPick: (offsetDays: number) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.96] disabled:opacity-60"
      >
        <CalendarBlank size={13} />
        Reschedule
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} className="w-[200px] gap-0 p-1">
        {QUICK_SCHEDULES.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => {
              onPick(q.offset);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 active:scale-[0.985]"
          >
            <span>{q.label}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
