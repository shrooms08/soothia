// The creator:<wallet> records (durable, KV): which markets a wallet created
// through Soothia. A write that fails (KV limit) is kept in memory and retried
// the next time that wallet asks for its markets or positions.
import type { CreatedMarket } from "./create";
import type { Env } from "./http";
import { kvPut } from "./store";

export const MAX_CREATOR_MARKETS = 100;
const pending = new Map<string, CreatedMarket[]>();

function merge(existing: CreatedMarket[], market: CreatedMarket): CreatedMarket[] {
  const others = existing.filter((entry) => entry.marketId !== market.marketId);
  const createdAt = existing.find((entry) => entry.marketId === market.marketId)?.createdAt ?? market.createdAt;
  return [{ ...market, createdAt }, ...others].slice(0, MAX_CREATOR_MARKETS);
}

export async function readCreatorMarkets(env: Env, wallet: string): Promise<CreatedMarket[]> {
  let stored: CreatedMarket[] = [];
  try {
    stored = ((await env.SOOTHIA_CACHE.get(`creator:${wallet}`, "json")) as CreatedMarket[] | null) ?? [];
  } catch {
    stored = [];
  }
  // Anything not yet written still counts for this wallet.
  for (const market of pending.get(wallet) ?? []) stored = merge(stored, market);
  return stored;
}

/** Records a created market; on a failed write it stays pending in memory. */
export async function rememberMarket(env: Env, wallet: string, market: CreatedMarket): Promise<boolean> {
  const merged = await readCreatorMarkets(env, wallet).then((existing) => merge(existing, market));
  const ok = await kvPut(env, `creator:${wallet}`, JSON.stringify(merged));
  if (ok) pending.delete(wallet);
  else pending.set(wallet, merge(pending.get(wallet) ?? [], market));
  return ok;
}

/** Retries pending creator writes for a wallet; called on reads of that wallet's data. */
export async function flushPendingCreator(env: Env, wallet: string): Promise<void> {
  const waiting = pending.get(wallet);
  if (!waiting?.length) return;
  const merged = await readCreatorMarkets(env, wallet);
  if (await kvPut(env, `creator:${wallet}`, JSON.stringify(merged))) pending.delete(wallet);
}

/** For tests and the debug endpoint. */
export function pendingCreatorCount(): number {
  let count = 0;
  for (const list of pending.values()) count += list.length;
  return count;
}
