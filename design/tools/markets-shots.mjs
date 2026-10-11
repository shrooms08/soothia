// Screenshots for the markets work: /markets at desktop and phone widths, a
// P2P share page, and the extension tile for a matched P2P market (harness
// page, canned data). `node design/tools/markets-shots.mjs <p2p market id>`
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = `${root}design/applied/`;
const SITE = "https://soothia.fun";
const p2pId = process.argv[2];
const browser = await chromium.launch();

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await desktop.goto(`${SITE}/markets?v=${Date.now()}`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(1500);
console.log(
  "markets desktop: live cards",
  await desktop.locator("#live .mcard:not([hidden])").count(),
  "p2p cards",
  await desktop.locator("#p2p .mcard:not([hidden])").count(),
  "scrollWidth",
  await desktop.evaluate(() => document.documentElement.scrollWidth),
);
await desktop.screenshot({ path: `${out}markets-desktop.png`, fullPage: false });
await desktop.close();

const phone = await browser.newContext({ ...devices["iPhone 13"] });
const phonePage = await phone.newPage();
await phonePage.goto(`${SITE}/markets?v=${Date.now()}`, { waitUntil: "networkidle" });
await phonePage.waitForTimeout(1500);
console.log("markets phone: scrollWidth", await phonePage.evaluate(() => document.documentElement.scrollWidth));
await phonePage.screenshot({ path: `${out}markets-mobile.png`, fullPage: false });
await phone.close();

if (p2pId) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${SITE}/m/${p2pId}?v=${Date.now()}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  console.log(
    "share p2p:",
    (
      await page
        .locator(".bet.p2p, .closed")
        .first()
        .innerText()
        .catch(() => "no panel")
    ).replace(/\s+/g, " "),
  );
  await page.screenshot({ path: `${out}share-p2p.png` });
  await page.close();
}
await browser.close();

// ---- Extension tile for a matched P2P market (localhost harness, mocks) ----
const tools = `${root}design/tools/`;
const server = createServer(async (request, response) => {
  const file = request.url === "/" ? "dark.html" : request.url.slice(1).split("?")[0];
  try {
    const body = await readFile(tools + file);
    response.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : "text/html" });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://localhost:${server.address().port}`;
const claim = (id, question, category, endTime, sourceQuote) => ({
  id,
  question,
  category,
  endTime,
  sourceQuote,
  confidence: 0.8,
  resolution: { type: "price_threshold", details: "", sources: ["https://www.coingecko.com"] },
});
const tiles = [
  {
    claim: claim(
      "c1",
      "Will HYPE reach $100 by December 31, 2026?",
      "crypto",
      "2026-12-31T23:59:59Z",
      "HYPE to $100 this cycle, easy.",
    ),
    market: {
      id: "4J6WxFGuCw9deMJ6pQ7gwpVXCvLorMrz28icSnCYWeGB",
      title: "Will HYPE reach $100 by December 31, 2026?",
      category: "crypto",
      yesPrice: 0.672,
      noPrice: 0.328,
      endTime: "2026-12-31T23:59:59Z",
      phase: "p2p",
      pantaUrl: "https://www.panta.market/market/4J6WxFGuCw9deMJ6pQ7gwpVXCvLorMrz28icSnCYWeGB",
    },
  },
  {
    claim: claim(
      "c2",
      "Will the Lakers win the Western Conference this season?",
      "sports",
      "2026-06-30T23:59:59Z",
      "Lakers win the West this season. Calling it now.",
    ),
    market: {
      id: "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL",
      title: "Will the Lakers win the Western Conference this season?",
      category: "sports",
      yesPrice: 0.62,
      noPrice: 0.38,
      endTime: "2026-06-30T23:59:59Z",
      phase: "primary",
    },
  },
  {
    claim: claim(
      "c3",
      "Will the Fed cut rates twice before December?",
      "finance",
      "2026-12-31T23:59:59Z",
      "Two more cuts are priced in before the year is out.",
    ),
    market: null,
  },
];
const userDataDir = `${root}design/tools/.chromium-profile-markets`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 760 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${root}extension/dist`, `--load-extension=${root}extension/dist`],
});
await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => {});
const page = await context.newPage();
await page.goto(`${base}/dark.html`);
await page.waitForTimeout(1800);
await page.evaluate(
  (tiles) =>
    window.postMessage(
      {
        type: "soothia:v1:dev-scene",
        scene: "tiles",
        mocks: { "/creator/markets": { markets: [] } },
        tiles,
        dryRun: true,
      },
      "*",
    ),
  tiles,
);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}tile-p2p.png` });
console.log("tile-p2p.png");
await context.close();
server.close();
await rm(userDataDir, { recursive: true, force: true });
