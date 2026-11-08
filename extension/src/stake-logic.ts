// Staking: the pure logic behind the pool line, the Back it sheet and the record's
// wallet summary. No DOM and no chrome.*, and amounts are MIST as bigint, so all of
// it is unit-tested and none of it loses precision.

import type { ApiError, RecallCalled, Tile } from "./messages";

export const MIST_PER_SUI = 1_000_000_000n;
/** What the Worker asks a wallet to hold back for gas. */
export const GAS_RESERVE_MIST = 20_000_000n;
export const MIN_KICKOFF_LEAD_MS = 120_000;

export interface PoolLimits {
  minStakeMist: string;
  maxStakePerUserMist: string;
  maxPoolMist: string;
}

/** POST /stake/pool. */
export interface PoolView {
  exists: boolean;
  poolId: string | null;
  status: "open" | "resolved" | "void" | null;
  closeMs: number;
  yesTotal: string;
  noTotal: string;
  feeBps: number;
  limits: PoolLimits;
  claimOpensAtMs?: number;
}

export type PositionStatus = "open" | "awaiting_result" | "challenge_window" | "claimable" | "lost" | "refundable" | "claimed";

/** One entry of GET /stake/positions. */
export interface StakePositionView {
  poolId: string;
  pickId: string;
  match: { home: string; away: string; startISO: string; subject: "home" | "away" };
  side: "YES" | "NO";
  status: PositionStatus;
  amountMist: string;
  estimatedPayoutMist: string;
  claimOpensAtMs: number | null;
  /** Null until the result is final. Missing on an older Worker. */
  result?: "won" | "lost" | "refunded" | null;
}

/** Whole SUI text, rounded down to `decimals` places, without trailing zeros. */
export function formatSui(mist: bigint | string, decimals = 9): string {
  const value = BigInt(mist);
  const fraction = (value % MIST_PER_SUI).toString().padStart(9, "0").slice(0, decimals).replace(/0+$/, "");
  return `${value / MIST_PER_SUI}${fraction ? `.${fraction}` : ""}`;
}

/** Reads "0.5" as MIST, or null when it is not a positive amount with at most 9 decimals. */
export function parseSuiAmount(text: string): bigint | null {
  const match = /^(\d{1,10})(?:\.(\d{1,9}))?$/.exec(text.trim());
  if (!match) return null;
  const mist = BigInt(match[1]) * MIST_PER_SUI + BigInt((match[2] ?? "").padEnd(9, "0"));
  return mist > 0n ? mist : null;
}

/** A fixture call with a Sui commit whose kickoff is far enough off to stake on. */
export function stakeEligible(called: RecallCalled | null | undefined, nowMs: number): boolean {
  if (!called?.committed || !called.fixture || typeof called.pYes !== "number") return false;
  return Date.parse(called.fixture.startISO) - nowMs > MIN_KICKOFF_LEAD_MS;
}

export const backsYes = (called: Pick<RecallCalled, "pYes">): boolean => (called.pYes ?? 0) >= 0.5;

/**
 * One tile per call shows the staking row. Both questions on a match settle to the
 * same call, so it goes on the tile that asks what the call was about.
 */
export function stakeTileIds(tiles: Tile[], calledByClaim: (claimId: string) => RecallCalled | null | undefined, nowMs: number): Set<string> {
  const chosen = new Map<string, { claimId: string; exact: boolean }>();
  for (const { claim } of tiles) {
    const called = calledByClaim(claim.id);
    if (!called?.fixture || !stakeEligible(called, nowMs)) continue;
    const { home, away, subject } = called.fixture;
    const exact = claim.question.toLowerCase().startsWith(`will ${(subject === "home" ? home : away).toLowerCase()} beat`);
    const current = chosen.get(called.pickId);
    if (!current || (exact && !current.exact)) chosen.set(called.pickId, { claimId: claim.id, exact });
  }
  return new Set([...chosen.values()].map((entry) => entry.claimId));
}

