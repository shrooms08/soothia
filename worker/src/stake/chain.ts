// Soothia staking: everything the Worker asks of Sui, through Tatum's gRPC gateway.
// The routes and the sweep depend on this interface, so tests can fake the chain.
// RESOLVER_KEY signs here and nowhere else in the Worker. The commit wallet also signs
// here, only for the two drill steps that need a staker.

import { bcs } from "@mysten/sui/bcs";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import type { RecallEnv } from "../recall/env";
import { bytesToHex, commitKeypair, hexToBytes, resolverKeypair, tatumConfigured } from "../recall/sui";
import { tatumSuiClient } from "../recall/tatumGrpc";
import { ClaimedBcs, PoolCreatedBcs, readConfig, readPool, readPosition, StakedBcs, type StakeConfig, type StakePool, type StakePosition } from "./readers";
import { buildClaim, buildCollectFee, buildCreatePool, buildResolve, buildStake, buildVoid, type StakeIds } from "./transactions";

const WORKER_GAS_BUDGET = 20_000_000;
const SETTLE_MS = 30_000;

export interface StakedEvent {
  poolId: string;
  staker: string;
  side: boolean;
  amount: bigint;
  pickHash: string;
  /** The address that sent the transaction. */
  sender: string;
}

export interface StakeTransaction {
  succeeded: boolean;
  staked: StakedEvent[];
}

export interface StakeChain {
  readConfig(): Promise<StakeConfig>;
  /** The pool registered for a question, or null. */
  findPoolId(config: StakeConfig, questionHash: string): Promise<string | null>;
  readPool(poolId: string): Promise<StakePool>;
  readPosition(pool: StakePool, owner: string): Promise<StakePosition | null>;
  balanceOf(owner: string): Promise<bigint>;
  /** A transaction's Staked events from this package, or null when it cannot be found. */
  readStakeTransaction(digest: string): Promise<StakeTransaction | null>;
  /** Sets sender and budget, resolves gas and objects through Tatum, and returns base64 bytes. */
  buildForSender(tx: Transaction, sender: string, gasBudget: number): Promise<string>;
  createPool(questionHash: string, closeMs: bigint): Promise<{ poolId: string; digest: string }>;
  resolvePool(poolId: string, outcomeYes: boolean, evidence: string): Promise<string>;
  voidPool(poolId: string): Promise<string>;
  collectFee(poolId: string): Promise<string>;
  /** The address that owns an object, or null for a shared or wrapped one. */
  objectOwner(objectId: string): Promise<string | null>;
  gasWalletAddress(): string | null;
  stakeFromGasWallet(poolId: string, amount: bigint, pickHash: string): Promise<string>;
  claimFromGasWallet(poolId: string): Promise<{ digest: string; amount: bigint }>;
}

export interface StakeSettings extends StakeIds {
  resolverCap: string;
}

/** The staking ids from the environment, or null when any is missing. */
export function stakeSettings(env: RecallEnv): StakeSettings | null {
  const packageId = env.STAKE_PACKAGE?.trim();
  const configId = env.STAKE_CONFIG?.trim();
  const resolverCap = env.STAKE_RESOLVER_CAP?.trim();
  if (!packageId || !configId || !resolverCap || !tatumConfigured(env)) return null;
  return { packageId, configId, resolverCap };
}

const isNotFound = (error: unknown): boolean => /not.?found|does not exist/i.test(String((error as Error)?.message ?? error));

