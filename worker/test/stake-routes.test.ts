// The /stake/* routes, with the chain, ESPN, KV and Walrus faked. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import worker from "../src/index";
import type { ParsedScoreboard, ScoreboardEvent, ScoreboardFetcher } from "../src/recall/espn";
import type { RecallStore } from "../src/recall/memory";
import type { PickRecord, StakeRecord } from "../src/recall/records";
import { clearMemoryCache } from "../src/store";
import type { StakeChain, StakedEvent, StakeSettings, StakeTransaction } from "../src/stake/chain";
import { poolIdentity } from "../src/stake/identity";
import type { StakeConfig, StakePool, StakePosition } from "../src/stake/readers";
import { POOL_CREATE_DAILY_CAP, RESOLVER_MIN_BALANCE_MIST } from "../src/stake/context";
import { stakeRoute, type StakeDeps } from "../src/stake/routes";

const SUI = 1_000_000_000n;
const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const KICKOFF_MS = Date.parse(KICKOFF);
const INSTALL = "12345678-1234-1234-1234-123456789abc";
const SENDER = `0x${"aa".repeat(32)}`;
const POOL = `0x${"bb".repeat(32)}`;
const OTHER_POOL = `0x${"bc".repeat(32)}`;
const HASH = "cd".repeat(32);
const DIGEST = "8teWqYrBWopnhq2Wy22BQq1uvzepDoUzDzdRA6oE8iY";
const ADMIN = "x".repeat(32);
const SETTINGS: StakeSettings = { packageId: `0x${"01".repeat(32)}`, configId: `0x${"02".repeat(32)}`, resolverCap: `0x${"03".repeat(32)}` };

const CONFIG: StakeConfig = {
  id: SETTINGS.configId,
  treasury: SENDER,
  feeBps: 100n,
  minStake: 100_000_000n,
  maxStakePerUser: 5n * SUI,
  maxPool: 50n * SUI,
  refundAfterMs: 604_800_000n,
  minResolveDelayMs: 8_100_000n,
  challengeMs: 21_600_000n,
  registryTableId: `0x${"04".repeat(32)}`,
};

const openPool = (overrides: Partial<StakePool> = {}): StakePool => ({
  id: POOL,
  questionHash: HASH,
  closeMs: BigInt(KICKOFF_MS),
  feeBps: 100n,
  minResolveDelayMs: 8_100_000n,
  challengeMs: 21_600_000n,
  yes: 4n * SUI,
  no: 2n * SUI,
  positionsTableId: `0x${"05".repeat(32)}`,
  stakers: 2n,
  status: "open",
  outcomeYes: false,
  feeAmount: 0n,
  feeCollected: false,
  yesTotal: 0n,
  noTotal: 0n,
  resolvedAtMs: 0n,
  evidence: "",
  ...overrides,
});

const pick = (overrides: Partial<PickRecord> = {}): PickRecord => ({
  id: "p1",
  at: "2026-11-20T10:00:00.000Z",
  question: "Will Arsenal beat Newcastle United?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: ["Newcastle United", "Arsenal"],
  endTime: KICKOFF,
  source: { site: "espn.com", url: "https://espn.com/x" },
  fixture: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" },
  hash: HASH,
  commit: { digest: DIGEST, network: "mainnet" },
  ...overrides,
});

