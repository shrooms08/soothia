// The pure logic behind My record. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecallRecord, RecallRecordPick } from "../src/messages";
import { attentionItems, buildRecordHeader, calibrationRows, groupCalls, isRecordSection, kickoffOf, lessonsForDisplay, lockedText, shortDate, shortLesson, stakeDetailText, stakeListLean, stakesForSummary } from "../src/record-logic";
import type { StakePositionView } from "../src/stake-logic";

const summary = (overrides: Partial<RecallRecord["summary"]> = {}): RecallRecord["summary"] => ({
  picks: 16,
  open: 1,
  resolved: 15,
  hits: 12,
  brier: 0.191,
  marketBrier: null,
  vsMarketCalls: 0,
  calibration: [],
  entities: [],
  callScore: 571,
  ...overrides,
});

const position = (overrides: Partial<StakePositionView> = {}): StakePositionView => ({
  poolId: "0xp",
  pickId: "p1",
  match: { home: "A", away: "B", startISO: "2026-11-21T17:30:00.000Z", subject: "away" },
  side: "YES",
  status: "open",
  amountMist: "100000000",
  estimatedPayoutMist: "99000000",
  claimOpensAtMs: null,
  result: null,
  ...overrides,
});

const header = (overrides: Partial<Parameters<typeof buildRecordHeader>[0]> = {}) => buildRecordHeader({ summary: summary(), handle: null, publicScore: null, stakes: [], ...overrides });

test("a private record with settled calls", () => {
  assert.deepEqual(header(), { identity: "Private", isPublic: false, score: "571", scoreNote: null, summary: "12 of 15 right" });
});

test("a public record shows the handle and the public score", () => {
  const view = header({ handle: "amy", publicScore: 540 });
  assert.equal(view.identity, "@amy · Public");
  assert.equal(view.isPublic, true);
  assert.equal(view.score, "540");
});

test("a public record before its first snapshot falls back to its own score", () => {
  assert.equal(header({ handle: "amy" }).score, "571");
});

test("an empty record shows a dash and what it needs", () => {
  const view = header({ summary: summary({ resolved: 0, hits: 0, brier: null, callScore: 500, picks: 0 }) });
  assert.equal(view.score, "—");
  assert.equal(view.scoreNote, "Needs 1 settled call");
  assert.equal(view.summary, "");
});

test("profit appears only once the user has staked", () => {
  assert.equal(header({ stakes: [position()] }).summary, "12 of 15 right · +0.0 SUI");
  assert.equal(header().summary.includes("SUI"), false);
});

test("the header's profit is settled money only", () => {
  const stakes = [position({ status: "claimed", result: "won", amountMist: "1000000000", estimatedPayoutMist: "1500000000" }), position({ status: "lost", result: "lost", amountMist: "100000000", estimatedPayoutMist: "0" })];
  assert.equal(header({ stakes }).summary, "12 of 15 right · +0.4 SUI");
  assert.equal(header({ stakes: [position({ status: "lost", result: "lost" })] }).summary, "12 of 15 right · -0.1 SUI");
});

const stakedPick = (overrides: Partial<RecallRecordPick> = {}): RecallRecordPick => ({
  id: "p1",
  at: "2026-11-08T10:00:00.000Z",
  question: "Q",
  pYes: 0.6,
  fixture: { home: "A", away: "B", subject: "away", startISO: "2026-11-21T17:30:00.000Z" },
  status: "open",
  detail: null,
  brier: null,
  commit: null,
  commitSkipped: null,
  stake: { poolId: "0xp", side: "YES", amountMist: "100000000", status: "open", payoutMist: "99000000", claimOpensAtMs: null, digests: ["d"] },
  ...overrides,
});

test("with no wallet connected, the record's own stakes stand in", () => {
  const stakes = stakesForSummary([], [stakedPick(), stakedPick({ id: "p2", stake: null })]);
  assert.equal(stakes.length, 1);
  assert.equal(stakes[0].amountMist, "100000000");
  assert.equal(stakes[0].pickId, "p1");
});

test("wallet positions win when there are any", () => {
  assert.deepEqual(stakesForSummary([position({ poolId: "wallet" })], [stakedPick()]).map((item) => item.poolId), ["wallet"]);
});

