// The admin routes and the admin page's headers, with the chain faked. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { DRILL_STEPS, drillStepEnabled, emptyDrill, errorText, formatLeft, sameAddress, suiAmount, type DrillState } from "../admin/logic";
import type { Env } from "../src/http";
import worker from "../src/index";
import { clearMemoryCache } from "../src/store";
import type { StakeChain, StakeSettings } from "../src/stake/chain";
import { DRILL_CHALLENGE_MS, DRILL_STAKE_MIST, drillKey } from "../src/stake/drill";
import type { StakeConfig, StakePool, StakePosition } from "../src/stake/readers";
import { stakeRoute } from "../src/stake/routes";
import { sweepStake } from "../src/stake/sweep";

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
    balanceOf: async () => SUI,
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
  ["POST", "/stake/admin/drill/create"],
  ["POST", "/stake/admin/drill/stake"],
  ["POST", "/stake/admin/drill/resolve"],
  ["POST", "/stake/admin/drill/refund"],
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

test("a wallet too poor to pay gas gets a clear error before anything is built", async () => {
  const h = harness({ balanceOf: async () => 19_999_999n });
  const { status, body } = await call(h, "POST", "/stake/admin/config/build", { min_resolve_delay_ms: 0, challenge_ms: 900_000 });
  assert.equal(status, 409);
  assert.deepEqual(body, { error: "admin_wallet_low_balance", neededMist: "20000000" });
  assert.equal(h.built.length, 0);
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

// ---- the drill ----

const GAS_WALLET = `0x${"fd".repeat(32)}`;
const DRILL_CONFIG = { minResolveDelayMs: 0n, challengeMs: DRILL_CHALLENGE_MS } as StakeConfig;
const CLOSE = NOW + 120_000;

function drillHarness(options: { pool?: Partial<StakePool>; position?: StakePosition | null; config?: StakeConfig; marked?: boolean; chain?: Partial<StakeChain>; lock?: boolean; capUsed?: number; balance?: bigint } = {}) {
  const data = new Map<string, { value: string; metadata?: unknown }>();
  const calls: string[] = [];
  let hash = "11".repeat(32);
  const kv = {
    get: async (key: string, type?: string) => {
      const entry = data.get(key);
      if (!entry) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    put: async (key: string, value: string, opts?: { metadata?: unknown }) => {
      data.set(key, { value, metadata: opts?.metadata });
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async ({ prefix }: { prefix: string }) => ({ keys: [...data.entries()].filter(([name]) => name.startsWith(prefix)).map(([name, entry]) => ({ name, metadata: entry.metadata })), list_complete: true }),
  };
  if (options.marked !== false) data.set(drillKey(POOL), { value: JSON.stringify({ poolId: POOL, questionHash: hash, timestamp: NOW, closeMs: CLOSE }) });
  if (options.lock) data.set("stake:resolver-lock", { value: "1" });
  if (options.capUsed) data.set("stakecap:2026-11-20:pools", { value: String(options.capUsed) });
  const chain = {
    readConfig: async () => options.config ?? DRILL_CONFIG,
    readPool: async () => pool({ questionHash: hash, status: "open", closeMs: BigInt(CLOSE), yes: 0n, resolvedAtMs: 0n, ...options.pool }),
    readPosition: async () => options.position ?? null,
    balanceOf: async () => options.balance ?? SUI,
    gasWalletAddress: () => GAS_WALLET,
    createPool: async (questionHash: string, closeMs: bigint) => {
      hash = questionHash;
      calls.push(`create ${closeMs}`);
      return { poolId: POOL.toUpperCase().replace("0X", "0x"), digest: "D-create" };
    },
    stakeFromGasWallet: async (poolId: string, amount: bigint, pickHash: string) => {
      calls.push(`stake ${poolId} ${amount} ${pickHash === hash}`);
      return "D-stake";
    },
    resolvePool: async (poolId: string, outcomeYes: boolean, evidence: string) => {
      calls.push(`resolve ${poolId} ${outcomeYes} ${evidence}`);
      return "D-resolve";
    },
    claimFromGasWallet: async (poolId: string) => {
      calls.push(`claim ${poolId}`);
      return { digest: "D-refund", amount: DRILL_STAKE_MIST };
    },
    ...options.chain,
  } as unknown as StakeChain;
  const env = { SOOTHIA_CACHE: kv, ADMIN_TOKEN: ADMIN, RESOLVER_KEY: "11".repeat(32) } as unknown as Env;
  return { env, data, calls, deps: { chain, settings: SETTINGS, now: () => NOW }, built: [], chain };
}

type DrillHarness = ReturnType<typeof drillHarness>;
const drill = (h: DrillHarness, step: string, body: unknown = { poolId: POOL }) => call(h as unknown as Harness, "POST", `/stake/admin/drill/${step}`, body);

test("creating a drill pool closes in two minutes, uses the drill hash, and marks it", async () => {
  const h = drillHarness({ marked: false });
  const { status, body } = await drill(h, "create", {});
  assert.equal(status, 200);
  assert.equal(body.poolId, POOL);
  assert.equal(body.closeMs, CLOSE);
  assert.deepEqual(h.calls, [`create ${CLOSE}`]);
  const { createHash } = await import("node:crypto");
  assert.equal(body.questionHash, createHash("sha256").update(`soothia-drill-${NOW}`).digest("hex"));
  assert.equal(JSON.parse(h.data.get(drillKey(POOL))!.value).questionHash, body.questionHash);
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

test("the sweep never touches a drill pool", async () => {
  const h = drillHarness({ marked: false });
  await drill(h, "create", {});
  assert.equal([...h.data.keys()].some((key) => key.startsWith("stakepool:")), false);
  const result = await sweepStake(h.env, { chain: h.chain, fetcher: async () => assert.fail("should not call ESPN"), now: new Date(CLOSE + 7 * 86_400_000) });
  assert.deepEqual(result, { checked: 0, actions: [] });
});

test("a drill pool cannot be created until the delays are shortened", async () => {
  const h = drillHarness({ marked: false, config: CONFIG });
  const { status, body } = await drill(h, "create", {});
  assert.equal(status, 409);
  assert.equal(body.error, "delays_not_shortened");
  assert.deepEqual(h.calls, []);
});

test("drill pools count against the daily cap and the gas floor", async () => {
  const capped = drillHarness({ marked: false, capUsed: 30 });
  assert.equal((await drill(capped, "create", {})).body.error, "pool_cap_reached");
  const poor = drillHarness({ marked: false, balance: 1n });
  assert.equal((await drill(poor, "create", {})).body.error, "resolver_low_balance");
  assert.deepEqual([...capped.calls, ...poor.calls], []);
});

test("if the marker cannot be written, the page is told the pool id", async () => {
  const h = drillHarness({ marked: false });
  const kv = h.env.SOOTHIA_CACHE as unknown as { put: (key: string) => Promise<void> };
  const put = kv.put;
  kv.put = async (key: string, ...rest: unknown[]) => {
    if (key.startsWith("stakedrill:")) throw new Error("kv down");
    return (put as (...args: unknown[]) => Promise<void>)(key, ...rest);
  };
  const { status, body } = await drill(h, "create", {});
  assert.equal(status, 503);
  assert.equal(body.error, "drill_not_marked");
  assert.equal(body.digest, "D-create");
});

test("no drill step can act on a pool without a marker", async () => {
  for (const step of ["stake", "resolve", "refund"]) {
    const h = drillHarness({ marked: false });
    const { status, body } = await drill(h, step);
    assert.equal(status, 404);
    assert.equal(body.error, "not_a_drill_pool");
    assert.deepEqual(h.calls, []);
  }
});

test("a marker for a different question is refused too", async () => {
  const h = drillHarness({ pool: { questionHash: "99".repeat(32) } });
  assert.equal((await drill(h, "resolve")).body.error, "not_a_drill_pool");
  assert.deepEqual(h.calls, []);
});

test("stake puts exactly 0.1 SUI on YES from the gas wallet", async () => {
  const h = drillHarness();
  const { status, body } = await drill(h, "stake");
  assert.equal(status, 200);
  assert.deepEqual(body, { digest: "D-stake", amountMist: "100000000" });
  assert.deepEqual(h.calls, [`stake ${POOL} 100000000 true`]);
});

test("stake is refused once closed, once done, or on a settled pool", async () => {
  assert.equal((await drill(drillHarness({ pool: { closeMs: BigInt(NOW) } }), "stake")).body.error, "drill_pool_closed");
  assert.equal((await drill(drillHarness({ position: { side: true, amount: 1n, claimed: false } }), "stake")).body.error, "already_staked");
  assert.equal((await drill(drillHarness({ pool: { status: "void" } }), "stake")).body.error, "pool_not_open");
});

const CLOSED = { closeMs: BigInt(NOW - 1), yes: DRILL_STAKE_MIST };

test("resolve records YES with the evidence \"drill\" after close", async () => {
  const h = drillHarness({ pool: CLOSED });
  assert.equal((await drill(h, "resolve")).body.digest, "D-resolve");
  assert.deepEqual(h.calls, [`resolve ${POOL} true drill`]);
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

test("resolve waits for close, needs a stake, and respects the lock", async () => {
  const early = await drill(drillHarness({ pool: { yes: DRILL_STAKE_MIST } }), "resolve");
  assert.equal(early.body.error, "drill_pool_not_closed");
  assert.equal(early.body.closeMs, CLOSE);
  assert.equal((await drill(drillHarness({ pool: { closeMs: BigInt(NOW - 1) } }), "resolve")).body.error, "nothing_staked");
  assert.equal((await drill(drillHarness({ pool: CLOSED, lock: true }), "resolve")).body.error, "resolver_busy");
  assert.equal((await drill(drillHarness({ pool: { ...CLOSED, status: "resolved" } }), "resolve")).body.error, "pool_not_open");
});

test("a contract refusal in a drill step comes back with its code", async () => {
  const h = drillHarness({
    pool: CLOSED,
    chain: {
      resolvePool: async () => {
        throw new Error("MoveAbort in 1st command, abort code: 10, in 'x::pool::resolve'");
      },
    },
  });
  const { status, body } = await drill(h, "resolve");
  assert.equal(status, 409);
  assert.deepEqual(body, { error: "tx_rejected", abortCode: "10" });
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

const STAKED = { side: true, amount: DRILL_STAKE_MIST, claimed: false };

test("refund claims for the gas wallet and reports the full amount", async () => {
  const h = drillHarness({ pool: { status: "void" }, position: STAKED });
  const { body } = await drill(h, "refund");
  assert.deepEqual(body, { digest: "D-refund", amountMist: "100000000", stakedMist: "100000000", fullRefund: true });
  assert.deepEqual(h.calls, [`claim ${POOL}`]);
});

test("a short refund is reported as short", async () => {
  const h = drillHarness({ pool: { status: "void" }, position: STAKED, chain: { claimFromGasWallet: async () => ({ digest: "D", amount: 99_000_000n }) } });
  assert.equal((await drill(h, "refund")).body.fullRefund, false);
});

test("refund waits for the overturn and only happens once", async () => {
  assert.equal((await drill(drillHarness({ pool: { status: "resolved" }, position: STAKED }), "refund")).body.error, "pool_not_void");
  assert.equal((await drill(drillHarness({ pool: { status: "void" }, position: { ...STAKED, claimed: true } }), "refund")).body.error, "already_refunded");
  assert.equal((await drill(drillHarness({ pool: { status: "void" } }), "refund")).body.error, "no_position");
});

test("drill buttons run in order, and only for the AdminCap's wallet", () => {
  const enabled = (state: DrillState, owner = true) => DRILL_STEPS.filter((step) => drillStepEnabled(step, state, owner));
  assert.deepEqual(enabled(emptyDrill()), ["shorten", "restore"]);
  assert.deepEqual(enabled(emptyDrill(), false), []);
  assert.deepEqual(enabled({ ...emptyDrill(), done: { shorten: "d" } }), ["create", "restore"]);
  assert.deepEqual(enabled({ ...emptyDrill(), done: { shorten: "d", create: "d", stake: "d", resolve: "d", overturn: "d" } }), ["refund", "restore"]);
  assert.deepEqual(enabled({ ...emptyDrill(), done: { restore: "d" } }), ["shorten", "restore"]);
});
