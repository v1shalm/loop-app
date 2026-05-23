// User-testing walkthrough of the deployed Loop app.
//
//   node scripts/ux-walkthrough.mjs
//
// Drives the app as both an admin and a member, capturing screenshots
// into public/ux-audit/<role>/<step>.png plus a JSON log of observed
// console errors and timing. The point isn't pretty pictures; it's an
// honest record we can review feature by feature.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.LOOP_URL ?? "https://loop-tist.vercel.app";

const ROLES = [
  {
    slug: "admin",
    name: "Alex (Design Admin)",
    email: "alex@loop.app",
    password: "alex-loop-2026",
    canManageTeam: true,
  },
  {
    slug: "member",
    name: "Mia (Design Member)",
    email: "mia@loop.app",
    password: "mia-loop-2026",
    canManageTeam: false,
  },
];

const STEPS = [
  { name: "01-login", path: "/login", auth: false },
  { name: "02-my-work", path: "/assigned-to-me", auth: true },
  { name: "03-today", path: "/today", auth: true },
  { name: "04-upcoming", path: "/upcoming", auth: true },
  { name: "05-my-tasks", path: "/my-tasks", auth: true },
  { name: "06-inbox", path: "/inbox", auth: true },
  { name: "07-projects-board", path: "/projects", auth: true },
  { name: "08-people", path: "/people", auth: true },
  { name: "09-team", path: "/team", auth: true },
  { name: "10-manage-team", path: "/team/manage", auth: true, adminOnly: true },
  { name: "11-profile", path: "/profile", auth: true },
  { name: "12-notifications", path: "/notifications", auth: true },
  {
    name: "13-task-drawer",
    path: "/assigned-to-me",
    auth: true,
    action: async (page) => {
      const titleLocator = page.locator('a, button')
        .filter({ hasText: /Review|Ship|Draft|Audit|Wire|Update|Migrate|Spec/i })
        .first();
      if (await titleLocator.count()) {
        await titleLocator.click().catch(() => {});
        await page.waitForURL(/\?task=/, { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1200);
      }
    },
  },
  {
    name: "14-quick-add",
    path: "/assigned-to-me",
    auth: true,
    action: async (page) => {
      // Try the cmd-K / new-task button if it's visible
      const newBtn = page
        .locator('button')
        .filter({ hasText: /^New task$|^Add task$|^Create$/ })
        .first();
      if (await newBtn.count()) {
        await newBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      } else {
        // Fallback: just hit "n" since the app may support a hotkey
        await page.keyboard.press("KeyN").catch(() => {});
        await page.waitForTimeout(600);
      }
    },
  },
];

async function login(page, role) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  // Prefer the demo grid (fastest, deterministic)
  const demoBtn = page
    .locator("button")
    .filter({ hasText: role.name.split(" ")[0] })
    .filter({ hasText: role.canManageTeam ? "Admin" : "Member" })
    .first();
  if (await demoBtn.count()) {
    await demoBtn.click();
  } else {
    // Fall back to the password form
    await page.fill('input[type="email"]', role.email);
    await page.fill('input[type="password"]', role.password);
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL(/\/(assigned-to-me|today)/, { timeout: 15000 });
  await page.waitForTimeout(2000);
}

async function runRole(browser, role) {
  console.log(`\n=== ${role.name} ===`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 880 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ url: page.url(), text: msg.text().slice(0, 400) });
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push({ url: page.url(), text: String(err).slice(0, 400) });
  });

  const outDir = join("public/ux-audit", role.slug);
  await mkdir(outDir, { recursive: true });

  const log = [];

  let signedIn = false;
  for (const step of STEPS) {
    if (step.adminOnly && !role.canManageTeam) {
      console.log(`  - skipping ${step.name} (admin only)`);
      continue;
    }
    console.log(`  → ${step.name}  ${step.path}`);
    if (step.auth && !signedIn) {
      await login(page, role);
      signedIn = true;
    }
    if (step.path === "/login" && signedIn) {
      await ctx.clearCookies();
      signedIn = false;
    }
    const t0 = Date.now();
    try {
      await page.goto(`${BASE}${step.path}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });
    } catch (err) {
      log.push({
        step: step.name,
        path: step.path,
        error: `goto failed: ${err}`,
      });
    }
    await page.waitForTimeout(1500);
    if (step.action) {
      try {
        await step.action(page);
      } catch (err) {
        log.push({
          step: step.name,
          path: step.path,
          error: `action failed: ${err}`,
        });
      }
    }
    const ms = Date.now() - t0;
    const out = join(outDir, `${step.name}.png`);
    try {
      await page.screenshot({ path: out, fullPage: false });
    } catch {}
    log.push({ step: step.name, path: step.path, ms });
  }

  await writeFile(
    join(outDir, "_log.json"),
    JSON.stringify(
      { role: role.name, steps: log, consoleErrors, pageErrors },
      null,
      2
    )
  );
  console.log(
    `  done. console errors: ${consoleErrors.length}, page errors: ${pageErrors.length}`
  );
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch();
  for (const role of ROLES) {
    await runRole(browser, role);
  }
  await browser.close();
  console.log("\nDone. See public/ux-audit/{admin,member}/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
