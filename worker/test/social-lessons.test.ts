// The staking and social lessons, and that they dedupe like the others.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonRecord, OutcomeRecord, PickRecord, StakeRecord } from "../src/recall/records";
import { deriveLessons, newLessons, stakingAndSocialLessons } from "../src/recall/scoring";

const AT = "2026-11-09T12:00:00.000Z";
const outcome = (pickId: string, hit: boolean): OutcomeRecord => ({ pickId, at: AT, question: "Q", category: "sports", entities: [], result: hit ? "YES" : "NO", pYes: 0.7, marketYes: null, brier: hit ? 0.09 : 0.49, marketBrier: null, hit, detail: "d", favourite: true });
const pick = (id: string, overrides: Partial<PickRecord> = {}): PickRecord => ({ id, at: AT, question: "Q", category: "sports", pYes: 0.7, marketYes: null, entities: [], endTime: AT, source: { site: "x", url: "https://x" }, hash: "h", commit: null, ...overrides });
const stake = (pickId: string, amountMist = 100_000_000n, digest = `tx-${pickId}`): StakeRecord => ({ pickId, poolId: "p", questionHash: "q", side: "YES", amountMist: amountMist.toString(), digest, at: AT, sender: "s", about: "a" });

const run = (outcomes: OutcomeRecord[], context: { picks?: PickRecord[]; stakes?: StakeRecord[] }) => stakingAndSocialLessons(outcomes, { picks: context.picks ?? [], stakes: context.stakes ?? [] }, AT);
const keyed = (lessons: LessonRecord[], key: string) => lessons.find((lesson) => lesson.key === key);
const series = (prefix: string, hits: number, misses: number) => [...Array.from({ length: hits }, (_, i) => outcome(`${prefix}h${i}`, true)), ...Array.from({ length: misses }, (_, i) => outcome(`${prefix}m${i}`, false))];

test("stakes: staked against free, in plain words", () => {
  const staked = series("s", 3, 1);
  const free = series("f", 1, 2);
  const lesson = keyed(run([...staked, ...free], { stakes: staked.map((item) => stake(item.pickId)) }), "stakes");
  assert.equal(lesson?.text, "Your staked calls land 75%, free ones 33%.");
});

test("stakes: needs three on each side", () => {
  const staked = series("s", 2, 0);
  assert.equal(keyed(run([...staked, ...series("f", 3, 3)], { stakes: staked.map((item) => stake(item.pickId)) }), "stakes"), undefined);
  const enough = series("s", 3, 0);
  assert.equal(keyed(run([...enough, ...series("f", 2, 0)], { stakes: enough.map((item) => stake(item.pickId)) }), "stakes"), undefined);
});

test("a transaction seen twice counts once", () => {
  const list = series("s", 3, 0);
  const free = series("f", 3, 0);
  const stakes = [...list.map((item) => stake(item.pickId)), stake(list[0].pickId, 100_000_000n, `tx-${list[0].pickId}`)];
  assert.ok(keyed(run([...list, ...free], { stakes }), "stakes"));
});

function sized(bigHits: number, bigMisses: number, smallHits: number, smallMisses: number) {
  const big = series("b", bigHits, bigMisses);
  const small = series("t", smallHits, smallMisses);
  const stakes = [...big.map((item) => stake(item.pickId, 500_000_000n)), ...small.map((item) => stake(item.pickId, 100_000_000n))];
  return run([...big, ...small], { stakes });
}

test("stake size: bigger stakes doing better", () => {
  assert.equal(keyed(sized(3, 0, 1, 2), "stake_size")?.text, "Your bigger stakes land 100%, your smaller ones 33%. You size up well.");
});

test("stake size: bigger stakes doing worse, and level", () => {
  assert.equal(keyed(sized(1, 2, 3, 0), "stake_size")?.text, "Your bigger stakes land 33%, your smaller ones 100%. You size up on the wrong calls.");
  assert.equal(keyed(sized(2, 1, 2, 1), "stake_size")?.text, "Your bigger stakes land 67%, your smaller ones 67%. Stake size makes no difference to your calls.");
});

