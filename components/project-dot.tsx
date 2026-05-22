/**
 * Small color dot for projects in the sidebar / pickers. Reads the stored
 * project.color when set; otherwise picks a deterministic palette entry
 * keyed off the project id so the same project always gets the same color
 * across sessions.
 */
const PALETTE = [
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#F59E0B", // amber
  "#10B981", // emerald
  "#EC4899", // pink
  "#3B82F6", // blue
  "#F43F5E", // rose
  "#84CC16", // lime
  "#A855F7", // purple
  "#0EA5E9", // sky
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h << 5) - h + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function projectColor(project: {
  id: string;
  color?: string | null;
}): string {
  if (project.color) return project.color;
  return PALETTE[hash(project.id) % PALETTE.length];
}

export function ProjectDot({
  project,
  size = 8,
  className,
}: {
  project: { id: string; color?: string | null };
  size?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: projectColor(project),
      }}
    />
  );
}
