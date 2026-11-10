// Total Recall scoring and lessons. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonRecord, OutcomeRecord, PickRecord, Side } from "../src/recall/records";
import {
  brier,
  deriveLessons,
  insightsFor,
  leanSide,
  matchCalled,
  newLessons,
  quietSites,
  scoreOutcome,
} from "../src/recall/scoring";

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

const lessonAt = (key: LessonRecord["key"], text: string, minute: number, bias?: number): LessonRecord => ({
  key,
  at: new Date(Date.UTC(2026, 10, 8, 12, minute)).toISOString(),
  text,
  n: minute + 3,
  ...(bias === undefined ? {} : { bias }),
});
const matched = (minute: number, claimed: number, landed: number) =>
  lessonAt(
    "calibration",
    `Your confidence matches your hit rate (${claimed}% claimed, ${landed}% landed). Keep calling it like this.`,
    minute,
  );

/** Feeds lessons in one by one, the way sweeps do, and returns the ones that get written. */
function written(series: LessonRecord[]): LessonRecord[] {
  const kept: LessonRecord[] = [];
  for (const lesson of series) kept.push(...newLessons(kept, [lesson]));
  return kept;
}

test("the current scenario: 8 matched lessons moving 1 to 3 points write only the first", () => {
  const series = [
    [72, 71],
    [73, 72],
    [73, 74],
    [74, 73],
    [72, 72],
    [73, 71],
    [72, 73],
    [73, 74],
  ].map(([claimed, landed], minute) => matched(minute, claimed, landed));
  assert.deepEqual(written(series), [series[0]]);
});

test("a figure moving exactly 5 points writes; 4 does not", () => {
  const first = matched(0, 70, 70);
  assert.deepEqual(newLessons([first], [matched(1, 70, 74)]), []);
  assert.equal(newLessons([first], [matched(1, 70, 75)]).length, 1);
  assert.equal(newLessons([first], [matched(1, 65, 70)]).length, 1);
});

test("small moves add up against the newest lesson written", () => {
  const series = [matched(0, 70, 70), matched(1, 70, 72), matched(2, 70, 74), matched(3, 70, 76)];
  assert.deepEqual(
    written(series).map((lesson) => lesson.text),
    [series[0].text, series[3].text],
  );
});

test("a change of meaning writes even when the numbers barely move", () => {
  const before = matched(0, 72, 70);
  const after = lessonAt(
    "calibration",
    "You call 72% on average but land 63%: you run 9 points overconfident. Shade your calls toward 50%.",
    1,
  );
  assert.equal(newLessons([before], [after]).length, 1);
  const under = lessonAt(
    "calibration",
    "You land 83% of calls while claiming 69%: you are 14 points underconfident. Back yourself more.",
    2,
  );
  assert.equal(newLessons([after], [under]).length, 1);
});

test("favourites: earned and burned are different meanings", () => {
  const earned = lessonAt(
    "favourites",
    "Your strong calls (60%+) come in 83% of the time, better than you claim. Your conviction is earned.",
    0,
  );
  const burned = lessonAt(
    "favourites",
    "Your strong calls (60%+) come in 80% of the time, 9 points below what you claim. Favourites have burned you.",
    1,
  );
  assert.equal(newLessons([earned], [burned]).length, 1);
  assert.deepEqual(
    newLessons(
      [earned],
      [
        lessonAt(
          "favourites",
          "Your strong calls (60%+) come in 85% of the time, better than you claim. Your conviction is earned.",
          1,
        ),
      ],
    ),
    [],
  );
});

test("vs market: ahead, behind and level, and the edge in points", () => {
  const ahead = lessonAt(
    "vs_market",
    "You have beaten the market price on 5 calls (Brier 0.02 better). Your edge is real so far.",
    0,
    0.02,
  );
  const behind = lessonAt(
    "vs_market",
    "The market price has beaten you on 6 calls (Brier 0.02 worse). When you disagree with the odds, think twice.",
    1,
    -0.02,
  );
  const level = lessonAt("vs_market", "You and the market have scored about the same on 7 calls.", 2, 0);
  assert.equal(newLessons([ahead], [behind]).length, 1);
  assert.equal(newLessons([behind], [level]).length, 1);
  // More calls and a similar edge say nothing new.
  assert.deepEqual(
    newLessons(
      [ahead],
      [
        lessonAt(
          "vs_market",
          "You have beaten the market price on 9 calls (Brier 0.03 better). Your edge is real so far.",
          1,
          0.03,
        ),
      ],
    ),
    [],
  );
  assert.equal(
    newLessons(
      [ahead],
      [
        lessonAt(
          "vs_market",
          "You have beaten the market price on 9 calls (Brier 0.08 better). Your edge is real so far.",
          1,
          0.08,
        ),
      ],
    ).length,
    1,
  );
});

