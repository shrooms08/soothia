// Amounts, payouts, statuses and the wallet summary. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecallCalled, Tile } from "../src/messages";
import {
  amountProblem,
  backedLine,
  canTopUp,
  formatSui,
  GAS_RESERVE_MIST,
  isClaimable,
  multiplierWith,
  parseSuiAmount,
  poolIsOpenForStakes,
  poolLine,
  positionStatusText,
  signedSui,
  stakeEligible,
  stakeErrorText,
  stakeEstimate,
  stakeTileIds,
  walletErrorText,
  walletSummary,
  type PoolLimits,
  type PoolView,
  type StakePositionView,
} from "../src/stake-logic";

const SUI = 1_000_000_000n;
const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const LIMITS: PoolLimits = { minStakeMist: "100000000", maxStakePerUserMist: "5000000000", maxPoolMist: "50000000000" };
const called = (overrides: Partial<RecallCalled> = {}): RecallCalled => ({
  side: "Arsenal win",
  confidence: 60,
  pickId: "p1",
  committed: true,
  pYes: 0.6,
  fixture: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" },
  ...overrides,
});
const pool = (overrides: Partial<PoolView> = {}): PoolView => ({
  exists: true,
  poolId: "0xpool",
  status: "open",
  closeMs: Date.parse(KICKOFF),
  yesTotal: (32n * SUI / 10n).toString(),
  noTotal: (11n * SUI / 10n).toString(),
  feeBps: 100,
  limits: LIMITS,
  ...overrides,
});

test("amounts read and print exactly", () => {
  assert.equal(parseSuiAmount("0.1"), 100_000_000n);
  assert.equal(parseSuiAmount(" 5 "), 5n * SUI);
  assert.equal(parseSuiAmount("1.000000001"), SUI + 1n);
  for (const bad of ["", "0", "0.0", "-1", "1.0000000001", "abc", "1e3", "1,5", ".5"]) assert.equal(parseSuiAmount(bad), null, bad);
  assert.equal(formatSui(100_000_000n), "0.1");
  assert.equal(formatSui(5n * SUI), "5");
  assert.equal(formatSui(1_536_999n * 100n, 4), "0.1536");
  assert.equal(formatSui("0"), "0");
});

test("only a committed fixture call far enough from kickoff can be staked", () => {
  assert.equal(stakeEligible(called(), NOW), true);
  assert.equal(stakeEligible(called({ committed: false }), NOW), false);
  assert.equal(stakeEligible(called({ fixture: null }), NOW), false);
  assert.equal(stakeEligible(called({ pYes: undefined }), NOW), false);
  assert.equal(stakeEligible(null, NOW), false);
  const kickoff = Date.parse(KICKOFF);
  assert.equal(stakeEligible(called(), kickoff - 120_000), false);
  assert.equal(stakeEligible(called(), kickoff - 120_001), true);
});

const tile = (id: string, question: string): Tile => ({ claim: { id, question } as Tile["claim"] });

test("one tile per call gets the staking row, the one the call was about", () => {
  const tiles = [tile("a", "Will Newcastle United beat Arsenal?"), tile("b", "Will Arsenal beat Newcastle United?")];
  assert.deepEqual([...stakeTileIds(tiles, () => called(), NOW)], ["b"]);
});

test("if no question names the team, the first tile gets it", () => {
  const tiles = [tile("a", "Who wins?"), tile("b", "Really?")];
  assert.deepEqual([...stakeTileIds(tiles, () => called(), NOW)], ["a"]);
});

test("tiles with no stakeable call get no row", () => {
  assert.equal(stakeTileIds([tile("a", "Q")], () => null, NOW).size, 0);
  assert.equal(stakeTileIds([tile("a", "Q")], () => called({ committed: false }), NOW).size, 0);
});

test("the pool line uses the user's side, whichever side that is", () => {
  assert.equal(poolLine(pool(), true, "Arsenal win"), "Pool: 3.2 SUI on Arsenal win · 1.1 SUI against · pays 1.33x");
  assert.equal(poolLine(pool(), false, "Arsenal doesn't win"), "Pool: 1.1 SUI on Arsenal doesn't win · 3.2 SUI against · pays 3.87x");
});

test("no pool yet, and no pays figure with nothing on your side", () => {
  assert.equal(poolLine(pool({ exists: false, yesTotal: "0", noTotal: "0" }), true, "X"), "No pool yet. Be the first to back it.");
  assert.equal(poolLine(pool({ yesTotal: "0" }), true, "Arsenal win"), "Pool: 0 SUI on Arsenal win · 1.1 SUI against");
});

test("what you backed, and when a top-up is allowed", () => {
  assert.equal(backedLine(pool(), true, SUI), "You backed 1 SUI · pays ~1.33x");
  assert.equal(canTopUp(LIMITS, 49n * SUI / 10n), true);
  assert.equal(canTopUp(LIMITS, 49n * SUI / 10n + 1n), false);
  assert.equal(canTopUp(LIMITS, 5n * SUI), false);
});

