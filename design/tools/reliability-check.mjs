// Loads the built extension in headless Chromium on real pages and reports,
// per page: errors from the page, our scripts and the service worker,
// extracted characters, time to first claims (cold, then cached on a reload),
// and the claims. Scan events come from the content script's harness flag
// (chrome.storage.local soothia:devEvents), set through the welcome page.
// `node design/tools/reliability-check.mjs <url>...`
import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const ext = `${root}extension/dist`;
const dir = `${root}design/tools/.chromium-profile-reliability`;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
await rm(dir, { recursive: true, force: true });
const ctx = await chromium.launchPersistentContext(dir, { channel: "chromium", headless: true, viewport: { width: 1280, height: 900 }, userAgent: UA, args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
let sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
const swErrors = [];
sw.on("console", (m) => { if (m.type() === "error") swErrors.push(m.text().slice(0, 200)); });
sw.on("pageerror", (e) => swErrors.push(`uncaught ${e.message.slice(0, 200)}`));
const id = new URL(sw.url()).host;
// Turn on scan events through an extension page, which has chrome.storage.
const setup = await ctx.newPage();
await setup.goto(`chrome-extension://${id}/welcome.html`);
await setup.evaluate(() => chrome.storage.local.set({ "soothia:devEvents": true, "soothia:bubbleShown": true }));
const version = await setup.evaluate(() => chrome.runtime.getManifest().version);
console.log("extension", version, "| welcome footer:", await setup.locator("#version").textContent().catch(() => "?"));
await setup.close();

const rows = [];
async function visit(url, label) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => { const m = String(e.message); if (/soothia|chrome-extension/i.test(m + String(e.stack ?? ""))) errors.push(`page: ${m.slice(0, 160)}`); });
  page.on("console", (m) => { if (m.type() === "error" && /chrome-extension/.test(m.location().url)) errors.push(`console: ${m.text().slice(0, 160)}`); });
  let final = null;
  const events = [];
  await page.exposeFunction("__soothiaScan", (event) => { events.push(event); if (event.done) final ??= event; });
  await page.addInitScript(() => window.addEventListener("message", (e) => { if (e.data?.type === "soothia:v1:scan") window.__soothiaScan(e.data); }));
  const t0 = Date.now();
  try { await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 }); } catch (e) { errors.push(`goto: ${e.message.slice(0, 100)}`); }
  const dcl = Date.now() - t0;
  for (let i = 0; i < 100 && !final; i++) await page.waitForTimeout(250);
  const last = events[events.length - 1] ?? {};
  const title = (await page.title().catch(() => "")).slice(0, 60);
  const row = { label, url, title, dcl, state: final?.state ?? last.state ?? "no scan event", done: final?.done ?? "-", path: final?.path ?? "-", chars: final?.chars ?? last.chars ?? 0, ms: final?.elapsedMs ?? null, cached: final?.cached ?? false, tiles: final?.tiles ?? [], issues: last.issues ?? [], errors };
  await page.close();
  return row;
}
for (const url of process.argv.slice(2)) {
  const cold = await visit(url, "cold");
  const warm = await visit(url, "cached");
  rows.push(cold, warm);
  console.log(`\n== ${url}\n   ${cold.title}`);
  for (const r of [cold, warm]) {
    console.log(`   ${r.label.padEnd(6)} dcl ${r.dcl}ms | ${r.done} ${r.ms === null ? "(no result)" : r.ms + "ms from script start"} | path ${r.path} | ${r.chars} chars | state: ${r.state}${r.cached ? " | client cache" : ""}`);
    for (const t of r.tiles) console.log(`          claim: ${t}`);
    for (const i of r.issues) console.log(`          issue: ${i}`);
    for (const e of r.errors) console.log(`          ERROR ${e}`);
  }
}
console.log("\n== service worker errors:", swErrors.length ? swErrors : "none");
await ctx.close();
await rm(dir, { recursive: true, force: true });
