// Where ephemeral data lives now that KV writes are rationed (free tier:
// 1,000 puts a day for the whole account). Short-lived caches go to the
// Cache API (caches.default, per colo, synthetic request keys, max-age TTL)
// with an in-isolate memory layer in front; KV keeps only durable records,
// and every KV write goes through kvPut, which never throws, counts itself
// against a daily budget, and logs a failure once.
import type { Env } from "./http";

const CACHE_ORIGIN = "https://soothia-cache.internal/";
const memory = new Map<string, { value: unknown; expires: number }>();
const MEMORY_MAX = 500;

function edge(): Cache | null {
  try {
    return typeof caches !== "undefined" && caches.default ? caches.default : null;
  } catch {
    return null;
  }
}

const keyRequest = (key: string): Request => new Request(CACHE_ORIGIN + encodeURIComponent(key), { method: "GET" });

/** A cached JSON value, or null when missing or expired. */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = memory.get(key);
  if (local) {
    if (local.expires > Date.now()) return local.value as T;
    memory.delete(key);
  }
  const cache = edge();
  if (!cache) return null;
  try {
    const hit = await cache.match(keyRequest(key));
    if (!hit) return null;
    const value = (await hit.json()) as T;
    const ttl = Number(hit.headers.get("X-Soothia-Expires") ?? 0) - Date.now();
    if (ttl > 0) remember(key, value, ttl / 1000);
    return value;
  } catch {
    return null;
  }
}

function remember(key: string, value: unknown, ttlSec: number): void {
  if (memory.size >= MEMORY_MAX) memory.delete(memory.keys().next().value as string);
  memory.set(key, { value, expires: Date.now() + ttlSec * 1000 });
}

/** Stores a JSON value for `ttlSec` in memory and, when available, the edge cache. Never throws. */
export async function cachePut(key: string, value: unknown, ttlSec: number): Promise<void> {
  remember(key, value, ttlSec);
  const cache = edge();
  if (!cache) return;
  try {
    const response = new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${Math.max(1, Math.round(ttlSec))}`,
        "X-Soothia-Expires": String(Date.now() + ttlSec * 1000),
      },
    });
    await cache.put(keyRequest(key), response);
  } catch {
    // The memory copy still serves this isolate.
  }
}

/** For tests. */
export function clearMemoryCache(): void {
  memory.clear();
}

// ---- KV budget ----

interface Budget {
  day: string;
  puts: number;
  failures: number;
  lastError: string | null;
  lastKey: string | null;
  byPrefix: Record<string, number>;
}

const today = (): string => new Date().toISOString().slice(0, 10);
let budget: Budget = { day: today(), puts: 0, failures: 0, lastError: null, lastKey: null, byPrefix: {} };
let loggedFailure = false;

function roll(): Budget {
  if (budget.day !== today())
    budget = { day: today(), puts: 0, failures: 0, lastError: null, lastKey: null, byPrefix: {} };
  return budget;
}

function note(key: string): void {
  const current = roll();
  current.puts++;
  const prefix = key.split(":")[0];
  current.byPrefix[prefix] = (current.byPrefix[prefix] ?? 0) + 1;
}

/**
 * A KV write that never throws. Returns false on any failure (a 429 once the
 * daily limit is hit, a network error) so the caller can carry on without it.
 */
export async function kvPut(env: Env, key: string, value: string, options?: KVNamespacePutOptions): Promise<boolean> {
  note(key);
  try {
    await env.SOOTHIA_CACHE.put(key, value, options);
    return true;
  } catch (error) {
    const current = roll();
    current.failures++;
    current.lastError = String((error as Error)?.message ?? error).slice(0, 160);
    current.lastKey = key.slice(0, 60);
    if (!loggedFailure) {
      loggedFailure = true;
      console.warn(`Soothia: KV write failed (${current.lastError}); continuing without it.`);
    }
    return false;
  }
}

/** The budget as seen by this isolate (other isolates keep their own count), merged with the edge cache's running total. */
export async function kvBudgetReport(): Promise<Record<string, unknown>> {
  const current = roll();
  // Fold this isolate's count into a per-day edge-cache tally so the number survives isolate churn.
  const key = `kvbudget:${current.day}`;
  const stored = (await cacheGet<{ puts: number; failures: number; isolates: number }>(key)) ?? {
    puts: 0,
    failures: 0,
    isolates: 0,
  };
  return {
    day: current.day,
    thisIsolate: { puts: current.puts, failures: current.failures, byPrefix: current.byPrefix },
    lastError: current.lastError,
    lastKey: current.lastKey,
    edgeTally: stored,
    limitPerDay: 1000,
    note: "Counts are best-effort: each isolate counts its own writes; the edge tally sums isolates that reported to this colo.",
  };
}

/** True when this isolate has counted writes since it last reported. */
export function budgetDirty(): boolean {
  const current = roll();
  return current.puts + current.failures > 0;
}

/** Called after a batch of writes to fold this isolate's count into the edge tally. */
export async function reportBudgetToEdge(): Promise<void> {
  const current = roll();
  const key = `kvbudget:${current.day}`;
  const stored = (await cacheGet<{ puts: number; failures: number; isolates: number }>(key)) ?? {
    puts: 0,
    failures: 0,
    isolates: 0,
  };
  await cachePut(
    key,
    { puts: stored.puts + current.puts, failures: stored.failures + current.failures, isolates: stored.isolates + 1 },
    36 * 3600,
  );
  budget = { ...current, puts: 0, failures: 0 };
}
