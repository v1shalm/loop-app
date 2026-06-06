import type { WidgetSize, WidgetType } from "./types";

/** Static metadata for a widget type (no React yet — components land later). */
export interface WidgetMeta {
  title: string;
  /** Sizes this widget supports, in S→L order. */
  supportedSizes: WidgetSize[];
  defaultSize: WidgetSize;
  /** May appear more than once on a board (e.g. sticky notes). */
  allowMultiple: boolean;
}

export const ALL_WIDGET_TYPES: WidgetType[] = [
  "tasks",
  "teams",
  "my-status",
  "notifications",
  "sticky-note",
];

export const WIDGET_META: Record<WidgetType, WidgetMeta> = {
  tasks: { title: "Tasks", supportedSizes: ["S", "M", "L"], defaultSize: "M", allowMultiple: false },
  teams: { title: "Teams", supportedSizes: ["S", "M", "L"], defaultSize: "L", allowMultiple: false },
  "my-status": { title: "My Status", supportedSizes: ["S", "M"], defaultSize: "S", allowMultiple: false },
  notifications: { title: "Notifications", supportedSizes: ["S", "M", "L"], defaultSize: "M", allowMultiple: false },
  "sticky-note": { title: "Sticky Note", supportedSizes: ["S", "M", "L"], defaultSize: "S", allowMultiple: true },
};

export function widgetMeta(type: WidgetType): WidgetMeta {
  return WIDGET_META[type];
}
