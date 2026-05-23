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
  CaretDown,
  Check,
  CheckCircle,
  ChatCircle,
  CircleNotch,
  Clock,
  DotsThree,
  Flag,
  Folder,
  Hash,
  Trash,
  Tray,
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
import { ProjectDot } from "@/components/project-dot";
import { Button } from "@/components/ui/button";
import {
  WorkflowStatusPicker,
  type WorkflowStatus,
} from "@/components/workflow-status-picker";

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
        <div key="drawer-root" className="fixed inset-0 z-50">
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
          {/* Floating panel — inset from edges, full slide from right with
              the Vaul/Ionic deceleration curve. Same curve Shopify Shop
              uses for its bottom sheet. */}
          <motion.div
            key="panel"
            initial={{ x: "calc(100% + 24px)" }}
            animate={{ x: 0 }}
            exit={{ x: "calc(100% + 24px)" }}
            transition={{
              duration: 0.42,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="pointer-events-none absolute inset-y-3 right-3 flex w-full max-w-[480px] flex-col"
          >
            <div
              className="pointer-events-auto flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-popover shadow-[0_24px_64px_-12px_rgba(15,23,42,0.32),0_8px_16px_-8px_rgba(15,23,42,0.18)]"
            >
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
    if (changes.workflowStatus !== undefined) {
      optimistic.workflow_status = changes.workflowStatus;
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

  // Chip tone helpers — surface urgency through tinted chips, not hairlines.
  const dueChipTone =
    overdue || (due && isToday(due))
      ? "border-rose-200/70 bg-rose-50 text-rose-700"
      : "border-border bg-card text-foreground";

  const priorityChipTone: Record<Priority, string> = {
    1: "border-rose-200/70 bg-rose-50 text-rose-700",
    2: "border-amber-200/70 bg-amber-50 text-amber-700",
    3: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
    4: "border-border bg-card text-foreground",
  };

  return (
    <div className="flex h-full flex-col">
      <Header onClose={onClose} pending={pending} onDelete={remove} />

      <div className="flex-1 overflow-y-auto">
        {/* Title + checkbox + chips */}
        <section className="px-6 pb-5 pt-5">
          <div className="flex items-start gap-3">
            <button
              onClick={toggleDone}
              disabled={pending}
              aria-label={done ? "Mark not done" : "Mark complete"}
              className={cn(
                "focus-ring mt-1 grid size-[20px] shrink-0 place-items-center rounded-[6px] border-[1.5px] bg-background transition-[background-color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-95",
                done
                  ? "border-emerald-600 bg-emerald-600"
                  : "border-border hover:border-foreground/40"
              )}
            >
              {done && <Check size={12} weight="bold" className="text-white" />}
            </button>
            <AutoTextarea
              ref={titleRef}
              defaultValue={task.title}
              onBlur={saveTitle}
              placeholder="Untitled task"
              className={cn(
                "min-h-[28px] flex-1 resize-none bg-transparent text-[20px] font-semibold leading-snug tracking-tight text-foreground outline-none placeholder:text-muted-foreground/50",
                done && "text-muted-foreground line-through"
              )}
            />
          </div>

          {/* Tinted context chips */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <WorkflowStatusPicker
              value={(task.workflow_status as WorkflowStatus | null) ?? null}
              onChange={(next) => patch({ workflowStatus: next })}
            />
            <Popover>
              <PopoverTrigger
                className={cn(
                  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors hover:brightness-[0.97]",
                  dueChipTone
                )}
              >
                <CalendarBlank size={13} weight="fill" />
                <span className="tabular-nums">
                  {due ? formatDueShort(due) : "Due date"}
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
              <PopoverTrigger
                className={cn(
                  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12px] font-medium transition-colors hover:brightness-[0.97]",
                  priorityChipTone[task.priority as Priority]
                )}
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

            <Popover>
              <PopoverTrigger className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 pr-2.5 text-[12px] font-medium text-foreground transition-colors hover:brightness-[0.97]">
                {task.assignee ? (
                  <Avatar
                    src={task.assignee.avatar_url}
                    initials={task.assignee.initials}
                    color={task.assignee.avatar_color}
                    size={18}
                  />
                ) : (
                  <UserPlus size={13} className="text-muted-foreground" />
                )}
                {task.assignee
                  ? task.assignee.id === currentUserId
                    ? "Me"
                    : task.assignee.name.split(/\s+/)[0]
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
              <PopoverTrigger className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] font-medium text-foreground transition-colors hover:brightness-[0.97]">
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
          </div>
        </section>

        <SectionDivider />

        {/* Description */}
        <section className="px-6 py-5">
          <SectionHeader icon={<Tray size={14} />} label="Description" />
          <AutoTextarea
            ref={descRef}
            defaultValue={task.description ?? ""}
            onBlur={saveDescription}
            placeholder="Add more details (optional)"
            minRows={3}
            className="mt-2.5 w-full resize-none rounded-lg border border-border/60 bg-card p-3 text-[13.5px] leading-relaxed text-foreground outline-none transition-colors focus:border-ring/40 placeholder:text-muted-foreground/50"
          />
        </section>

        <SectionDivider />

        {/* Created by | Added — two columns with a hairline between */}
        <section className="px-6 py-5">
          <div className="grid grid-cols-2 gap-0">
            <Meta label="Created by">
              {task.author ? (
                <span className="inline-flex items-center gap-1.5">
                  <Avatar
                    src={task.author.avatar_url}
                    initials={task.author.initials}
                    color={task.author.avatar_color}
                    size={18}
                  />
                  <span className="text-[13px] text-foreground">
                    {task.author.name}
                  </span>
                </span>
              ) : (
                <span className="text-[13px] text-muted-foreground">
                  Unknown
                </span>
              )}
            </Meta>
            <Meta label="Added" leftBorder>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground">
                <Clock size={14} className="text-muted-foreground" />
                {format(new Date(task.created_at), "d MMM, h:mm a")}
              </span>
            </Meta>
          </div>
          {task.completed_at && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
              <CheckCircle size={13} weight="fill" />
              Completed {format(new Date(task.completed_at), "d MMM, h:mm a")}
            </div>
          )}
        </section>

        <SectionDivider />

        {/* Comments */}
        <section className="px-6 py-5">
          <CommentsSection
            taskId={task.id}
            comments={comments}
            setComments={setComments}
            currentUser={currentUser}
            currentUserId={currentUserId}
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
    </div>
  );
}

function SectionDivider() {
  return <div className="h-px bg-border/60" />;
}

function SectionHeader({
  icon,
  label,
  trailing,
}: {
  icon: React.ReactNode;
  label: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-5 place-items-center rounded text-muted-foreground">
        {icon}
      </span>
      <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
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
  onDelete,
}: {
  done: boolean;
  pending: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-t border-border/60 bg-popover px-5 py-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          !done && "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700"
        )}
      >
        <CheckCircle
          size={15}
          weight={done ? "regular" : "fill"}
          className={done ? "text-muted-foreground" : "text-emerald-600"}
        />
        {done ? "Reopen task" : "Mark as complete"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={pending}
        className="text-rose-600 hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash size={15} />
        Delete task
      </Button>
    </div>
  );
}

