// Stress-test: exercise every interactive feature in the deployed app,
// don't just navigate. Captures screenshots at each step and logs
// console/page errors. Output: public/ux-audit/stress/.
//
//   node scripts/stress-test.mjs
//
// Steps run as Alex (admin). Each step is wrapped in try/catch so one
// broken interaction doesn't stop the run.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BASE = process.env.LOOP_URL ?? "https://loop-tist.vercel.app";
const OUT = "public/ux-audit/stress";

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const demoBtn = page
    .locator("button")
    .filter({ hasText: "Alex" })
    .filter({ hasText: "Admin" })
    .first();
  if (await demoBtn.count()) {
    await demoBtn.click();
  } else {
    await page.fill('input[type="email"]', "alex@loop.app");
    await page.fill('input[type="password"]', "alex-loop-2026");
    await page.locator('button[type="submit"]').click();
  }
  await page.waitForURL(/\/(assigned-to-me|today)/, { timeout: 15000 });
  await page.waitForTimeout(2000);
}

const log = [];
async function step(page, name, action) {
  console.log(`  → ${name}`);
  const t0 = Date.now();
  try {
    await action(page);
    await page.waitForTimeout(800);
    const ms = Date.now() - t0;
    const screenshot = join(OUT, `${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });
    log.push({ step: name, ms, ok: true });
    console.log(`    ok in ${ms}ms`);
  } catch (err) {
    const ms = Date.now() - t0;
    log.push({ step: name, ms, ok: false, error: String(err).slice(0, 300) });
    console.log(`    FAILED: ${String(err).slice(0, 200)}`);
    try {
      await page.screenshot({
        path: join(OUT, `${name}-FAIL.png`),
        fullPage: false,
      });
    } catch {}
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 880 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);

  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (m) => {
    if (m.type() === "error") {
      consoleErrors.push({ url: page.url(), text: m.text().slice(0, 400) });
    }
  });
  page.on("pageerror", (e) =>
    pageErrors.push({ url: page.url(), text: String(e).slice(0, 400) })
  );

  await login(page);

  // ── 1. Navigate to my work and open a task drawer ───────────────────────
  await step(page, "01-my-work-loaded", async (p) => {
    await p.goto(`${BASE}/assigned-to-me`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
  });

  await step(page, "02-open-task-drawer", async (p) => {
    await p
      .locator("text=Refresh marketing site hero illustration")
      .first()
      .click();
    await p.waitForURL(/\?task=/, { timeout: 5000 });
    await p.waitForTimeout(1500);
  });

  // ── 2. Try adding a reaction to a comment ───────────────────────────────
  await step(page, "03-open-reaction-picker", async (p) => {
    // The smiley + button next to a reaction chip
    const addBtn = p
      .locator('button[aria-label="Add reaction"]')
      .first();
    await addBtn.click();
    await p.waitForTimeout(500);
  });

  await step(page, "04-pick-emoji", async (p) => {
    const fire = p.locator('button[aria-label="React with 🔥"]').first();
    if (await fire.count()) {
      await fire.click();
      await p.waitForTimeout(1200);
    } else {
      throw new Error("emoji picker buttons not visible");
    }
  });

  await step(page, "05-click-existing-reaction", async (p) => {
    // Click an existing 👍 chip to toggle
    const chip = p
      .locator('button[aria-pressed]')
      .filter({ hasText: "👍" })
      .first();
    if (await chip.count()) {
      await chip.click();
      await p.waitForTimeout(800);
    }
  });

  // ── 3. Add a comment ────────────────────────────────────────────────────
  await step(page, "06-add-comment", async (p) => {
    const textarea = p.locator('textarea[placeholder*="comment" i]').first();
    await textarea.click();
    await textarea.fill("Stress-test comment from Playwright.");
    await p.waitForTimeout(400);
    const send = p
      .locator('button[aria-label*="Send" i], button:has-text("Send")')
      .first();
    if (await send.count()) {
      await send.click();
    } else {
      await p.keyboard.press("Control+Enter");
    }
    await p.waitForTimeout(1500);
  });

  // ── 4. Mark task complete, then undo ────────────────────────────────────
  await step(page, "07-mark-complete", async (p) => {
    const checkbox = p
      .locator('button[role="checkbox"], [data-checkbox]')
      .filter({ visible: true })
      .first();
    if (await checkbox.count()) {
      await checkbox.click();
      await p.waitForTimeout(1500);
    } else {
      throw new Error("checkbox not found in drawer");
    }
  });

  await step(page, "08-undo-toast", async (p) => {
    const undo = p.locator('button:has-text("Undo")').first();
    if (await undo.count()) {
      await undo.click();
      await p.waitForTimeout(1500);
    } else {
      throw new Error("undo button not in toast");
    }
  });

  // Close the drawer
  await step(page, "09-close-drawer", async (p) => {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(800);
  });

  // ── 5. Inbox triage ────────────────────────────────────────────────────
  await step(page, "10-inbox-loaded", async (p) => {
    await p.goto(`${BASE}/inbox`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
  });

  await step(page, "11-inbox-filter-unread", async (p) => {
    const chip = p.locator('button:has-text("Unread")').first();
    if (await chip.count()) {
      await chip.click();
      await p.waitForTimeout(800);
    }
  });

  // ── 6. Projects board ──────────────────────────────────────────────────
  await step(page, "12-projects-board", async (p) => {
    await p.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
  });

  // ── 7. Quick-add via Q hotkey ──────────────────────────────────────────
  await step(page, "13-quick-add-hotkey", async (p) => {
    await p.keyboard.press("KeyQ");
    await p.waitForTimeout(800);
  });

  await step(page, "14-quick-add-close", async (p) => {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(600);
  });

  // ── 8. Cmd+K search palette ────────────────────────────────────────────
  await step(page, "15-search-palette", async (p) => {
    await p.keyboard.press("Control+K");
    await p.waitForTimeout(800);
    await p.keyboard.type("brand");
    await p.waitForTimeout(800);
  });

  await step(page, "16-search-close", async (p) => {
    await p.keyboard.press("Escape");
    await p.waitForTimeout(500);
  });

  // ── 9. Manage team page (admin-gated) ──────────────────────────────────
  await step(page, "17-manage-team", async (p) => {
    await p.goto(`${BASE}/team/manage`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
  });

  // ── 10. Notifications popover ─────────────────────────────────────────
  await step(page, "18-notifications-popover", async (p) => {
    await p.goto(`${BASE}/assigned-to-me`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1000);
    const bell = p
      .locator('button[aria-label*="otification" i]')
      .first();
    if (await bell.count()) {
      await bell.click();
      await p.waitForTimeout(800);
    }
  });

  // ── 11. Profile + status chip ─────────────────────────────────────────
  await step(page, "19-profile-page", async (p) => {
    await p.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
  });

  await step(page, "20-change-status", async (p) => {
    const chip = p.locator('button:has-text("Heads down")').first();
    if (await chip.count()) {
      await chip.click();
      await p.waitForTimeout(800);
    }
  });

  await writeFile(
    join(OUT, "_log.json"),
    JSON.stringify({ steps: log, consoleErrors, pageErrors }, null, 2)
  );
  console.log(
    `\ndone. ok: ${log.filter((l) => l.ok).length}/${log.length}, ` +
      `console errors: ${consoleErrors.length}, page errors: ${pageErrors.length}`
  );

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