function fakeKv(fail: { get?: boolean; put?: boolean } = {}) {
  const data = new Map<string, { value: string; metadata?: unknown }>();
  const kv = {
    get: async (key: string, type?: string) => {
      if (fail.get) throw new Error("kv down");
      const entry = data.get(key);
      if (!entry) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    put: async (key: string, value: string, options?: { metadata?: unknown }) => {
      if (fail.put) throw new Error("kv down");
      data.set(key, { value, metadata: options?.metadata });
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async ({ prefix }: { prefix: string }) => ({
      keys: [...data.entries()].filter(([name]) => name.startsWith(prefix)).map(([name, entry]) => ({ name, metadata: entry.metadata })),
      list_complete: true,
    }),
  };
  return { kv, data };
}

function espnEvent(overrides: Partial<ScoreboardEvent> = {}): ScoreboardEvent {
  return {
    espnId: "1",
    startISO: KICKOFF,
    statusName: "STATUS_SCHEDULED",
    state: "pre",
    completed: false,
    home: { name: "Newcastle United", short: "Newcastle", abbreviation: "NEW", score: null },
    away: { name: "Arsenal", short: "Arsenal", abbreviation: "ARS", score: null },
    competition: "Premier League",
    url: "https://espn.com/match",
    ...overrides,
  };
}

const boardWith = (...events: ScoreboardEvent[]): ScoreboardFetcher => async (league): Promise<ParsedScoreboard> => ({
  competition: "",
  events: league === "eng.1" ? events : [],
});

interface Harness {
  deps: StakeDeps;
  env: Env;
  created: { hash: string; closeMs: bigint }[];
  built: { sender: string; budget: number }[];
  written: StakeRecord[];
  data: Map<string, { value: string; metadata?: unknown }>;
}

interface Options {
  poolId?: string | null;
  pool?: StakePool;
  position?: StakePosition | null;
  picks?: PickRecord[];
  balance?: bigint;
  resolverBalance?: bigint;
  fetcher?: ScoreboardFetcher;
  transaction?: StakeTransaction | null;
  kvFail?: { get?: boolean; put?: boolean };
  chain?: Partial<StakeChain>;
}

const RESOLVER_ADDRESS_KEY = "11".repeat(32);

function harness(options: Options = {}): Harness {
  const created: Harness["created"] = [];
  const built: Harness["built"] = [];
  const written: StakeRecord[] = [];
  const { kv, data } = fakeKv(options.kvFail);
  const poolId = options.poolId === undefined ? null : options.poolId;
  const chain: StakeChain = {
    readConfig: async () => CONFIG,
    findPoolId: async () => poolId,
    readPool: async () => options.pool ?? openPool(),
    readPosition: async () => options.position ?? null,
    balanceOf: async (owner) => (owner === SENDER ? (options.balance ?? 10n * SUI) : (options.resolverBalance ?? SUI)),
    readStakeTransaction: async () => (options.transaction === undefined ? null : options.transaction),
    buildForSender: async (_tx, sender, budget) => {
      built.push({ sender, budget });
      return "BYTES";
    },
    createPool: async (hash, closeMs) => {
      created.push({ hash, closeMs });
      return { poolId: POOL, digest: DIGEST };
    },
    resolvePool: async () => DIGEST,
    voidPool: async () => DIGEST,
    collectFee: async () => DIGEST,
    objectOwner: async () => null,
    gasWalletAddress: () => null,
    stakeFromGasWallet: async () => DIGEST,
    claimFromGasWallet: async () => ({ digest: DIGEST, amount: 0n }),
    ...options.chain,
  };
  const store = {
    list: async (kind: string) => (kind === "pick" ? (options.picks ?? [pick()]) : []),
    write: async (_kind: string, record: StakeRecord) => {
      written.push(record);
      return { jobId: "j" };
    },
  } as unknown as RecallStore;
  const env = { SOOTHIA_CACHE: kv, RESOLVER_KEY: RESOLVER_ADDRESS_KEY, ADMIN_TOKEN: ADMIN } as unknown as Env;
  return {
    deps: { chain, settings: SETTINGS, store, fetcher: options.fetcher ?? boardWith(espnEvent()), now: () => NOW },
    env,
    created,
    built,
    written,
    data,
  };
}

function call(h: Harness, method: string, path: string, body?: unknown, headers: Record<string, string> = { "X-Soothia-Install": INSTALL }): Promise<Response> {
  const request = new Request(`https://api.soothia.fun${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return stakeRoute(request, h.env, path.split("?")[0], h.deps);
}

async function result(response: Promise<Response>): Promise<{ status: number; body: Record<string, any> }> {
  const resolved = await response;
  return { status: resolved.status, body: (await resolved.json()) as Record<string, any> };
}

const FIXTURE = { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF };
const build = (h: Harness, overrides: Record<string, unknown> = {}) =>
  result(call(h, "POST", "/stake/build", { pickId: "p1", amountMist: "1000000000", sender: SENDER, ...overrides }));

beforeEach(() => clearMemoryCache());

// ---- /stake/pool ----

test("a pool that does not exist yet reports the kickoff and the limits", async () => {
  const { status, body } = await result(call(harness(), "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" }));
  assert.equal(status, 200);
  assert.deepEqual(body, {
    exists: false,
    poolId: null,
    status: null,
    closeMs: KICKOFF_MS,
    yesTotal: "0",
    noTotal: "0",
    feeBps: 100,
    payoutIfYes: null,
    payoutIfNo: null,
    limits: { minStakeMist: "100000000", maxStakePerUserMist: "5000000000", maxPoolMist: "50000000000" },
  });
});

test("an open pool reports live totals and multipliers after the fee", async () => {
  const { body } = await result(call(harness({ poolId: POOL }), "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" }));
  assert.equal(body.exists, true);
  assert.equal(body.poolId, POOL);
  assert.equal(body.yesTotal, "4000000000");
  assert.equal(body.noTotal, "2000000000");
  assert.equal(body.payoutIfYes, 1.485);
  assert.equal(body.payoutIfNo, 2.97);
  assert.equal("claimOpensAtMs" in body, false);
});

test("a resolved pool also says when claims open", async () => {
  const pool = openPool({ status: "resolved", outcomeYes: true, yesTotal: 4n * SUI, noTotal: 2n * SUI, resolvedAtMs: 100n, feeAmount: 60_000_000n });
  const { body } = await result(call(harness({ poolId: POOL, pool }), "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" }));
  assert.equal(body.claimOpensAtMs, 21_600_100);
});

test("a pool view is cached for repeat readers", async () => {
  let reads = 0;
  const h = harness({ chain: { readConfig: async () => ((reads += 1), CONFIG) } });
  await call(h, "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" });
  await call(h, "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" });
  assert.equal(reads, 1);
});

test("a reversed listing of the same question reads the same pool", async () => {
  const hashes: string[] = [];
  const h = harness({ chain: { findPoolId: async (_config, hash) => (hashes.push(hash), null) } });
  await call(h, "POST", "/stake/pool", { fixture: FIXTURE, subject: "away" });
  clearMemoryCache();
  await call(h, "POST", "/stake/pool", { fixture: { ...FIXTURE, home: "Arsenal", away: "Newcastle United" }, subject: "home" });
  assert.equal(hashes.length, 2);
  assert.equal(hashes[0], hashes[1]);
});

test("the pool route checks its input and the install header", async () => {
  const h = harness();
  assert.equal((await result(call(h, "POST", "/stake/pool", { fixture: FIXTURE, subject: "draw" }))).body.error, "invalid_subject");
  assert.equal((await result(call(h, "POST", "/stake/pool", { fixture: { home: "A" }, subject: "home" }))).body.error, "invalid_fixture");
  assert.equal((await result(call(h, "POST", "/stake/pool", { fixture: { ...FIXTURE, away: "Newcastle" }, subject: "home" }))).body.error, "invalid_fixture");
  assert.equal((await result(call(h, "POST", "/stake/pool", { fixture: FIXTURE, subject: "home" }, {}))).body.error, "missing_install");
});

// ---- /stake/build ----

test("the first stake creates the pool and returns a transaction for the staker", async () => {
  const h = harness();
  const { status, body } = await build(h);
  assert.equal(status, 200);
  assert.equal(body.txBytes, "BYTES");
  assert.deepEqual(body.summary, { poolId: POOL, side: "YES", amountMist: "1000000000", multiplierNow: 0.99 });
  assert.equal(h.created.length, 1);
  assert.deepEqual(h.built[0], { sender: SENDER, budget: 20_000_000 });

  const identity = await poolIdentity(FIXTURE, "away");
  assert.equal(h.created[0].hash, identity.questionHash);
  assert.equal(h.data.get("stakecap:2026-11-20:pools")?.value, "1");
  const index = h.data.get(`stakepool:${POOL}`);
  assert.deepEqual(index?.metadata, { phase: "open", dueMs: KICKOFF_MS + 8_100_000 });
  assert.equal(JSON.parse(index!.value).league, "eng.1");
});

test("a page's later kickoff never reaches the chain: the pool closes at ESPN's", async () => {
  const late = pick({ fixture: { home: "Newcastle United", away: "Arsenal", startISO: "2026-11-21T23:59:00.000Z", subject: "away" } });
  const h = harness({ picks: [late] });
  assert.equal((await build(h)).status, 200);
  assert.equal(h.created[0].closeMs, BigInt(KICKOFF_MS));
});

test("a match ESPN lists the other way round keeps the right subject for the sweep", async () => {
  const reversed = pick({ fixture: { home: "Arsenal", away: "Newcastle United", startISO: KICKOFF, subject: "home" } });
  const h = harness({ picks: [reversed] });
  assert.equal((await build(h)).status, 200);
  const entry = JSON.parse(h.data.get(`stakepool:${POOL}`)!.value);
  assert.equal(entry.home, "Newcastle United");
  assert.equal(entry.subject, "away");
});

test("you can only back your own call: the side comes from the pick", async () => {
  const { body } = await build(harness({ picks: [pick({ pYes: 0.3 })] }));
  assert.equal(body.summary.side, "NO");
  assert.equal((await build(harness({ picks: [pick({ pYes: 0.5 })] }))).body.summary.side, "YES");
});

test("an existing pool is used without creating or counting", async () => {
  const h = harness({ poolId: POOL });
  const { body } = await build(h);
  assert.equal(h.created.length, 0);
  assert.equal(h.data.size, 0);
  // (4 + 2 + 1) * 0.99 / 5
  assert.equal(body.summary.multiplierNow, 1.386);
});

const refusals: [string, Options, Record<string, unknown>, string][] = [
  ["unknown pick", { picks: [] }, {}, "pick_not_found"],
  ["no fixture", { picks: [pick({ fixture: undefined })] }, {}, "not_a_fixture_pick"],
  ["no commit", { picks: [pick({ commit: null })] }, {}, "pick_not_committed"],
  ["kickoff too near", { picks: [pick({ fixture: { home: "Newcastle United", away: "Arsenal", startISO: new Date(NOW + 119_000).toISOString(), subject: "away" } })] }, {}, "too_close_to_kickoff"],
  ["bad amount", {}, { amountMist: "1.5" }, "invalid_amount"],
  ["zero amount", {}, { amountMist: "0" }, "invalid_amount"],
  ["bad sender", {}, { sender: "0x12" }, "invalid_sender"],
  ["below the minimum", {}, { amountMist: "99999999" }, "below_min_stake"],
  ["above the personal limit", {}, { amountMist: "5000000001" }, "above_user_limit"],
  ["cannot pay", { balance: SUI }, {}, "insufficient_balance"],
  ["not on ESPN", { fetcher: boardWith() }, {}, "fixture_not_on_espn"],
  ["already started", { fetcher: boardWith(espnEvent({ state: "in" })) }, {}, "fixture_not_open"],
  ["postponed", { fetcher: boardWith(espnEvent({ statusName: "STATUS_POSTPONED" })) }, {}, "fixture_not_open"],
  ["ESPN says a different day", { fetcher: boardWith(espnEvent({ startISO: "2026-11-22T17:30:00.000Z" })) }, {}, "fixture_date_mismatch"],
  ["ESPN says kickoff is near", { fetcher: boardWith(espnEvent({ startISO: new Date(NOW + 60_000).toISOString() })) }, {}, "too_close_to_kickoff"],
  ["ESPN is down", { fetcher: async () => { throw new Error("down"); } }, {}, "espn_unavailable"],
  ["resolver nearly out of gas", { resolverBalance: RESOLVER_MIN_BALANCE_MIST - 1n }, {}, "resolver_low_balance"],
  ["KV cannot be read", { kvFail: { get: true } }, {}, "kv_unavailable"],
  ["KV cannot be written", { kvFail: { put: true } }, {}, "kv_unavailable"],
];

for (const [name, options, overrides, code] of refusals) {
  test(`build refuses and creates nothing: ${name}`, async () => {
    const h = harness(options);
    assert.equal((await build(h, overrides)).body.error, code);
    assert.equal(h.created.length, 0);
    assert.equal(h.built.length, 0);
  });
}

test("build refuses against an existing pool", async () => {
  const held = { side: true, amount: 4_500_000_000n, claimed: false };
  const cases: [Options, string][] = [
    [{ poolId: POOL, pool: openPool({ status: "void" }) }, "pool_not_open"],
    [{ poolId: POOL, pool: openPool({ closeMs: BigInt(NOW + 60_000) }) }, "too_close_to_kickoff"],
    [{ poolId: POOL, position: { ...held, side: false } }, "side_switch"],
    [{ poolId: POOL, position: held }, "above_user_limit"],
    [{ poolId: POOL, pool: openPool({ yes: 49n * SUI, no: 500_000_000n }) }, "pool_full"],
  ];
  for (const [options, code] of cases) {
    const h = harness(options);
    assert.equal((await build(h)).body.error, code);
    assert.equal(h.built.length, 0);
  }
});

test("adding to your own side within the limit is allowed", async () => {
  assert.equal((await build(harness({ poolId: POOL, position: { side: true, amount: 4n * SUI, claimed: false } }))).status, 200);
});

test("the daily pool cap stops creation", async () => {
  const h = harness();
  h.data.set("stakecap:2026-11-20:pools", { value: String(POOL_CREATE_DAILY_CAP) });
  const { status, body } = await build(h);
  assert.equal(status, 429);
  assert.equal(body.error, "pool_cap_reached");
  assert.equal(h.created.length, 0);
});

test("while a drill has the delays shortened, no real pool can be created", async () => {
  const h = harness({ chain: { readConfig: async () => ({ ...CONFIG, minResolveDelayMs: 0n, challengeMs: 900_000n }) } });
  const { status, body } = await build(h);
  assert.equal(status, 503);
  assert.equal(body.error, "staking_paused");
  assert.equal(h.created.length, 0);
  assert.equal(h.data.size, 0);
});

test("while the delays are shortened, staking in an existing pool still works", async () => {
  const h = harness({ poolId: POOL, chain: { readConfig: async () => ({ ...CONFIG, minResolveDelayMs: 0n, challengeMs: 900_000n }) } });
  assert.equal((await build(h)).status, 200);
});

test("a resolver transaction already running means try again", async () => {
  const h = harness();
  h.data.set("stake:resolver-lock", { value: "1" });
  assert.equal((await build(h)).body.error, "resolver_busy");
  assert.equal(h.created.length, 0);
});

test("the resolver lock is released after a create", async () => {
  const h = harness();
  await build(h);
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

test("losing a race to create the pool uses the winner's pool", async () => {
  let finds = 0;
  const h = harness({
    chain: {
      findPoolId: async () => (finds++ === 0 ? null : OTHER_POOL),
      createPool: async () => {
        throw new Error("abort code: 2");
      },
    },
  });
  const { body } = await build(h);
  assert.equal(body.summary.poolId, OTHER_POOL);
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

test("a contract refusal at build time is reported with its code", async () => {
  const h = harness({
    poolId: POOL,
    chain: {
      buildForSender: async () => {
        throw new Error("Transaction resolution failed: MoveAbort in 1st command, abort code: 7, in 'x::pool::stake'");
      },
    },
  });
  const { status, body } = await build(h);
  assert.equal(status, 409);
  assert.deepEqual(body, { error: "stake_rejected", abortCode: "7" });
});

test("a failure with no contract code is a plain 502 with nothing leaked", async () => {
  const h = harness({
    poolId: POOL,
    chain: {
      buildForSender: async () => {
        throw new Error("secret-looking detail");
      },
    },
  });
  const { status, body } = await build(h);
  assert.equal(status, 502);
  assert.deepEqual(body, { error: "stake_unavailable" });
});

// ---- /stake/confirm ----

const staked = (overrides: Partial<StakedEvent> = {}): StakedEvent => ({
  poolId: POOL,
  staker: SENDER,
  side: true,
  amount: SUI,
  pickHash: HASH,
  sender: SENDER,
  ...overrides,
});

const confirm = (h: Harness, overrides: Record<string, unknown> = {}) => result(call(h, "POST", "/stake/confirm", { pickId: "p1", digest: DIGEST, ...overrides }));
const confirmable = (events: StakedEvent[], extra: Options = {}): Harness => harness({ poolId: POOL, transaction: { succeeded: true, staked: events }, ...extra });

test("a matching event writes the stake and both indexes", async () => {
  const h = confirmable([staked()]);
  const { status, body } = await confirm(h);
  assert.equal(status, 200);
  assert.equal(body.duplicate, false);
  assert.equal(h.written.length, 1);
  const [record] = h.written;
  assert.equal(record.poolId, POOL);
  assert.equal(record.side, "YES");
  assert.equal(record.amountMist, "1000000000");
  assert.equal(record.sender, SENDER);
  assert.equal(record.about, "Arsenal win vs Newcastle United on 2026-11-21");
  assert.deepEqual(JSON.parse(h.data.get(`stakeaddr:${SENDER}:${POOL}`)!.value), { digests: [DIGEST] });
  assert.ok(h.data.has(`stakepool:${POOL}`));
});

test("confirming the same digest twice records it once", async () => {
  const h = confirmable([staked()]);
  await confirm(h);
  const second = await confirm(h);
  assert.equal(second.body.duplicate, true);
  assert.equal(h.written.length, 1);
});

test("a second stake in the same pool adds its digest", async () => {
  const h = confirmable([staked()]);
  await confirm(h);
  await confirm(h, { digest: DIGEST.replace("8", "9") });
  assert.equal(JSON.parse(h.data.get(`stakeaddr:${SENDER}:${POOL}`)!.value).digests.length, 2);
});

test("an existing pool index is left alone", async () => {
  const h = confirmable([staked()]);
  h.data.set(`stakepool:${POOL}`, { value: "{}", metadata: { phase: "open", dueMs: 1 } });
  await confirm(h);
  assert.equal(h.data.get(`stakepool:${POOL}`)?.value, "{}");
});

test("confirm rejects anything that does not match the pick", async () => {
  const cases: [StakedEvent[], string][] = [
    [[staked({ pickHash: "ee".repeat(32) })], "stake_mismatch"],
    [[staked({ side: false })], "stake_mismatch"],
    [[staked({ poolId: OTHER_POOL })], "stake_mismatch"],
    [[staked({ staker: OTHER_POOL })], "stake_mismatch"],
    [[staked({ amount: 0n })], "stake_mismatch"],
    [[], "stake_mismatch"],
  ];
  for (const [events, code] of cases) {
    const h = confirmable(events);
    assert.equal((await confirm(h)).body.error, code);
    assert.equal(h.written.length, 0);
    assert.equal(h.data.size, 0);
  }
});

test("confirm reports a failed or unknown transaction, and bad input", async () => {
  assert.equal((await confirm(harness({ poolId: POOL, transaction: { succeeded: false, staked: [staked()] } }))).body.error, "transaction_failed");
  const unknown = await confirm(harness({ poolId: POOL, transaction: null }));
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error, "transaction_not_found");
  assert.equal((await confirm(harness(), { digest: "nope" })).body.error, "invalid_digest");
});

test("if Walrus fails nothing is indexed, so a retry works", async () => {
  const h = confirmable([staked()]);
  (h.deps.store as unknown as { write: () => Promise<never> }).write = async () => {
    throw new Error("walrus down");
  };
  assert.equal((await confirm(h)).status, 502);
  assert.equal(h.data.size, 0);
});

// ---- /stake/positions ----

const seedPosition = (h: Harness, poolId = POOL, startISO = KICKOFF): void => {
  h.data.set(`stakeaddr:${SENDER}:${poolId}`, {
    value: JSON.stringify({ digests: [DIGEST] }),
    metadata: { pickId: "p1", home: "Newcastle United", away: "Arsenal", startISO, subject: "away" },
  });
};

test("positions list the match, side, status and estimated payout", async () => {
  const h = harness({ position: { side: true, amount: SUI, claimed: false } });
  seedPosition(h);
  const { body } = await result(call(h, "GET", `/stake/positions?address=${SENDER}`));
  assert.deepEqual(body, {
    positions: [
      {
        poolId: POOL,
        pickId: "p1",
        match: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" },
        side: "YES",
        status: "open",
        amountMist: "1000000000",
        estimatedPayoutMist: "1485000000",
        claimOpensAtMs: null,
        result: null,
      },
    ],
    truncated: false,
  });
});

test("positions need a full address", async () => {
  assert.equal((await result(call(harness(), "GET", "/stake/positions?address=0x12"))).body.error, "invalid_address");
  assert.equal((await result(call(harness(), "GET", "/stake/positions"))).body.error, "invalid_address");
});

test("a long list of positions is capped and says so", async () => {
  const h = harness({ position: { side: true, amount: SUI, claimed: false } });
  for (let i = 0; i < 25; i++) seedPosition(h, `0x${i.toString(16).padStart(64, "0")}`);
  const { body } = await result(call(h, "GET", `/stake/positions?address=${SENDER}`));
  assert.equal(body.positions.length, 20);
  assert.equal(body.truncated, true);
});

// ---- /stake/balance ----

test("the balance comes back as MIST text, for a full address only", async () => {
  const { body } = await result(call(harness({ balance: 153_574_000n }), "GET", `/stake/balance?address=${SENDER}`));
  assert.deepEqual(body, { address: SENDER, balanceMist: "153574000" });
  assert.equal((await result(call(harness(), "GET", "/stake/balance?address=0x12"))).body.error, "invalid_address");
  assert.equal((await result(call(harness(), "GET", `/stake/balance?address=${SENDER}`, undefined, {}))).body.error, "missing_install");
});

// ---- /stake/claim/build ----

const claim = (h: Harness) => result(call(h, "POST", "/stake/claim/build", { poolId: POOL, sender: SENDER }));
const RESOLVED = { status: "resolved", outcomeYes: true, yesTotal: 4n * SUI, noTotal: 2n * SUI, feeAmount: 60_000_000n } as const;

test("a winner past the window gets a claim transaction", async () => {
  const h = harness({ pool: openPool({ ...RESOLVED, resolvedAtMs: BigInt(NOW - 21_600_000) }), position: { side: true, amount: SUI, claimed: false } });
  const { body } = await claim(h);
  assert.equal(body.txBytes, "BYTES");
  assert.deepEqual(body.summary, { poolId: POOL, status: "claimable", amountMist: "1485000000" });
});

test("a void pool can be refunded at once", async () => {
  const h = harness({ pool: openPool({ status: "void" }), position: { side: false, amount: SUI, claimed: false } });
  const { body } = await claim(h);
  assert.deepEqual(body.summary, { poolId: POOL, status: "refundable", amountMist: "1000000000" });
});

test("claims are refused with the reason", async () => {
  const inWindow = openPool({ ...RESOLVED, resolvedAtMs: BigInt(NOW - 1) });
  const after = openPool({ ...RESOLVED, resolvedAtMs: BigInt(NOW - 21_600_000) });
  const win = { side: true, amount: SUI, claimed: false };
  const window = await claim(harness({ pool: inWindow, position: win }));
  assert.equal(window.status, 409);
  assert.deepEqual(window.body, { error: "not_claimable", status: "challenge_window", claimOpensAtMs: NOW - 1 + 21_600_000 });
  assert.equal((await claim(harness({ pool: after, position: { ...win, side: false } }))).body.status, "lost");
  assert.equal((await claim(harness({ pool: after, position: { ...win, claimed: true } }))).body.status, "claimed");
  assert.equal((await claim(harness({ position: win }))).body.status, "open");
  assert.equal((await claim(harness({ pool: after, position: null }))).body.error, "no_position");
});

test("a claim on something that is not our pool is not found", async () => {
  const h = harness({
    chain: {
      readPool: async () => {
        throw new Error("not_a_stake_pool");
      },
    },
  });
  assert.equal((await claim(h)).status, 404);
});

// ---- /stake/admin/pending ----

test("the admin list does not exist without the token", async () => {
  assert.equal((await call(harness(), "GET", "/stake/admin/pending", undefined, {})).status, 404);
});

test("the admin list shows pools in their window with time left", async () => {
  const opens = NOW + 3_600_000;
  const pool = openPool({ ...RESOLVED, resolvedAtMs: BigInt(opens - 21_600_000), evidence: "Newcastle United 1-2 Arsenal (ESPN, full time)" });
  const h = harness({ pool });
  h.data.set(`stakepool:${POOL}`, {
    value: JSON.stringify({ poolId: POOL, home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away", questionHash: HASH }),
    metadata: { phase: "resolved", dueMs: opens },
  });
  h.data.set(`stakepool:${OTHER_POOL}`, { value: "{}", metadata: { phase: "open", dueMs: NOW } });
  h.data.set("stakelog:recent", { value: JSON.stringify([{ action: "resolve" }]) });
  const { body } = await result(call(h, "GET", "/stake/admin/pending", undefined, { "X-Soothia-Admin": ADMIN }));
  assert.equal(body.pending.length, 1);
  assert.deepEqual(body.pending[0], {
    poolId: POOL,
    match: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" },
    evidence: "Newcastle United 1-2 Arsenal (ESPN, full time)",
    outcome: "YES",
    yesTotal: "4000000000",
    noTotal: "2000000000",
    feeMist: "60000000",
    claimOpensAtMs: opens,
    timeLeftMs: 3_600_000,
  });
  assert.deepEqual(body.recentActions, [{ action: "resolve" }]);
});

// ---- wiring ----

test("unknown stake paths are 404, and missing settings are a 503", async () => {
  assert.equal((await call(harness(), "GET", "/stake/nope")).status, 404);
  const h = harness();
  const { status, body } = await result(stakeRoute(new Request("https://x/stake/pool", { method: "POST", headers: { "X-Soothia-Install": INSTALL }, body: "{}" }), h.env, "/stake/pool", {}));
  assert.equal(status, 503);
  assert.equal(body.error, "stake_not_configured");
});

test("the Worker rate limits stake routes by IP", async () => {
  const { env } = harness();
  const ctx = { waitUntil: () => undefined } as unknown as ExecutionContext;
  const hit = () => worker.fetch(new Request("https://x/stake/nope", { headers: { "CF-Connecting-IP": "9.9.9.9" } }) as never, env, ctx);
  for (let i = 0; i < 30; i++) assert.equal((await hit()).status, 404);
  assert.equal((await hit()).status, 429);
});
