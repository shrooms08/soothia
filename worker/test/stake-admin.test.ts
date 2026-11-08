// The admin routes and the admin page's headers, with the chain faked. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { errorText, formatLeft, sameAddress, suiAmount } from "../admin/logic";
import type { Env } from "../src/http";
import worker from "../src/index";
import { clearMemoryCache } from "../src/store";
import type { StakeChain, StakeSettings } from "../src/stake/chain";
import type { StakeConfig, StakePool } from "../src/stake/readers";
import { stakeRoute } from "../src/stake/routes";

const SUI = 1_000_000_000n;
const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const ADMIN = "x".repeat(32);
const POOL = `0x${"bb".repeat(32)}`;
const OWNER = `0x${"8e".repeat(32)}`;
const CAP = `0x${"6b".repeat(32)}`;
const SETTINGS: StakeSettings = { packageId: `0x${"01".repeat(32)}`, configId: `0x${"02".repeat(32)}`, resolverCap: `0x${"03".repeat(32)}` };
const CONFIG = { minResolveDelayMs: 8_100_000n, challengeMs: 21_600_000n } as StakeConfig;

const pool = (overrides: Partial<StakePool> = {}): StakePool =>
  ({
    id: POOL,
    questionHash: "11".repeat(32),
    closeMs: BigInt(NOW - 3_600_000),
    minResolveDelayMs: 0n,
    challengeMs: 900_000n,
    yes: SUI,
    no: 0n,
    status: "resolved",
    outcomeYes: true,
    feeAmount: 0n,
    feeCollected: false,
    yesTotal: SUI,
    noTotal: 0n,
    resolvedAtMs: BigInt(NOW - 60_000),
    evidence: "drill",
    ...overrides,
  }) as StakePool;

function harness(chain: Partial<StakeChain> = {}) {
  const built: { target: string; sender: string; args: number }[] = [];
  const fake = {
    readConfig: async () => CONFIG,
    readPool: async () => pool(),
    objectOwner: async () => OWNER,
    buildForSender: async (tx: { getData(): { commands: { MoveCall?: { module: string; function: string; arguments: unknown[] } }[] } }, sender: string) => {
      const call = tx.getData().commands[0].MoveCall!;
      built.push({ target: `${call.module}::${call.function}`, sender, args: call.arguments.length });
      return "BYTES";
    },
    ...chain,
  } as unknown as StakeChain;
  const env = { SOOTHIA_CACHE: {}, ADMIN_TOKEN: ADMIN, STAKE_ADMIN_CAP: CAP } as unknown as Env;
  return { env, built, deps: { chain: fake, settings: SETTINGS, now: () => NOW } };
}

type Harness = ReturnType<typeof harness>;

