/**
 * Natural-language task parser.
 *
 * Recognises tokens anywhere in the input string:
 *   #project-name     → looks up against `projects` list
 *   @first-name       → looks up against `members` list (first name, full, or initials)
 *   p1 | p2 | p3 | p4 → priority
 *   !1 | !2 | !3 | !4 → priority (alternate syntax)
 *   today | tonight | tomorrow | tmrw
 *   monday..sunday    → next occurrence (today if today, else upcoming)
 *   next week         → seven days from now, end of day
 *   in N days         → N days from now
 *   D MMM | MMM D     → specific date (e.g. "15 Dec", "Dec 15")
 *
 * Returns a clean `title` with all matched tokens stripped, plus the
 * resolved IDs/values. Order of tokens doesn't matter; later overrides earlier.
 *
 * Project + assignee resolution is fuzzy: case-insensitive, allows
 * hyphens to match spaces ("client-launch" → "Client Launch"), matches
 * on initials too ("vm" → "Vishal Maurya").
 */

import type { Profile, Project } from "@/lib/queries";

export type Priority = 1 | 2 | 3 | 4;

export interface ParseContext {
  projects: Pick<Project, "id" | "name">[];
  members: Pick<Profile, "id" | "name" | "initials">[];
  now?: Date;
}

export interface ParsedTask {
  title: string;
  priority: Priority | null;
  dueAt: Date | null;
  projectId: string | null;
  assigneeId: string | null;
}

export interface ParseHint {
  kind: "project" | "assignee" | "priority" | "due";
  label: string;
}

export interface ParseResult extends ParsedTask {
  hints: ParseHint[];
}

const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[\s_-]+/g, " ").trim();
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 0, 0);
  return r;
}

function resolveProject(
  raw: string,
  projects: ParseContext["projects"]
): Project | undefined {
  const slug = normalizeSlug(raw);
  if (!slug) return undefined;
  // Prefer exact, fall back to prefix.
  const exact = projects.find((p) => normalizeSlug(p.name) === slug);
  if (exact) return exact as Project;
  return projects.find((p) => normalizeSlug(p.name).startsWith(slug)) as
    | Project
    | undefined;
}

function resolveMember(
  raw: string,
  members: ParseContext["members"]
): Profile | undefined {
  const slug = normalizeSlug(raw);
  if (!slug) return undefined;

  // Exact first-name match wins (most common: "@vishal").
  const byFirst = members.find(
    (m) => m.name.split(/\s+/)[0]?.toLowerCase() === slug
  );
  if (byFirst) return byFirst as Profile;

  // Initials ("vm" → "Vishal Maurya").
  const byInitials = members.find(
    (m) => m.initials.toLowerCase() === slug.replace(/\s+/g, "")
  );
  if (byInitials) return byInitials as Profile;

  // Full-name prefix.
  return members.find((m) =>
    normalizeSlug(m.name).startsWith(slug)
  ) as Profile | undefined;
}

function parseDateToken(
  token: string,
  now: Date
): Date | null {
  const t = token.toLowerCase().trim();

  if (t === "today") return endOfDay(now);
  if (t === "tonight") {
    const d = new Date(now);
    d.setHours(21, 0, 0, 0);
    return d;
  }
  if (t === "tomorrow" || t === "tmrw" || t === "tmr") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return endOfDay(d);
  }

  if (t === "next week") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return endOfDay(d);
  }

  // "in N days"
  const inDays = t.match(/^in (\d+) days?$/);
  if (inDays) {
    const n = parseInt(inDays[1], 10);
    if (n > 0 && n < 365) {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      return endOfDay(d);
    }
  }

  // Weekday names — next occurrence (today counts only if explicit "today")
  if (WEEKDAYS[t] !== undefined) {
    const target = WEEKDAYS[t];
    const d = new Date(now);
    let diff = (target - d.getDay() + 7) % 7;
    if (diff === 0) diff = 7; // never "today" — that's explicit
    d.setDate(d.getDate() + diff);
    return endOfDay(d);
  }

  // "D MMM" or "MMM D"
  const dm = t.match(/^(\d{1,2}) ([a-z]{3,9})$/);
  const md = t.match(/^([a-z]{3,9}) (\d{1,2})$/);
  if (dm) {
    const day = parseInt(dm[1], 10);
    const month = MONTHS[dm[2]];
    if (month !== undefined && day >= 1 && day <= 31) {
      return makeFutureDate(now, month, day);
    }
  }
  if (md) {
    const month = MONTHS[md[1]];
    const day = parseInt(md[2], 10);
    if (month !== undefined && day >= 1 && day <= 31) {
      return makeFutureDate(now, month, day);
    }
  }

  return null;
}

