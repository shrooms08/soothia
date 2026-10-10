// Panta primary-buy quotes with a policy that hides Panta's hiccups: quotes
// that arrive close together get INVALID_MARKET_PARAMS or a transient
// "unexpected ... failure". So: display quotes (the stand-in wallet) are
// cached for 15 s per market+side+amount, identical in-flight requests share
// one upstream call, outgoing calls for the same market are spaced 400 ms
// apart, and transient failures are retried three times with backoff.
import { pantaPost, sleep as realSleep, type PantaError } from "./create";
import type { Env } from "./http";

export const DISPLAY_WALLET = "11111111111111111111111111111111";
const CACHE_TTL_MS = 15_000;
const SPACING_MS = 400;
export const RETRY_WAITS_MS = [600, 1200, 2400];

export interface QuoteRequest {
  wallet: string;
  marketId: string;
  side: "yes" | "no";
  amountUsdc: string;
}

export interface PantaQuote {
  quoteId: string;
  shares?: string;
  avgPrice?: string;
  feeUsdc?: string;
  amountUsdc?: string;
  expiresAt: string;
}

export type QuoteResult = { ok: true; data: PantaQuote } | { ok: false; status: number; error: PantaError };

export interface QuoteDeps {
  call(request: QuoteRequest): Promise<QuoteResult>;
  sleep(ms: number): Promise<void>;
  now(): number;
  /** Shared cache for display quotes (KV in production). */
  cacheGet(key: string): Promise<{ data: PantaQuote; at: number } | null>;
  cachePut(key: string, value: { data: PantaQuote; at: number }): Promise<void>;
}

export function isTransient(failure: { status: number; error: PantaError }): boolean {
  const code = (failure.error.code ?? "").toUpperCase();
  if (code === "INVALID_MARKET_PARAMS" || code === "UPSTREAM_UNAVAILABLE" || code === "RATE_LIMITED") return true;
  if (/unexpected .* failure/i.test(failure.error.message ?? "")) return true;
  return failure.status === 429 || failure.status >= 500;
}

const keyOf = (request: QuoteRequest): string => `quote:${request.marketId}:${request.side}:${request.amountUsdc}`;

// Per-isolate state: in-flight coalescing and the per-market spacing clock.
const inFlight = new Map<string, Promise<QuoteResult>>();
const lastCallAt = new Map<string, number>();
const memory = new Map<string, { data: PantaQuote; at: number }>();

/** Waits until this market's previous outgoing quote call is at least SPACING_MS old. */
async function spaced<T>(deps: QuoteDeps, marketId: string, work: () => Promise<T>): Promise<T> {
  const wait = SPACING_MS - (deps.now() - (lastCallAt.get(marketId) ?? 0));
  if (wait > 0) await deps.sleep(wait);
  lastCallAt.set(marketId, deps.now());
  return work();
}

/** One quote call with spacing and retries on transient failures. */
export async function quoteWithRetry(deps: QuoteDeps, request: QuoteRequest): Promise<QuoteResult> {
  let result = await spaced(deps, request.marketId, () => deps.call(request));
  for (const waitMs of RETRY_WAITS_MS) {
    if (result.ok || !isTransient(result)) break;
    await deps.sleep(waitMs);
    result = await spaced(deps, request.marketId, () => deps.call(request));
  }
  return result;
}

/**
 * A display quote: served from the 15 s cache when fresh, otherwise one
 * upstream call shared by every identical request in flight.
 */
export async function displayQuote(deps: QuoteDeps, request: Omit<QuoteRequest, "wallet">): Promise<QuoteResult> {
  const full: QuoteRequest = { ...request, wallet: DISPLAY_WALLET };
  const key = keyOf(full);
  const now = deps.now();
  const local = memory.get(key);
  if (local && now - local.at < CACHE_TTL_MS) return { ok: true, data: local.data };
  const shared = await deps.cacheGet(key);
  if (shared && now - shared.at < CACHE_TTL_MS) {
    memory.set(key, shared);
    return { ok: true, data: shared.data };
  }
  const pending = inFlight.get(key);
  if (pending) return pending;
  const work = quoteWithRetry(deps, full)
    .then(async (result) => {
      if (result.ok) {
        const entry = { data: result.data, at: deps.now() };
        memory.set(key, entry);
        await deps.cachePut(key, entry).catch(() => {});
      }
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, work);
  return work;
}

/** For tests: forget per-isolate state. */
export function resetQuoteState(): void {
  inFlight.clear();
  lastCallAt.clear();
  memory.clear();
}

export function quoteDeps(env: Env): QuoteDeps {
  return {
    call: (request) => pantaPost<PantaQuote>(env, "/primaryorderquote/", request),
    sleep: realSleep,
    now: () => Date.now(),
    cacheGet: async (key) => (await env.SOOTHIA_CACHE.get(key, "json")) as { data: PantaQuote; at: number } | null,
    cachePut: (key, value) => env.SOOTHIA_CACHE.put(key, JSON.stringify(value), { expirationTtl: 60 }),
  };
}
