// Soothia staking: the payout math, mirroring move/soothia_stake/sources/pool.move.
// All amounts are MIST as bigint, so nothing loses precision.

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
  feeTaken: bigint;
}

/** What a position can claim: 0 for a loser or while the pool is open. */
export function claimAmount(pool: SettledPool, position: { side: boolean; amount: bigint; claimed: boolean }): bigint {
  if (position.claimed || pool.status === "open") return 0n;
  if (pool.status === "void") return position.amount;
  if (position.side !== pool.outcomeYes) return 0n;
  const winningTotal = pool.outcomeYes ? pool.yesTotal : pool.noTotal;
  return winnerPayout(position.amount, pool.yesTotal + pool.noTotal - pool.feeTaken, winningTotal);
}
