"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { sileo } from "sileo";
import { Avatar } from "@/components/avatar";
import { RelativeTime } from "@/components/relative-time";
import {
  ArrowsClockwise,
  Check,
  CheckCircle,
  CircleNotch,
  Hash,
} from "@/components/icons";
import { approveTask, requestTaskChanges } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import type { TaskWithRelations } from "@/lib/queries";

/**
 * The manager / superadmin approval queue. Renders the team tasks sitting
 * in 'in_review', grouped by project, each with two terminal actions:
 *
 *   • Approve     → task goes to 'done' (the DB stamps approved_by/at).
 *   • Send back   → task returns to 'doing'; an optional note is posted as
 *                   a comment so the assignee sees the feedback.
 *
 * Both actions remove the card optimistically (it leaves this queue either
 * way) and play the matching sound. The server action drives the real
 * transition; on failure we restore the card and toast the error.
 */
export function ApprovalQueue({
  tasks: serverTasks,
  currentUserId,
}: {
  tasks: TaskWithRelations[];
  currentUserId: string;
}) {
  // Local mirror so a decided task disappears immediately, without waiting
  // for the layout revalidate to round-trip.
  const [tasks, setTasks] = useState(serverTasks);

  // Group by project so an approver clears one project's work at a time.
  // Team tasks always carry a project; anything project-less is bucketed
  // under a stable fallback key so it still renders rather than vanishing.
  const groups = useMemo(() => {
    const byProject = new Map<
      string,
      { name: string; emoji: string | null; tasks: TaskWithRelations[] }
    >();
    for (const t of tasks) {
      const key = t.project?.id ?? "—";
      const existing = byProject.get(key);
      if (existing) existing.tasks.push(t);
      else
        byProject.set(key, {
          name: t.project?.name ?? "No project",
          emoji: t.project?.emoji ?? null,
          tasks: [t],
        });
    }
    return Array.from(byProject.entries());
  }, [tasks]);

  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const restore = (task: TaskWithRelations) =>
    setTasks((prev) =>
      prev.some((t) => t.id === task.id) ? prev : [...prev, task]
    );

  if (tasks.length === 0) {
    // The list emptied out client-side (everything approved). A quiet,
    // self-contained note rather than bouncing to the page-level empty
    // state, so the approver gets a moment of "done" before navigating.
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-card py-12 text-center"
      >
        <span className="grid size-11 place-items-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
          <CheckCircle size={22} weight="fill" />
        </span>
        <p className="text-[14px] font-semibold text-foreground">
          Queue cleared
        </p>
        <p className="max-w-[280px] text-[12.5px] text-muted-foreground">
          Every submitted task has been signed off. Nicely done.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map(([key, group]) => (
        <section key={key}>
          <header className="mb-2.5 flex items-center gap-2 px-1">
            <span className="grid size-5 place-items-center text-muted-foreground">
              {group.emoji ? (
                <span className="text-[14px] leading-none">{group.emoji}</span>
              ) : (
                <Hash size={13} weight="bold" />
              )}
            </span>
            <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
              {group.name}
            </h2>
            <span className="text-[12px] tabular-nums text-muted-foreground">
              {group.tasks.length}
            </span>
          </header>

          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <AnimatePresence initial={false}>
              {group.tasks.map((task) => (
                <ApprovalCard
                  key={task.id}
                  task={task}
                  currentUserId={currentUserId}
                  onResolve={() => remove(task.id)}
                  onRestore={() => restore(task)}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      ))}
    </div>
  );
}

function ApprovalCard({
  task,
  currentUserId,
  onResolve,
  onRestore,
}: {
  task: TaskWithRelations;
  currentUserId: string;
  onResolve: () => void;
  onRestore: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [sendingBack, setSendingBack] = useState(false);
  const [note, setNote] = useState("");

  const assignee = task.assignee ?? task.author ?? null;
  const submittedAt = task.submitted_at ?? task.created_at ?? null;

  const openDrawer = () => {
    const next = new URLSearchParams(params.toString());
    next.set("task", task.id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const approve = () => {
    playSound("completed");
    onResolve();
    startTransition(async () => {
      const res = await approveTask(task.id);
      if (res.error) {
        sileo.error({ title: res.error });
        onRestore();
        return;
      }
      sileo.success({ title: "Approved", description: task.title });
    });
  };

  const sendBack = () => {
    const text = note.trim();
    playSound("uncomplete");
    onResolve();
    startTransition(async () => {
      const res = await requestTaskChanges(task.id, text || undefined);
      if (res.error) {
        sileo.error({ title: res.error });
        onRestore();
        setSendingBack(false);
        return;
      }
      sileo.success({
        title: "Sent back for changes",
        description: task.title,
      });
    });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden border-b border-border/40 last:border-b-0"
    >
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start">
        {/* The submitter's avatar leads the row so the queue scans by person;
            the title is the primary link into the task. */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {assignee && (
            <Avatar
              src={assignee.avatar_url}
              initials={assignee.initials}
              color={assignee.avatar_color}
              size={28}
              className="mt-0.5"
            />
          )}
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={openDrawer}
              className="focus-ring block max-w-full truncate text-left text-[14px] font-medium text-foreground transition-colors hover:text-primary-readable"
            >
              {task.title}
            </button>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-muted-foreground">
              {assignee && (
                <span className="font-medium text-foreground/75">
                  {assignee.id === currentUserId ? "You" : assignee.name}
                </span>
              )}
              {assignee && submittedAt && (
                <span aria-hidden className="text-border">
                  ·
                </span>
              )}
              {submittedAt && (
                <span>
                  submitted <RelativeTime date={submittedAt} />
                </span>
              )}
            </div>

            {/* Send-back note. Revealed inline so requesting changes is one
                surface, not a modal — type the reason, send, done. */}
            <AnimatePresence initial={false}>
              {sendingBack && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5">
                    <textarea
                      autoFocus
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          sendBack();
                        }
                        if (e.key === "Escape") setSendingBack(false);
                      }}
                      rows={2}
                      placeholder="What needs changing? (optional — posted as a comment)"
                      className="focus-ring w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSendingBack(false);
                          setNote("");
                        }}
                        className="focus-ring rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={sendBack}
                        disabled={pending}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-amber-500/15 px-2.5 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-500/25 disabled:opacity-50 dark:text-amber-300"
                      >
                        <ArrowsClockwise size={12} weight="bold" />
                        Send back
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Decision actions — labeled so intent is unambiguous on touch as
            well as hover. Approve carries the brand tint as the primary,
            positive action; Send back stays quiet. On narrow screens they
            drop to their own row, aligned under the title. Hidden while the
            note composer is open. */}
        {!sendingBack && (
          <div className="flex shrink-0 items-center gap-1.5 max-sm:pl-[40px] sm:pt-px">
            <button
              type="button"
              onClick={approve}
              disabled={pending}
              aria-label={`Approve "${task.title}"`}
              title="Approve & complete"
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md bg-primary/10 px-2.5 text-[12.5px] font-semibold text-primary-readable transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-primary/20 active:scale-[0.97] disabled:opacity-50"
            >
              {pending ? (
                <CircleNotch size={13} className="animate-spin" />
              ) : (
                <Check size={13} weight="bold" />
              )}
              Approve
            </button>
            <button
              type="button"
              onClick={() => setSendingBack(true)}
              disabled={pending}
              aria-label={`Send "${task.title}" back for changes`}
              className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium text-muted-foreground transition-[background-color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.97] disabled:opacity-50"
            >
              <ArrowsClockwise size={13} />
              Send back
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}
