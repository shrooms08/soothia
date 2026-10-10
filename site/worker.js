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
  return typeof price === "number" ? `${Math.round(price * 100)}%` : "—";
}

function dialTo(marketId, side) {
  const action = `${PROXY}/api/actions/market/${marketId}?side=${side}`;
  return `https://dial.to/?action=${encodeURIComponent(`solana-action:${action}`)}`;
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
  const buttons = open
    ? `<a class="btn primary" href="${dialTo(marketId, "yes")}" target="_blank" rel="noopener">Bet YES</a>
       <a class="btn primary" href="${dialTo(marketId, "no")}" target="_blank" rel="noopener">Bet NO</a>`
    : `<span class="btn disabled" aria-disabled="true">${found ? "Betting is closed" : "No market"}</span>`;
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
  .share .cta { margin-bottom: 18px; }
  .share .cta .btn { min-width: 132px; height: 48px; font-size: 15px; }
  .btn.disabled { opacity: .6; cursor: default; }
  .share .fine { margin: 0 0 30px; color: var(--sth-text-3); font: 400 13px/1.5 var(--sans); max-width: 460px; }
  .share .links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 22px; font: 500 14px/1 var(--sans); }
  .share .foot { margin-top: 44px; color: var(--sth-text-3); font: 400 13px/1.5 var(--sans); }
</style>
</head>
<body>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient>
<symbol id="star" viewBox="-50 -50 100 100"><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#chrome)"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></symbol>
</defs></svg>
<main class="share">
  <a class="hero-orb-wrap" href="/" aria-label="Soothia home"><div class="orb"><span class="orb-body"><span class="orb-shimmer"></span><span class="orb-eye"></span></span><svg class="star orb-glint"><use href="#star"/></svg></div></a>
  <p class="kicker">${escape(kind)} on Panta</p>
  <h1>${escape(question)}</h1>
  ${hasOdds ? `<p class="odds"><span><b class="yes">YES</b> ${pct(market.yesPrice)}</span><span>·</span><span><b class="no">NO</b> ${pct(market.noPrice)}</span></p>` : ""}
  <div class="cta">${buttons}</div>
  <p class="fine">${open ? `Opens in your Solana wallet through dial.to. Bets are 1–100 USDC plus a 2% fee${closes ? `; buying closes ${escape(closes)}` : ""}.` : found ? "The buying window for this market has closed." : "Check the link and try again."}</p>
  <p class="links"><a href="${escape(pantaUrl)}" target="_blank" rel="noopener">View on Panta ↗</a><a href="/">Get Soothia</a></p>
  <p class="foot">Made with Soothia. Live on Solana mainnet.</p>
</main>
</body>
</html>`;
}
