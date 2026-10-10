// The landing site Worker. Static assets serve everything except two paths
// that need code: /actions.json (Solana Actions mapping for bet links) and
// /m/<marketId> (a share page rendered server-side so X and other crawlers
// see the market's Open Graph tags). Market data comes from soothia-proxy.
const PROXY = "https://api.soothia.fun";
const SITE = "https://soothia.fun";
const MARKET_PATH = /^\/m\/([1-9A-HJ-NP-Za-km-z]{32,44})\/?$/;
const CACHE_SECONDS = 60;
// Bumped on every release so the edge never serves a stale script with a new page.
const ASSET_VERSION = "0.9.4";

// Sent on every response, static files included (wrangler.toml runs this Worker first for every path). Scripts and styles come only from
// this origin (styles also inline, for the share page and a few attributes); images
// may be any https URL (Panta market images); connections go to the proxy and, for
// Mobile Wallet Adapter, to its reflector websockets; nothing may frame the site.
const CSP = [
  "default-src 'self'",
  // Cloudflare injects its Web Analytics beacon at the edge; it must be allowed or every page logs a violation.
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self'",
  "connect-src 'self' https://api.soothia.fun https://soothia-proxy.heylana.workers.dev https://cloudflareinsights.com wss: ws://localhost:* http://localhost:*",
  "frame-src https://www.youtube.com https://www.loom.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
export const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export function withSecurityHeaders(response) {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  return out;
}

/** `value` when it is an https URL, otherwise `fallback`. Keeps javascript: and data: out of hrefs and srcs. */
export function httpsUrl(value, fallback) {
  try {
    const url = new URL(String(value));
    if (url.protocol === "https:") return url.href;
  } catch {
    // Not a URL.
  }
  return fallback;
}

const MARKET_ID = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

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
    return withSecurityHeaders(await handle(request, env, ctx));
  },
};

async function handle(request, env, ctx) {
    const url = new URL(request.url);
    // www goes to the bare domain, same path and query.
    if (url.hostname === "www.soothia.fun") {
      return Response.redirect(`${SITE}${url.pathname}${url.search}`, 301);
    }
    if (url.pathname === "/actions.json") {
      if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: ACTION_HEADERS });
      const rules = { rules: [{ pathPattern: "/m/*", apiPath: `${PROXY}/api/actions/market/*` }] };
      return new Response(JSON.stringify(rules), { headers: ACTION_HEADERS });
    }
    const match = MARKET_PATH.exec(url.pathname);
    if (match) return sharePage(request, env, match[1], ctx);
    if (url.pathname === "/markets" || url.pathname === "/markets/") return marketsPage(request, env, ctx);
    return env.ASSETS.fetch(request);
}

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

