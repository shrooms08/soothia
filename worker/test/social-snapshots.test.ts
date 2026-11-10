// Snapshots, boards and the public routes, with Walrus, Sui, ESPN and KV faked.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import type { ScoreboardFetcher, ScoreboardEvent } from "../src/recall/espn";
import type { OutcomeRecord, PickRecord, StakeRecord } from "../src/recall/records";
import { clearMemoryCache } from "../src/store";
import type { ProfileIndex } from "../src/social/context";
import { socialRoute } from "../src/social/routes";
import {
  Budget,
  buildBoards,
  buildSnapshot,
  sweepSocial,
  type ProfileSnapshot,
  type SnapshotDeps,
} from "../src/social/snapshots";
import { computeStats, MAX_BOARD_ROWS, statsForPeriod } from "../src/social/stats";
import type { StakePool } from "../src/stake/readers";

const SUI = 1_000_000_000n;
const NOW = new Date("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-08T15:00:00.000Z";
const KICKOFF_MS = Date.parse(KICKOFF);
const ADDRESS = `0x${"aa".repeat(32)}`;
const OTHER = `0x${"cc".repeat(32)}`;
const POOL = `0x${"bb".repeat(32)}`;
const profile: ProfileIndex = {
  handle: "amy",
  address: ADDRESS,
  userKey: "secretuserkey",
  publicSince: "2026-11-08T00:00:00.000Z",
  shareHistory: false,
};

const pick = (id: string, overrides: Partial<PickRecord> = {}): PickRecord => ({
  id,
  at: "2026-11-08T10:00:00.000Z",
  question: "Will Arsenal beat Chelsea?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: ["Arsenal", "Chelsea"],
  endTime: KICKOFF,
  source: { site: "private-site.example", url: "https://private-site.example/secret" },
  fixture: { home: "Arsenal", away: "Chelsea", startISO: KICKOFF, subject: "home", competition: "Prem" },
  hash: "ab".repeat(32),
  commit: { digest: `digest-${id}`, network: "mainnet" },
  ...overrides,
});

const outcome = (pickId: string, hit = true): OutcomeRecord => ({
  pickId,
  at: "2026-11-08T18:00:00.000Z",
  question: "Q",
  category: "sports",
  entities: [],
  result: hit ? "YES" : "NO",
  pYes: 0.7,
  marketYes: null,
  brier: hit ? 0.09 : 0.49,
  marketBrier: null,
  hit,
  detail: "Arsenal 2-0 Chelsea (ESPN, full time)",
  favourite: true,
});

const stakeRecord = (pickId: string, overrides: Partial<StakeRecord> = {}): StakeRecord => ({
  pickId,
  poolId: POOL,
  questionHash: "11".repeat(32),
  side: "YES",
  amountMist: SUI.toString(),
  digest: `tx-${pickId}`,
  at: "2026-11-08T11:00:00.000Z",
  sender: ADDRESS,
  about: "Arsenal win",
  ...overrides,
});

const event = (overrides: Partial<ScoreboardEvent> = {}): ScoreboardEvent => ({
  espnId: "1",
  startISO: KICKOFF,
  statusName: "STATUS_FULL_TIME",
  state: "post",
  completed: true,
  home: { name: "Arsenal", short: "Arsenal", abbreviation: "ARS", score: 2 },
  away: { name: "Chelsea", short: "Chelsea", abbreviation: "CHE", score: 0 },
  competition: "English Premier League",
  url: "",
  ...overrides,
});

interface DepsOptions {
  picks?: PickRecord[];
  outcomes?: OutcomeRecord[];
  stakes?: StakeRecord[];
  commitMs?: number | null;
  commitProblem?: string;
  events?: ScoreboardEvent[];
  pool?: Partial<StakePool>;
}

function depsFor(options: DepsOptions = {}) {
  const counts = { commits: 0, boards: 0, pools: 0 };
  const lists: Record<string, unknown[]> = {
    pick: options.picks ?? [pick("p1")],
    outcome: options.outcomes ?? [outcome("p1")],
    stake: options.stakes ?? [],
  };
  const deps: SnapshotDeps = {
    now: NOW,
    store: () => ({ list: (async (kind: string) => lists[kind]) as never }),
    checkCommit: async (digest) => {
      counts.commits += 1;
      if (options.commitProblem)
        return {
          digest,
          verified: false,
          timestampMs: null,
          checkpoint: null,
          sender: null,
          hash: null,
          explorerUrl: "",
          problem: options.commitProblem,
        };
      return {
        digest,
        verified: true,
        timestampMs: options.commitMs === undefined ? KICKOFF_MS - 3_600_000 : options.commitMs,
        checkpoint: "1",
        sender: null,
        hash: null,
        explorerUrl: "",
      };
    },
    fetcher: (async (league: string) => {
      counts.boards += 1;
      return { competition: "", events: league === "eng.1" ? (options.events ?? [event()]) : [] };
    }) as ScoreboardFetcher,
    chain: {
      readPool: async () => {
        counts.pools += 1;
        return {
          status: "resolved",
          outcomeYes: true,
          yesTotal: SUI,
          noTotal: SUI,
          yes: SUI,
          no: SUI,
          feeAmount: 20_000_000n,
          feeBps: 100n,
          resolvedAtMs: BigInt(KICKOFF_MS),
          challengeMs: 21_600_000n,
          closeMs: BigInt(KICKOFF_MS),
          ...options.pool,
        } as StakePool;
      },
      readPosition: async () => ({ side: true, amount: SUI, claimed: false }),
    },
  };
  return { deps, counts };
}

const build = (
  options: DepsOptions = {},
  who: ProfileIndex = profile,
  previous: ProfileSnapshot | null = null,
  budget = 40,
) => {
  const { deps, counts } = depsFor(options);
  return buildSnapshot(who, previous, deps, new Budget(budget)).then(({ snapshot, feed }) => ({
    snapshot,
    feed,
    counts,
  }));
};

beforeEach(() => clearMemoryCache());

test("a proven, settled call counts, labelled by ESPN", async () => {
  const { snapshot } = await build();
  const { stats, leagues, teams } = snapshot.periods.all;
  assert.equal(stats.settled, 1);
  assert.equal(stats.hits, 1);
  assert.ok(leagues["English Premier League"]);
  assert.ok(teams.Arsenal);
});

test("a call committed after kickoff does not count", async () => {
  const { snapshot } = await build({ commitMs: KICKOFF_MS + 1 });
  assert.equal(snapshot.periods.all.stats.settled, 0);
  assert.equal(snapshot.proofs.p1.proven, false);
});

test("a faked late kickoff cannot pass: ESPN's kickoff decides", async () => {
  const faked = pick("p1", {
    fixture: { home: "Arsenal", away: "Chelsea", startISO: "2026-11-08T23:59:00.000Z", subject: "home" },
  });
  const { snapshot } = await build({ picks: [faked], commitMs: KICKOFF_MS + 3_600_000 });
  assert.equal(snapshot.periods.all.stats.settled, 0);
});

test("a call with no commit, or a mismatched one, does not count", async () => {
  assert.equal((await build({ picks: [pick("p1", { commit: null })] })).snapshot.periods.all.stats.calls, 0);
  const mismatch = await build({ commitProblem: "hash_mismatch" });
  assert.equal(mismatch.snapshot.periods.all.stats.settled, 0);
  assert.equal(mismatch.snapshot.proofs.p1.proven, false);
});

test("an open committed call counts as made, without needing a proof yet", async () => {
  const { snapshot, counts } = await build({ outcomes: [] });
  assert.equal(snapshot.periods.all.stats.calls, 1);
  assert.equal(snapshot.periods.all.stats.settled, 0);
  assert.equal(counts.commits, 0);
});

test("calls before publicSince stay private unless history is shared", async () => {
  const old = pick("old", { at: "2026-11-01T10:00:00.000Z" });
  const picks = [old, pick("p1")];
  const outcomes = [outcome("old"), outcome("p1")];
  const hidden = (await build({ picks, outcomes })).snapshot;
  assert.equal(hidden.periods.all.stats.settled, 1);
  assert.equal(hidden.recent.length, 1);
  assert.equal(hidden.proofs.old, undefined);
  const shared = (await build({ picks, outcomes }, { ...profile, shareHistory: true })).snapshot;
  assert.equal(shared.periods.all.stats.settled, 2);
  assert.equal(shared.recent.length, 2);
});

test("a stake on a private call stays private", async () => {
  const old = pick("old", { at: "2026-11-01T10:00:00.000Z" });
  const { snapshot } = await build({
    picks: [old, pick("p1")],
    outcomes: [outcome("p1")],
    stakes: [stakeRecord("old")],
  });
  assert.equal(snapshot.periods.all.stats.stakedMist, "0");
});

test("a recent call shows what the page needs and nothing about where it was read", async () => {
  const { snapshot } = await build({ stakes: [stakeRecord("p1")] });
  assert.deepEqual(snapshot.recent[0], {
    at: "2026-11-08T10:00:00.000Z",
    match: { home: "Arsenal", away: "Chelsea", startISO: KICKOFF, competition: "English Premier League" },
    lean: "Arsenal win",
    side: "YES",
    confidence: 70,
    status: "right",
    stake: { amountMist: SUI.toString(), result: "won", payoutMist: "1980000000" },
    proof: { digest: "digest-p1", url: "https://suivision.xyz/txblock/digest-p1" },
  });
  assert.equal(JSON.stringify(snapshot).includes("private-site"), false);
});

test("a tailed call says whose it copied", async () => {
  const { snapshot } = await build({ picks: [pick("p1", { tailOf: "ada" })] });
  assert.equal(snapshot.recent[0].tailOf, "ada");
  assert.equal("tailOf" in (await build()).snapshot.recent[0], false);
});

test("the seed feed holds public calls only, with their stakes", async () => {
  const old = pick("old", { at: "2026-11-01T10:00:00.000Z" });
  const { feed } = await build({ picks: [old, pick("p1")], outcomes: [], stakes: [stakeRecord("p1")] });
  assert.deepEqual(
    feed.map((item) => item.pickId),
    ["p1"],
  );
  assert.equal(feed[0].stakeMist, SUI.toString());
});

test("non-fixture calls are not public", async () => {
  assert.equal((await build({ picks: [pick("p1", { fixture: undefined })] })).snapshot.recent.length, 0);
});

test("stakes from another wallet, and repeats of one transaction, are left out", async () => {
  const { snapshot } = await build({
    stakes: [stakeRecord("p1"), stakeRecord("p1"), stakeRecord("p1", { sender: OTHER, digest: "other" })],
  });
  assert.equal(snapshot.periods.all.stats.stakedMist, SUI.toString());
});

test("stake results come from the chain", async () => {
  const won = (await build({ stakes: [stakeRecord("p1")] })).snapshot.periods.all.stats;
  assert.equal(won.wonStakes, 1);
  assert.equal(won.profitMist, "980000000");
  assert.equal(won.bestMultiplier?.value, 1.98);
  assert.equal(won.bestMultiplier?.match, "Arsenal vs Chelsea");
  const lost = (await build({ stakes: [stakeRecord("p1")], pool: { outcomeYes: false } })).snapshot.periods.all.stats;
  assert.equal(lost.lostStakes, 1);
  const refunded = (await build({ stakes: [stakeRecord("p1")], pool: { status: "void" } })).snapshot.periods.all.stats;
  assert.equal(refunded.returnedMist, SUI.toString());
  assert.equal(refunded.profitMist, "0");
});

test("a result still in its challenge window is not final", async () => {
  const { snapshot } = await build({
    stakes: [stakeRecord("p1")],
    pool: { resolvedAtMs: BigInt(NOW.getTime() - 1000) },
  });
  assert.equal(snapshot.periods.all.stats.wonStakes, 0);
  assert.deepEqual(snapshot.finals, {});
});

test("a stake on a match still to come reads no pool", async () => {
  const future = pick("p1", {
    fixture: { home: "Arsenal", away: "Chelsea", startISO: "2026-11-21T15:00:00.000Z", subject: "home" },
  });
  const { snapshot, counts } = await build({ picks: [future], outcomes: [], stakes: [stakeRecord("p1")] });
  assert.equal(counts.pools, 0);
  assert.equal(snapshot.periods.all.stats.stakedMist, SUI.toString());
});

test("proofs and final results are never fetched twice", async () => {
  const first = await build({ stakes: [stakeRecord("p1")] });
  assert.equal(first.counts.commits, 1);
  const second = await build({ stakes: [stakeRecord("p1")] }, profile, first.snapshot);
  assert.equal(second.counts.commits, 0);
  assert.equal(second.counts.pools, 0);
  assert.equal(second.counts.boards, 0);
  assert.equal(second.snapshot.periods.all.stats.settled, 1);
});

test("a commit that can't be read yet is tried again next time", async () => {
  const { snapshot } = await build({ commitProblem: "tatum_timeout" });
  assert.equal(snapshot.proofs.p1, undefined);
  assert.equal(snapshot.periods.all.stats.settled, 0);
});

test("a match ESPN can't find, on an empty answer, is tried again", async () => {
  assert.equal((await build({ events: [] })).snapshot.proofs.p1, undefined);
});

test("work stops when the budget runs out, and the rest waits", async () => {
  const picks = Array.from({ length: 30 }, (_, i) => pick(`p${i}`));
  const outcomes = picks.map((item) => outcome(item.id));
  const { snapshot, counts } = await build({ picks, outcomes }, profile, null, 20);
  assert.ok(counts.commits < 30);
  assert.ok(counts.commits > 0);
  assert.equal(Object.keys(snapshot.proofs).length, counts.commits);
});

test("at most 50 recent calls, newest first", async () => {
  const picks = Array.from({ length: 60 }, (_, i) =>
    pick(`p${i}`, {
      at: `2026-11-08T${String(10 + (i % 10)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`,
    }),
  );
  const { snapshot } = await build({ picks, outcomes: [] });
  assert.equal(snapshot.recent.length, 50);
  assert.ok(snapshot.recent[0].at >= snapshot.recent[49].at);
});

// ---- the sweep ----

function kvFake() {
  const data = new Map<string, string>();
  const puts: string[] = [];
  const kv = {
    get: async (key: string, type?: string) => {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => {
      puts.push(key);
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async ({ prefix }: { prefix: string }) => ({
      keys: [...data.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()
        .map((name) => ({ name })),
      list_complete: true,
    }),
  };
  return { data, puts, env: { SOOTHIA_CACHE: kv } as unknown as Env };
}

const addProfile = (data: Map<string, string>, who: ProfileIndex): void => {
  data.set(`profile:${who.handle}`, JSON.stringify(who));
};

test("the sweep builds a snapshot and the boards", async () => {
  const { data, env, puts } = kvFake();
  addProfile(data, profile);
  const { deps } = depsFor();
  const result = await sweepSocial(env, deps);
  assert.deepEqual(result, { rebuilt: 1, written: 1, boardsWritten: true });
  assert.ok(data.has("socialstats:amy"));
  assert.ok(data.has("social:boards"));
  assert.deepEqual(puts.sort(), ["recent:amy", "social:boards", "socialstats:amy"]);
});

test("the sweep fills an empty feed once, and leaves a live one alone", async () => {
  const { data, env, puts } = kvFake();
  addProfile(data, profile);
  const { deps } = depsFor();
  await sweepSocial(env, deps);
  assert.equal(JSON.parse(data.get("recent:amy")!)[0].pickId, "p1");
  assert.equal(puts.filter((key) => key === "recent:amy").length, 1);
  data.set("recent:amy", "[]");
  await sweepSocial(env, { ...deps, now: new Date(NOW.getTime() + 1000) });
  assert.equal(data.get("recent:amy"), "[]");
  assert.equal(puts.filter((key) => key === "recent:amy").length, 1);
});

test("a second sweep with nothing new writes nothing to KV", async () => {
  const { data, env, puts } = kvFake();
  addProfile(data, profile);
  const { deps } = depsFor();
  await sweepSocial(env, deps);
  puts.length = 0;
  const later = await sweepSocial(env, { ...deps, now: new Date(NOW.getTime() + 900_000) });
  assert.deepEqual(later, { rebuilt: 1, written: 0, boardsWritten: false });
  assert.deepEqual(puts, []);
});

test("new profiles go first, and profiles take turns when the budget is short", async () => {
  const { data, env } = kvFake();
  for (const handle of ["amy", "bob", "cal"]) addProfile(data, { ...profile, handle, userKey: handle });
  const { deps } = depsFor();
  assert.equal((await sweepSocial(env, { ...deps, budget: 16 })).rebuilt >= 1, true);
  const built = () => [...data.keys()].filter((key) => key.startsWith("socialstats:")).length;
  for (let i = 0; i < 4; i++) await sweepSocial(env, { ...deps, budget: 16 });
  assert.equal(built(), 3);
});

test("one profile's failure does not stop the others", async () => {
  const { data, env } = kvFake();
  addProfile(data, { ...profile, handle: "bad", userKey: "bad" });
  addProfile(data, profile);
  const { deps } = depsFor();
  const store = deps.store;
  await sweepSocial(env, {
    ...deps,
    store: (userKey) => {
      if (userKey === "bad") throw new Error("walrus down");
      return store(userKey);
    },
  });
  assert.ok(data.has("socialstats:amy"));
  assert.equal(data.has("socialstats:bad"), false);
});

test("the stop-gap hidden list is cleared once the boards are rebuilt", async () => {
  const { data, env } = kvFake();
  data.set(
    "social:hidden",
    JSON.stringify([
      { handle: "gone", at: NOW.getTime() - 1000 },
      { handle: "just_now", at: NOW.getTime() + 1000 },
    ]),
  );
  const { deps } = depsFor();
  await sweepSocial(env, deps);
  assert.deepEqual(
    JSON.parse(data.get("social:hidden")!).map((entry: { handle: string }) => entry.handle),
    ["just_now"],
  );
});

test("a snapshot whose profile has gone stays off the boards", async () => {
  const { data, env } = kvFake();
  addProfile(data, profile);
  const { deps } = depsFor();
  await sweepSocial(env, deps);
  data.delete("profile:amy");
  await sweepSocial(env, { ...deps, now: new Date(NOW.getTime() + 1000) });
  assert.deepEqual(JSON.parse(data.get("social:boards")!).entries, []);
});

test("every board and period exists, and none holds more than 100 rows", () => {
  const stats = computeStats(
    Array.from({ length: 12 }, () => ({
      kickoffMs: KICKOFF_MS,
      competition: "L",
      teams: ["A"],
      result: { hit: true, brier: 0.1 },
    })),
    [],
  );
  const period = { stats, leagues: {}, teams: {} };
  const snapshots = Array.from({ length: 130 }, (_, i) => ({
    handle: `user${i}`,
    periods: { week: period, month: period, all: period },
  })) as unknown as ProfileSnapshot[];
  const { boards } = buildBoards(snapshots, NOW);
  assert.deepEqual(Object.keys(boards).sort(), ["earners", "hits", "roi", "score", "streaks"]);
  assert.deepEqual(Object.keys(boards.score).sort(), ["all", "month", "week"]);
  assert.equal(boards.score.all.length, MAX_BOARD_ROWS);
  assert.equal(boards.earners.all.length, 0);
});

// ---- the public routes ----

const entryFor = (handle: string, settled: number, hit = true, league = "English Premier League", team = "Arsenal") => {
  const calls = Array.from({ length: settled }, () => ({
    kickoffMs: KICKOFF_MS,
    competition: league,
    teams: [team],
    result: { hit, brier: hit ? 0.05 : 0.45 },
  }));
  return {
    handle,
    periods: {
      week: statsForPeriod(calls, [], "week", NOW.getTime()),
      month: statsForPeriod(calls, [], "month", NOW.getTime()),
      all: statsForPeriod(calls, [], "all", NOW.getTime()),
    },
  };
};

async function publicEnv(
  entries = [entryFor("amy", 12), entryFor("bob", 10, false, "Spanish LALIGA", "Barcelona"), entryFor("cal", 3)],
) {
  const { data, env } = kvFake();
  const snapshots = entries.map((entry) => ({ ...entry })) as unknown as ProfileSnapshot[];
  data.set("social:boards", JSON.stringify(buildBoards(snapshots, NOW)));
  return { data, env };
}

const get = async (env: Env, path: string) => {
  const response = await socialRoute(new Request(`https://x${path}`), env, path.split("?")[0], {
    verify: async () => true,
    lookupName: async () => null,
    store: () => ({}) as never,
    now: () => NOW.getTime(),
  });
  return { status: response.status, body: (await response.json()) as Record<string, any> };
};

test("the leaderboard ranks qualifying profiles, with the row fields", async () => {
  const { env } = await publicEnv();
  const { body } = await get(env, "/social/leaderboard");
  assert.equal(body.board, "score");
  assert.equal(body.period, "all");
  assert.deepEqual(
    body.rows.map((row: { handle: string }) => row.handle),
    ["amy", "bob"],
  );
  assert.deepEqual(Object.keys(body.rows[0]).sort(), [
    "bestMultiplier",
    "calls",
    "handle",
    "hitRate",
    "profit",
    "rank",
    "roi",
    "score",
    "streak",
    "value",
  ]);
});

test("the leaderboard checks its options", async () => {
  const { env } = await publicEnv();
  assert.equal((await get(env, "/social/leaderboard?board=nope")).body.error, "invalid_board");
  assert.equal((await get(env, "/social/leaderboard?period=year")).body.error, "invalid_period");
  assert.equal((await get(env, "/social/leaderboard?league=a&team=b")).body.error, "one_filter_at_a_time");
  assert.equal((await get(env, `/social/leaderboard?league=${"x".repeat(81)}`)).body.error, "invalid_filter");
});

test("league and team filters use the breakdowns", async () => {
  const { env } = await publicEnv();
  assert.deepEqual(
    (await get(env, "/social/leaderboard?league=spanish%20laliga")).body.rows.map(
      (row: { handle: string }) => row.handle,
    ),
    ["bob"],
  );
  assert.deepEqual(
    (await get(env, "/social/leaderboard?team=arsenal")).body.rows.map((row: { handle: string }) => row.handle),
    ["amy"],
  );
  assert.deepEqual((await get(env, "/social/leaderboard?team=everton")).body.rows, []);
});

test("the filter lists are offered, and an empty site still answers", async () => {
  const { env } = await publicEnv();
  const { body } = await get(env, "/social/leaderboard");
  assert.deepEqual(body.filters.leagues, ["English Premier League", "Spanish LALIGA"]);
  assert.deepEqual(body.filters.teams, ["Arsenal", "Barcelona"]);
  clearMemoryCache();
  const empty = await get(kvFake().env, "/social/leaderboard");
  assert.equal(empty.status, 200);
  assert.deepEqual(empty.body.rows, []);
});

test("an unpublished handle vanishes at once, and ranks close up", async () => {
  const { data, env } = await publicEnv();
  data.set("social:hidden", JSON.stringify([{ handle: "amy", at: 1 }]));
  const { body } = await get(env, "/social/leaderboard");
  assert.deepEqual(
    body.rows.map((row: { rank: number; handle: string }) => [row.rank, row.handle]),
    [[1, "bob"]],
  );
  clearMemoryCache();
  assert.deepEqual((await get(env, "/social/leaderboard?team=arsenal")).body.rows, []);
});

test("leaderboards are cached briefly and read no Walrus", async () => {
  const { data, env } = await publicEnv();
  await get(env, "/social/leaderboard");
  data.delete("social:boards");
  assert.equal((await get(env, "/social/leaderboard")).body.rows.length, 2);
});

test("a profile page shows stats and calls and never the private parts", async () => {
  const { data, env } = kvFake();
  addProfile(data, profile);
  const { deps } = depsFor({ stakes: [stakeRecord("p1")] });
  await sweepSocial(env, deps);
  const { status, body } = await get(env, "/social/profile/AMY");
  assert.equal(status, 200);
  assert.equal(body.profile.handle, "amy");
  assert.equal(body.stats.settled, 1);
  assert.equal(body.periods.week.settled, 1);
  assert.ok(body.breakdowns.leagues["English Premier League"]);
  assert.equal(body.calls.length, 1);
  const text = JSON.stringify(body);
  for (const secret of ["secretuserkey", "userKey", "proofs", "finals", "private-site"])
    assert.equal(text.includes(secret), false, secret);
});

test("a profile with no snapshot yet still answers", async () => {
  const { data, env } = kvFake();
  addProfile(data, profile);
  const { body } = await get(env, "/social/profile/amy");
  assert.equal(body.stats, null);
  assert.deepEqual(body.calls, []);
});

test("an unknown or malformed handle is 404, and a private user does not exist", async () => {
  const { env } = kvFake();
  assert.equal((await get(env, "/social/profile/nobody")).status, 404);
  assert.equal((await get(env, "/social/profile/x")).status, 404);
  assert.equal((await get(env, "/social/profile/has%20space")).status, 404);
});
