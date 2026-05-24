// Capture the case-study screenshots from the deployed app in BOTH
// light and dark mode. Output:
//   public/screens/light/<name>.png
//   public/screens/dark/<name>.png
//
// I take screenshots against production so the case study reflects
// exactly what a reviewer sees. The script logs in as Alex (Design
// admin), force-sets the theme via localStorage, then walks the same
// six surfaces twice. Theme is set via Playwright's addInitScript so
// the .dark class is on the <html> by first paint — no FOUC.
//
// Run with: `node scripts/capture-screens.mjs`

import { chromium } from "playwright";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.LOOP_URL ?? "https://loop-tist.vercel.app";
const EMAIL = "alex@loop.app";
const PASSWORD = "alex-loop-2026";
const OUT_ROOT = "public/screens";

const screens = [
  {
    name: "login",
    auth: false,
    path: "/login",
    label: "Login — four demo accounts in a 2×2 grid",
  },
  {
    name: "my-work",
    auth: true,
    path: "/assigned-to-me",
    label: "My work — greeting, today, right rail",
  },
  {
    name: "inbox",
    auth: true,
    path: "/inbox",
    label: "Inbox — reply-first triage with snooze",
  },
  {
    name: "projects-board",
    auth: true,
    path: "/projects",
    label: "Projects — kanban with workflow status",
  },
  {
    name: "task-drawer",
    auth: true,
    path: "/assigned-to-me",
    label: "Task drawer — floating panel with threaded comments",
    action: async (page) => {
      // Open the drawer by clicking the first task-title button. The
      // selector excludes the profile-menu trigger (aria-label="Open
      // account menu") and any other generic "Open …" buttons. If the
      // assigned-to-me list is empty for the demo user, fall through
      // gracefully and screenshot the page without the drawer.
      try {
        const titleButton = page.locator(
          'button[aria-label^="Open "]:not([aria-label="Open account menu"])'
        ).first();
        await titleButton.waitFor({ state: "visible", timeout: 6000 });
        await titleButton.click();
        await page.waitForURL(/\?task=/, { timeout: 8000 });
        await page.waitForTimeout(1800);
      } catch {
        console.log(
          "    (no task to open — capturing the list view instead)"
        );
      }
    },
  },
  {
    name: "manage-team",
    auth: true,
    path: "/team/manage",
    label: "Manage team (admin only)",
  },

  // ── Modals, edge cases, smart details ───────────────────────────────────
  //
  // These are the moments that don't show up in a list-view tour: a
  // dialog open, a thread expanded, a filter applied to zero results.
  // Each one is captured with a small interaction script.

  {
    name: "quick-add-chips",
    auth: true,
    path: "/assigned-to-me",
    label: "Quick add — parser chips light up as you type",
    action: async (page) => {
      try {
        // Click the sidebar "Add task" CTA (the primary brand button).
        // Mobile FAB uses an aria-label; desktop CTA shows the text.
        await page
          .locator('button:has-text("Add task")')
          .first()
          .click();
        await page.waitForSelector(
          'input[placeholder*="needs to get done"]',
          { timeout: 8000 }
        );
        const input = page
          .locator('input[placeholder*="needs to get done"]')
          .first();
        // Type a string that exercises all four parsers: project,
        // person, date, priority.
        await input.fill("Fix homepage hero #brand @mia tomorrow p1");
        await page.waitForTimeout(1200); // let chips resolve
      } catch (err) {
        console.log(`    (quick-add interaction failed: ${err.message?.split("\n")[0]})`);
      }
    },
  },
  {
    name: "notifications-popover",
    auth: true,
    path: "/assigned-to-me",
    label: "Notifications — single surface, mark all read",
    action: async (page) => {
      try {
        await page.waitForTimeout(1000);
        await page
          .locator('button[aria-label="Notifications"]')
          .first()
          .click();
        await page.waitForTimeout(1200);
      } catch (err) {
        console.log(`    (notifications interaction failed: ${err.message?.split("\n")[0]})`);
      }
    },
  },
  {
    name: "empty-filter",
    auth: true,
    path: "/inbox",
    label: "Filtered empty — \"No tasks match this filter\"",
    action: async (page) => {
      try {
        // Try the "Snoozed" filter chip first (most likely to be empty
        // for the seeded demo data). Fall through if not found.
        const snoozed = page
          .locator('button:has-text("Snoozed")')
          .first();
        await snoozed.waitFor({ state: "visible", timeout: 4000 });
        await snoozed.click();
        await page.waitForTimeout(800);
      } catch (err) {
        console.log(`    (filter-empty interaction failed: ${err.message?.split("\n")[0]})`);
      }
    },
  },
  {
    name: "thread-expanded",
    auth: true,
    path: "/assigned-to-me",
    label: "Comments — threads collapsed by default, expandable",
    action: async (page) => {
      try {
        // Open the first task in the list.
        const titleButton = page
          .locator(
            'button[aria-label^="Open "]:not([aria-label="Open account menu"])'
          )
          .first();
        await titleButton.waitFor({ state: "visible", timeout: 5000 });
        await titleButton.click();
        await page.waitForURL(/\?task=/, { timeout: 8000 });
        await page.waitForTimeout(2000);

        // If this task has a comment with replies, expand them. The
        // toggle reads "N replies".
        const replyToggle = page
          .locator('button:has-text("replies")')
          .first();
        if ((await replyToggle.count()) > 0) {
          await replyToggle.click();
          await page.waitForTimeout(900);
        }
      } catch (err) {
        console.log(`    (thread-expand interaction failed: ${err.message?.split("\n")[0]})`);
      }
    },
  },
];

