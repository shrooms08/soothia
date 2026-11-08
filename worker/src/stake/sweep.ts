// Soothia staking: the cron sweep. Each pool with money in it has a KV entry
// stakepool:<poolId>, and the sweep moves it along: resolve or void after the match,
// then collect the fee once the challenge window ends. It always acts on what the
// chain says now, so a run that dies half way is finished by the next one.

import type { Env } from "../http";
import { fetchScoreboard, locateFixture, resolutionOf, type FixtureSearch, type ScoreboardFetcher } from "../recall/espn";
import { resolverKeypair } from "../recall/sui";
import { cacheGet, cachePut, kvPut } from "../store";
import { stakeSettings, tatumStakeChain, type StakeChain } from "./chain";
import { flipSubject, type Subject } from "./identity";
import { claimOpensAtMs } from "./math";
import type { StakePool } from "./readers";

export const STAKE_POOL_PREFIX = "stakepool:";
export const STAKE_LOG_KEY = "stakelog:recent";
const RESOLVER_LOCK_KEY = "stake:resolver-lock";
const LOCK_TTL_SEC = 60;
const CURSOR_KEY = "stake:sweep-cursor";
const CURSOR_TTL_SEC = 3_600;
const SWEEP_PAGE = 25;
// One run has a limited number of outbound calls, and each check or transaction uses several.
const MAX_CHECKS_PER_RUN = 5;
const MAX_TRANSACTIONS_PER_RUN = 2;
const LOG_MAX = 50;
const DAY_MS = 86_400_000;

export interface PoolIndexEntry {
  poolId: string;
  home: string;
  away: string;
  startISO: string;
  subject: Subject;
  questionHash: string;
  league?: string;
}

export interface PoolIndexMeta {
  phase: "open" | "resolved";
  /** When the sweep next has something to do: resolve time, or the end of the challenge window. */
  dueMs: number;
}

export const poolIndexKey = (poolId: string): string => `${STAKE_POOL_PREFIX}${poolId}`;

export function writePoolIndex(env: Env, entry: PoolIndexEntry, meta: PoolIndexMeta): Promise<boolean> {
  return kvPut(env, poolIndexKey(entry.poolId), JSON.stringify(entry), { metadata: meta });
}

/**
 * Keeps two resolver transactions from reusing the same gas coin and cap version.
 * Returns false when another one is running. KV can be stale across regions, so this
 * catches ordinary overlaps, not every possible race.
 */
export async function acquireResolverLock(env: Env): Promise<boolean> {
  try {
    if ((await env.SOOTHIA_CACHE.get(RESOLVER_LOCK_KEY)) !== null) return false;
  } catch {
    return false;
  }
  return kvPut(env, RESOLVER_LOCK_KEY, "1", { expirationTtl: LOCK_TTL_SEC });
}

export async function releaseResolverLock(env: Env): Promise<void> {
  await env.SOOTHIA_CACHE.delete(RESOLVER_LOCK_KEY).catch(() => undefined);
}

export type Settlement = { action: "wait" } | { action: "void"; reason: string } | { action: "resolve"; outcomeYes: boolean; evidence: string };

/** What to do with an open pool past its resolve time. YES means the subject team won. */
export function decideSettlement(subject: Subject, search: FixtureSearch, closeMs: number, nowMs: number): Settlement {
  const dayPassed = nowMs >= closeMs + DAY_MS;
  const { located } = search;
  if (!located) {
    // An empty answer from ESPN is not evidence that the match is gone.
    return dayPassed && search.eventsSeen > 0 ? { action: "void", reason: "not_found" } : { action: "wait" };
  }
  if (located.notPlayed) return dayPassed ? { action: "void", reason: "not_played" } : { action: "wait" };
  const result = resolutionOf(located.event);
  if (result.status !== "final") return { action: "wait" };
  const subjectOnEspn = located.reversed ? flipSubject(subject) : subject;
  return { action: "resolve", outcomeYes: result.winner === subjectOnEspn, evidence: result.detail };
}

export interface SweepAction {
  at: string;
  poolId: string;
  action: "resolve" | "void" | "collect_fee" | "dropped_empty" | "closed";
  digest?: string;
  detail?: string;
}

export interface StakeSweepDeps {
  chain?: StakeChain;
  fetcher?: ScoreboardFetcher;
  now?: Date;
}

const message = (error: unknown): string => String((error as Error)?.message ?? error).slice(0, 160);

