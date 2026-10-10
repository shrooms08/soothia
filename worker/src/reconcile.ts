// Sweeps stored buy orders that Panta has not been told about yet. A share-page
// (or extension) bet can land on-chain without the client ever calling back:
// the tab closes, the callback fails, the phone sleeps. Every five minutes
// (cron) and on each /stats refresh, this finds those orders and finishes
// them: submit -> verify -> report, all idempotent on Panta's side (attribution
// is keyed by signature), so nothing is ever counted twice.
//
// Orders with a known signature are finished directly. Orders without one are
// matched to the wallet's recent transactions: a confirmed transaction that
// calls Panta's program and touches the order's market, landed after the order
// was built, is the bet.
import { finishBuy, saveRecord, type BuyRecord } from "./buy";
import type { Env } from "./http";
import { rpc } from "./rpc";
import { kvPut } from "./store";

export const PANTA_PROGRAM = "6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp";
const RECORD_TTL_SEC = 30 * 24 * 3600;
const MAX_ORDERS_PER_RUN = 25;
/** Leave an order alone for this long between looks. */
const LOOK_INTERVAL_MS = 4 * 60_000;
/** Stop looking for a signature after this long; the quote expired long before. */
const GIVE_UP_AFTER_MS = 48 * 3600_000;
const SIGNATURES_PER_WALLET = 20;

interface SignatureRow {
  signature: string;
  blockTime?: number | null;
  err?: unknown;
}

interface TxRow {
  transaction?: { message?: { accountKeys?: ({ pubkey: string } | string)[] } };
  meta?: { err?: unknown };
}

export interface ReconcileDeps {
  listOrders(): Promise<{ orderId: string; createdAtMs: number }[]>;
  load(orderId: string): Promise<BuyRecord | null>;
  save(orderId: string, record: BuyRecord): Promise<void>;
  /** Whether a signature is already attached to some order. */
  taken(signature: string): Promise<boolean>;
  claim(signature: string, orderId: string): Promise<void>;
  signaturesFor(wallet: string): Promise<SignatureRow[]>;
  transaction(signature: string): Promise<TxRow | null>;
  finish(record: BuyRecord, signature: string): Promise<{ attributed: boolean; status: string }>;
  now(): number;
}

export function reconcileDeps(env: Env): ReconcileDeps {
  return {
    listOrders: async () => {
      const out: { orderId: string; createdAtMs: number }[] = [];
      let cursor: string | undefined;
      do {
        const page = await env.SOOTHIA_CACHE.list({ prefix: "buy:ord_", cursor });
        for (const key of page.keys) {
          // KV reports the absolute expiry; the record was written TTL seconds before it.
          const createdAtMs = key.expiration ? (key.expiration - RECORD_TTL_SEC) * 1000 : 0;
          out.push({ orderId: key.name.slice("buy:".length), createdAtMs });
        }
        cursor = page.list_complete ? undefined : page.cursor;
      } while (cursor);
      return out;
    },
    load: (orderId) => env.SOOTHIA_CACHE.get(`buy:${orderId}`, "json") as Promise<BuyRecord | null>,
    save: (orderId, record) => saveRecord(env, orderId, record),
    taken: async (signature) => (await env.SOOTHIA_CACHE.get(`sig:${signature}`)) !== null,
    claim: async (signature, orderId) => { await kvPut(env, `sig:${signature}`, orderId, { expirationTtl: RECORD_TTL_SEC }); },
    signaturesFor: (wallet) => rpc<SignatureRow[]>(env, "getSignaturesForAddress", [wallet, { limit: SIGNATURES_PER_WALLET, commitment: "confirmed" }]),
    transaction: (signature) =>
      rpc<TxRow | null>(env, "getTransaction", [signature, { encoding: "json", commitment: "confirmed", maxSupportedTransactionVersion: 0 }]),
    finish: async (record, signature) => {
      const status = await finishBuy(env, record, signature, 0);
      return { attributed: status.attributed, status: status.status };
    },
    now: () => Date.now(),
  };
}

const keyOf = (key: { pubkey: string } | string): string => (typeof key === "string" ? key : key.pubkey);

/** The wallet's most recent confirmed transaction that is a Panta trade on this market, landed after the order. */
export async function findBetSignature(deps: ReconcileDeps, record: BuyRecord, createdAtMs: number): Promise<string | null> {
  const rows = await deps.signaturesFor(record.wallet);
  const notBefore = Math.floor(createdAtMs / 1000) - 60;
  for (const row of rows) {
    if (row.err) continue;
    if (typeof row.blockTime === "number" && row.blockTime < notBefore) continue;
    if (await deps.taken(row.signature)) continue;
    const tx = await deps.transaction(row.signature);
    if (!tx || tx.meta?.err) continue;
    const keys = (tx.transaction?.message?.accountKeys ?? []).map(keyOf);
    if (keys.includes(PANTA_PROGRAM) && keys.includes(record.marketId) && keys[0] === record.wallet) return row.signature;
  }
  return null;
}

export interface ReconcileReport {
  looked: number;
  attributed: string[];
  found: string[];
  skipped: number;
}

// When each order was last looked at, in memory: no KV write just to say "looked".
const lastLook = new Map<string, number>();

export async function reconcileOrders(deps: ReconcileDeps): Promise<ReconcileReport> {
  const report: ReconcileReport = { looked: 0, attributed: [], found: [], skipped: 0 };
  const now = deps.now();
  const orders = (await deps.listOrders()).sort((a, b) => b.createdAtMs - a.createdAtMs);
  for (const { orderId, createdAtMs } of orders) {
    if (report.looked >= MAX_ORDERS_PER_RUN) break;
    const record = await deps.load(orderId);
    if (!record?.orderId || record.attributed) continue;
    const looked = lastLook.get(orderId) ?? record.reconciledAt ?? 0;
    if (now - looked < LOOK_INTERVAL_MS) { report.skipped++; continue; }
    if (!record.signature && now - createdAtMs > GIVE_UP_AFTER_MS) continue;
    report.looked++;
    lastLook.set(orderId, now);

    let signature = record.signature ?? null;
    if (!signature) {
      try {
        signature = await findBetSignature(deps, record, createdAtMs);
      } catch {
        signature = null;
      }
      if (signature) {
        await deps.claim(signature, orderId);
        report.found.push(orderId);
      }
    }
    // Write back only when something changed: a signature found or the attribution done.
    const next: BuyRecord = { ...record, ...(signature ? { signature } : {}) };
    let changed = Boolean(signature && signature !== record.signature);
    if (signature) {
      try {
        const result = await deps.finish(next, signature);
        if (result.attributed && !record.attributed) {
          next.attributed = true;
          changed = true;
          report.attributed.push(orderId);
        }
      } catch {
        // Try again next sweep.
      }
    }
    if (changed) await deps.save(orderId, next);
  }
  return report;
}

/** For tests. */
export function resetReconcileState(): void {
  lastLook.clear();
}
