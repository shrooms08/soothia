// The staking sweep, with the chain, ESPN and KV faked. Run with `npm test`.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import type { ScoreboardEvent, ScoreboardFetcher } from "../src/recall/espn";
import { clearMemoryCache } from "../src/store";
import type { StakeChain } from "../src/stake/chain";
import type { StakePool } from "../src/stake/readers";
import { decideSettlement, STAKE_LOG_KEY, sweepStake, type PoolIndexEntry, type SweepAction } from "../src/stake/sweep";

const SUI = 1_000_000_000n;
const KICKOFF = "2026-11-21T17:30:00.000Z";
const KICKOFF_MS = Date.parse(KICKOFF);
const RESOLVE_DELAY = 8_100_000;
const CHALLENGE = 21_600_000;
const AFTER_MATCH = new Date(KICKOFF_MS + RESOLVE_DELAY + 1_000);
const DAY_LATER = new Date(KICKOFF_MS + 86_400_000);
const poolIdOf = (n: number): string => `0x${n.toString(16).padStart(64, "0")}`;
const POOL = poolIdOf(1);

const pool = (overrides: Partial<StakePool> = {}): StakePool => ({
  id: POOL,
  questionHash: "11".repeat(32),
  closeMs: BigInt(KICKOFF_MS),
  feeBps: 100n,
  minResolveDelayMs: BigInt(RESOLVE_DELAY),
  challengeMs: BigInt(CHALLENGE),
  yes: 2n * SUI,
  no: SUI,
  positionsTableId: POOL,
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

function event(
  homeScore: number | null,
  awayScore: number | null,
  overrides: Partial<ScoreboardEvent> = {},
): ScoreboardEvent {
  return {
    espnId: "1",
    startISO: KICKOFF,
    statusName: "STATUS_FULL_TIME",
    state: "post",
    completed: true,
    home: { name: "Newcastle United", short: "Newcastle", abbreviation: "NEW", score: homeScore },
    away: { name: "Arsenal", short: "Arsenal", abbreviation: "ARS", score: awayScore },
    competition: "Premier League",
    url: "https://espn.com/match",
    ...overrides,
  };
}

const boardWith =
  (...events: ScoreboardEvent[]): ScoreboardFetcher =>
  async () => ({ competition: "", events });
const OTHER_MATCH = event(1, 1, {
  home: { name: "Leeds United", short: "Leeds", abbreviation: "LEE", score: 1 },
  away: { name: "Everton", short: "Everton", abbreviation: "EVE", score: 1 },
});

const entry = (poolId = POOL, overrides: Partial<PoolIndexEntry> = {}): PoolIndexEntry => ({
  poolId,
  home: "Newcastle United",
  away: "Arsenal",
  startISO: KICKOFF,
  subject: "away",
  questionHash: "11".repeat(32),
  league: "eng.1",
  ...overrides,
});

function harness(
  options: { pools?: Map<string, StakePool>; pool?: StakePool; after?: StakePool; chain?: Partial<StakeChain> } = {},
) {
  const data = new Map<string, { value: string; metadata?: unknown }>();
  const env = {
    SOOTHIA_CACHE: {
      get: async (key: string, type?: string) => {
        const found = data.get(key);
        if (!found) return null;
        return type === "json" ? JSON.parse(found.value) : found.value;
      },
      put: async (key: string, value: string, opts?: { metadata?: unknown }) => {
        data.set(key, { value, metadata: opts?.metadata });
      },
      delete: async (key: string) => {
        data.delete(key);
      },
      list: async ({ prefix }: { prefix: string }) => ({
        keys: [...data.entries()]
          .filter(([name]) => name.startsWith(prefix))
          .map(([name, found]) => ({ name, metadata: found.metadata })),
        list_complete: true,
      }),
    },
  } as unknown as Env;
  const calls: string[] = [];
  let resolved = false;
  const chain = {
    readPool: async (poolId: string) => {
      if (resolved && options.after) return options.after;
      return options.pools?.get(poolId) ?? options.pool ?? pool();
    },
    resolvePool: async (poolId: string, outcomeYes: boolean, evidence: string) => {
      resolved = true;
      calls.push(`resolve ${poolId} ${outcomeYes} ${evidence}`);
      return "digest-resolve";
    },
    voidPool: async (poolId: string) => {
      calls.push(`void ${poolId}`);
      return "digest-void";
    },
    collectFee: async (poolId: string) => {
      calls.push(`fee ${poolId}`);
      return "digest-fee";
    },
    ...options.chain,
  } as unknown as StakeChain;
  const index = (
    poolId = POOL,
    phase: "open" | "resolved" = "open",
    dueMs = KICKOFF_MS + RESOLVE_DELAY,
    value = entry(poolId),
  ): void => {
    data.set(`stakepool:${poolId}`, { value: JSON.stringify(value), metadata: { phase, dueMs } });
  };
  const run = (now: Date, fetcher: ScoreboardFetcher = boardWith(event(1, 2))) =>
    sweepStake(env, { chain, fetcher, now });
  return { data, calls, index, run };
}

beforeEach(() => clearMemoryCache());

const RESOLVED_POOL = {
  status: "resolved",
  outcomeYes: true,
  yesTotal: 2n * SUI,
  noTotal: SUI,
  feeAmount: 30_000_000n,
} as const;
const settledAfterWindow = (overrides: Partial<StakePool> = {}): StakePool =>
  pool({ ...RESOLVED_POOL, resolvedAtMs: BigInt(AFTER_MATCH.getTime() - CHALLENGE), ...overrides });

test("a finished match resolves the pool with ESPN's score as evidence", async () => {
  const opensAt = AFTER_MATCH.getTime() + CHALLENGE;
  const h = harness({ after: pool({ ...RESOLVED_POOL, resolvedAtMs: BigInt(AFTER_MATCH.getTime()) }) });
  h.index();
  const result = await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, [`resolve ${POOL} true Newcastle United 1-2 Arsenal (ESPN, full time)`]);
  assert.equal(result.actions[0].digest, "digest-resolve");
  assert.deepEqual(h.data.get(`stakepool:${POOL}`)?.metadata, { phase: "resolved", dueMs: opensAt });
});

test("YES means the subject team won", () => {
  const search = (home: number, away: number) => ({
    located: { event: event(home, away), league: "eng.1", reversed: false, notPlayed: false },
    eventsSeen: 1,
  });
  const decide = (subject: "home" | "away", home: number, away: number) =>
    decideSettlement(subject, search(home, away), KICKOFF_MS, AFTER_MATCH.getTime());
  assert.equal((decide("away", 1, 2) as { outcomeYes: boolean }).outcomeYes, true);
  assert.equal((decide("away", 2, 1) as { outcomeYes: boolean }).outcomeYes, false);
  assert.equal((decide("home", 2, 1) as { outcomeYes: boolean }).outcomeYes, true);
});

test("a draw is NO for both pools on the match", () => {
  const search = { located: { event: event(1, 1), league: "eng.1", reversed: false, notPlayed: false }, eventsSeen: 1 };
  for (const subject of ["home", "away"] as const) {
    assert.equal(
      (decideSettlement(subject, search, KICKOFF_MS, AFTER_MATCH.getTime()) as { outcomeYes: boolean }).outcomeYes,
      false,
    );
  }
});

test("a reversed listing still pays the team the question was about", async () => {
  const h = harness();
  // Stored as if the page listed Arsenal at home; ESPN has them away, and they won.
  h.index(
    POOL,
    "open",
    KICKOFF_MS + RESOLVE_DELAY,
    entry(POOL, { home: "Arsenal", away: "Newcastle United", subject: "home" }),
  );
  await h.run(AFTER_MATCH);
  assert.equal(h.calls[0].split(" ")[2], "true");
});

test("a match not finished yet waits", async () => {
  const h = harness();
  h.index();
  await h.run(AFTER_MATCH, boardWith(event(1, 0, { completed: false, state: "in", statusName: "STATUS_IN_PROGRESS" })));
  assert.deepEqual(h.calls, []);
  assert.ok(h.data.has(`stakepool:${POOL}`));
});

test("nothing is checked before the resolve time", async () => {
  const h = harness({ chain: { readPool: async () => assert.fail("should not read") } });
  h.index();
  const result = await h.run(new Date(KICKOFF_MS + RESOLVE_DELAY - 1));
  assert.equal(result.checked, 0);
});

test("the pool's own delay beats the index", async () => {
  const h = harness({ pool: pool({ minResolveDelayMs: BigInt(RESOLVE_DELAY * 2) }) });
  h.index();
  await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, []);
});

