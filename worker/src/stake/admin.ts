// Soothia staking: the operator's routes, all behind X-Soothia-Admin. The AdminCap
// stays in the operator's wallet, so these only ever return unsigned bytes for it.

import type { Transaction } from "@mysten/sui/transactions";
import { json, readJsonObject } from "../http";
import { abortCodeOf, parseAddress, refuse, type Context } from "./context";
import { inChallengeWindow, PROD_CHALLENGE_MS, PROD_MIN_RESOLVE_DELAY_MS } from "./math";
import type { StakePool } from "./readers";
import { buildOverturn, buildSetDelays } from "./transactions";

const ADMIN_GAS_BUDGET = 20_000_000;
const MAX_RESOLVE_DELAY_MS = 86_400_000;
const MAX_CHALLENGE_MS = 172_800_000;
async function adminCapHolder(context: Context): Promise<{ adminCap: string; owner: string }> {
  const adminCap = context.env.STAKE_ADMIN_CAP?.trim();
  if (!adminCap) return refuse(503, "admin_cap_not_configured");
  const owner = await context.chain.objectOwner(adminCap);
  if (!owner) return refuse(503, "admin_cap_has_no_owner");
  return { adminCap, owner };
}

async function infoRoute(context: Context): Promise<Response> {
  const [{ adminCap, owner }, config] = await Promise.all([adminCapHolder(context), context.chain.readConfig()]);
  return json(context.request, {
    adminCap,
    adminCapOwner: owner,
    packageId: context.settings.packageId,
    configId: context.settings.configId,
    minResolveDelayMs: Number(config.minResolveDelayMs),
    challengeMs: Number(config.challengeMs),
    productionDelays:
      config.minResolveDelayMs === PROD_MIN_RESOLVE_DELAY_MS && config.challengeMs === PROD_CHALLENGE_MS,
  });
}

/** Builds for the AdminCap's owner. A contract refusal comes back with its code. */
async function buildForOwner(context: Context, tx: Transaction, owner: string): Promise<Response> {
  if ((await context.chain.balanceOf(owner)) < BigInt(ADMIN_GAS_BUDGET))
    refuse(409, "admin_wallet_low_balance", { neededMist: String(ADMIN_GAS_BUDGET) });
  try {
    return json(context.request, {
      txBytes: await context.chain.buildForSender(tx, owner, ADMIN_GAS_BUDGET),
      sender: owner,
    });
  } catch (error) {
    const abortCode = abortCodeOf(error);
    if (abortCode === null) throw error;
    return refuse(409, "tx_rejected", { abortCode });
  }
}

export async function readOurPool(context: Context, poolId: string): Promise<StakePool> {
  return context.chain.readPool(poolId).catch((error) => {
    if (/not_a_stake_pool|not.?found|does not exist/i.test(String((error as Error)?.message)))
      return refuse(404, "pool_not_found");
    throw error;
  });
}

async function overturnBuildRoute(context: Context): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const poolId = parseAddress(body.poolId, "invalid_pool_id");
  const pool = await readOurPool(context, poolId);
  if (pool.status !== "resolved") refuse(409, "pool_not_resolved", { status: pool.status });
  if (!inChallengeWindow(pool, BigInt(context.nowMs))) refuse(409, "challenge_window_over");
  const { adminCap, owner } = await adminCapHolder(context);
  return buildForOwner(context, buildOverturn(context.settings, { adminCap, poolId }), owner);
}

function parseDelay(value: unknown, max: number, code: string): bigint {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > max) refuse(400, code, { max });
  return BigInt(value as number);
}

async function configBuildRoute(context: Context): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const minResolveDelayMs = parseDelay(body.min_resolve_delay_ms, MAX_RESOLVE_DELAY_MS, "invalid_min_resolve_delay_ms");
  const challengeMs = parseDelay(body.challenge_ms, MAX_CHALLENGE_MS, "invalid_challenge_ms");
  const { adminCap, owner } = await adminCapHolder(context);
  return buildForOwner(context, buildSetDelays(context.settings, { adminCap, minResolveDelayMs, challengeMs }), owner);
}

export const ADMIN_ROUTES: Record<string, (context: Context) => Promise<Response>> = {
  "GET /stake/admin/info": infoRoute,
  "POST /stake/admin/overturn/build": overturnBuildRoute,
  "POST /stake/admin/config/build": configBuildRoute,
};