const totalsFor = (pool: Pick<PoolView, "yesTotal" | "noTotal">, side: boolean) => {
  const yes = BigInt(pool.yesTotal);
  const no = BigInt(pool.noTotal);
  return { mine: side ? yes : no, other: side ? no : yes };
};

const multiplierText = (multiplier: number): string => `${multiplier.toFixed(2)}x`;

/** What each SUI on this side pays with `addedMist` more on it, after the fee. Null with nothing on the side. */
export function multiplierWith(pool: Pick<PoolView, "yesTotal" | "noTotal" | "feeBps">, side: boolean, addedMist: bigint): number | null {
  const { mine, other } = totalsFor(pool, side);
  const sideTotal = mine + addedMist;
  if (sideTotal <= 0n) return null;
  const pot = sideTotal + other;
  const net = pot - (pot * BigInt(pool.feeBps)) / 10_000n;
  return Number((net * 10_000n) / sideTotal) / 10_000;
}

export function poolIsOpenForStakes(pool: Pick<PoolView, "exists" | "status" | "closeMs">, nowMs: number): boolean {
  if (pool.closeMs - nowMs <= MIN_KICKOFF_LEAD_MS) return false;
  return !pool.exists || pool.status === "open";
}

/** "Pool: 3.2 SUI on Arsenal win · 1.1 SUI against · pays 1.34x". */
export function poolLine(pool: PoolView, side: boolean, sideLabel: string): string {
  if (!pool.exists) return "No pool yet. Be the first to back it.";
  const { mine, other } = totalsFor(pool, side);
  const parts = [`Pool: ${formatSui(mine, 3)} SUI on ${sideLabel}`, `${formatSui(other, 3)} SUI against`];
  const multiplier = multiplierWith(pool, side, 0n);
  if (multiplier !== null && mine > 0n) parts.push(`pays ${multiplierText(multiplier)}`);
  return parts.join(" · ");
}

/** "You backed 1 SUI · pays ~1.34x". */
export function backedLine(pool: PoolView, side: boolean, heldMist: bigint): string {
  const multiplier = multiplierWith(pool, side, 0n);
  return `You backed ${formatSui(heldMist, 4)} SUI${multiplier === null ? "" : ` · pays ~${multiplierText(multiplier)}`}`;
}

/** A top-up must itself meet the minimum stake and stay under the personal limit. */
export function canTopUp(limits: PoolLimits, heldMist: bigint): boolean {
  return heldMist + BigInt(limits.minStakeMist) <= BigInt(limits.maxStakePerUserMist);
}

/** Why this amount cannot be staked, in plain words, or null when it can. */
export function amountProblem(input: {
  amountMist: bigint | null;
  limits: PoolLimits;
  heldMist: bigint;
  poolTotalMist: bigint;
  /** Null until a wallet is connected. */
  balanceMist: bigint | null;
}): string | null {
  const { amountMist, limits, heldMist, poolTotalMist, balanceMist } = input;
  if (amountMist === null) return "Enter an amount in SUI.";
  const minimum = BigInt(limits.minStakeMist);
  if (amountMist < minimum) return `The minimum stake is ${formatSui(minimum)} SUI.`;
  const room = BigInt(limits.maxStakePerUserMist) - heldMist;
  if (amountMist > room) {
    return heldMist > 0n ? `You can add at most ${formatSui(room < 0n ? 0n : room)} SUI more to this pool.` : `The most you can stake on one pool is ${formatSui(room)} SUI.`;
  }
  const poolRoom = BigInt(limits.maxPoolMist) - poolTotalMist;
  if (amountMist > poolRoom) return `This pool only has room for ${formatSui(poolRoom < 0n ? 0n : poolRoom)} SUI more.`;
  if (balanceMist !== null && amountMist + GAS_RESERVE_MIST > balanceMist) {
    return `That needs ${formatSui(amountMist + GAS_RESERVE_MIST)} SUI including gas. Your wallet has ${formatSui(balanceMist, 4)} SUI.`;
  }
  return null;
}