export function escape(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function pct(price) {
  return typeof price === "number" ? `${(price * 100).toFixed(1)}%` : "—";
}

export function renderPage(marketId, market) {
  const found = Boolean(market?.title);
  const question = found ? market.title : "Market not found";
  const hasOdds = found && typeof market.yesPrice === "number" && typeof market.noPrice === "number";
  const odds = hasOdds ? `YES ${pct(market.yesPrice)} · NO ${pct(market.noPrice)}` : "";
  const kind = market?.marketType === "breaking" ? "Breaking market" : "Market";
  const description = found ? `${odds ? `${odds} · ` : ""}${kind} on Panta. Made with Soothia.` : "This Soothia bet link does not match a Panta market.";
  const category = found && market.category ? market.category : "other";
  const image = `${PROXY}/img/${encodeURIComponent(category)}.png`;
  const pageUrl = `${SITE}/m/${marketId}`;
  const pantaUrl = httpsUrl(found ? market.marketUrl : null, `https://www.panta.market/market/${marketId}`);
  const open = found && market.phase === "primary" && (!market.primaryPhaseEnd || Date.parse(market.primaryPhaseEnd) > Date.now());
  const resolved = found && (market.resolvedOutcome === "YES" || market.resolvedOutcome === "NO");
  const p2p = found && !open && !resolved && market.phase !== "primary";
  const volume = found && typeof market.volumeUsdc === "number" ? `$${market.volumeUsdc.toFixed(2)} traded` : "";
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
    : resolved
      ? `<section class="bet p2p" aria-label="Resolved"><p class="chip-outcome ${market.resolvedOutcome === "YES" ? "yes" : "no"}">Resolved: ${market.resolvedOutcome}</p>${volume ? `<p class="fine">${volume}</p>` : ""}<a class="btn wide" href="${escape(pantaUrl)}" target="_blank" rel="noopener">View on Panta \u2197</a></section>`
      : p2p
        ? `<section class="bet p2p" aria-label="Trade on Panta">${volume ? `<p class="quote">${volume}</p>` : ""}<a class="btn primary wide" href="${escape(pantaUrl)}" target="_blank" rel="noopener">Trade on Panta \u2197</a><p class="fine">Shares trade between people on Panta's order book.</p></section>`
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
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}">
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
  .quote-updating { color: var(--sth-text-3); font-size: 12px; }
  .quote-retry { font-size: 13px; padding: 0; }
  .wallet { display: grid; gap: 8px; }
  .wallet .cta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .wallet .fine { margin: 0; text-align: center; }
  .wallet-row { display: flex; align-items: center; gap: 8px; color: var(--sth-text-2); font: 500 13px/1 var(--sans); }
  .wallet-row .wallet-name { color: var(--sth-text); }
  .wallet-row .linkish { margin-left: auto; }
  .wallet-icon { flex: none; width: 20px; height: 20px; border-radius: 6px; object-fit: cover; }
  .wallet-initial { display: inline-flex; align-items: center; justify-content: center; background: var(--sth-raised-hover); color: var(--sth-text); font: 700 11px/1 var(--sans); }
  .linkish { border: 0; background: none; color: var(--sth-link); font: 500 13px/1 var(--sans); cursor: pointer; padding: 4px 0; }
  .linkish:hover { color: var(--sth-text); text-decoration: underline; }
  .wallet-picker { margin-top: 4px; padding: 12px; border: 1px solid var(--sth-hairline); border-radius: 12px; background: #000; display: grid; gap: 8px; }
  .wallet-picker-title { margin: 0; color: var(--sth-text); font: 600 13px/1.3 var(--sans); }
  .wallet-picker-list { display: grid; gap: 6px; }
  .wallet-option { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid var(--sth-hairline-soft); border-radius: 10px; background: transparent; color: var(--sth-text); font: 500 14px/1 var(--sans); text-align: left; cursor: pointer; }
  .wallet-option:hover, .wallet-option:focus-visible { background: var(--sth-raised-hover); border-color: var(--sth-orb-mid); }
  .install-links { justify-content: flex-start; gap: 6px 16px; }
  .open-in { display: grid; gap: 8px; }
  .open-in-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .open-in .fine { margin: 0; }
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
  .bet.p2p { text-align: center; }
  .bet.p2p .fine { margin: 0; }
  .chip-outcome { display: inline-block; margin: 0 auto; padding: 8px 14px; border-radius: 999px; font: 600 13px/1 var(--mono); letter-spacing: .06em; }
  .chip-outcome.yes { background: rgba(93,202,165,.16); color: var(--sth-yes); }
  .chip-outcome.no { background: rgba(232,138,138,.16); color: #E88A8A; }
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
<main class="share" data-market="${marketId}" data-proxy="${PROXY}" data-site="${SITE}" data-v="${ASSET_VERSION}" data-open="${open ? "1" : "0"}" data-panta="${escape(pantaUrl)}">
  <a class="hero-orb-wrap" href="/" aria-label="Soothia home"><div class="orb"><span class="orb-body"><span class="orb-shimmer"></span><span class="orb-eye"></span></span><svg class="star orb-glint"><use href="#star"/></svg></div></a>
  <p class="kicker">${escape(kind)} on Panta</p>
  <h1>${escape(question)}</h1>
  ${hasOdds ? `<p class="odds"><span><b class="yes">YES</b> <span data-pct="yes">${pct(market.yesPrice)}</span></span><span>·</span><span><b class="no">NO</b> <span data-pct="no">${pct(market.noPrice)}</span></span></p>` : ""}
  ${panel}
  <p class="fine">${open ? `You sign in your own Solana wallet; Soothia never holds funds. Bets are 1\u2013100 USDC plus a 2% fee.${closes ? ` Buying closes <time datetime="${closesIso}">${escape(closes)}</time>.` : ""}` : resolved ? "This market has resolved." : p2p ? "The buying window has closed; the market is live on Panta until it resolves." : found ? "The buying window for this market has closed." : ""}</p>
  <p class="links"><a href="${escape(pantaUrl)}" target="_blank" rel="noopener">View on Panta ↗</a><a href="/">Get Soothia</a></p>
  <p class="foot">Made with Soothia. Live on Solana mainnet.</p>
</main>
<script src="/sky.js?v=${ASSET_VERSION}"></script>
<script src="/share.js?v=${ASSET_VERSION}"></script>
</body>
</html>`;
}


// ---- /markets ----

async function marketsPage(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(`${SITE}/markets`, { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;
  let data = null;
  try {
    const proxy = env.PROXY ? (r) => env.PROXY.fetch(r) : (r) => fetch(r);
    const upstream = await proxy(new Request(`${PROXY}/markets?status=all&sort=closing`, { signal: AbortSignal.timeout(25000) }));
    if (upstream.ok) data = await upstream.json();
  } catch {
    data = null;
  }
  const response = new Response(renderMarkets(data), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": `public, max-age=${CACHE_SECONDS}` },
  });
  if (data) ctx.waitUntil(cache.put(key, response.clone()));
  return response;
}

function pctOrDash(value) {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "\u2014";
}

function utc(date) {
  return escape(date.toUTCString().replace(/ GMT$/, " UTC"));
}

export function marketCard(item) {
  const live = item.phase === "primary";
  const id = MARKET_ID.test(String(item.id)) ? item.id : "";
  const betHref = id ? `/m/${id}` : "/markets";
  const pantaUrl = httpsUrl(item.pantaUrl, id ? `https://www.panta.market/market/${id}` : "https://www.panta.market");
  const imageUrl = httpsUrl(item.imageUrl, `${PROXY}/img/other.png`);
  const volume = typeof item.volumeUsdc === "number" ? item.volumeUsdc : 0;
  const closes = item.closesAt ? new Date(item.closesAt) : null;
  const ends = item.endsAt ? new Date(item.endsAt) : null;
  const when = live && closes
    ? `Buying closes <time datetime="${closes.toISOString()}">${utc(closes)}</time>`
    : item.phase === "resolved"
      ? "Resolved"
      : ends ? `Ends <time datetime="${ends.toISOString()}">${utc(ends)}</time>` : "";
  const odds = item.phase === "resolved"
    ? `<span class="chip-outcome ${item.resolvedOutcome === "YES" ? "yes" : "no"}">${item.resolvedOutcome ? `Resolved: ${item.resolvedOutcome}` : "Resolved"}</span>`
    : `<span class="odds"><b class="yes">YES</b> ${pctOrDash(item.yesPct)} <span class="dim">\u00b7</span> <b class="no">NO</b> ${pctOrDash(item.noPct)}</span>`;
  const action = live
    ? `<a class="btn primary" href="${betHref}">Bet</a>`
    : `<a class="btn" href="${escape(pantaUrl)}" target="_blank" rel="noopener">${item.phase === "resolved" ? "View on Panta \u2197" : "Trade on Panta \u2197"}</a>`;
  return `<article class="mcard tilt" data-phase="${escape(item.phase)}" data-category="${escape(item.category)}" data-volume="${volume}" data-closes="${escape(item.closesAt ?? "")}" data-ends="${escape(item.endsAt ?? "")}" data-created="${escape(item.createdAt ?? "")}">
  <div class="mcard-top">
    <img class="mcard-img" src="${escape(imageUrl)}" alt="" loading="lazy" width="44" height="44">
    <div class="mcard-meta"><span class="chip">${escape(item.category)}</span>${item.createdBySoothia ? '<span class="chip soothia">Made with Soothia</span>' : ""}</div>
  </div>
  <p class="question"><a href="${live ? betHref : escape(pantaUrl)}"${live ? "" : ' target="_blank" rel="noopener"'}>${escape(item.question)}</a></p>
  <div class="mcard-odds">${odds}</div>
  <div class="mcard-foot"><span class="mono dim">$${volume.toFixed(2)} traded${when ? ` \u00b7 ${when}` : ""}</span>${action}</div>
</article>`;
}

function renderMarkets(data) {
  const items = data ? data.items : [];
  const categories = data ? data.categories : [];
  const live = items.filter((i) => i.phase === "primary");
  const p2p = items.filter((i) => i.phase === "p2p");
  const resolved = items.filter((i) => i.phase === "resolved");
  const chips = ["all", ...categories].map((cat) => `<button type="button" class="filter-cat${cat === "all" ? " selected" : ""}" data-cat="${escape(cat)}" aria-pressed="${cat === "all"}">${cat === "all" ? "All" : escape(cat)}</button>`).join("");
  const description = `${live.length} live and ${p2p.length} trading prediction markets on Panta, made and found with Soothia.`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Markets \u00b7 Soothia</title>
<meta name="description" content="${escape(description)}">
<link rel="icon" type="image/png" sizes="32x32" href="/img/favicon-32.png">
<link rel="canonical" href="${SITE}/markets">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Soothia">
<meta property="og:url" content="${SITE}/markets">
<meta property="og:title" content="Markets \u00b7 Soothia">
<meta property="og:description" content="${escape(description)}">
<meta property="og:image" content="${SITE}/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@shroomsgotsol">
<meta name="twitter:title" content="Markets \u00b7 Soothia">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${SITE}/img/og-image.png">
<link rel="preload" href="/fonts/soothia-lora.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/soothia-inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css?v=${ASSET_VERSION}">
</head>
<body>
<div class="sky" id="sky" data-count="16" data-count-narrow="7" aria-hidden="true"></div>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient>
<symbol id="star" viewBox="-50 -50 100 100"><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#chrome)"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></symbol>
</defs></svg>
<header class="nav">
  <a class="lockup" href="/" aria-label="Soothia home"><span class="mark"><span class="mark-body"></span><svg class="star mark-star"><use href="#star"/></svg></span><span class="wordmark">Soothia</span></a>
  <nav class="nav-links" aria-label="Sections">
    <a href="/#how">How it works</a>
    <a href="/markets" aria-current="page">Markets</a>
    <a href="/#proof">Proof</a>
    <a href="/#install">Install</a>
  </nav>
</header>
<main id="markets" class="markets">
  <section class="mhead">
    <h1>Markets</h1>
    <p class="sub">Prediction markets on Panta, made and found with Soothia. Live ones take bets inside Soothia; the rest trade between people on Panta.</p>
    <div class="filters" role="group" aria-label="Filters">
      <div class="filter-cats">${chips}</div>
      <div class="filter-right">
        <label class="sort-label">Sort <select id="sort" class="sort"><option value="closing">Closing soon</option><option value="volume">Volume</option><option value="new">Newest</option></select></label>
        <button type="button" id="show-resolved" class="filter-cat" aria-pressed="false">Resolved</button>
      </div>
    </div>
  </section>
  <section class="msection" id="live">
    <h2>Live now <span class="mcount mono dim"></span></h2>
    <p class="line">Buying is open: bet YES or NO inside Soothia.</p>
    <div class="mgrid">${live.map(marketCard).join("")}</div>
    <div class="mempty" ${live.length ? "hidden" : ""}><p class="question">Spotted a claim worth calling? Make it a market with Soothia.</p><a class="btn primary" href="/#install">Download for Chrome</a></div>
  </section>
  <section class="msection" id="p2p">
    <h2>Trading on Panta <span class="mcount mono dim"></span></h2>
    <p class="line">Shares trade between people on Panta's order book.</p>
    <div class="mgrid">${p2p.map(marketCard).join("")}</div>
    <div class="mempty" ${p2p.length ? "hidden" : ""}><p class="line">Nothing is trading right now.</p></div>
  </section>
  <section class="msection" id="resolved" hidden>
    <h2>Resolved <span class="mcount mono dim"></span></h2>
    <div class="mgrid">${resolved.map(marketCard).join("")}</div>
    <div class="mempty" ${resolved.length ? "hidden" : ""}><p class="line">No resolved markets yet.</p></div>
  </section>
  ${data ? "" : '<p class="line">Markets could not be loaded right now. Try again in a minute.</p>'}
  <p class="foot dim">${data ? `Updated ${utc(new Date(data.updatedAt))}. ` : ""}Made with Soothia. Live on Solana mainnet.</p>
</main>
<script src="/sky.js?v=${ASSET_VERSION}"></script>
<script src="/markets.js?v=${ASSET_VERSION}"></script>
<script src="/tilt.js?v=${ASSET_VERSION}" defer></script>
</body>
</html>`;
}
