// The pure logic behind My record. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecallRecord, RecallRecordPick } from "../src/messages";
import { buildRecordHeader, stakesForSummary } from "../src/record-logic";
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
