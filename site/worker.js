// The landing site Worker. Static assets serve everything except two paths
// that need code: /actions.json (Solana Actions mapping for bet links) and
// /m/<marketId> (a share page rendered server-side so X and other crawlers
// see the market's Open Graph tags). Market data comes from soothia-proxy.
const PROXY = "https://soothia-proxy.heylana.workers.dev";
const SITE = "https://soothia.heylana.workers.dev";
const MARKET_PATH = /^\/m\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/;
const CACHE_SECONDS = 60;

const ACTION_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=3600",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/actions.json") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ACTION_HEADERS });
      const rules = { rules: [{ pathPattern: "/m/*", apiPath: `${PROXY}/api/actions/market/*` }] };
      return new Response(JSON.stringify(rules), { headers: ACTION_HEADERS });
    }
    const match = MARKET_PATH.exec(url.pathname);
    if (match) return sharePage(request, env, match[1], ctx);
    return env.ASSETS.fetch(request);
  },
};

async function sharePage(request, env, marketId, ctx) {
  const cache = caches.default;
  const key = new Request(`${SITE}/m/${marketId}`, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;

  let market = null;
  try {
    const proxy = env.PROXY ? (r) => env.PROXY.fetch(r) : (r) => fetch(r);
    const upstream = await proxy(new Request(`${PROXY}/market?id=${marketId}`, { signal: AbortSignal.timeout(8000) }));
    if (upstream.ok) market = await upstream.json();
  } catch {
    market = null;
  }
  const status = market?.title ? 200 : 404;
  const response = new Response(renderPage(marketId, market), {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SECONDS}` },
  });
  if (status === 200) ctx.waitUntil(cache.put(key, response.clone()));
  return response;
}

function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function pct(price) {
  return typeof price === "number" ? `${(price * 100).toFixed(1)}%` : "—";
}

function renderPage(marketId, market) {
  const found = Boolean(market?.title);
  const question = found ? market.title : "Market not found";
  const hasOdds = found && typeof market.yesPrice === "number" && typeof market.noPrice === "number";
  const odds = hasOdds ? `YES ${pct(market.yesPrice)} · NO ${pct(market.noPrice)}` : "";
  const kind = market?.marketType === "breaking" ? "Breaking market" : "Market";
  const description = found ? `${odds ? `${odds} · ` : ""}${kind} on Panta. Made with Soothia.` : "This Soothia bet link does not match a Panta market.";
  const category = found && market.category ? market.category : "other";
  const image = `${PROXY}/img/${encodeURIComponent(category)}.png`;
  const pageUrl = `${SITE}/m/${marketId}`;
  const pantaUrl = found && market.marketUrl ? market.marketUrl : `https://www.panta.market/market/${marketId}`;
  const open = found && market.phase === "primary" && (!market.primaryPhaseEnd || Date.parse(market.primaryPhaseEnd) > Date.now());
  const closes = found && market.primaryPhaseEnd ? new Date(market.primaryPhaseEnd).toUTCString().replace(/ GMT$/, " UTC") : "";
  const closesIso = found && market.primaryPhaseEnd ? new Date(market.primaryPhaseEnd).toISOString() : "";
  const sideButton = (side, price) =>
    `<button type="button" class="side side-${side}" data-side="${side}" role="radio" aria-checked="${side === "yes"}"><b>${side.toUpperCase()}</b><span class="side-pct" data-pct="${side}">${pct(price)}</span></button>`;
  const panel = open
    ? `<section class="bet" id="bet" aria-label="Place a bet">
    <div class="sides" role="radiogroup" aria-label="Side">${sideButton("yes", market.yesPrice)}${sideButton("no", market.noPrice)}</div>
    <div class="amounts" role="group" aria-label="Amount">
      <button type="button" class="chip selected" data-amount="1">$1</button>
      <button type="button" class="chip" data-amount="5">$5</button>
      <label class="custom"><span>$</span><input id="amount" type="number" min="1" max="100" step="0.01" inputmode="decimal" placeholder="Custom"></label>
    </div>
    <p class="quote" id="quote">Getting a quote…</p>
    <div class="wallet" id="wallet"></div>
    <button type="button" class="btn primary wide place" id="place" disabled>Place bet</button>
    <ol class="steps" id="steps" hidden></ol>
    <p class="status" id="status" aria-live="polite"></p>
    <div class="outcome" id="outcome" hidden></div>
  </section>`
    : `<p class="closed">${found ? "Betting is closed for this market." : "Check the link and try again."}</p>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(question)} · Soothia</title>
<meta name="description" content="${escape(description)}">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="canonical" href="${pageUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Soothia">
<meta property="og:url" content="${pageUrl}">
<meta property="og:title" content="${escape(question)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1024">
<meta property="og:image:height" content="1024">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@shroomsgotsol">
<meta name="twitter:title" content="${escape(question)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${image}">
<link rel="preload" href="/fonts/soothia-lora.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/soothia-inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
<style>
  .share { position: relative; z-index: 1; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 16px 40px; text-align: center; }
  .share .hero-orb-wrap { margin-bottom: 28px; }
  .share .orb { width: 88px; height: 88px; }
  .share .kicker { margin: 0 0 14px; color: var(--sth-text-3); font: 500 12px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; }
  .share h1 { max-width: 620px; margin: 0 0 18px; font: 500 clamp(26px, 4.6vw, 38px)/1.2 var(--serif); letter-spacing: -.01em; text-wrap: balance; }
  .odds { display: inline-flex; gap: 14px; align-items: center; margin: 0 0 26px; font: 500 15px/1 var(--mono); color: var(--sth-text-2); }
  .odds b { color: var(--sth-text); font-weight: 600; }
  .odds .yes { color: var(--sth-yes); } .odds .no { color: #E88A8A; }
  .bet { width: 100%; max-width: 400px; margin: 0 auto 18px; padding: 18px; border: 1px solid var(--sth-hairline-soft); border-radius: 18px; background: var(--sth-raised); display: grid; gap: 12px; text-align: left; box-shadow: 0 0 0 1px rgba(127,119,221,.08), 0 18px 50px rgba(83,74,183,.18); }
  .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .side { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 14px; border: 1px solid var(--sth-hairline-soft); border-radius: 12px; background: #000; color: var(--sth-text-2); font: 600 14px/1 var(--sans); cursor: pointer; }
  .side b { font-weight: 700; letter-spacing: .04em; } .side-yes b { color: var(--sth-yes); } .side-no b { color: #E88A8A; }
  .side-pct { font: 500 13px/1 var(--mono); color: var(--sth-text-2); }
  .side.selected { border-color: var(--sth-orb-mid); background: var(--sth-raised-hover); color: var(--sth-text); box-shadow: 0 0 0 1px rgba(175,169,236,.25); }
  .side.selected .side-pct { color: var(--sth-text); }
  .amounts { display: grid; grid-template-columns: 1fr 1fr 1.6fr; gap: 8px; }
  .chip, .custom { height: 42px; border: 1px solid var(--sth-hairline-soft); border-radius: 10px; background: #000; color: var(--sth-text-2); font: 600 14px/1 var(--mono); }
  .chip { cursor: pointer; } .chip.selected { border-color: var(--sth-orb-mid); background: var(--sth-raised-hover); color: var(--sth-text); }
  .custom { display: flex; align-items: center; gap: 4px; padding: 0 10px; color: var(--sth-text-3); }
  .custom input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--sth-text); font: 600 14px/1 var(--mono); outline: none; -moz-appearance: textfield; }
  .custom input::-webkit-outer-spin-button, .custom input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .custom:focus-within { border-color: var(--sth-orb-mid); }
  .quote { margin: 0; min-height: 20px; color: var(--sth-text-2); font: 400 14px/1.4 var(--sans); }
  .quote.error, .status.error { color: #E88A8A; }
  .wallet { display: grid; gap: 8px; }
  .wallet .cta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .wallet .fine { margin: 0; text-align: center; }
  .wallet-row { display: flex; align-items: center; gap: 8px; color: var(--sth-text-2); font: 500 13px/1 var(--sans); }
  .phantom-badge { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 6px; background: #AB9FF2; color: #16131F; font: 700 11px/1 var(--sans); }
  .btn.wide { width: 100%; }
  .btn.place { height: 48px; font-size: 15px; }
  .btn:disabled, .btn[disabled] { opacity: .45; cursor: default; pointer-events: none; }
  .bet.busy .side, .bet.busy .chip, .bet.busy .custom { opacity: .55; pointer-events: none; }
  .steps { list-style: none; margin: 2px 0 0; padding: 0; display: grid; gap: 8px; }
  .step { display: flex; align-items: center; gap: 10px; color: var(--sth-text-3); font: 500 13px/1 var(--sans); }
  .step-icon { position: relative; width: 18px; height: 18px; flex: none; }
  .step-icon::before { content: ""; position: absolute; inset: 2px; border-radius: 50%; border: 1.5px solid rgba(175,169,236,.25); }
  .step[data-state="active"] { color: var(--sth-text); font-weight: 600; }
  .step[data-state="active"] .step-icon::after { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--sth-text); animation: spin 1s linear infinite; }
  .step[data-state="done"] { color: var(--sth-text-2); }
  .step[data-state="done"] .step-icon::before { border: 0; background: rgba(93,202,165,.18); }
  .step[data-state="done"] .step-icon::after { content: ""; position: absolute; left: 6px; top: 3px; width: 4px; height: 8px; border: solid var(--sth-yes); border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .step[data-state="error"] { color: #E88A8A; }
  .step[data-state="error"] .step-icon::before { border-color: rgba(232,138,138,.6); }
  .status { margin: 0; min-height: 18px; color: var(--sth-text-2); font: 400 13px/1.45 var(--sans); }
  .done { text-align: center; padding: 8px 0 2px; }
  .done-title { margin: 0 0 6px; font: 500 24px/1.2 var(--serif); }
  .done-sub { margin: 0 0 12px; color: var(--sth-text-2); font: 400 14px/1.4 var(--sans); }
  .done .links { font-size: 13px; }
  .closed { margin: 0 0 18px; padding: 14px 18px; border: 1px solid var(--sth-hairline-soft); border-radius: 12px; color: var(--sth-text-2); }
  .share .fine { margin: 0 0 30px; color: var(--sth-text-3); font: 400 13px/1.5 var(--sans); max-width: 460px; }
  @media (prefers-reduced-motion: reduce) { .step-icon::after { animation: none !important; } }
  .share .links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 22px; font: 500 14px/1 var(--sans); }
  .share .foot { margin-top: 44px; color: var(--sth-text-3); font: 400 13px/1.5 var(--sans); }
</style>
</head>
<body>
<div class="sky" id="sky" data-count="14" data-count-narrow="7" aria-hidden="true"></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient>
<symbol id="star" viewBox="-50 -50 100 100"><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#chrome)"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></symbol>
</defs></svg>
<main class="share" data-market="${marketId}" data-proxy="${PROXY}" data-site="${SITE}" data-open="${open ? "1" : "0"}" data-panta="${escape(pantaUrl)}">
  <a class="hero-orb-wrap" href="/" aria-label="Soothia home"><div class="orb"><span class="orb-body"><span class="orb-shimmer"></span><span class="orb-eye"></span></span><svg class="star orb-glint"><use href="#star"/></svg></div></a>
  <p class="kicker">${escape(kind)} on Panta</p>
  <h1>${escape(question)}</h1>
  ${hasOdds ? `<p class="odds"><span><b class="yes">YES</b> <span data-pct="yes">${pct(market.yesPrice)}</span></span><span>·</span><span><b class="no">NO</b> <span data-pct="no">${pct(market.noPrice)}</span></span></p>` : ""}
  ${panel}
  <p class="fine">${open ? `You sign in your own Phantom wallet; Soothia never holds funds. Bets are 1–100 USDC plus a 2% fee.${closes ? ` Buying closes <time datetime="${closesIso}">${escape(closes)}</time>.` : ""}` : found ? "The buying window for this market has closed." : ""}</p>
  <p class="links"><a href="${escape(pantaUrl)}" target="_blank" rel="noopener">View on Panta ↗</a><a href="/">Get Soothia</a></p>
  <p class="foot">Made with Soothia. Live on Solana mainnet.</p>
</main>
<script src="/sky.js"></script>
<script src="/share.js"></script>
</body>
</html>`;
}
