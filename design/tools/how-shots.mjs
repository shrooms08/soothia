// The landing page's "How it works" images: element screenshots of the
// extension card alone (pure black page behind it, 2x), with real data from
// our BTC market. Writes site/img/how-*.webp and keeps the PNG sources in
// design/applied/how-src-*.png. Run from the repo root:
//   node design/tools/how-shots.mjs
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";
import { createRequire } from "node:module";
const sharp = createRequire(import.meta.url)("../../scripts/node_modules/sharp");

const root = fileURLToPath(new URL("../..", import.meta.url));
const tools = `${root}design/tools/`;
const applied = `${root}design/applied/`;
const img = `${root}site/img/`;

const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const MARKET_URL = `https://www.panta.market/market/${MARKET}`;
const QUESTION = "Will BTC reach a new all-time high by December 31, 2026?";
const QUOTE = "…Bitcoin making new all-time highs in 2026 is still possible…";
const YES = 0.503322295,
  NO = 0.496677705;
const soon = new Date(Date.now() + 5 * 60_000).toISOString();
const txBase64 = (await readFile(`${root}extension/test/fixtures/panta-create-tx.txt`, "utf8")).trim();

const tile = {
  claim: {
    id: "c1",
    question: QUESTION,
    category: "crypto",
    endTime: "2026-12-31T23:59:59Z",
    sourceQuote: QUOTE,
    confidence: 0.86,
    resolution: { type: "price_threshold", details: "", sources: ["https://www.coingecko.com/en/coins/bitcoin"] },
  },
  market: null,
};
const mocks = {
  "/wallet/balances": { sol: 0.0521, usdc: 18 },
  "/creator/markets": { markets: [] },
  "/create/quote": {
    quoteId: "cr_mock",
    paymentUsdc: 20,
    breakdown: { liquidityUsdc: 5, platformFeeUsdc: 15 },
    expiresAt: soon,
    marketId: MARKET,
    marketType: "breaking",
    eventInProgress: false,
    startTime: soon,
    question: QUESTION,
    adjustments: [],
    predictedBytes: 1051,
    authority: { name: "CoinGecko", url: "https://www.coingecko.com/en/coins/bitcoin" },
    resolutionRule: "YES if BTC/USD sets a new all-time high by 2026-12-31 23:59 UTC, per CoinGecko. Otherwise NO.",
    sourcesOfTruth: [
      "https://www.coingecko.com/en/coins/bitcoin",
      "https://x.com/intangiblecoins/status/2002741524950344005",
    ],
    imageUrl: "https://api.soothia.fun/img/crypto.png",
    endTime: "2026-12-31T23:59:59Z",
    resolutionTime: "2027-01-01T00:59:59Z",
  },
  "/create/build": {
    txBase64,
    bytes: 1051,
    recentBlockhash: "x",
    lastValidBlockHeight: 1,
    txExpiresAt: soon,
    quote: null,
  },
  "/buy/quote": {
    quoteId: "qt_mock",
    marketId: MARKET,
    side: "yes",
    amountUsdc: 1,
    shares: 1.983541,
    avgPrice: 0.504148,
    feeUsdc: 0.02,
    totalUsdc: 1.02,
    payoutPerShareUsdc: 1,
    expiresAt: soon,
  },
  "/buy/build": { orderId: "ord_mock", txBase64, bytes: 706, expectedShares: 1.983541, expiresAt: soon },
  "/market": {
    marketId: MARKET,
    title: QUESTION,
    yesPrice: YES,
    noPrice: NO,
    endTime: "2027-01-01T00:00:00.000Z",
    marketUrl: MARKET_URL,
    phase: "primary",
    marketType: "breaking",
    primaryPhaseEnd: "2026-10-12T12:14:35.000Z",
    liquidity: null,
  },
};

const server = createServer(async (request, response) => {
  const file = request.url.slice(1).split("?")[0] || "black.html";
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
const userDataDir = `${tools}.chromium-profile-how`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 900 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${root}extension/dist`, `--load-extension=${root}extension/dist`],
});
await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => {});

async function shot(scene, name, settle, which = "card", pad = 0, extra = {}) {
  const page = await context.newPage();
  await page.goto(`${base}/black.html`);
  await page.waitForTimeout(1600);
  // The harness scenes index tiles[1] and [2]; the same claim three times keeps them happy.
  await page.evaluate(
    ({ scene, mocks, tiles, extra }) =>
      window.postMessage({ type: "soothia:v1:dev-scene", scene, mocks, tiles, dryRun: true, ...extra }, "*"),
    { scene, mocks, tiles: scene === "tiles" ? [tile] : [tile, tile, tile], extra },
  );
  await page.waitForTimeout(settle);
  const rects = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const onMessage = (event) => {
          if (event.data?.type === "soothia:v1:dev-rect") {
            window.removeEventListener("message", onMessage);
            resolve(event.data);
          }
        };
        window.addEventListener("message", onMessage);
        window.postMessage({ type: "soothia:v1:dev-scene", scene: "rect" }, "*");
      }),
  );
  const r = rects[which];
  // Stars sit up and to the left of the orb; the clip stays inside the viewport.
  const left = Math.max(0, r.x - pad),
    top = Math.max(0, r.y - pad);
  const right = Math.min(980, r.x + r.width + Math.min(pad, 24)),
    bottom = Math.min(900, r.y + r.height + Math.min(pad, 20));
  const clip = { x: left, y: top, width: right - left, height: bottom - top };
  const source = `${applied}how-src-${name}.png`;
  await page.screenshot({ path: source, clip, omitBackground: false });
  await page.close();
  return { source, clip };
}

// The card listing the claim (Read), the review sheet (Make it a market), the bet sheet (Bet).
const read = await shot("tiles", "read", 1500);
const make = await shot("review", "make", 2600);
const bet = await shot("bet", "bet", 2600);
// The orb with its three chrome found-stars; padded so the stars fit.
const orb = await shot("orb-found", "orb", 1400, "orb", 96);
await context.close();
server.close();
await rm(userDataDir, { recursive: true, force: true });

// WebP at 2x, trimmed to a fixed height so the three cards match; the page fades the bottom.
const HEIGHT = 1500;
for (const [name, { source }] of [
  ["read", read],
  ["make", make],
  ["bet", bet],
]) {
  const meta = await sharp(source).metadata();
  const height = Math.min(HEIGHT, meta.height);
  await sharp(source)
    .extract({ left: 0, top: 0, width: meta.width, height })
    .webp({ quality: 84 })
    .toFile(`${img}how-${name === "read" ? "read-card" : name}.webp`);
  console.log(`how-${name === "read" ? "read-card" : name}.webp ${meta.width}x${height}`);
}
{
  const meta = await sharp(orb.source).metadata();
  await sharp(orb.source).webp({ quality: 84, alphaQuality: 90 }).toFile(`${img}how-read-orb.webp`);
  console.log(`how-read-orb.webp ${meta.width}x${meta.height}`);
}
