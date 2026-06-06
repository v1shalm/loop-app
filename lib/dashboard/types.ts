/** The three user-facing widget footprints. */
export type WidgetSize = "S" | "M" | "L";

/** Registry keys for v1 widgets. Extend as subsystems land. */
export type WidgetType =
  | "tasks"
  | "teams"
  | "my-status"
  | "notifications"
  | "sticky-note";

/** A widget placed on a user's canvas (mirrors a dashboard_widgets row). */
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  /** 0-based position; auto-pack order for Approach B. */
  order: number;
  size: WidgetSize;
  /** Per-instance config (Teams selection, sticky text, etc.). */
  settings: Record<string, unknown>;
}

/** A user's whole canvas. */
export interface DashboardLayout {
  locked: boolean;
  widgets: DashboardWidget[];
}