test("a missing fixture waits a day, then voids", async () => {
  const early = harness();
  early.index();
  await early.run(new Date(KICKOFF_MS + 86_399_000), boardWith(OTHER_MATCH));
  assert.deepEqual(early.calls, []);

  const late = harness();
  late.index();
  const result = await late.run(DAY_LATER, boardWith(OTHER_MATCH));
  assert.deepEqual(late.calls, [`void ${POOL}`]);
  assert.equal(result.actions[0].detail, "not_found");
  assert.equal(late.data.has(`stakepool:${POOL}`), false);
});

const SEVENTY_TWO_HOURS = 72 * 3_600_000;

test("an empty answer from ESPN waits until 72 hours after kickoff", async () => {
  const early = harness();
  early.index();
  await early.run(new Date(KICKOFF_MS + SEVENTY_TWO_HOURS - 1), boardWith());
  assert.deepEqual(early.calls, []);
  assert.ok(early.data.has(`stakepool:${POOL}`));

  const late = harness();
  late.index();
  const result = await late.run(new Date(KICKOFF_MS + SEVENTY_TWO_HOURS), boardWith());
  assert.deepEqual(late.calls, [`void ${POOL}`]);
  assert.equal(result.actions[0].detail, "no_result");
});

test("a match ESPN never marks final is voided at 72 hours, not before", async () => {
  const stuck = event(1, 0, { completed: false, state: "in", statusName: "STATUS_IN_PROGRESS" });
  const early = harness();
  early.index();
  await early.run(new Date(KICKOFF_MS + SEVENTY_TWO_HOURS - 1), boardWith(stuck));
  assert.deepEqual(early.calls, []);

  const late = harness();
  late.index();
  const result = await late.run(new Date(KICKOFF_MS + SEVENTY_TWO_HOURS), boardWith(stuck));
  assert.deepEqual(late.calls, [`void ${POOL}`]);
  assert.equal(result.actions[0].detail, "no_result");
  assert.equal(late.data.has(`stakepool:${POOL}`), false);
});

