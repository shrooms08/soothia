// Total Recall: Sui through Tatum. Every on-chain read and write in this
// feature goes through Tatum's Sui mainnet RPC gateway:
//
//  - commitPick: before the event, the SHA-256 of a pick is committed in a Sui
//    transaction that calls soothia_recall::recall::commit (move/soothia_recall),
//    which emits a PickCommitted event. That is the proof a call was made
//    before kickoff, independent of Soothia's own clock.
//  - verifyCommit: reads the transaction back (checkpoint, timestamp, event)
//    and checks the hash.
//  - memoryAccount: reads the Walrus Memory account object, so the record page
//    can show who owns the memory on Sui.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { JsonRpcHTTPTransport, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";
import type { RecallEnv } from "./env";
import { tatumSuiClient } from "./tatumGrpc";

export const TATUM_SUI_MAINNET = "https://sui-mainnet.gateway.tatum.io";

export function tatumConfigured(env: RecallEnv): boolean {
  return Boolean(env.TATUM_API_KEY?.trim());
}

/** One raw JSON-RPC call to Sui mainnet through Tatum. */
export async function tatumRpc<T>(env: RecallEnv, method: string, params: unknown[] = []): Promise<T> {
  const response = await fetch(env.TATUM_SUI_URL?.trim() || TATUM_SUI_MAINNET, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": env.TATUM_API_KEY.trim(),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`tatum_http_${response.status}`);
  const body = (await response.json()) as { result?: T; error?: { message?: string } };
  if (body.error) throw new Error(`tatum_rpc: ${String(body.error.message ?? "error").slice(0, 120)}`);
  return body.result as T;
}

let cachedClient: SuiJsonRpcClient | null = null;

/** The Sui SDK client, with every request sent to Tatum's gateway. */
function suiClient(env: RecallEnv): SuiJsonRpcClient {
  if (cachedClient) return cachedClient;
  cachedClient = new SuiJsonRpcClient({
    network: "mainnet",
    transport: new JsonRpcHTTPTransport({
      url: env.TATUM_SUI_URL?.trim() || TATUM_SUI_MAINNET,
      rpc: { headers: { "x-api-key": env.TATUM_API_KEY.trim() } },
    }),
  });
  return cachedClient;
}

/** The key that pays for commits: SUI_COMMIT_KEY, else the Walrus Memory delegate key. */
export function commitKeypair(env: RecallEnv): Ed25519Keypair | null {
  const raw = (env.SUI_COMMIT_KEY?.trim() || env.MEMWAL_KEY?.trim()) ?? "";
  if (!raw) return null;
  try {
    if (raw.startsWith("suiprivkey")) return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(raw).secretKey);
    const hex = raw.replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return Ed25519Keypair.fromSecretKey(bytes);
  } catch {
    return null;
  }
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

/** Commits a pick's hash on Sui mainnet. Returns the transaction digest. */
export async function commitPick(env: RecallEnv, hashHex: string, pickId: string): Promise<string> {
  const signer = commitKeypair(env);
  if (!signer || !env.SOOTHIA_RECALL_PACKAGE?.trim()) throw new Error("commit_not_configured");
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  tx.setGasBudget(5_000_000);
  tx.moveCall({
    target: `${env.SOOTHIA_RECALL_PACKAGE.trim()}::recall::commit`,
    arguments: [
      tx.pure.vector("u8", Array.from(hexToBytes(hashHex))),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(pickId))),
    ],
  });
  const result = await suiClient(env).signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: { showEffects: true },
  });
  if (result.effects?.status?.status && result.effects.status.status !== "success")
    throw new Error(`commit_failed: ${result.effects.status.error ?? "unknown"}`);
  return result.digest;
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

interface TxBlock {
  digest: string;
  timestampMs?: string;
  checkpoint?: string;
  transaction?: { data?: { sender?: string } };
  events?: { type: string; parsedJson?: { hash?: number[] | string; pick_id?: number[] | string } }[];
  effects?: { status?: { status?: string } };
}

function bytesFromEvent(value: number[] | string | undefined): string | null {
  if (Array.isArray(value)) return value.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (typeof value === "string") {
    // Some RPCs render vector<u8> as base64.
    try {
      const binary = atob(value);
      return [...binary].map((char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    } catch {
      return null;
    }
  }
  return null;
}

/** Reads a commit back through Tatum and checks it carries the expected hash. */
export async function verifyCommit(env: RecallEnv, digest: string, expectedHash: string): Promise<CommitProof> {
  const explorerUrl = `https://suivision.xyz/txblock/${digest}`;
  try {
    const tx = await tatumRpc<TxBlock>(env, "sui_getTransactionBlock", [
      digest,
      { showInput: true, showEvents: true, showEffects: true },
    ]);
    const event = tx.events?.find((candidate) => candidate.type.endsWith("::recall::PickCommitted"));
    const hash = bytesFromEvent(event?.parsedJson?.hash);
    const ok = tx.effects?.status?.status === "success" && hash === expectedHash.toLowerCase();
    return {
      digest,
      verified: ok,
      timestampMs: tx.timestampMs ? Number(tx.timestampMs) : null,
      checkpoint: tx.checkpoint ?? null,
      sender: tx.transaction?.data?.sender ?? null,
      hash,
      explorerUrl,
      ...(ok ? {} : { problem: event ? "hash_mismatch" : "no_commit_event" }),
    };
  } catch (error) {
    return {
      digest,
      verified: false,
      timestampMs: null,
      checkpoint: null,
      sender: null,
      hash: null,
      explorerUrl,
      problem: String((error as Error)?.message ?? "unavailable").slice(0, 120),
    };
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
  return { checkpoint: sequence.toString(), timestampMs: Number(timestamp.seconds) * 1000 + Math.floor(timestamp.nanos / 1_000_000) };
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