export function tatumStakeChain(env: RecallEnv, settings: StakeSettings): StakeChain {
  const client = tatumSuiClient(env.TATUM_API_KEY.trim());
  const stakedType = `${settings.packageId}::pool::Staked`;

  async function signAndSend(signer: Ed25519Keypair | null, tx: Transaction, missing: string) {
    if (!signer) throw new Error(missing);
    tx.setSender(signer.toSuiAddress());
    tx.setGasBudget(WORKER_GAS_BUDGET);
    const result = await client.core.signAndExecuteTransaction({ transaction: tx, signer, include: { events: true } });
    if (result.$kind === "FailedTransaction") {
      throw new Error(`tx_failed: ${JSON.stringify(result.FailedTransaction.status.error).slice(0, 200)}`);
    }
    // Lets the gas coin and the cap settle before the next transaction reads them.
    await client.core.waitForTransaction({ result, timeout: SETTLE_MS }).catch(() => undefined);
    return result.Transaction;
  }

  const asResolver = (tx: Transaction) => signAndSend(resolverKeypair(env), tx, "resolver_not_configured");
  const asGasWallet = (tx: Transaction) => signAndSend(commitKeypair(env), tx, "gas_wallet_not_configured");

  return {
    readConfig: () => readConfig(client, settings.configId),

    async findPoolId(config, questionHash) {
      try {
        const { dynamicField } = await client.core.getDynamicField({
          parentId: config.registryTableId,
          name: { type: "vector<u8>", bcs: bcs.vector(bcs.u8()).serialize(Array.from(hexToBytes(questionHash))).toBytes() },
        });
        return bcs.Address.parse(dynamicField.value.bcs);
      } catch (error) {
        if (isNotFound(error)) return null;
        throw error;
      }
    },

    readPool: (poolId) => readPool(client, poolId, settings.packageId),
    readPosition: (pool, owner) => readPosition(client, pool, owner),

    async balanceOf(owner) {
      const { balance } = await client.core.getBalance({ owner });
      return BigInt(balance.balance);
    },

    async readStakeTransaction(digest) {
      let result;
      try {
        result = await client.core.getTransaction({ digest, include: { events: true } });
      } catch (error) {
        // Tatum answers an unknown digest with no message at all. The caller only retries.
        if (isNotFound(error) || /tatum_grpc_empty_response/.test(String((error as Error)?.message))) return null;
        throw error;
      }
      const tx = result.Transaction ?? result.FailedTransaction;
      const staked = tx.events
        // The full type, because anyone can publish a module with the same names.
        .filter((event) => event.eventType === stakedType)
        .map((event) => {
          const parsed = StakedBcs.parse(event.bcs);
          return {
            poolId: parsed.pool,
            staker: parsed.staker,
            side: parsed.side,
            amount: BigInt(parsed.amount),
            pickHash: bytesToHex(parsed.pick_hash),
            sender: event.sender,
          };
        });
      return { succeeded: result.$kind === "Transaction", staked };
    },

    async buildForSender(tx, sender, gasBudget) {
      tx.setSender(sender);
      tx.setGasBudget(gasBudget);
      return toBase64(await tx.build({ client }));
    },

    async createPool(questionHash, closeMs) {
      const result = await asResolver(buildCreatePool(settings, { resolverCap: settings.resolverCap, questionHash, closeMs }));
      const created = result.events.find((event) => event.eventType === `${settings.packageId}::pool::PoolCreated`);
      if (!created) throw new Error(`pool created without an event: ${result.digest}`);
      return { poolId: PoolCreatedBcs.parse(created.bcs).pool, digest: result.digest };
    },

    async resolvePool(poolId, outcomeYes, evidence) {
      return (await asResolver(buildResolve(settings, { resolverCap: settings.resolverCap, poolId, outcomeYes, evidence }))).digest;
    },

    async voidPool(poolId) {
      return (await asResolver(buildVoid(settings, { resolverCap: settings.resolverCap, poolId }))).digest;
    },

    async collectFee(poolId) {
      return (await asResolver(buildCollectFee(settings, { poolId }))).digest;
    },

    async objectOwner(objectId) {
      const { object } = await client.core.getObject({ objectId });
      return object.owner.$kind === "AddressOwner" ? object.owner.AddressOwner : null;
    },

    gasWalletAddress: () => commitKeypair(env)?.toSuiAddress() ?? null,

    async stakeFromGasWallet(poolId, amount, pickHash) {
      return (await asGasWallet(buildStake(settings, { poolId, side: true, amount, pickHash }))).digest;
    },

    async claimFromGasWallet(poolId) {
      const result = await asGasWallet(buildClaim(settings, { poolId }));
      const claimed = result.events.find((event) => event.eventType === `${settings.packageId}::pool::Claimed`);
      if (!claimed) throw new Error(`claimed without an event: ${result.digest}`);
      return { digest: result.digest, amount: BigInt(ClaimedBcs.parse(claimed.bcs).amount) };
    },
  };
}
