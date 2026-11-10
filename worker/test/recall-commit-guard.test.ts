// Total Recall: the spending guard on Worker commits, with KV and the balance faked.
// No network. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import { cachePut, clearMemoryCache } from "../src/store";
import {
  BALANCE_CACHE_KEY,
  checkCommitGuard,
  GLOBAL_DAILY_CAP,
  MIN_BALANCE_MIST,
  OWNER_DAILY_CAP,
  USER_DAILY_CAP,
} from "../src/recall/commitGuard";
import type { PickInput } from "../src/recall/picks";
import type { RecallStore } from "../src/recall/memory";
import type { PickRecord } from "../src/recall/records";
import { savePick } from "../src/recall/routes";

const NOW = new Date("2026-11-08T12:00:00.000Z");
const DAY = "2026-11-08";
const RICH = { now: NOW, readBalance: async () => 1_000_000_000n };

function fakeEnv(owners = ""): { env: Env; kv: Map<string, string>; ttls: Map<string, unknown> } {
  const kv = new Map<string, string>();
  const ttls = new Map<string, unknown>();
  const env = {
    RECALL_OWNER_KEYS: owners,
    TATUM_API_KEY: "test",
    MEMWAL_KEY: "11".repeat(32),
    SOOTHIA_RECALL_PACKAGE: "0x1",
    SOOTHIA_CACHE: {
      get: async (key: string) => kv.get(key) ?? null,
      put: async (key: string, value: string, options: { expirationTtl?: number }) => {
        kv.set(key, value);
        ttls.set(key, options?.expirationTtl);
      },
    },
  } as unknown as Env;
  return { env, kv, ttls };
}

beforeEach(() => clearMemoryCache());

test("a commit is allowed and counted under both keys for two days", async () => {
  const { env, kv, ttls } = fakeEnv();
  assert.equal(await checkCommitGuard(env, "u1", RICH), null);
  assert.equal(kv.get(`commitcap:${DAY}:u1`), "1");
  assert.equal(kv.get(`commitcap:${DAY}:all`), "1");
  assert.equal(ttls.get(`commitcap:${DAY}:u1`), 172_800);
});

test("the per-user cap stops the next commit and leaves counters alone", async () => {
  const { env, kv } = fakeEnv();
  for (let i = 0; i < USER_DAILY_CAP; i++) assert.equal(await checkCommitGuard(env, "u1", RICH), null);
  assert.equal(await checkCommitGuard(env, "u1", RICH), "user_cap");
  assert.equal(kv.get(`commitcap:${DAY}:u1`), String(USER_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "u2", RICH), null);
});

test("the per-user cap resets on a new UTC day", async () => {
  const { env, kv } = fakeEnv();
  kv.set(`commitcap:${DAY}:u1`, String(USER_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "u1", { ...RICH, now: new Date("2026-11-09T00:00:00.000Z") }), null);
});

test("the global cap stops every user", async () => {
  const { env, kv } = fakeEnv();
  kv.set(`commitcap:${DAY}:all`, String(GLOBAL_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "u1", RICH), "global_cap");
});

test("an owner key gets the higher cap and others do not", async () => {
  const { env, kv } = fakeEnv(" owner1 , owner2");
  kv.set(`commitcap:${DAY}:owner2`, String(USER_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "owner2", RICH), null);
  kv.set(`commitcap:${DAY}:owner2`, String(OWNER_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "owner2", RICH), "user_cap");
  kv.set(`commitcap:${DAY}:stranger`, String(USER_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "stranger", RICH), "user_cap");
});

test("the owner still counts toward the global cap", async () => {
  const { env, kv } = fakeEnv("owner1");
  kv.set(`commitcap:${DAY}:all`, String(GLOBAL_DAILY_CAP));
  assert.equal(await checkCommitGuard(env, "owner1", RICH), "global_cap");
});

test("a low balance skips the commit, and exactly the floor is allowed", async () => {
  const { env, kv } = fakeEnv();
  assert.equal(
    await checkCommitGuard(env, "u1", { now: NOW, readBalance: async () => MIN_BALANCE_MIST - 1n }),
    "low_balance",
  );
  assert.equal(kv.size, 0);
  clearMemoryCache();
  assert.equal(await checkCommitGuard(env, "u1", { now: NOW, readBalance: async () => MIN_BALANCE_MIST }), null);
});

test("an unreadable balance skips the commit", async () => {
  const { env } = fakeEnv();
  const readBalance = async (): Promise<bigint> => {
    throw new Error("tatum down");
  };
  assert.equal(await checkCommitGuard(env, "u1", { now: NOW, readBalance }), "low_balance");
});

test("the balance is read once and then cached", async () => {
  const { env } = fakeEnv();
  let reads = 0;
  const readBalance = async (): Promise<bigint> => {
    reads += 1;
    return 1_000_000_000n;
  };
  await checkCommitGuard(env, "u1", { now: NOW, readBalance });
  await checkCommitGuard(env, "u1", { now: NOW, readBalance });
  assert.equal(reads, 1);
});

test("a KV read failure fails closed", async () => {
  const { env } = fakeEnv();
  (env.SOOTHIA_CACHE as unknown as { get: () => Promise<string> }).get = async () => {
    throw new Error("kv down");
  };
  assert.equal(await checkCommitGuard(env, "u1", RICH), "kv_unavailable");
});

test("a KV write failure fails closed", async () => {
  const { env } = fakeEnv();
  (env.SOOTHIA_CACHE as unknown as { put: () => Promise<void> }).put = async () => {
    throw new Error("429");
  };
  assert.equal(await checkCommitGuard(env, "u1", RICH), "kv_unavailable");
});

test("a skipped pick is still written, with no commit and the reason", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("no network in tests");
  });
  t.mock.method(console, "warn", () => undefined);
  const { env } = fakeEnv();
  (env.SOOTHIA_CACHE as unknown as { get: () => Promise<string> }).get = async () => {
    throw new Error("kv down");
  };
  await cachePut(BALANCE_CACHE_KEY, "1000000000", 60);

  const written: PickRecord[] = [];
  const store = {
    write: async (_kind: string, record: PickRecord) => {
      written.push(record);
      return { jobId: "job" };
    },
  } as unknown as RecallStore;
  const input: PickInput = {
    question: "Will Arsenal beat Chelsea on Sat 21 Nov?",
    category: "sports",
    pYes: 0.6,
    marketYes: null,
    entities: ["Arsenal", "Chelsea"],
    endTime: "2026-11-21T20:00:00.000Z",
    source: { site: "espn.com", url: "https://www.espn.com" },
  };

  const pick = await savePick(input, env, "u1", store);
  assert.equal(pick.commit, null);
  assert.equal(pick.commitSkipped, "kv_unavailable");
  assert.equal(written.length, 1);
  assert.equal(written[0].commitSkipped, "kv_unavailable");
});
