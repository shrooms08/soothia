// Total Recall extension logic. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { FixtureSignal, RecallInsight, Tile } from "../src/messages";
import {
  callBody,
  callErrorMessage,
  fixtureSubject,
  formatGap,
  isQuietableSite,
  isRecallId,
  leanLabel,
  mergeQuietSites,
  overconfidencePoints,
  pickLean,
  proofText,
  pYesFor,
  QUIET_PENDING_MS,
  recordHeadline,
  shortId,
  skipReasonText,
  sortByRelevance,
  suggestedPercent,
  trimSourceUrl,
  visibleNotes,
} from "../src/recall-logic";

const FIXTURE: FixtureSignal = {
  home: "Arsenal",
  away: "Chelsea",
  competition: "English Premier League",
  startISO: "2026-11-21T15:00:00.000Z",
  dateLabel: "Sat 21 Nov",
  sourceUrl: "https://example.com",
  evidence: [],
};

const tile = (question: string, overrides: Partial<Tile["claim"]> = {}, market: Tile["market"] = null): Tile => ({
  claim: {
    id: question,
    question,
    category: "sports",
    endTime: "2026-11-21T18:00:00.000Z",
    resolution: { type: "sports_result", details: "", sources: [] },
    confidence: 0.8,
    sourceQuote: "",
    ...overrides,
  },
  market,
});

const PAGE = { site: "espn.com", url: "https://www.espn.com/match" };
const insight = (id: string, relevance: number, notes: string[] = [], existing: RecallInsight["existing"] = null): RecallInsight => ({
  claimId: id,
  relevance,
  notes,
  existing,
  nudge: 0,
});

test("recall ids must be UUIDs", () => {
  assert.equal(isRecallId("3f2b8a10-1c2d-4e5f-8a9b-0c1d2e3f4a5b"), true);
  assert.equal(isRecallId("3F2B8A10-1C2D-4E5F-8A9B-0C1D2E3F4A5B"), true);
  for (const bad of ["", "nope", "3f2b8a10-1c2d-4e5f-8a9b", 7, null]) assert.equal(isRecallId(bad), false);
});

test("only real hostnames can be quieted", () => {
  assert.equal(isQuietableSite("espn.com"), true);
  for (const bad of ["localhost", "127.0.0.1", ""]) assert.equal(isQuietableSite(bad), false);
});

test("pYes converts from the chosen side", () => {
  assert.equal(pYesFor("yes", 70), 0.7);
  assert.equal(pYesFor("no", 70), 0.3);
  assert.equal(pYesFor("yes", 99), 0.99);
  assert.equal(pYesFor("no", 99), 0.01);
});

test("the suggested percent shrinks toward 50 and never drops below a lean", () => {
  assert.equal(suggestedPercent(80, 0.8), 74);
  assert.equal(suggestedPercent(70, 1), 70);
  assert.equal(suggestedPercent(51, 0.6), 51);
  assert.equal(suggestedPercent(99, 0.6), 79);
});

test("overconfidence comes from the lesson's bias, else the shrink", () => {
  assert.equal(overconfidencePoints(0.8, 0.2), 20);
  assert.equal(overconfidencePoints(0.6, 0.47), 47);
  assert.equal(overconfidencePoints(0.85, null), 15);
  assert.equal(overconfidencePoints(0.85, undefined), 15);
});

test("the fixture subject follows who the question backs", () => {
  assert.equal(fixtureSubject("Will Arsenal beat Chelsea on Sat 21 Nov?", "Arsenal"), "home");
  assert.equal(fixtureSubject("Will Chelsea beat Arsenal on Sat 21 Nov?", "Arsenal"), "away");
  assert.equal(fixtureSubject("will arsenal beat chelsea?", "Arsenal"), "home");
});

test("a fixture call sends the match, with the backed team as subject", () => {
  const body = callBody(tile("Will Chelsea beat Arsenal on Sat 21 Nov?", { fromFixture: true }), "no", 60, PAGE, FIXTURE);
  assert.equal(body.pYes, 0.4);
  assert.deepEqual(body.fixture, {
    home: "Arsenal",
    away: "Chelsea",
    competition: "English Premier League",
    startISO: FIXTURE.startISO,
    subject: "away",
  });
  assert.equal(body.marketId, undefined);
  assert.equal(body.marketYes, undefined);
});

test("a prose claim on a match page does not send the match", () => {
  assert.equal(callBody(tile("Will rates fall?"), "yes", 60, PAGE, FIXTURE).fixture, undefined);
});

test("a market's id and YES price are sent, and a missing price is left out", () => {
  const market = { id: "m1", title: "t", category: "sports", yesPrice: 0.42, noPrice: 0.58, endTime: "" };
  const priced = callBody(tile("Q", {}, market), "yes", 60, PAGE, null);
  assert.equal(priced.marketId, "m1");
  assert.equal(priced.marketYes, 0.42);
  const unpriced = callBody(tile("Q", {}, { ...market, yesPrice: null }), "yes", 60, PAGE, null);
  assert.equal(unpriced.marketId, "m1");
  assert.equal(unpriced.marketYes, undefined);
});

test("long source urls are shortened to fit the Worker's limit", () => {
  const short = "https://a.com/x?y=1";
  assert.equal(trimSourceUrl(short), short);
  assert.equal(trimSourceUrl(`https://a.com/x?y=${"z".repeat(600)}`), "https://a.com/x");
  assert.equal(trimSourceUrl(`https://a.com/${"p".repeat(600)}`), "https://a.com");
});

