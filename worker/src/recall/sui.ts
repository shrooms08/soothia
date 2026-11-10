// Total Recall: Sui through Tatum's gRPC gateway, fetch only, so it runs in Workers:
//
//  - commitPick: before the event, the SHA-256 of a pick is committed in a Sui
//    transaction that calls soothia_recall::recall::commit (move/soothia_recall),
//    which emits a PickCommitted event. That is the proof a call was made
//    before kickoff, independent of Soothia's own clock.
//  - verifyCommit: reads the transaction back (checkpoint, timestamp, event)
//    and checks the hash.
//  - memoryAccount: reads the Walrus Memory account object, so the record page
//    can show who owns the memory on Sui.

import { bcs } from "@mysten/sui/bcs";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import type { RecallEnv } from "./env";
import { tatumSuiClient } from "./tatumGrpc";

const COMMIT_GAS_BUDGET = 5_000_000;
const COMMIT_SETTLE_MS = 30_000;

export function tatumConfigured(env: RecallEnv): boolean {
  return Boolean(env.TATUM_API_KEY?.trim());
}

function keypairFrom(raw: string): Ed25519Keypair | null {
  if (!raw) return null;
  try {
    if (raw.startsWith("suiprivkey")) return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(raw).secretKey);
    const hex = raw.replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
    return Ed25519Keypair.fromSecretKey(hexToBytes(hex));
  } catch {
    return null;
  }
}

/** The key that pays for commits: SUI_COMMIT_KEY, else the Walrus Memory delegate key. */
export function commitKeypair(env: RecallEnv): Ed25519Keypair | null {
  return keypairFrom((env.SUI_COMMIT_KEY?.trim() || env.MEMWAL_KEY?.trim()) ?? "");
}

/** The key that holds the staking ResolverCap. Used only to create, resolve and void pools. */
export function resolverKeypair(env: RecallEnv): Ed25519Keypair | null {
  return keypairFrom(env.RESOLVER_KEY?.trim() ?? "");
}

export function commitConfigured(env: RecallEnv): boolean {
  return tatumConfigured(env) && Boolean(env.SOOTHIA_RECALL_PACKAGE?.trim()) && commitKeypair(env) !== null;
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function bytesToHex(bytes: Iterable<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Commits a pick's hash on Sui mainnet. Returns the transaction digest. */
export async function commitPick(env: RecallEnv, hashHex: string, pickId: string): Promise<string> {
  const signer = commitKeypair(env);
  const packageId = env.SOOTHIA_RECALL_PACKAGE?.trim();
  if (!signer || !packageId || !tatumConfigured(env)) throw new Error("commit_not_configured");
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  tx.setGasBudget(COMMIT_GAS_BUDGET);
  tx.moveCall({
    target: `${packageId}::recall::commit`,
    arguments: [
      tx.pure.vector("u8", Array.from(hexToBytes(hashHex))),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(pickId))),
    ],
  });
  const client = tatumSuiClient(env.TATUM_API_KEY.trim());
  const result = await client.core.signAndExecuteTransaction({ transaction: tx, signer });
  if (result.$kind === "FailedTransaction")
    throw new Error(`commit_failed: ${JSON.stringify(result.FailedTransaction.status.error).slice(0, 200)}`);
  // The commit already happened; this only lets the gas coin settle before the next one.
  await client.core.waitForTransaction({ result, timeout: COMMIT_SETTLE_MS }).catch(() => undefined);
  return result.Transaction.digest;
}

const PickCommittedEvent = bcs.struct("PickCommitted", {
  hash: bcs.vector(bcs.u8()),
  pick_id: bcs.vector(bcs.u8()),
  committer: bcs.Address,
});

/** Decodes a PickCommitted event's BCS: hash as hex, pick id as text. */
export function decodePickCommitted(data: Uint8Array): { hash: string; pickId: string; committer: string } {
  const event = PickCommittedEvent.parse(data);
  return {
    hash: bytesToHex(event.hash),
    pickId: new TextDecoder().decode(new Uint8Array(event.pick_id)),
    committer: event.committer,
  };
}

/** A PickCommitted event's bytes, for tests. */
export function encodePickCommitted(hashHex: string, pickId: string, committer: string): Uint8Array {
  return PickCommittedEvent.serialize({
    hash: Array.from(hexToBytes(hashHex)),
    pick_id: Array.from(new TextEncoder().encode(pickId)),
    committer,
  }).toBytes();
}

