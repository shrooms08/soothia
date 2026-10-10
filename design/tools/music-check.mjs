// Headless: does the offscreen player exist and play as soon as welcome.html
// opens, without a gesture? Also screenshots the floating-orb welcome page
// into design/applied/ (the footer shots come from footer-shots.mjs).
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = `${root}design/applied/`;
const extension = `${root}extension/dist`;
const siteUrl = process.argv[2] || "https://soothia.heylana.workers.dev/";
const userDataDir = `${root}design/tools/.chromium-profile`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 820 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
const id = new URL(worker.url()).host;
await new Promise((resolve) => setTimeout(resolve, 2500));

// The install opened welcome.html itself; inspect that tab, untouched.
const installed = context.pages().find((page) => page.url().includes("welcome.html"));
const contexts = await worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] }));
console.log(`offscreen documents after install: ${contexts.length}`);
const status = await worker.evaluate(() => chrome.runtime.sendMessage({ type: "soothia:v1:music", action: "status" }).catch((e) => ({ error: String(e) })));
console.log(`player status (no gesture): ${JSON.stringify(status)}`);
if (installed) {
  const mode = await installed.evaluate(() => ({ offscreen: window.soothiaAudio?.isOffscreenMusic(), playing: window.soothiaAudio?.isMusicPlaying(), hint: !document.getElementById("sound-hint")?.hidden }));
  console.log(`welcome page view: ${JSON.stringify(mode)}`);
  await installed.waitForTimeout(600);
  await installed.screenshot({ path: `${out}welcome-float.png` });
  console.log("welcome-float");
  await installed.close();
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const after = await worker.evaluate(() => chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] }));
  console.log(`offscreen documents after closing the tab: ${after.length}`);
}

await context.close();
await rm(userDataDir, { recursive: true, force: true });
