"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams, usePathname } from "next/navigation";
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
  ArrowsClockwise,
  ArrowUp,
  CalendarBlank,
  CaretDown,
  CaretLeft,
  Check,
  CheckCircle,
  ChatCircle,
  CircleNotch,
  Copy,
  DotsThree,
  FileDoc,
  FileHtml,
  FilePdf,
  Flag,
  Folder,
  Image as ImageIcon,
  LinkSimple,
  Paperclip,
  Plus,
  Trash,
  Tray,
  UserPlus,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/lib/use-is-mobile";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  addComment,
  addTaskAssignee,
  addTaskAttachmentFile,
  addTaskAttachmentLink,
  createSubtask,
  deleteComment,
  deleteTask,
  removeTaskAttachment,
  removeTaskAssignee,
  setTaskStatus,
  updateTask,
  type CommentRow,
  type TaskAttachmentRow,
} from "@/lib/actions";
import { compressImage } from "@/lib/compress-image";
import {
  RECURRENCE_OPTIONS,
  isRecurrence,
  recurrenceLabel,
} from "@/lib/recurrence";
import { playSound } from "@/lib/sounds";
import { RelativeTime } from "@/components/relative-time";
import { CommentReactions } from "@/components/comment-reactions";
import {
  MentionInput,
  type MentionInputHandle,
} from "@/components/mention-input";
import { MentionText } from "@/components/mention-text";
import type { Profile, Project, TaskWithRelations } from "@/lib/queries";
import { Avatar } from "@/components/avatar";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useOptimisticDeletes } from "@/components/optimistic-deletes";
import { projectColor } from "@/components/project-dot";
import { Button } from "@/components/ui/button";

// Monotonic ids for optimistic comment rows. Avoids Date.now() in the
// submit handlers, which the react-compiler purity lint flags.
let optimisticCommentSeq = 0;
const tempCommentId = () => `temp-${++optimisticCommentSeq}`;

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

