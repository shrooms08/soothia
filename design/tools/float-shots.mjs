// The hero orb at the top and bottom of its float: the float animations are
// paused and scrubbed to 50% (top) and 0% (bottom) so the frames are exact.
// Also checks the share page floats and that reduced motion does not.
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";
const out = fileURLToPath(new URL("../applied/", import.meta.url));
const SITE = "https://soothia.fun";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await page.goto(`${SITE}/?v=${Date.now()}`, { waitUntil: "networkidle" });
await page.waitForTimeout(3400);
const scrub = (ms) => page.evaluate((ms) => {
  const names = ["floatY", "floatGlow"];
  const found = [];
  for (const a of document.getAnimations()) {
    if (a instanceof CSSAnimation && names.includes(a.animationName) && a.effect?.target?.closest("#hero-orb")) { a.pause(); a.currentTime = ms; found.push(a.animationName); }
  }
  return found;
}, ms);
console.log("hero animations scrubbed to top:", await scrub(2500));
const box = await page.locator("#hero-orb").boundingBox();
const clip = { x: box.x + box.width / 2 - 220, y: box.y - 90, width: 440, height: box.height + 180 };
const yTop = await page.evaluate(() => document.querySelector("#hero-orb .orb").getBoundingClientRect().top);
await page.screenshot({ path: `${out}hero-float-top.png`, clip });
await scrub(0);
const yBottom = await page.evaluate(() => document.querySelector("#hero-orb .orb").getBoundingClientRect().top);
await page.screenshot({ path: `${out}hero-float-bottom.png`, clip });
console.log("orb top at float top", yTop.toFixed(1), "px, at float bottom", yBottom.toFixed(1), "px, travel", (yBottom - yTop).toFixed(1), "px");
console.log("layout: hero-orb wrap box", JSON.stringify(box));
await page.goto(`${SITE}/m/CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL?v=${Date.now()}`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
console.log("share page floats:", await page.evaluate(() => document.getAnimations().some((a) => a.animationName === "floatY")));
await page.close();
const reduced = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
const rp = await reduced.newPage();
await rp.goto(`${SITE}/?v=${Date.now()}`, { waitUntil: "networkidle" });
await rp.waitForTimeout(500);
console.log("reduced motion floats:", await rp.evaluate(() => document.getAnimations().some((a) => a.animationName === "floatY")));
await browser.close();
