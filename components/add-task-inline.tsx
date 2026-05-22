"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { format, isToday, isTomorrow } from "date-fns";
import { sileo } from "sileo";
import {
  CalendarBlank,
  CircleNotch,
  Flag,
  Hash,
  Plus,
  User,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { parseTask, type ParseHint } from "@/lib/parse-task";
import { useTeamContext } from "@/components/team-provider";
import { useQuickAdd } from "@/components/quick-add-context";

/**
 * Footer row on every task list. Click → expands into a real inline
 * input that parses natural-language tokens (#project @assignee p1 today)
 * as you type. Enter submits, Esc collapses, clicking the modal icon
 * hands off to QuickAddDialog for full control.
 */
export function AddTaskInline({
  defaultProjectId,
}: {
  defaultProjectId?: string | null;
}) {
  const { projects, members, currentUserId } = useTeamContext();
  const { open: openModal } = useQuickAdd();
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const parsed = useMemo(
    () =>
      parseTask(text, {
        projects: projects.map((p) => ({ id: p.id, name: p.name })),
        members: members.map((m) => ({
          id: m.id,
          name: m.name,
          initials: m.initials,
        })),
      }),
    [text, projects, members]
  );

  const submit = useCallback(() => {
    if (!parsed.title) return;
    const payload = {
      title: parsed.title,
      priority: parsed.priority ?? undefined,
      dueAt: parsed.dueAt ? parsed.dueAt.toISOString() : null,
      projectId: parsed.projectId ?? defaultProjectId ?? null,
      assigneeId: parsed.assigneeId ?? currentUserId,
    };
    startTransition(async () => {
      const res = await createTask(payload);
      if (res.error) {
        playSound("error");
        sileo.error({ title: res.error });
        return;
      }
      playSound("added");
      setText("");
      // Keep the row open so the user can chain adds.
      inputRef.current?.focus();
    });
  }, [parsed, defaultProjectId, currentUserId]);

  // Collapse on Esc, on outside click when empty.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActive(false);
        setText("");
      }
    };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(e.target as Node)) return;
      if (!text.trim()) setActive(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [active, text]);

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="focus-ring group flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-card/40 px-4 py-3 text-left text-[13.5px] font-medium text-muted-foreground transition-[background-color,color,border-color] duration-150 ease-[var(--ease-out)] hover:border-border hover:bg-card hover:text-foreground"
      >
        <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-dashed border-muted-foreground/50 text-muted-foreground transition-colors group-hover:border-muted-foreground/70">
          <Plus size={11} weight="bold" />
        </span>
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-card shadow-soft-xs"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-[18px] shrink-0 place-items-center rounded-[5px] border border-muted-foreground/40 text-muted-foreground/70">
          <Plus size={11} weight="bold" />
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={text}
          disabled={pending}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="What needs doing? Try @name #project p1 tomorrow"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        <button
          type="button"
          onClick={openModal}
          title="Open full form"
          className="focus-ring shrink-0 rounded-md px-1.5 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          More
        </button>
        {pending ? (
          <CircleNotch
            size={14}
            className="shrink-0 animate-spin text-muted-foreground"
          />
        ) : null}
      </div>

      {(parsed.hints.length > 0 || text.trim().length > 0) && (
        <HintRow hints={parsed.hints} hasText={text.trim().length > 0} />
      )}
    </div>
  );
}

function HintRow({
  hints,
  hasText,
}: {
  hints: ParseHint[];
  hasText: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 border-t border-border/60 px-3 py-1.5">
      {hints.length === 0 && hasText ? (
        <span className="text-[11px] text-muted-foreground/70">
          Press Enter to add · Esc to cancel
        </span>
      ) : (
        hints.map((h, i) => <HintChip key={`${h.kind}-${i}`} hint={h} />)
      )}
    </div>
  );
}

function HintChip({ hint }: { hint: ParseHint }) {
  const ICONS = {
    project: <Hash size={11} weight="bold" />,
    assignee: <User size={11} weight="fill" />,
    priority: <Flag size={11} weight="fill" />,
    due: <CalendarBlank size={11} weight="fill" />,
  };

  const TONE: Record<ParseHint["kind"], string> = {
    project: "border-blue-500/30 bg-blue-50 text-blue-700",
    assignee: "border-violet-500/30 bg-violet-50 text-violet-700",
    priority: "border-amber-500/30 bg-amber-50 text-amber-700",
    due: "border-emerald-500/30 bg-emerald-50 text-emerald-700",
  };

  const label =
    hint.kind === "due" ? formatDueLabel(hint.label) : hint.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-medium",
        TONE[hint.kind]
      )}
    >
      {ICONS[hint.kind]}
      {label}
    </span>
  );
}

function formatDueLabel(raw: string): string {
  // The hint label is whatever the user typed ("tomorrow", "next week",
  // "15 dec"). Capitalize for display.
  return raw
    .split(" ")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

// Older callers might still expect a friendlier date display on the chip
// after the parser resolves — exported in case we wire it later.
export function _friendlyDueLabel(due: Date): string {
  if (isToday(due)) return "Today";
  if (isTomorrow(due)) return "Tomorrow";
  return format(due, "EEE, d MMM");
}
