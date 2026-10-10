// The edge/memory cache and the guarded KV writer. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cacheGet, cachePut, clearMemoryCache, kvBudgetReport, kvPut } from "../src/store";
import type { Env } from "../src/http";

test("cachePut/cacheGet work from memory when no edge cache exists, and honour the TTL", async () => {
  clearMemoryCache();
  await cachePut("t:one", { hello: 1 }, 60);
  assert.deepEqual(await cacheGet("t:one"), { hello: 1 });
  await cachePut("t:short", "x", 0.01);
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(await cacheGet("t:short"), null);
  assert.equal(await cacheGet("t:missing"), null);
});

test("kvPut never throws: a 429 from KV is counted and reported, and the caller gets false", async () => {
  const calls: string[] = [];
  const env = {
    SOOTHIA_CACHE: {
      put: async (key: string) => { calls.push(key); throw new Error("KV PUT failed: 429 Too Many Requests (daily limit exceeded)"); },
    },
  } as unknown as Env;
  assert.equal(await kvPut(env, "buy:ord_x", "{}", { expirationTtl: 60 }), false);
  assert.equal(await kvPut(env, "creator:W", "[]"), false);
  const report = (await kvBudgetReport()) as { thisIsolate: { puts: number; failures: number; byPrefix: Record<string, number> }; lastError: string };
  assert.ok(report.thisIsolate.puts >= 2);
  assert.ok(report.thisIsolate.failures >= 2);
  assert.match(report.lastError, /429/);
  assert.ok(report.thisIsolate.byPrefix.buy >= 1 && report.thisIsolate.byPrefix.creator >= 1);
  const ok = { SOOTHIA_CACHE: { put: async () => {} } } as unknown as Env;
  assert.equal(await kvPut(ok, "sig:abc", "ord_1"), true);
});
