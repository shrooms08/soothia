// Total Recall: limits what the public /recall/pick route can spend on Sui commits.
// Install ids are self-declared, so the global cap is the real ceiling on spending;
// the per-user cap only stops one ordinary user from using it all up. The CLI runs
// locally with the operator's key and does not come through here.
//
// KV has no atomic increment and can serve slightly stale reads, so concurrent
// requests can overshoot a cap by a few. Anything uncertain skips the commit.

import type { Env } from "../http";
import { cacheGet, cachePut, kvPut } from "../store";
import type { CommitSkipReason } from "./records";
import { commitKeypair } from "./sui";
import { tatumSuiClient } from "./tatumGrpc";

export const USER_DAILY_CAP = 5;
export const OWNER_DAILY_CAP = 30;
export const GLOBAL_DAILY_CAP = 50;
/** 0.05 SUI. */
export const MIN_BALANCE_MIST = 50_000_000n;
export const BALANCE_CACHE_KEY = "recall:commit-balance";

const BALANCE_CACHE_SEC = 60;
const COUNTER_TTL_SEC = 2 * 86_400;

export interface GuardDeps {
  now?: Date;
  /** Reads the commit wallet's balance in MIST. */
  readBalance?: () => Promise<bigint>;
}

async function readWalletBalance(env: Env): Promise<bigint> {
  const signer = commitKeypair(env);
  if (!signer) throw new Error("commit_not_configured");
  const { balance } = await tatumSuiClient(env.TATUM_API_KEY.trim()).core.getBalance({ owner: signer.toSuiAddress() });
  return BigInt(balance.balance);
}

async function walletBalance(env: Env, read: () => Promise<bigint>): Promise<bigint> {
  const cached = await cacheGet<string>(BALANCE_CACHE_KEY);
  if (cached !== null) return BigInt(cached);
  const balance = await read();
  await cachePut(BALANCE_CACHE_KEY, balance.toString(), BALANCE_CACHE_SEC);
  return balance;
}

function ownerKeys(env: Env): Set<string> {
  return new Set(
    (env.RECALL_OWNER_KEYS ?? "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean),
  );
}

const count = (value: string | null): number => Number(value) || 0;

/**
 * Reserves one commit for this user. Returns null when the commit may go ahead,
 * or why it must be skipped. A slot is used even if the commit then fails.
 */
export async function checkCommitGuard(env: Env, userKey: string, deps: GuardDeps = {}): Promise<CommitSkipReason | null> {
  try {
    const balance = await walletBalance(env, deps.readBalance ?? (() => readWalletBalance(env)));
    if (balance < MIN_BALANCE_MIST) return "low_balance";
  } catch {
    // An unreadable balance is treated as too low: never spend on a guess.
    return "low_balance";
  }

  const day = (deps.now ?? new Date()).toISOString().slice(0, 10);
  const userCounter = `commitcap:${day}:${userKey}`;
  const globalCounter = `commitcap:${day}:all`;

  let used: number;
  let total: number;
  try {
    const [userValue, globalValue] = await Promise.all([env.SOOTHIA_CACHE.get(userCounter), env.SOOTHIA_CACHE.get(globalCounter)]);
    used = count(userValue);
    total = count(globalValue);
  } catch {
    return "kv_unavailable";
  }

  if (used >= (ownerKeys(env).has(userKey) ? OWNER_DAILY_CAP : USER_DAILY_CAP)) return "user_cap";
  if (total >= GLOBAL_DAILY_CAP) return "global_cap";

  const options = { expirationTtl: COUNTER_TTL_SEC };
  const saved = (await kvPut(env, userCounter, String(used + 1), options)) && (await kvPut(env, globalCounter, String(total + 1), options));
  return saved ? null : "kv_unavailable";
}
