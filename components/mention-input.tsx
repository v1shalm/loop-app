"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";

/**
 * Figma-style @mention picker.
 *
 * Wraps a textarea. When the user types "@" at a word boundary, an
 * autocomplete popover opens directly under the caret with a filtered
 * list of mentionable people. Arrow keys navigate; Enter or Tab inserts
 * the mention; Escape closes; clicking outside closes. Empty filters
 * keep the popover open with a "no people found" hint so the trigger
 * never looks broken — matches Figma.
 *
 * Storage format: `@[<display name>](<user-id>)`. The user's id is the
 * canonical reference; the display name is kept so renames don't break
 * older comments and we can render without an extra lookup.
 *
 * Why a textarea with a hidden mirror instead of contenteditable: a
 * textarea handles autosize, paste, selection, accessibility, and IME
 * correctly out of the box. The mirror is a one-time render trick to
 * measure caret pixel position. Way less ceremony than maintaining a
 * rich-text editor.
 */

export interface Mentionable {
  id: string;
  name: string;
  initials: string;
  avatar_color: string;
  avatar_url?: string | null;
  role?: string | null;
}

export interface MentionInputHandle {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
}

interface MentionInputProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: () => void; // Cmd/Ctrl+Enter
  members: Mentionable[];
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

/** Render a mention token to a chip. Used at read-time by
 *  <MentionRenderer/> below. */
export function renderMentionChip(name: string) {
  return (
    <span
      data-mention
      className="inline-flex items-center rounded px-1 py-px text-[12.5px] font-medium text-primary bg-primary/12 dark:bg-primary/20 dark:text-primary"
    >
      @{name}
    </span>
  );
}

/** Strip mention tokens to a plain string. Useful for plaintext
 *  notifications, summaries, etc. */
export function mentionsToPlainText(input: string): string {
  return input.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, "@$1");
}

/** Collect mentioned user ids from a comment body. */
export function extractMentionIds(input: string): string[] {
  const out: string[] = [];
  const re = /@\[[^\]]+\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) out.push(m[1]);
  return [...new Set(out)];
}

/** Figma-style filtering: case-insensitive substring on full name, plus
 *  prefix-match on initials so typing "AM" surfaces "Alex Martinez". */
