"use client";

import { useMemo } from "react";
import { useTeamContext } from "@/components/team-provider";
import { cn } from "@/lib/utils";

/**
 * Render plain-text strings (typically task titles, but works for any
 * short user-typed string) with `@firstname` / `@First Last` patterns
 * detected and rendered as inline chips when they match a real team
 * member.
 *
 * Why a separate component from <MentionRenderer/> in mention-input.tsx:
 *   • Comments use a structured storage format `@[Name](id)` because
 *     they have a MentionInput that captures the id at type-time.
 *   • Task titles use a plain <textarea>, so what we have in the DB is
 *     just the raw string the user typed. We have to resolve the
 *     mention against `members` at render time.
 *
 * Matching strategy (greedy-by-length so "@John Smith" wins over
 * "@John"):
 *   1. Build a set of name tokens from the members list — full names,
 *      first names, and known nicknames (initials lowercased).
 *   2. For each "@…" segment, try the longest possible match.
 *   3. Anything that doesn't resolve renders as plain "@text".
 *
 * The current user's own @mention is styled slightly stronger (filled
 * pink background) so a task that mentions you visually pops in lists.
 */
export function MentionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const { members, currentUserId } = useTeamContext();

  const parts = useMemo(() => {
    if (!text || members.length === 0) {
      return [{ type: "text" as const, value: text ?? "" }];
    }
    return splitMentions(text, members, currentUserId);
  }, [text, members, currentUserId]);

  if (parts.length === 1 && parts[0].type === "text") {
    // Fast path — no mentions in this string, render unchanged so the
    // common case doesn't pay the chip-wrapping cost.
    return <>{text}</>;
  }

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "text" ? (
          <span key={i}>{p.value}</span>
        ) : (
          <MentionChip key={i} name={p.name} isSelf={p.isSelf} />
        )
      )}
    </span>
  );
}

interface NameMatch {
  id: string;
  name: string;
  /** Lowercased token we'll match against (first name, or full name). */
  token: string;
  /** Token length in original-case characters for slicing. */
  length: number;
}

type Part =
  | { type: "text"; value: string }
  | { type: "mention"; name: string; id: string; isSelf: boolean };

function splitMentions(
  input: string,
  members: { id: string; name: string; initials?: string }[],
  currentUserId: string
): Part[] {
  // Build the lookup. Sort by length descending so the longest match wins
  // when we try candidates against the remaining input.
  const candidates: NameMatch[] = [];
  for (const m of members) {
    const full = m.name.trim();
    if (!full) continue;
    candidates.push({ id: m.id, name: full, token: full.toLowerCase(), length: full.length });
    const first = full.split(/\s+/)[0];
    if (first && first !== full) {
      candidates.push({
        id: m.id,
        name: full,
        token: first.toLowerCase(),
        length: first.length,
      });
    }
  }
  candidates.sort((a, b) => b.length - a.length);

  const out: Part[] = [];
  const re = /@[A-Za-z][\w'.\- ]*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(input))) {
    const start = m.index;
    const after = input.slice(start + 1); // strip the leading @
    // Find the longest candidate token that the @segment begins with —
    // case-insensitive, word-boundary terminated.
    const match = candidates.find((c) =>
      after.toLowerCase().startsWith(c.token) &&
      // Boundary check: char after the matched token must be non-word
      // (space, punctuation, EOL). Prevents "@priyab" matching "@priya".
      !/[A-Za-z0-9_]/.test(after.charAt(c.length))
    );

    if (!match) {
      // Skip ahead past this @-segment but don't emit a chip — leave it
      // as text. We advance the regex's lastIndex implicitly.
      continue;
    }

    // Emit preceding text.
    if (start > lastIndex) {
      out.push({ type: "text", value: input.slice(lastIndex, start) });
    }
    out.push({
      type: "mention",
      name: match.name,
      id: match.id,
      isSelf: match.id === currentUserId,
    });

    // Move the cursor past the consumed @token.
    const consumed = 1 + match.length; // @ + token chars
    lastIndex = start + consumed;
    re.lastIndex = lastIndex;
  }

  if (lastIndex < input.length) {
    out.push({ type: "text", value: input.slice(lastIndex) });
  }
  if (out.length === 0) {
    out.push({ type: "text", value: input });
  }
  return out;
}

function MentionChip({ name, isSelf }: { name: string; isSelf: boolean }) {
  return (
    <span
      data-mention
      className={cn(
        "inline-flex items-center rounded px-1 align-baseline text-[0.95em] font-medium",
        isSelf
          ? "bg-primary/20 text-primary"
          : "bg-primary/10 text-primary/90"
      )}
    >
      @{name}
    </span>
  );
}
