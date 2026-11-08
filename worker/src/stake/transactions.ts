// Soothia staking: typed transaction builders for soothia_stake::pool.

import { Transaction } from "@mysten/sui/transactions";
import { hexToBytes } from "../recall/sui";

export interface StakeIds {
  packageId: string;
  configId: string;
}

const HASH_HEX = /^(0x)?[0-9a-f]{64}$/i;

function hashBytes(name: string, hex: string): number[] {
  if (!HASH_HEX.test(hex)) throw new Error(`${name} must be 32 bytes of hex`);
  return Array.from(hexToBytes(hex));
}

const target = (ids: StakeIds, fn: string): `${string}::${string}::${string}` => `${ids.packageId}::pool::${fn}`;

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

export function buildResolve(ids: StakeIds, input: { resolverCap: string; poolId: string; outcomeYes: boolean }): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: target(ids, "resolve"),
    arguments: [
      tx.object(input.resolverCap),
      tx.object(ids.configId),
      tx.object(input.poolId),
      tx.pure.bool(input.outcomeYes),
      tx.object.clock(),
    ],
  });
  return tx;
}

export function buildClaim(ids: StakeIds, input: { poolId: string }): Transaction {
  const tx = new Transaction();
  tx.moveCall({ target: target(ids, "claim"), arguments: [tx.object(input.poolId)] });
  return tx;
}
