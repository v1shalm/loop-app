// One-off: log into the deployed app as Alex (Design admin) and capture
// the screens we embed in the /process case study. Run with:
//   node scripts/capture-screens.mjs
// Output goes to public/screens/*.png

import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.LOOP_URL ?? "https://loop-tist.vercel.app";
const EMAIL = "alex@loop.app";
const PASSWORD = "alex-loop-2026";
const OUT = "public/screens";

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
    label: "Task drawer — floating SHOP-style panel",
    action: async (page) => {
      // Click the actual task title text to open the drawer (the profile
      // trigger also has aria-label^="Open", which is why a generic
      // selector grabbed the wrong button)
      await page.locator('text=Review dashboard chart spacing').first().click();
      await page.waitForURL(/\?task=/, { timeout: 10000 });
      await page.waitForTimeout(1500);
    },
  },
  {
    name: "manage-team",
    auth: true,
    path: "/team/manage",
    label: "Manage team (admin-only)",
  },
];

async function login(page) {
  console.log("  signing in as Alex...");
  await page.goto(`${BASE}/login`);
  // The demo grid renders 4 buttons; click the one labeled Alex
  await page.waitForSelector('text="Alex"', { timeout: 15000 });
  await page.locator('button:has-text("Alex"):has-text("Admin")').first().click();
  await page.waitForURL(/\/(assigned-to-me|today)/, { timeout: 15000 });
  // Let the layout settle (right rail mounts after first paint)
  await page.waitForTimeout(2500);
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 880 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(20000);

  let signedIn = false;

  for (const s of screens) {
    console.log(`→ ${s.name}`);
    if (s.auth && !signedIn) {
      await login(page);
      signedIn = true;
    }
    if (s.path === "/login") {
      // /login auto-redirects logged-in users to /assigned-to-me, so sign
      // out first if we need a clean login shot.
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
    const out = join(OUT, `${s.name}.png`);
    await page.screenshot({ path: out, fullPage: false });
    console.log(`  wrote ${out}`);
  }

  // Manifest so the case study can iterate without hard-coding
  const manifest = screens.map((s) => ({ name: s.name, label: s.label }));
  await writeFile(
    "public/screens/manifest.json",
    JSON.stringify(manifest, null, 2)
  );

  await browser.close();
  console.log("✓ done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