test("a pool takes stakes only while open and more than 2 minutes before close", () => {
  assert.equal(poolIsOpenForStakes(pool(), NOW), true);
  assert.equal(poolIsOpenForStakes(pool({ exists: false, status: null }), NOW), true);
  assert.equal(poolIsOpenForStakes(pool({ status: "void" }), NOW), false);
  assert.equal(poolIsOpenForStakes(pool({ closeMs: NOW + 120_000 }), NOW), false);
});

const input = (overrides: Partial<Parameters<typeof amountProblem>[0]> = {}) => ({ amountMist: 100_000_000n as bigint | null, limits: LIMITS, heldMist: 0n, poolTotalMist: 0n, balanceMist: null as bigint | null, ...overrides });

test("amount validation: the good cases", () => {
  assert.equal(amountProblem(input()), null);
  assert.equal(amountProblem(input({ amountMist: 5n * SUI })), null);
  assert.equal(amountProblem(input({ amountMist: SUI, heldMist: 4n * SUI })), null);
  assert.equal(amountProblem(input({ poolTotalMist: 49n * SUI + 900_000_000n })), null);
  assert.equal(amountProblem(input({ balanceMist: 100_000_000n + GAS_RESERVE_MIST })), null);
});

test("amount validation: every refusal says why", () => {
  assert.match(amountProblem(input({ amountMist: null }))!, /Enter an amount/);
  assert.match(amountProblem(input({ amountMist: 99_999_999n }))!, /minimum stake is 0\.1 SUI/);
  assert.match(amountProblem(input({ amountMist: 5n * SUI + 1n }))!, /most you can stake on one pool is 5 SUI/);
  assert.match(amountProblem(input({ amountMist: SUI + 1n, heldMist: 4n * SUI }))!, /add at most 1 SUI more/);
  assert.match(amountProblem(input({ amountMist: SUI, heldMist: 5n * SUI }))!, /add at most 0 SUI more/);
  assert.match(amountProblem(input({ poolTotalMist: 50n * SUI }))!, /room for 0 SUI more/);
  assert.match(amountProblem(input({ balanceMist: 100_000_000n + GAS_RESERVE_MIST - 1n }))!, /needs 0\.12 SUI including gas/);
});

test("a first stake pays the pot less the fee", () => {
  const empty = { yesTotal: "0", noTotal: "0", feeBps: 100 };
  assert.deepEqual(stakeEstimate(empty, true, SUI, 0n), { multiplier: 0.99, payoutMist: 990_000_000n });
});

test("the estimate includes this stake in the pool and matches the contract's sum", () => {
  const p = { yesTotal: (4n * SUI).toString(), noTotal: (2n * SUI).toString(), feeBps: 100 };
  // (4 + 2 + 2) * 0.99 / 6 = 1.32
  assert.deepEqual(stakeEstimate(p, true, 2n * SUI, 0n), { multiplier: 1.32, payoutMist: 2_640_000_000n });
  assert.equal(stakeEstimate(p, false, SUI, 0n).multiplier, Number(((7n * SUI * 99n) / 100n * 10_000n) / (3n * SUI)) / 10_000);
});

test("a top-up's estimate covers the whole position", () => {
  const p = { yesTotal: (3n * SUI).toString(), noTotal: SUI.toString(), feeBps: 100 };
  // Held 1 of the 3 on YES, adding 1: (5 * 0.99) / 4 per SUI, on 2 SUI.
  assert.equal(stakeEstimate(p, true, SUI, SUI).payoutMist, 2_475_000_000n);
});

test("payouts round down", () => {
  const p = { yesTotal: "3", noTotal: "1", feeBps: 0 };
  assert.equal(stakeEstimate(p, true, 0n, 1n).payoutMist, 1n);
});

test("multipliers are null with nothing on the side", () => {
  assert.equal(multiplierWith({ yesTotal: "0", noTotal: "100", feeBps: 100 }, true, 0n), null);
});

test("every Worker refusal has plain words", () => {
  const closed = /match is about to start/;
  assert.match(stakeErrorText(409, { error: "too_close_to_kickoff" }).text, closed);
  assert.match(stakeErrorText(409, { error: "pool_not_open" }).text, closed);
  assert.match(stakeErrorText(409, { error: "stake_rejected", abortCode: "4" }).text, closed);
  assert.match(stakeErrorText(400, { error: "above_user_limit" }).text, /over the limit/);
  assert.match(stakeErrorText(409, { error: "stake_rejected", abortCode: "7" }).text, /over the limit/);
  assert.match(stakeErrorText(409, { error: "pool_full" }).text, /full/);
  assert.match(stakeErrorText(409, { error: "side_switch" }).text, /other side/);
  assert.match(stakeErrorText(400, { error: "insufficient_balance", neededMist: "120000000" }).text, /0\.12 SUI including gas/);
  assert.match(stakeErrorText(0, null).text, /reach Soothia/);
  assert.equal(stakeErrorText(429, { error: "pool_cap_reached" }).retry, false);
  assert.equal(stakeErrorText(429, { error: "rate_limited" }).retry, true);
  assert.equal(stakeErrorText(409, { error: "too_close_to_kickoff" }).retry, false);
  assert.equal(stakeErrorText(500, { error: "weird" }).retry, true);
});