async function call(h: Harness, method: string, path: string, body?: unknown, token: string | null = ADMIN) {
  const headers: Record<string, string> = token ? { "X-Soothia-Admin": token } : {};
  const response = await stakeRoute(new Request(`https://x${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), h.env, path, h.deps);
  return { status: response.status, body: (await response.json()) as Record<string, any> };
}

beforeEach(() => clearMemoryCache());

const ROUTES: [string, string][] = [
  ["GET", "/stake/admin/info"],
  ["POST", "/stake/admin/overturn/build"],
  ["POST", "/stake/admin/config/build"],
];

test("every admin route is a 404 without the right token", async () => {
  for (const [method, path] of ROUTES) {
    for (const token of [null, "wrong".repeat(8)]) {
      const h = harness();
      assert.equal((await call(h, method, path, method === "POST" ? {} : undefined, token)).status, 404, path);
      assert.equal(h.built.length, 0);
    }
  }
});

test("info names the AdminCap's owner, read from the chain", async () => {
  const seen: string[] = [];
  const h = harness({ objectOwner: async (id) => (seen.push(id), OWNER) });
  const { status, body } = await call(h, "GET", "/stake/admin/info");
  assert.equal(status, 200);
  assert.deepEqual(seen, [CAP]);
  assert.equal(body.adminCapOwner, OWNER);
  assert.equal(body.productionDelays, true);
  assert.equal(body.minResolveDelayMs, 8_100_000);
});

test("info says when the delays are not the production values", async () => {
  const h = harness({ readConfig: async () => ({ ...CONFIG, minResolveDelayMs: 0n, challengeMs: 900_000n }) });
  assert.equal((await call(h, "GET", "/stake/admin/info")).body.productionDelays, false);
});

test("a cap nobody owns, or a missing id, is a clear error", async () => {
  assert.equal((await call(harness({ objectOwner: async () => null }), "GET", "/stake/admin/info")).body.error, "admin_cap_has_no_owner");
  const h = harness();
  (h.env as { STAKE_ADMIN_CAP?: string }).STAKE_ADMIN_CAP = undefined;
  assert.equal((await call(h, "GET", "/stake/admin/info")).body.error, "admin_cap_not_configured");
});

test("an overturn is built for the AdminCap's owner, whoever asks", async () => {
  const h = harness();
  const { status, body } = await call(h, "POST", "/stake/admin/overturn/build", { poolId: POOL });
  assert.equal(status, 200);
  assert.equal(body.txBytes, "BYTES");
  assert.equal(body.sender, OWNER);
  assert.deepEqual(h.built, [{ target: "pool::overturn", sender: OWNER, args: 3 }]);
});

test("an overturn is refused when there is nothing to overturn", async () => {
  const cases: [Partial<StakePool>, string][] = [
    [{ status: "open" }, "pool_not_resolved"],
    [{ status: "void" }, "pool_not_resolved"],
    [{ resolvedAtMs: BigInt(NOW - 900_000) }, "challenge_window_over"],
  ];
  for (const [overrides, code] of cases) {
    const h = harness({ readPool: async () => pool(overrides) });
    const { status, body } = await call(h, "POST", "/stake/admin/overturn/build", { poolId: POOL });
    assert.equal(status, 409);
    assert.equal(body.error, code);
    assert.equal(h.built.length, 0);
  }
});

test("an overturn on something else is a 404, and a bad id a 400", async () => {
  const h = harness({
    readPool: async () => {
      throw new Error("not_a_stake_pool");
    },
  });
  assert.equal((await call(h, "POST", "/stake/admin/overturn/build", { poolId: POOL })).status, 404);
  assert.equal((await call(harness(), "POST", "/stake/admin/overturn/build", { poolId: "0x1" })).body.error, "invalid_pool_id");
});

test("a contract refusal while building comes back with its code", async () => {
  const h = harness({
    buildForSender: async () => {
      throw new Error("MoveAbort in 1st command, abort code: 20, in 'x::pool::overturn'");
    },
  });
  const { status, body } = await call(h, "POST", "/stake/admin/overturn/build", { poolId: POOL });
  assert.equal(status, 409);
  assert.deepEqual(body, { error: "tx_rejected", abortCode: "20" });
});

test("setting the delays is built for the owner", async () => {
  const h = harness();
  const { status } = await call(h, "POST", "/stake/admin/config/build", { min_resolve_delay_ms: 0, challenge_ms: 900_000 });
  assert.equal(status, 200);
  assert.deepEqual(h.built, [{ target: "pool::set_delays", sender: OWNER, args: 4 }]);
});

test("delays are checked against the contract's limits", async () => {
  const cases: [Record<string, unknown>, string][] = [
    [{ min_resolve_delay_ms: 86_400_001, challenge_ms: 1 }, "invalid_min_resolve_delay_ms"],
    [{ min_resolve_delay_ms: -1, challenge_ms: 1 }, "invalid_min_resolve_delay_ms"],
    [{ min_resolve_delay_ms: "0", challenge_ms: 1 }, "invalid_min_resolve_delay_ms"],
    [{ min_resolve_delay_ms: 0, challenge_ms: 172_800_001 }, "invalid_challenge_ms"],
    [{ min_resolve_delay_ms: 0, challenge_ms: 1.5 }, "invalid_challenge_ms"],
    [{ min_resolve_delay_ms: 0 }, "invalid_challenge_ms"],
  ];
  for (const [body, code] of cases) {
    const h = harness();
    assert.equal((await call(h, "POST", "/stake/admin/config/build", body)).body.error, code);
    assert.equal(h.built.length, 0);
  }
});

// ---- the page ----

function pageEnv(): { env: Env; asked: string[] } {
  const asked: string[] = [];
  const env = {
    SOOTHIA_CACHE: {},
    ASSETS: {
      fetch: async (url: string) => {
        asked.push(new URL(url).pathname);
        return new Response("<html></html>", { headers: { "Content-Type": "text/html" } });
      },
    },
  } as unknown as Env;
  return { env, asked };
}

const ctx = { waitUntil: () => undefined } as unknown as ExecutionContext;
const fetchPage = (env: Env, path: string, init?: RequestInit) => worker.fetch(new Request(`https://api.soothia.fun${path}`, init) as never, env, ctx);

test("/admin serves the page, unindexed and locked down", async () => {
  const { env, asked } = pageEnv();
  const response = await fetchPage(env, "/admin");
  assert.equal(response.status, 200);
  assert.deepEqual(asked, ["/admin/index.html"]);
  assert.equal(response.headers.get("X-Robots-Tag"), "noindex, nofollow");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const csp = response.headers.get("Content-Security-Policy") ?? "";
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.doesNotMatch(csp, /unsafe/);
});

test("only the page's own files are served", async () => {
  const { env, asked } = pageEnv();
  assert.equal((await fetchPage(env, "/admin/admin.js")).status, 200);
  assert.equal((await fetchPage(env, "/admin/admin.css")).status, 200);
  assert.equal((await fetchPage(env, "/admin/../secret")).status, 404);
  assert.equal((await fetchPage(env, "/admin/other.txt")).status, 404);
  assert.deepEqual(asked, ["/admin/admin.js", "/admin/admin.css"]);
});

test("the page takes GET only", async () => {
  assert.equal((await fetchPage(pageEnv().env, "/admin", { method: "POST", body: "{}" })).status, 405);
});

test("page helpers", () => {
  assert.equal(sameAddress(OWNER.toUpperCase().replace("0X", "0x"), OWNER), true);
  assert.equal(sameAddress("0x1", `0x${"0".repeat(63)}1`), true);
  assert.equal(sameAddress(OWNER, POOL), false);
  assert.equal(formatLeft(0), "ended");
  assert.equal(formatLeft(9_000), "9s");
  assert.equal(formatLeft(249_000), "4m 09s");
  assert.equal(formatLeft(3_725_000), "1h 02m 05s");
  assert.equal(suiAmount("100000000"), "0.1 SUI");
  assert.equal(suiAmount("1000000000"), "1 SUI");
  assert.equal(errorText("not_found"), "The token was not accepted.");
  assert.equal(errorText("weird"), "The Worker refused: weird");
  assert.equal(errorText("weird", { weird: "Plain words." }), "Plain words.");
});