export interface CommitProof {
  digest: string;
  verified: boolean;
  /** Milliseconds since epoch of the checkpoint that included the commit. */
  timestampMs: number | null;
  checkpoint: string | null;
  sender: string | null;
  /** The hash the event carried, hex. */
  hash: string | null;
  explorerUrl: string;
  problem?: string;
}

/** Reads a commit back through Tatum and checks it carries the expected hash. */
export async function verifyCommit(env: RecallEnv, digest: string, expectedHash: string): Promise<CommitProof> {
  const explorerUrl = `https://suivision.xyz/txblock/${digest}`;
  const unproven = (problem: string): CommitProof => ({
    digest,
    verified: false,
    timestampMs: null,
    checkpoint: null,
    sender: null,
    hash: null,
    explorerUrl,
    problem,
  });
  if (!tatumConfigured(env)) return unproven("tatum_not_configured");
  try {
    const result = await tatumSuiClient(env.TATUM_API_KEY.trim()).core.getTransaction({
      digest,
      include: { events: true },
    });
    const tx = result.Transaction ?? result.FailedTransaction;
    // Only our package's event counts: anyone can publish a module with the same name.
    const packageId = env.SOOTHIA_RECALL_PACKAGE?.trim().toLowerCase();
    const event = tx.events.find((candidate) => {
      if (!candidate.eventType.endsWith("::recall::PickCommitted")) return false;
      return !packageId || candidate.packageId.toLowerCase() === packageId;
    });
    const decoded = event ? decodePickCommitted(event.bcs) : null;
    const ok = result.$kind === "Transaction" && decoded?.hash === expectedHash.toLowerCase();
    return {
      digest,
      verified: ok,
      timestampMs: tx.timestampMs,
      checkpoint: tx.checkpoint,
      sender: decoded?.committer ?? null,
      hash: decoded?.hash ?? null,
      explorerUrl,
      ...(ok ? {} : { problem: decoded ? "hash_mismatch" : "no_commit_event" }),
    };
  } catch (error) {
    return unproven(String((error as Error)?.message ?? "unavailable").slice(0, 120));
  }
}

/**
 * Sui mainnet's latest checkpoint through Tatum gRPC, for a pick's anchor, or null
 * when no Tatum key is set. An anchor shows a call was made after checkpoint N. It
 * does not show the call came before kickoff: that takes commitPick.
 */
export async function latestCheckpoint(env: RecallEnv): Promise<{ checkpoint: string; timestampMs: number } | null> {
  if (!tatumConfigured(env)) return null;
  const { response } = await tatumSuiClient(env.TATUM_API_KEY.trim()).ledgerService.getCheckpoint({
    checkpointId: { oneofKind: undefined },
    readMask: { paths: ["sequence_number", "summary.timestamp"] },
  });
  const sequence = response.checkpoint?.sequenceNumber;
  const timestamp = response.checkpoint?.summary?.timestamp;
  if (sequence === undefined || !timestamp) throw new Error("tatum_bad_checkpoint");
  return {
    checkpoint: sequence.toString(),
    timestampMs: Number(timestamp.seconds) * 1000 + Math.floor(timestamp.nanos / 1_000_000),
  };
}

export interface MemoryAccountInfo {
  accountId: string;
  owner: string | null;
  type: string | null;
  checkpoint: string | null;
  explorerUrl: string;
}

/** The Walrus Memory account object on Sui, read through Tatum. */
export async function memoryAccount(env: RecallEnv): Promise<MemoryAccountInfo | null> {
  const accountId = env.MEMWAL_ACCOUNT_ID?.trim();
  if (!accountId || !tatumConfigured(env)) return null;
  const [{ object }, checkpoint] = await Promise.all([
    tatumSuiClient(env.TATUM_API_KEY.trim()).core.getObject({ objectId: accountId, include: { json: true } }),
    latestCheckpoint(env)
      .then((latest) => latest?.checkpoint ?? null)
      .catch(() => null),
  ]);
  const fields = (object.json ?? {}) as Record<string, unknown>;
  const ownerField = typeof fields.owner === "string" ? fields.owner : null;
  return {
    accountId,
    owner: ownerField ?? (object.owner.$kind === "AddressOwner" ? object.owner.AddressOwner : null),
    type: object.type ?? null,
    checkpoint,
    explorerUrl: `https://suivision.xyz/object/${accountId}`,
  };
}
