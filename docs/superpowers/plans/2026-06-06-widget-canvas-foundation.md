# Widget-Canvas Home — Plan 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the data spine and the test-driven layout logic for the customizable widget-canvas home — the persistence table, the typed widget model, the pure layout reducer (reorder/resize/add/remove + auto-pack), the widget registry, and the server actions to load/save a per-user layout. No UI yet; that is Plan 2.

**Architecture:** A focused `lib/dashboard/` module owns the new domain (types, reducer, registry, server actions). Persistence is a per-user `dashboards` row (lock flag) + `dashboard_widgets` rows (one per placed widget), with owner-only RLS so direct writes are safe (no SECURITY DEFINER RPC needed, unlike tasks). The layout reducer is pure and unit-tested; everything else builds on it.

**Tech Stack:** Next.js 16 (App Router, server actions), Supabase Postgres + RLS, TypeScript, Vitest (new — see Task 1), existing `@dnd-kit` + `motion` (used in Plan 2).

**Scope note:** This is Plan 1 of the widget-canvas sub-project (spec: `docs/superpowers/specs/2026-06-06-widget-canvas-home-design.md`, slice 1). Plans 2-6 (engine + Sticky Notes, Tasks/Notifications widgets + managers-only projects, status subsystem + Teams/My-Status widgets, floating sidebar, default-home flip) are authored after this lands.

---

### Task 1: Add a minimal Vitest runner

The project has no unit-test runner (lint + Playwright lib only). The spec requires test-driving the layout reducer, so we add Vitest (Vite-native, minimal config, no jsdom needed — the reducer is pure). **Decision flag:** if you'd rather not add a runner, skip this task and verify the reducer with a one-off `node` script instead; the rest of the plan is unaffected.

**Files:**
- Modify: `package.json` (devDeps + `test` script)
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm i -D vitest@^3`
Expected: `vitest` appears in `devDependencies`, install exits 0.

- [ ] **Step 2: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: Verify the runner works (no tests yet)**

Run: `npm test`
Expected: Vitest runs and reports "No test files found" (exit 0 or the "no tests" notice) — confirms the runner is wired.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest runner for dashboard logic"
```

---

### Task 2: Dashboard domain types

**Files:**
- Create: `lib/dashboard/types.ts`

- [ ] **Step 1: Write the types**

Create `lib/dashboard/types.ts`:
```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `lib/dashboard/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/types.ts
git commit -m "feat: dashboard widget domain types"
```

---

### Task 3: The pure layout reducer (TDD)

The riskiest logic. Pure functions over `DashboardWidget[]`; no IO. Written test-first.

**Files:**
- Create: `lib/dashboard/layout.ts`
- Test: `lib/dashboard/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/dashboard/layout.test.ts`:
```ts
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `layout.ts` has no such exports / module not found.

- [ ] **Step 3: Implement the reducer**

Create `lib/dashboard/layout.ts`:
```ts
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
  if (from === -1 || to === -1) return widgets;
  const copy = [...ordered];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy.map((wgt, i) => (wgt.order === i ? wgt : { ...wgt, order: i }));
}

/** UUID for new client-side widgets. Falls back for non-secure contexts. */
function cryptoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `w_${Math.abs(hashNow())}`;
}
function hashNow(): number {
  // Deterministic-enough id without Date.now in pure module scope:
  // callers run in browser/server where crypto.randomUUID exists; this is a
  // last-resort fallback only.
  let h = 0;
  const s = String(performance?.now?.() ?? 0);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/layout.ts lib/dashboard/layout.test.ts
git commit -m "feat: pure dashboard layout reducer with tests"
```

---

### Task 4: Persistence migration (dashboards + dashboard_widgets)

**Files:**
- Create: `supabase/migrations/0044_dashboard_widgets.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0044_dashboard_widgets.sql`:
```sql
-- 0044 — Per-user dashboard (widget canvas home).
-- Owner-only RLS, so the app writes directly (no SECURITY DEFINER RPC needed).
-- Idempotent and re-runnable.

begin;

-- One row per user: the lock flag (room for multi-dashboard later).
create table if not exists public.dashboards (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  locked     boolean not null default false,
  created_at timestamptz not null default now()
);

-- One row per placed widget.
create table if not exists public.dashboard_widgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  position   int  not null default 0,
  size       text not null default 'M' check (size in ('S','M','L')),
  settings   jsonb not null default '{}'::jsonb,
  grid       jsonb,                       -- reserved for Approach A (x/y/w/h)
  created_at timestamptz not null default now()
);

create index if not exists dashboard_widgets_user_pos_idx
  on public.dashboard_widgets (user_id, position);

alter table public.dashboards        enable row level security;
alter table public.dashboard_widgets enable row level security;

-- Owner-only policies (wrap auth.uid() in select per the perf lint).
drop policy if exists "dashboards_owner" on public.dashboards;
create policy "dashboards_owner" on public.dashboards
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "dashboard_widgets_owner" on public.dashboard_widgets;
create policy "dashboard_widgets_owner" on public.dashboard_widgets
  for all using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.dashboards        to authenticated;
grant select, insert, update, delete on public.dashboard_widgets to authenticated;

commit;
```

> **Note on column name:** the DB column is `position` (avoids quoting the SQL reserved word `order`); the TS field stays `order`. The action in Task 5 maps `position → order`.

- [ ] **Step 2: Apply the migration**

Apply via the Supabase MCP (the session has it) using `apply_migration` / `execute_sql` with the file's contents, OR hand to the user to run. After applying, verify:

Run (MCP `execute_sql`):
```sql
select table_name from information_schema.tables
where table_schema='public' and table_name in ('dashboards','dashboard_widgets');
```
Expected: both rows returned.

