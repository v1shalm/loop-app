"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { format, isPast, isToday } from "date-fns";
import { DatePicker, formatDueShort } from "@/components/date-picker";
import { sileo } from "sileo";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarBlank,
  Check,
  ChatCircle,
  CircleNotch,
  Flag,
  Folder,
  UserPlus,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  addComment,
  deleteComment,
  deleteTask,
  setTaskStatus,
  updateTask,
  type CommentRow,
} from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { formatDistanceToNow } from "date-fns";
import type { Profile, Project, TaskWithRelations } from "@/lib/queries";
import { Avatar } from "@/components/avatar";

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
        <motion.div
          key="drawer-root"
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <motion.div
            key="backdrop"
            onClick={close}
            className="absolute inset-0 bg-black/10 supports-backdrop-filter:backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            key="panel"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0.32, 1] }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col border-l border-border/60 bg-popover shadow-soft-xl"
          >
            <DrawerInner
              taskId={taskId}
              projects={projects}
              members={members}
              currentUserId={currentUserId}
              onClose={close}
            />
          </motion.div>
        </motion.div>
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
  const router = useRouter();
  const [task, setTask] = useState<TaskWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

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
        "id, task_id, author_id, body, created_at, author:profiles(id, name, initials, avatar_color, avatar_url)"
      )
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }) as any);

    Promise.all([taskP, commentsP]).then(([taskRes, cRes]) => {
      if (!active) return;
      setTask((taskRes.data as TaskWithRelations | null) ?? null);
      setComments((cRes.data as CommentRow[] | null) ?? []);
      setLoading(false);
    });

    return () => {
      active = false;
    };
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

  const toggleDone = () => {
    if (!task) return;
    const next = task.status === "done" ? "todo" : "done";
    if (next === "done") playSound("completed", task.priority as Priority);
    setTask({
      ...task,
      status: next,
      completed_at: next === "done" ? new Date().toISOString() : null,
    });
    startTransition(async () => {
      const res = await setTaskStatus(task.id, next);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  const remove = () => {
    if (!task) return;
    const ok = window.confirm(`Delete "${task.title}"? This can't be undone.`);
    if (!ok) return;
    // Close immediately so the drawer feels snappy; the row will animate out
    // when the revalidated list re-renders.
    onClose();
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
        <Header onClose={onClose} title="Task not found" pending={false} />
        <div className="grid flex-1 place-items-center text-center text-muted-foreground">
          <div>
            <div className="text-3xl">🤷</div>
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

  return (
    <div className="flex h-full flex-col">
      <Header onClose={onClose} title="Task" pending={pending} onDelete={remove} />

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {/* Status + title */}
        <div className="flex items-start gap-3">
          <button
            onClick={toggleDone}
            disabled={pending}
            aria-label={done ? "Mark not done" : "Mark complete"}
            className={cn(
              "focus-ring mt-1 grid size-[20px] shrink-0 place-items-center rounded-[6px] border-[1.5px] bg-background transition-transform duration-150 ease-[var(--ease-out)] active:scale-95",
              done
                ? "border-emerald-600 bg-emerald-50"
                : "border-border hover:border-foreground/40"
            )}
          >
            {done && (
              <Check size={12} weight="bold" className="text-emerald-600" />
            )}
          </button>
          <textarea
            ref={titleRef}
            defaultValue={task.title}
            onBlur={saveTitle}
            rows={1}
            className={cn(
              "min-h-[28px] flex-1 resize-none bg-transparent text-[18px] font-semibold leading-snug tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60",
              done && "text-muted-foreground line-through"
            )}
          />
        </div>

        {/* Chips row */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <CalendarBlank size={14} />
              <span
                className={
                  overdue
                    ? "text-rose-600"
                    : due && isToday(due)
                    ? "text-rose-600"
                    : ""
                }
              >
                {formatDueShort(due)}
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

          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <Flag size={14} className={priorityOpt.cls} weight="fill" />
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

          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <UserPlus size={14} />
              {task.assignee
                ? task.assignee.id === currentUserId
                  ? "Me"
                  : task.assignee.name
                : "Assign"}
            </PopoverTrigger>
            <PopoverContent className="w-[220px] gap-0 p-1" align="start">
              {members.map((m) => (
                <PopoverItem
                  key={m.id}
                  selected={task.assignee?.id === m.id}
                  onSelect={() => patch({ assigneeId: m.id })}
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
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground">
              <Folder size={14} />
              {task.project ? (
                <>
                  {task.project.emoji ? `${task.project.emoji} ` : "# "}
                  {task.project.name}
                </>
              ) : (
                "Inbox"
              )}
            </PopoverTrigger>
            <PopoverContent className="w-[240px] gap-0 p-1" align="start">
              <PopoverItem
                selected={task.project_id === null}
                onSelect={() => patch({ projectId: null })}
              >
                <Folder size={14} className="text-muted-foreground" />
                <span>Inbox (no project)</span>
              </PopoverItem>
              {projects.map((p) => (
                <PopoverItem
                  key={p.id}
                  selected={task.project_id === p.id}
                  onSelect={() => patch({ projectId: p.id })}
                >
                  <span className="text-muted-foreground">
                    {p.emoji ?? "#"}
                  </span>
                  <span className="truncate">{p.name}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        {/* Description */}
        <div className="mt-6">
          <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Description
          </label>
          <textarea
            ref={descRef}
            defaultValue={task.description ?? ""}
            onBlur={saveDescription}
            placeholder="Add more details (optional)"
            rows={4}
            className="mt-1.5 w-full resize-none rounded-lg border border-border/60 bg-card p-3 text-[13.5px] leading-relaxed text-foreground outline-none transition-colors focus:border-ring/40 placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Metadata */}
        <div className="mt-6 grid grid-cols-2 gap-3 text-[12.5px]">
          {task.author && (
            <Meta label="Created by">
              <span className="inline-flex items-center gap-1.5">
                <Avatar
                  src={task.author.avatar_url}
                  initials={task.author.initials}
                  color={task.author.avatar_color}
                  size={16}
                />
                {task.author.name}
              </span>
            </Meta>
          )}
          <Meta label="Added">
            {format(new Date(task.created_at), "d MMM, h:mm a")}
          </Meta>
          {task.completed_at && (
            <Meta label="Completed">
              {format(new Date(task.completed_at), "d MMM, h:mm a")}
            </Meta>
          )}
        </div>

        {/* Comments */}
        <CommentsSection
          taskId={task.id}
          comments={comments}
          setComments={setComments}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}

function CommentsSection({
  taskId,
  comments,
  setComments,
  currentUserId,
}: {
  taskId: string;
  comments: CommentRow[];
  setComments: React.Dispatch<React.SetStateAction<CommentRow[]>>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    startTransition(async () => {
      const res = await deleteComment(id);
      if (res.error) sileo.error({ title: res.error });
    });
  };

  return (
    <div className="mt-8">
      <div className="mb-2 flex items-baseline gap-2">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Comments
        </label>
        {comments.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground/70">
            {comments.length}
          </span>
        )}
      </div>

      {comments.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 bg-muted/30 px-3 py-3 text-center text-[12px] text-muted-foreground">
          Start the conversation.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isMe={c.author_id === currentUserId}
              onDelete={() => remove(c.id)}
            />
          ))}
        </ul>
      )}

      {/* Composer */}
      <div className="mt-3 rounded-md border border-border/60 bg-card focus-within:border-ring/40">
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Add a comment…"
          rows={2}
          className="w-full resize-none rounded-md bg-transparent px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <div className="flex items-center justify-between gap-2 border-t border-border/40 px-2 py-1.5">
          <span className="text-[11px] text-muted-foreground/70">
            ⌘ + Enter to send
          </span>
          <button
            onClick={submit}
            disabled={!body.trim() || pending}
            className="focus-ring surface-brand surface-brand-hover flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending && (
              <CircleNotch size={12} className="animate-spin" />
            )}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  isMe,
  onDelete,
}: {
  comment: CommentRow;
  isMe: boolean;
  onDelete: () => void;
}) {
  const ago = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
  });

  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5">
        <Avatar
          src={comment.author?.avatar_url ?? null}
          initials={comment.author?.initials ?? "?"}
          color={comment.author?.avatar_color ?? "#D4D4D4"}
          size={24}
        />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[12.5px] font-semibold text-foreground">
            {isMe ? "You" : comment.author?.name ?? "Someone"}
          </span>
          <span className="text-[11px] text-muted-foreground/70">{ago}</span>
          {isMe && (
            <button
              onClick={onDelete}
              className="focus-ring ml-auto text-[11px] text-muted-foreground hover:text-rose-600"
            >
              Delete
            </button>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
          {comment.body}
        </p>
      </div>
    </li>
  );
}

function Header({
  title,
  onClose,
  onDelete,
  pending,
}: {
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {pending && (
        <CircleNotch size={13} className="animate-spin text-muted-foreground" />
      )}
      <div className="ml-auto flex items-center gap-1">
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={pending}
            className="focus-ring rounded-md px-2.5 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-priority-1 disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent hover:text-foreground active:scale-[0.94]"
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
        "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] text-foreground hover:bg-accent",
        selected && "bg-accent font-medium"
      )}
    >
      {children}
      {selected && <Check size={14} className="ml-auto text-primary" />}
    </button>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5 text-[13px] text-foreground">{children}</div>
    </div>
  );
}
