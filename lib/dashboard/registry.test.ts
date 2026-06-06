import { describe, it, expect } from "vitest";
import { WIDGET_META, widgetMeta, ALL_WIDGET_TYPES } from "./registry";

describe("widget registry meta", () => {
  it("has metadata for every v1 widget type", () => {
    expect(ALL_WIDGET_TYPES).toEqual([
      "tasks",
      "teams",
      "my-status",
      "notifications",
      "sticky-note",
    ]);
    for (const t of ALL_WIDGET_TYPES) {
      expect(WIDGET_META[t].title).toBeTruthy();
      expect(WIDGET_META[t].supportedSizes.length).toBeGreaterThan(0);
      expect(WIDGET_META[t].supportedSizes).toContain(WIDGET_META[t].defaultSize);
    }
  });

  it("widgetMeta(type) returns the entry", () => {
    expect(widgetMeta("tasks").title).toBe("Tasks");
  });
});
