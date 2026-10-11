// Headless audio checks on the built extension's welcome page:
// the AudioContext runs after a click, every style of every sound schedules
// without console errors, and the music starts after a gesture and stops on Done.
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const extension = `${root}extension/dist`;
const userDataDir = `${root}design/tools/.chromium-profile`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 900 },
  args: [
    `--disable-extensions-except=${extension}`,
    `--load-extension=${extension}`,
    "--autoplay-policy=no-user-gesture-required",
  ],
});
let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
const id = new URL(worker.url()).host;
await new Promise((resolve) => setTimeout(resolve, 1200));
for (const page of context.pages()) if (page.url().includes("welcome.html")) await page.close();

const page = await context.newPage();
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(`chrome-extension://${id}/welcome.html?sfx=1`);
await page.waitForTimeout(800);

const before = await page.evaluate(() => window.soothiaAudio.getAudioState().context);
await page.click("#next");
await page.waitForTimeout(600);
const after = await page.evaluate(() => window.soothiaAudio.getAudioState().context);
console.log(`context before click: ${before}; after click: ${after}`);
if (after !== "running") throw new Error("AudioContext did not run after a click");

const grid = page.locator("#sfx-grid button");
const count = await grid.count();
for (let i = 0; i < count; i++) {
  await grid.nth(i).click();
  await page.waitForTimeout(120);
}
const last = await page.evaluate(() => window.soothiaAudio.getAudioState().last);
console.log(`${count} variant buttons played; last: ${last}`);

await page.waitForTimeout(1500);
const musicAfterGesture = await page.evaluate(() => window.soothiaAudio.isMusicPlaying());
console.log(`music playing after gesture: ${musicAfterGesture}`);
if (!musicAfterGesture) throw new Error("music did not start after a gesture");

// Walk to step 4 and press Done.
for (let i = 0; i < 3; i++) await page.click("#next").catch(() => {});
await page.waitForTimeout(300);
await page.click("#next");
// Done fades the music out and closes the tab after 1.3s: check inside that window.
await page.waitForTimeout(300);
const musicAfterDone = await page.evaluate(() => window.soothiaAudio.isMusicPlaying()).catch(() => false);
console.log(`music playing after Done: ${musicAfterDone}`);
if (musicAfterDone) throw new Error("music did not stop on Done");
console.log(`console errors: ${errors.length}${errors.length ? "\n" + errors.join("\n") : ""}`);
if (errors.length) throw new Error("console errors during the sound check");
await context.close();
await rm(userDataDir, { recursive: true, force: true });
console.log("sfx check passed");
