// The normalized Panta catalog behind GET /markets and the matcher: every
// primary and secondary row, phases named the way the site shows them
// (primary, p2p, resolved), blank titles filled from the market detail,
// one-decimal odds, volumes, closing times, and whether Soothia created it.
// The list is cached for 60 s; details are refreshed at most every 10 minutes
// per market (24 h once resolved), paced 400 ms apart, mostly by the cron.
import { resolvedOutcomeOf } from "./buy";
import type { CreatedMarket } from "./create";
import type { Env } from "./http";
import { PANTA_BASE, pantaGet, price } from "./markets";
import { MARKET_PAGE_BASE } from "./pantaRules";
import { publicCors } from "./stats";

export type Phase = "primary" | "p2p" | "resolved";

export interface CatalogItem {
  id: string;
  question: string;
  category: string;
  imageUrl: string;
  yesPct: number | null;
  noPct: number | null;
  volumeUsdc: number;
  phase: Phase;
  /** Buying window end, ISO (primary markets only). */
  closesAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  resolvedOutcome: "YES" | "NO" | null;
  createdBySoothia: boolean;
  pantaUrl: string;
  soothiaUrl: string;
}

export interface CatalogRow {
  marketId?: string;
  category?: string;
  title?: string;
  description?: string;
  images?: string[];
  phase?: string;
  status?: string;
  resolved?: boolean;
  startTime?: number;
  endTime?: number;
  yesPrice?: string | null;
  noPrice?: string | null;
  priceSource?: string;
  volumeUsdc?: string;
  totalVolumeUsdc?: string;
}

/** What we keep from a market detail call. */
export interface DetailCache {
  title: string;
  yesPrice: number | null;
  noPrice: number | null;
  primaryPhaseEnd: string | null;
  resolvedOutcome: "YES" | "NO" | null;
  createdAt: string | null;
  resolved: boolean;
  /** Total USDC traded per the detail (list rows of primary markets report 0). */
  volumeUsdc?: number;
  fetchedAt: number;
}

interface DetailRow extends CatalogRow {
  question?: string;
  primaryPhaseEndTime?: number;
  createdAt?: number;
}

const CATALOG_KEY = "catalog:v1";
const CATALOG_TTL_MS = 60_000;
const DETAIL_TTL_SEC = 600;
const DETAIL_TTL_RESOLVED_SEC = 24 * 3600;
const PAGE_LIMIT = 50;
const MAX_PAGES = 10;
const PACE_MS = 400;
const DETAILS_PER_REQUEST = 8;
const DETAILS_PER_SWEEP = 40;
const SITE_URL = "https://soothia.heylana.workers.dev";
const CATEGORY_IMAGES = new Set(["crypto", "entertainment", "finance", "other", "politics", "science", "sports", "world"]);

const round1 = (value: number): number => Math.round(value * 10) / 10;
const iso = (seconds: number | undefined): string | null => (typeof seconds === "number" && seconds > 0 ? new Date(seconds * 1000).toISOString() : null);

export function phaseOf(row: CatalogRow): Phase {
  if (row.resolved === true || row.phase === "resolved" || row.status === "resolved" || row.priceSource === "resolved_outcome") return "resolved";
  return row.phase === "primary" ? "primary" : "p2p";
}