export interface StakeEstimate {
  /** After this stake and the fee. */
  multiplier: number;
  /** The whole position's payout if this side wins, rounded down like the contract. */
  payoutMist: bigint;
}

export function stakeEstimate(pool: Pick<PoolView, "yesTotal" | "noTotal" | "feeBps">, side: boolean, amountMist: bigint, heldMist: bigint): StakeEstimate {
  const { mine, other } = totalsFor(pool, side);
  const sideTotal = mine + amountMist;
  const pot = sideTotal + other;
  const net = pot - (pot * BigInt(pool.feeBps)) / 10_000n;
  return {
    multiplier: sideTotal > 0n ? Number((net * 10_000n) / sideTotal) / 10_000 : 0,
    payoutMist: sideTotal > 0n ? ((heldMist + amountMist) * net) / sideTotal : 0n,
  };
}

export const feePercent = (feeBps: number): string => `${feeBps / 100}%`;

export interface StakeErrorBody extends ApiError {
  abortCode?: string;
  neededMist?: string;
  heldMist?: string;
  maxStakePerUserMist?: string;
}

const CLOSED_TEXT = "This match is about to start or the pool has closed, so staking has stopped.";
const LIMIT_TEXT = "That would take you over the limit for this pool.";
const FULL_TEXT = "This pool is full.";

// Contract abort codes a stake can hit (move/soothia_stake/sources/pool.move).
const ABORT_TEXT: Record<string, string> = {
  "3": CLOSED_TEXT,
  "4": CLOSED_TEXT,
  "5": "That is below the minimum stake.",
  "6": "You already backed the other side of this pool.",
  "7": LIMIT_TEXT,
  "8": FULL_TEXT,
};

/** A Worker refusal in plain words, and whether trying again could help. */
export function stakeErrorText(status: number, body: StakeErrorBody | null): { text: string; retry: boolean } {
  if (status === 0) return { text: "I couldn't reach Soothia's server. Check your connection.", retry: true };
  if (status === 429 && body?.error !== "pool_cap_reached") return { text: "Too many requests just now. Try again in a minute.", retry: true };
  switch (body?.error) {
    case "too_close_to_kickoff":
    case "pool_not_open":
    case "fixture_not_open":
      return { text: CLOSED_TEXT, retry: false };
    case "above_user_limit":
      return { text: LIMIT_TEXT, retry: false };
    case "pool_full":
      return { text: FULL_TEXT, retry: false };
    case "below_min_stake":
      return { text: "That is below the minimum stake.", retry: false };
    case "side_switch":
      return { text: "You already backed the other side of this pool.", retry: false };
    case "insufficient_balance":
      return { text: `You don't have enough SUI. This needs ${formatSui(body.neededMist ?? "0")} SUI including gas.`, retry: true };
    case "stake_rejected":
      return { text: ABORT_TEXT[body.abortCode ?? ""] ?? "The contract refused this stake.", retry: false };
    case "staking_paused":
      return { text: "New pools are paused for a moment. Try again later.", retry: true };
    case "pool_cap_reached":
      return { text: "Soothia has opened all the pools it can today. Try again tomorrow.", retry: false };
    case "resolver_low_balance":
      return { text: "Soothia can't open new pools just now. Try again later.", retry: true };
    case "resolver_busy":
      return { text: "Soothia is busy opening another pool. Try again in a minute.", retry: true };
    case "espn_unavailable":
      return { text: "ESPN couldn't be checked just now. Try again in a minute.", retry: true };
    case "fixture_not_on_espn":
    case "fixture_date_mismatch":
      return { text: "ESPN doesn't list this match for that day, so it can't have a pool.", retry: false };
    case "pick_not_found":
      return { text: "Soothia can't find this call on your record yet. Try again in a minute.", retry: true };
    case "pick_not_committed":
      return { text: "This call has no proof on Sui, so it can't be backed.", retry: false };
    default:
      return { text: "That didn't work. Please try again.", retry: true };
  }
}

