// Soothia staking: the payout and claim-window math, mirroring
// move/soothia_stake/sources/pool.move. Amounts are MIST as bigint, so nothing
// loses precision.

const BPS_DENOMINATOR = 10_000n;

/** The delays real pools must be created with. */
export const PROD_MIN_RESOLVE_DELAY_MS = 8_100_000n;
export const PROD_CHALLENGE_MS = 21_600_000n;

export function feeOn(total: bigint, feeBps: bigint): bigint {
  return (total * feeBps) / BPS_DENOMINATOR;
}

/** Rounds down, like the contract, so payouts never add up to more than the net pot. */
export function winnerPayout(staked: bigint, netPot: bigint, winningTotal: bigint): bigint {
  return (staked * netPot) / winningTotal;
}

export interface SettledPool {
  status: "open" | "resolved" | "void";
  outcomeYes: boolean;
  yesTotal: bigint;
  noTotal: bigint;
  feeAmount: bigint;
  resolvedAtMs: bigint;
  challengeMs: bigint;
}

/** When claims open on a resolved pool, and overturning stops. */
export function claimOpensAtMs(pool: Pick<SettledPool, "resolvedAtMs" | "challengeMs">): bigint {
  return pool.resolvedAtMs + pool.challengeMs;
}

/** True while the admin can still overturn this pool. */
export function inChallengeWindow(pool: SettledPool, nowMs: bigint): boolean {
  return pool.status === "resolved" && nowMs < claimOpensAtMs(pool);
}

/** A pool that was resolved and then overturned. A plain void pool never has a resolve time. */
export function wasOverturned(pool: Pick<SettledPool, "status" | "resolvedAtMs">): boolean {
  return pool.status === "void" && pool.resolvedAtMs > 0n;
}

/** What a position can claim right now: 0 for a loser, or until claims open. */
export function claimAmount(
  pool: SettledPool,
  position: { side: boolean; amount: bigint; claimed: boolean },
  nowMs: bigint,
): bigint {
  if (position.claimed || pool.status === "open") return 0n;
  if (pool.status === "void") return position.amount;
  if (nowMs < claimOpensAtMs(pool) || position.side !== pool.outcomeYes) return 0n;
  const winningTotal = pool.outcomeYes ? pool.yesTotal : pool.noTotal;
  return winnerPayout(position.amount, pool.yesTotal + pool.noTotal - pool.feeAmount, winningTotal);
}

export type PoolTotalsInput = Pick<SettledPool, "status" | "yesTotal" | "noTotal"> & { yes: bigint; no: bigint };

/**
 * Each side's stake. The contract only fills yes_total and no_total at resolve, and
 * merges the balances after the challenge window, so neither source is right alone.
 */
export function poolTotals(pool: PoolTotalsInput): { yes: bigint; no: bigint } {
  if (pool.status !== "open" && pool.yesTotal + pool.noTotal > 0n) return { yes: pool.yesTotal, no: pool.noTotal };
  return { yes: pool.yes, no: pool.no };
}

/** What each unit staked would return if this side won, after the fee; null with no stake on it. */
export function multiplierAfterFee(yes: bigint, no: bigint, sideTotal: bigint, feeBps: bigint): number | null {
  if (sideTotal <= 0n) return null;
  const total = yes + no;
  return Number(((total - feeOn(total, feeBps)) * 10_000n) / sideTotal) / 10_000;
}

export type StakePoolView = PoolTotalsInput & SettledPool & { feeBps: bigint; closeMs: bigint };
export type StakePositionView = { side: boolean; amount: bigint; claimed: boolean };

/** The payout this position is heading for. Ignores the claim window and whether it was already claimed. */
export function estimatedPayout(pool: StakePoolView, position: StakePositionView): bigint {
  if (pool.status === "void") return position.amount;
  const { yes, no } = poolTotals(pool);
  if (pool.status === "resolved") {
    if (position.side !== pool.outcomeYes) return 0n;
    return winnerPayout(position.amount, yes + no - pool.feeAmount, pool.outcomeYes ? yes : no);
  }
  const sideTotal = position.side ? yes : no;
  if (sideTotal === 0n) return 0n;
  return winnerPayout(position.amount, yes + no - feeOn(yes + no, pool.feeBps), sideTotal);
}

export type PositionStatus = "open" | "awaiting_result" | "challenge_window" | "claimable" | "lost" | "refundable" | "claimed";

export function positionStatus(pool: StakePoolView, position: StakePositionView, nowMs: bigint): PositionStatus {
  if (position.claimed) return "claimed";
  if (pool.status === "void") return "refundable";
  if (pool.status === "open") return nowMs < pool.closeMs ? "open" : "awaiting_result";
  if (inChallengeWindow(pool, nowMs)) return "challenge_window";
  return position.side === pool.outcomeYes ? "claimable" : "lost";
}

export type PositionResult = "won" | "lost" | "refunded" | null;

/** How a position ended. Null until the result is final: an overturn can still change it in the window. */
export function positionResult(pool: StakePoolView, position: StakePositionView, nowMs: bigint): PositionResult {
  if (pool.status === "void") return "refunded";
  if (pool.status !== "resolved" || inChallengeWindow(pool, nowMs)) return null;
  return position.side === pool.outcomeYes ? "won" : "lost";
}