test("the lean reads as the side and its confidence", () => {
  assert.equal(leanLabel(0.7), "YES 70%");
  assert.equal(leanLabel(0.35), "NO 65%");
  assert.equal(leanLabel(0.5), "YES 50%");
});

test("a match call names the team the question backs", () => {
  assert.equal(pickLean({ pYes: 0.35, fixture: { home: "Napoli", away: "Lazio", subject: "home" } }), "Napoli to win: NO 65%");
  assert.equal(pickLean({ pYes: 0.6, fixture: { home: "Napoli", away: "Lazio", subject: "away" } }), "Lazio to win: YES 60%");
  assert.equal(pickLean({ pYes: 0.6, fixture: null }), "YES 60%");
});

test("the headline leaves out what is not known yet", () => {
  const base = { picks: 1, open: 1, resolved: 0, hits: 0, brier: null, marketBrier: null, vsMarketCalls: 0, calibration: [], entities: [] };
  assert.equal(recordHeadline(base), "1 call · 0 right");
  assert.equal(recordHeadline({ ...base, picks: 4, resolved: 4, hits: 3, brier: 0.2 }), "4 calls · 3 right · 75% hit rate · Brier 0.200");
});

test("tiles show two notes and skip the one the badge repeats", () => {
  const existing = { pYes: 0.7, at: "2026-11-08T00:00:00.000Z" };
  assert.deepEqual(visibleNotes(insight("a", 1, ["You already called this: YES 70%.", "n1", "n2", "n3"], existing)), ["n1", "n2"]);
  assert.deepEqual(visibleNotes(insight("a", 1, ["n1", "n2", "n3"])), ["n1", "n2"]);
  assert.deepEqual(visibleNotes(undefined), []);
});

test("tiles sort by relevance and ties keep their order", () => {
  const tiles = [tile("a"), tile("b"), tile("c"), tile("d")];
  const insights = new Map([
    ["c", insight("c", 7)],
    ["b", insight("b", 2)],
    ["d", insight("d", 2)],
  ]);
  assert.deepEqual(sortByRelevance(tiles, insights).map((item) => item.claim.id), ["c", "b", "d", "a"]);
});

test("every skip reason reads in plain words", () => {
  for (const reason of ["user_cap", "global_cap", "low_balance", "kv_unavailable"] as const) {
    assert.ok(skipReasonText(reason).length > 5);
    assert.ok(!skipReasonText(reason).includes("_"));
  }
});

test("errors read in plain words and only some can be retried", () => {
  assert.deepEqual(callErrorMessage(409, { error: "duplicate_pick" }), { text: "You already called this.", retry: false });
  assert.deepEqual(callErrorMessage(400, { error: "invalid_pick", field: "fixture.startISO" }), {
    text: "This match has already kicked off.",
    retry: false,
  });
  assert.equal(callErrorMessage(0, null).retry, true);
  assert.equal(callErrorMessage(429, null).retry, true);
  assert.equal(callErrorMessage(502, { error: "recall_unavailable" }).retry, true);
});

test("the gap formats as hours and minutes", () => {
  assert.equal(formatGap(2 * 3_600_000 + 7 * 60_000 + 30_000), "2h 7m");
  assert.equal(formatGap(-90 * 60_000), "1h 30m");
});

const proof = (over: Partial<Parameters<typeof proofText>[0]>): Parameters<typeof proofText>[0] => ({
  digest: "d",
  verified: true,
  timestampMs: 1,
  explorerUrl: "https://x",
  kickoffISO: "2026-11-08T14:00:00.000Z",
  gapMs: 2 * 3_600_000 + 7 * 60_000,
  beforeKickoff: true,
  ...over,
});

test("proof lines say when it was committed, or what went wrong", () => {
  assert.deepEqual(proofText(proof({})), { text: "Committed 2h 7m before kickoff ✓", good: true });
  assert.deepEqual(proofText(proof({ gapMs: -60 * 60_000, beforeKickoff: false })), { text: "Committed 1h 0m after kickoff", good: false });
  assert.deepEqual(proofText(proof({ gapMs: null, kickoffISO: null, beforeKickoff: null })), { text: "Committed on Sui ✓", good: true });
  assert.equal(proofText(proof({ verified: false, problem: "hash_mismatch" })).good, false);
  assert.match(proofText(proof({ verified: false, problem: "hash_mismatch" })).text, /does not match/);
  assert.match(proofText(proof({ verified: false, problem: "tatum_grpc_http_500" })).text, /Couldn't check/);
});

test("ids shorten to the first six and last four characters", () => {
  assert.equal(shortId("0x1234567890abcdef1234"), "0x1234…1234");
  assert.equal(shortId("0x12"), "0x12");
});

test("recent local quiet changes override the server, and expire", () => {
  const now = 1_000_000_000;
  const pending = {
    "new.com": { quiet: true, at: now - 1000 },
    "gone.com": { quiet: false, at: now - 1000 },
    "old.com": { quiet: true, at: now - QUIET_PENDING_MS - 1 },
  };
  const merged = mergeQuietSites(["GONE.com", "kept.com"], pending, now);
  assert.deepEqual(merged.sites, ["kept.com", "new.com"]);
  assert.deepEqual(Object.keys(merged.pending).sort(), ["gone.com", "new.com"]);
});
