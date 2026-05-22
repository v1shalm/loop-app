"use client";

import { useTransition } from "react";
import { motion, AnimatePresence } from "motion/react";
import { format, formatDistanceToNow } from "date-fns";
import { sileo } from "sileo";
import { Check, Clock, Flag } from "@/components/icons";
import { cn } from "@/lib/utils";
import { triageTask, snoozeTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type { TaskWithRelations } from "@/lib/queries";
import { Avatar } from "@/components/avatar";

const priorityClass: Record<number, string> = {
  1: "text-priority-1",
  2: "text-priority-2",
  3: "text-priority-3",
  4: "text-priority-4",
};

export function InboxList({ tasks }: { tasks: TaskWithRelations[] }) {
  return (
    <ul className="flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {tasks.map((t) => (
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
  );
}

function InboxItem({ task }: { task: TaskWithRelations }) {
  const [pending, startTransition] = useTransition();
  const dueLabel = task.due_at
    ? format(new Date(task.due_at), "EEE, d MMM")
    : null;
  const created = formatDistanceToNow(new Date(task.created_at), {
    addSuffix: true,
  });

  const accept = () => {
    if (pending) return;
    playSound("added");
    startTransition(async () => {
      const res = await triageTask(task.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.success({ title: "Task accepted" });
    });
  };

  const later = () => {
    if (pending) return;
    startTransition(async () => {
      const res = await snoozeTask(task.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.info({ title: "Snoozed for a week" });
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
            sent you · {created}
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
              <span className="inline-flex items-center gap-1">
                <span>{task.project.emoji ?? "#"}</span>
                <span>{task.project.name}</span>
              </span>
            )}
            {dueLabel && (
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
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={later}
          disabled={pending}
          className="focus-ring flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.97] disabled:opacity-50"
        >
          <Clock size={13} />
          Mark later
        </button>
        <button
          onClick={accept}
          disabled={pending}
          className="focus-ring surface-brand surface-brand-hover flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50"
        >
          <Check size={13} weight="bold" />
          Accept
        </button>
      </div>
    </article>
  );
}