/** One catalog item from a list row and its cached detail; null when no question is known. */
export function normalizeRow(row: CatalogRow, detail: DetailCache | null, soothiaIds: Set<string>, imageOrigin: string): CatalogItem | null {
  if (!row.marketId) return null;
  const question = (row.title || detail?.title || row.description || "").trim();
  if (!question) return null;
  const phase = phaseOf(row);
  const yes = price(row.yesPrice) ?? detail?.yesPrice ?? null;
  const no = price(row.noPrice) ?? detail?.noPrice ?? null;
  const category = row.category || "other";
  const image = (row.images ?? []).find((url) => /^https:\/\//.test(url));
  return {
    id: row.marketId,
    question,
    category,
    imageUrl: image ?? `${imageOrigin}/img/${CATEGORY_IMAGES.has(category) ? category : "other"}.png`,
    yesPct: phase === "resolved" ? null : yes === null ? null : round1(yes * 100),
    noPct: phase === "resolved" ? null : no === null ? null : round1(no * 100),
    volumeUsdc: Math.round(Math.max(price(row.totalVolumeUsdc ?? row.volumeUsdc) ?? 0, detail?.volumeUsdc ?? 0) * 100) / 100,
    phase,
    closesAt: phase === "primary" ? (detail?.primaryPhaseEnd ?? null) : null,
    endsAt: iso(row.endTime),
    createdAt: detail?.createdAt ?? iso(row.startTime),
    resolvedOutcome: phase === "resolved" ? (resolvedOutcomeOf(row) ?? detail?.resolvedOutcome ?? null) : null,
    createdBySoothia: soothiaIds.has(row.marketId),
    pantaUrl: MARKET_PAGE_BASE + row.marketId,
    soothiaUrl: `${SITE_URL}/m/${row.marketId}`,
  };
}

export type SortKey = "closing" | "volume" | "new";

export function filterSort(items: CatalogItem[], query: { status?: string | null; category?: string | null; sort?: string | null }): CatalogItem[] {
  const status = query.status ?? "live";
  let out = items.filter((item) =>
    status === "all" ? true : status === "live" ? item.phase === "primary" : status === "p2p" ? item.phase === "p2p" : status === "resolved" ? item.phase === "resolved" : true,
  );
  if (query.category && query.category !== "all") out = out.filter((item) => item.category === query.category);
  const sort: SortKey = query.sort === "volume" ? "volume" : query.sort === "new" ? "new" : "closing";
  const time = (value: string | null): number => (value ? Date.parse(value) : Number.MAX_SAFE_INTEGER);
  out.sort((a, b) => {
    if (sort === "volume") return b.volumeUsdc - a.volumeUsdc;
    if (sort === "new") return (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);
    return time(a.closesAt ?? a.endsAt) - time(b.closesAt ?? b.endsAt);
  });
  return out;
}

// ---- Fetching ----

let lastPantaCall = 0;
async function paced<T>(work: () => Promise<T>): Promise<T> {
  const wait = PACE_MS - (Date.now() - lastPantaCall);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastPantaCall = Date.now();
  return work();
}

async function listRows(env: Env, status: "primary" | "secondary"): Promise<CatalogRow[] | null> {
  const rows: CatalogRow[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const query = new URLSearchParams({ status, limit: String(PAGE_LIMIT) });
    if (cursor) query.set("cursor", cursor);
    let body = await paced(() => pantaGet<{ items?: CatalogRow[]; nextCursor?: string | null }>(env, "/markets/", query));
    if (!body) body = await paced(() => pantaGet<{ items?: CatalogRow[]; nextCursor?: string | null }>(env, "/markets/", query));
    if (!body) return null;
    rows.push(...(body.items ?? []));
    cursor = body.nextCursor ?? null;
    if (!cursor) break;
  }
  return rows;
}

const detailKey = (id: string): string => `detail:${id}`;

export async function cachedDetail(env: Env, id: string): Promise<DetailCache | null> {
  return (await env.SOOTHIA_CACHE.get(detailKey(id), "json")) as DetailCache | null;
}

/** Fetches one market detail into the cache; returns it, or null when Panta did not answer. */
export async function refreshDetail(env: Env, id: string): Promise<DetailCache | null> {
  const row = await paced(() => pantaGet<DetailRow>(env, `/markets/${encodeURIComponent(id)}/`));
  if (!row) return null;
  const resolved = phaseOf(row) === "resolved";
  const detail: DetailCache = {
    title: (row.title || row.question || row.description || "").trim(),
    yesPrice: price(row.yesPrice),
    noPrice: price(row.noPrice),
    primaryPhaseEnd: iso(row.primaryPhaseEndTime),
    resolvedOutcome: resolvedOutcomeOf(row),
    createdAt: iso(row.createdAt) ?? iso(row.startTime),
    resolved,
    volumeUsdc: price(row.totalVolumeUsdc ?? row.volumeUsdc) ?? undefined,
    fetchedAt: Date.now(),
  };
  await env.SOOTHIA_CACHE.put(detailKey(id), JSON.stringify(detail), { expirationTtl: resolved ? DETAIL_TTL_RESOLVED_SEC : DETAIL_TTL_SEC });
  return detail;
}

async function soothiaMarketIds(env: Env): Promise<Set<string>> {
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
  return ids;
}

interface StoredCatalog {
  fetchedAt: number;
  items: CatalogItem[];
  /** Markets whose title is still unknown; the sweep fetches their details. */
  pending: string[];
}

/** Which rows need a detail call: primary ones (closing time), blank titles, and stale caches. */
function wantsDetail(row: CatalogRow, detail: DetailCache | null): boolean {
  if (!row.marketId) return false;
  const phase = phaseOf(row);
  // List rows often lack prices (Panta's RPC), volume for primary markets, and the
  // outcome of resolved ones; the detail has them.
  if (!detail) return !row.title || phase === "primary" || row.yesPrice == null || (phase === "resolved" && resolvedOutcomeOf(row) === null);
  if (detail.resolved) return false;
  return Date.now() - detail.fetchedAt > DETAIL_TTL_SEC * 1000;
}

async function build(env: Env, imageOrigin: string, detailBudget: number): Promise<StoredCatalog | null> {
  const [primary, secondary] = await Promise.all([listRows(env, "primary"), listRows(env, "secondary")]);
  if (!primary || !secondary) return null;
  const rows = [...primary, ...secondary].filter((row) => row.marketId);
  const soothia = await soothiaMarketIds(env);
  const details = new Map<string, DetailCache | null>();
  for (const row of rows) details.set(row.marketId!, await cachedDetail(env, row.marketId!));
  // Primary markets first (their closing time matters), then blank titles.
  const wanted = rows.filter((row) => wantsDetail(row, details.get(row.marketId!) ?? null)).sort((a, b) => Number(b.phase === "primary") - Number(a.phase === "primary"));
  for (const row of wanted.slice(0, detailBudget)) {
    const fresh = await refreshDetail(env, row.marketId!);
    if (fresh) details.set(row.marketId!, fresh);
  }
  const items: CatalogItem[] = [];
  const pending: string[] = [];
  for (const row of rows) {
    const item = normalizeRow(row, details.get(row.marketId!) ?? null, soothia, imageOrigin);
    if (item) items.push(item);
    else pending.push(row.marketId!);
  }
  return { fetchedAt: Date.now(), items, pending };
}

async function rebuild(env: Env, imageOrigin: string, budget: number): Promise<CatalogItem[] | null> {
  const built = await build(env, imageOrigin, budget);
  if (built) await env.SOOTHIA_CACHE.put(CATALOG_KEY, JSON.stringify(built), { expirationTtl: 24 * 3600 });
  return built?.items ?? null;
}

/**
 * The catalog, fresh within 60 s. A stale copy is served at once and refreshed
 * in the background (`ctx`), so the page never waits on Panta's pacing; only
 * an empty cache builds in the request.
 */
export async function getCatalog(env: Env, imageOrigin: string, ctx?: ExecutionContext): Promise<CatalogItem[]> {
  const stored = (await env.SOOTHIA_CACHE.get(CATALOG_KEY, "json")) as StoredCatalog | null;
  if (stored && Date.now() - stored.fetchedAt < CATALOG_TTL_MS) return stored.items;
  if (stored && ctx) {
    ctx.waitUntil(rebuild(env, imageOrigin, DETAILS_PER_REQUEST).catch(() => {}));
    return stored.items;
  }
  return (await rebuild(env, imageOrigin, DETAILS_PER_REQUEST)) ?? stored?.items ?? [];
}

/** Cron: refresh the catalog with a larger detail budget, so blank titles fill in over time. */
export async function warmCatalog(env: Env): Promise<void> {
  const built = await build(env, "https://soothia-proxy.heylana.workers.dev", DETAILS_PER_SWEEP);
  if (built) await env.SOOTHIA_CACHE.put(CATALOG_KEY, JSON.stringify(built), { expirationTtl: 24 * 3600 });
}

// ---- GET /markets ----

export async function handleMarkets(request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const items = await getCatalog(env, url.origin, ctx);
  const selected = filterSort(items, { status: url.searchParams.get("status"), category: url.searchParams.get("category"), sort: url.searchParams.get("sort") });
  const body = {
    status: url.searchParams.get("status") ?? "live",
    count: selected.length,
    categories: [...new Set(items.filter((item) => item.phase !== "resolved").map((item) => item.category))].sort(),
    counts: { live: items.filter((i) => i.phase === "primary").length, p2p: items.filter((i) => i.phase === "p2p").length, resolved: items.filter((i) => i.phase === "resolved").length },
    items: selected,
    updatedAt: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", ...publicCors(request) },
  });
}

export const PANTA_LIST_BASE = PANTA_BASE;
