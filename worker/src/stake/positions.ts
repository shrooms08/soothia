// Soothia staking: what a position looks like to the person who holds it, used by
// GET /stake/positions and by /recall/record.

import type { RecallEnv } from "../recall/env";
import type { StakeRecord } from "../recall/records";
import { stakeSettings, tatumStakeChain, type StakeChain } from "./chain";
import {
  claimOpensAtMs,
  estimatedPayout,
  positionResult,
  positionStatus,
  type PositionResult,
  type PositionStatus,
} from "./math";
import type { StakePool, StakePosition } from "./readers";

/** Each pick needs two reads, and the plan allows 3 a second. */
const MAX_PICKS_READ = 10;

export interface PositionView {
  status: PositionStatus;
  amountMist: string;
  estimatedPayoutMist: string;
  claimOpensAtMs: number | null;
  result: PositionResult;
}

export function viewPosition(pool: StakePool, position: StakePosition, nowMs: number): PositionView {
  const opens = pool.status === "resolved" ? Number(claimOpensAtMs(pool)) : null;
  return {
    status: positionStatus(pool, position, BigInt(nowMs)),
    amountMist: position.amount.toString(),
    estimatedPayoutMist: estimatedPayout(pool, position).toString(),
    claimOpensAtMs: opens,
    result: positionResult(pool, position, BigInt(nowMs)),
  };
}

export interface StakeSummary {
  poolId: string;
  side: StakeRecord["side"];
  amountMist: string;
  /** Null when the chain could not be read just now. */
  status: PositionStatus | null;
  payoutMist: string | null;
  claimOpensAtMs: number | null;
  digests: string[];
}

/** Stakes grouped by pick, one entry per transaction, newest first. */
export function groupStakes(stakes: StakeRecord[]): Map<string, StakeRecord[]> {
  const seen = new Set<string>();
  const groups = new Map<string, StakeRecord[]>();
  for (const stake of [...stakes].sort((a, b) => b.at.localeCompare(a.at))) {
    if (seen.has(stake.digest)) continue;
    seen.add(stake.digest);
    groups.set(stake.pickId, [...(groups.get(stake.pickId) ?? []), stake]);
  }
  return groups;
}

/** Each staked pick's amount, status and payout. Never throws: the record must still load. */
export async function stakeSummaries(
  env: RecallEnv,
  stakes: StakeRecord[],
  nowMs: number,
  chainOverride?: StakeChain,
): Promise<Map<string, StakeSummary>> {
  const summaries = new Map<string, StakeSummary>();
  if (stakes.length === 0) return summaries;
  const settings = stakeSettings(env);
  const chain = chainOverride ?? (settings ? tatumStakeChain(env, settings) : null);

  let reads = 0;
  for (const [pickId, group] of groupStakes(stakes)) {
    const [latest] = group;
    const recorded = group.reduce((sum, stake) => sum + BigInt(stake.amountMist), 0n);
    const summary: StakeSummary = {
      poolId: latest.poolId,
      side: latest.side,
      amountMist: recorded.toString(),
      status: null,
      payoutMist: null,
      claimOpensAtMs: null,
      digests: group.map((stake) => stake.digest),
    };
    summaries.set(pickId, summary);
    if (!chain || reads >= MAX_PICKS_READ) continue;
    reads += 1;
    try {
      const pool = await chain.readPool(latest.poolId);
      const position = await chain.readPosition(pool, latest.sender);
      if (!position) continue;
      const view = viewPosition(pool, position, nowMs);
      summary.amountMist = view.amountMist;
      summary.status = view.status;
      summary.payoutMist = view.estimatedPayoutMist;
      summary.claimOpensAtMs = view.claimOpensAtMs;
    } catch (error) {
      console.warn(`Soothia: stake summary failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }
  return summaries;
}