function makeFutureDate(now: Date, month: number, day: number): Date {
  const d = new Date(now.getFullYear(), month, day, 23, 59, 0, 0);
  // If the date already passed this year, assume next year.
  if (d.getTime() < now.getTime()) {
    d.setFullYear(d.getFullYear() + 1);
  }
  return d;
}

/**
 * Walks the input and pulls out any recognized tokens. Tokens are matched
 * greedily but case-insensitively; the bits left over become the title.
 */
export function parseTask(
  input: string,
  ctx: ParseContext
): ParseResult {
  const now = ctx.now ?? new Date();
  const hints: ParseHint[] = [];
  let title = input;

  let priority: Priority | null = null;
  let dueAt: Date | null = null;
  let projectId: string | null = null;
  let assigneeId: string | null = null;

  // 1. Priority — p1..p4 or !1..!4, whitespace-delimited
  const priMatch = title.match(/(?:^|\s)([p!])([1-4])(?=\s|$)/i);
  if (priMatch) {
    priority = parseInt(priMatch[2], 10) as Priority;
    hints.push({ kind: "priority", label: `P${priority}` });
    title = title.replace(priMatch[0], " ");
  }

  // 2. Project — #slug (allow letters, digits, hyphens, underscores)
  const projMatch = title.match(/(?:^|\s)#([a-z0-9][a-z0-9_-]*)/i);
  if (projMatch) {
    const proj = resolveProject(projMatch[1], ctx.projects);
    if (proj) {
      projectId = proj.id;
      hints.push({ kind: "project", label: proj.name });
      title = title.replace(projMatch[0], " ");
    }
  }

  // 3. Assignee — @slug (letters, digits, dot, hyphen)
  const asgMatch = title.match(/(?:^|\s)@([a-z0-9][a-z0-9.\-]*)/i);
  if (asgMatch) {
    const m = resolveMember(asgMatch[1], ctx.members);
    if (m) {
      assigneeId = m.id;
      hints.push({
        kind: "assignee",
        label: m.name.split(/\s+/)[0],
      });
      title = title.replace(asgMatch[0], " ");
    }
  }

  // 4. Multi-word dates first ("next week", "in N days", "D MMM", "MMM D")
  const multi = [
    /\b(in \d+ days?)\b/i,
    /\b(next week)\b/i,
    /\b(\d{1,2} (?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:[a-z]*))\b/i,
    /\b((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)(?:[a-z]*) \d{1,2})\b/i,
  ];
  for (const re of multi) {
    if (dueAt) break;
    const m = title.match(re);
    if (!m) continue;
    const parsed = parseDateToken(m[1], now);
    if (parsed) {
      dueAt = parsed;
      hints.push({ kind: "due", label: m[1].toLowerCase() });
      title = title.replace(m[0], " ");
    }
  }

  // 5. Single-word dates (today, tonight, tomorrow, weekday)
  if (!dueAt) {
    const singleRe =
      /\b(today|tonight|tomorrow|tmrw|tmr|sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/i;
    const m = title.match(singleRe);
    if (m) {
      const parsed = parseDateToken(m[1], now);
      if (parsed) {
        dueAt = parsed;
        hints.push({ kind: "due", label: m[1].toLowerCase() });
        title = title.replace(m[0], " ");
      }
    }
  }

  // Clean up: collapse whitespace, trim.
  title = title.replace(/\s+/g, " ").trim();

  return { title, priority, dueAt, projectId, assigneeId, hints };
}
