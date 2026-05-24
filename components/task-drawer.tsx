"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "motion/react";
import { format, isPast, isToday } from "date-fns";
import { DatePicker, formatDueShort } from "@/components/date-picker";
import { sileo } from "sileo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowUp,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  Check,
  CheckCircle,
  ChatCircle,
  CircleNotch,
  DotsThree,
  Flag,
  Plus,
  Trash,
  Tray,
  UserPlus,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  addComment,
  addTaskAssignee,
  createSubtask,
  deleteComment,
  deleteTask,
  removeTaskAssignee,
  setTaskStatus,
  updateTask,
  type CommentRow,
} from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { RelativeTime } from "@/components/relative-time";
import { CommentReactions } from "@/components/comment-reactions";
import {
  MentionInput,
  MentionRenderer,
  type MentionInputHandle,
} from "@/components/mention-input";
import type { Profile, Project, TaskWithRelations } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ProjectDot } from "@/components/project-dot";
import { Button } from "@/components/ui/button";

// Inlined to avoid pulling lib/queries.ts (which imports server-only code)
// into the client bundle. Keep in sync with TASK_RELATIONS_SELECT.
const TASK_RELATIONS_SELECT = `
  *,
  project:projects(id, name, emoji),
  assignee:profiles!tasks_assignee_id_fkey(id, name, initials, avatar_color, avatar_url),
  author:profiles!tasks_author_id_fkey(id, name, initials, avatar_color, avatar_url)
`;

type Priority = 1 | 2 | 3 | 4;

const PRIORITY_OPTIONS: { p: Priority; label: string; cls: string }[] = [
  { p: 1, label: "High", cls: "text-rose-500" },
  { p: 2, label: "Medium", cls: "text-amber-500" },
  { p: 3, label: "Low", cls: "text-emerald-500" },
  { p: 4, label: "None", cls: "text-muted-foreground/50" },
];


