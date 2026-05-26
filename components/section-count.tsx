/**
 * Small monochrome count chip used next to section titles to show how
 * many items live in that section. Replaces the verbose `{n} tasks`
 * pattern that competed with the section title for attention.
 *
 * The word "task" is dropped on purpose — in context (a list of tasks
 * grouped by date / status / project) the unit is obvious. The chip
 * itself signals "this is a count," not free-form text. Saves
 * ~30–40px of horizontal space per section header and produces a more
 * scannable list of section titles.
 *
 * Visual: muted rounded pill with tabular number. Neutral grey so it
 * reads as metadata regardless of the title color (Overdue / Today /
 * Upcoming all share the same chip styling).
 */
export function SectionCount({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="chip-3d inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-inset ring-border/60">
      {n}
    </span>
  );
}
