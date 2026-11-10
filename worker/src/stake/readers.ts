// Soothia staking: reads pools, positions and events through Tatum's gRPC gateway.
// Objects are parsed from BCS, in the field order of pool.move, because the SDK
// warns that JSON shapes vary between APIs.

import { bcs } from "@mysten/sui/bcs";
import type { SuiGrpcClient } from "@mysten/sui/grpc";
import { bytesToHex } from "../recall/sui";

const BalanceBcs = bcs.struct("Balance", { value: bcs.u64() });
const TableBcs = bcs.struct("Table", { id: bcs.Address, size: bcs.u64() });

export const PoolBcs = bcs.struct("Pool", {
  id: bcs.Address,
  question_hash: bcs.vector(bcs.u8()),
  close_ms: bcs.u64(),
  fee_bps: bcs.u64(),
  min_resolve_delay_ms: bcs.u64(),
  challenge_ms: bcs.u64(),
  yes: BalanceBcs,
  no: BalanceBcs,
  positions: TableBcs,
  status: bcs.u8(),
  outcome: bcs.bool(),
  fee_amount: bcs.u64(),
  fee_collected: bcs.bool(),
  yes_total: bcs.u64(),
  no_total: bcs.u64(),
  resolved_at_ms: bcs.u64(),
  evidence: bcs.vector(bcs.u8()),
});

export const ConfigBcs = bcs.struct("Config", {
  id: bcs.Address,
  treasury: bcs.Address,
  fee_bps: bcs.u64(),
  min_stake: bcs.u64(),
  max_stake_per_user: bcs.u64(),
  max_pool: bcs.u64(),
  refund_after_ms: bcs.u64(),
  min_resolve_delay_ms: bcs.u64(),
  challenge_ms: bcs.u64(),
  registry: TableBcs,
});

export const PositionBcs = bcs.struct("Position", { side: bcs.bool(), amount: bcs.u64(), claimed: bcs.bool() });

export const PoolCreatedBcs = bcs.struct("PoolCreated", {
  pool: bcs.Address,
  question_hash: bcs.vector(bcs.u8()),
  close_ms: bcs.u64(),
});

export const StakedBcs = bcs.struct("Staked", {
  pool: bcs.Address,
  staker: bcs.Address,
  side: bcs.bool(),
  amount: bcs.u64(),
  pick_hash: bcs.vector(bcs.u8()),
});

export const ResolvedBcs = bcs.struct("Resolved", {
  pool: bcs.Address,
  outcome_yes: bcs.bool(),
  yes_total: bcs.u64(),
  no_total: bcs.u64(),
  fee: bcs.u64(),
  resolved_at_ms: bcs.u64(),
  evidence: bcs.vector(bcs.u8()),
});

export const FeeCollectedBcs = bcs.struct("FeeCollected", {
  pool: bcs.Address,
  treasury: bcs.Address,
  amount: bcs.u64(),
});

export const ClaimedBcs = bcs.struct("Claimed", { pool: bcs.Address, claimer: bcs.Address, amount: bcs.u64() });

export interface StakePool {
  id: string;
  questionHash: string;
  closeMs: bigint;
  feeBps: bigint;
  minResolveDelayMs: bigint;
  challengeMs: bigint;
  yes: bigint;
  no: bigint;
  positionsTableId: string;
  stakers: bigint;
  status: "open" | "resolved" | "void";
  outcomeYes: boolean;
  feeAmount: bigint;
  feeCollected: boolean;
  yesTotal: bigint;
  noTotal: bigint;
  resolvedAtMs: bigint;
  evidence: string;
}

export interface StakeConfig {
  id: string;
  treasury: string;
  feeBps: bigint;
  minStake: bigint;
  maxStakePerUser: bigint;
  maxPool: bigint;
  refundAfterMs: bigint;
  minResolveDelayMs: bigint;
  challengeMs: bigint;
  registryTableId: string;
}

export interface StakePosition {
  side: boolean;
  amount: bigint;
  claimed: boolean;
}

const STATUSES = ["open", "resolved", "void"] as const;

export function parsePool(data: Uint8Array): StakePool {
  const raw = PoolBcs.parse(data);
  const status = STATUSES[raw.status];
  if (!status) throw new Error(`unknown pool status ${raw.status}`);
  return {
    id: raw.id,
    questionHash: bytesToHex(raw.question_hash),
    closeMs: BigInt(raw.close_ms),
    feeBps: BigInt(raw.fee_bps),
    minResolveDelayMs: BigInt(raw.min_resolve_delay_ms),
    challengeMs: BigInt(raw.challenge_ms),
    yes: BigInt(raw.yes.value),
    no: BigInt(raw.no.value),
    positionsTableId: raw.positions.id,
    stakers: BigInt(raw.positions.size),
    status,
    outcomeYes: raw.outcome,
    feeAmount: BigInt(raw.fee_amount),
    feeCollected: raw.fee_collected,
    yesTotal: BigInt(raw.yes_total),
    noTotal: BigInt(raw.no_total),
    resolvedAtMs: BigInt(raw.resolved_at_ms),
    evidence: new TextDecoder().decode(new Uint8Array(raw.evidence)),
  };
}

export function parseConfig(data: Uint8Array): StakeConfig {
  const raw = ConfigBcs.parse(data);
  return {
    id: raw.id,
    treasury: raw.treasury,
    feeBps: BigInt(raw.fee_bps),
    minStake: BigInt(raw.min_stake),
    maxStakePerUser: BigInt(raw.max_stake_per_user),
    maxPool: BigInt(raw.max_pool),
    refundAfterMs: BigInt(raw.refund_after_ms),
    minResolveDelayMs: BigInt(raw.min_resolve_delay_ms),
    challengeMs: BigInt(raw.challenge_ms),
    registryTableId: raw.registry.id,
  };
}

export function parsePosition(data: Uint8Array): StakePosition {
  const raw = PositionBcs.parse(data);
  return { side: raw.side, amount: BigInt(raw.amount), claimed: raw.claimed };
}

/** Reads a pool. With `packageId`, refuses any object that is not that package's Pool. */
export async function readPool(client: SuiGrpcClient, poolId: string, packageId?: string): Promise<StakePool> {
  const { object } = await client.core.getObject({ objectId: poolId, include: { content: true } });
  if (packageId && object.type !== `${packageId}::pool::Pool`) throw new Error("not_a_stake_pool");
  return parsePool(object.content);
}

export async function readConfig(client: SuiGrpcClient, configId: string): Promise<StakeConfig> {
  const { object } = await client.core.getObject({ objectId: configId, include: { content: true } });
  return parseConfig(object.content);
}

/** The position of `owner` in a pool, or null when they have not staked. */
export async function readPosition(
  client: SuiGrpcClient,
  pool: Pick<StakePool, "positionsTableId">,
  owner: string,
): Promise<StakePosition | null> {
  try {
    const { dynamicField } = await client.core.getDynamicField({
      parentId: pool.positionsTableId,
      name: { type: "address", bcs: bcs.Address.serialize(owner).toBytes() },
    });
    return parsePosition(dynamicField.value.bcs);
  } catch (error) {
    if (/not.?found|does not exist/i.test(String((error as Error)?.message ?? error))) return null;
    throw error;
  }
}
