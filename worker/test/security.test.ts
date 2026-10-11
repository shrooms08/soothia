// Security gates on the proxy: the admin header on /debug/*, per-IP limits,
// input validation, and the Panta-only rule for relayed transactions. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "../src/index";
import { staticAccountKeys, touchesPanta } from "../src/create";
import { PANTA_PROGRAM } from "../src/pantaRules";
import { decodeBase58 } from "../src/base58";
import { LIMITS, rateLimited } from "../src/ratelimit";
import { clearMemoryCache } from "../src/store";
import type { Env } from "../src/http";

const TOKEN = "t".repeat(40);
const BASE = "https://api.soothia.fun";
const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;

function env(overrides: Partial<Env> = {}): Env {
  return {
    PANTA_API_KEY: "",
    ANTHROPIC_API_KEY: "",
    HELIUS_RPC_URL: "",
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

/** A signed-looking transaction whose message names `keys` as its static accounts. */
function signedTx(keys: string[]): string {
  const signature = new Uint8Array(64).fill(7);
  const header = Uint8Array.of(1, 0, 1);
  const parts: Uint8Array[] = [Uint8Array.of(1), signature, header, Uint8Array.of(keys.length)];
  for (const key of keys) parts.push(decodeBase58(key)!);
  parts.push(new Uint8Array(32).fill(3), Uint8Array.of(0)); // blockhash, zero instructions
  const bytes = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return btoa(String.fromCharCode(...bytes));
}

const WALLET = "BCMmCN6PPN4LaZjoWLvufmCaHYZE5PEaU3hHzYqeorne";
const SYSTEM = "11111111111111111111111111111111";

test("/debug/* does not exist without the admin header, and needs the exact token", async () => {
  for (const headers of [{}, { "X-Soothia-Admin": "x".repeat(40) }, { "X-Soothia-Admin": TOKEN.slice(0, 39) }]) {
    const response = await call("/debug/kv-budget", { headers });
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "not_found" });
  }
  const ok = await call("/debug/kv-budget", { headers: { "X-Soothia-Admin": TOKEN } });
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as Record<string, unknown>;
  assert.ok("thisIsolate" in body && "pendingCreatorWrites" in body);
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

test("POST /match is limited per IP and the 429 carries Retry-After", async () => {
  clearMemoryCache();
  const post = (ip: string) =>
    call("/match", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" }, ip });
  for (let i = 0; i < LIMITS.match.limit; i++) assert.equal((await post("192.0.2.10")).status, 400);
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

test("staticAccountKeys reads legacy and v0 messages; touchesPanta needs the Panta program", () => {
  const legacy = signedTx([WALLET, PANTA_PROGRAM, SYSTEM]);
  assert.deepEqual(staticAccountKeys(legacy), [WALLET, PANTA_PROGRAM, SYSTEM]);
  assert.equal(touchesPanta(legacy), true);
  assert.equal(touchesPanta(signedTx([WALLET, SYSTEM])), false);
  // v0: a version byte (0x80) before the header.
  const bytes = Uint8Array.from(atob(legacy), (c) => c.charCodeAt(0));
  const v0 = new Uint8Array(bytes.length + 1);
  v0.set(bytes.slice(0, 65), 0);
  v0[65] = 0x80;
  v0.set(bytes.slice(65), 66);
  assert.equal(touchesPanta(btoa(String.fromCharCode(...v0))), true);
  assert.deepEqual(staticAccountKeys("not base64!"), []);
  assert.deepEqual(staticAccountKeys(btoa("short")), []);
});

test("POST /api/tx/send refuses transactions that do not invoke Panta, and relays the rest", async () => {
  clearMemoryCache();
  const send = (signedTxBase64: string) =>
    call("/api/tx/send", {
      method: "POST",
      body: JSON.stringify({ signedTxBase64 }),
      headers: { "Content-Type": "application/json" },
    });
  const refused = await send(signedTx([WALLET, SYSTEM]));
  assert.equal(refused.status, 400);
  assert.deepEqual(await refused.json(), {
    message: "Only Panta transactions can be sent through Soothia.",
    code: "not_panta_transaction",
  });
  // A Panta transaction passes the gate and reaches the RPC step (unconfigured in tests).
  const relayed = await send(signedTx([WALLET, PANTA_PROGRAM, SYSTEM]));
  assert.equal(relayed.status, 500);
  assert.deepEqual(await relayed.json(), { message: "The proxy has no RPC configured." });
  assert.equal((await send("")).status, 400);
});

test("POST /buy/send with an install id also requires a Panta transaction", async () => {
  const response = await call("/buy/send", {
    method: "POST",
    body: JSON.stringify({ signedTxBase64: signedTx([WALLET, SYSTEM]), orderId: "ord_abcdefghij" }),
    headers: { "Content-Type": "application/json", "X-Soothia-Install": "4f1c2a8e-5b6d-4c3e-9f0a-1b2c3d4e5f60" },
  });
  // Either the order id shape or the Panta rule stops it; never a relay.
  assert.ok(response.status === 400 || response.status === 404);
  const body = (await response.json()) as { error: string };
  assert.match(body.error, /^(bad_request|not_panta_transaction|unknown_order)$/);
});