const NOW = new Date(2026, 10, 21, 12, 0).getTime();
const HOUR = 3_600_000;
const openPick = (id: string, kickoffMs: number): RecallRecordPick => stakedPick({ id, stake: null, fixture: { home: "A", away: "B", subject: "home", startISO: new Date(kickoffMs).toISOString() } });
const lesson = (at: number, text = "Your strong calls come in. More here.") => ({ key: "favourites", at: new Date(at).toISOString(), text, n: 6 });
const attention = (overrides: Partial<Parameters<typeof attentionItems>[0]> = {}) => attentionItems({ stakes: [], picks: [], lessons: [], nowMs: NOW, ...overrides });

test("nothing to do means an empty strip", () => {
  assert.deepEqual(attention(), []);
});

test("claimable stakes go to Wallet, counted with the right word", () => {
  assert.deepEqual(attention({ stakes: [position({ status: "claimable" })] }), [{ text: "1 stake ready to claim", section: "wallet" }]);
  assert.equal(attention({ stakes: [position({ status: "claimable" }), position({ status: "refundable" }), position()] })[0].text, "2 stakes ready to claim");
});

test("stakes that can't be claimed yet don't count", () => {
  assert.deepEqual(attention({ stakes: [position({ status: "challenge_window" }), position({ status: "lost" }), position({ status: "claimed" })] }), []);
});

test("calls kicking off today go to Calls", () => {
  assert.deepEqual(attention({ picks: [openPick("p1", NOW + 2 * HOUR)] }), [{ text: "1 call settles today", section: "calls" }]);
  assert.equal(attention({ picks: [openPick("p1", NOW + HOUR), openPick("p2", NOW - HOUR)] })[0].text, "2 calls settle today");
});

test("tomorrow's and already settled calls don't count", () => {
  assert.deepEqual(attention({ picks: [openPick("p1", NOW + 24 * HOUR), { ...openPick("p2", NOW), status: "right" }] }), []);
});

test("a lesson from the last 48 hours goes to Lessons, in short", () => {
  assert.deepEqual(attention({ lessons: [lesson(NOW - 47 * HOUR)] }), [{ text: "New lesson: Your strong calls come in", section: "lessons" }]);
  assert.deepEqual(attention({ lessons: [lesson(NOW - 49 * HOUR)] }), []);
});

test("the newest recent lesson is the one shown", () => {
  const items = attention({ lessons: [lesson(NOW - 10 * HOUR, "Older one."), lesson(NOW - HOUR, "Newest one.")] });
  assert.equal(items[0].text, "New lesson: Newest one");
});

test("at most two items, most urgent first", () => {
  const items = attention({ stakes: [position({ status: "claimable" })], picks: [openPick("p1", NOW + HOUR)], lessons: [lesson(NOW - HOUR)] });
  assert.deepEqual(items.map((item) => item.section), ["wallet", "calls"]);
});

test("a lesson is cut at its first clause and kept short", () => {
  assert.equal(shortLesson("You land 83% of calls while claiming 69%: you are 14 points underconfident."), "You land 83% of calls while claiming 69%");
  assert.equal(shortLesson("Your confidence matches your hit rate (72% claimed, 80% landed). Keep calling it like this."), "Your confidence matches your hit rate (72% claimed, 80% landed)");
  assert.equal(shortLesson(`${"x".repeat(80)}.`).length, 64);
});

test("a pick with no date has no kickoff", () => {
  assert.equal(Number.isNaN(kickoffOf({ fixture: null })), true);
  assert.equal(kickoffOf({ fixture: null, endTime: "2026-11-21T00:00:00.000Z" }), Date.parse("2026-11-21T00:00:00.000Z"));
});

const dated = (id: string, startISO: string, status: RecallRecordPick["status"] = "open"): RecallRecordPick => stakedPick({ id, status, stake: null, fixture: { home: "A", away: "B", subject: "home", startISO } });

