/**
 * Recurring-task rules. A rule is a compact string stored on tasks.recurrence:
 *
 *   daily | weekdays | weekly | weekly:N (N=0..6, 0=Sun) | monthly | yearly
 *
 * Completing a recurring task advances its due date to the next occurrence
 * (the task stays open) rather than marking it done.
 */

const DOW_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const WEEKDAY_NUM: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const VALID = /^(daily|weekdays|weekly(:[0-6])?|monthly|yearly)$/;

export function isRecurrence(rule: string | null | undefined): rule is string {
  return !!rule && VALID.test(rule);
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 0, 0);
  return r;
}

/**
 * The next due date strictly after `from`, per the rule. Preserves the
 * time-of-day of `from`.
 */
export function nextOccurrence(rule: string, from: Date): Date {
  const d = new Date(from);
  const [kind, arg] = rule.split(":");

  switch (kind) {
    case "daily":
      d.setDate(d.getDate() + 1);
      return d;

    case "weekdays":
      do {
        d.setDate(d.getDate() + 1);
      } while (d.getDay() === 0 || d.getDay() === 6);
      return d;

    case "weekly": {
      if (arg !== undefined && arg !== "") {
        const target = parseInt(arg, 10);
        let diff = (target - d.getDay() + 7) % 7;
        if (diff === 0) diff = 7; // strictly after
        d.setDate(d.getDate() + diff);
        return d;
      }
      d.setDate(d.getDate() + 7);
      return d;
    }

    case "monthly": {
      const day = d.getDate();
      d.setDate(1); // avoid month-overflow (e.g. Jan 31 -> Mar)
      d.setMonth(d.getMonth() + 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, lastDay));
      return d;
    }

    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      return d;

    default:
      d.setDate(d.getDate() + 1);
      return d;
  }
}

export function recurrenceLabel(rule: string): string {
  const [kind, arg] = rule.split(":");
  switch (kind) {
    case "daily":
      return "Every day";
    case "weekdays":
      return "Every weekday";
    case "weekly":
      return arg !== undefined && arg !== ""
        ? `Every ${DOW_LONG[parseInt(arg, 10)]}`
        : "Every week";
    case "monthly":
      return "Every month";
    case "yearly":
      return "Every year";
    default:
      return "Repeats";
  }
}

/** The fixed set offered by the recurrence picker, anchored to a due date. */
export const RECURRENCE_OPTIONS = [
  "daily",
  "weekdays",
  "weekly",
  "monthly",
  "yearly",
] as const;

/**
 * Scan free text for a recurrence phrase ("every monday", "daily",
 * "every weekday", ...). Returns the rule, the first due date, the matched
 * substring (to strip from the title), and a human label. Case-insensitive;
 * the returned `matched` is in the input's original case.
 */
export function detectRecurrence(
  input: string,
  now: Date
): { rule: string; due: Date; matched: string; label: string } | null {
  // "every <weekday>"
  let m = input.match(
    /\bevery (sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\b/i
  );
  if (m) {
    const n = WEEKDAY_NUM[m[1].toLowerCase()];
    const rule = `weekly:${n}`;
    const d = new Date(now);
    const diff = (n - d.getDay() + 7) % 7; // 0 = today counts as first
    d.setDate(d.getDate() + diff);
    return { rule, due: endOfDay(d), matched: m[0], label: recurrenceLabel(rule) };
  }

  // "every day" / "daily"
  m = input.match(/\b(every day|daily)\b/i);
  if (m)
    return { rule: "daily", due: endOfDay(now), matched: m[0], label: "Every day" };

  // "every weekday" / "weekdays"
  m = input.match(/\b(every weekday|weekdays)\b/i);
  if (m) {
    const d = new Date(now);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return { rule: "weekdays", due: endOfDay(d), matched: m[0], label: "Every weekday" };
  }

  // "every week" / "weekly"
  m = input.match(/\b(every week|weekly)\b/i);
  if (m)
    return { rule: "weekly", due: endOfDay(now), matched: m[0], label: "Every week" };

  // "every month" / "monthly"
  m = input.match(/\b(every month|monthly)\b/i);
  if (m)
    return { rule: "monthly", due: endOfDay(now), matched: m[0], label: "Every month" };

  // "every year" / "yearly" / "annually"
  m = input.match(/\b(every year|yearly|annually)\b/i);
  if (m)
    return { rule: "yearly", due: endOfDay(now), matched: m[0], label: "Every year" };

  return null;
}
