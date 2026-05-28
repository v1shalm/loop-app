"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ArrowsClockwise,
  CalendarBlank,
  Check,
  CircleNotch,
  Flag,
  Folder,
  Hash,
  PaperPlaneTilt,
  Tray,
  X,
} from "@/components/icons";
import type { ParseHint } from "@/lib/parse-task";
import { sileo } from "sileo";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { parseTask } from "@/lib/parse-task";
import { RECURRENCE_OPTIONS, recurrenceLabel } from "@/lib/recurrence";
import { DatePicker } from "@/components/date-picker";
import { Avatar } from "@/components/avatar";
import { ProjectDot, projectColor } from "@/components/project-dot";
import type { Profile, Project } from "@/lib/queries";

type Priority = 1 | 2 | 3 | 4;

export interface QuickAddDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Seed the due date when the dialog opens (e.g. the Upcoming page's
   *  per-day `+` opens it pre-set to that day). */
  defaultDue?: Date | null;
  /** Seed the project when opened from a project row's `…` menu, so the
   *  new task is already tagged to that project. */
  defaultProjectId?: string | null;
  projects: Project[];
  members: Profile[];
  currentUserId: string;
}

const PRIORITY_OPTIONS: {
  p: Priority;
  label: string;
  cls: string;
}[] = [
  // Same scale as the task row, drawer, and inline picker: 1=High …
  // 4=None. (These used to read Urgent/High/Medium/Low here, which
  // mislabeled every stored priority by one step versus the rest of
  // the app — a #1 "Urgent" task showed as "High" everywhere else.)
  { p: 1, label: "High", cls: "text-rose-500" },
  { p: 2, label: "Medium", cls: "text-amber-500" },
  { p: 3, label: "Low", cls: "text-emerald-500" },
  { p: 4, label: "None", cls: "text-muted-foreground/60" },
];

// Hairline-bordered pill on the card surface. Same chip used by the
// edit drawer so the two modals read as one family.
const chipBase =
  "focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-2.5 text-[12px] font-medium text-foreground ring-1 ring-inset ring-border/70 transition-colors hover:bg-accent/40";

