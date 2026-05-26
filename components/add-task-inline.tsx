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
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions";
import { playSound } from "@/lib/sounds";
import { parseTask, type ParseHint } from "@/lib/parse-task";
import { useTeamContext } from "@/components/team-provider";
import { useQuickAdd } from "@/components/quick-add-context";
import { Avatar } from "@/components/avatar";

/**
 * Footer row on every task list. Click → expands into a real inline
 * input that parses natural-language tokens (#project @assignee p1 today)
 * as you type. Enter submits, Esc collapses, clicking the modal icon
 * hands off to QuickAddDialog for full control.
 */
export function AddTaskInline({
  defaultProjectId,
  flat,
}: {
  defaultProjectId?: string | null;
  /** When true, render as a hairline-topped row that lives inside an
   *  outer bordered container (project page list). Rest state is
   *  bare; hover lifts to bg-card with purple text. */
  flat?: boolean;
}) {
  const { projects, members, currentUserId } = useTeamContext();
  const { open: openModal } = useQuickAdd();
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // @mention picker state — matches the same picker shape as the comment
  // composer (see mention-input.tsx). Here we use it as an autocomplete
  // assist: the picker inserts a plain "@firstname " token that the
  // parser then resolves into an assignee.
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIdx, setMentionIdx] = useState(0);

  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase().trim();
    return members
      .filter((m) =>
        q === ""
          ? true
          : m.name.toLowerCase().includes(q) ||
            m.initials.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [mentionQuery, members]);

  const detectAtToken = (input: string, caret: number) => {
    let i = caret - 1;
    while (i >= 0) {
      const ch = input[i];
      if (ch === "@") {
        const prev = i > 0 ? input[i - 1] : "";
        if (i === 0 || /\s/.test(prev)) {
          return { start: i, query: input.slice(i + 1, caret) };
        }
        return null;
      }
      if (/\s/.test(ch)) return null;
      if (caret - i > 24) return null;
      i--;
    }
    return null;
  };

  const insertMention = (name: string) => {
    const input = inputRef.current;
    if (!input) return;
    const caret = input.selectionStart ?? text.length;
    const detected = detectAtToken(text, caret);
    if (!detected) return;
    const firstName = name.split(/\s+/)[0].toLowerCase();
    const before = text.slice(0, detected.start);
    const after = text.slice(caret);
    const token = `@${firstName} `;
    const next = `${before}${token}${after}`;
    setText(next);
    setMentionQuery(null);
    const newCaret = before.length + token.length;
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(newCaret, newCaret);
    });
  };

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

    // Optimistically clear input and play added chime instantly!
    const originalText = text;
    setText("");
    playSound("added");
    inputRef.current?.focus();

    startTransition(async () => {
      const res = await createTask(payload);
      if (res.error) {
        playSound("error");
        sileo.error({ title: res.error });
        setText(originalText); // Restore input text on error so draft isn't lost
        // Keep focus so the user can easily re-edit/try again
        inputRef.current?.focus();
      }
    });
  }, [parsed, defaultProjectId, currentUserId, text]);

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
        className={cn(
          "focus-ring group/add flex w-full items-center gap-2.5 text-left text-[13.5px] text-muted-foreground transition-[background-color,color,border-color,transform] duration-150 ease-[var(--ease-out)] active:scale-[0.997]",
          flat
            ? "border-t border-border/60 px-4 py-3 hover:bg-accent/30 hover:text-primary"
            : "rounded-xl border border-transparent px-4 py-2.5 hover:border-border/60 hover:bg-card hover:text-foreground"
        )}
      >
        <span
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md transition-[color,background-color] duration-150 ease-[var(--ease-out)]",
            flat
              ? "text-muted-foreground/70 group-hover/add:text-primary"
              : "text-muted-foreground/70 group-hover/add:bg-primary/10 group-hover/add:text-primary"
          )}
        >
          <Plus size={13} weight="bold" />
        </span>
        <span className={cn(!flat && "font-medium")}>Add task</span>
        <span
          className={cn(
            "ml-auto text-[11px] tabular-nums opacity-0 transition-opacity duration-150 ease-[var(--ease-out)] group-hover/add:opacity-100",
            flat
              ? "text-muted-foreground/50 group-hover/add:text-primary/70"
              : "text-muted-foreground/50"
          )}
        >
          Q
        </span>
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative rounded-xl border border-border bg-card shadow-soft-xs"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-[6px] border border-muted-foreground/40 text-muted-foreground/70">
          <Plus size={13} weight="bold" />
        </span>
        <input
          ref={inputRef}
          autoFocus
          value={text}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            const caret = e.target.selectionStart ?? next.length;
            const det = detectAtToken(next, caret);
            if (det) {
              setMentionQuery(det.query);
              setMentionIdx(0);
            } else {
              setMentionQuery(null);
            }
          }}
          onKeyDown={(e) => {
            if (mentionQuery !== null) {
              // Escape always closes the picker, even with zero matches.
              if (e.key === "Escape") {
                e.preventDefault();
                setMentionQuery(null);
                return;
              }
              if (mentionMatches.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIdx((i) => (i + 1) % mentionMatches.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIdx(
                    (i) =>
                      (i - 1 + mentionMatches.length) % mentionMatches.length
                  );
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(mentionMatches[mentionIdx].name);
                  return;
                }
              }
            }
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

      {/* @mention picker — same shape as the comment composer's, but
          inserts a plain "@firstname " token so the natural-language
          parser handles the resolution. Stays open while @… is being
          typed even when nothing matches — Figma-style — so the user
          knows the trigger is live and can correct course. */}
      <AnimatePresence>
        {mentionQuery !== null && (
          <motion.div
            key="mention-pop-inline"
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: "spring", duration: 0.22, bounce: 0.12 }}
            role="listbox"
            aria-label="Assignee suggestions"
            className="absolute left-12 top-full z-50 mt-1.5 min-w-[240px] max-w-[300px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-soft-md ring-1 ring-foreground/5"
          >
            <p className="px-2 pb-1 pt-1.5 text-[11.5px] font-medium text-muted-foreground/70">
              {mentionQuery.trim() === ""
                ? "Mention someone"
                : `Matches for “${mentionQuery}”`}
            </p>
            {mentionMatches.length === 0 ? (
              <div className="px-2 py-2.5 text-[12.5px] text-muted-foreground">
                No people found
              </div>
            ) : (
              mentionMatches.map((m, i) => {
                const active = i === mentionIdx;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setMentionIdx(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(m.name);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-[var(--ease-out)]",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/40"
                    )}
                  >
                    <Avatar
                      src={m.avatar_url}
                      initials={m.initials}
                      color={m.avatar_color}
                      size={22}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                      {m.name}
                    </span>
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
    project:
      "border-primary/30 bg-primary/8 text-primary " +
      "dark:bg-primary/15 dark:text-primary dark:border-primary/40",
    assignee:
      "border-violet-500/30 bg-violet-50 text-violet-700 " +
      "dark:bg-violet-500/15 dark:text-violet-200 dark:border-violet-400/30",
    priority:
      "border-amber-500/30 bg-amber-50 text-amber-700 " +
      "dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/30",
    due:
      "border-emerald-500/30 bg-emerald-50 text-emerald-700 " +
      "dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/30",
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