test("a result that arrives after 72 hours still resolves the pool", async () => {
  const h = harness();
  h.index();
  await h.run(new Date(KICKOFF_MS + SEVENTY_TWO_HOURS + 1));
  assert.equal(h.calls[0].startsWith("resolve"), true);
});

test("ESPN being down never voids a pool", async () => {
  const h = harness();
  h.index();
  await h.run(new Date(KICKOFF_MS + 5 * 86_400_000), async () => {
    throw new Error("down");
  });
  assert.deepEqual(h.calls, []);
  assert.ok(h.data.has(`stakepool:${POOL}`));
});

test("a postponed match waits a day, then voids", async () => {
  const postponed = event(null, null, { completed: false, state: "post", statusName: "STATUS_POSTPONED" });
  const early = harness();
  early.index();
  await early.run(AFTER_MATCH, boardWith(postponed));
  assert.deepEqual(early.calls, []);

  const late = harness();
  late.index();
  const result = await late.run(DAY_LATER, boardWith(postponed));
  assert.deepEqual(late.calls, [`void ${POOL}`]);
  assert.equal(result.actions[0].detail, "not_played");
});

test("an empty pool is dropped without spending gas", async () => {
  const h = harness({ pool: pool({ yes: 0n, no: 0n }) });
  h.index();
  const result = await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, []);
  assert.equal(h.data.has(`stakepool:${POOL}`), false);
  assert.equal(result.actions[0].action, "dropped_empty");
});

test("a resolve that voids because nobody backed the winner closes the entry", async () => {
  const h = harness({ after: pool({ status: "void" }) });
  h.index();
  await h.run(AFTER_MATCH);
  assert.equal(h.data.has(`stakepool:${POOL}`), false);
});

test("a run that died after resolving is picked up from the chain", async () => {
  const resolvedAt = AFTER_MATCH.getTime() - 1_000;
  const h = harness({ pool: pool({ ...RESOLVED_POOL, resolvedAtMs: BigInt(resolvedAt) }) });
  h.index();
  await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, []);
  assert.deepEqual(h.data.get(`stakepool:${POOL}`)?.metadata, { phase: "resolved", dueMs: resolvedAt + CHALLENGE });
});

