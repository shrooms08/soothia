// Call Score and profile stats. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boardValue,
  callScore,
  computeStats,
  findBreakdown,
  MAX_BOARD_ROWS,
  rankBoard,
  statsForPeriod,
  streaks,
  type CallEntry,
  type StakeEntry,
  type Stats,
} from "../src/social/stats";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const DAY = 86_400_000;
const SUI = 1_000_000_000n;
const call = (hit: boolean | null, daysAgo = 1, overrides: Partial<CallEntry> = {}): CallEntry => ({
  kickoffMs: NOW - daysAgo * DAY,
  competition: "English Premier League",
  teams: ["Arsenal", "Chelsea"],
  result: hit === null ? null : { hit, brier: hit ? 0.09 : 0.49 },
  ...overrides,
});
const stake = (
  result: StakeEntry["result"],
  stakedMist = SUI,
  payoutMist = 0n,
  overrides: Partial<StakeEntry> = {},
): StakeEntry => ({
  kickoffMs: NOW - DAY,
  competition: "English Premier League",
  teams: ["Arsenal", "Chelsea"],
  match: "Arsenal vs Chelsea",
  stakedMist,
  result,
  payoutMist,
  ...overrides,
});

test("Call Score follows the formula", () => {
  // skill = 1 - 0.1 / 0.25 = 0.6; 500 + 500 * 0.6 * 10 / 20 = 650
  assert.equal(callScore(0.1, 10), 650);
  // skill = 0
  assert.equal(callScore(0.25, 50), 500);
  // A perfect record approaches 1000 but needs volume: 500 + 500 * 90 / 100 = 950
  assert.equal(callScore(0, 90), 950);
  // Worse than a coin flip scores below 500, clamped at -1: 500 - 500 * 10 / 20 = 250
  assert.equal(callScore(1, 10), 250);
  assert.equal(callScore(0.5, 10), 250);
});

test("no settled calls scores the neutral 500", () => {
  assert.equal(callScore(null, 0), 500);
  assert.equal(computeStats([call(null)], []).score, 500);
});

test("one lucky call barely moves the score", () => {
  // skill = 0.64; 500 + 500 * 0.64 * 1 / 11 = 529
  assert.equal(callScore(0.09, 1), 529);
});

test("counts, hit rate and Brier cover settled calls only", () => {
  const stats = computeStats([call(true), call(true), call(false), call(null)], []);
  assert.equal(stats.calls, 4);
  assert.equal(stats.settled, 3);
  assert.equal(stats.hits, 2);
  assert.equal(stats.hitRate, 0.6667);
  assert.equal(stats.brier, 0.2233);
});

test("streaks run in kickoff order, and an open call does not break one", () => {
  const list = [call(true, 5), call(true, 4), call(false, 3), call(true, 2), call(null, 1.5), call(true, 1)];
  assert.deepEqual(streaks(list), { current: 2, best: 2 });
  assert.deepEqual(streaks([call(false, 1), call(true, 2), call(true, 3), call(true, 4)]), { current: 0, best: 3 });
  assert.deepEqual(streaks([]), { current: 0, best: 0 });
});

test("stakes: staked, returned, profit, ROI and counts", () => {
  const stats = computeStats(
    [],
    [stake("won", SUI, 1_500_000_000n), stake("won", 2n * SUI, 2_200_000_000n), stake("lost", SUI), stake(null, SUI)],
  );
  assert.equal(stats.stakedMist, (5n * SUI).toString());
  assert.equal(stats.returnedMist, "3700000000");
  // +0.5 +0.2 -1 = -0.3 on 4 settled
  assert.equal(stats.profitMist, "-300000000");
  assert.equal(stats.roiPercent, -7.5);
  assert.equal(stats.wonStakes, 2);
  assert.equal(stats.lostStakes, 1);
});

test("the best multiplier names its match", () => {
  const stats = computeStats(
    [],
    [
      stake("won", SUI, 1_500_000_000n, { match: "A vs B" }),
      stake("won", SUI, 3_000_000_000n, { match: "C vs D" }),
      stake("lost", SUI),
    ],
  );
  assert.deepEqual(stats.bestMultiplier, { value: 3, match: "C vs D" });
  assert.equal(computeStats([], [stake("lost")]).bestMultiplier, null);
});

test("a refund returns money but moves neither profit nor ROI", () => {
  const stats = computeStats([], [stake("refunded"), stake("won", SUI, 2n * SUI)]);
  assert.equal(stats.returnedMist, (3n * SUI).toString());
  assert.equal(stats.profitMist, SUI.toString());
  assert.equal(stats.roiPercent, 100);
  assert.equal(computeStats([], [stake("refunded")]).roiPercent, null);
});

