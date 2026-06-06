# Widget-Canvas Home — Design Spec

- **Date:** 2026-06-06
- **Status:** Approved in brainstorming; pending written-spec review
- **Sub-project:** #1 of the larger "TIST internal OS" direction (a fun, Gen-Z-facing hybrid of Zoho People + Slack + Todoist). This spec covers ONLY the customizable widget-canvas home + its widget framework. Leave, Attendance, Chat, and deeper HR are later sub-projects that plug in as widgets.

## 1. Goal

Replace the post-login landing with a **customizable canvas** of resizable widgets. Each widget resizes S / M / L; the rest auto-pack and reflow. Layout is per-user, the canvas is skinned by the existing theme studio, and the framework is built so new subsystems (Leave, Attendance, Chat) ship later as widgets with no engine changes.

Audience: TIST Media employees (internal tool), Gen-Z skew → expressive, fast, tactile, premium (not corporate-grey).

## 2. Non-goals (v1 — YAGNI)

- Multiple dashboards / tabs (one dashboard per user).
- Free pixel drag-resize / arbitrary x-y placement (that is the future "Approach A" upgrade).
- Leave / Attendance / Chat widgets (later sub-projects).
- Automatic presence detection (idle → away). Presence is manual only.
- Cross-device persistence of sidebar collapse (localStorage in v1).

## 3. Decisions locked in brainstorming

- **Purpose:** personal command center + a company-pulse layer (A + B blend).
- **Ownership:** per-user layout. First run offers "Start fresh" (empty) or "Use TIST's layout" (seed defaults); fully personalizable after.
- **Lock:** personal Edit ⇄ Lock toggle (no company-forced widgets). Locked is the everyday state; Editing reveals drag/resize/add/remove.
- **Card style:** bold "sticky-note" cards (bold header, status/priority pills, colored initial chip, punch-hole dots, date/status footer). Centralized in one `<WidgetCard>` wrapper.
- **Color:** comes entirely from the existing theme studio (`globals.css` OKLCH tokens + accent/gradient/grain). No new color system.
- **Canvas model:** Approach **B** — responsive **CSS dense grid + dnd-kit reorder + S/M/L size toggle**; auto-pack reflow animated via the transitions.dev convention. Engine is isolated so a later swap to Approach A (`react-grid-layout`, free drag-resize) is a one-component change.
- **Governance (one rule change):** Superadmin creates teams + assigns managers → Managers approve tasks **and create projects (managers-only now; previously any member)** → Members do the work. Reuses existing RLS + role helpers.

## 4. Architecture

Three layers; only the middle one is engine-specific.

1. **`<Canvas>`** — owns layout state, edit/lock mode, reads/writes persistence. Engine-agnostic.
2. **`<CanvasEngine>`** — the only Approach-B-specific component: CSS dense grid + dnd-kit reorder + S/M/L toggle; emits `onLayoutChange(widgets)`. Swapping to Approach A replaces just this.
3. **`widgetRegistry`** — `type → { title, icon, supportedSizes, defaultSize, fetch(ctx), Component }`. Every widget (v1's five + future Leave/Attendance/Chat) is one entry.

**Data flow.** The `home` route server-fetches each active widget's slice in parallel (same pattern as `app/(app)/layout.tsx`'s `Promise.all`), passes it into `<Canvas>`. Widgets mutate via existing/new server actions. No client fetch waterfalls. Slow widgets get their own Suspense boundary + skeleton.

**Persistence (engine-agnostic).** New table `dashboard_widgets`:

| column | type | note |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | FK profiles; owner-only RLS |
| type | text | registry key |
| order | int | position for Approach B auto-pack |
| size | text | `S` \| `M` \| `L` |
| settings | jsonb | per-instance config (Teams selection, sticky text, etc.) |
| grid | jsonb null | reserved for Approach A (x/y/w/h); unused in B |

Plus a per-user `dashboard_locked boolean` (on a `dashboards` row or profile). Position stored as `order` for B; `grid` reserved so the A upgrade is an additive migration, not a rewrite. Layout changes persist on drag-end via a debounced server action; lock/unlock saves immediately.

**Theming.** Canvas + cards read existing theme tokens. Zero new color system.

**Shell.** The sidebar becomes a **floating, collapsible panel** (detached, rounded, over the canvas) with a hide/show toggle (button + keyboard shortcut). Hidden → canvas expands to full width. Collapse state in localStorage (v1).

**Route.** New `app/(app)/home` becomes the default post-login landing (currently `/assigned-to-me`). Classic task routes stay reachable from the sidebar.

## 5. Widget contract

```
registry[type] = {
  title, icon,
  supportedSizes: ['S','M','L'],   // widget may opt out of sizes
  defaultSize,
  fetch(ctx),                       // server-side data for this user/role
  Component                         // { size, data, settings, editMode, onSettings }
}
```