test("wallet failures have plain words", () => {
  assert.match(walletErrorText("User rejected the request").text, /cancelled in your wallet/);
  assert.match(walletErrorText("Insufficient gas balance").text, /enough SUI/);
  assert.match(walletErrorText("The wallet did not respond in time.").text, /check your wallet before trying again/);
  const refused = walletErrorText("Transaction refused. The amount differs from what you chose.");
  assert.match(refused.text, /Nothing was sent to your wallet/);
  assert.equal(refused.retry, false);
});

const position = (overrides: Partial<StakePositionView> = {}): StakePositionView => ({
  poolId: "0xp",
  pickId: "p1",
  match: { home: "A", away: "B", startISO: KICKOFF, subject: "away" },
  side: "YES",
  status: "open",
  amountMist: SUI.toString(),
  estimatedPayoutMist: "1500000000",
  claimOpensAtMs: null,
  result: null,
  ...overrides,
});

test("every status reads in words", () => {
  const text = (overrides: Partial<StakePositionView>) => positionStatusText(position(overrides), () => "19:45");
  assert.equal(text({ status: "open" }), "Open");
  assert.equal(text({ status: "awaiting_result" }), "Awaiting result");
  assert.equal(text({ status: "challenge_window", claimOpensAtMs: 5 }), "In challenge window until 19:45");
  assert.equal(text({ status: "claimable", result: "won" }), "Won 1.5 SUI");
  assert.equal(text({ status: "lost", result: "lost" }), "Lost");
  assert.equal(text({ status: "refundable", result: "refunded", estimatedPayoutMist: SUI.toString() }), "Refund of 1 SUI ready");
  assert.equal(text({ status: "claimed", result: "won" }), "Claimed 1.5 SUI");
  assert.equal(text({ status: "claimed", result: "refunded", estimatedPayoutMist: SUI.toString() }), "Refunded 1 SUI");
});

test("only winners and refunds can claim", () => {
  assert.deepEqual((["open", "awaiting_result", "challenge_window", "claimable", "lost", "refundable", "claimed"] as const).filter(isClaimable), ["claimable", "refundable"]);
  assert.equal(isClaimable(null), false);
});

test("the summary counts staked, won, lost, profit, ROI and best multiplier", () => {
  const summary = walletSummary([
    position({ status: "claimable", result: "won", amountMist: SUI.toString(), estimatedPayoutMist: "1500000000" }),
    position({ status: "claimed", result: "won", amountMist: (2n * SUI).toString(), estimatedPayoutMist: "5000000000" }),
    position({ status: "lost", result: "lost", amountMist: SUI.toString(), estimatedPayoutMist: "0" }),
    position({ status: "open", amountMist: SUI.toString() }),
  ]);
  assert.equal(summary.stakedMist, 5n * SUI);
  assert.equal(summary.wonMist, 6_500_000_000n);
  assert.equal(summary.lostMist, SUI);
  // Won 6.5 on 3 staked, lost 1: +2.5 on 4 settled.
  assert.equal(summary.profitMist, 2_500_000_000n);
  assert.equal(summary.roiPercent, 62.5);
  assert.equal(summary.bestMultiplier, 2.5);
});

test("refunds are left out, and nothing settled means no profit figure", () => {
  const refunded = walletSummary([position({ status: "claimed", result: "refunded" }), position({ status: "refundable", result: "refunded" })]);
  assert.equal(refunded.stakedMist, 0n);
  assert.equal(refunded.profitMist, null);
  const open = walletSummary([position({ status: "challenge_window", claimOpensAtMs: 5 })]);
  assert.equal(open.stakedMist, SUI);
  assert.equal(open.profitMist, null);
  assert.equal(open.roiPercent, null);
  assert.equal(open.bestMultiplier, null);
});

test("a loss-only record shows a negative ROI", () => {
  const summary = walletSummary([position({ status: "lost", result: "lost", estimatedPayoutMist: "0" })]);
  assert.equal(summary.profitMist, -SUI);
  assert.equal(summary.roiPercent, -100);
});

test("signed amounts", () => {
  assert.equal(signedSui(500_000_000n), "+0.5 SUI");
  assert.equal(signedSui(-100_000_000n), "-0.1 SUI");
  assert.equal(signedSui(0n), "+0 SUI");
});
