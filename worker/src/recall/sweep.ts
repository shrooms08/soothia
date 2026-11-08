// Total Recall: the cron sweep. Each open pick has a KV entry rp:<pickId> whose
// metadata names its user, so one list call finds who has picks to settle.

import type { Env } from "../http";
import { cacheGet, cachePut } from "../store";
import { memwalBackend, memwalConfigured, RecallStore } from "./memory";
import { resolveUser } from "./resolve";

export const SWEEP_PREFIX = "rp:";
const SWEEP_PAGE = 25;
const SWEEP_MAX_OUTCOMES = 10;
const CURSOR_KEY = "recall:sweep-cursor";
const CURSOR_TTL_SEC = 3_600;

export interface SweepKey {
  name: string;
  metadata?: unknown;
}

/** Pick ids by user. Keys without a user are ignored. */
export function groupSweepKeys(keys: SweepKey[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const userKey = (key.metadata as { userKey?: unknown } | undefined)?.userKey;
    if (typeof userKey !== "string" || !userKey || !key.name.startsWith(SWEEP_PREFIX)) continue;
    groups.set(userKey, [...(groups.get(userKey) ?? []), key.name.slice(SWEEP_PREFIX.length)]);
  }
  return groups;
}

export type ResolveForUser = (userKey: string) => Promise<string[]>;

async function defaultResolve(env: Env, userKey: string): Promise<string[]> {
  const store = new RecallStore(memwalBackend(env), userKey, false);
  return (await resolveUser(store, new Date(), env, { maxOutcomes: SWEEP_MAX_OUTCOMES })).closedIds;
}

/** Settles one page of open picks, then removes the entries that now have outcomes. */
export async function sweepRecall(env: Env, resolveFor?: ResolveForUser): Promise<{ users: number; closed: number }> {
  if (!resolveFor && !memwalConfigured(env)) return { users: 0, closed: 0 };
  const resolve = resolveFor ?? ((userKey: string) => defaultResolve(env, userKey));

  // Resume where the last sweep stopped, so a long list of open picks cannot starve the end of it.
  const cursor = (await cacheGet<string>(CURSOR_KEY)) ?? undefined;
  const page = await env.SOOTHIA_CACHE.list({ prefix: SWEEP_PREFIX, limit: SWEEP_PAGE, cursor });
  await cachePut(CURSOR_KEY, page.list_complete ? null : page.cursor, CURSOR_TTL_SEC);

  const groups = groupSweepKeys(page.keys);
  let closed = 0;
  for (const [userKey, pickIds] of groups) {
    try {
      const closedIds = new Set(await resolve(userKey));
      for (const pickId of pickIds) {
        if (!closedIds.has(pickId)) continue;
        await env.SOOTHIA_CACHE.delete(`${SWEEP_PREFIX}${pickId}`);
        closed += 1;
      }
    } catch (error) {
      // One user's failure must not stop the others; the entries stay for the next sweep.
      console.warn(`Soothia: recall sweep failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }
  return { users: groups.size, closed };
}