test("entities: better, overrate and underrate, and the hit rate", () => {
  const better = lessonAt("entity:arsenal", "You read Arsenal well: 3 of 4 right, better than your usual.", 0);
  const overrate = lessonAt(
    "entity:arsenal",
    "You overrate Arsenal: 3 of 4 right, and your YES runs 12 points high on them.",
    1,
  );
  const underrate = lessonAt(
    "entity:arsenal",
    "You underrate Arsenal: 3 of 4 right, and they keep doing better than you expect.",
    2,
  );
  assert.equal(newLessons([better], [overrate]).length, 1);
  assert.equal(newLessons([overrate], [underrate]).length, 1);
  // 3 of 4 is 75%, 8 of 11 is 73%: one more call, the same story.
  assert.deepEqual(
    newLessons(
      [better],
      [lessonAt("entity:arsenal", "You read Arsenal well: 8 of 11 right, better than your usual.", 1)],
    ),
    [],
  );
  assert.equal(
    newLessons(
      [better],
      [lessonAt("entity:arsenal", "You read Arsenal well: 4 of 4 right, better than your usual.", 1)],
    ).length,
    1,
  );
});

test("a key seen for the first time is always written", () => {
  assert.equal(
    newLessons(
      [matched(0, 70, 70)],
      [
        lessonAt(
          "favourites",
          "Your strong calls (60%+) come in 83% of the time, better than you claim. Your conviction is earned.",
          1,
        ),
      ],
    ).length,
    1,
  );
});

test("only the newest lesson of a key is compared", () => {
  const older = matched(0, 50, 50);
  const newest = matched(1, 70, 70);
  assert.deepEqual(newLessons([older, newest], [matched(2, 71, 71)]), []);
});

test("text Soothia doesn't recognise falls back to comparing the words", () => {
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
  assert.deepEqual(
    matchCalled(
      { question: "Will Arsenal beat Chelsea on Sat 21 Nov?", fixture: claimOn("Arsenal", "Chelsea").fixture },
      picks,
    ),
    {
      side: "Arsenal win",
      confidence: 60,
      pickId: "p_1",
      committed: true,
      pYes: 0.6,
      fixture: { home: "Arsenal", away: "Chelsea", startISO: "2026-11-21T15:00:00.000Z", subject: "home" },
    },
  );
  const reversed = matchCalled(
    { question: "Will Chelsea beat Arsenal on Sat 21 Nov?", fixture: claimOn("Arsenal", "Chelsea").fixture },
    picks,
  );
  assert.equal(reversed?.side, "Arsenal win");
});

test("the same match is found when a site lists the teams the other way round", () => {
  assert.equal(matchCalled(claimOn("Chelsea", "Arsenal"), [called("Arsenal", "Chelsea", "home", 0.6)])?.pickId, "p_1");
});

test("accents, FC variants and aliases still match", () => {
  assert.ok(
    matchCalled(claimOn("Atletico Madrid", "Barcelona"), [called("Atlético Madrid", "Barcelona", "home", 0.6)]),
  );
  assert.ok(matchCalled(claimOn("Arsenal FC", "AFC Bournemouth"), [called("Arsenal", "Bournemouth", "home", 0.6)]));
  assert.ok(
    matchCalled(claimOn("FC Cologne", "Bayer Leverkusen"), [called("Cologne", "Bayer Leverkusen", "home", 0.6)]),
  );
  assert.ok(matchCalled(claimOn("Man Utd", "Aston Villa"), [called("Manchester United", "Aston Villa", "home", 0.6)]));
});

test("a different day or a different opponent is not the same match", () => {
  const picks = [called("Arsenal", "Chelsea", "home", 0.6)];
  assert.equal(matchCalled(claimOn("Arsenal", "Chelsea", "2026-11-22T15:00:00.000Z"), picks), null);
  assert.equal(matchCalled(claimOn("Arsenal", "Fulham"), picks), null);
});

test("a non-fixture claim matches only on the exact question", () => {
  const picks = [{ ...pick(2, 0.8), question: "Will rates fall by June?" }];
  assert.deepEqual(matchCalled({ question: "Will rates fall by June?" }, picks), {
    side: "YES",
    confidence: 80,
    pickId: "p_2",
    committed: false,
    pYes: 0.8,
    fixture: null,
  });
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
  const claim = {
    id: "c1",
    question: "Will Chelsea beat Arsenal on Sat 21 Nov?",
    category: "sports",
    entities: ["Chelsea", "Arsenal"],
    fixture: { home: "Arsenal", away: "Chelsea", startISO: KICKOFF },
  };
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

test("a wallet link among the preferences does not disturb quiet sites", () => {
  assert.deepEqual(
    quietSites([
      { kind: "wallet_link", at: "2026-11-08T10:00:00.000Z", address: "0xabc" },
      { kind: "quiet_site", at: "2026-11-08T11:00:00.000Z", site: "Example.com" },
    ]),
    ["example.com"],
  );
});
