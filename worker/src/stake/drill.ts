// Soothia staking: the overturn drill, a rehearsal with real SUI, run from the admin
// page. A drill pool has a KV marker and no stakepool entry, so the sweep never sees
// it, and every step refuses a pool without a marker, so none can act on a real pool.

import { json, readJsonObject, sha256Hex } from "../http";
import { kvPut } from "../store";
import { readOurPool } from "./admin";
import { abortCodeOf, clearPoolCreation, parseAddress, refuse, StakeRefusal, type Context } from "./context";
import type { StakePool } from "./readers";
import { acquireResolverLock, releaseResolverLock } from "./sweep";

export const DRILL_CHALLENGE_MS = 900_000n;
export const DRILL_STAKE_MIST = 100_000_000n;
const DRILL_CLOSE_AFTER_MS = 120_000;
const DRILL_MARKER_TTL_SEC = 7 * 86_400;
const DRILL_EVIDENCE = "drill";

export const drillKey = (poolId: string): string => `stakedrill:${poolId}`;

interface DrillMarker {
  poolId: string;
  questionHash: string;
  timestamp: number;
  closeMs: number;
}

async function drillCreateRoute(context: Context): Promise<Response> {
  const { chain, env, nowMs } = context;
  const config = await chain.readConfig();
  // Pools copy the delays when created, so a drill pool made before step (a) would take hours to resolve.
  if (config.minResolveDelayMs !== 0n || config.challengeMs !== DRILL_CHALLENGE_MS) {
    refuse(409, "delays_not_shortened", {
      minResolveDelayMs: Number(config.minResolveDelayMs),
      challengeMs: Number(config.challengeMs),
    });
  }
  await clearPoolCreation(context);

  const questionHash = await sha256Hex(`soothia-drill-${nowMs}`);
  const closeMs = nowMs + DRILL_CLOSE_AFTER_MS;
  let created: { poolId: string; digest: string };
  try {
    created = await chain.createPool(questionHash, BigInt(closeMs));
  } finally {
    await releaseResolverLock(env);
  }
  const poolId = created.poolId.toLowerCase();
  const marker: DrillMarker = { poolId, questionHash, timestamp: nowMs, closeMs };
  if (!(await kvPut(env, drillKey(poolId), JSON.stringify(marker), { expirationTtl: DRILL_MARKER_TTL_SEC }))) {
    refuse(503, "drill_not_marked", { poolId, digest: created.digest });
  }
  return json(context.request, { poolId, digest: created.digest, questionHash, closeMs });
}

/** The drill pool named in the body. Anything without a matching marker is refused. */
async function loadDrill(context: Context): Promise<{ poolId: string; pool: StakePool }> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const poolId = parseAddress(body.poolId, "invalid_pool_id");
  const marker = await context.env.SOOTHIA_CACHE.get<DrillMarker>(drillKey(poolId), "json");
  if (!marker) return refuse(404, "not_a_drill_pool");
  const pool = await readOurPool(context, poolId);
  if (pool.questionHash !== marker.questionHash) refuse(409, "not_a_drill_pool");
  return { poolId, pool };
}

function gasWallet(context: Context): string {
  const address = context.chain.gasWalletAddress();
  if (!address) return refuse(503, "gas_wallet_not_configured");
  return address;
}

async function drillStakeRoute(context: Context): Promise<Response> {
  const { poolId, pool } = await loadDrill(context);
  if (pool.status !== "open") refuse(409, "pool_not_open", { status: pool.status });
  if (BigInt(context.nowMs) >= pool.closeMs) refuse(409, "drill_pool_closed");
  if (await context.chain.readPosition(pool, gasWallet(context))) refuse(409, "already_staked");
  const digest = await sendDrillTx(() => context.chain.stakeFromGasWallet(poolId, DRILL_STAKE_MIST, pool.questionHash));
  return json(context.request, { digest, amountMist: DRILL_STAKE_MIST.toString() });
}

async function drillResolveRoute(context: Context): Promise<Response> {
  const { env, chain } = context;
  const { poolId, pool } = await loadDrill(context);
  if (pool.status !== "open") refuse(409, "pool_not_open", { status: pool.status });
  if (BigInt(context.nowMs) < pool.closeMs + pool.minResolveDelayMs)
    refuse(409, "drill_pool_not_closed", { closeMs: Number(pool.closeMs) });
  // With nothing on YES the contract voids at once, and there would be no window to overturn in.
  if (pool.yes === 0n) refuse(409, "nothing_staked");
  if (!(await acquireResolverLock(env))) refuse(503, "resolver_busy");
  try {
    const digest = await sendDrillTx(() => chain.resolvePool(poolId, true, DRILL_EVIDENCE));
    return json(context.request, { digest });
  } finally {
    await releaseResolverLock(env);
  }
}

async function drillRefundRoute(context: Context): Promise<Response> {
  const { poolId, pool } = await loadDrill(context);
  if (pool.status !== "void") refuse(409, "pool_not_void", { status: pool.status });
  const position = await context.chain.readPosition(pool, gasWallet(context));
  if (!position) return refuse(404, "no_position");
  if (position.claimed) refuse(409, "already_refunded");
  const { digest, amount } = await sendDrillTx(() => context.chain.claimFromGasWallet(poolId));
  return json(context.request, {
    digest,
    amountMist: amount.toString(),
    stakedMist: position.amount.toString(),
    fullRefund: amount === position.amount,
  });
}

/** Runs a Worker-signed drill step, reporting a contract refusal by its code. */
async function sendDrillTx<T>(send: () => Promise<T>): Promise<T> {
  try {
    return await send();
  } catch (error) {
    if (error instanceof StakeRefusal) throw error;
    const abortCode = abortCodeOf(error);
    if (abortCode === null) throw error;
    return refuse(409, "tx_rejected", { abortCode });
  }
}

export const DRILL_ROUTES: Record<string, (context: Context) => Promise<Response>> = {
  "POST /stake/admin/drill/create": drillCreateRoute,
  "POST /stake/admin/drill/stake": drillStakeRoute,
  "POST /stake/admin/drill/resolve": drillResolveRoute,
  "POST /stake/admin/drill/refund": drillRefundRoute,
};
