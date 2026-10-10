// GET /stats: public traction numbers for the landing page. Markets created
// through Soothia come from the creator:<wallet> records in KV; bets, volume
// and wallets come from Panta's attributed trades for our API key. Cached
// for a minute. Nothing is estimated or padded.
import type { CreatedMarket } from "./create";
import { corsHeaders, type Env } from "./http";
import { PANTA_BASE } from "./markets";
import { reconcileDeps, reconcileOrders } from "./reconcile";
import { cacheGet, cachePut } from "./store";

const CACHE_KEY = "stats:v1";
const LAST_GOOD_KEY = "stats:last-good";
let lastGoodStats: Stats | null = null;
const CACHE_TTL_SEC = 60;
const PAGE_LIMIT = 200;
const MAX_PAGES = 10;

export interface Stats {
  marketsCreated: number;
  betsPlaced: number;
  volumeUsdc: number;
  uniqueWallets: number;
  updatedAt: string;
}

interface TradeRow {
  wallet?: string;
  kind?: string;
  status?: string;
  amountUsdcBase?: string | number;
}

interface TradesPage {
  summary?: { total?: number };
  items?: TradeRow[];
}

/** Attributed buys: count, volume and distinct wallets. `fetchPage` is injectable for tests. */
export async function aggregateTrades(fetchPage: (offset: number) => Promise<TradesPage | null>): Promise<Pick<Stats, "betsPlaced" | "volumeUsdc" | "uniqueWallets"> & { complete: boolean }> {
  let betsPlaced = 0;
  let volumeBase = 0;
  let complete = true;
  const wallets = new Set<string>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await fetchPage(page * PAGE_LIMIT);
    // A failed page means the numbers are not the truth; the caller keeps the last good ones.
    if (!body) { complete = false; break; }
    const items = body.items ?? [];
    for (const row of items) {
      // Only confirmed buys count as bets; claims are payouts, not bets.
      if (row.kind !== "buy" || row.status !== "processed") continue;
      betsPlaced++;
      volumeBase += Number(row.amountUsdcBase ?? 0);
      if (row.wallet) wallets.add(row.wallet);
    }
    if (items.length < PAGE_LIMIT) break;
  }
  return { betsPlaced, volumeUsdc: Math.round(volumeBase / 10_000) / 100, uniqueWallets: wallets.size, complete };
}

/** Registered markets across every creator:<wallet> record. */
export async function countMarkets(env: Env): Promise<number> {
  const ids = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await env.SOOTHIA_CACHE.list({ prefix: "creator:", cursor });
    for (const key of page.keys) {
      const markets = ((await env.SOOTHIA_CACHE.get(key.name, "json")) as CreatedMarket[] | null) ?? [];
      for (const market of markets) if (market.registered) ids.add(market.marketId);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return ids.size;
}

async function pantaTrades(env: Env, offset: number): Promise<TradesPage | null> {
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const response = await fetch(`${PANTA_BASE}/account/trades/?limit=${PAGE_LIMIT}&kind=buy&offset=${offset}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? ((await response.json()) as TradesPage) : null;
  } catch {
    return null;
  }
}

const SITE_ORIGINS = ["https://soothia.fun", "https://www.soothia.fun", "https://soothia.heylana.workers.dev"];

export function publicCors(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = SITE_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : corsHeaders(request);
}

export async function handleStats(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", ...publicCors(request) };
  const cached = await cacheGet<Stats>(CACHE_KEY);
  if (cached) return new Response(JSON.stringify(cached), { headers });
  // A refresh is a good moment to finish any bet the client never called back about.
  ctx?.waitUntil(reconcileOrders(reconcileDeps(env)).catch(() => {}));

  const { complete, ...trades } = await aggregateTrades((offset) => pantaTrades(env, offset));
  if (!complete) {
    // Panta did not answer: serve the last good numbers rather than zeros, and do not cache zeros.
    const last = lastGoodStats ?? (await cacheGet<Stats>(LAST_GOOD_KEY));
    if (last) return new Response(JSON.stringify(last), { headers });
    return new Response(JSON.stringify({ error: "upstream_unavailable" }), { status: 503, headers });
  }
  const stats: Stats = {
    marketsCreated: await countMarkets(env),
    ...trades,
    updatedAt: new Date().toISOString(),
  };
  lastGoodStats = stats;
  await cachePut(CACHE_KEY, stats, CACHE_TTL_SEC);
  await cachePut(LAST_GOOD_KEY, stats, 24 * 3600);
  return new Response(JSON.stringify(stats), { headers });
}
