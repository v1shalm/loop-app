import type { ProfileStatus } from "@/lib/queries";

/**
 * Single source of truth for status emoji + label.
 * Consumed by Team Pulse (sidebar list, hover popup, team detail page)
 * and by the status picker on /profile.
 */
export const STATUS_META: Record<
  NonNullable<ProfileStatus>,
  { emoji: string; label: string }
> = {
  coffee: { emoji: "☕", label: "Coffee mode" },
  focus: { emoji: "🔥", label: "Focus mode" },
  done: { emoji: "✨", label: "Done for today" },
  busy: { emoji: "😵", label: "Busy" },
};

export function statusEmoji(status: ProfileStatus): string | null {
  if (!status) return null;
  return STATUS_META[status].emoji;
}

export function statusLabel(status: ProfileStatus): string | null {
  if (!status) return null;
  return STATUS_META[status].label;
}
