import { Kanban } from "@/components/icons";

/**
 * Small workspace (department) indicator: a rounded tile softly tinted
 * in the workspace's colour with a matching glyph. Replaces the flat
 * colour-square-with-initial — reads as an intentional identity badge
 * rather than a harsh monogram, and stays legible at small sizes.
 */
export function WorkspaceBadge({
  color,
  size = 24,
}: {
  color?: string | null;
  size?: number;
}) {
  const c = color ?? "#94a3b8";
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md"
      style={{
        width: size,
        height: size,
        // 8-digit hex: the colour at ~15% alpha for the tile, full
        // strength for the glyph. Workspace colours are controlled
        // 6-digit hex, so the suffix is safe.
        backgroundColor: `${c}26`,
        color: c,
      }}
    >
      <Kanban size={Math.round(size * 0.56)} weight="bold" />
    </span>
  );
}
