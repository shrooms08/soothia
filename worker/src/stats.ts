// GET /stats: public Total Recall numbers for the landing page. They come from a
// KV snapshot kept up to date by /recall/pick and the cron sweep, so a request
// never touches Walrus. KV has no atomic increment, so the running totals can lag
// or miss a beat between sweeps; the sweep recounts them from per-user entries.

import { corsHeaders, type Env } from "./http";
import type { PickRecord } from "./recall/records";
import { cacheGet, cachePut, kvPut } from "./store";

const SNAPSHOT_KEY = "recallstats:v1";
const USER_PREFIX = "rstat:";
const CACHE_KEY = "stats:v2";
const CACHE_TTL_SEC = 60;
const LIST_PAGE = 1000;
const MAX_LIST_PAGES = 50;

export interface RecallStats {
  totalCalls: number;
  /** Calls on a match, committed on Sui before kickoff. */
  provenCalls: number;
  publicProfiles: number;
  users: number;
  updatedAt: string;
}

export interface UserCounts {
  calls: number;
  proven: number;
}

const EMPTY: Omit<RecallStats, "updatedAt"> = { totalCalls: 0, provenCalls: 0, publicProfiles: 0, users: 0 };

/**
 * One user's totals. A commit counts as proven when it is on a match: every path
 * that commits (lock.ts, commit-existing.ts, /recall/pick) refuses after kickoff.
 */
export function countPicks(picks: PickRecord[]): UserCounts {
  return { calls: picks.length, proven: picks.filter((pick) => pick.commit && pick.fixture).length };
}

async function readSnapshot(env: Env): Promise<Omit<RecallStats, "updatedAt">> {
  const stored = (await env.SOOTHIA_CACHE.get(SNAPSHOT_KEY, "json")) as Partial<RecallStats> | null;
  return { ...EMPTY, ...stored };
}

async function writeSnapshot(env: Env, snapshot: Omit<RecallStats, "updatedAt">): Promise<void> {
  await kvPut(env, SNAPSHOT_KEY, JSON.stringify({ ...snapshot, updatedAt: new Date().toISOString() }));
}

function writeUser(env: Env, userKey: string, counts: UserCounts): Promise<boolean> {
  return kvPut(env, `${USER_PREFIX}${userKey}`, JSON.stringify(counts), { metadata: counts });
}

/** Counts one new call. Never throws: a stats problem must not fail the call. */
export async function recordNewCall(env: Env, userKey: string, proven: boolean): Promise<void> {
  try {
    const stored = (await env.SOOTHIA_CACHE.get(`${USER_PREFIX}${userKey}`, "json")) as UserCounts | null;
    const delta = proven ? 1 : 0;
    await writeUser(env, userKey, { calls: (stored?.calls ?? 0) + 1, proven: (stored?.proven ?? 0) + delta });
    const snapshot = await readSnapshot(env);
    await writeSnapshot(env, {
      ...snapshot,
      totalCalls: snapshot.totalCalls + 1,
      provenCalls: snapshot.provenCalls + delta,
      users: snapshot.users + (stored ? 0 : 1),
    });
  } catch {
    // The next sweep recounts.
  }
}

/** Replaces one user's totals with an exact count, from picks the sweep already read. */
export async function refreshUserCounts(env: Env, userKey: string, counts: UserCounts): Promise<void> {
  const stored = (await env.SOOTHIA_CACHE.get(`${USER_PREFIX}${userKey}`, "json")) as UserCounts | null;
  if (stored?.calls === counts.calls && stored.proven === counts.proven) return;
  await writeUser(env, userKey, counts);
}

/** Rebuilds the snapshot from the per-user entries. Reads KV only. */
export async function rebuildStats(env: Env): Promise<void> {
  const totals = { ...EMPTY };
  let cursor: string | undefined;
  for (let page = 0; page < MAX_LIST_PAGES; page++) {
    const listed = await env.SOOTHIA_CACHE.list<UserCounts>({ prefix: USER_PREFIX, limit: LIST_PAGE, cursor });
    for (const key of listed.keys) {
      totals.users += 1;
      totals.totalCalls += key.metadata?.calls ?? 0;
      totals.provenCalls += key.metadata?.proven ?? 0;
    }
    if (listed.list_complete) break;
    cursor = listed.cursor;
  }
  await writeSnapshot(env, totals);
}

const SITE_ORIGINS = ["https://soothia.fun", "https://www.soothia.fun", "https://soothia.heylana.workers.dev"];

function publicCors(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin") ?? "";
  const allowed = SITE_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  return allowed ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : corsHeaders(request);
}

export async function handleStats(request: Request, env: Env): Promise<Response> {
  const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=60", ...publicCors(request) };
  const cached = await cacheGet<RecallStats>(CACHE_KEY);
  if (cached) return new Response(JSON.stringify(cached), { headers });
  let stored: Partial<RecallStats> | null;
  try {
    stored = (await env.SOOTHIA_CACHE.get(SNAPSHOT_KEY, "json")) as Partial<RecallStats> | null;
  } catch {
    return new Response(JSON.stringify({ error: "stats_unavailable" }), { status: 503, headers });
  }
  const stats: RecallStats = { ...EMPTY, updatedAt: new Date().toISOString(), ...stored, publicProfiles: 0 };
  await cachePut(CACHE_KEY, stats, CACHE_TTL_SEC);
  return new Response(JSON.stringify(stats), { headers });
}
