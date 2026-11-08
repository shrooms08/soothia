// Total Recall: the Walrus Memory client. Walrus Memory (MemWal) is the source
// of truth for every pick, outcome, lesson and preference; this Worker keeps
// only a short-lived read cache and a small "still open" index for the
// resolution sweep. Delete both and the record rebuilds from Walrus.
//
// The relayer embeds, encrypts (Seal) and stores each memory on Walrus
// mainnet; ownership of the memory account lives on Sui.

import { MemWal } from "@mysten-incubation/memwal";
import type { RecallEnv } from "./env";
import { cacheGet, cachePut } from "../store";
import {
  decodeRecord,
  encodeRecord,
  namespaceFor,
  RECORD_KINDS,
  type RecordByKind,
  type RecordKind,
} from "./records";

export const MAINNET_RELAYER = "https://relayer.memory.walrus.xyz";

/** A memory with its distance from the query (0 is identical). */
export interface RecalledText {
  text: string;
  distance: number;
  blobId: string;
}

/** The three calls Soothia needs; MemWal in production, a fake in tests. */
export interface MemoryBackend {
  remember(namespace: string, text: string): Promise<{ blobId: string | null; jobId: string }>;
  recall(namespace: string, query: string, limit: number, sort: "relevance" | "recent"): Promise<RecalledText[]>;
}

export function memwalConfigured(env: RecallEnv): boolean {
  return Boolean(env.MEMWAL_KEY?.trim() && env.MEMWAL_ACCOUNT_ID?.trim());
}

let cachedClient: { key: string; client: MemWal } | null = null;

function client(env: RecallEnv): MemWal {
  const key = `${env.MEMWAL_ACCOUNT_ID}:${env.MEMWAL_SERVER_URL ?? ""}`;
  if (cachedClient?.key === key) return cachedClient.client;
  const created = MemWal.create({
    key: env.MEMWAL_KEY.trim(),
    accountId: env.MEMWAL_ACCOUNT_ID.trim(),
    serverUrl: env.MEMWAL_SERVER_URL?.trim() || MAINNET_RELAYER,
    namespace: "soothia",
    requestTimeoutMs: 25_000,
    recallTimeoutMs: 12_000,
  });
  cachedClient = { key, client: created };
  return created;
}

export function memwalBackend(env: RecallEnv): MemoryBackend {
  return {
    async remember(namespace, text) {
      const job = await client(env).remember(text, namespace);
      return { blobId: null, jobId: job.job_id };
    },
    async recall(namespace, query, limit, sort) {
      const result = await client(env).recall({ query, namespace, limit, sort });
      return result.results.map((hit) => ({ text: hit.text, distance: hit.distance, blobId: hit.blob_id }));
    },
  };
}

/** The relayer's health, for /recall/status. Needs no credentials. */
export async function memwalHealth(env: RecallEnv): Promise<unknown> {
  if (!memwalConfigured(env)) return { configured: false };
  try {
    return { configured: true, health: await client(env).health() };
  } catch (error) {
    return { configured: true, error: String((error as Error)?.message ?? error).slice(0, 200) };
  }
}

// A generic query per kind: with sort "recent" the relayer widens the
// candidate set and returns the newest, which is how "all my picks" is read.
const LIST_QUERY: Record<RecordKind, string> = {
  pick: "Call: my prediction on a question",
  outcome: "How my call resolved",
  lesson: "Lesson about my calls",
  pref: "Preference for where Soothia shows calls",
};
const LIST_LIMIT = 100;
const READ_CACHE_SEC = 45;

/** Every install gets a short, stable, non-reversible key: 16 hex of SHA-256. */
export async function userKeyFor(installId: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`soothia-recall:${installId}`));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** One user's view of Walrus Memory, by record kind. */
export class RecallStore {
  constructor(
    private readonly backend: MemoryBackend,
    readonly userKey: string,
    private readonly cache = true,
  ) {}

  private cacheKey(kind: RecordKind): string {
    return `recall:${this.userKey}:${kind}`;
  }

  async write<K extends RecordKind>(kind: K, record: RecordByKind[K]): Promise<{ jobId: string }> {
    const result = await this.backend.remember(namespaceFor(this.userKey, kind), encodeRecord(kind, record));
    // Read-your-writes: fold the new record into the cached list straight away,
    // because the relayer embeds and stores asynchronously.
    if (this.cache) {
      const current = await this.list(kind).catch(() => [] as RecordByKind[K][]);
      const same = JSON.stringify(record);
      const merged = [record, ...current.filter((existing) => JSON.stringify(existing) !== same)];
      await cachePut(this.cacheKey(kind), merged, READ_CACHE_SEC);
    }
    return { jobId: result.jobId };
  }

  /** Every record of a kind for this user, newest first. */
  async list<K extends RecordKind>(kind: K, fresh = false): Promise<RecordByKind[K][]> {
    if (this.cache && !fresh) {
      const cached = await cacheGet<RecordByKind[K][]>(this.cacheKey(kind));
      if (cached) return cached;
    }
    const hits = await this.backend.recall(namespaceFor(this.userKey, kind), LIST_QUERY[kind], LIST_LIMIT, "recent");
    const records = hits
      .map((hit) => decodeRecord(kind, hit.text))
      .filter((record): record is RecordByKind[K] => record !== null);
    if (this.cache) await cachePut(this.cacheKey(kind), records, READ_CACHE_SEC);
    return records;
  }

  /** Semantic search inside one kind: "what have I said about this before?" */
  async search<K extends RecordKind>(
    kind: K,
    query: string,
    limit = 5,
  ): Promise<{ record: RecordByKind[K]; distance: number }[]> {
    const hits = await this.backend.recall(namespaceFor(this.userKey, kind), query, limit, "relevance");
    const out: { record: RecordByKind[K]; distance: number }[] = [];
    for (const hit of hits) {
      const record = decodeRecord(kind, hit.text);
      if (record) out.push({ record, distance: hit.distance });
    }
    return out;
  }

  async listAll(): Promise<{ [K in RecordKind]: RecordByKind[K][] }> {
    const [pick, outcome, lesson, pref] = await Promise.all(RECORD_KINDS.map((kind) => this.list(kind)));
    return {
      pick: pick as RecordByKind["pick"][],
      outcome: outcome as RecordByKind["outcome"][],
      lesson: lesson as RecordByKind["lesson"][],
      pref: pref as RecordByKind["pref"][],
    };
  }
}