test("upcoming calls run soonest first, settled ones newest first", () => {
  const picks = [dated("late", "2026-11-22T12:00:00Z"), dated("old", "2026-11-01T12:00:00Z", "right"), dated("soon", "2026-11-21T12:00:00Z"), dated("recent", "2026-11-08T12:00:00Z", "wrong")];
  const { upcoming, settled } = groupCalls(picks);
  assert.deepEqual(upcoming.map((pick) => pick.id), ["soon", "late"]);
  assert.deepEqual(settled.map((pick) => pick.id), ["recent", "old"]);
});

test("rows with no date don't disturb the order", () => {
  const { upcoming } = groupCalls([stakedPick({ id: "none", fixture: null, stake: null }), dated("dated", "2026-11-21T12:00:00Z")]);
  assert.equal(upcoming.length, 2);
});

test("dates are short, and blank when there is none", () => {
  assert.match(shortDate({ fixture: { home: "A", away: "B", subject: "home", startISO: "2026-11-21T12:00:00Z" } }), /21/);
  assert.equal(shortDate({ fixture: null }), "");
});

test("Locked shows hours, minutes under one, and days from 48 hours", () => {
  const commit = { digest: "d", explorerUrl: "u" };
  const kickoff = "2026-11-21T12:00:00.000Z";
  const locked = (at: string) => lockedText({ at, commit, fixture: { home: "A", away: "B", subject: "home", startISO: kickoff } });
  assert.equal(locked("2026-11-21T09:30:00.000Z"), "Locked 2h before kickoff");
  assert.equal(locked("2026-11-21T11:40:00.000Z"), "Locked 20m before kickoff");
  assert.equal(locked("2026-11-18T12:00:00.000Z"), "Locked 3d before kickoff");
  assert.equal(locked("2026-11-21T12:00:01.000Z"), null);
  assert.equal(lockedText({ at: "x", commit: null, fixture: null }), null);
});

const taught = (key: string, at: string, text = key) => ({ key, at, text, n: 5 });

test("lessons run most specific first", () => {
  const list = lessonsForDisplay([taught("calibration", "2026-11-08T22:00:00Z"), taught("vs_market", "2026-11-08T21:00:00Z"), taught("favourites", "2026-11-08T20:00:00Z"), taught("entity:arsenal", "2026-11-08T10:00:00Z")]);
  assert.deepEqual(list.map((lesson) => lesson.key), ["entity:arsenal", "favourites", "vs_market"]);
});

test("only the newest lesson per key counts, at most three", () => {
  const list = lessonsForDisplay([taught("calibration", "2026-11-01T00:00:00Z", "old"), taught("calibration", "2026-11-08T00:00:00Z", "new")]);
  assert.deepEqual(list.map((lesson) => lesson.text), ["new"]);
  assert.equal(lessonsForDisplay(["a", "b", "c", "d"].map((name) => taught(`entity:${name}`, "2026-11-08T00:00:00Z"))).length, 3);
});

test("the confidence chart skips empty buckets and reads plainly", () => {
  const rows = calibrationRows([{ label: "70-79%", calls: 5, hitRate: 0.8, claimed: 0.72 }, { label: "50-59%", calls: 0, hitRate: 0, claimed: 0 }]);
  assert.deepEqual(rows, [{ text: "When you say ~70%, you're right 80%", saidPercent: 70, rightPercent: 80 }]);
});

test("a stake's detail adds an estimate only while it's undecided", () => {
  const pick = { pYes: 0.6, fixture: { home: "A", away: "B", subject: "away" as const } };
  assert.equal(stakeDetailText(position({ estimatedPayoutMist: "99000000" }), pick, () => ""), "Staked 0.1 SUI on B win \u00b7 Open \u00b7 about 0.099 SUI if right");
  assert.equal(stakeDetailText(position({ status: "lost", result: "lost", estimatedPayoutMist: "0" }), pick, () => ""), "Staked 0.1 SUI on B win \u00b7 Lost");
});

test("the stake list works even for a call not on this record", () => {
  assert.equal(stakeListLean(position(), [], () => ""), "A v B \u00b7 0.1 SUI on B win \u00b7 Open");
});

test("only real sections are accepted from storage", () => {
  assert.equal(isRecordSection("wallet"), true);
  assert.equal(isRecordSection("settings"), false);
  assert.equal(isRecordSection(null), false);
});
