"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
  Hash,
  PaperPlaneTilt,
  X,
} from "@/components/icons";
import type { ParseHint } from "@/lib/parse-task";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { parseTask } from "@/lib/parse-task";
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
    activeClass:
      "border-foreground/40 bg-muted/60 text-foreground ring-1 ring-foreground/20 " +
      "dark:border-foreground/30 dark:bg-foreground/[0.08] dark:ring-foreground/15",
  },
];

const sectionLabel =
  "text-[12.5px] font-semibold text-foreground/80";

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
    } else {
      // Quick-add opens from three places (sidebar CTA, mobile FAB,
      // empty-state Add task buttons) — wiring the sound here covers
      // all of them with one line instead of three.
      playSound("pin");
    }
  }, [open, currentUserId]);

  // ── Live natural-language parsing ─────────────────────────────────
  //
  // Run the parser on every keystroke. The chip strip above the input
  // surfaces what the parser saw — "Project: Platform debt", "Due:
  // Tomorrow" etc. — so users discover the syntax visually instead of
  // memorising it. The cleaned title (with all parsed tokens stripped)
  // is what we actually send to the server.
  //
  // Parsed tokens override prior manual selections. Trade-off: if you
  // hand-picked Today via the chip and then type "tomorrow" in the
  // title, Today gets overwritten. Feels right in practice — what you
  // type wins over what you clicked earlier.
  const parsed = useMemo(
    () => parseTask(title, { projects, members }),
    [title, projects, members]
  );

  useEffect(() => {
    if (parsed.projectId !== null && parsed.projectId !== projectId) {
      setProjectId(parsed.projectId);
    }
    if (parsed.assigneeId !== null && parsed.assigneeId !== assigneeId) {
      setAssigneeId(parsed.assigneeId);
    }
    if (parsed.priority !== null && parsed.priority !== priority) {
      setPriority(parsed.priority);
    }
    if (parsed.dueAt !== null) {
      // Compare by ISO so we don't churn on equal-value Date instances
      if (!due || due.getTime() !== parsed.dueAt.getTime()) {
        setDue(parsed.dueAt);
      }
    }
    // We deliberately do NOT clear state when the parser stops detecting
    // a token — backspacing "tomorrow" out of the title shouldn't clear
    // a Today chip the user clicked. State only moves forward via the
    // parser; clearing is a manual action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.projectId, parsed.assigneeId, parsed.priority, parsed.dueAt]);

  const submit = () => {
    if (!title.trim()) return;

    // Send the cleaned title (no `#proj @user tomorrow p1` tokens) — but
    // fall back to the raw title if the parser stripped everything (the
    // user typed nothing but tokens, which would be an empty title).
    const cleaned = parsed.title.trim();
    const savedTitle = cleaned || title.trim();
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
        className="max-w-[680px] gap-0 p-0 shadow-soft-md sm:rounded-xl"
      >
        {/* Header — project picker inline with "New task in" */}
        <div className="flex items-center gap-2 border-b border-border/60 px-6 py-4">
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
            <PopoverContent className="w-[240px]" align="start">
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
            className="focus-ring touch-expand ml-auto grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Title + description */}
        <div className="px-6 pb-2 pt-6">
          {/* Parse chip strip — appears above the input as soon as the
              parser resolves a token. Doubles as a tutorial: typing
              "#plat" makes a project chip appear, teaching the syntax
              by demonstrating it. */}
          {parsed.hints.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {parsed.hints.map((h, i) => (
                <ParseChip
                  key={`${h.kind}-${i}`}
                  hint={h}
                  project={
                    h.kind === "project"
                      ? projects.find((p) => p.id === parsed.projectId) ?? null
                      : null
                  }
                  member={
                    h.kind === "assignee"
                      ? members.find((m) => m.id === parsed.assigneeId) ?? null
                      : null
                  }
                />
              ))}
            </div>
          )}
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
            className="w-full bg-transparent text-[19px] font-medium leading-[1.25] tracking-[-0.005em] text-foreground outline-none placeholder:text-muted-foreground/65"
          />
          {/* Cleaned-title preview — only shown when the parser actually
              stripped tokens. Confirms what the user will see saved
              without making them mentally diff their input. */}
          {parsed.hints.length > 0 && parsed.title.trim() !== title.trim() && (
            <p className="mt-1.5 text-[11.5px] text-muted-foreground">
              Saved as{" "}
              <span className="font-medium text-foreground">
                {parsed.title.trim() || <em className="text-muted-foreground/70">(empty)</em>}
              </span>
            </p>
          )}
          <textarea
            placeholder="Add a description or a link"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-3 w-full resize-none bg-transparent text-[14.5px] leading-snug text-muted-foreground outline-none placeholder:text-muted-foreground/55"
          />
        </div>

        {/* Due date — inline chips, no popover for quick choices */}
        <div className="border-t border-border/60 px-6 py-4">
          <p className={sectionLabel}>Due date</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
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
                  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground max-md:h-10 max-md:px-3.5 max-md:text-[14px]",
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
              <PopoverContent className="w-auto gap-0 p-0" align="start">
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
        <div className="border-t border-border/60 px-6 py-4">
          <p className={sectionLabel}>Priority</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {PRIORITY_OPTIONS.map((o) => {
              const active = priority === o.p;
              return (
                <button
                  key={o.p}
                  onClick={() => setPriority(o.p)}
                  className={cn(
                    "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] transition-colors max-md:h-10 max-md:px-3.5 max-md:text-[14px]",
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
        <div className="border-t border-border/60 px-6 py-4">
          <p className={sectionLabel}>Assign to</p>
          <div className="mt-3 flex items-center gap-2">
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
                      "focus-ring relative grid size-7 place-items-center rounded-full ring-2 transition-transform max-md:size-10",
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
                  className="focus-ring grid size-7 place-items-center rounded-full border border-dashed border-border bg-card text-[10.5px] font-semibold text-muted-foreground ring-2 ring-card transition-colors hover:bg-accent/40 hover:text-foreground max-md:size-10 max-md:text-[12px]"
                >
                  {overflowCount > 0 ? `+${overflowCount}` : "+"}
                </PopoverTrigger>
                <PopoverContent className="w-[240px]" align="start">
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
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-4">
          <button
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-md px-3 py-2 text-[13.5px] font-medium text-foreground transition-colors hover:bg-accent/40"
          >
            Nevermind
          </button>
          <button
            onClick={submit}
            disabled={pending || !title.trim()}
            className="focus-ring surface-brand surface-brand-hover inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-[13.5px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
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
        "focus-ring inline-flex h-7 items-center rounded-md border px-2.5 text-[12.5px] transition-colors max-md:h-10 max-md:px-3.5 max-md:text-[14px]",
        active
          ? "border-primary/60 bg-primary/8 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

/**
 * One chip in the parse-result strip above the title input. Each chip
 * shows what the parser resolved a token to — a project, person, due
 * date, or priority. Visual language matches the tokens themselves:
 * project chips carry the project dot, mention chips carry an avatar,
 * priority chips carry the colored flag.
 */
function ParseChip({
  hint,
  project,
  member,
}: {
  hint: ParseHint;
  project: Project | null;
  member: Profile | null;
}) {
  const base =
    "inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11.5px] font-medium text-foreground";
  if (hint.kind === "project") {
    return (
      <span className={base}>
        {project ? (
          <ProjectDot project={project} size={8} />
        ) : (
          <Hash size={11} className="text-muted-foreground" />
        )}
        {hint.label}
      </span>
    );
  }
  if (hint.kind === "assignee") {
    return (
      <span className={base}>
        {member ? (
          <Avatar
            src={member.avatar_url}
            initials={member.initials}
            color={member.avatar_color}
            size={14}
          />
        ) : null}
        {hint.label}
      </span>
    );
  }
  if (hint.kind === "priority") {
    const tone =
      hint.label === "P1"
        ? "text-rose-500"
        : hint.label === "P2"
          ? "text-amber-500"
          : hint.label === "P3"
            ? "text-emerald-500"
            : "text-muted-foreground/70";
    return (
      <span className={base}>
        <Flag size={11} weight="fill" className={tone} />
        {hint.label}
      </span>
    );
  }
  // due
  return (
    <span className={cn(base, "border-primary/40 text-primary")}>
      <CalendarBlank size={11} className="text-primary" />
      {hint.label.charAt(0).toUpperCase() + hint.label.slice(1)}
    </span>
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