function CommentsSection({
  taskId,
  comments,
  setComments,
  currentUser,
  currentUserId,
}: {
  taskId: string;
  comments: CommentRow[];
  setComments: React.Dispatch<React.SetStateAction<CommentRow[]>>;
  currentUser: Profile | null;
  currentUserId: string;
}) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
            <span className="text-[11.5px] tabular-nums text-muted-foreground/70">
              0
            </span>
          )
        }
      />

      {comments.length === 0 ? (
        <div className="mt-3 grid place-items-center rounded-xl border border-border/60 bg-card px-4 py-8 text-center">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground">
            <ChatCircle size={16} />
          </span>
          <p className="mt-3 text-[13px] font-medium text-foreground">
            Be the first to comment
          </p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Ask questions, give updates, or share feedback.
          </p>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-3.5">
          {visible.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              isMe={c.author_id === currentUserId}
              onDelete={() => remove(c.id)}
            />
          ))}
        </ul>
      )}

      {/* Composer — avatar + textarea + send */}
      <div className="mt-4 flex items-start gap-2.5">
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
        <div className="min-w-0 flex-1 rounded-xl border border-border/60 bg-card transition-colors focus-within:border-ring/40">
          <AutoTextarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Add a comment..."
            minRows={2}
            className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-end gap-2 px-2 pb-2">
            <Button
              onClick={submit}
              disabled={!body.trim() || pending}
              size="sm"
              variant="default"
            >
              {pending && (
                <CircleNotch size={12} className="animate-spin" />
              )}
              Send
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
  onClose,
  onDelete,
  pending,
}: {
  onClose: () => void;
  onDelete?: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3">
      <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
        <Hash size={13} weight="bold" />
      </span>
      <h2 className="text-[13px] font-semibold tracking-tight text-foreground">
        Task
      </h2>
      {pending && (
        <CircleNotch size={13} className="animate-spin text-muted-foreground" />
      )}
      <div className="ml-auto flex items-center gap-0.5">
        {onDelete && (
          <Popover>
            <PopoverTrigger
              aria-label="More actions"
              className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
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
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="focus-ring grid size-8 place-items-center rounded-md text-muted-foreground transition-[background-color,color,transform] duration-150 ease-[var(--ease-out)] hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
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

function Meta({
  label,
  children,
  leftBorder,
}: {
  label: string;
  children: React.ReactNode;
  leftBorder?: boolean;
}) {
  return (
    <div className={cn(leftBorder && "border-l border-border/60 pl-4")}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1.5 text-[13px] text-foreground">{children}</div>
    </div>
  );
}
