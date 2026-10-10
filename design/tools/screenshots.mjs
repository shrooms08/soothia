// Screenshots every Soothia screen with the built extension in headless
// Chromium, on a light page and a dark page, with canned data. Run from the
// repo root: `node design/tools/screenshots.mjs`. Output: design/applied/.
// No Panta or Solana call is made: the content script answers from mocks
// on localhost, and the page carries a fake Phantom (mock.js).
import { createServer } from "node:http";
import { mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const tools = `${root}design/tools/`;
const out = `${root}design/applied/`;
const extension = `${root}extension/dist`;
await mkdir(out, { recursive: true });

const server = createServer(async (request, response) => {
  const file = request.url === "/" ? "light.html" : request.url.slice(1).split("?")[0];
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

const txBase64 = (await readFile(`${root}extension/test/fixtures/panta-create-tx.txt`, "utf8")).trim();
const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const MARKET_URL = `https://www.panta.market/market/${MARKET}`;
const SIG = "WT5qyHDfnP9pVUL4TvaBqpRceGxR2tPKR62sKYrBHqnEeN24hstUFbUKCpAZdGnr67boiqJzAeBr5g55owPUmcQ";
const soon = new Date(Date.now() + 5 * 60_000).toISOString();

const claim = (id, question, category, endTime, sourceQuote, type = "price_threshold") => ({
  id, question, category, endTime, sourceQuote, confidence: 0.8,
  resolution: { type, details: "", sources: ["https://www.coingecko.com"] },
});
const tiles = [
  { claim: claim("c1", "Will Bitcoin close 2026 above $150,000?", "crypto", "2026-12-31T23:59:59Z", "…expect Bitcoin to close the year above $150,000 as ETF inflows continue…"), market: null },
  {
    claim: claim("c2", "Will the Lakers win the Western Conference this season?", "sports", "2026-06-30T23:59:59Z", "Lakers win the West this season. Calling it now.", "sports_result"),
    market: { id: MARKET, title: "Will the Lakers win the Western Conference this season?", category: "sports", yesPrice: 0.62, noPrice: 0.38, endTime: "2026-06-30T23:59:59Z" },
  },
  { claim: claim("c3", "Will the Fed cut rates twice before December?", "finance", "2026-12-31T23:59:59Z", "Two more cuts are priced in before the year is out.", "official_outcome"), market: null },
];
const finish = { signature: SIG, status: "confirmed", marketId: MARKET, eventPda: MARKET, marketUrl: MARKET_URL, registered: true, registerError: null };
const buyStatus = { signature: SIG, status: "confirmed", confirmed: true, submitted: true, verified: "confirmed", attributed: true, errors: {}, marketUrl: MARKET_URL };
const mocks = {
  "/wallet/balances": { sol: 0.0021, usdc: 18 },
  "/create/quote": {
    quoteId: "cr_mock", paymentUsdc: 20, breakdown: { liquidityUsdc: 5, platformFeeUsdc: 15 }, expiresAt: soon, marketId: MARKET,
    marketType: "breaking", eventInProgress: false, startTime: soon, question: tiles[0].claim.question, adjustments: [], predictedBytes: 1051,
    authority: { name: "CoinGecko", url: "https://www.coingecko.com/en/coins/bitcoin" },
    resolutionRule: "YES if this happens by 2026-12-31 23:59 UTC, per CoinGecko's BTC/USD price. Otherwise NO. Touching the level at any time before the deadline counts.",
    sourcesOfTruth: ["https://www.coingecko.com/en/coins/bitcoin", "https://x.com/mwatch/status/1"],
    imageUrl: "https://soothia-proxy.heylana.workers.dev/img/crypto.png", endTime: "2026-12-31T23:59:59Z", resolutionTime: "2027-01-01T00:59:59Z",
  },
  "/create/build": { txBase64, bytes: 1051, recentBlockhash: "x", lastValidBlockHeight: 1, txExpiresAt: soon, quote: null },
  "/create/simulate": { ok: true, err: null, reason: null, logLine: null, logs: [], unitsConsumed: 48210 },
  "/tx/simulate": { ok: true, err: null, reason: null, logLine: null, logs: [], unitsConsumed: 31800 },
  "/create/send": finish,
  "/create/register-retry": finish,
  "/buy/quote": { quoteId: "qt_mock", marketId: MARKET, side: "yes", amountUsdc: 1, shares: 1.996677, avgPrice: 0.500832, feeUsdc: 0.02, totalUsdc: 1.02, payoutPerShareUsdc: 1, expiresAt: soon },
  "/buy/build": { orderId: "ord_mock", txBase64, bytes: 706, expectedShares: 1.996677, expiresAt: soon },
  "/buy/send": buyStatus,
  "/buy/status": buyStatus,
  "/market": { marketId: MARKET, title: tiles[1].claim.question, yesPrice: 0.5, noPrice: 0.5, endTime: "2026-06-30T23:59:59Z", marketUrl: MARKET_URL },
  "/creator/markets": { markets: [] },
  "/positions": {
    positions: [
      { marketId: MARKET, title: tiles[0].claim.question, side: "yes", shares: 7, phase: "primary", claimable: false, claimed: false, outcome: null, marketUrl: MARKET_URL, creatorSeedShares: 5 },
      { marketId: MARKET, title: tiles[0].claim.question, side: "no", shares: 5, phase: "primary", claimable: false, claimed: false, outcome: null, marketUrl: MARKET_URL, creatorSeedShares: 5 },
      { marketId: "LkrsMarket11111111111111111111111111111111", title: tiles[1].claim.question, side: "yes", shares: 2, phase: "primary", claimable: false, claimed: false, outcome: null, marketUrl: MARKET_URL, creatorSeedShares: null },
    ],
  },
};

// [name, page, scene, settle ms]
const SHOTS = [
  ["light-orb-idle", "light", "orb-idle", 1200],
  ["light-orb-thinking", "light", "orb-thinking", 1200],
  ["light-orb-found", "light", "orb-found", 1400],
  ["dark-orb-idle", "dark", "orb-idle", 1200],
  ["dark-orb-thinking", "dark", "orb-thinking", 1200],
  ["dark-orb-found", "dark", "orb-found", 1400],
  ["dark-orb-success", "dark", "orb-success", 350],
  ["dark-card-tiles", "dark", "tiles", 1500],
  ["light-card-tiles", "light", "tiles", 1500],
  ["dark-card-empty", "dark", "empty", 800],
  ["light-card-skipped", "light", "skipped", 800],
  ["dark-card-error", "dark", "error", 800],
  ["dark-card-debug", "dark", "debug", 1200],
  ["dark-review-sheet", "dark", "review", 2600],
  ["light-review-sheet", "light", "review", 2600],
  ["dark-bet-sheet", "dark", "bet", 2600],
  ["dark-success-market-live", "dark", "success-create", 7000],
  ["dark-success-bet-placed", "dark", "success-bet", 7000],
  ["dark-my-bets", "dark", "mybets", 2200],
];

const userDataDir = `${root}design/tools/.chromium-profile`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 760 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
// Wait for the service worker, so the fonts and relay are ready.
await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => {});

for (const [name, theme, scene, settle] of SHOTS) {
  const page = await context.newPage();
  await page.goto(`${base}/${theme}.html`);
  await page.waitForTimeout(1800);
  await page.evaluate(({ scene, mocks, tiles }) => {
    window.postMessage({ type: "soothia:v1:dev-scene", scene, mocks, tiles, dryRun: scene.startsWith("success") ? false : true }, "*");
  }, { scene, mocks, tiles });
  await page.waitForTimeout(settle);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(name);
  await page.close();
}
await context.close();
server.close();
await rm(userDataDir, { recursive: true, force: true });
