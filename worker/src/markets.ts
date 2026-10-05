// Cached list of open Panta markets, with titles and spot prices filled in
// from the single-market endpoint. Refreshed at most every five minutes.
import type { Env } from "./http";

// Trailing slashes are required on every Panta path.
export const PANTA_BASE = "https://live-api.panta.market/api/v1";

const LIST_KEY = "markets:open:v1";
const FRESH_MS = 5 * 60 * 1000;
const PAGE_LIMIT = 50;
const MAX_PAGES_PER_PHASE = 4;
// Keeps one refresh inside the Worker subrequest budget.
const MAX_DETAIL_FETCHES = 30;
// A market is tradable in these two phases (GET /markets/ `status` filter).
const OPEN_PHASES = ["primary", "secondary"] as const;

export interface OpenMarket {
  id: string;
  title: string;
  category: string;
  yesPrice: number | null;
  noPrice: number | null;
  /** ISO-8601 UTC. */
  endTime: string;
}

interface CatalogRow {
  marketId?: string;
  category?: string;
  title?: string;
  description?: string;
  phase?: string;
  endTime?: number;
  resolved?: boolean;
  yesPrice?: string | null;
  noPrice?: string | null;
}

interface StoredList {
  fetchedAt: number;
  markets: OpenMarket[];
}

async function pantaGet<T>(env: Env, path: string, query?: URLSearchParams): Promise<T | null> {
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return null;
  const qs = query?.toString();
  try {
    const response = await fetch(`${PANTA_BASE}${path}${qs ? `?${qs}` : ""}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function price(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Returns null if any list page fails, so a partial list never replaces a good one. */
async function fetchOpenRows(env: Env, nowMs: number): Promise<CatalogRow[] | null> {
  const rows = new Map<string, CatalogRow>();
  for (const phase of OPEN_PHASES) {
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES_PER_PHASE; page++) {
      const query = new URLSearchParams({ status: phase, limit: String(PAGE_LIMIT) });
      if (cursor) query.set("cursor", cursor);
      const body = await pantaGet<{ items?: CatalogRow[]; nextCursor?: string | null }>(env, "/markets/", query);
      if (!body) return null;
      for (const row of body.items ?? []) {
        // Rows in the secondary phase can already be resolved or past their end time.
        const open = row.marketId && !row.resolved && typeof row.endTime === "number" && row.endTime * 1000 > nowMs;
        if (open) rows.set(row.marketId!, row);
      }
      cursor = body.nextCursor ?? null;
      if (!cursor) break;
    }
  }
  return [...rows.values()];
}

async function refresh(env: Env, nowMs: number): Promise<OpenMarket[] | null> {
  const rows = await fetchOpenRows(env, nowMs);
  if (!rows) return null;

  // List rows have null prices and often blank titles; the detail call fills both.
  const soonest = rows.sort((a, b) => a.endTime! - b.endTime!).slice(0, MAX_DETAIL_FETCHES);
  const markets = await Promise.all(
    soonest.map(async (row): Promise<OpenMarket | null> => {
      const detail = await pantaGet<CatalogRow>(env, `/markets/${encodeURIComponent(row.marketId!)}/`);
      const title = (detail?.title || row.title || detail?.description || row.description || "").trim();
      if (!title) return null; // Nothing to match a claim against.
      return {
        id: row.marketId!,
        title,
        category: detail?.category ?? row.category ?? "other",
        yesPrice: price(detail?.yesPrice),
        noPrice: price(detail?.noPrice),
        endTime: new Date(row.endTime! * 1000).toISOString(),
      };
    }),
  );
  return markets.filter((market): market is OpenMarket => market !== null);
}

export async function getOpenMarkets(env: Env): Promise<OpenMarket[]> {
  const now = Date.now();
  const stored = (await env.SOOTHIA_CACHE.get(LIST_KEY, "json")) as StoredList | null;
  if (stored && now - stored.fetchedAt < FRESH_MS) return stored.markets;

  const markets = await refresh(env, now);
  // Panta is down or rate limiting us: an older list beats no list.
  if (!markets) return stored?.markets ?? [];

  const value: StoredList = { fetchedAt: now, markets };
  await env.SOOTHIA_CACHE.put(LIST_KEY, JSON.stringify(value), { expirationTtl: 24 * 3600 });
  return markets;
}
