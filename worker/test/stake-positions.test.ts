// Position status and the stakes merged into /recall/record. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecallEnv } from "../src/recall/env";
import type { StakeRecord } from "../src/recall/records";
import type { StakeChain } from "../src/stake/chain";
import { estimatedPayout, multiplierAfterFee, poolTotals, positionResult, positionStatus } from "../src/stake/math";
import { groupStakes, stakeSummaries, viewPosition } from "../src/stake/positions";
import type { StakePool, StakePosition } from "../src/stake/readers";

const SUI = 1_000_000_000n;
const ADDRESS = `0x${"ab".repeat(32)}`;
const CLOSE = 1_000_000n;
const pool = (overrides: Partial<StakePool> = {}): StakePool => ({
  id: ADDRESS,
  questionHash: "11".repeat(32),
  closeMs: CLOSE,
  feeBps: 100n,
  minResolveDelayMs: 8_100_000n,
  challengeMs: 21_600_000n,
  yes: 4n * SUI,
  no: 2n * SUI,
  positionsTableId: ADDRESS,
  stakers: 2n,
  status: "open",
  outcomeYes: false,
  feeAmount: 0n,
  feeCollected: false,
  yesTotal: 0n,
  noTotal: 0n,
  resolvedAtMs: 0n,
  evidence: "",
  ...overrides,
});
const RESOLVED_AT = 50_000_000n;
const OPENS = RESOLVED_AT + 21_600_000n;
const resolved = (overrides: Partial<StakePool> = {}): StakePool =>
  pool({
    status: "resolved",
    outcomeYes: true,
    yesTotal: 4n * SUI,
    noTotal: 2n * SUI,
    feeAmount: 60_000_000n,
    resolvedAtMs: RESOLVED_AT,
    ...overrides,
  });
const yesStake: StakePosition = { side: true, amount: SUI, claimed: false };
const noStake: StakePosition = { side: false, amount: SUI, claimed: false };

test("open pools count live balances; settled pools count the totals taken at resolve", () => {
  assert.deepEqual(poolTotals(pool()), { yes: 4n * SUI, no: 2n * SUI });
  // After the window the contract moves the losing side into `yes`.
  assert.deepEqual(poolTotals(resolved({ yes: 5n * SUI, no: 0n })), { yes: 4n * SUI, no: 2n * SUI });
  assert.deepEqual(poolTotals(pool({ status: "void", yes: SUI, no: 0n })), { yes: SUI, no: 0n });
});

test("multipliers are after the fee, and null with no stake on that side", () => {
  assert.equal(multiplierAfterFee(4n * SUI, 2n * SUI, 4n * SUI, 100n), 1.485);
  assert.equal(multiplierAfterFee(4n * SUI, 2n * SUI, 2n * SUI, 100n), 2.97);
  assert.equal(multiplierAfterFee(0n, 2n * SUI, 0n, 100n), null);
});

test("every position status", () => {
  assert.equal(positionStatus(pool(), yesStake, CLOSE - 1n), "open");
  assert.equal(positionStatus(pool(), yesStake, CLOSE), "awaiting_result");
  assert.equal(positionStatus(resolved(), yesStake, OPENS - 1n), "challenge_window");
  assert.equal(positionStatus(resolved(), noStake, OPENS - 1n), "challenge_window");
  assert.equal(positionStatus(resolved(), yesStake, OPENS), "claimable");
  assert.equal(positionStatus(resolved(), noStake, OPENS), "lost");
  assert.equal(positionStatus(pool({ status: "void" }), noStake, OPENS), "refundable");
  assert.equal(positionStatus(resolved(), { ...yesStake, claimed: true }, OPENS), "claimed");
  assert.equal(positionStatus(pool({ status: "void" }), { ...noStake, claimed: true }, OPENS), "claimed");
});

test("a result is final only after the challenge window", () => {
  assert.equal(positionResult(pool(), yesStake, CLOSE), null);
  assert.equal(positionResult(resolved(), yesStake, OPENS - 1n), null);
  assert.equal(positionResult(resolved(), yesStake, OPENS), "won");
  assert.equal(positionResult(resolved(), noStake, OPENS), "lost");
  assert.equal(positionResult(resolved(), { ...yesStake, claimed: true }, OPENS), "won");
  assert.equal(positionResult(pool({ status: "void" }), noStake, OPENS), "refunded");
});

test("estimated payouts match the contract's sums", () => {
  assert.equal(estimatedPayout(pool(), yesStake), 1_485_000_000n);
  assert.equal(estimatedPayout(pool(), noStake), 2_970_000_000n);
  assert.equal(estimatedPayout(resolved(), yesStake), 1_485_000_000n);
  assert.equal(estimatedPayout(resolved(), noStake), 0n);
  assert.equal(estimatedPayout(pool({ status: "void" }), noStake), SUI);
});

test("a position view gives claimOpensAtMs only for a resolved pool", () => {
  assert.equal(viewPosition(resolved(), yesStake, Number(OPENS)).claimOpensAtMs, Number(OPENS));
  assert.equal(viewPosition(pool(), yesStake, 0).claimOpensAtMs, null);
});

const stake = (overrides: Partial<StakeRecord> = {}): StakeRecord => ({
  pickId: "p1",
  poolId: ADDRESS,
  questionHash: "11".repeat(32),
  side: "YES",
  amountMist: SUI.toString(),
  digest: "d1",
  at: "2026-11-08T10:00:00.000Z",
  sender: ADDRESS,
  about: "Arsenal win",
  ...overrides,
});

const fakeChain = (overrides: Partial<StakeChain>): StakeChain => overrides as StakeChain;
const ENV = {} as RecallEnv;

test("the same transaction read twice from Walrus counts once", () => {
  const groups = groupStakes([stake(), stake(), stake({ digest: "d2", at: "2026-11-08T11:00:00.000Z" })]);
  assert.deepEqual(
    groups.get("p1")?.map((entry) => entry.digest),
    ["d2", "d1"],
  );
});

test("the record shows the chain's amount, status and payout", async () => {
  const summaries = await stakeSummaries(
    ENV,
    [stake()],
    0,
    fakeChain({ readPool: async () => pool(), readPosition: async () => ({ ...yesStake, amount: 2n * SUI }) }),
  );
  assert.deepEqual(summaries.get("p1"), {
    poolId: ADDRESS,
    side: "YES",
    amountMist: (2n * SUI).toString(),
    status: "open",
    payoutMist: "2970000000",
    claimOpensAtMs: null,
    digests: ["d1"],
  });
});

test("a chain failure still returns what Walrus knows", async () => {
  const summaries = await stakeSummaries(
    ENV,
    [stake(), stake({ digest: "d2" })],
    0,
    fakeChain({
      readPool: async () => {
        throw new Error("down");
      },
    }),
  );
  assert.equal(summaries.get("p1")?.amountMist, (2n * SUI).toString());
  assert.equal(summaries.get("p1")?.status, null);
});

test("no stakes means no chain reads", async () => {
  assert.equal((await stakeSummaries(ENV, [], 0, fakeChain({}))).size, 0);
});
