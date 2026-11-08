// Total Recall scoring and lessons. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonRecord, OutcomeRecord, PickRecord, Side } from "../src/recall/records";
import { brier, deriveLessons, insightsFor, leanSide, matchCalled, newLessons, scoreOutcome } from "../src/recall/scoring";

const AT = "2026-11-08T18:00:00.000Z";

function pick(id: number, pYes: number): PickRecord {
  return {
    id: `p_${id}`,
    at: "2026-11-08T08:00:00.000Z",
    question: `Question ${id}?`,
    category: "sports",
    pYes,
    marketYes: null,
    entities: [],
    endTime: AT,
    source: { site: "espn.com", url: "https://www.espn.com" },
    hash: "00",
    commit: null,
  };
}

const history = (count: number, pYes: number, result: Side): OutcomeRecord[] =>
  Array.from({ length: count }, (_, index) => scoreOutcome(pick(index, pYes), result, "detail", AT));

test("brier: 0.7 on a YES result is 0.09", () => {
  assert.equal(brier(0.7, "YES"), 0.09);
  assert.equal(brier(0.7, "NO"), 0.49);
});

test("no lessons under three outcomes", () => {
  assert.deepEqual(deriveLessons(history(2, 0.9, "NO"), AT), []);
});

test("an overconfident history produces a calibration lesson with bias above 0.08", () => {
  const lesson = deriveLessons(history(4, 0.9, "NO"), AT).find((candidate) => candidate.key === "calibration");
  assert.ok(lesson);
  assert.ok((lesson.bias ?? 0) > 0.08);
  assert.match(lesson.text, /overconfident/);
});

test("newLessons drops a lesson with identical text and keeps a changed one", () => {
  const old: LessonRecord = { key: "calibration", at: "2026-11-01T00:00:00.000Z", text: "same", n: 3 };
  assert.deepEqual(newLessons([old], [{ ...old, at: AT }]), []);
  const changed: LessonRecord = { ...old, at: AT, text: "different" };
  assert.deepEqual(newLessons([old], [changed]), [changed]);
});

const KICKOFF = "2026-11-21T15:00:00.000Z";
const called = (home: string, away: string, subject: "home" | "away", pYes: number, committed = true): PickRecord => ({
  ...pick(1, pYes),
  question: `Will ${subject === "home" ? home : away} beat ${subject === "home" ? away : home} on Sat 21 Nov?`,
  fixture: { home, away, startISO: KICKOFF, subject },
  commit: committed ? { digest: "d", network: "mainnet" } : null,
});
const claimOn = (home: string, away: string, startISO = KICKOFF) => ({
  question: "Some other wording?",
  fixture: { home, away, startISO },
});

test("lean wording: YES backs the team, NO says what that means", () => {
  const home = { home: "Arsenal", away: "Chelsea", startISO: KICKOFF, subject: "home" as const };
  assert.equal(leanSide({ pYes: 0.6, fixture: home }), "Arsenal win");
  assert.equal(leanSide({ pYes: 0.3, fixture: home }), "Arsenal doesn't win (Chelsea win or draw)");
  assert.equal(leanSide({ pYes: 0.7, fixture: { ...home, subject: "away" } }), "Chelsea win");
  assert.equal(leanSide({ pYes: 0.7, fixture: undefined }), "YES");
  assert.equal(leanSide({ pYes: 0.2, fixture: undefined }), "NO");
});

test("the same match is found from either question on the page", () => {
  const picks = [called("Arsenal", "Chelsea", "home", 0.6)];
  assert.deepEqual(matchCalled({ question: "Will Arsenal beat Chelsea on Sat 21 Nov?", fixture: claimOn("Arsenal", "Chelsea").fixture }, picks), {
    side: "Arsenal win",
    confidence: 60,
    pickId: "p_1",
    committed: true,
  });
  const reversed = matchCalled({ question: "Will Chelsea beat Arsenal on Sat 21 Nov?", fixture: claimOn("Arsenal", "Chelsea").fixture }, picks);
  assert.equal(reversed?.side, "Arsenal win");
});

test("the same match is found when a site lists the teams the other way round", () => {
  assert.equal(matchCalled(claimOn("Chelsea", "Arsenal"), [called("Arsenal", "Chelsea", "home", 0.6)])?.pickId, "p_1");
});

test("accents, FC variants and aliases still match", () => {
  assert.ok(matchCalled(claimOn("Atletico Madrid", "Barcelona"), [called("Atlético Madrid", "Barcelona", "home", 0.6)]));
  assert.ok(matchCalled(claimOn("Arsenal FC", "AFC Bournemouth"), [called("Arsenal", "Bournemouth", "home", 0.6)]));
  assert.ok(matchCalled(claimOn("FC Cologne", "Bayer Leverkusen"), [called("Cologne", "Bayer Leverkusen", "home", 0.6)]));
  assert.ok(matchCalled(claimOn("Man Utd", "Aston Villa"), [called("Manchester United", "Aston Villa", "home", 0.6)]));
});

test("a different day or a different opponent is not the same match", () => {
  const picks = [called("Arsenal", "Chelsea", "home", 0.6)];
  assert.equal(matchCalled(claimOn("Arsenal", "Chelsea", "2026-11-22T15:00:00.000Z"), picks), null);
  assert.equal(matchCalled(claimOn("Arsenal", "Fulham"), picks), null);
});

test("a non-fixture claim matches only on the exact question", () => {
  const picks = [{ ...pick(2, 0.8), question: "Will rates fall by June?" }];
  assert.deepEqual(matchCalled({ question: "Will rates fall by June?" }, picks), { side: "YES", confidence: 80, pickId: "p_2", committed: false });
  assert.equal(matchCalled({ question: "Will rates fall by July?" }, picks), null);
});

test("a committed version wins over one that is not", () => {
  const first = { ...called("Arsenal", "Chelsea", "home", 0.6, false), id: "p_a" };
  const second = { ...called("Arsenal", "Chelsea", "home", 0.6, true), id: "p_b" };
  assert.equal(matchCalled(claimOn("Arsenal", "Chelsea"), [first, second])?.pickId, "p_b");
});

test("insights report the call and drop the generic note about the same match", () => {
  const same = called("Arsenal", "Chelsea", "home", 0.6);
  const other = { ...called("Arsenal", "Fulham", "home", 0.7), id: "p_other" };
  const claim = { id: "c1", question: "Will Chelsea beat Arsenal on Sat 21 Nov?", category: "sports", entities: ["Chelsea", "Arsenal"], fixture: { home: "Arsenal", away: "Chelsea", startISO: KICKOFF } };
  const [insight] = insightsFor([claim], {
    picks: [same, other],
    outcomes: [],
    lessons: [],
    related: new Map([["c1", [{ pick: same, distance: 0.1 }]]]),
  });
  assert.equal(insight.called?.side, "Arsenal win");
  assert.ok(!insight.notes.some((note) => note.includes("you called")));
  assert.ok(insight.relevance >= 5);
  const [withOther] = insightsFor([claim], {
    picks: [same, other],
    outcomes: [],
    lessons: [],
    related: new Map([["c1", [{ pick: other, distance: 0.1 }]]]),
  });
  assert.ok(withOther.notes.some((note) => note.includes("you called")));
});