export function QuickAddDialog({
  open,
  onOpenChange,
  defaultDue,
  defaultProjectId,
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
  const [recurrence, setRecurrence] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Grow the title field to fit its text so long titles wrap onto new
  // lines instead of scrolling sideways — same behaviour as the edit
  // drawer's title. Runs on every keystroke and on reset (title -> "").
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [title]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDue(null);
      setPriority(4);
      setProjectId(null);
      setAssigneeId(currentUserId);
      setRecurrence(null);
    } else {
      // Seed the due date when opened with one (Upcoming's per-day `+`);
      // otherwise start undated. Typing a date token still overrides it.
      setDue(defaultDue ?? null);
      // Seed the project when opened from a project row's `…` menu; typing
      // a #project token still overrides it.
      setProjectId(defaultProjectId ?? null);
      // Quick-add opens from sidebar CTA, topbar CTA, empty-state Add task
      // buttons. Wiring the sound here covers all of them with one line.
      playSound("pin");
    }
  }, [open, currentUserId, defaultDue, defaultProjectId]);

  // Live natural-language parsing. The chip strip above the input surfaces
  // what the parser saw ("Project: Platform debt", "Due: Tomorrow", etc.)
  // so users discover the syntax visually instead of memorising it.
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
      if (!due || due.getTime() !== parsed.dueAt.getTime()) {
        setDue(parsed.dueAt);
      }
    }
    if (parsed.recurrence !== null && parsed.recurrence !== recurrence) {
      setRecurrence(parsed.recurrence);
    }
    // State only moves forward via the parser. Backspacing "tomorrow" out of
    // the title shouldn't clear a Today chip the user clicked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parsed.projectId,
    parsed.assigneeId,
    parsed.priority,
    parsed.dueAt,
    parsed.recurrence,
  ]);

  const submit = () => {
    if (!title.trim()) return;

    const cleaned = parsed.title.trim();
    const savedTitle = cleaned || title.trim();
    const savedDescription = description;
    const savedPriority = priority;
    const savedProjectId = projectId;
    const savedAssigneeId = assigneeId;
    const savedRecurrence = recurrence;
    // A recurrence needs an anchor: if none was given, start it today so
    // the first occurrence is due now and it advances from there.
    const savedDue = due ?? (recurrence ? today() : null);

    playSound("added");
    onOpenChange(false);

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
        recurrence: savedRecurrence,
      });
      if (res.error) {
        playSound("error");
        sileo.error({ title: res.error });
      }
    });
  };

  const project = projectId ? projects.find((p) => p.id === projectId) : null;
  const assignee = members.find((m) => m.id === assigneeId);
  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.p === priority)!;

  const dueIconTone =
    due && isSameDay(due, today())
      ? "text-rose-600 dark:text-rose-300"
      : "text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        // sm:max-w-[…] (not bare max-w) so it overrides the base
        // DialogContent's sm:max-w-sm — otherwise the modal was clamped
        // to 384px on desktop.
        className="gap-0 p-0 shadow-soft-md sm:max-w-[720px] sm:rounded-xl"
      >
        {/* Header. Lighter than the edit drawer's header. Just a close
            button on the right. Visual hierarchy lives in the title
            below, not in a label up here. */}
        <div className="flex items-center justify-end px-3 pt-3">
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="focus-ring grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground active:scale-[0.94]"
          >
            <X size={14} weight="bold" />
          </button>
        </div>

        {/* Title. Same scale as the edit drawer (22px / -0.01em) so the
            two modals read as one family. */}
        <section className="px-6 pt-1">
          <textarea
            ref={titleRef}
            autoFocus
            rows={1}
            placeholder="What needs to get done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            className="min-h-[28px] w-full resize-none bg-transparent text-[22px] font-semibold leading-[1.2] tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/55"
          />
        </section>

        {/* Parse hint strip. Only appears when the parser actually
            resolved a token. Tutorial-by-demo: typing "#plat" makes a
            project chip appear, teaching the syntax visually. */}
        {parsed.hints.length > 0 && (
          <section className="px-6 pb-1 pt-2.5">
            <div className="flex flex-wrap gap-1.5">
              {parsed.hints.map((h, i) => (
                <ParseChip
                  key={`${h.kind}-${i}`}
                  hint={h}
                  project={
                    h.kind === "project"
                      ? (projects.find((p) => p.id === parsed.projectId) ?? null)
                      : null
                  }
                  member={
                    h.kind === "assignee"
                      ? (members.find((m) => m.id === parsed.assigneeId) ?? null)
                      : null
                  }
                />
              ))}
            </div>
            {parsed.title.trim() !== title.trim() && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                Saves as{" "}
                <span className="font-medium text-foreground">
                  {parsed.title.trim() || (
                    <em className="text-muted-foreground/70">(empty)</em>
                  )}
                </span>
              </p>
            )}
          </section>
        )}

        {/* Chip row. Mirrors the edit drawer: assignee, date, priority,
            project, all sitting flat as peers under the title. Each is
            a click-to-edit popover. No section labels. */}
        <section className="flex flex-wrap items-center gap-2 px-6 pb-5 pt-4">
          <AssigneeChip
            assignee={assignee}
            currentUserId={currentUserId}
            members={members}
            onSelect={setAssigneeId}
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
              <DatePicker value={due} onChange={setDue} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className={chipBase}>
              <Flag
                size={13}
                weight={priority === 4 ? "regular" : "fill"}
                className={priorityOpt.cls}
              />
              {priorityOpt.label}
            </PopoverTrigger>
            <PopoverContent className="w-[180px]" align="start">
              {PRIORITY_OPTIONS.map((o) => (
                <PopoverItem
                  key={o.p}
                  selected={priority === o.p}
                  onSelect={() => setPriority(o.p)}
                >
                  <Flag
                    size={14}
                    weight={o.p === 4 ? "regular" : "fill"}
                    className={o.cls}
                  />
                  <span>{o.label}</span>
                </PopoverItem>
              ))}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className={chipBase}>
              {project ? (
                <>
                  <Folder
                    size={13}
                    weight="fill"
                    style={{ color: projectColor(project) }}
                  />
                  <span className="truncate">{project.name}</span>
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
                selected={projectId === null}
                onSelect={() => setProjectId(null)}
              >
                <Tray size={14} className="text-muted-foreground" />
                <span>Inbox (no project)</span>
              </PopoverItem>
              {projects.map((p) => (
                <PopoverItem
                  key={p.id}
                  selected={projectId === p.id}
                  onSelect={() => setProjectId(p.id)}
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
                  recurrence ? "text-primary-readable" : "text-muted-foreground"
                }
              />
              <span>{recurrence ? recurrenceLabel(recurrence) : "Repeat"}</span>
            </PopoverTrigger>
            <PopoverContent className="w-[200px]" align="start">
              <PopoverItem
                selected={recurrence === null}
                onSelect={() => setRecurrence(null)}
              >
                <span>Doesn&apos;t repeat</span>
              </PopoverItem>
              {RECURRENCE_OPTIONS.map((r) => (
                <PopoverItem
                  key={r}
                  selected={recurrence === r}
                  onSelect={() => setRecurrence(r)}
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
        </section>

        {/* Description: a visible, bordered field so it clearly reads as
            something you type into, with room to actually write. Matches
            the app's other text inputs (border + bg-background). */}
        <section className="px-6 pb-6">
          <textarea
            placeholder="Add a description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="focus-ring min-h-[104px] w-full resize-none rounded-md border border-border bg-background px-3 py-2.5 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-ring/40"
          />
        </section>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-3.5">
          <button
            onClick={() => onOpenChange(false)}
            className="focus-ring rounded-md px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent/40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={pending || !title.trim()}
            className="focus-ring surface-brand surface-brand-hover inline-flex h-9 items-center gap-1.5 rounded-md px-4 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-cta)] transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100"
          >
            {pending ? (
              <CircleNotch size={13} className="animate-spin" />
            ) : (
              <PaperPlaneTilt size={13} weight="fill" />
            )}
            {pending ? "Creating..." : "Create task"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Assignee chip. Avatar + first name in the same hairline-pill style as
// the drawer's AssigneeStackPicker, with a popover to pick a teammate.
function AssigneeChip({
  assignee,
  currentUserId,
  members,
  onSelect,
}: {
  assignee: Profile | undefined;
  currentUserId: string;
  members: Profile[];
  onSelect: (id: string) => void;
}) {
  const sorted = [...members].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <Popover>
      <PopoverTrigger
        aria-label={
          assignee
            ? `Assignee: ${assignee.id === currentUserId ? "Me" : assignee.name}`
            : "Pick assignee"
        }
        className="focus-ring inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-1.5 pr-2.5 text-[12px] font-medium text-foreground ring-1 ring-inset ring-border/70 transition-colors hover:bg-accent/40"
      >
        {assignee ? (
          <>
            <Avatar
              src={assignee.avatar_url}
              initials={assignee.initials}
              color={assignee.avatar_color}
              size={18}
            />
            <span>
              {assignee.id === currentUserId
                ? "Me"
                : assignee.name.split(/\s+/)[0]}
            </span>
          </>
        ) : (
          <>
            <span className="grid size-[18px] place-items-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground" />
            <span>Assign</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[240px]" align="start">
        {sorted.map((m) => (
          <PopoverItem
            key={m.id}
            selected={assignee?.id === m.id}
            onSelect={() => onSelect(m.id)}
          >
            <Avatar
              src={m.avatar_url}
              initials={m.initials}
              color={m.avatar_color}
              size={20}
            />
            <span className="min-w-0 flex-1 truncate">
              {m.name}
              {m.id === currentUserId ? " (me)" : ""}
            </span>
          </PopoverItem>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
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
function isTomorrow(d: Date): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return isSameDay(d, t);
}

function formatDueShort(d: Date): string {
  if (isSameDay(d, today())) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE, d MMM");
}

/**
 * One chip in the parse-result strip above the title input. Each chip
 * shows what the parser resolved a token to: a project, person, due
 * date, or priority.
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
    "inline-flex h-6 items-center gap-1.5 rounded-md bg-card px-2 text-[11px] font-medium text-foreground ring-1 ring-inset ring-border/70";
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
  if (hint.kind === "recurrence") {
    return (
      <span className={base}>
        <ArrowsClockwise size={11} weight="bold" className="text-primary-readable" />
        {hint.label}
      </span>
    );
  }
  // due
  return (
    <span className={cn(base, "text-primary-readable ring-primary/40")}>
      <CalendarBlank size={11} className="text-primary-readable" />
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
          ? "bg-primary/8 font-medium text-primary-readable"
          : "text-foreground hover:bg-accent/40 hover:text-foreground"
      )}
    >
      {children}
      {selected && (
        <Check size={14} className="ml-auto text-primary-readable" />
      )}
    </button>
  );
}
