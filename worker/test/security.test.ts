// Security gates on the proxy: the admin header on /debug/*, per-IP limits,
// and input validation. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../src/index";
import { LIMITS, rateLimited } from "../src/ratelimit";
import { clearMemoryCache } from "../src/store";
import type { Env } from "../src/http";

const TOKEN = "t".repeat(40);
const BASE = "https://api.soothia.fun";
const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

function env(overrides: Partial<Env> = {}): Env {
  return {
    ANTHROPIC_API_KEY: "",
    MEMWAL_ACCOUNT_ID: "",
    MEMWAL_KEY: "",
    TATUM_API_KEY: "",
    ADMIN_TOKEN: TOKEN,
    SOOTHIA_CACHE: { get: async () => null, put: async () => {}, delete: async () => {} } as unknown as KVNamespace,
    ...overrides,
  };
}

function call(path: string, init: RequestInit & { ip?: string } = {}, e = env()): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("CF-Connecting-IP", init.ip ?? "203.0.113.7");
  return worker.fetch(new Request(`${BASE}${path}`, { ...init, headers }), e, ctx);
}

test("/debug/* does not exist without the admin header, and needs the exact token", async () => {
  const attempts: Record<string, string>[] = [
    {},
    { "X-Soothia-Admin": "x".repeat(40) },
    { "X-Soothia-Admin": TOKEN.slice(0, 39) },
  ];
  for (const headers of attempts) {
    const response = await call("/debug/kv-budget", { headers });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "not_found" });
  }
  const ok = await call("/debug/kv-budget", { headers: { "X-Soothia-Admin": TOKEN } });
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as Record<string, unknown>;
  assert.ok("thisIsolate" in body);
  // Any other /debug path stays a 404 even for the admin.
  assert.equal((await call("/debug/anything", { headers: { "X-Soothia-Admin": TOKEN } })).status, 404);
});

test("/debug/* is closed entirely when ADMIN_TOKEN is unset or too short", async () => {
  assert.equal(
    (await call("/debug/kv-budget", { headers: { "X-Soothia-Admin": "" } }, env({ ADMIN_TOKEN: undefined }))).status,
    404,
  );
  assert.equal(
    (await call("/debug/kv-budget", { headers: { "X-Soothia-Admin": "short" } }, env({ ADMIN_TOKEN: "short" }))).status,
    404,
  );
});

test("rateLimited counts per IP and route, then answers with seconds until the window resets", async () => {
  clearMemoryCache();
  const limit = { limit: 3, windowSec: 60 };
  const now = 1_700_000_000_000;
  const a = new Request(BASE, { headers: { "CF-Connecting-IP": "198.51.100.1" } });
  const b = new Request(BASE, { headers: { "CF-Connecting-IP": "198.51.100.2" } });
  for (let i = 0; i < 3; i++) assert.equal(await rateLimited(a, "t", limit, now), null);
  const retry = await rateLimited(a, "t", limit, now + 1000);
  assert.ok(retry !== null && retry >= 1 && retry <= 60);
  assert.equal(await rateLimited(b, "t", limit, now), null); // another IP
  assert.equal(await rateLimited(a, "other", limit, now), null); // another route
  assert.equal(await rateLimited(a, "t", limit, now + 61_000), null); // next window
});

test("POST /detect is limited per IP and the 429 carries Retry-After", async () => {
  clearMemoryCache();
  const post = (ip: string) =>
    call("/detect", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" }, ip });
  for (let i = 0; i < LIMITS.detect.limit; i++) assert.equal((await post("192.0.2.10")).status, 400);
  const blocked = await post("192.0.2.10");
  assert.equal(blocked.status, 429);
  assert.deepEqual(await blocked.json(), { error: "rate_limited" });
  assert.match(blocked.headers.get("Retry-After") ?? "", /^\d+$/);
  assert.equal((await post("192.0.2.11")).status, 400);
});

test("POST /detect validates the install header, the body size, and the page URL", async () => {
  clearMemoryCache();
  const install = "4f1c2a8e-5b6d-4c3e-9f0a-1b2c3d4e5f60";
  const post = (body: string, headers: Record<string, string> = {}) =>
    call("/detect", { method: "POST", body, headers: { "Content-Type": "application/json", ...headers } });
  assert.equal((await post(JSON.stringify({ url: "https://x.com", text: "a".repeat(300) }))).status, 400);
  const withInstall = { "X-Soothia-Install": install };
  assert.deepEqual(await (await post("not json", withInstall)).json(), { error: "bad_request" });
  assert.deepEqual(
    await (await post(JSON.stringify({ url: "javascript:alert(1)", text: "a".repeat(300) }), withInstall)).json(),
    { error: "bad_request" },
  );
  assert.deepEqual(
    await (await post(JSON.stringify({ url: "https://x.com", text: "a".repeat(40_000) }), withInstall)).json(),
    { error: "bad_request" },
  );
  assert.deepEqual(await (await post(JSON.stringify({ url: "https://x.com" }), withInstall)).json(), {
    error: "bad_request",
  });
});

test("unknown routes and methods answer with a short JSON error and no stack", async () => {
  const missing = await call("/nope");
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "not_found" });
  const put = await call("/health", { method: "PUT" });
  assert.equal(put.status, 405);
  const text = await put.text();
  assert.doesNotMatch(text, /at .*\.ts|stack/i);
});
