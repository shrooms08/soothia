// Per-IP request limits for the routes that cost money upstream (Claude, Panta
// quotes, RPC sends). Install ids are self-declared, so they cannot be the only
// cap. Counters live in the edge cache and memory (store.ts), never in KV: a
// determined caller can exceed a limit across colos, which is fine; this stops
// accidental loops and casual abuse, not a distributed attack.
import { sha256Hex } from "./http";
import { cacheGet, cachePut } from "./store";

export interface Limit {
  /** Requests allowed per window from one IP. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

/** One minute windows; generous for a person, tight for a loop. */
export const LIMITS = {
  detect: { limit: 60, windowSec: 60 },
  match: { limit: 60, windowSec: 60 },
  actionBuild: { limit: 30, windowSec: 60 },
  txSend: { limit: 30, windowSec: 60 },
  quote: { limit: 120, windowSec: 60 },
} satisfies Record<string, Limit>;

export function clientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Real-IP") ?? "unknown";
}

/**
 * Counts one request from this IP against `route`. Returns null when allowed, or
 * the number of seconds until the window resets when the limit is exceeded.
 */
export async function rateLimited(
  request: Request,
  route: string,
  limit: Limit,
  nowMs = Date.now(),
): Promise<number | null> {
  const windowMs = limit.windowSec * 1000;
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;
  // Hash the address so cache keys never carry a raw IP.
  const who = (await sha256Hex(`${route}|${clientIp(request)}`)).slice(0, 24);
  const key = `rl:${route}:${windowStart}:${who}`;
  const used = (await cacheGet<number>(key)) ?? 0;
  if (used >= limit.limit) return Math.max(1, Math.ceil((windowStart + windowMs - nowMs) / 1000));
  await cachePut(key, used + 1, limit.windowSec + 5);
  return null;
}
