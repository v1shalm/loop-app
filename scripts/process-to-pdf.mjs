// Render /process to a PDF for the take-home submission.
//
// Default points at production. Override with LOOP_URL=http://localhost:3000
// to render the local dev server instead.
//
// Run: node scripts/process-to-pdf.mjs

import { chromium } from "playwright";

const URL = process.env.LOOP_URL ?? "https://loop-tist.vercel.app/process";
const OUT = "Loop-process-notes.pdf";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();

  console.log(`Loading ${URL}...`);
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  // Force every <img> to load eagerly. Next/Image defaults to lazy
  // loading, which leaves below-the-fold images empty when Playwright
  // snapshots before they enter the viewport.
  await page.evaluate(() => {
    document.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      const src = img.src;
      // Re-set src to kick the browser into fetching now.
      img.src = "";
      img.src = src;
    });
  });

  // Remove the notifications-popover small-call and the footer from
  // the PDF render. The page keeps both (matches the live site);
  // the PDF skips them so a sent-out copy is a clean document.
  await page.evaluate(() => {
    document
      .querySelectorAll('img[src*="notifications-popover"]')
      .forEach((img) => img.closest("figure")?.remove());
    document.querySelector("footer")?.remove();
  });

  // Scroll top to bottom to trigger any other lazy work (Next/Image
  // sometimes waits for intersection even with loading="eager").
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let y = 0; y < document.body.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await wait(80);
    }
    window.scrollTo(0, 0);
    await wait(400);
  });

  // Wait until every image is actually painted, not just attached.
  await page.evaluate(async () => {
    const imgs = Array.from(document.querySelectorAll("img"));
    await Promise.all(
      imgs.map((img) => {
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });
      })
    );
  });

  // Settle.
  await page.waitForTimeout(1500);

  console.log(`Writing ${OUT}...`);
  await page.pdf({
    path: OUT,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "12mm", right: "12mm" },
  });

  await browser.close();
  console.log(`done — ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