/** Advances up to one page of indexed pools. */
export async function sweepStake(env: Env, deps: StakeSweepDeps = {}): Promise<{ checked: number; actions: SweepAction[] }> {
  const settings = stakeSettings(env);
  const chain = deps.chain ?? (settings && resolverKeypair(env) ? tatumStakeChain(env, settings) : null);
  if (!chain) return { checked: 0, actions: [] };
  const fetcher = deps.fetcher ?? fetchScoreboard;
  const now = deps.now ?? new Date();
  const nowMs = now.getTime();

  // Resume where the last sweep stopped, so pools still waiting on a result cannot starve the rest.
  const cursor = (await cacheGet<string>(CURSOR_KEY)) ?? undefined;
  const page = await env.SOOTHIA_CACHE.list<PoolIndexMeta>({ prefix: STAKE_POOL_PREFIX, limit: SWEEP_PAGE, cursor });
  await cachePut(CURSOR_KEY, page.list_complete ? null : page.cursor, CURSOR_TTL_SEC);

  const actions: SweepAction[] = [];
  const record = (poolId: string, action: SweepAction["action"], extra: Pick<SweepAction, "digest" | "detail"> = {}): void => {
    actions.push({ at: now.toISOString(), poolId, action, ...extra });
  };
  const drop = (poolId: string): Promise<void> => env.SOOTHIA_CACHE.delete(poolIndexKey(poolId));

  let locked = false;
  let transactions = 0;
  /** Reserves one resolver transaction, or false when this run must stop sending them. */
  const mayTransact = async (): Promise<boolean> => {
    if (transactions >= MAX_TRANSACTIONS_PER_RUN) return false;
    if (!locked) {
      locked = await acquireResolverLock(env);
      if (!locked) return false;
    }
    transactions += 1;
    return true;
  };

  async function settleResolved(entry: PoolIndexEntry, pool: StakePool): Promise<void> {
    const opens = claimOpensAtMs(pool);
    if (BigInt(nowMs) < opens) {
      await writePoolIndex(env, entry, { phase: "resolved", dueMs: Number(opens) });
      return;
    }
    if (pool.feeCollected || pool.feeAmount === 0n) {
      await drop(pool.id);
      record(pool.id, "closed");
      return;
    }
    if (!(await mayTransact())) return;
    const digest = await chain!.collectFee(pool.id);
    record(pool.id, "collect_fee", { digest, detail: `${pool.feeAmount} MIST` });
    await drop(pool.id);
  }

  async function settleOpen(entry: PoolIndexEntry, pool: StakePool): Promise<void> {
    if (pool.yes + pool.no === 0n) {
      await drop(pool.id);
      record(pool.id, "dropped_empty");
      return;
    }
    const search = await locateFixture(entry, fetcher);
    const decision = decideSettlement(entry.subject, search, Number(pool.closeMs), nowMs);
    if (decision.action === "wait" || !(await mayTransact())) return;

    if (decision.action === "void") {
      const digest = await chain!.voidPool(pool.id);
      record(pool.id, "void", { digest, detail: decision.reason });
      await drop(pool.id);
      return;
    }
    const digest = await chain!.resolvePool(pool.id, decision.outcomeYes, decision.evidence);
    record(pool.id, "resolve", { digest, detail: `${decision.outcomeYes ? "YES" : "NO"}: ${decision.evidence}` });
    const settled = await chain!.readPool(pool.id);
    if (settled.status === "resolved") await writePoolIndex(env, entry, { phase: "resolved", dueMs: Number(claimOpensAtMs(settled)) });
    // The contract voids a pool with no stake on the winning side.
    else if (settled.status === "void") await drop(pool.id);
  }

  let checked = 0;
  try {
    for (const key of page.keys) {
      if (!key.metadata || key.metadata.dueMs > nowMs) continue;
      if (checked >= MAX_CHECKS_PER_RUN) break;
      checked += 1;
      const poolId = key.name.slice(STAKE_POOL_PREFIX.length);
      try {
        const entry = await env.SOOTHIA_CACHE.get<PoolIndexEntry>(key.name, "json");
        if (!entry) continue;
        const pool = await chain.readPool(poolId);
        if (pool.status === "void") {
          await drop(poolId);
          record(poolId, "closed");
        } else if (pool.status === "resolved") {
          await settleResolved(entry, pool);
        } else if (BigInt(nowMs) >= pool.closeMs + pool.minResolveDelayMs) {
          await settleOpen(entry, pool);
        }
      } catch (error) {
        // One pool's failure must not stop the others; its entry stays for the next sweep.
        console.warn(`Soothia: stake sweep failed on ${poolId}: ${message(error)}`);
      }
    }
  } finally {
    if (locked) await releaseResolverLock(env);
  }

  if (actions.length > 0) await appendSweepLog(env, actions);
  return { checked, actions };
}

async function appendSweepLog(env: Env, actions: SweepAction[]): Promise<void> {
  const previous = await env.SOOTHIA_CACHE.get<SweepAction[]>(STAKE_LOG_KEY, "json").catch(() => null);
  await kvPut(env, STAKE_LOG_KEY, JSON.stringify([...actions.reverse(), ...(previous ?? [])].slice(0, LOG_MAX)));
}