- **Shared `<WidgetCard>`** supplies the sticky-note chrome + (in edit mode) drag handle, S/M/L toggle, remove, settings gear. Widgets supply only their body.
- **Content adapts per size**, declared by each widget.
- **Per-instance config** lives in that widget's `settings jsonb` (no extra tables).

### v1 widgets

1. **Tasks** — S: count due today · M: top 3 with checkboxes · L: today/assigned list + mini progress. Completing respects the existing approval gate (member → submit for review; manager → done). Reuses existing task queries/actions.
2. **Teams** (viewer; Slack-modeled) — S: avatar stack + teammate headcount · M: teammate list with the status each person has set · L: grouped by team, customizable (pick teams/people, pin, collapse — saved in `settings`). **Superadmin mode:** all teams → expandable member tree with each member's status. (No "online" indicator — presence is whatever the person set manually.)
3. **My Status** (setter; Slack-modeled, manual) — pick a state (🟢 Available · 🟡 Away · ⛔ Busy · 🌴 Off) or custom emoji + text; optional **auto-expiry** (Don't clear / 30 min / 1 hr / 4 hrs / Today / This week / custom); **DND** ("pause notifications until …"). All manual — no idle detection.
4. **Notifications** — S: unread count · M: latest 3–5 · L: full feed + mark-read (reuses `mark_notifications_read`). Respects DND.
5. **Sticky Notes** — editable text + theme color, one note per instance; S/M/L = footprint. Text in `settings jsonb`. Allows multiple instances.

## 6. Status & Teams models (Slack-borrowed)

- **Status is manual and sticky** until the user changes it or an expiry fires. No automatic active/away.
- **Expiry + DND are lazy-evaluated at read time** (`status_expires_at < now()` → treat status as cleared; `dnd_until < now()` → DND off). No cron/background job.
- **Schema:** extend `profiles` (reusing the existing status/mood field, dropping the "Team Pulse" label) with `status_emoji`, `status_text`, `status_state`, `status_expires_at`, `dnd_until` — all additive.
- **Teams widget** lists members with the statuses they set; Slack-sidebar-style customization stored in widget `settings`.

## 7. Permissions & governance

Enforced by Loop's existing RLS + role helpers (`is_superadmin`, `is_team_manager`, the approval gate). The canvas is a new surface over the same rules — no new permission system.

- **Member:** sees their teams, sets own status, Tasks widget submits-for-review. No team/project creation.
- **Manager:** + approval queue in Tasks widget (approve / send back), **creates projects (managers-only)**, manages team roster in Teams widget.
- **Superadmin:** Teams widget → org mode (all teams → member tree); creates teams + assigns managers.

The single behavior change to existing rules: **project creation moves from "any team member" to "managers only"** — a migration + an updated `createProject` action gate.

## 8. Interactions, modes & states

- **Locked (default once set up):** widgets live and interactive; nothing moves.
- **Editing:** drag-reorder (dnd-kit), S/M/L toggle, remove (×), settings gear, **+ Add widget** (picker built from registry). Tap **Lock** to persist and freeze.
- **Reflow:** auto-pack via CSS dense grid; movement animated (transitions.dev FLIP-style).
- **First run:** "Start fresh" vs "Use TIST's layout," then land locked with a subtle "Edit layout" hint.
- **Mobile:** single-column stack in saved order; S/M/L → card height; vertical drag reorder; sidebar → slide-over.
- **States:** Empty (friendly "add first widget" / "use TIST layout"); Loading (per-widget skeleton via Suspense); Per-widget error (isolated "Couldn't load · Retry"); Saving (debounced on drag-end; lock/unlock immediate).

## 9. Testing

- **Layout reducer** (reorder/resize/add/remove → new ordered list + auto-pack): pure functions, test-driven (riskiest logic).
- **Permissions:** member/manager/superadmin see correct Teams mode; managers-only project creation holds. Reuse existing role/approval test patterns.
- **Widget fetchers:** correct slice per role.
- **Interaction (Playwright, already wired):** drag-reorder persists, size toggle reflows, lock blocks edits, first-run choice, mobile single-column.

## 10. Rollout — thin vertical slices

1. Schema (`dashboard_widgets` + profile status fields) + registry skeleton.
2. `<Canvas>` + `<CanvasEngine>` (B) proven end-to-end with **Sticky Notes** only.
3. Real widgets one at a time: **Tasks → Notifications → My Status → Teams** (Teams last; richest + superadmin tree).
4. Floating collapsible sidebar.
5. Flip default landing to the canvas (old routes stay reachable).
6. First-run choice + TIST default layout.

## 11. Assumptions to confirm during planning

- Exact current `profiles` status/mood columns (reuse vs add) — verify before the status migration.
- Whether `dashboard_locked` lives on a `dashboards` row or directly on `profiles` (leaning a `dashboards` row to leave room for multi-dashboard later, without building it now).
- Default TIST layout contents (which of the five, at what sizes) — a small content decision for slice 6.
