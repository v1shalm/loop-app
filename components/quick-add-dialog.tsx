"use client";

import { useEffect, useState, useTransition } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarBlank,
  CaretDown,
  Check,
  CircleNotch,
  Flag,
  PaperPlaneTilt,
  X,
} from "@/components/icons";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { DatePicker } from "@/components/date-picker";
import { Avatar } from "@/components/avatar";
import { ProjectDot } from "@/components/project-dot";
import type { Profile, Project } from "@/lib/queries";

type Priority = 1 | 2 | 3 | 4;

export interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projects: Project[];
  members: Profile[];
  currentUserId: string;
}

const PRIORITY_OPTIONS: {
  p: Priority;
  label: string;
  flagClass: string;
  activeClass: string;
}[] = [
  {
    p: 1,
    label: "Urgent",
    flagClass: "text-rose-500",
    activeClass:
      "border-rose-500/60 bg-rose-50 text-rose-700 ring-1 ring-rose-500/30 " +
      "dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/40 dark:ring-rose-400/30",
  },
  {
    p: 2,
    label: "High",
    flagClass: "text-amber-500",
    activeClass:
      "border-amber-500/60 bg-amber-50 text-amber-700 ring-1 ring-amber-500/30 " +
      "dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/40 dark:ring-amber-400/30",
  },
  {
    p: 3,
    label: "Medium",
    flagClass: "text-emerald-500",
    activeClass:
      "border-emerald-500/60 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/30 " +
      "dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/40 dark:ring-emerald-400/30",
  },
  {
    p: 4,
    label: "Low",
    flagClass: "text-muted-foreground/50",
    activeClass: "border-border bg-muted/60 text-foreground",
  },
];

const sectionLabel = "text-[11px] font-medium text-muted-foreground";

