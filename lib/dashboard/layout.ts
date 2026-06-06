import type { DashboardWidget, WidgetSize, WidgetType } from "./types";

/** Sort by current order, then renumber 0..n. Pure. */
export function normalizeOrders(
  widgets: DashboardWidget[]
): DashboardWidget[] {
  return [...widgets]
    .sort((a, b) => a.order - b.order)
    .map((wgt, i) => (wgt.order === i ? wgt : { ...wgt, order: i }));
}

/** Append a new widget of `type` at `size`, ordered last. */
export function addWidget(
  widgets: DashboardWidget[],
  type: WidgetType,
  size: WidgetSize
): DashboardWidget[] {
  const next: DashboardWidget = {
    id: cryptoId(),
    type,
    size,
    order: widgets.length,
    settings: {},
  };
  return normalizeOrders([...widgets, next]);
}

/** Remove by id, renumbering the remainder. */
export function removeWidget(
  widgets: DashboardWidget[],
  id: string
): DashboardWidget[] {
  return normalizeOrders(widgets.filter((wgt) => wgt.id !== id));
}

/** Change one widget's size; leave the rest untouched. */
export function resizeWidget(
  widgets: DashboardWidget[],
  id: string,
  size: WidgetSize
): DashboardWidget[] {
  return widgets.map((wgt) => (wgt.id === id ? { ...wgt, size } : wgt));
}

/** Move `activeId` to `overId`'s slot (array-move semantics), then renumber. */
export function reorderWidgets(
  widgets: DashboardWidget[],
  activeId: string,
  overId: string
): DashboardWidget[] {
  if (activeId === overId) return widgets;
  const ordered = normalizeOrders(widgets);
  const from = ordered.findIndex((wgt) => wgt.id === activeId);
  const to = ordered.findIndex((wgt) => wgt.id === overId);
  if (from === -1 || to === -1) return ordered;
  const copy = [...ordered];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy.map((wgt, i) => (wgt.order === i ? wgt : { ...wgt, order: i }));
}

/** UUID for new client-side widgets. */
function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Last-resort fallback for environments without crypto.randomUUID.
  return `w_${Math.random().toString(36).slice(2)}`;
}