test("periods cut by kickoff", () => {
  const calls = [call(true, 2), call(false, 20), call(true, 60)];
  assert.equal(statsForPeriod(calls, [], "week", NOW).stats.calls, 1);
  assert.equal(statsForPeriod(calls, [], "month", NOW).stats.calls, 2);
  assert.equal(statsForPeriod(calls, [], "all", NOW).stats.calls, 3);
});

test("the edge of a week is inside it", () => {
  assert.equal(statsForPeriod([call(true, 7)], [], "week", NOW).stats.calls, 1);
  assert.equal(statsForPeriod([call(true, 7.001)], [], "week", NOW).stats.calls, 0);
});

test("breakdowns by league and by team", () => {
  const calls = [call(true), call(false, 1, { competition: "Spanish LALIGA", teams: ["Barcelona", "Sevilla"] })];
  const stakes = [stake("won", SUI, 2n * SUI)];
  const { leagues, teams } = statsForPeriod(calls, stakes, "all", NOW);
  assert.deepEqual(Object.keys(leagues).sort(), ["English Premier League", "Spanish LALIGA"]);
  assert.equal(leagues["English Premier League"].hits, 1);
  assert.equal(leagues["English Premier League"].profitMist, SUI.toString());
  assert.equal(leagues["Spanish LALIGA"].hits, 0);
  assert.equal(teams.Arsenal.calls, 1);
  assert.equal(teams.Barcelona.calls, 1);
});

test("breakdowns are found whatever the case or alias", () => {
  const { leagues, teams } = statsForPeriod(
    [call(true, 1, { teams: ["Newcastle United", "Arsenal"] })],
    [],
    "all",
    NOW,
  );
  assert.ok(findBreakdown(leagues, "english premier league", "league"));
  assert.ok(findBreakdown(teams, "Newcastle", "team"));
  assert.ok(findBreakdown(teams, "ARSENAL FC", "team"));
  assert.equal(findBreakdown(teams, "Everton", "team"), null);
});

const statsOf = (overrides: Partial<Stats>): Stats => ({ ...computeStats([], []), ...overrides });

test("each board has its own minimum", () => {
  assert.equal(boardValue("score", statsOf({ settled: 9, score: 700 })), null);
  assert.equal(boardValue("score", statsOf({ settled: 10, score: 700 })), 700);
  assert.equal(boardValue("earners", statsOf({ wonStakes: 3, lostStakes: 1, profitMist: "1" })), null);
  assert.equal(boardValue("earners", statsOf({ wonStakes: 3, lostStakes: 2, profitMist: "1500000000" })), 1.5);
  assert.equal(boardValue("roi", statsOf({ wonStakes: 2, lostStakes: 2, roiPercent: 10 })), null);
  assert.equal(boardValue("roi", statsOf({ wonStakes: 5, roiPercent: 10 })), 10);
  assert.equal(boardValue("hits", statsOf({})), null);
  assert.equal(boardValue("hits", statsOf({ bestMultiplier: { value: 2.5, match: "x" } })), 2.5);
  assert.equal(boardValue("streaks", statsOf({ settled: 4, currentStreak: 4 })), null);
  assert.equal(boardValue("streaks", statsOf({ settled: 5, currentStreak: 4 })), 4);
});

test("boards sort best first, break ties, and number the rows", () => {
  const rows = rankBoard("score", [
    { handle: "bob", stats: statsOf({ settled: 10, score: 600 }) },
    { handle: "amy", stats: statsOf({ settled: 10, score: 600 }) },
    { handle: "cal", stats: statsOf({ settled: 20, score: 600 }) },
    { handle: "dee", stats: statsOf({ settled: 10, score: 900 }) },
    { handle: "new", stats: statsOf({ settled: 2, score: 999 }) },
  ]);
  assert.deepEqual(
    rows.map((row) => [row.rank, row.handle]),
    [
      [1, "dee"],
      [2, "cal"],
      [3, "amy"],
      [4, "bob"],
    ],
  );
});

test("a row carries the fields the pages show", () => {
  const stats = computeStats(
    Array.from({ length: 10 }, () => call(true)),
    [stake("won", SUI, 2n * SUI)],
  );
  const [row] = rankBoard("score", [{ handle: "amy", stats }]);
  assert.deepEqual(row, {
    rank: 1,
    handle: "amy",
    score: stats.score,
    value: stats.score,
    calls: 10,
    hitRate: 1,
    profit: SUI.toString(),
    roi: 100,
    bestMultiplier: 2,
    streak: 10,
  });
});

test("a board keeps at most 100 rows", () => {
  const entries = Array.from({ length: 150 }, (_, i) => ({
    handle: `user${i}`,
    stats: statsOf({ settled: 10, score: i }),
  }));
  assert.equal(rankBoard("score", entries).length, MAX_BOARD_ROWS);
});
