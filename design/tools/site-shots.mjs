// Screenshots of the landing page at 1440 and 375 wide: the hero after the
// reading moment, then each section. `node design/tools/site-shots.mjs <url>`.
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";
const url = process.argv[2];
const out = fileURLToPath(new URL("../../site/screenshots/", import.meta.url));
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
for (const width of [1440, 375]) {
  const page = await browser.newPage({ viewport: { width, height: width === 375 ? 812 : 900 }, deviceScaleFactor: width === 375 ? 2 : 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(3400);
  await page.screenshot({ path: `${out}${width}-hero.png` });
  for (const id of ["how", "proof", "panta", "demo", "install"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.locator(`#${id}`).screenshot({ path: `${out}${width}-${id}.png` });
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  console.log(width, "scrollWidth", sw);
  await page.screenshot({ path: `${out}${width}-full.png`, fullPage: true });
  await page.close();
}
await browser.close();