test("the fee is collected once the window ends, and the entry closes", async () => {
  const h = harness({ pool: settledAfterWindow() });
  h.index(POOL, "resolved", AFTER_MATCH.getTime());
  const result = await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, [`fee ${POOL}`]);
  assert.equal(result.actions[0].action, "collect_fee");
  assert.equal(h.data.has(`stakepool:${POOL}`), false);
});

test("a fee already collected, or a pool overturned, closes without a transaction", async () => {
  for (const finished of [settledAfterWindow({ feeCollected: true }), pool({ status: "void", resolvedAtMs: 5n })]) {
    const h = harness({ pool: finished });
    h.index(POOL, "resolved", AFTER_MATCH.getTime());
    await h.run(AFTER_MATCH);
    assert.deepEqual(h.calls, []);
    assert.equal(h.data.has(`stakepool:${POOL}`), false);
  }
});

test("a run sends at most two transactions and looks at five pools", async () => {
  const h = harness();
  for (let i = 1; i <= 8; i++) h.index(poolIdOf(i));
  const result = await h.run(AFTER_MATCH);
  assert.equal(h.calls.length, 2);
  assert.equal(result.checked, 5);
});

test("a resolver transaction already running makes the sweep wait", async () => {
  const h = harness();
  h.index();
  h.data.set("stake:resolver-lock", { value: "1" });
  await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, []);
  assert.ok(h.data.has("stake:resolver-lock"));
});

test("the lock is released after a run", async () => {
  const h = harness();
  h.index();
  await h.run(AFTER_MATCH);
  assert.equal(h.data.has("stake:resolver-lock"), false);
});

test("one pool's failure does not stop the next", async () => {
  const h = harness({
    chain: {
      readPool: async (poolId: string) => {
        if (poolId === poolIdOf(1)) throw new Error("boom");
        return pool({ id: poolId });
      },
    },
  });
  h.index(poolIdOf(1));
  h.index(poolIdOf(2));
  await h.run(AFTER_MATCH);
  assert.equal(h.calls.length, 1);
  assert.ok(h.calls[0].includes(poolIdOf(2)));
  assert.ok(h.data.has(`stakepool:${poolIdOf(1)}`));
});

test("a failed resolve keeps the entry for the next run", async () => {
  const h = harness({
    chain: {
      resolvePool: async () => {
        throw new Error("no gas");
      },
    },
  });
  h.index();
  const result = await h.run(AFTER_MATCH);
  assert.equal(result.actions.length, 0);
  assert.ok(h.data.has(`stakepool:${POOL}`));
});

test("each action is logged in KV, newest first and capped", async () => {
  const h = harness();
  h.index();
  const old = Array.from({ length: 50 }, (_, i) => ({ at: "t", poolId: String(i), action: "closed" }));
  h.data.set(STAKE_LOG_KEY, { value: JSON.stringify(old) });
  await h.run(AFTER_MATCH);
  const log = JSON.parse(h.data.get(STAKE_LOG_KEY)!.value) as SweepAction[];
  assert.equal(log.length, 50);
  assert.equal(log[0].action, "resolve");
  assert.equal(log[0].digest, "digest-resolve");
});

test("a run with nothing to do writes nothing", async () => {
  const h = harness();
  h.index(POOL, "open", AFTER_MATCH.getTime() + 1);
  await h.run(AFTER_MATCH);
  assert.equal(h.data.has(STAKE_LOG_KEY), false);
});

test("no chain configured means no sweep", async () => {
  const env = { SOOTHIA_CACHE: { list: async () => assert.fail("should not list") } } as unknown as Env;
  assert.deepEqual(await sweepStake(env), { checked: 0, actions: [] });
});

test("a pool where nobody backed the losing side is voided, so winners aren't charged a fee", async () => {
  const h = harness({ pool: pool({ yes: 2n * SUI, no: 0n }) });
  h.index();
  const result = await h.run(AFTER_MATCH);
  assert.deepEqual(h.calls, [`void ${POOL}`]);
  assert.equal(result.actions[0].detail, "no_losing_stakes");
});

test("a pool with stakes on both sides still resolves", async () => {
  const h = harness({
    pool: pool({ yes: 2n * SUI, no: SUI }),
    after: pool({ ...RESOLVED_POOL, resolvedAtMs: BigInt(AFTER_MATCH.getTime()) }),
  });
  h.index();
  await h.run(AFTER_MATCH);
  assert.match(h.calls[0], /^resolve /);
});