// End of today (23:59), used as the default anchor when a recurrence is
// set on a task that has no due date yet.
function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d.toISOString();
}


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
  const pathname = usePathname();
  const taskId = params.get("task");
  const [mounted, setMounted] = useState(false);
  // Chat panel toggle. Lifted out of DrawerInner so the outer modal
  // motion.div can animate its width when the panel opens, and so the
  // preference persists across task-to-task switching within a
  // session. Always starts closed on first open.
  const [chatOpen, setChatOpen] = useState(false);
  // Mobile sheet drag is owned by the panel but only activates from
  // the handle. Without this split, motion's drag listener captures
  // every touch in the panel and breaks inner scrolling on phones.
  const dragControls = useDragControls();

  useEffect(() => setMounted(true), []);

  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("task");
    const qs = next.toString();
    // history.replaceState updates the URL without a Next router push.
    // No server component on these routes reads ?task, so router.replace
    // would refetch the route's RSC payload for nothing. useSearchParams
    // (and the AnimatePresence on taskId) picks up the change.
    const href = qs ? `${pathname}?${qs}` : (pathname ?? "/");
    window.history.replaceState(null, "", href);
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
            className="absolute inset-0 bg-scrim/40 supports-backdrop-filter:backdrop-blur-sm md:bg-scrim/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
          />
          {/* Desktop: centered modal. Was a slide-from-right side
              panel; the modal reads as "look at this one thing" while
              the drawer read as "spreadsheet sidebar." Mobile still
              uses the bottom-sheet below. Bounded height so a long
              task with many comments scrolls internally instead of
              pushing the modal off-screen.
              Width grows from 720 → 1060 when the chat panel opens,
              animated via Framer so the page rebalances under the
              centered modal instead of jumping. */}
          <motion.div
            key="panel-desktop"
            initial={{ opacity: 0, scale: 0.96, maxWidth: chatOpen ? 1060 : 720 }}
            animate={{
              opacity: 1,
              scale: 1,
              maxWidth: chatOpen ? 1060 : 720,
            }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{
              duration: 0.22,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden w-full -translate-x-1/2 -translate-y-1/2 flex-col px-4 md:flex"
            // Modal sizes to the LEFT-SIDE task body content, up to a
            // cap. The chat panel is decoupled from row height-sizing
            // (its content is absolute-positioned, see the chat panel
            // slot below) so adding comments scrolls inside the panel
            // instead of growing the modal. minHeight gives the modal
            // visible presence when the task body is sparse.
            style={{
              maxHeight: "min(82dvh, 800px)",
              minHeight: "min(420px, 70dvh)",
            }}
          >
            <div className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-[var(--shadow-soft-xl)]">
              <DrawerInner
                taskId={taskId}
                projects={projects}
                members={members}
                currentUserId={currentUserId}
                onClose={close}
                chatOpen={chatOpen}
                onToggleChat={() => setChatOpen((v) => !v)}
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
            <div className="flex h-full flex-col overflow-hidden rounded-t-2xl border-t border-border/60 bg-popover shadow-[var(--shadow-soft-xl)]">
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
                chatOpen={false}
                onToggleChat={undefined}
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
  chatOpen,
  onToggleChat,
}: {
  taskId: string;
  projects: Project[];
  members: Profile[];
  currentUserId: string;
  onClose: () => void;
  /** Chat panel state lifted to TaskDrawer so the outer motion.div
   *  can animate its width and the preference survives task switches. */
  chatOpen: boolean;
  /** undefined on mobile — the chat panel is desktop-only. */
  onToggleChat?: () => void;
}) {
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const isMobile = useIsMobile();
  // Shared optimistic-delete store. Lets the drawer's delete hide the
  // underlying row in the list immediately instead of waiting for
  // server revalidation to remove it.
  const optimisticDeletes = useOptimisticDeletes();
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
    const commentsP = ((supabase as any)
      .from("task_comments")
      .select(
        "id, task_id, author_id, body, parent_comment_id, created_at, author:profiles!task_comments_author_id_fkey(id, name, initials, avatar_color, avatar_url), reactions:comment_reactions(emoji, user_id)"
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }));

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

  // The task came back missing — it was just deleted, or the ?task deep
  // link points at something gone. Don't strand the user on a dead-end
  // "deleted" screen; quietly dismiss the drawer.
  useEffect(() => {
    if (!loading && !task) onClose();
  }, [loading, task, onClose]);

  // Skeleton → content cross-blur (transitions.dev). The skeleton and the
  // loaded body share identical chrome, so when data lands we mount an
  // identical skeleton *overlay* on top of the now-rendered content and
  // blur it away — the values appear to resolve in place rather than the
  // panel swapping screens. Replays on each task switch (loading re-arms).
  const [revealOverlay, setRevealOverlay] = useState(false);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (loading || !task) return;
    setRevealOverlay(true);
    setRevealed(false);
    let raf2 = 0;
    // Two frames so the overlay paints opaque before we flip .is-revealed,
    // otherwise the cross-blur has nothing to transition from.
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true));
    });
    // Unmount just after --reveal-dur (400ms) finishes.
    const done = setTimeout(() => setRevealOverlay(false), 520);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(done);
    };
  }, [loading, task]);

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
    if (changes.recurrence !== undefined)
      optimistic.recurrence = changes.recurrence;
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
      const id = sileo.success({
        title: "Marked complete",
        description: task.title,
        button: {
          title: "Undo",
          onClick: () => {
            sileo.dismiss(id);
            setStatus("todo");
          },
        },
        duration: 6000,
      });
    } else {
      playSound("uncomplete");
      setStatus("todo");
      sileo.success({ title: "Reopened", description: task.title });
    }
    // Mobile: dismiss the sheet so the user lands back on the list with
    // the new state visible. Desktop keeps the side panel open since it
    // sits alongside the list, not over it.
    if (isMobile) onClose();
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
    const id = task.id;
    const title = task.title;
    // Optimistic + undoable, matching the task row: close the drawer and
    // hide the row immediately, but defer the real server delete so the
    // Undo toast can cancel it. The timer lives in the app-level store,
    // so it fires (or cancels) regardless of this drawer unmounting.
    optimisticDeletes.scheduleDelete(id, async () => {
      const res = await deleteTask(id);
      if (res.error) {
        sileo.error({ title: res.error });
        optimisticDeletes.unhide(id);
      }
    });
    onClose();
    playSound("deleted");
    const toastId = sileo.success({
      title: "Task deleted",
      description: title,
      button: {
        title: "Undo",
        onClick: () => {
          sileo.dismiss(toastId);
          optimisticDeletes.cancelDelete(id);
          playSound("uncomplete");
        },
      },
      duration: 5000,
    });
  };

  // Skeleton state — same chrome as the loaded drawer (header,
  // scroll area, footer) with structural placeholders inside. The
  // earlier centered spinner produced an empty-looking panel for
  // ~100-300ms after the slide-in finished, so the drawer "appeared"
  // but the body was blank until data landed. The skeleton keeps the
  // perceived response time at zero: the layout is right immediately,
  // the values fill in.
  if (loading) {
    return <DrawerSkeleton onClose={onClose} />;
  }

  // Missing task: render nothing — the effect above dismisses the drawer
  // on the next tick, so we don't flash a "deleted" dead-end.
  if (!task) return null;

  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.p === task.priority)!;
  const due = task.due_at ? new Date(task.due_at) : null;
  const overdue = due && isPast(due) && !isToday(due) && task.status !== "done";
  const done = task.status === "done";
  const currentUser = members.find((m) => m.id === currentUserId) ?? null;

  // Chip tones — color lives in the ICON only, not the whole pill.
  // The chip body is a quiet neutral card across the board, so the
  // row scans cleanly and doesn't read as a wall of warning labels.
  // Semantic meaning still travels: a rose flag means high priority
  // at a glance, an amber calendar means due-today, etc.
  const dueIconTone =
    overdue || (due && isToday(due))
      ? "text-rose-600 dark:text-rose-300"
      : "text-muted-foreground";

  const priorityIconTone: Record<Priority, string> = {
    1: "text-rose-600 dark:text-rose-300",
    2: "text-amber-600 dark:text-amber-300",
    3: "text-emerald-600 dark:text-emerald-300",
    4: "text-muted-foreground",
  };

  // Neutral chip: hairline-bordered pill on the card surface. No
  // chip-3d shadow stack (was making the chips feel heavy); just a
  // single hairline ring + subtle hover lift via accent. rounded-md
  // for soft corners that match the modal card.
  const chipBase =
    "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-2.5 text-[12px] font-medium text-foreground ring-1 ring-inset ring-border/70 transition-colors hover:bg-accent/40";

  return (
    <div className={cn("t-skel flex h-full flex-col", revealed && "is-revealed")}>
      <Header
        onClose={onClose}
        pending={pending}
        task={task}
        onDelete={remove}
        done={done}
        onToggleDone={toggleDone}
        chatOpen={chatOpen}
        onToggleChat={onToggleChat}
        commentCount={comments.length}
      />

      {/* Body region. When the chat panel is open, this splits into a
          horizontal flex: scrollable task body on the left, chat panel
          on the right. Mobile (chatOpen is forced false) collapses
          back to the single column it always was. */}
      <div className="flex min-h-0 flex-1">
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto overscroll-contain">
        {/* Title row. No checkbox here: the Mark-as-complete pill in
            the header is the single completion CTA. A checkbox next
            to the title duplicates that intent and adds an extra hit
            target the eye has to parse before reading the title. */}
        <section className="px-6 pb-4 pt-6">
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

        {/* Chip row — the task's editable properties flattened into
            one horizontal cluster, no DetailRow labels. Mirrors the
            reference: avatar stack, date, priority, project all sit
            as peers under the title. Each chip stays a click-to-edit
            popover; only the label-icon-vertical-list scaffolding is
            gone. */}
        <section className="flex flex-wrap items-center gap-2 px-6 pb-5">
          <AssigneeStackPicker
            taskId={task.id}
            members={members}
            currentUserId={currentUserId}
            assigneeIds={assigneeIds}
            setAssigneeIds={setAssigneeIds}
            primaryId={task.assignee?.id ?? null}
            onSetPrimary={(id) => patch({ assigneeId: id })}
          />

          <Popover>
            <PopoverTrigger className={chipBase}>
              <CalendarBlank
                size={13}
                weight="fill"
                className={dueIconTone}
              />
              <span className="tabular-nums">
                {due ? formatDueShort(due) : "No date"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-auto gap-0 p-0" align="start">
              <DatePicker
                value={due}
                onChange={(d) =>
                  patch({ dueAt: d ? d.toISOString() : null })
                }
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className={chipBase}>
              <Flag
                size={13}
                weight={task.priority === 4 ? "regular" : "fill"}
                className={priorityIconTone[task.priority as Priority]}
              />
              {priorityOpt.label}
            </PopoverTrigger>
            <PopoverContent className="w-[180px]" align="start">
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

          <Popover>
            <PopoverTrigger className={chipBase}>
              {task.project ? (
                <>
                  <Folder
                    size={13}
                    weight="fill"
                    style={{ color: projectColor(task.project as Project) }}
                  />
                  <span className="truncate">{task.project.name}</span>
                </>
              ) : (
                <>
                  <Tray size={13} className="text-muted-foreground" />
                  <span>Inbox</span>
                </>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-[240px]" align="start">
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
                  <Folder
                    size={14}
                    weight="fill"
                    style={{ color: projectColor(p) }}
                  />
                  <span className="truncate">{p.name}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className={chipBase}>
              <ArrowsClockwise
                size={13}
                weight="bold"
                className={
                  isRecurrence(task.recurrence)
                    ? "text-primary-readable"
                    : "text-muted-foreground"
                }
              />
              <span>
                {isRecurrence(task.recurrence)
                  ? recurrenceLabel(task.recurrence)
                  : "Repeat"}
              </span>
            </PopoverTrigger>
            <PopoverContent className="w-[200px]" align="start">
              <PopoverItem
                selected={!isRecurrence(task.recurrence)}
                onSelect={() => patch({ recurrence: null })}
              >
                <span>Doesn&apos;t repeat</span>
              </PopoverItem>
              {RECURRENCE_OPTIONS.map((r) => (
                <PopoverItem
                  key={r}
                  selected={task.recurrence === r}
                  onSelect={() =>
                    patch({
                      // A recurrence needs an anchor date; default to today
                      // if the task has none yet.
                      recurrence: r,
                      ...(task.due_at
                        ? {}
                        : { dueAt: endOfTodayIso() }),
                    })
                  }
                >
                  <ArrowsClockwise
                    size={14}
                    weight="bold"
                    className="text-muted-foreground"
                  />
                  <span>{recurrenceLabel(r)}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>

          {/* Created + Completed — one quiet line, pushed to the end
              of the chip row when there's space, wrapping below
              otherwise. Less weight than its own row but still in
              view for auditability. */}
          <p className="ml-auto flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
            <span>
              by{" "}
              <span className="text-foreground/75">
                {task.author?.name ?? "Unknown"}
              </span>
              {" · "}
              <span className="tabular-nums">
                {format(new Date(task.created_at), "d MMM")}
              </span>
            </span>
            {task.completed_at && (
              <>
                <span className="text-foreground/30">·</span>
                <span className="inline-flex items-center gap-1 text-primary-readable">
                  <CheckCircle size={11} weight="fill" />
                  <span className="tabular-nums">
                    {format(new Date(task.completed_at), "d MMM")}
                  </span>
                </span>
              </>
            )}
          </p>
        </section>

        {/* Description: a visible, bordered field so the writable region
            reads as an input even when empty (a borderless textarea just
            floated placeholder text and left the modal feeling hollow).
            Roomy min height fills the space above Subtasks. */}
        <section className="px-6 pb-5">
          <AutoTextarea
            ref={descRef}
            defaultValue={task.description ?? ""}
            onBlur={saveDescription}
            placeholder="Add a description…"
            minRows={4}
            className="focus-ring w-full resize-none rounded-lg border border-border/70 bg-transparent px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-foreground/45 hover:border-border"
          />
        </section>

        <SectionDivider />

        {/* Subtasks — only on parent tasks (a subtask itself doesn't
            nest). Stays mounted with the section header so users can
            see the affordance even when the list is empty. */}
        {!task.parent_task_id && (
          <>
            <section className="px-6 py-5">
              <SubtasksSection taskId={task.id} />
            </section>
            <SectionDivider />
          </>
        )}

        {/* Attachments — files + links the task carries. Reads from
            task_attachments; adds run client-side (storage upload for
            files, direct insert for links). */}
        <section className="px-6 py-5">
          <AttachmentsSection taskId={task.id} />
        </section>

        {/* Comments — mobile only. Desktop accesses them via the
            chat bubble in the header, which opens the right-side
            Chat panel. Mobile sheets have no horizontal room for a
            side panel, so the section stays inline there. */}
        <div className="md:hidden">
          <SectionDivider />
          <section className="px-6 py-5">
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
        </div>

        {/* Right-side Chat panel. The outer slot is a 340px wide
            position:relative column with NO natural height — its inner
            content is absolutely positioned so its content height
            never feeds back into the body-row's height calculation.
            That decouples the modal's overall height from the number
            of comments: the modal sizes to the task body on the left,
            and the comments feed scrolls inside the panel regardless. */}
        {chatOpen && task && (
          <div className="relative hidden w-[340px] shrink-0 border-l border-border/60 bg-popover md:block">
            <div className="absolute inset-0 flex flex-col">
              <CommentsSection
                taskId={task.id}
                comments={comments}
                setComments={setComments}
                currentUser={currentUser}
                currentUserId={currentUserId}
                members={members}
                variant="panel"
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile-only footer. Desktop modal lifts the Mark-complete
          action up into the header pill (always visible), so a footer
          would be a duplicate CTA. Mobile keeps it for thumb reach. */}
      <div className="md:hidden">
        <DrawerFooter done={done} pending={pending} onToggle={toggleDone} />
      </div>

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

      {/* Identical skeleton overlay that blurs away once data lands — the
          .t-skel-skeleton half of the reveal. Content sits in normal flow
          beneath it (so height is correct); the overlay is pointer-through
          so the real body is interactive immediately. */}
      {revealOverlay && (
        <div
          className="t-skel-skeleton pointer-events-none"
          style={{ zIndex: 30 }}
          aria-hidden
        >
          <DrawerSkeleton onClose={onClose} />
        </div>
      )}
    </div>
  );
}

function SectionDivider() {
  // Dividers removed — sections separate by whitespace alone now. Kept
  // as a no-op so existing call sites don't need to disappear; can be
  // deleted entirely once we audit other surfaces using this drawer.
  return null;
}

/**
 * Loading state for the drawer. Mirrors the real layout 1-to-1 so the
 * transition from skeleton → loaded reads as "values filling in," not
 * "different screen replaced the old one."
 *
 * The Header + DrawerFooter are real (header navigation works even
 * while data loads; the footer's primary CTA is disabled until the
 * task is in hand). The body holds shape-matched bars where Title,
 * Details rows, Description, Subtasks header, and Comments composer
 * would be.
 */
function DrawerSkeleton({ onClose }: { onClose: () => void }) {
  // Skeleton mirrors the loaded modal's flat layout: title at the top,
  // a single horizontal chip row, plain description block, then the
  // sections (subtasks / attachments). No DetailRow grid, no green
  // footer button — those were carried over from the old drawer and
  // caused the "flash of old UI" before content arrived.
  return (
    <div className="flex h-full flex-col">
      <Header onClose={onClose} pending={false} />
      <div className="flex-1 overflow-y-auto">
        {/* Title — single line, matches the 22px title-textarea height. */}
        <section className="px-6 pb-4 pt-6">
          <SkeletonBar className="h-[28px] w-[72%]" />
        </section>

        {/* Chip row — four pill placeholders to mirror the avatar
            stack + date + priority + project chips. */}
        <section className="flex flex-wrap items-center gap-2 px-6 pb-5">
          <SkeletonBar className="h-7 w-[72px] rounded-md" />
          <SkeletonBar className="h-7 w-[88px] rounded-md" />
          <SkeletonBar className="h-7 w-[78px] rounded-md" />
          <SkeletonBar className="h-7 w-[120px] rounded-md" />
        </section>

        {/* Description placeholder — two lines of plain text, no card. */}
        <section className="flex flex-col gap-2 px-6 pb-5">
          <SkeletonBar className="h-3 w-full" />
          <SkeletonBar className="h-3 w-[68%]" />
        </section>

        <SectionDivider />

        {/* Subtasks header + add-row placeholder. */}
        <section className="px-6 py-5">
          <SkeletonBar className="h-3.5 w-16" />
          <SkeletonBar className="mt-3 h-4 w-28" />
        </section>

        <SectionDivider />

        {/* Attachments header + add-row placeholder. */}
        <section className="px-6 py-5">
          <SkeletonBar className="h-3.5 w-20" />
          <SkeletonBar className="mt-3 h-4 w-32" />
        </section>
      </div>
    </div>
  );
}

/**
 * One-line skeleton primitive. Pulses gently via Tailwind's `animate-pulse`,
 * tinted with the muted token so it tracks the active theme.
 */
function SkeletonBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/15",
        className
      )}
    />
  );
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
  // Quiet sentence-case section labels (Description / Subtasks /
  // Comments) so they read as structural dividers under the 22px
  // task title without going eyebrow-style. icon prop kept for
  // back-compat with old call sites but no longer rendered.
  void _icon;
  return (
    <div className="flex items-center gap-2">
      <h3 className="text-[13px] font-semibold text-foreground/80">
        {label}
      </h3>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

function DrawerFooter({
  done,
  pending,
  onToggle,
}: {
  done: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  // Footer is single-purpose: Mark complete / Reopen. Overflow actions
  // (Delete) live in the header next to the close button, keeping this
  // shelf a clean primary-action surface.
  return (
    <div className="border-t border-border/60 bg-popover px-5 py-3 max-md:pb-[max(env(safe-area-inset-bottom),3.5rem)]">
      <button
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-[13px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.99] disabled:opacity-60 disabled:active:scale-100",
          done
            ? "border border-border bg-card text-foreground shadow-[var(--shadow-cta-secondary)] hover:bg-accent/40"
            : "surface-brand surface-brand-hover text-primary-foreground shadow-[var(--shadow-cta)]"
        )}
      >
        <CheckCircle
          size={15}
          weight={done ? "regular" : "fill"}
          className={done ? "text-muted-foreground" : ""}
        />
        {done ? "Reopen task" : "Mark complete"}
      </button>
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
  variant = "inline",
}: {
  taskId: string;
  comments: CommentRow[];
  setComments: React.Dispatch<React.SetStateAction<CommentRow[]>>;
  currentUser: Profile | null;
  currentUserId: string;
  members: Profile[];
  /** "inline" (default) for the mobile sheet's stacked-content body.
   *  "panel" for the desktop side panel: full-height flex column with
   *  a scrolling feed and a pinned composer at the bottom. */
  variant?: "inline" | "panel";
}) {
  const isPanel = variant === "panel";
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const inputRef = useRef<MentionInputHandle>(null);

  // Group comments by parent. `roots` contains top-level comments;
  // `replies[parentId]` contains the chronologically-ordered replies
  // for that parent. Done once per comments-array change, not per row.
  const { roots, replies } = useMemo(() => {
    const rootArr: CommentRow[] = [];
    const replyMap: Record<string, CommentRow[]> = {};
    for (const c of comments) {
      if (c.parent_comment_id) {
        (replyMap[c.parent_comment_id] ??= []).push(c);
      } else {
        rootArr.push(c);
      }
    }
    // Replies always render oldest → newest (conversation reads top-to-bottom).
    for (const id of Object.keys(replyMap)) {
      replyMap[id].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    rootArr.sort((a, b) =>
      sort === "recent"
        ? b.created_at.localeCompare(a.created_at)
        : a.created_at.localeCompare(b.created_at)
    );
    return { roots: rootArr, replies: replyMap };
  }, [comments, sort]);

  const submit = (parentId: string | null = null) => {
    const text = body.trim();
    if (!text || pending) return;

    // Optimistic append
    const tempId = tempCommentId();
    const optimistic: CommentRow = {
      id: tempId,
      task_id: taskId,
      author_id: currentUserId,
      body: text,
      parent_comment_id: parentId,
      created_at: new Date().toISOString(),
      author: null,
    };
    setComments((prev) => [...prev, optimistic]);
    setBody("");
    playSound("added");

    startTransition(async () => {
      const res = await addComment(taskId, text, parentId);
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

  // Submit reply uses a separate body buffer to keep the main composer
  // independent from the in-thread reply box. Each <ReplyComposer/>
  // owns its own buffer below.
  const submitReply = (parentId: string, text: string) => {
    if (!text.trim()) return;
    const tempId = tempCommentId();
    const optimistic: CommentRow = {
      id: tempId,
      task_id: taskId,
      author_id: currentUserId,
      body: text.trim(),
      parent_comment_id: parentId,
      created_at: new Date().toISOString(),
      author: null,
    };
    setComments((prev) => [...prev, optimistic]);
    playSound("added");
    startTransition(async () => {
      const res = await addComment(taskId, text.trim(), parentId);
      if (res.error) {
        sileo.error({ title: res.error });
        setComments((prev) => prev.filter((c) => c.id !== tempId));
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

  // Reused empty state — quiet centered line. Panel mode pads it
  // vertically so it doesn't crowd the composer below.
  const emptyState = (
    <p
      className={cn(
        "text-center text-[12px] text-muted-foreground",
        isPanel ? "py-10" : "mt-4"
      )}
    >
      No comments yet
    </p>
  );

  // Reused list — same CommentItem rendering for both variants.
  const list = (
    <ul className={cn("flex flex-col", isPanel ? "" : "mt-3")}>
      {roots.map((c, i) => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={replies[c.id] ?? []}
          currentUser={currentUser}
          currentUserId={currentUserId}
          members={members}
          isLast={i === roots.length - 1}
          onDelete={() => remove(c.id)}
          onSubmitReply={(text) => submitReply(c.id, text)}
        />
      ))}
    </ul>
  );

  // Composer — single bordered card so the input region is
  // unmistakably "type here." Send button lives inside, bottom-right,
  // and turns primary as soon as there's content to send.
  const composer = (
    <div className="group/composer rounded-xl border border-border/60 bg-card px-3 py-2 transition-colors focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-foreground/10">
      <MentionInput
        ref={inputRef}
        value={body}
        onChange={setBody}
        onSubmit={() => submit(null)}
        members={members}
        placeholder="Add a comment. Type @ to mention a teammate."
        minRows={isPanel ? 1 : 2}
        ariaLabel="Add a comment"
        className="bg-transparent py-0.5 text-[13px]"
      />
      <div className="flex items-center justify-end pt-1">
        <Button
          onClick={() => submit(null)}
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
  );

  if (isPanel) {
    // Chat-app layout: scrollable feed on top, pinned composer at the
    // bottom. The panel itself is height-bounded by its parent
    // (the modal), and this flex column fills it. The sort dropdown
    // moves up into a small bar so it doesn't intrude on the
    // standalone-surface feel.
    return (
      <div className="flex h-full min-h-0 flex-col">
        {comments.length > 0 && (
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {comments.length}{" "}
              {comments.length === 1 ? "comment" : "comments"}
            </span>
            <Popover>
              <PopoverTrigger className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground">
                {sort === "recent" ? "Most recent" : "Oldest first"}
                <CaretDown size={10} weight="bold" />
              </PopoverTrigger>
              <PopoverContent className="w-[160px]" align="end">
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
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {roots.length === 0 ? emptyState : list}
        </div>
        <div className="shrink-0 border-t border-border/60 p-3">
          {composer}
        </div>
      </div>
    );
  }

  // Inline (mobile sheet): stacked content with the standard section
  // header on top, list and composer below as flow content.
  return (
    <div>
      <SectionHeader
        icon={<ChatCircle size={14} />}
        label="Comments"
        trailing={
          comments.length > 0 ? (
            <Popover>
              <PopoverTrigger className="focus-ring inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground">
                {sort === "recent" ? "Most recent" : "Oldest first"}
                <CaretDown size={10} weight="bold" />
              </PopoverTrigger>
              <PopoverContent className="w-[160px]" align="end">
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
            <span className="text-[11px] tabular-nums text-foreground/55">
              0
            </span>
          )
        }
      />

      {roots.length === 0 ? emptyState : list}

      <div className="mt-4">{composer}</div>
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
  replies,
  currentUserId,
  members,
  isLast,
  onDelete,
  onSubmitReply,
}: {
  comment: CommentRow;
  /** Direct replies to this comment, oldest → newest. */
  replies: CommentRow[];
  currentUser: Profile | null;
  currentUserId: string;
  members: Profile[];
  isLast: boolean;
  onDelete: () => void;
  onSubmitReply: (text: string) => void;
}) {
  const isMe = comment.author_id === currentUserId;
  // Threads collapse by default — long discussions stay scannable.
  // Click "N replies" to expand; the composer reveals together with
  // the replies so the user can pick up the conversation immediately.
  const [expanded, setExpanded] = useState(false);
  const hasReplies = replies.length > 0;

  return (
    <li className="flex gap-2.5">
      {/* Left column: avatar + connector line down to the next comment */}
      <div className="flex shrink-0 flex-col items-center">
        <Avatar
          src={comment.author?.avatar_url ?? null}
          initials={comment.author?.initials ?? "?"}
          color={comment.author?.avatar_color ?? "#94A3B8"}
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
          <span className="text-[12px] font-semibold text-foreground">
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
        <MentionText
          text={comment.body}
          className="mt-0.5 block text-[13px] leading-relaxed text-foreground"
        />
        <CommentReactions
          commentId={comment.id}
          reactions={comment.reactions ?? []}
          currentUserId={currentUserId}
        />

        {/* Thread toggle — appears below the comment body. When
            collapsed, shows "N replies · last reply 2h ago" with an
            avatar peek of the most recent replier. When expanded, the
            replies + a fresh reply composer appear, indented under
            this comment. */}
        <div className="mt-1.5 flex items-center gap-2">
          {hasReplies && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {/* Peek avatar — most recent replier */}
              {(() => {
                const last = replies[replies.length - 1];
                if (!last?.author) return null;
                return (
                  <Avatar
                    src={last.author.avatar_url}
                    initials={last.author.initials}
                    color={last.author.avatar_color}
                    size={14}
                  />
                );
              })()}
              <span>
                {replies.length}{" "}
                {replies.length === 1 ? "reply" : "replies"}
              </span>
              <CaretDown
                size={9}
                weight="bold"
                className={cn(
                  "transition-transform duration-150 ease-[var(--ease-out)]",
                  expanded && "rotate-180"
                )}
              />
            </button>
          )}
          {!expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="focus-ring rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              Reply
            </button>
          )}
        </div>

        {expanded && (
          <div className="mt-2.5 border-l-2 border-border/60 pl-3">
            {replies.length > 0 && (
              <ul className="flex flex-col gap-3">
                {replies.map((r) => (
                  <ReplyItem
                    key={r.id}
                    reply={r}
                    isMe={r.author_id === currentUserId}
                    onDelete={onDelete}
                  />
                ))}
              </ul>
            )}
            <ReplyComposer
              members={members}
              onSubmit={(text) => {
                onSubmitReply(text);
              }}
              onCancel={() => setExpanded(false)}
            />
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * A single reply inside an expanded thread. Lighter visual weight than
 * the root comment — smaller avatar, no reply/delete chrome unless
 * authored by the viewer.
 */
function ReplyItem({
  reply,
  isMe,
  onDelete,
}: {
  reply: CommentRow;
  isMe: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex gap-2">
      <Avatar
        src={reply.author?.avatar_url ?? null}
        initials={reply.author?.initials ?? "?"}
        color={reply.author?.avatar_color ?? "#94A3B8"}
        size={20}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[12px] font-semibold text-foreground">
            {isMe ? "You" : reply.author?.name ?? "Someone"}
          </span>
          <RelativeTime
            date={reply.created_at}
            className="text-[10px] text-muted-foreground/70"
          />
          {isMe && (
            <button
              onClick={onDelete}
              className="focus-ring ml-auto text-[10px] text-muted-foreground hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
        <MentionText
          text={reply.body}
          className="mt-0.5 block text-[12px] leading-relaxed text-foreground"
        />
      </div>
    </li>
  );
}

/**
 * Inline composer inside an expanded thread. Smaller than the main
 * comment composer — replies are quick by definition. Press Cmd+Enter
 * to send, Esc to cancel.
 */
function ReplyComposer({
  members,
  onSubmit,
  onCancel,
}: {
  members: Profile[];
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSubmit(t);
    setText("");
  };
  // Bordered-card composer to match the main one. Drops the leading
  // avatar (the parent comment's author owns the visual identity of
  // the thread; the reply composer here is just "your reply input").
  // Cancel sits left, Send chip sits right inside the card.
  return (
    <div className="group/reply-composer mt-3 rounded-xl border border-border/60 bg-card px-3 py-2 transition-colors focus-within:border-foreground/40 focus-within:ring-1 focus-within:ring-foreground/10">
      <MentionInput
        value={text}
        onChange={setText}
        onSubmit={send}
        members={members}
        placeholder="Reply to this thread..."
        minRows={1}
        ariaLabel="Reply to thread"
        className="bg-transparent py-0.5 text-[13px]"
      />
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="focus-ring rounded-md px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
        >
          Cancel
        </button>
        <Button
          onClick={send}
          disabled={!text.trim()}
          size="icon-sm"
          variant="default"
          aria-label="Send reply"
          className="rounded-full"
        >
          <ArrowUp size={12} weight="bold" />
        </Button>
      </div>
    </div>
  );
}

function Header({
  onClose,
  pending,
  task,
  onDelete,
  done,
  onToggleDone,
  chatOpen,
  onToggleChat,
  commentCount,
}: {
  onClose: () => void;
  pending: boolean;
  task?: TaskWithRelations | null;
  onDelete?: () => void;
  done?: boolean;
  onToggleDone?: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
  commentCount?: number;
}) {
  const copyLink = () => {
    if (!task) return;
    const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`;
    void navigator.clipboard.writeText(url);
    sileo.success({ title: "Link copied" });
  };
  // Header carries dismissal + project breadcrumb + overflow menu.
  // Breadcrumb gives users a visible "where am I" anchor and a quick
  // re-bucket affordance via popover. The dots menu houses task-level
  // actions (Delete) so the footer stays single-purpose. Task /
  // projects / handlers are optional so the skeleton + empty-state
  // headers render the same chrome before data lands.
  return (
    <div className="flex items-center gap-1 border-b border-border/60 px-3 py-2.5">
      {/* Mobile: Back arrow. Desktop: hidden (✕ on the right is the
          dismissal there). touch-expand pads the hit target on mobile. */}
      <button
        onClick={onClose}
        aria-label="Back"
        className="focus-ring touch-expand grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94] md:hidden"
      >
        <CaretLeft size={14} weight="bold" />
      </button>

      {/* Project breadcrumb removed from the header per user note.
          Project switching lives in the chip row below the title
          (folder chip), where it sits alongside the other editable
          properties as a peer instead of as a corner anchor. */}
      {pending && (
        <CircleNotch
          size={12}
          className="ml-1 animate-spin text-muted-foreground"
        />
      )}

      <div className="ml-auto flex items-center gap-1">
        {/* Mark-as-complete pill — primary CTA, moved up from the
            footer so it's always in view while editing. Hollow when
            the task is open, filled blue when already done so the
            reverse-action also reads at a glance. */}
        {task && onToggleDone && (
          <button
            type="button"
            onClick={onToggleDone}
            disabled={pending}
            className={cn(
              "focus-ring inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors disabled:opacity-60",
              done
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]"
            )}
          >
            {done ? (
              <>
                <Check size={12} weight="bold" />
                Completed
              </>
            ) : (
              "Mark as complete"
            )}
          </button>
        )}
        {onToggleChat && (
          <button
            type="button"
            onClick={onToggleChat}
            aria-label={chatOpen ? "Hide comments" : "Show comments"}
            aria-pressed={chatOpen}
            className={cn(
              "focus-ring touch-expand relative grid size-8 place-items-center rounded-md transition-colors max-md:hidden",
              chatOpen
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
            )}
          >
            <ChatCircle size={16} weight={chatOpen ? "fill" : "regular"} />
            {/* Unread-ish badge — just shows there are comments, no
                seen/unread tracking. A tiny dot keeps the chrome
                quiet. */}
            {!chatOpen && commentCount !== undefined && commentCount > 0 && (
              <span
                aria-hidden
                className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary ring-2 ring-popover"
              />
            )}
          </button>
        )}
        {(onDelete || task) && (
          <Popover>
            <PopoverTrigger
              aria-label="More actions"
              className="focus-ring touch-expand grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              <DotsThree size={16} weight="bold" />
            </PopoverTrigger>
            <PopoverContent className="w-[180px]" align="end">
              {task && (
                <PopoverItem onSelect={copyLink}>
                  <Copy size={13} className="text-muted-foreground" />
                  <span>Copy link</span>
                </PopoverItem>
              )}
              {onDelete && (
                <PopoverItem onSelect={onDelete}>
                  <Trash size={13} className="text-rose-600" />
                  <span className="text-rose-600">Delete task</span>
                </PopoverItem>
              )}
            </PopoverContent>
          </Popover>
        )}
        {/* Desktop: ✕ is the dismissal. Hidden on mobile (Back covers it). */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring touch-expand grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94] max-md:hidden"
        >
          <X size={14} weight="bold" />
        </button>
      </div>
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
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors",
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
    const tempId = tempCommentId();
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
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {done}/{total}
            </span>
          ) : (
            <span className="text-[11px] tabular-nums text-foreground/55">
              0
            </span>
          )
        }
      />

      {/* Progress bar — quiet by default, fills as items are checked. */}
      {total > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={false}
            animate={{ width: `${(done / total) * 100}%` }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
          />
        </div>
      )}

      <ul className="mt-3 flex flex-col">
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
                  "focus-ring grid size-6 shrink-0 place-items-center rounded-[6px] border transition-colors duration-150 ease-[var(--ease-out)] active:scale-95",
                  s.status === "done"
                    ? "border-primary bg-primary"
                    : "border-border hover:border-foreground/40 bg-background"
                )}
              >
                {s.status === "done" && (
                  <Check
                    size={13}
                    weight="bold"
                    className="text-primary-foreground"
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
          <span className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-dashed border-muted-foreground/40" />
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
            aria-label="New subtask"
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

// ── Attachments ───────────────────────────────────────────────────────────

/**
 * Lists every attachment on a task and lets the user add / open / remove.
 * Two adders: paste a link, or pick a file. Images get compressed
 * client-side before upload (lib/compress-image.ts). Files land in the
 * task-attachments storage bucket; metadata in task_attachments.
 *
 * UX: tile per attachment with a kind-specific icon (Image / PDF / Doc
 * / HTML / Link / generic file), label, size for files, and a remove X
 * on hover. Click anywhere else on the tile to open in a new tab.
 */
function AttachmentsSection({ taskId }: { taskId: string }) {
  const [items, setItems] = useState<TaskAttachmentRow[]>([]);
  const [adding, setAdding] = useState<"menu" | "link" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Initial fetch.
  useEffect(() => {
    let active = true;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .then((res: { data: TaskAttachmentRow[] | null }) => {
        if (!active) return;
        setItems(res.data ?? []);
      });
    return () => {
      active = false;
    };
  }, [taskId]);

  useEffect(() => {
    if (adding === "link") {
      setTimeout(() => linkInputRef.current?.focus(), 30);
    }
  }, [adding]);

  const pickFile = (accept: string) => {
    setAdding(null);
    const el = fileInputRef.current;
    if (!el) return;
    el.value = "";
    el.accept = accept;
    el.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      sileo.error({
        title: "File too large",
        description: "Uploads are capped at 5 MB. Paste a link for anything larger.",
      });
      return;
    }
    setBusy(true);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setBusy(false);
      sileo.error({ title: "Supabase not configured." });
      return;
    }

    const isImage = file.type.startsWith("image/");
    const compressed = isImage
      ? await compressImage(file)
      : {
          blob: file,
          extension: file.name.split(".").pop() ?? "bin",
          contentType: file.type || "application/octet-stream",
          compressed: false,
        };

    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${taskId}/${Date.now()}-${rand}.${compressed.extension}`;
    const up = await supabase.storage
      .from("task-attachments")
      .upload(path, compressed.blob, {
        contentType: compressed.contentType,
        cacheControl: "31536000",
      });
    if (up.error) {
      sileo.error({ title: up.error.message });
      setBusy(false);
      return;
    }
    const res = await addTaskAttachmentFile(taskId, {
      storagePath: path,
      label: file.name,
      contentType: compressed.contentType,
      sizeBytes: compressed.blob.size,
    });
    setBusy(false);
    if (res.error || !res.attachment) {
      sileo.error({ title: res.error ?? "Couldn't attach file." });
      return;
    }
    setItems((prev) => [...prev, res.attachment!]);
  };

  const submitLink = async () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    const normalized = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    let label = normalized;
    try {
      label = new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      sileo.error({ title: "That doesn't look like a URL" });
      return;
    }
    setBusy(true);
    const res = await addTaskAttachmentLink(taskId, normalized, label);
    setBusy(false);
    if (res.error || !res.attachment) {
      sileo.error({ title: res.error ?? "Couldn't attach link." });
      return;
    }
    setItems((prev) => [...prev, res.attachment!]);
    setLinkUrl("");
    setAdding(null);
  };

  const remove = async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== id));
    const res = await removeTaskAttachment(id);
    if (res.error) {
      setItems(snapshot);
      sileo.error({ title: res.error });
    }
  };

  return (
    <div>
      <SectionHeader
        icon={<Paperclip size={14} />}
        label="Attachments"
        trailing={
          <span className="text-[11px] tabular-nums text-foreground/55">
            {items.length}
          </span>
        }
      />

      {items.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {items.map((a) => (
              <motion.li
                key={a.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", duration: 0.28, bounce: 0.18 }}
                className="group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-foreground/[0.04]"
              >
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2.5"
                >
                  <AttachmentIcon
                    kind={a.kind}
                    contentType={a.content_type}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {a.label}
                  </span>
                  {a.kind === "file" && a.size_bytes != null && (
                    <span className="text-[11px] tabular-nums text-muted-foreground/70">
                      {formatBytes(a.size_bytes)}
                    </span>
                  )}
                </a>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label="Remove attachment"
                  className="focus-ring grid size-6 place-items-center rounded text-muted-foreground/60 opacity-0 transition-colors hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-500/15 dark:hover:text-rose-300"
                >
                  <X size={12} weight="bold" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {/* Adder row — link input is inline; file picker triggers the
          hidden input. Same two-section pattern as the composer's
          attach popover so the vocabulary stays consistent. */}
      {adding === "link" ? (
        <div className="mt-2 flex items-center gap-2 px-1">
          <LinkSimple size={14} className="text-muted-foreground" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            disabled={busy}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitLink();
              } else if (e.key === "Escape") {
                setLinkUrl("");
                setAdding(null);
              }
            }}
            placeholder="https://drive.google.com/..."
            className="focus-ring h-8 flex-1 rounded-md border border-border bg-background px-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/55"
          />
          <button
            type="button"
            onClick={submitLink}
            disabled={!linkUrl.trim() || busy}
            className={cn(
              "focus-ring rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors",
              linkUrl.trim() && !busy
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            )}
          >
            Attach
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkUrl("");
              setAdding(null);
            }}
            aria-label="Cancel"
            className="focus-ring grid size-6 place-items-center rounded text-muted-foreground/60 hover:text-foreground"
          >
            <X size={12} weight="bold" />
          </button>
        </div>
      ) : (
        <Popover
          open={adding === "menu"}
          onOpenChange={(o) => setAdding(o ? "menu" : null)}
        >
          <PopoverTrigger
            disabled={busy}
            className="focus-ring mt-2 flex items-center gap-2 rounded-md px-1 py-1.5 text-[13px] text-foreground/75 transition-colors hover:text-foreground disabled:opacity-60"
          >
            {busy ? (
              <CircleNotch size={13} className="animate-spin" />
            ) : (
              <Plus size={13} weight="bold" />
            )}
            {busy ? "Uploading…" : "Add attachment"}
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-[220px]">
            <AttachOption
              icon={<LinkSimple size={15} className="text-muted-foreground" />}
              label="Link from URL"
              hint="No upload"
              onClick={() => setAdding("link")}
            />
            <div className="my-1 h-px bg-border/60" />
            <AttachOption
              icon={<ImageIcon size={15} className="text-muted-foreground" />}
              label="Image"
              onClick={() => pickFile("image/*")}
            />
            <AttachOption
              icon={<FilePdf size={15} className="text-muted-foreground" />}
              label="PDF"
              onClick={() => pickFile("application/pdf")}
            />
            <AttachOption
              icon={<FileDoc size={15} className="text-muted-foreground" />}
              label="Document"
              onClick={() =>
                pickFile(
                  ".doc,.docx,.txt,.md,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                )
              }
            />
            <AttachOption
              icon={<FileHtml size={15} className="text-muted-foreground" />}
              label="HTML file"
              onClick={() => pickFile("text/html,.html,.htm")}
            />
            <AttachOption
              icon={<Paperclip size={15} className="text-muted-foreground" />}
              label="Any file"
              onClick={() => pickFile("*/*")}
            />
            <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-muted-foreground/70">
              5 MB max per upload. For bigger files, paste a Drive or
              Dropbox link.
            </p>
          </PopoverContent>
        </Popover>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFileChosen}
      />
    </div>
  );
}

function AttachmentIcon({
  kind,
  contentType,
}: {
  kind: "file" | "link";
  contentType: string | null;
}) {
  if (kind === "link") {
    return <LinkSimple size={16} className="shrink-0 text-primary" />;
  }
  if (contentType?.startsWith("image/")) {
    return <ImageIcon size={16} className="shrink-0 text-muted-foreground" />;
  }
  if (contentType === "application/pdf") {
    return <FilePdf size={16} className="shrink-0 text-muted-foreground" />;
  }
  if (contentType === "text/html") {
    return <FileHtml size={16} className="shrink-0 text-muted-foreground" />;
  }
  if (contentType?.includes("word") || contentType?.startsWith("text/")) {
    return <FileDoc size={16} className="shrink-0 text-muted-foreground" />;
  }
  return <Paperclip size={16} className="shrink-0 text-muted-foreground" />;
}

function AttachOption({
  icon,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] text-foreground transition-colors hover:bg-foreground/[0.04]"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="text-[10px] font-medium text-muted-foreground/70">
          {hint}
        </span>
      )}
    </button>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
      <PopoverTrigger className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-2 pr-2.5 text-[12px] font-medium text-foreground ring-1 ring-inset ring-border/70 transition-colors hover:bg-accent/40">
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
                : sorted[0]?.id === primaryId
                  ? `${sorted[0].id === currentUserId ? "Me" : sorted[0].name.split(/\s+/)[0]} +${sorted.length - 1}`
                  : `${sorted.length} people`}
            </span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[240px]" align="start">
        <div className="px-2 pb-1.5 pt-2">
          <p className="text-[12px] font-semibold tracking-tight text-foreground">
            Assigned to
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            First pick gets it on their My Day.
          </p>
        </div>
        {members.map((m) => {
          const isAssigned = assigneeIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m)}
              aria-pressed={isAssigned}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-foreground/[0.04]",
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