test("stake size: needs three above and below the median", () => {
  assert.equal(keyed(sized(2, 0, 3, 0), "stake_size"), undefined);
  const same = series("s", 6, 0);
  assert.equal(keyed(run(same, { stakes: same.map((item) => stake(item.pickId)) }), "stake_size"), undefined);
});

test("stake size: the middle stake is neither bigger nor smaller", () => {
  const list = series("x", 7, 0);
  const amounts = [1n, 2n, 3n, 4n, 5n, 6n, 7n];
  const lesson = keyed(run(list, { stakes: list.map((item, i) => stake(item.pickId, amounts[i])) }), "stake_size");
  assert.equal(lesson?.n, 6);
});

test("tailing: N of M right, per handle, from three up", () => {
  const list = series("a", 2, 1);
  const lessons = run(list, { picks: list.map((item) => pick(item.pickId, { tailOf: "ada" })) });
  assert.equal(keyed(lessons, "tail:ada")?.text, "Tailing @ada: 2 of 3 right");
  const two = series("b", 2, 0);
  assert.equal(keyed(run(two, { picks: two.map((item) => pick(item.pickId, { tailOf: "bob" })) }), "tail:bob"), undefined);
});

test("a flipped tail isn't tailing", () => {
  const list = series("a", 3, 0);
  assert.equal(keyed(run(list, { picks: list.map((item) => pick(item.pickId, { tailOf: "ada", tailFlipped: true })) }), "tail:ada"), undefined);
});

test("against the crowd: your rate, from three such calls", () => {
  const list = series("a", 3, 1);
  const lessons = run([...list, ...series("w", 5, 5)], { picks: [...list.map((item) => pick(item.pickId, { followedConsensus: "against" })), pick("wh0", { followedConsensus: "with" })] });
  assert.equal(keyed(lessons, "consensus")?.text, "When you go against the people you follow, you're right 75%.");
  const few = series("b", 2, 0);
  assert.equal(keyed(run(few, { picks: few.map((item) => pick(item.pickId, { followedConsensus: "against" })) }), "consensus"), undefined);
});

test("deriveLessons includes them when given the context, and not otherwise", () => {
  const list = series("a", 3, 0);
  const picks = list.map((item) => pick(item.pickId, { tailOf: "ada" }));
  assert.ok(keyed(deriveLessons(list, AT, { picks, stakes: [] }), "tail:ada"));
  assert.equal(keyed(deriveLessons(list, AT), "tail:ada"), undefined);
});

const lessonOf = (key: LessonRecord["key"], text: string, minute = 0): LessonRecord => ({ key, at: new Date(Date.UTC(2026, 10, 9, 12, minute)).toISOString(), text, n: 5 });

test("each new lesson dedupes on small moves and writes on 5 points", () => {
  const cases: [LessonRecord["key"], string, string, string][] = [
    ["stakes", "Your staked calls land 75%, free ones 60%.", "Your staked calls land 77%, free ones 62%.", "Your staked calls land 80%, free ones 60%."],
    ["consensus", "When you go against the people you follow, you're right 75%.", "When you go against the people you follow, you're right 78%.", "When you go against the people you follow, you're right 80%."],
    ["tail:ada", "Tailing @ada: 3 of 4 right", "Tailing @ada: 8 of 11 right", "Tailing @ada: 4 of 4 right"],
    ["stake_size", "Your bigger stakes land 80%, your smaller ones 60%. You size up well.", "Your bigger stakes land 82%, your smaller ones 61%. You size up well.", "Your bigger stakes land 90%, your smaller ones 60%. You size up well."],
  ];
  for (const [key, first, small, big] of cases) {
    assert.deepEqual(newLessons([lessonOf(key, first)], [lessonOf(key, small, 1)]), [], key);
    assert.equal(newLessons([lessonOf(key, first)], [lessonOf(key, big, 1)]).length, 1, key);
  }
});

test("stake size flipping its meaning writes even on a small move", () => {
  const better = lessonOf("stake_size", "Your bigger stakes land 62%, your smaller ones 60%. You size up well.");
  const worse = lessonOf("stake_size", "Your bigger stakes land 59%, your smaller ones 60%. You size up on the wrong calls.", 1);
  assert.equal(newLessons([better], [worse]).length, 1);
});
