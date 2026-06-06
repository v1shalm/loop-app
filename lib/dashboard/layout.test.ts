import { describe, it, expect } from "vitest";
import {
  addWidget,
  removeWidget,
  resizeWidget,
  reorderWidgets,
  normalizeOrders,
} from "./layout";
import type { DashboardWidget } from "./types";

const w = (
  id: string,
  order: number,
  over: Partial<DashboardWidget> = {}
): DashboardWidget => ({
  id,
  type: "sticky-note",
  order,
  size: "M",
  settings: {},
  ...over,
});

describe("normalizeOrders", () => {
  it("reindexes to a 0-based contiguous sequence by current order", () => {
    const out = normalizeOrders([w("a", 5), w("b", 2), w("c", 9)]);
    expect(out.map((x) => [x.id, x.order])).toEqual([
      ["b", 0],
      ["a", 1],
      ["c", 2],
    ]);
  });
});

describe("addWidget", () => {
  it("appends a new widget at the end with the given size", () => {
    const out = addWidget([w("a", 0)], "tasks", "L");
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({ type: "tasks", size: "L", order: 1 });
    expect(out[1].id).toBeTruthy();
  });
});

describe("removeWidget", () => {
  it("removes by id and renumbers the rest contiguously", () => {
    const out = removeWidget([w("a", 0), w("b", 1), w("c", 2)], "b");
    expect(out.map((x) => [x.id, x.order])).toEqual([
      ["a", 0],
      ["c", 1],
    ]);
  });
});

describe("resizeWidget", () => {
  it("sets the size of the target widget only", () => {
    const out = resizeWidget([w("a", 0), w("b", 1)], "b", "S");
    expect(out.find((x) => x.id === "b")!.size).toBe("S");
    expect(out.find((x) => x.id === "a")!.size).toBe("M");
  });
});

describe("reorderWidgets", () => {
  it("moves active before/over target and renumbers", () => {
    const out = reorderWidgets([w("a", 0), w("b", 1), w("c", 2)], "c", "a");
    expect(out.map((x) => x.id)).toEqual(["c", "a", "b"]);
    expect(out.map((x) => x.order)).toEqual([0, 1, 2]);
  });

  it("is a no-op when active === over", () => {
    const input = [w("a", 0), w("b", 1)];
    const out = reorderWidgets(input, "a", "a");
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("returns a normalized copy when an id is not found", () => {
    const out = reorderWidgets([w("a", 3), w("b", 7)], "zzz", "a");
    expect(out.map((x) => x.id)).toEqual(["a", "b"]);
    expect(out.map((x) => x.order)).toEqual([0, 1]);
  });
});
