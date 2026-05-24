# Mobile — Phase 3 plan

Phase 1 shipped the mobile shell (bottom nav, FAB, menu sheet) in `6af1f80`.
Phase 2 shipped:

- `1584055` — Track A: task drawer becomes a bottom sheet on phones
- `fd6c7e2` — Track B: notifications popover + profile menu → sheets on mobile
- `1be3047` — Track C: 44pt touch-target sweep
- `4e72242` — Track D: swipe gestures on task rows
- `8ddc0ca` — Dialog: stop shifting by `--sidebar-w` on mobile

What's left is grouped by impact below. **Constraint that still applies:** zero desktop changes — every fix gated under `max-md:` / `md:hidden` / `(max-width: 767px)`.

---

## Track P3-A — Real bugs (do first)

### A1. iOS Safari input auto-zoom
**Symptom**: tapping any input on iOS Safari zooms the page in if the input's font-size is `< 16px`, and doesn't zoom out after. Affects every form across the app — 157 occurrences of `text-[13–15px]` on inputs/textareas across 43 files.

**Fix**: one CSS rule in `app/globals.css`:
```css
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px; }
}
```

Single rule, no call-site changes, fixes every form at once. The "real" font-size in Tailwind classes still applies on desktop because the media query only kicks in below `md:`.

**Risk**: tiny — only visual change is on mobile, where inputs render slightly bigger (which is actually desirable for touch).

### A2. Verify the recent dialog centering fix on a real phone
The mobile-centering fix in `8ddc0ca` is logically correct but hasn't been visually verified. Worth a 30-second check on an actual device before we close the loop.

---

## Track P3-B — Unaudited surfaces

These got desktop polish but never a mobile-specific pass. Each is its own walkthrough.

### B1. Inbox (`inbox-list.tsx`)
- Hover-revealed actions (snooze, delete on row hover) — same anti-pattern we fixed in task-row, unreachable on touch
- Snooze with wake-time picker — mobile date+time picker
- Reply-first composer — keyboard handling on mobile

### B2. Project list + project detail
- `/projects` page index — card grid, mobile column count
- `/projects/[id]` — filter chips, view toggle, task list density
- "Add a project" popover positioning on mobile

### B3. Upcoming page
- List/calendar view toggle — does the calendar render at all on mobile?
- Date bucket headers, sticky positioning

### B4. Team detail page (`/team/[id]`)
- Section padding, member meta rows
- Lower-priority than B1–B3

### B5. Bulk-select bar
- `BulkActionBar` floats at the bottom of the viewport. With the mobile bottom nav also at the bottom, they overlap or stack awkwardly.
- Fix: either hide the bottom nav when bulk mode is active, or push the BulkActionBar above the nav with `bottom-[calc(56px+env(safe-area-inset-bottom))]`.

### B6. Login + onboarding
Recently simplified. Card max-width 400px. On a 360px viewport, the card edges hit the page padding hard. Probably fine but worth confirming.

---

## Track P3-C — Mobile gap features

### C1. Search palette mobile entry
Cmd/Ctrl+K opens search on desktop. On mobile there's no keyboard shortcut and no tap entry. Search is currently **unreachable** on a phone.

Fix: add a search icon button to the mobile bottom nav (or to the page header on mobile). Opens the existing search-palette dialog.

### C2. Mobile sidebar feature parity
The desktop sidebar lets you reorder + pin + manage projects. The mobile menu sheet shows projects as a flat list. Functionality gap.

Options:
- **Defer**: explicitly decide "long-press to manage" comes later, leave the gap as-is for v1
- **Lite parity**: add a `⋯` per project row in the sheet with pin/unpin/edit/delete
- **Full parity**: drag-to-reorder in the sheet via @dnd-kit (same primitive used on desktop)

### C3. Pull-to-refresh
Native iOS expects pull-to-refresh on every list. Currently `router.refresh()` fires on tab refocus, but not on the gesture.

Approach: a small `usePullToRefresh` hook on touch-only viewports. Threshold ~64px, calls `router.refresh()` on release.

---

## Track P3-D — Native-feel polish

### D1. Mobile-bottom-nav active-state animation
Active-tab indicator could animate between tabs (motion `layoutId`) like Todoist does. Currently it just snaps.

### D2. FAB position vs on-screen keyboard
When the keyboard appears, the FAB can end up behind it. Need `visualViewport` API handling to lift the FAB above the keyboard.

### D3. Reduced motion fallback
Motion's springs (drawer slide-up, task-row swipe) don't respect `prefers-reduced-motion`. Should fall back to instant or near-instant transitions.

### D4. Long-press / context menu on rows
Touch equivalent of right-click. Not implemented. Low priority but a native-feeling addition.

---

## Track P3-E — Cross-cutting tech debt

Earlier mobile work surfaced some loose ends to clean up.

### E1. Contrast pass beyond the drawer
The drawer + quick-add labels got the `foreground/N` upgrade in `1d2bb0d`. Other surfaces still use `text-muted-foreground/70` or `/80` patterns that read as washed-out on dark mode:
- `inbox-list.tsx` — row meta
- `app/(app)/profile/page.tsx` — section helpers
- `completed-section.tsx` — collapsed count
- `add-task-inline.tsx` — placeholder treatment

### E2. Decide on `SectionDivider`
It's a no-op now. Either inline its callers and delete the component, or restore it as something purposeful (e.g., a thicker break between major regions).

### E3. The `dueChipTone` rose-on-today behavior in the drawer
The list rows now distinguish today (amber) from overdue (rose), but the drawer's `dueChipTone` still treats both as rose. Inconsistent with the new list semantics. Decide: align them, or keep the drawer chip as a "this matters now" affordance.

---

## Suggested order

If you want to ship the high-leverage items first:

1. **A1** (iOS auto-zoom) — single CSS rule, fixes 157 places
2. **C1** (search palette mobile entry) — small but closes an accessibility hole
3. **B5** (bulk action bar overlap with bottom nav) — visible bug if you use bulk mode on mobile
4. **A2** (dialog mobile verification) — quick check
5. **B1** (inbox audit) — highest-traffic page after Today
6. **D1, D2, D3** (polish) — when there's slack
7. **C3** (pull-to-refresh), **C2** (sidebar parity) — substantial features, do last