async function login(page) {
  console.log("    signing in as Alex via email + password…");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  // The login page is a single Google + email/password form; fill the
  // email field, then password, then submit. Look for the password
  // input by type to avoid coupling to label text changes.
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]:has-text("Sign in")').first().click();
  await page.waitForURL(/\/(assigned-to-me|today)/, { timeout: 20000 });
  // Let the layout settle (right rail mounts after first paint).
  await page.waitForTimeout(2500);
}

async function captureMode(browser, mode) {
  console.log(`\n▼ ${mode.toUpperCase()} MODE`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 880 },
    deviceScaleFactor: 2,
  });
  // Force the theme before any page script runs. The theme-provider
  // reads loop:theme from localStorage on first render and applies the
  // .dark class; setting it here means no light → dark flash.
  await ctx.addInitScript((m) => {
    try {
      window.localStorage.setItem("loop:theme", m);
    } catch {}
  }, mode);

  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  const outDir = join(OUT_ROOT, mode);
  await mkdir(outDir, { recursive: true });

  let signedIn = false;
  for (const s of screens) {
    console.log(`  → ${s.name}`);
    try {
      if (s.auth && !signedIn) {
        await login(page);
        signedIn = true;
      }
      if (s.path === "/login") {
        // /login auto-redirects authed users → sign out for a clean shot.
        if (signedIn) {
          await ctx.clearCookies();
          signedIn = false;
        }
        await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
      } else {
        await page.goto(`${BASE}${s.path}`, { waitUntil: "networkidle" });
      }
      await page.waitForTimeout(2000);
      if (s.action) await s.action(page);
      const out = join(outDir, `${s.name}.png`);
      await page.screenshot({ path: out, fullPage: false });
      console.log(`    wrote ${out}`);
    } catch (err) {
      // Don't let one bad screen abort the whole run. Log and continue
      // so the other mode screens still capture cleanly.
      console.log(`    ✗ skipped ${s.name}: ${err.message?.split("\n")[0]}`);
    }
  }

  await ctx.close();
}

async function main() {
  const browser = await chromium.launch();

  // The case study renders dark-mode only — Loop's brand pink reads
  // boldest against the dark surfaces, and showing one mode keeps the
  // page focused on the decision per screen, not the comparison.
  // Pass MODES=light,dark in the env to capture both if I ever want to.
  const modes = (process.env.MODES ?? "dark").split(",").map((s) => s.trim());

  for (const mode of modes) {
    await captureMode(browser, mode);
  }

  // Manifest carries the screen list once; mode dirs hold the bitmaps.
  const manifest = screens.map((s) => ({ name: s.name, label: s.label }));
  await writeFile(
    join(OUT_ROOT, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  await browser.close();
  console.log(`\n✓ done — screens in public/screens/${modes.join(",")}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
