// Total Recall public stats, with KV faked. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import type { PickRecord } from "../src/recall/records";
import { countPicks, handleStats, rebuildStats, recordNewCall, refreshUserCounts } from "../src/stats";
import { clearMemoryCache } from "../src/store";

function fakeEnv(): { env: Env; kv: Map<string, { value: string; metadata?: unknown }>; puts: () => number } {
  const kv = new Map<string, { value: string; metadata?: unknown }>();
  let puts = 0;
  const env = {
    SOOTHIA_CACHE: {
      get: async (key: string) => {
        const entry = kv.get(key);
        return entry ? JSON.parse(entry.value) : null;
      },
      put: async (key: string, value: string, options?: { metadata?: unknown }) => {
        puts += 1;
        kv.set(key, { value, metadata: options?.metadata });
      },
      list: async ({ prefix }: { prefix: string }) => ({
        keys: [...kv.entries()]
          .filter(([key]) => key.startsWith(prefix))
          .map(([name, entry]) => ({ name, metadata: entry.metadata })),
        list_complete: true,
      }),
    },
  } as unknown as Env;
  return { env, kv, puts: () => puts };
}

const read = async (env: Env) => {
  clearMemoryCache();
  const response = await handleStats(new Request("https://api.soothia.fun/stats"), env);
  return (await response.json()) as Record<string, number>;
};

beforeEach(() => clearMemoryCache());

test("stats start at zero and public profiles are always zero for now", async () => {
  const { env } = fakeEnv();
  const stats = await read(env);
  assert.equal(stats.totalCalls, 0);
  assert.equal(stats.provenCalls, 0);
  assert.equal(stats.users, 0);
  assert.equal(stats.publicProfiles, 0);
});

test("new calls add up, and a user is only counted once", async () => {
  const { env } = fakeEnv();
  await recordNewCall(env, "u1", true);
  await recordNewCall(env, "u1", false);
  await recordNewCall(env, "u2", true);
  const stats = await read(env);
  assert.equal(stats.totalCalls, 3);
  assert.equal(stats.provenCalls, 2);
  assert.equal(stats.users, 2);
});

test("a KV failure while counting never reaches the caller", async () => {
  const { env } = fakeEnv();
  (env.SOOTHIA_CACHE as unknown as { get: () => Promise<null> }).get = async () => {
    throw new Error("kv down");
  };
  await assert.doesNotReject(recordNewCall(env, "u1", true));
});

test("a rebuild recounts the snapshot from per-user entries", async () => {
  const { env } = fakeEnv();
  await recordNewCall(env, "u1", true);
  await refreshUserCounts(env, "u1", { calls: 15, proven: 14 });
  await refreshUserCounts(env, "u2", { calls: 2, proven: 0 });
  await rebuildStats(env);
  const stats = await read(env);
  assert.deepEqual([stats.totalCalls, stats.provenCalls, stats.users], [17, 14, 2]);
});

test("an unchanged user is not written again", async () => {
  const { env, puts } = fakeEnv();
  await refreshUserCounts(env, "u1", { calls: 3, proven: 1 });
  const before = puts();
  await refreshUserCounts(env, "u1", { calls: 3, proven: 1 });
  assert.equal(puts(), before);
});

test("only a committed call on a match counts as proven", () => {
  const pick = (commit: boolean, fixture: boolean): PickRecord =>
    ({
      commit: commit ? { digest: "d", network: "mainnet" } : null,
      ...(fixture ? { fixture: { home: "A", away: "B", startISO: "x", subject: "home" } } : {}),
    }) as PickRecord;
  assert.deepEqual(countPicks([pick(true, true), pick(true, false), pick(false, true)]), { calls: 3, proven: 1 });
});
