// Total Recall scoring and lessons. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonRecord, OutcomeRecord, PickRecord, Side } from "../src/recall/records";
import { brier, deriveLessons, newLessons, scoreOutcome } from "../src/recall/scoring";

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
