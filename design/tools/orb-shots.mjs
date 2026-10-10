// Hero orb comparison: ?orb=css and ?orb=3d at 1440px, a 3-second frame
// sequence of the 3D orb (contact sheet, plus a GIF when ffmpeg exists),
// the headless FPS, and a check that a phone never gets the 3D orb.
// `node design/tools/orb-shots.mjs`
import { execFileSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = `${root}design/applied/`;
const SITE = process.argv[2] || "https://soothia.heylana.workers.dev";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });

async function hero(page, name, wait) {
  await page.waitForTimeout(wait);
  const box = await page.locator("#hero-orb").boundingBox();
  await page.screenshot({ path: `${out}${name}`, clip: { x: 0, y: 0, width: 1440, height: Math.min(900, box.y + box.height + 320) } });
}

const css = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await css.goto(`${SITE}/?orb=css&v=${Date.now()}`, { waitUntil: "networkidle" });
await hero(css, "orb-css.png", 3200);
console.log("css orb: canvas present?", await css.locator(".orb-canvas").count());
await css.close();

const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const logs = [];
page.on("console", (m) => { if (/Soothia: 3D orb/.test(m.text())) logs.push(m.text()); });
await page.goto(`${SITE}/?orb=3d&v=${Date.now()}`, { waitUntil: "networkidle" });
await page.waitForSelector(".orb-canvas", { timeout: 15000 });
const frames = `${root}design/tools/.orb-frames/`;
await rm(frames, { recursive: true, force: true });
await mkdir(frames, { recursive: true });
const box = await page.locator("#hero-orb").boundingBox();
const clip = { x: box.x + box.width / 2 - 200, y: box.y + box.height / 2 - 200, width: 400, height: 400 };
for (let i = 0; i < 24; i++) {
  await page.screenshot({ path: `${frames}f${String(i).padStart(2, "0")}.png`, clip });
  await page.waitForTimeout(125);
}
await hero(page, "orb-3d.png", 200);
await page.mouse.move(1100, 300, { steps: 10 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}orb-3d-tilt.png`, clip });
const fps = await page.evaluate(() => window.__soothiaOrbFps ?? null);
console.log("3d orb: headless fps", fps, "| console:", logs.join(" | "));
console.log("3d orb: layout shift check, orb box", JSON.stringify(box));
await page.close();

const phone = await browser.newContext({ ...devices["iPhone 13"] });
const phonePage = await phone.newPage();
await phonePage.goto(`${SITE}/?v=${Date.now()}`, { waitUntil: "networkidle" });
await phonePage.waitForTimeout(2500);
console.log("phone (auto): canvas present?", await phonePage.locator(".orb-canvas").count());
await phonePage.goto(`${SITE}/?orb=3d&v=${Date.now()}`, { waitUntil: "networkidle" });
await phonePage.waitForTimeout(2500);
console.log("phone (?orb=3d): canvas present?", await phonePage.locator(".orb-canvas").count());
await phone.close();
await browser.close();

// Contact sheet (always) and GIF (if ffmpeg is installed).
try {
  execFileSync("ffmpeg", ["-y", "-framerate", "8", "-i", `${frames}f%02d.png`, "-vf", "scale=300:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse", `${out}orb-3d.gif`], { stdio: "ignore" });
  console.log("orb-3d.gif written");
} catch {
  console.log("ffmpeg not available: no GIF, frames kept in design/tools/.orb-frames");
}
