// Soothia staking: typed transaction builders for soothia_stake::pool.

import { Transaction } from "@mysten/sui/transactions";
import { hexToBytes } from "../recall/sui";

export interface StakeIds {
  packageId: string;
  configId: string;
}

const HASH_HEX = /^(0x)?[0-9a-f]{64}$/i;
export const MAX_EVIDENCE_BYTES = 200;

function hashBytes(name: string, hex: string): number[] {
  if (!HASH_HEX.test(hex)) throw new Error(`${name} must be 32 bytes of hex`);
  return Array.from(hexToBytes(hex));
}

const target = (ids: Pick<StakeIds, "packageId">, fn: string): `${string}::${string}::${string}` => `${ids.packageId}::pool::${fn}`;

export function buildCreatePool(ids: StakeIds, input: { resolverCap: string; questionHash: string; closeMs: bigint }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "create_pool"),
    arguments: [
      tx.object(input.resolverCap),
      tx.object(ids.configId),
      tx.pure.vector("u8", hashBytes("questionHash", input.questionHash)),
      tx.pure.u64(input.closeMs),
      tx.object.clock(),
    ],
  });
  return tx;
}

/** Stakes from the sender's gas coin. */
export function buildStake(ids: StakeIds, input: { poolId: string; side: boolean; amount: bigint; pickHash: string }): Transaction {
  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [input.amount]);
  tx.moveCall({
    target: target(ids, "stake"),
    arguments: [
      tx.object(ids.configId),
      tx.object(input.poolId),
      tx.pure.bool(input.side),
      payment,
      tx.pure.vector("u8", hashBytes("pickHash", input.pickHash)),
      tx.object.clock(),
    ],
  });
  return tx;
}

export function buildResolve(
  ids: Pick<StakeIds, "packageId">,
  input: { resolverCap: string; poolId: string; outcomeYes: boolean; evidence: string },
): Transaction {
  const evidence = Array.from(new TextEncoder().encode(input.evidence));
  if (evidence.length > MAX_EVIDENCE_BYTES) throw new Error(`evidence must be at most ${MAX_EVIDENCE_BYTES} bytes`);
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "resolve"),
    arguments: [
      tx.object(input.resolverCap),
      tx.object(input.poolId),
      tx.pure.bool(input.outcomeYes),
      tx.pure.vector("u8", evidence),
      tx.object.clock(),
    ],
  });
  return tx;
}

export function buildClaim(ids: Pick<StakeIds, "packageId">, input: { poolId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({ target: target(ids, "claim"), arguments: [tx.object(input.poolId), tx.object.clock()] });
  return tx;
}

/** Sends a resolved pool's fee to the treasury after the challenge window. Anyone can call it. */
export function buildCollectFee(ids: StakeIds, input: { poolId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "collect_fee"),
    arguments: [tx.object(ids.configId), tx.object(input.poolId), tx.object.clock()],
  });
  return tx;
}

export function buildOverturn(ids: Pick<StakeIds, "packageId">, input: { adminCap: string; poolId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "overturn"),
    arguments: [tx.object(input.adminCap), tx.object(input.poolId), tx.object.clock()],
  });
  return tx;
}

export function buildSetDelays(ids: StakeIds, input: { adminCap: string; minResolveDelayMs: bigint; challengeMs: bigint }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "set_delays"),
    arguments: [
      tx.object(input.adminCap),
      tx.object(ids.configId),
      tx.pure.u64(input.minResolveDelayMs),
      tx.pure.u64(input.challengeMs),
    ],
  });
  return tx;
}