function rankMembers(members: Mentionable[], query: string): Mentionable[] {
  const q = query.trim().toLowerCase();
  if (q === "") return members.slice(0, 8);
  const scored = members
    .map((m) => {
      const name = m.name.toLowerCase();
      const initials = m.initials.toLowerCase();
      let score = -1;
      if (name.startsWith(q)) score = 3;
      else if (name.includes(` ${q}`)) score = 2;
      else if (name.includes(q)) score = 1;
      else if (initials.startsWith(q)) score = 2;
      return { m, score };
    })
    .filter((x) => x.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return scored.map((x) => x.m);
}

export const MentionInput = forwardRef<MentionInputHandle, MentionInputProps>(
  function MentionInput(
    {
      value: controlledValue,
      defaultValue = "",
      onChange,
      onSubmit,
      members,
      placeholder,
      minRows = 2,
      maxRows = 10,
      className,
      disabled,
      ariaLabel,
    },
    ref
  ) {
    const isControlled = controlledValue !== undefined;
    const [internal, setInternal] = useState(defaultValue);
    const value = isControlled ? controlledValue! : internal;

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mirrorRef = useRef<HTMLDivElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Anchor + query state for the autocomplete popover
    const [openAt, setOpenAt] = useState<{
      top: number;
      left: number;
    } | null>(null);
    const [query, setQuery] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);

    const setValue = (next: string) => {
      if (!isControlled) setInternal(next);
      onChange?.(next);
    };

    const filtered = useMemo(() => {
      if (!openAt) return [];
      return rankMembers(members, query);
    }, [openAt, query, members]);

    // Reset active row when the filtered list changes (Figma behaviour:
    // top result stays the default).
    useEffect(() => {
      setActiveIdx(0);
    }, [query, openAt]);

    const resize = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      const next = Math.min(ta.scrollHeight, maxRows * 24);
      ta.style.height = `${next}px`;
    }, [maxRows]);

    useLayoutEffect(() => {
      resize();
    }, [value, resize]);

    /** Caret-aware @ detection. Looks back from the caret for an unclosed
     *  @ token at a word boundary, returns its index + the query slice. */
    const detectMention = (
      input: string,
      caret: number
    ): { start: number; query: string } | null => {
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
        if (caret - i > 30) return null;
        i--;
      }
      return null;
    };

    /** Measure pixel position of the caret using a hidden mirror div.
     *  Returns coordinates relative to the wrapper, which is the popover's
     *  positioning parent. */
    const measureCaret = (caretIndex: number): { top: number; left: number } => {
      const ta = textareaRef.current;
      const mirror = mirrorRef.current;
      const wrapper = wrapperRef.current;
      if (!ta || !mirror || !wrapper) return { top: 0, left: 0 };

      const cs = window.getComputedStyle(ta);
      const props: (keyof CSSStyleDeclaration)[] = [
        "fontFamily",
        "fontSize",
        "fontWeight",
        "letterSpacing",
        "lineHeight",
        "padding",
        "border",
        "boxSizing",
        "width",
        "tabSize",
      ];
      for (const p of props) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mirror.style as any)[p] = (cs as any)[p];
      }
      // Force same wrapping behavior as the textarea so character flow
      // matches.
      mirror.style.position = "absolute";
      mirror.style.top = `${ta.offsetTop}px`;
      mirror.style.left = `${ta.offsetLeft}px`;
      mirror.style.visibility = "hidden";
      mirror.style.overflow = "hidden";
      mirror.style.whiteSpace = "pre-wrap";
      mirror.style.wordWrap = "break-word";
      mirror.style.pointerEvents = "none";

      const before = ta.value.slice(0, caretIndex);
      const after = ta.value.slice(caretIndex);
      mirror.innerHTML = "";
      mirror.appendChild(document.createTextNode(before));
      const marker = document.createElement("span");
      marker.textContent = "​"; // zero-width space
      mirror.appendChild(marker);
      mirror.appendChild(document.createTextNode(after));

      const markerRect = marker.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      // Resolve lineHeight when it's "normal" (no numeric value) by
      // falling back to 1.4 × font-size — close enough to drop the
      // popover under the caret line.
      const lineHeight =
        parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 20;
      return {
        top: markerRect.top - wrapperRect.top - ta.scrollTop + lineHeight,
        left: markerRect.left - wrapperRect.left - ta.scrollLeft,
      };
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const ta = e.target;
      const next = ta.value;
      setValue(next);
      const caret = ta.selectionStart ?? next.length;
      const detected = detectMention(next, caret);
      if (detected) {
        const pos = measureCaret(detected.start);
        setOpenAt(pos);
        setQuery(detected.query);
      } else {
        setOpenAt(null);
        setQuery("");
      }
    };

    const insertMention = (member: Mentionable) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const caret = ta.selectionStart ?? value.length;
      const detected = detectMention(value, caret);
      if (!detected) return;
      const before = value.slice(0, detected.start);
      const after = value.slice(caret);
      const token = `@[${member.name}](${member.id}) `;
      const next = `${before}${token}${after}`;
      setValue(next);
      setOpenAt(null);
      setQuery("");
      const newCaret = before.length + token.length;
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newCaret, newCaret);
      });
    };

    /** Figma-style atomic delete: if the caret sits right after a complete
     *  mention token, backspace removes the whole token in one keypress
     *  instead of nibbling characters off the end. */
    const handleBackspaceAtomicDelete = (
      e: React.KeyboardEvent<HTMLTextAreaElement>
    ): boolean => {
      const ta = textareaRef.current;
      if (!ta) return false;
      if (ta.selectionStart !== ta.selectionEnd) return false;
      const caret = ta.selectionStart ?? 0;
      if (caret === 0) return false;
      // Look back for a `@[name](id)` token whose end is at the caret
      // (or one space before — we insert a trailing space on accept).
      const slice = value.slice(Math.max(0, caret - 200), caret);
      const re = /@\[[^\]]+\]\([^)]+\)\s?$/;
      const m = slice.match(re);
      if (!m) return false;
      e.preventDefault();
      const tokenStart = caret - m[0].length;
      const next = value.slice(0, tokenStart) + value.slice(caret);
      setValue(next);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(tokenStart, tokenStart);
      });
      return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (openAt) {
        if (e.key === "Escape") {
          e.preventDefault();
          setOpenAt(null);
          return;
        }
        if (filtered.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIdx((i) => (i + 1) % filtered.length);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            insertMention(filtered[activeIdx]);
            return;
          }
        }
      }
      if (e.key === "Backspace" && handleBackspaceAtomicDelete(e)) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    };

    useImperativeHandle(
      ref,
      () => ({
        focus: () => textareaRef.current?.focus(),
        clear: () => {
          setValue("");
          if (textareaRef.current) textareaRef.current.value = "";
        },
        getValue: () => value,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [value]
    );

    useEffect(() => {
      if (!openAt) return;
      const onDoc = (e: MouseEvent) => {
        if (
          wrapperRef.current &&
          !wrapperRef.current.contains(e.target as Node)
        ) {
          setOpenAt(null);
        }
      };
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }, [openAt]);

    return (
      <div ref={wrapperRef} className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel}
          rows={minRows}
          className={cn(
            "block w-full resize-none bg-transparent text-[13.5px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground/60",
            className
          )}
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />

        {/* Caret-mirror. Hidden but kept in the DOM so layout queries
            are always valid. */}
        <div ref={mirrorRef} aria-hidden className="pointer-events-none" />

        {/* Suggestion popover — stays open while @… is being typed even
            if nothing matches. */}
        <AnimatePresence>
          {openAt && (
            <motion.div
              key="mention-pop"
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ type: "spring", duration: 0.22, bounce: 0.12 }}
              role="listbox"
              aria-label="Mention suggestions"
              className="absolute z-50 min-w-[240px] max-w-[300px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-soft-md ring-1 ring-foreground/5"
              style={{
                top: openAt.top + 4,
                left: Math.max(0, openAt.left),
              }}
            >
              <p className="px-2 pb-1 pt-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/70">
                {query.trim() === ""
                  ? "Mention someone"
                  : `Matches for “${query}”`}
              </p>
              {filtered.length === 0 ? (
                <div className="px-2 py-2.5 text-[12.5px] text-muted-foreground">
                  No people found
                </div>
              ) : (
                filtered.map((m, i) => {
                  const active = i === activeIdx;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setActiveIdx(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(m);
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
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {m.name}
                        </span>
                        {m.role && (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {m.role}
                          </span>
                        )}
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
);

// ── Renderer ───────────────────────────────────────────────────────────────

/**
 * Splits a mention-bearing string into a React tree where each mention
 * is rendered as a chip and the rest stays as text. Whitespace, line
 * breaks, and adjacent punctuation are preserved.
 */
export function MentionRenderer({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = useMemo(() => splitMentions(text), [text]);
  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <span key={i}>{renderMentionChip(p.name)}</span>
        )
      )}
    </span>
  );
}

type Part =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; id: string };

function splitMentions(input: string): Part[] {
  const re = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const out: Part[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    if (m.index > last) {
      out.push({ type: "text", value: input.slice(last, m.index) });
    }
    out.push({ type: "mention", name: m[1], id: m[2] });
    last = m.index + m[0].length;
  }
  if (last < input.length) {
    out.push({ type: "text", value: input.slice(last) });
  }
  return out;
}
