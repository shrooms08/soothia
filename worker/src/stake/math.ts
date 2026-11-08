// Soothia staking: the payout and claim-window math, mirroring
// move/soothia_stake/sources/pool.move. Amounts are MIST as bigint, so nothing
// loses precision.

const BPS_DENOMINATOR = 10_000n;

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
