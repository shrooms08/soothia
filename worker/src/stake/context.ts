// Soothia staking: what the user routes and the admin routes share.

import type { Env } from "../http";
import type { ScoreboardFetcher } from "../recall/espn";
import type { RecallStore } from "../recall/memory";
import { resolverKeypair } from "../recall/sui";
import { kvPut } from "../store";
import type { StakeChain, StakeSettings } from "./chain";
import { acquireResolverLock } from "./sweep";

export const POOL_CREATE_DAILY_CAP = 30;
const POOL_CAP_TTL_SEC = 2 * 86_400;
/** 0.05 SUI: pool creation stops here, so the rest still pays to resolve existing pools. */
export const RESOLVER_MIN_BALANCE_MIST = 50_000_000n;

const ADDRESS = /^0x[0-9a-f]{64}$/i;

export interface Context {
  request: Request;
  env: Env;
  chain: StakeChain;
  settings: StakeSettings;
  fetcher: ScoreboardFetcher;
  nowMs: number;
  store: (userKey: string) => RecallStore;
}

export class StakeRefusal extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export const refuse = (status: number, code: string, extra: Record<string, unknown> = {}): never => {
  throw new StakeRefusal(status, code, extra);
};

export function parseAddress(value: unknown, code: string): string {
  if (typeof value !== "string" || !ADDRESS.test(value)) refuse(400, code);
  return (value as string).toLowerCase();
}

export function abortCodeOf(error: unknown): string | null {
  return /abort code: (\d+)/i.exec(String((error as Error)?.message ?? error))?.[1] ?? null;
}

/** Uses up one of today's pool creations. Refuses when KV cannot say it is safe. */
async function reservePoolCreation(env: Env, nowMs: number): Promise<void> {
  const key = `stakecap:${new Date(nowMs).toISOString().slice(0, 10)}:pools`;
  let used: number;
  try {
    used = Number(await env.SOOTHIA_CACHE.get(key)) || 0;
  } catch {
    return refuse(503, "kv_unavailable");
  }
  if (used >= POOL_CREATE_DAILY_CAP) refuse(429, "pool_cap_reached");
  if (!(await kvPut(env, key, String(used + 1), { expirationTtl: POOL_CAP_TTL_SEC }))) refuse(503, "kv_unavailable");
}

/** Everything that must hold before RESOLVER_KEY pays for a pool. Leaves the lock held. */
export async function clearPoolCreation(context: Context): Promise<void> {
  const resolver = resolverKeypair(context.env);
  if (!resolver) return refuse(503, "resolver_not_configured");
  if ((await context.chain.balanceOf(resolver.toSuiAddress())) < RESOLVER_MIN_BALANCE_MIST) refuse(503, "resolver_low_balance");
  await reservePoolCreation(context.env, context.nowMs);
  if (!(await acquireResolverLock(context.env))) refuse(503, "resolver_busy");
}
