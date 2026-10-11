// Landing page traction shots: the stats strip under the hero and a tilted
// "How it works" card under the pointer. `node design/tools/traction-shots.mjs <url>`.
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";
const url = process.argv[2];
const out = fileURLToPath(new URL("../applied/", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(3600);
const strip = page.locator("#stats");
await strip.scrollIntoViewIfNeeded();
await page.waitForTimeout(1600);
console.log(
  "stats hidden:",
  await strip.evaluate((n) => n.hidden),
  "text:",
  (await strip.innerText()).replace(/\s+/g, " "),
);
const sb = await strip.boundingBox();
await page.screenshot({
  path: `${out}stats-strip.png`,
  clip: { x: 0, y: Math.max(0, sb.y - 90), width: 1440, height: 260 },
});
const card = page.locator(".card.tilt").first();
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(900);
const box = await card.boundingBox();
await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.22, { steps: 12 });
await page.waitForTimeout(700);
console.log("transform:", await card.evaluate((n) => n.style.transform), "class:", await card.getAttribute("class"));
await page.screenshot({
  path: `${out}tilt-card.png`,
  clip: { x: box.x - 40, y: box.y - 40, width: box.width + 80, height: box.height + 80 },
});
await browser.close();