export function QuickAddDialog({
  open,
  onOpenChange,
  projects,
  members,
  currentUserId,
}: QuickAddDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState<Date | null>(null);
  const [priority, setPriority] = useState<Priority>(4);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>(currentUserId);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDue(null);
      setPriority(4);
      setProjectId(null);
      setAssigneeId(currentUserId);
    }
  }, [open, currentUserId]);

  const submit = () => {
    if (!title.trim()) return;

    // Capture current form parameters before optimistically clearing them
    const savedTitle = title;
    const savedDescription = description;
    const savedPriority = priority;
    const savedDue = due;
    const savedProjectId = projectId;
    const savedAssigneeId = assigneeId;

    // Play added sound instantly and close the dialog
    playSound("added");
    onOpenChange(false);

    // Display the success toast instantly
    const target = members.find((m) => m.id === savedAssigneeId);
    sileo.success({
      title:
        savedAssigneeId !== currentUserId && target
          ? `Assigned to ${target.name}`
          : "Task added",
    });

    startTransition(async () => {
      const res = await createTask({
        title: savedTitle,
        description: savedDescription || undefined,
        priority: savedPriority,
        dueAt: savedDue ? savedDue.toISOString() : null,
        projectId: savedProjectId,
        assigneeId: savedAssigneeId,
      });
      if (res.error) {
        playSound("error");
        sileo.error({ title: res.error });
      }
    });
  };

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const assignee = members.find((m) => m.id === assigneeId);

  // Avatar stack — selected first, then a few others, then a +N when there
  // are more teammates than the stack can show inline.
  const stackVisible = 4;
  const sortedMembers = [...members].sort((a, b) => {
    if (a.id === assigneeId) return -1;
    if (b.id === assigneeId) return 1;
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });
  const inlineMembers = sortedMembers.slice(0, stackVisible);
  const overflowCount = Math.max(0, sortedMembers.length - stackVisible);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[600px] gap-0 p-0 shadow-soft-md sm:rounded-xl"
      >
        {/* Header — project picker inline with "New task in" */}
        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3.5">
          <span className="text-[13.5px] text-muted-foreground">New task in</span>
          <Popover>
            <PopoverTrigger className="focus-ring flex h-7 items-center gap-1.5 rounded-md px-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-accent/40">
              {project ? (
                <ProjectDot project={project} size={9} />
              ) : (
                <span className="grid size-2.5 place-items-center rounded-full bg-muted-foreground/40" />
              )}
              <span>{project ? project.name : "Inbox"}</span>
              <CaretDown size={11} weight="bold" className="text-muted-foreground/70" />
            </PopoverTrigger>
            <PopoverContent className="w-[240px] gap-0 p-1" align="start">
              <PopoverItem
                selected={projectId === null}
                onSelect={() => setProjectId(null)}
              >
                <span className="size-2.5 rounded-full bg-muted-foreground/40" />
                <span>Inbox (no project)</span>
              </PopoverItem>
              {projects.map((p) => (
                <PopoverItem
                  key={p.id}
                  selected={projectId === p.id}
                  onSelect={() => setProjectId(p.id)}
                >
                  <ProjectDot project={p} size={9} />
                  <span className="truncate">{p.name}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring ml-auto grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Title + description */}
        <div className="px-5 pt-5">
          <input
            autoFocus
            placeholder="What needs to get done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full bg-transparent text-[17px] font-medium leading-tight text-foreground outline-none placeholder:text-muted-foreground/70"
          />
          <textarea
            placeholder="Add context, a link, or @mention a teammate..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-2.5 w-full resize-none bg-transparent text-[14px] text-muted-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Due date — inline chips, no popover for quick choices */}
        <div className="border-t border-border/60 px-5 py-3.5">
          <p className={sectionLabel}>Due date</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <QuickDateChip
              label="Today"
              active={due ? isSameDay(due, today()) : false}
              onClick={() => setDue(today())}
            />
            <QuickDateChip
              label="Tomorrow"
              active={due ? isSameDay(due, tomorrow()) : false}
              onClick={() => setDue(tomorrow())}
            />
            <QuickDateChip
              label="This week"
              active={due ? isSameDay(due, endOfThisWeek()) : false}
              onClick={() => setDue(endOfThisWeek())}
            />
            <Popover>
              <PopoverTrigger
                className={cn(
                  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground",
                  due &&
                    !isSameDay(due, today()) &&
                    !isSameDay(due, tomorrow()) &&
                    !isSameDay(due, endOfThisWeek()) &&
                    "border-primary/60 bg-primary/8 text-primary"
                )}
              >
                <CalendarBlank size={13} />
                {due &&
                !isSameDay(due, today()) &&
                !isSameDay(due, tomorrow()) &&
                !isSameDay(due, endOfThisWeek())
                  ? format(due, "EEE, d MMM")
                  : "Pick date"}
              </PopoverTrigger>
              <PopoverContent className="gap-0 p-0" align="start">
                <DatePicker value={due} onChange={setDue} />
              </PopoverContent>
            </Popover>
            {due && (
              <button
                onClick={() => setDue(null)}
                className="focus-ring rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Priority — all four visible at once */}
        <div className="border-t border-border/60 px-5 py-3.5">
          <p className={sectionLabel}>Priority</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {PRIORITY_OPTIONS.map((o) => {
              const active = priority === o.p;
              return (
                <button
                  key={o.p}
                  onClick={() => setPriority(o.p)}
                  className={cn(
                    "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] transition-colors",
                    active
                      ? o.activeClass
                      : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                  )}
                >
                  <Flag
                    size={12}
                    weight="fill"
                    className={active ? "" : o.flagClass}
                  />
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Assign to — avatar stack, click to select, + opens picker */}
        <div className="border-t border-border/60 px-5 py-3.5">
          <p className={sectionLabel}>Assign to</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {inlineMembers.map((m) => {
                const isSelected = m.id === assigneeId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setAssigneeId(m.id)}
                    title={m.name}
                    aria-label={`Assign to ${m.name}`}
                    className={cn(
                      "focus-ring relative grid size-7 place-items-center rounded-full ring-2 transition-transform",
                      isSelected
                        ? "z-10 scale-110 ring-primary"
                        : "ring-card hover:scale-105"
                    )}
                  >
                    <Avatar
                      src={m.avatar_url}
                      initials={m.initials}
                      color={m.avatar_color}
                      size={26}
                    />
                  </button>
                );
              })}
              <Popover>
                <PopoverTrigger
                  aria-label={overflowCount > 0 ? `${overflowCount} more` : "More members"}
                  className="focus-ring grid size-7 place-items-center rounded-full border border-dashed border-border bg-card text-[10.5px] font-semibold text-muted-foreground ring-2 ring-card transition-colors hover:bg-accent/40 hover:text-foreground"
                >
                  {overflowCount > 0 ? `+${overflowCount}` : "+"}
                </PopoverTrigger>
                <PopoverContent className="w-[240px] gap-0 p-1" align="start">
                  {sortedMembers.length === 0 ? (
                    <p className="px-2 py-1 text-[12px] text-muted-foreground">
                      Just you in here for now.
                    </p>
                  ) : (
                    sortedMembers.map((m) => (
                      <PopoverItem
                        key={m.id}
                        selected={assigneeId === m.id}
                        onSelect={() => setAssigneeId(m.id)}
                      >
                        <Avatar
                          src={m.avatar_url}
                          initials={m.initials}
                          color={m.avatar_color}
                          size={18}
                        />
                        <span>
                          {m.name}
                          {m.id === currentUserId ? " (me)" : ""}
                        </span>
                      </PopoverItem>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {assignee && (
              <span className="ml-1.5 text-[12.5px] text-foreground">
                {assigneeId === currentUserId ? "Me" : assignee.name}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-5 py-3.5">
          <button
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-md px-3 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-accent/40"
          >
            Nevermind
          </button>
          <button
            onClick={submit}
            disabled={pending || !title.trim()}
            className="focus-ring surface-brand surface-brand-hover inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending ? (
              <CircleNotch size={14} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={14} weight="fill" />
            )}
            {pending ? "Creating..." : "Create task"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
  d.setHours(23, 59, 0, 0);
  return d;
}
function tomorrow(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 0, 0);
  return d;
}
function endOfThisWeek(): Date {
  const d = new Date();
  const daysUntilSun = 7 - d.getDay(); // 0 = Sun
  d.setDate(d.getDate() + (daysUntilSun % 7));
  d.setHours(23, 59, 0, 0);
  return d;
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function QuickDateChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex h-7 items-center rounded-md border px-2.5 text-[12.5px] transition-colors",
        active
          ? "border-primary/60 bg-primary/8 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
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
