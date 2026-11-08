// Total Recall record encoding. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canonicalPick,
  decodeRecord,
  encodeRecord,
  type LessonRecord,
  type OutcomeRecord,
  type PickRecord,
  type PrefRecord,
  sentenceFor,
  type StakeRecord,
} from "../src/recall/records";

const pick: PickRecord = {
  id: "p_0123456789abcdef",
  at: "2026-11-08T08:00:00.000Z",
  question: "Will Arsenal beat Hull City in English Premier League on Sun 8 Nov?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: ["Arsenal", "Hull City"],
  endTime: "2026-11-08T17:00:00.000Z",
  source: { site: "espn.com", url: "https://www.espn.com/soccer/match/_/gameId/1" },
  fixture: { home: "Arsenal", away: "Hull City", startISO: "2026-11-08T14:00:00.000Z", subject: "home" },
  anchor: { checkpoint: "123", timestampMs: 1_700_000_000_000, via: "tatum-sui-mainnet" },
  hash: "ab".repeat(32),
  commit: null,
};

const outcome: OutcomeRecord = {
  pickId: pick.id,
  at: "2026-11-08T17:00:00.000Z",
  question: pick.question,
  category: "sports",
  entities: pick.entities,
  result: "YES",
  pYes: 0.7,
  marketYes: null,
  brier: 0.09,
  marketBrier: null,
  hit: true,
  detail: "Arsenal 2-0 Hull City (ESPN, full time)",
  favourite: true,
};

const lesson: LessonRecord = { key: "calibration", at: pick.at, text: "Shade your calls toward 50%.", n: 4, bias: 0.2 };
const pref: PrefRecord = { kind: "quiet_site", at: pick.at, site: "example.com" };
const stake: StakeRecord = {
  pickId: pick.id,
  poolId: `0x${"ab".repeat(32)}`,
  questionHash: "11".repeat(32),
  side: "YES",
  amountMist: "1000000000",
  digest: "8teWqYrBWopnhq2Wy22BQq1uvzepDoUzDzdRA6oE8iY",
  at: pick.at,
  sender: `0x${"cd".repeat(32)}`,
  about: "Arsenal win vs Hull City on 2026-11-08",
};

test("every record kind survives an encode and decode round trip", () => {
  assert.deepEqual(decodeRecord("pick", encodeRecord("pick", pick)), pick);
  assert.deepEqual(decodeRecord("outcome", encodeRecord("outcome", outcome)), outcome);
  assert.deepEqual(decodeRecord("lesson", encodeRecord("lesson", lesson)), lesson);
  assert.deepEqual(decodeRecord("pref", encodeRecord("pref", pref)), pref);
  assert.deepEqual(decodeRecord("stake", encodeRecord("stake", stake)), stake);
});

test("a record does not decode as a different kind, and plain text does not decode", () => {
  assert.equal(decodeRecord("outcome", encodeRecord("pick", pick)), null);
  assert.equal(decodeRecord("pick", "just a sentence"), null);
});

test("a wallet link survives a round trip and reads as a sentence", () => {
  const link: PrefRecord = { kind: "wallet_link", at: pick.at, address: `0x${"ab".repeat(32)}` };
  assert.deepEqual(decodeRecord("pref", encodeRecord("pref", link)), link);
  assert.equal(sentenceFor("pref", link), `My Sui wallet is 0x${"ab".repeat(32)}.`);
});

test("a stake reads as a sentence, in exact SUI", () => {
  assert.equal(sentenceFor("stake", stake), "Staked 1 SUI on Arsenal win vs Hull City on 2026-11-08.");
  assert.equal(sentenceFor("stake", { ...stake, side: "NO", amountMist: "250000000" }), "Staked 0.25 SUI against Arsenal win vs Hull City on 2026-11-08.");
  assert.equal(sentenceFor("stake", { ...stake, amountMist: "1000000001" }), "Staked 1.000000001 SUI on Arsenal win vs Hull City on 2026-11-08.");
});

test("canonicalPick ignores field order and is unchanged by hash and commit", () => {
  const reordered = Object.fromEntries(Object.entries(pick).reverse()) as unknown as PickRecord;
  assert.equal(canonicalPick(reordered), canonicalPick(pick));
  assert.equal(canonicalPick({ ...pick, hash: "other", commit: { digest: "d", network: "mainnet" } } as PickRecord), canonicalPick(pick));
});

test("canonicalPick covers the anchor", () => {
  const moved = { ...pick, anchor: { ...pick.anchor!, checkpoint: "124" } };
  assert.notEqual(canonicalPick(moved), canonicalPick(pick));
  const { anchor: _anchor, ...withoutAnchor } = pick;
  assert.equal((JSON.parse(canonicalPick(withoutAnchor)) as { anchor: unknown }).anchor, null);
});