export function TaskDrawer({
  projects,
  members,
  currentUserId,
}: {
  projects: Project[];
  members: Profile[];
  currentUserId: string;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const taskId = params.get("task");
  const [mounted, setMounted] = useState(false);
  // Mobile sheet drag is owned by the panel but only activates from
  // the handle. Without this split, motion's drag listener captures
  // every touch in the panel and breaks inner scrolling on phones.
  const dragControls = useDragControls();

  useEffect(() => setMounted(true), []);

  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {taskId && (
        // h-dvh instead of inset-0's implicit bottom:0 — on iOS Safari
        // with the bottom toolbar visible, `fixed inset-0` anchors to
        // the layout viewport (full screen, under the toolbar) while
        // the visible viewport is shorter. The drawer's bottom CTA
        // (Mark complete / Reopen task) then ends up half-hidden
        // behind the toolbar. `h-dvh` makes the root respect the
        // dynamic viewport, so the panel's bottom-0 sits just above
        // the toolbar instead.
        <div
          key="drawer-root"
          className="fixed inset-x-0 top-0 z-50 h-dvh"
        >
          {/* Backdrop — dims fast, fades to clear faster on close */}
          <motion.div
            key="backdrop"
            onClick={close}
            className="absolute inset-0 bg-black/25 supports-backdrop-filter:backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          />
          {/* Desktop: floating side panel inset from the edges, slides in
              from the right with the Vaul/Ionic deceleration curve.
              Hidden on mobile (md and below). */}
          <motion.div
            key="panel-desktop"
            initial={{ x: "calc(100% + 24px)" }}
            animate={{ x: 0 }}
            exit={{ x: "calc(100% + 24px)" }}
            transition={{
              duration: 0.42,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="pointer-events-none absolute inset-y-3 right-3 hidden w-full max-w-[480px] flex-col md:flex"
          >
            <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-[0_24px_64px_-12px_rgba(15,23,42,0.32),0_8px_16px_-8px_rgba(15,23,42,0.18)]">
              <DrawerInner
                taskId={taskId}
                projects={projects}
                members={members}
                currentUserId={currentUserId}
                onClose={close}
              />
            </div>
          </motion.div>

          {/* Mobile: bottom sheet, slides up from the bottom edge with
              drag-to-dismiss. Top inset leaves enough room to see the
              page behind so users know they can tap above to close.
              md:hidden so desktop stays untouched. */}
          <motion.div
            key="panel-mobile"
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) close();
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 32,
              stiffness: 320,
              mass: 0.8,
            }}
            className="absolute inset-x-0 bottom-0 top-14 flex flex-col md:hidden"
          >
            <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border-t border-border/60 bg-popover shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.32)]">
              {/* Drag handle — the ONLY surface that starts the drag.
                  Touch-action: none here prevents the browser's vertical
                  scroll from intercepting; the rest of the sheet keeps
                  default touch-action so the inner content scrolls. */}
              <div
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden
                className="flex shrink-0 cursor-grab items-center justify-center py-2.5 active:cursor-grabbing"
                style={{ touchAction: "none" }}
              >
                <span className="block h-1 w-9 rounded-full bg-muted-foreground/30" />
              </div>
              <DrawerInner
                taskId={taskId}
                projects={projects}
                members={members}
                currentUserId={currentUserId}
                onClose={close}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function DrawerInner({
  taskId,
  projects,
  members,
  currentUserId,
  onClose,
}: {
  taskId: string;
  projects: Project[];
  members: Profile[];
  currentUserId: string;
  onClose: () => void;
}) {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  // Multi-assignee state — co-assignees on top of the primary
  // tasks.assignee_id. Source: task_assignees join table.
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  // Ref on the scroll container so we can snap it back to the top
  // whenever the drawer switches to a different task. Without this,
  // opening task B while the previous task was scrolled down leaves
  // B mid-scroll — Details row clipped under the header on mobile.
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch task + comments on mount / id change.
  useEffect(() => {
    let active = true;
    setLoading(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const taskP = supabase
      .from("tasks")
      .select(TASK_RELATIONS_SELECT)
      .eq("id", taskId)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentsP = (supabase
      .from("task_comments")
      .select(
        "id, task_id, author_id, body, created_at, author:profiles!task_comments_author_id_fkey(id, name, initials, avatar_color, avatar_url), reactions:comment_reactions(emoji, user_id)"
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }) as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assigneesP = ((supabase as any)
      .from("task_assignees")
      .select("user_id")
      .eq("task_id", taskId));

    Promise.all([taskP, commentsP, assigneesP]).then(
      ([taskRes, cRes, aRes]: [
        { data: TaskWithRelations | null },
        { data: CommentRow[] | null },
        { data: { user_id: string }[] | null }
      ]) => {
        if (!active) return;
        setTask(taskRes.data ?? null);
        setComments(cRes.data ?? []);
        setAssigneeIds((aRes.data ?? []).map((r) => r.user_id));
        setLoading(false);
      }
    );

    return () => {
      active = false;
    };
  }, [taskId]);

  // Reset the scroll container to the top whenever taskId changes so
  // the next task always opens with its title visible. Otherwise the
  // scroll position from the previous task is preserved and the new
  // task appears mid-content (Details row clipped under the sticky
  // header).
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [taskId]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const saveTitle = () => {
    if (!task || !titleRef.current) return;
    const next = titleRef.current.value.trim();
    if (!next || next === task.title) return;
    setTask({ ...task, title: next });
    startTransition(async () => {
      const res = await updateTask(task.id, { title: next });
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const saveDescription = () => {
    if (!task || !descRef.current) return;
    const next = descRef.current.value;
    if (next === (task.description ?? "")) return;
    setTask({ ...task, description: next || null });
    startTransition(async () => {
      const res = await updateTask(task.id, {
        description: next || null,
      });
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const patch = (changes: Parameters<typeof updateTask>[1]) => {
    if (!task) return;
    // Optimistic local mirror — every field the drawer can change.
    const optimistic: Partial<TaskWithRelations> = {};
    if (changes.title !== undefined) optimistic.title = changes.title.trim();
    if (changes.description !== undefined)
      optimistic.description = changes.description;
    if (changes.priority !== undefined) optimistic.priority = changes.priority;
    if (changes.dueAt !== undefined) optimistic.due_at = changes.dueAt;
    if (changes.projectId !== undefined) {
      optimistic.project_id = changes.projectId;
      const proj = projects.find((p) => p.id === changes.projectId);
      optimistic.project = proj
        ? { id: proj.id, name: proj.name, emoji: proj.emoji }
        : null;
    }
    if (changes.assigneeId !== undefined) {
      optimistic.assignee_id = changes.assigneeId;
      const m = members.find((m) => m.id === changes.assigneeId);
      optimistic.assignee = m
        ? {
            id: m.id,
            name: m.name,
            initials: m.initials,
            avatar_color: m.avatar_color,
            avatar_url: m.avatar_url ?? null,
          }
        : null;
    }
    setTask({ ...task, ...optimistic });
    startTransition(async () => {
      const res = await updateTask(task.id, changes);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const setStatus = (target: "todo" | "done") => {
    if (!task) return;
    setTask({
      ...task,
      status: target,
      completed_at: target === "done" ? new Date().toISOString() : null,
    });
    startTransition(async () => {
      const res = await setTaskStatus(task.id, target);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const toggleDone = () => {
    if (!task) return;
    const next = task.status === "done" ? "todo" : "done";
    if (next === "done") {
      playSound("completed", task.priority as Priority);
      setStatus("done");
      sileo.success({
        title: "Marked complete",
        description: task.title,
        button: { title: "Undo", onClick: () => setStatus("todo") },
        duration: 6000,
      });
    } else {
      setStatus("todo");
    }
  };

  // Delete flow: clicking the menu item opens the in-app ConfirmDialog
  // (replaces the browser-chrome window.confirm). actuallyDelete is what
  // the dialog calls when the user clicks the destructive button.
  const remove = () => {
    if (!task) return;
    setConfirmDeleteOpen(true);
  };
  const actuallyDelete = () => {
    if (!task) return;
    // Close the drawer immediately so the row animates out; the server
    // action runs in a transition behind the scenes.
    onClose();
    playSound("deleted");
    startTransition(async () => {
      const res = await deleteTask(task.id);
      if (res.error) sileo.error({ title: res.error });
      else sileo.success({ title: "Task deleted" });
    });
  };

  if (loading) {
    return (
      <div className="grid h-full place-items-center text-muted-foreground">
        <CircleNotch size={18} className="animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full flex-col">
        <Header onClose={onClose} pending={false} />
        <div className="grid flex-1 place-items-center text-center text-muted-foreground">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Tray size={20} />
            </span>
            <p className="mt-3 text-[13.5px]">
              This task may have been deleted.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.p === task.priority)!;
  const due = task.due_at ? new Date(task.due_at) : null;
  const overdue = due && isPast(due) && !isToday(due) && task.status !== "done";
  const done = task.status === "done";
  const currentUser = members.find((m) => m.id === currentUserId) ?? null;

  // Chip tones — flat, borderless. The Details rows read as content
  // rather than a form, with hover lifting via a slightly brighter
  // tint instead of a border outline. Urgency cue (rose / amber /
  // emerald) is kept; the neutral chip drops the border-and-card
  // outline that was making rows feel form-y.
  const dueChipTone =
    overdue || (due && isToday(due))
      ? "bg-rose-500/12 text-rose-700 hover:bg-rose-500/18 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/22"
      : "bg-accent/40 text-foreground hover:bg-accent/60";

  const priorityChipTone: Record<Priority, string> = {
    1: "bg-rose-500/12 text-rose-700 hover:bg-rose-500/18 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/22",
    2: "bg-amber-500/12 text-amber-700 hover:bg-amber-500/18 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/22",
    3: "bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/18 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/22",
    4: "bg-accent/40 text-foreground hover:bg-accent/60",
  };

  // Single base class for every Details chip. Color tone composes in
  // via dueChipTone / priorityChipTone above. No border, no card.
  const chipBase =
    "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors";

  return (
    <div className="flex h-full flex-col">
      <Header onClose={onClose} pending={pending} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {/* Title — checkbox removed; completion lives on the footer
            primary CTA instead. Two paths to the same state-flip
            (inline checkbox + footer button) read as redundant in a
            focused detail view. */}
        <section className="px-6 pb-4 pt-4">
          <AutoTextarea
            ref={titleRef}
            defaultValue={task.title}
            onBlur={saveTitle}
            placeholder="Untitled task"
            className={cn(
              "min-h-[28px] w-full resize-none bg-transparent text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/50",
              done && "text-muted-foreground line-through"
            )}
          />
        </section>

        <SectionDivider />

        {/* Details — key-value rows for the four picker-driven properties.
            Project moved into this grid (was in the header). Created sits
            below the grid as a tiny read-only meta strip so users don't
            tap it expecting a picker. */}
        <section className="px-6 py-4">
          <SectionHeader label="Details" />
          <dl className="mt-3 grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-4 gap-y-1">
            <DetailLabel>Project</DetailLabel>
            <dd>
              <Popover>
                <PopoverTrigger
                  className={cn(chipBase, "bg-accent/40 text-foreground hover:bg-accent/60")}
                >
                  {task.project ? (
                    <ProjectDot project={task.project as Project} size={9} />
                  ) : (
                    <Tray size={13} className="text-muted-foreground" />
                  )}
                  {task.project ? task.project.name : "Inbox"}
                </PopoverTrigger>
                <PopoverContent className="w-[240px] gap-0 p-1" align="start">
                  <PopoverItem
                    selected={task.project_id === null}
                    onSelect={() => patch({ projectId: null })}
                  >
                    <Tray size={14} className="text-muted-foreground" />
                    <span>Inbox (no project)</span>
                  </PopoverItem>
                  {projects.map((p) => (
                    <PopoverItem
                      key={p.id}
                      selected={task.project_id === p.id}
                      onSelect={() => patch({ projectId: p.id })}
                    >
                      <ProjectDot project={p} size={9} />
                      <span className="truncate">{p.name}</span>
                    </PopoverItem>
                  ))}
                </PopoverContent>
              </Popover>
            </dd>

            <DetailLabel>Assignee</DetailLabel>
            <dd>
              <AssigneeStackPicker
                taskId={task.id}
                members={members}
                currentUserId={currentUserId}
                assigneeIds={assigneeIds}
                setAssigneeIds={setAssigneeIds}
                primaryId={task.assignee?.id ?? null}
                onSetPrimary={(id) => patch({ assigneeId: id })}
              />
            </dd>

            <DetailLabel>Due date</DetailLabel>
            <dd>
              <Popover>
                <PopoverTrigger className={cn(chipBase, dueChipTone)}>
                  <CalendarBlank size={13} weight="fill" />
                  <span className="tabular-nums">
                    {due ? formatDueShort(due) : "No date"}
                  </span>
                </PopoverTrigger>
                <PopoverContent className="gap-0 p-0" align="start">
                  <DatePicker
                    value={due}
                    onChange={(d) =>
                      patch({ dueAt: d ? d.toISOString() : null })
                    }
                  />
                </PopoverContent>
              </Popover>
            </dd>

            <DetailLabel>Priority</DetailLabel>
            <dd>
              <Popover>
                <PopoverTrigger
                  className={cn(chipBase, priorityChipTone[task.priority as Priority])}
                >
                  <Flag
                    size={13}
                    weight={task.priority === 4 ? "regular" : "fill"}
                  />
                  {priorityOpt.label}
                </PopoverTrigger>
                <PopoverContent className="w-[180px] gap-0 p-1" align="start">
                  {PRIORITY_OPTIONS.map((o) => (
                    <PopoverItem
                      key={o.p}
                      selected={task.priority === o.p}
                      onSelect={() => patch({ priority: o.p })}
                    >
                      <Flag
                        size={14}
                        className={o.cls}
                        weight={o.p === 4 ? "regular" : "fill"}
                      />
                      <span>{o.label}</span>
                    </PopoverItem>
                  ))}
                </PopoverContent>
              </Popover>
            </dd>
          </dl>

          {/* Created — read-only meta. Sits *below* the picker grid with
              its own pre-line hairline so users don't read it as another
              tap-to-change row. Format: avatar + name · timestamp, all
              muted. Completed badge stacks under it when relevant. */}
          <div className="mt-3 border-t border-border/40 pt-3 text-[12px]">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-foreground/65">
              <span className="text-foreground/55">Created by</span>
              {task.author ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar
                    src={task.author.avatar_url}
                    initials={task.author.initials}
                    color={task.author.avatar_color}
                    size={16}
                  />
                  <span className="text-foreground">{task.author.name}</span>
                </span>
              ) : (
                <span>Unknown</span>
              )}
              <span className="text-foreground/35">·</span>
              <span className="tabular-nums">
                {format(new Date(task.created_at), "d MMM, h:mm a")}
              </span>
            </div>
            {task.completed_at && (
              <div className="mt-1.5 inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <CheckCircle size={13} weight="fill" />
                Completed {format(new Date(task.completed_at), "d MMM, h:mm a")}
              </div>
            )}
          </div>
        </section>

        <SectionDivider />

        {/* Description */}
        <section className="px-6 py-4">
          <SectionHeader label="Description" />
          <AutoTextarea
            ref={descRef}
            defaultValue={task.description ?? ""}
            onBlur={saveDescription}
            placeholder="Add a description…"
            minRows={3}
            className="focus-ring mt-3 w-full resize-none rounded-md bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-foreground/35"
          />
        </section>

        <SectionDivider />

        {/* Subtasks — only on parent tasks (a subtask itself doesn't
            nest). Stays mounted with the section header so users can
            see the affordance even when the list is empty. */}
        {!task.parent_task_id && (
          <>
            <section className="px-6 py-4">
              <SubtasksSection taskId={task.id} />
            </section>
            <SectionDivider />
          </>
        )}

        {/* Comments */}
        <section className="px-6 py-4">
          <CommentsSection
            taskId={task.id}
            comments={comments}
            setComments={setComments}
            currentUser={currentUser}
            currentUserId={currentUserId}
            members={members}
          />
        </section>
      </div>

      {/* Sticky footer */}
      <DrawerFooter
        done={done}
        pending={pending}
        onToggle={toggleDone}
        onDelete={remove}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete this task?"
        description={
          <>
            <span className="font-medium text-foreground">
              {task?.title || "Untitled task"}
            </span>{" "}
            will be removed for everyone. This can&apos;t be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={actuallyDelete}
      />
    </div>
  );
}

function SectionDivider() {
  // Dividers removed — sections separate by whitespace alone now. Kept
  // as a no-op so existing call sites don't need to disappear; can be
  // deleted entirely once we audit other surfaces using this drawer.
  return null;
}

function SectionHeader({
  icon: _icon,
  label,
  trailing,
}: {
  icon?: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  // icon prop is accepted for backwards compatibility but no longer
  // rendered — section labels are now pure typographic chrome
  // (uppercase + tracked, like the quick-add modal's section labels)
  // so DESCRIPTION / SUBTASKS / COMMENTS read as structural headings
  // rather than competing with the body for visual weight.
  void _icon;
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-foreground/70">
        {label}
      </h3>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

function DetailLabel({ children }: { children: React.ReactNode }) {
  // Label-side icons used to duplicate the icons already inside each
  // picker chip (User next to assignee avatar, Calendar next to date
  // chip, Flag next to priority chip). At 13–14px each pair was just
  // visual noise. Label is now text-only; the chip carries the cue.
  // foreground/65 instead of muted-foreground so the label reads
  // legibly in both themes (muted-foreground at full opacity was
  // still too dim against the dark surface).
  return (
    <dt className="flex h-9 items-center text-[12.5px] font-medium text-foreground/65">
      {children}
    </dt>
  );
}

function DrawerFooter({
  done,
  pending,
  onToggle,
  onDelete,
}: {
  done: boolean;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-border/60 bg-popover px-5 py-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {/* Primary action — full-width emerald pill when the task is open,
          softer ghost when it's already done (so re-opening reads as a
          recovery move, not the headline action). */}
      <button
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md text-[13.5px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.985] disabled:opacity-60 disabled:active:scale-100",
          done
            ? "border border-border bg-card text-foreground hover:bg-accent/40"
            : "bg-emerald-600 text-white shadow-[0_1px_2px_oklch(0_0_0/0.08),inset_0_1px_0_oklch(1_0_0/0.18)] hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
        )}
      >
        <CheckCircle
          size={15}
          weight={done ? "regular" : "fill"}
          className={done ? "text-muted-foreground" : ""}
        />
        {done ? "Reopen task" : "Mark complete"}
      </button>
      <Popover>
        <PopoverTrigger
          aria-label="More actions"
          className="focus-ring grid size-10 shrink-0 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <DotsThree size={18} weight="bold" />
        </PopoverTrigger>
        <PopoverContent className="w-[180px] gap-0 p-1" align="end">
          <PopoverItem onSelect={onDelete}>
            <Trash size={13} className="text-rose-600" />
            <span className="text-rose-600">Delete task</span>
          </PopoverItem>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CommentsSection({
  taskId,
  comments,
  setComments,
  currentUser,
  currentUserId,
  members,
}: {
  taskId: string;
  comments: CommentRow[];
  setComments: React.Dispatch<React.SetStateAction<CommentRow[]>>;
  currentUser: Profile | null;
  currentUserId: string;
  members: Profile[];
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const inputRef = useRef<MentionInputHandle>(null);

  const visible = [...comments].sort((a, b) =>
    sort === "recent"
      ? b.created_at.localeCompare(a.created_at)
      : a.created_at.localeCompare(b.created_at)
  );

  const submit = () => {
    const text = body.trim();
    if (!text || pending) return;

    // Optimistic append
    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentRow = {
      id: tempId,
      task_id: taskId,
      author_id: currentUserId,
      body: text,
      created_at: new Date().toISOString(),
      author: null,
    };
    setComments((prev) => [...prev, optimistic]);
    setBody("");
    playSound("added");

    startTransition(async () => {
      const res = await addComment(taskId, text);
      if (res.error) {
        sileo.error({ title: res.error });
        // Revert
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setBody(text);
        return;
      }
      if (res.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === tempId ? res.comment! : c))
        );
      }
    });
  };

  const remove = (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
    playSound("deleted");
    startTransition(async () => {
      const res = await deleteComment(id);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  return (
    <div>
      <SectionHeader
        icon={<ChatCircle size={14} />}
        label="Comments"
        trailing={
          comments.length > 0 ? (
            <Popover>
              <PopoverTrigger className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground">
                {sort === "recent" ? "Most recent" : "Oldest first"}
                <CaretDown size={10} weight="bold" />
              </PopoverTrigger>
              <PopoverContent className="w-[160px] gap-0 p-1" align="end">
                <PopoverItem
                  selected={sort === "recent"}
                  onSelect={() => setSort("recent")}
                >
                  Most recent
                </PopoverItem>
                <PopoverItem
                  selected={sort === "oldest"}
                  onSelect={() => setSort("oldest")}
                >
                  Oldest first
                </PopoverItem>
              </PopoverContent>
            </Popover>
          ) : (
            <span className="text-[11.5px] tabular-nums text-foreground/55">
              0
            </span>
          )
        }
      />

      {comments.length === 0 ? null : (
        <ul className="mt-3 flex flex-col">
          {visible.map((c, i) => (
            <CommentItem
              key={c.id}
              comment={c}
              isMe={c.author_id === currentUserId}
              isLast={i === visible.length - 1}
              onDelete={() => remove(c.id)}
              currentUserId={currentUserId}
            />
          ))}
        </ul>
      )}

      {/* Composer — flat inline area, no nested card. Avatar sits beside
          the input column; the input column has a single thin bottom
          border that brightens on focus. */}
      <div className="mt-4 flex items-start gap-3">
        {currentUser && (
          <span className="mt-1 shrink-0">
            <Avatar
              src={currentUser.avatar_url}
              initials={currentUser.initials}
              color={currentUser.avatar_color}
              size={28}
            />
          </span>
        )}
        <div className="group/composer min-w-0 flex-1 border-b border-border transition-colors focus-within:border-foreground/40">
          <MentionInput
            ref={inputRef}
            value={body}
            onChange={setBody}
            onSubmit={submit}
            members={members}
            placeholder="Add a comment. Type @ to mention a teammate."
            minRows={2}
            ariaLabel="Add a comment"
            className="bg-transparent py-1.5 text-[14px]"
          />
          <div className="flex items-center justify-end gap-2 pb-2">
            <Button
              onClick={submit}
              disabled={!body.trim() || pending}
              size="icon-sm"
              variant="default"
              aria-label="Send comment"
              className="rounded-full"
            >
              {pending ? (
                <CircleNotch size={13} className="animate-spin" />
              ) : (
                <ArrowUp size={13} weight="bold" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Auto-growing textarea ────────────────────────────────────────────────────

interface AutoTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number;
}

const AutoTextarea = forwardRef<HTMLTextAreaElement, AutoTextareaProps>(
  function AutoTextarea({ minRows = 1, onInput, value, defaultValue, ...rest }, ref) {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

    const resize = () => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };

    useLayoutEffect(() => {
      resize();
    }, [value, defaultValue]);

    return (
      <textarea
        ref={innerRef}
        rows={minRows}
        value={value}
        defaultValue={defaultValue}
        onInput={(e) => {
          resize();
          onInput?.(e);
        }}
        {...rest}
      />
    );
  }
);

function CommentItem({
  comment,
  isMe,
  isLast,
  onDelete,
  currentUserId,
}: {
  comment: CommentRow;
  isMe: boolean;
  isLast: boolean;
  onDelete: () => void;
  currentUserId: string;
}) {
  return (
    <li className="flex gap-2.5">
      {/* Left column: avatar + connector line down to the next comment */}
      <div className="flex shrink-0 flex-col items-center">
        <Avatar
          src={comment.author?.avatar_url ?? null}
          initials={comment.author?.initials ?? "?"}
          color={comment.author?.avatar_color ?? "#D4D4D4"}
          size={24}
        />
        {!isLast && (
          <span
            aria-hidden
            className="mt-1 w-px flex-1 bg-border/70"
          />
        )}
      </div>

      <div className="min-w-0 flex-1 pb-3.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-semibold text-foreground">
            {isMe ? "You" : comment.author?.name ?? "Someone"}
          </span>
          <RelativeTime
            date={comment.created_at}
            className="text-[11px] text-muted-foreground/70"
          />
          {isMe && (
            <button
              onClick={onDelete}
              className="focus-ring ml-auto text-[11px] text-muted-foreground hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
        <MentionRenderer
          text={comment.body}
          className="mt-0.5 block text-[13px] leading-relaxed text-foreground"
        />
        <CommentReactions
          commentId={comment.id}
          reactions={comment.reactions ?? []}
          currentUserId={currentUserId}
        />
      </div>
    </li>
  );
}

function Header({
  onClose,
  pending,
}: {
  onClose: () => void;
  pending: boolean;
}) {
  // task / projects / onChangeProject deliberately removed: project
  // context moved out of the header into a Details row (audit fix #6).
  // Header is now pure dismissal chrome — Back on mobile, ✕ on desktop.
  return (
    <div className="flex items-center gap-1 border-b border-border/60 px-3 py-3">
      {/* Mobile: Back arrow is the conventional dismissal pattern for
          a bottom sheet. Hidden on desktop. touch-expand bumps the
          32px visible button to a ~58px hit area on mobile (44pt+
          tap target) without changing the visible size. */}
      <button
        onClick={onClose}
        aria-label="Back"
        className="focus-ring touch-expand grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94] md:hidden"
      >
        <CaretLeft size={14} weight="bold" />
      </button>
      {pending && (
        <CircleNotch size={13} className="animate-spin text-muted-foreground" />
      )}
      {/* Desktop: ✕ is the conventional close affordance. Hidden on
          mobile where Back covers the same intent (and the bottom
          sheet also dismisses on backdrop tap / drag-down).
          touch-expand bumps the 32px button to a 52px desktop hit
          area — better target for mouse imprecision near the edge. */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="focus-ring touch-expand ml-auto grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94] max-md:hidden"
      >
        <X size={14} weight="bold" />
      </button>
    </div>
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

// ── Subtasks ───────────────────────────────────────────────────────────────

interface SubtaskRow {
  id: string;
  title: string;
  status: "todo" | "doing" | "done";
}

function SubtasksSection({ taskId }: { taskId: string }) {
  const [subtasks, setSubtasks] = useState<SubtaskRow[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const addInputRef = useRef<HTMLInputElement>(null);

  // Initial fetch + realtime sync. Comments use the same pattern.
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("tasks")
      .select("id, title, status")
      .eq("parent_task_id", taskId)
      .order("created_at", { ascending: true })
      .then((res: { data: SubtaskRow[] | null }) => {
        if (!active) return;
        setSubtasks(res.data ?? []);
      });

    return () => {
      active = false;
    };
  }, [taskId]);

  const done = subtasks.filter((s) => s.status === "done").length;
  const total = subtasks.length;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    // Optimistic mirror — server confirms with the real id later.
    const tempId = `temp-${Date.now()}`;
    setSubtasks((prev) => [...prev, { id: tempId, title: text, status: "todo" }]);
    setDraft("");
    addInputRef.current?.focus();
    startTransition(async () => {
      const res = await createSubtask({ parentId: taskId, title: text });
      if (res.error) {
        setSubtasks((prev) => prev.filter((s) => s.id !== tempId));
        sileo.error({ title: res.error });
        return;
      }
      if (res.id) {
        setSubtasks((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: res.id! } : s))
        );
      }
    });
  };

  const toggle = (s: SubtaskRow) => {
    const next: "todo" | "done" = s.status === "done" ? "todo" : "done";
    setSubtasks((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, status: next } : x))
    );
    startTransition(async () => {
      const res = await setTaskStatus(s.id, next);
      if (res.error) {
        setSubtasks((prev) =>
          prev.map((x) => (x.id === s.id ? { ...x, status: s.status } : x))
        );
        sileo.error({ title: res.error });
      }
    });
  };

  const remove = (id: string) => {
    const snapshot = subtasks;
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    startTransition(async () => {
      const res = await deleteTask(id);
      if (res.error) {
        setSubtasks(snapshot);
        sileo.error({ title: res.error });
      }
    });
  };

  return (
    <div>
      <SectionHeader
        icon={<CheckCircle size={14} />}
        label="Subtasks"
        trailing={
          total > 0 ? (
            <span className="text-[11.5px] tabular-nums text-muted-foreground">
              {done}/{total}
            </span>
          ) : (
            <span className="text-[11.5px] tabular-nums text-foreground/55">
              0
            </span>
          )
        }
      />

      {/* Progress bar — quiet by default, fills as items are checked. */}
      {total > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${(done / total) * 100}%` }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          />
        </div>
      )}

      <ul className="mt-2.5 flex flex-col">
        <AnimatePresence initial={false}>
          {subtasks.map((s) => (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{
                type: "spring",
                duration: 0.28,
                bounce: 0.18,
              }}
              className="group flex items-center gap-2.5 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/30"
            >
              <button
                type="button"
                onClick={() => toggle(s)}
                aria-label={
                  s.status === "done" ? "Mark not done" : "Mark complete"
                }
                className={cn(
                  "focus-ring grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] transition-colors duration-150 ease-[var(--ease-out)] active:scale-95",
                  s.status === "done"
                    ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
                    : "border-border hover:border-foreground/40 bg-background"
                )}
              >
                {s.status === "done" && (
                  <Check
                    size={11}
                    weight="bold"
                    className="text-white"
                  />
                )}
              </button>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-[13px]",
                  s.status === "done"
                    ? "text-muted-foreground line-through decoration-muted-foreground/40"
                    : "text-foreground"
                )}
              >
                {s.title}
              </span>
              <button
                type="button"
                onClick={() => remove(s.id)}
                aria-label="Delete subtask"
                className="focus-ring grid size-6 place-items-center rounded text-muted-foreground/60 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
              >
                <X size={12} weight="bold" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* Add-subtask row — inline, no popover. Hitting Enter adds and
          keeps focus so users can hammer in a checklist quickly. */}
      {adding ? (
        <form onSubmit={submit} className="mt-1 flex items-center gap-2 px-1">
          <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-dashed border-muted-foreground/40" />
          <input
            ref={addInputRef}
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (!draft.trim()) setAdding(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setDraft("");
                setAdding(false);
              }
            }}
            placeholder="Subtask name"
            className="focus-ring h-7 flex-1 rounded-md bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="focus-ring mt-2 flex items-center gap-2 rounded-md px-1 py-1.5 text-[13px] text-foreground/75 transition-colors hover:text-foreground"
        >
          <Plus size={13} weight="bold" />
          Add subtask
        </button>
      )}
    </div>
  );
}

// ── Assignee avatar-stack picker ───────────────────────────────────────────

function AssigneeStackPicker({
  taskId,
  members,
  currentUserId,
  assigneeIds,
  setAssigneeIds,
  primaryId,
  onSetPrimary,
}: {
  taskId: string;
  members: Profile[];
  currentUserId: string;
  assigneeIds: string[];
  setAssigneeIds: React.Dispatch<React.SetStateAction<string[]>>;
  primaryId: string | null;
  onSetPrimary: (id: string | null) => void;
}) {
  const [, startTransition] = useTransition();
  const byId = new Map(members.map((m) => [m.id, m]));
  const assignees = assigneeIds
    .map((id) => byId.get(id))
    .filter((m): m is Profile => Boolean(m));
  // Sort so primary comes first in the stack.
  const sorted = [...assignees].sort((a, b) => {
    if (a.id === primaryId) return -1;
    if (b.id === primaryId) return 1;
    return 0;
  });

  const toggle = (m: Profile) => {
    const has = assigneeIds.includes(m.id);
    if (has) {
      // Optimistic remove
      const next = assigneeIds.filter((id) => id !== m.id);
      setAssigneeIds(next);
      startTransition(async () => {
        const res = await removeTaskAssignee(taskId, m.id);
        if (res.error) {
          setAssigneeIds(assigneeIds);
          sileo.error({ title: res.error });
        } else if (m.id === primaryId) {
          // The action also cleared assignee_id; reflect that here.
          onSetPrimary(next[0] ?? null);
        }
      });
    } else {
      // Optimistic add. First add becomes the primary so legacy queries
      // (My work, Inbox) see the task.
      const next = [...assigneeIds, m.id];
      setAssigneeIds(next);
      const shouldPromote = assigneeIds.length === 0;
      startTransition(async () => {
        const res = await addTaskAssignee(taskId, m.id);
        if (res.error) {
          setAssigneeIds(assigneeIds);
          sileo.error({ title: res.error });
          return;
        }
        if (shouldPromote) onSetPrimary(m.id);
      });
    }
  };

  return (
    <Popover>
      <PopoverTrigger className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-1.5 pr-2.5 text-[12px] font-medium text-foreground transition-colors hover:brightness-[0.97]">
        {sorted.length === 0 ? (
          <>
            <UserPlus size={13} className="text-muted-foreground" />
            Assign
          </>
        ) : (
          <>
            <span className="flex items-center">
              {sorted.slice(0, 3).map((m, i) => (
                <span
                  key={m.id}
                  className="ring-1 ring-card"
                  style={{ marginLeft: i === 0 ? 0 : -6 }}
                >
                  <Avatar
                    src={m.avatar_url}
                    initials={m.initials}
                    color={m.avatar_color}
                    size={18}
                  />
                </span>
              ))}
            </span>
            <span>
              {sorted.length === 1
                ? sorted[0].id === currentUserId
                  ? "Me"
                  : sorted[0].name.split(/\s+/)[0]
                : `${sorted.length} assignees`}
            </span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[240px] gap-0 p-1" align="start">
        <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assignees
        </p>
        {members.map((m) => {
          const isAssigned = assigneeIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m)}
              aria-pressed={isAssigned}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent/40",
                isAssigned && "bg-primary/8 text-primary"
              )}
            >
              <Avatar
                src={m.avatar_url}
                initials={m.initials}
                color={m.avatar_color}
                size={20}
              />
              <span className="min-w-0 flex-1 truncate">
                {m.name}
                {m.id === currentUserId ? " (you)" : ""}
              </span>
              {isAssigned && (
                <Check
                  size={12}
                  weight="bold"
                  className="shrink-0 text-primary"
                />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