- [ ] **Step 3: Verify RLS is on**

Run (MCP `execute_sql`):
```sql
select relname, relrowsecurity from pg_class
where relname in ('dashboards','dashboard_widgets');
```
Expected: `relrowsecurity = true` for both.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0044_dashboard_widgets.sql
git commit -m "feat: dashboards + dashboard_widgets tables with owner RLS"
```

---

### Task 5: Server actions — load & save a user's dashboard

**Files:**
- Create: `lib/dashboard/actions.ts`

- [ ] **Step 1: Write the actions**

Create `lib/dashboard/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import type { DashboardLayout, DashboardWidget } from "./types";

interface Row {
  id: string;
  type: string;
  position: number;
  size: "S" | "M" | "L";
  settings: Record<string, unknown> | null;
}

/** Load the current user's dashboard (lock flag + ordered widgets). */
export async function getMyDashboard(): Promise<DashboardLayout> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { locked: false, widgets: [] };

  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { locked: false, widgets: [] };

  const [{ data: dash }, { data: rows }] = await Promise.all([
    supabase.from("dashboards").select("locked").eq("user_id", uid).maybeSingle(),
    supabase
      .from("dashboard_widgets")
      .select("id, type, position, size, settings")
      .eq("user_id", uid)
      .order("position", { ascending: true }),
  ]);

  const widgets: DashboardWidget[] = ((rows ?? []) as Row[]).map((r) => ({
    id: r.id,
    type: r.type as DashboardWidget["type"],
    order: r.position,
    size: r.size,
    settings: r.settings ?? {},
  }));

  return { locked: dash?.locked ?? false, widgets };
}

/**
 * Replace the user's widget set with `widgets` (full-set save on edit).
 * Simpler and race-free for a per-user board: delete-all then insert.
 */
export async function saveDashboardLayout(
  widgets: DashboardWidget[]
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "Not signed in." };

  const del = await supabase.from("dashboard_widgets").delete().eq("user_id", uid);
  if (del.error) return { error: del.error.message };

  if (widgets.length > 0) {
    const ins = await supabase.from("dashboard_widgets").insert(
      widgets.map((w) => ({
        id: w.id,
        user_id: uid,
        type: w.type,
        position: w.order,
        size: w.size,
        settings: w.settings,
      }))
    );
    if (ins.error) return { error: ins.error.message };
  }

  revalidatePath("/home");
  return { ok: true };
}

/** Set the per-user lock flag (upsert the dashboards row). */
export async function setDashboardLocked(
  locked: boolean
): Promise<{ ok?: true; error?: string }> {
  const supabase = await getSupabaseServer();
  if (!supabase) return { error: "Supabase not configured." };
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { error: "Not signed in." };

  const { error } = await supabase
    .from("dashboards")
    .upsert({ user_id: uid, locked }, { onConflict: "user_id" });
  if (error) return { error: error.message };

  revalidatePath("/home");
  return { ok: true };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (If `dashboards`/`dashboard_widgets` aren't in `lib/supabase/database.types.ts`, the `.from()` calls may need a `// @ts-expect-error generated-types lag` like other RPCs in the codebase, OR regenerate types via the Supabase MCP `generate_typescript_types`. Prefer regenerating; fall back to the existing `as any` cast pattern used for newer RPCs.)

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/dashboard/`.

- [ ] **Step 4: Commit**

```bash
git add lib/dashboard/actions.ts
git commit -m "feat: load/save/lock dashboard server actions"
```

---

### Task 6: Widget registry skeleton

Defines the contract every widget implements and a typed lookup. Widgets register their `Component` in Plan 2; here we lock the shape and a metadata entry per v1 type so the picker/labels have data.

**Files:**
- Create: `lib/dashboard/registry.ts`
- Test: `lib/dashboard/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/dashboard/registry.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `registry.ts` not found.

- [ ] **Step 3: Implement the registry meta**

Create `lib/dashboard/registry.ts`:
```ts
import type { WidgetSize, WidgetType } from "./types";

/** Static metadata for a widget type (no React yet — components land in Plan 2). */
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all registry + layout tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/dashboard/registry.ts lib/dashboard/registry.test.ts
git commit -m "feat: widget registry metadata + contract"
```

---

## Self-Review

- **Spec coverage (slice 1):** persistence table ✅ (Task 4), engine-agnostic layout model with reserved `grid` column ✅ (Task 4), pure reducer with auto-pack ✅ (Task 3), registry skeleton ✅ (Task 6), load/save/lock actions ✅ (Task 5). UI, widgets, status schema, sidebar, default-home flip are explicitly later plans.
- **Placeholders:** none — every code step has complete code.
- **Type consistency:** `DashboardWidget`/`WidgetSize`/`WidgetType` defined in Task 2 and used identically in Tasks 3, 5, 6. DB `position` ↔ TS `order` mapping is called out and handled in Task 5.
- **Known risk:** generated Supabase types lag the new tables (Task 5 Step 2) — resolved by regenerating types via MCP or the codebase's existing cast pattern.

## Next plans (authored after this lands)
- **Plan 2:** `<Canvas>` + `<CanvasEngine>` (CSS dense grid + dnd-kit sortable + S/M/L toggle + motion reflow) + `<WidgetCard>` chrome + **Sticky Notes** widget end-to-end, behind a `/home` route.
- **Plan 3:** Tasks + Notifications widgets (reuse existing queries/actions) + managers-only project-creation migration.
- **Plan 4:** Status subsystem (`profiles` status columns, lazy expiry/DND) + My Status + Teams widgets (incl. superadmin tree).
- **Plan 5:** Floating collapsible sidebar.
- **Plan 6:** Flip default landing to `/home` + first-run choice + TIST default layout.
