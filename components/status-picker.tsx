import type { ProfileStatus } from "@/lib/queries";

/**
 * Single source of truth for status labels. The keys are preserved
 * for backward compat with existing rows (coffee / focus / done / busy);
 * the labels are plain text — no emojis anywhere in the UI.
 */
export const STATUS_META: Record<
  NonNullable<ProfileStatus>,
  { label: string }
> = {
  coffee: { label: "Coffee break" },
  focus: { label: "Heads down" },
  done: { label: "Done for today" },
  busy: { label: "Busy" },
};

export function statusLabel(status: ProfileStatus): string | null {
  if (!status) return null;
  return STATUS_META[status].label;
}