/** A wallet or bridge failure in plain words. */
export function walletErrorText(message: string): { text: string; retry: boolean } {
  if (/reject|denied|declined|cancel/i.test(message)) return { text: "You cancelled in your wallet. Nothing was staked.", retry: true };
  if (/insufficient|not enough|no valid gas|gas (coin|balance)/i.test(message)) return { text: "Your wallet doesn't have enough SUI to cover this and gas.", retry: true };
  if (/did not respond in time/i.test(message)) return { text: "Your wallet didn't answer in time. If you approved it, check your wallet before trying again.", retry: true };
  if (/^Transaction refused\./.test(message)) return { text: `${message} Nothing was sent to your wallet.`, retry: false };
  return { text: message.slice(0, 160) || "Your wallet reported a problem.", retry: true };
}

/** A position's status in words. `when` formats a time for the reader. */
export function positionStatusText(position: Pick<StakePositionView, "status" | "estimatedPayoutMist" | "claimOpensAtMs" | "result">, when: (ms: number) => string): string {
  const payout = `${formatSui(position.estimatedPayoutMist, 4)} SUI`;
  switch (position.status) {
    case "open":
      return "Open";
    case "awaiting_result":
      return "Awaiting result";
    case "challenge_window":
      return position.claimOpensAtMs === null ? "In challenge window" : `In challenge window until ${when(position.claimOpensAtMs)}`;
    case "claimable":
      return `Won ${payout}`;
    case "lost":
      return "Lost";
    case "refundable":
      return `Refund of ${payout} ready`;
    case "claimed":
      if (position.result === "refunded") return `Refunded ${payout}`;
      return position.result === "won" ? `Claimed ${payout}` : "Claimed";
  }
}

export const isClaimable = (status: PositionStatus | null | undefined): boolean => status === "claimable" || status === "refundable";

export interface WalletSummary {
  stakedMist: bigint;
  wonMist: bigint;
  lostMist: bigint;
  /** Settled wins and losses only. Null with nothing settled. */
  profitMist: bigint | null;
  /** Percent of the money settled. */
  roiPercent: number | null;
  bestMultiplier: number | null;
}

function finalResult(position: StakePositionView): "won" | "lost" | "refunded" | null {
  if (position.result !== undefined) return position.result;
  if (position.status === "claimable") return "won";
  if (position.status === "lost") return "lost";
  return position.status === "refundable" ? "refunded" : null;
}

/** Refunds are left out: that money was never at stake in a result. */
export function walletSummary(positions: StakePositionView[]): WalletSummary {
  let stakedMist = 0n;
  let wonMist = 0n;
  let lostMist = 0n;
  let settledMist = 0n;
  let wonStakeMist = 0n;
  let bestMultiplier: number | null = null;
  for (const position of positions) {
    const result = finalResult(position);
    if (result === "refunded") continue;
    const amount = BigInt(position.amountMist);
    stakedMist += amount;
    if (result === "won") {
      const payout = BigInt(position.estimatedPayoutMist);
      wonMist += payout;
      wonStakeMist += amount;
      settledMist += amount;
      if (amount > 0n) {
        const multiplier = Number((payout * 10_000n) / amount) / 10_000;
        bestMultiplier = Math.max(bestMultiplier ?? 0, multiplier);
      }
    } else if (result === "lost") {
      lostMist += amount;
      settledMist += amount;
    }
  }
  const profitMist = settledMist > 0n ? wonMist - wonStakeMist - lostMist : null;
  const roiPercent = profitMist !== null ? Number((profitMist * 10_000n) / settledMist) / 100 : null;
  return { stakedMist, wonMist, lostMist, profitMist, roiPercent, bestMultiplier };
}

/** "+0.5 SUI" or "-0.1 SUI". */
export function signedSui(mist: bigint): string {
  return `${mist < 0n ? "-" : "+"}${formatSui(mist < 0n ? -mist : mist, 4)} SUI`;
}
