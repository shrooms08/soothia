// Total Recall ESPN parsing and resolution, on inline samples. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseScoreboard,
  resolveFixture,
  sideForWinner,
  upcomingFixtures,
  type ScoreboardFetcher,
} from "../src/recall/espn";

function event(
  id: string,
  home: [string, string],
  away: [string, string],
  score: [string, string],
  status: { name: string; state: string; completed: boolean },
): unknown {
  const team = ([displayName, shortDisplayName]: [string, string], homeAway: string, value: string): unknown => ({
    homeAway,
    score: value,
    team: { displayName, shortDisplayName, abbreviation: shortDisplayName.slice(0, 3).toUpperCase() },
  });
  return {
    id,
    date: "2026-11-08T14:00Z",
    status: { type: status },
    competitions: [{ competitors: [team(home, "home", score[0]), team(away, "away", score[1])] }],
    links: [{ rel: ["summary", "desktop", "event"], href: `https://www.espn.com/soccer/match/_/gameId/${id}` }],
  };
}

const FINAL = { name: "STATUS_FULL_TIME", state: "post", completed: true };
const SCHEDULED = { name: "STATUS_SCHEDULED", state: "pre", completed: false };
const POSTPONED = { name: "STATUS_POSTPONED", state: "pre", completed: false };

const SAMPLE = {
  leagues: [{ name: "English Premier League" }],
  events: [
    event("1", ["Arsenal", "Arsenal"], ["Hull City", "Hull"], ["2", "1"], FINAL),
    event("2", ["Everton", "Everton"], ["Liverpool", "Liverpool"], ["0", "3"], FINAL),
    event("3", ["Chelsea", "Chelsea"], ["Fulham", "Fulham"], ["1", "1"], FINAL),
    event("4", ["Manchester United", "Man Utd"], ["Tottenham Hotspur", "Spurs"], ["3", "0"], FINAL),
    event("5", ["Sunderland", "Sunderland"], ["Burnley", "Burnley"], ["0", "0"], SCHEDULED),
    event("6", ["Leeds United", "Leeds"], ["Watford", "Watford"], ["0", "0"], POSTPONED),
    { id: "7", date: "not a date" },
  ],
};

const fetcher: ScoreboardFetcher = async (league, day) =>
  parseScoreboard(league === "eng.1" && day === "20261108" ? SAMPLE : { events: [] });

const START = "2026-11-08T14:00:00.000Z";
const resolve = (home: string, away: string) => resolveFixture({ home, away, startISO: START }, fetcher);

test("parseScoreboard reads events and drops malformed ones", () => {
  const board = parseScoreboard(SAMPLE);
  assert.equal(board.competition, "English Premier League");
  assert.equal(board.events.length, 6);
  assert.deepEqual(
    { id: board.events[0].espnId, start: board.events[0].startISO, home: board.events[0].home.name, score: board.events[0].home.score },
    { id: "1", start: START, home: "Arsenal", score: 2 },
  );
});

test("parseScoreboard copes with an empty or missing response", () => {
  assert.deepEqual(parseScoreboard({}), { competition: "", events: [] });
  assert.deepEqual(parseScoreboard(null), { competition: "", events: [] });
});

test("upcomingFixtures keeps only games that have not started and are still on", async () => {
  const fixtures = await upcomingFixtures(new Date(START), fetcher);
  assert.deepEqual(
    fixtures.map((fixture) => [fixture.home, fixture.league]),
    [["Sunderland", "eng.1"]],
  );
});

test("resolve: home win", async () => {
  assert.deepEqual(await resolve("Arsenal", "Hull City"), {
    status: "final",
    winner: "home",
    detail: "Arsenal 2-1 Hull City (ESPN, full time)",
  });
});

test("resolve: away win", async () => {
  const result = await resolve("Everton", "Liverpool");
  assert.ok(result.status === "final");
  assert.equal(result.winner, "away");
  assert.equal(sideForWinner("home", result.winner), "NO");
});

test("resolve: a draw settles a home-win question as NO", async () => {
  const result = await resolve("Chelsea", "Fulham");
  assert.ok(result.status === "final");
  assert.equal(result.winner, "draw");
  assert.equal(sideForWinner("home", result.winner), "NO");
});

test("resolve: alias names match ESPN's names", async () => {
  const result = await resolve("Man Utd", "Spurs");
  assert.ok(result.status === "final");
  assert.equal(result.winner, "home");
});

test("resolve: an FC suffix does not break matching", async () => {
  assert.equal((await resolve("Arsenal FC", "Hull City")).status, "final");
});

test("resolve: a game not played yet is pending, and so is a postponed one", async () => {
  assert.deepEqual(await resolve("Sunderland", "Burnley"), { status: "pending" });
  assert.deepEqual(await resolve("Leeds United", "Watford"), { status: "pending" });
});

test("resolve: an unknown fixture is not_found, and swapped sides do not match", async () => {
  assert.deepEqual(await resolve("Real Madrid", "Barcelona"), { status: "not_found" });
  assert.deepEqual(await resolve("Hull City", "Arsenal"), { status: "not_found" });
});

test("resolve: finds a fixture listed on the day after kickoff", async () => {
  const nextDay: ScoreboardFetcher = async (league, day) =>
    parseScoreboard(league === "eng.1" && day === "20261109" ? SAMPLE : { events: [] });
  assert.equal((await resolveFixture({ home: "Arsenal", away: "Hull City", startISO: START }, nextDay)).status, "final");
});

test("resolve: throws rather than say not_found when ESPN could not be checked", async () => {
  const broken: ScoreboardFetcher = async () => {
    throw new Error("espn_http_500");
  };
  await assert.rejects(resolveFixture({ home: "Arsenal", away: "Hull City", startISO: START }, broken), /espn_unavailable/);
});
