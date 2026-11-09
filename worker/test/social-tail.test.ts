// Tail validation, with KV and ESPN faked.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Env } from "../src/http";
import type { ScoreboardEvent, ScoreboardFetcher } from "../src/recall/espn";
import { buildPick, type PickInput } from "../src/recall/picks";
import type { RecallEnv } from "../src/recall/env";
import { canonicalPick } from "../src/recall/records";
import type { FeedItem } from "../src/social/feed";
import { applyTail } from "../src/social/tail";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";

const source: FeedItem = { pickId: "s1", fixture: { home: "Newcastle", away: "Arsenal", competition: "Premier League", startISO: KICKOFF, subject: "away" }, lean: "Arsenal win", side: "YES", confidence: 70, at: "2026-11-09T10:00:00.000Z" };

const input = (overrides: Partial<PickInput> = {}): PickInput => ({
  question: "Will Arsenal beat Newcastle?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: ["Newcastle", "Arsenal"],
  endTime: "2026-11-21T18:00:00.000Z",
  source: { site: "soothia.fun", url: "https://soothia.fun/u/ada" },
  fixture: { home: "Newcastle", away: "Arsenal", startISO: "2026-11-21T20:00:00.000Z", subject: "away" },
  ...overrides,
});

const event = (overrides: Partial<ScoreboardEvent> = {}): ScoreboardEvent => ({
  espnId: "1",
  startISO: KICKOFF,
  statusName: "STATUS_SCHEDULED",
  state: "pre",
  completed: false,
  home: { name: "Newcastle United", short: "Newcastle", abbreviation: "NEW", score: null },
  away: { name: "Arsenal", short: "Arsenal", abbreviation: "ARS", score: null },
  competition: "English Premier League",
  url: "",
  ...overrides,
});

const board = (...events: ScoreboardEvent[]): ScoreboardFetcher => async (league) => ({ competition: "", events: league === "eng.1" ? events : [] });

function envWith(items: FeedItem[] | null, ownHandle?: string): Env {
  const data = new Map<string, string>();
  if (items) data.set("recent:ada", JSON.stringify(items));
  if (ownHandle) data.set("profileuser:u1", ownHandle);
  return { SOOTHIA_CACHE: { get: async (key: string, type?: string) => { const value = data.get(key); if (value === undefined) return null; return type === "json" ? JSON.parse(value) : value; } } } as unknown as Env;
}

const tail = (pick = input(), flip = false, env = envWith([source]), fetcher = board(event())) => applyTail(env, pick, { handle: "ada", flip }, "u1", fetcher, NOW);

test("a good tail keeps the handle and takes ESPN's kickoff", async () => {
  const result = await tail();
  assert.ok(result.ok);
  assert.equal(result.input.tailOf, "ada");
  assert.equal(result.input.fixture?.startISO, KICKOFF);
  assert.equal(result.input.endTime, new Date(Date.parse(KICKOFF) + 3 * 3_600_000).toISOString());
  assert.equal(result.input.tailFlipped, undefined);
});

test("the same match listed the other way round is still the same match", async () => {
  const result = await tail(input({ fixture: { home: "Arsenal", away: "Newcastle", startISO: KICKOFF, subject: "home" } }));
  assert.ok(result.ok);
});

const refused = async (promise: ReturnType<typeof tail>, code: string) => {
  const result = await promise;
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, code);
};

test("a different side needs an explicit flip", async () => {
  await refused(tail(input({ pYes: 0.3 })), "tail_side_mismatch");
  const flipped = await tail(input({ pYes: 0.3 }), true);
  assert.ok(flipped.ok);
  assert.equal(flipped.input.tailFlipped, true);
});

test("asking to flip while on the same side isn't a flip", async () => {
  const result = await tail(input(), true);
  assert.ok(result.ok);
  assert.equal(result.input.tailFlipped, undefined);
});

test("the match must be the source call's match", async () => {
  await refused(tail(input({ fixture: { home: "Chelsea", away: "Arsenal", startISO: KICKOFF, subject: "away" } })), "tail_source_not_found");
  await refused(tail(input({ fixture: { home: "Newcastle", away: "Arsenal", startISO: "2026-11-22T17:30:00.000Z", subject: "away" } })), "tail_source_not_found");
  await refused(tail(input(), false, envWith(null)), "tail_source_not_found");
});

test("the question must be the same one", async () => {
  await refused(tail(input({ fixture: { home: "Newcastle", away: "Arsenal", startISO: KICKOFF, subject: "home" } })), "tail_wrong_question");
});

test("you can't tail yourself, and a tail needs a match", async () => {
  await refused(tail(input(), false, envWith([source], "ada")), "cannot_tail_self");
  await refused(tail(input({ fixture: undefined })), "tail_needs_match");
});

test("ESPN decides whether the match is still to come", async () => {
  await refused(tail(input(), false, envWith([source]), board()), "fixture_not_on_espn");
  await refused(tail(input(), false, envWith([source]), board(event({ state: "in" }))), "fixture_not_open");
  await refused(tail(input(), false, envWith([source]), board(event({ statusName: "STATUS_POSTPONED" }))), "fixture_not_open");
  await refused(tail(input(), false, envWith([source]), board(event({ startISO: new Date(NOW + 60_000).toISOString() }))), "too_close_to_kickoff");
  await refused(tail(input(), false, envWith([source]), async () => { throw new Error("down"); }), "espn_unavailable");
});

test("a page's different kickoff that day never reaches the pick", async () => {
  const result = await tail(input({ fixture: { home: "Newcastle", away: "Arsenal", startISO: "2026-11-21T23:59:00.000Z", subject: "away" } }));
  assert.ok(result.ok);
  assert.equal(result.input.fixture?.startISO, KICKOFF);
});

test("tail fields are stored on the pick but stay out of its hash", async () => {
  const env = {} as RecallEnv;
  const plain = await buildPick(input({ tailOf: undefined }), env);
  const tailed = await buildPick(input({ tailOf: "ada", tailFlipped: true, followedConsensus: "against" }), env);
  assert.equal(tailed.tailOf, "ada");
  assert.equal(tailed.tailFlipped, true);
  assert.equal(tailed.followedConsensus, "against");
  assert.equal("tailOf" in plain, false);
  assert.equal(canonicalPick(tailed).includes("ada"), false);
  assert.equal(canonicalPick(tailed).includes("followedConsensus"), false);
});
