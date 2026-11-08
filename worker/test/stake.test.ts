// Soothia staking helpers, without a network. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { claimAmount, claimOpensAtMs, feeOn, inChallengeWindow, wasOverturned, winnerPayout, type SettledPool } from "../src/stake/math";
import { ConfigBcs, parseConfig, parsePool, parsePosition, PoolBcs, PositionBcs } from "../src/stake/readers";
import { buildClaim, buildCollectFee, buildCreatePool, buildOverturn, buildResolve, buildSetDelays, buildStake } from "../src/stake/transactions";

const SUI = 1_000_000_000n;
const U64_MAX = 18_446_744_073_709_551_615n;
const ADDRESS = `0x${"ab".repeat(32)}`;
const OTHER = `0x${"cd".repeat(32)}`;
const HASH = "11".repeat(32);
const IDS = { packageId: `0x${"01".repeat(32)}`, configId: ADDRESS };

const CHALLENGE = 21_600_000n;
const RESOLVED_AT = 1_000_000n;
const OPENS = RESOLVED_AT + CHALLENGE;
const resolved = (yesTotal: bigint, noTotal: bigint, feeBps = 100n, outcomeYes = true): SettledPool => ({
  status: "resolved",
  outcomeYes,
  yesTotal,
  noTotal,
  feeAmount: feeOn(yesTotal + noTotal, feeBps),
  resolvedAtMs: RESOLVED_AT,
  challengeMs: CHALLENGE,
});
const position = (side: boolean, amount: bigint, claimed = false) => ({ side, amount, claimed });

test("the fee is the pot times basis points, rounded down", () => {
  assert.equal(feeOn(6n * SUI, 100n), 60_000_000n);
  assert.equal(feeOn(99n, 100n), 0n);
  assert.equal(feeOn(100n, 100n), 1n);
});

test("three stakers are paid the same as the contract's happy path", () => {
  const pool = resolved(4n * SUI, 2n * SUI);
  assert.equal(claimAmount(pool, position(true, SUI), OPENS), 1_485_000_000n);
  assert.equal(claimAmount(pool, position(true, 3n * SUI), OPENS), 4_455_000_000n);
});

test("a single staker gets their stake back less the fee", () => {
  const stake = 100_000_000n;
  assert.equal(claimAmount(resolved(stake, 0n), position(true, stake), OPENS), 99_000_000n);
});

test("payouts round down and never exceed the net pot", () => {
  const stakes = [100_000_001n, 100_000_002n, 100_000_004n];
  const yesTotal = stakes.reduce((sum, value) => sum + value, 0n);
  const pool = resolved(yesTotal, 333_333_337n);
  const net = yesTotal + 333_333_337n - pool.feeAmount;
  const paid = stakes.reduce((sum, value) => sum + claimAmount(pool, position(true, value), OPENS), 0n);
  assert.ok(paid <= net);
  assert.ok(net - paid < BigInt(stakes.length));
});

test("the math does not lose precision near the top of u64", () => {
  assert.equal(winnerPayout(U64_MAX, U64_MAX, U64_MAX), U64_MAX);
});

test("a NO outcome pays the NO side", () => {
  const pool = resolved(2n * SUI, SUI, 100n, false);
  assert.equal(claimAmount(pool, position(false, SUI), OPENS), 2_970_000_000n);
  assert.equal(claimAmount(pool, position(true, 2n * SUI), OPENS), 0n);
});

test("losers, open pools and spent positions can claim nothing", () => {
  const pool = resolved(SUI, SUI);
  assert.equal(claimAmount(pool, position(false, SUI), OPENS), 0n);
  assert.equal(claimAmount({ ...pool, status: "open" }, position(true, SUI), OPENS), 0n);
  assert.equal(claimAmount(pool, position(true, SUI, true), OPENS), 0n);
});

test("a void pool refunds the stake on either side", () => {
  const pool: SettledPool = { status: "void", outcomeYes: false, yesTotal: 0n, noTotal: 0n, feeAmount: 0n, resolvedAtMs: 0n, challengeMs: CHALLENGE };
  assert.equal(claimAmount(pool, position(true, SUI), OPENS), SUI);
  assert.equal(claimAmount(pool, position(false, 2n * SUI), OPENS), 2n * SUI);
});

const poolFields = {
  id: ADDRESS,
  question_hash: new Array(32).fill(17),
  close_ms: 1_794_000_000_000n,
  fee_bps: 100n,
  min_resolve_delay_ms: 8_100_000n,
  challenge_ms: 21_600_000n,
  yes: { value: 5n },
  no: { value: 7n },
  positions: { id: OTHER, size: 2n },
  status: 1,
  outcome: true,
  fee_amount: 3n,
  fee_collected: false,
  yes_total: 5n,
  no_total: 7n,
  resolved_at_ms: 9n,
  evidence: Array.from(new TextEncoder().encode("Arsenal 2-1 Newcastle (ESPN, full time)")),
};

test("a pool reads back from its bytes", () => {
  assert.deepEqual(parsePool(PoolBcs.serialize(poolFields).toBytes()), {
    id: ADDRESS,
    questionHash: HASH,
    closeMs: 1_794_000_000_000n,
    feeBps: 100n,
    minResolveDelayMs: 8_100_000n,
    challengeMs: 21_600_000n,
    yes: 5n,
    no: 7n,
    positionsTableId: OTHER,
    stakers: 2n,
    status: "resolved",
    outcomeYes: true,
    feeAmount: 3n,
    feeCollected: false,
    yesTotal: 5n,
    noTotal: 7n,
    resolvedAtMs: 9n,
    evidence: "Arsenal 2-1 Newcastle (ESPN, full time)",
  });
});

test("an unknown pool status is an error, not a guess", () => {
  assert.throws(() => parsePool(PoolBcs.serialize({ ...poolFields, status: 9 }).toBytes()), /unknown pool status/);
});

test("claims wait for the challenge window, at the exact millisecond", () => {
  const pool = resolved(SUI, 0n);
  assert.equal(claimOpensAtMs(pool), OPENS);
  assert.equal(claimAmount(pool, position(true, SUI), OPENS - 1n), 0n);
  assert.equal(claimAmount(pool, position(true, SUI), OPENS), 990_000_000n);
});

test("the overturn window ends exactly when claims open", () => {
  const pool = resolved(SUI, 0n);
  assert.equal(inChallengeWindow(pool, OPENS - 1n), true);
  assert.equal(inChallengeWindow(pool, OPENS), false);
  assert.equal(inChallengeWindow({ ...pool, status: "void" }, RESOLVED_AT), false);
});

test("an overturned pool is told apart from a plain void, and refunds at once", () => {
  const overturned: SettledPool = { ...resolved(SUI, SUI), status: "void", feeAmount: 0n };
  assert.equal(wasOverturned(overturned), true);
  assert.equal(wasOverturned({ status: "void", resolvedAtMs: 0n }), false);
  assert.equal(wasOverturned({ status: "resolved", resolvedAtMs: 5n }), false);
  assert.equal(claimAmount(overturned, position(false, SUI), RESOLVED_AT), SUI);
});

test("the config and a position read back from their bytes", () => {
  const config = ConfigBcs.serialize({
    id: ADDRESS,
    treasury: OTHER,
    fee_bps: 100n,
    min_stake: 1n,
    max_stake_per_user: 2n,
    max_pool: 3n,
    refund_after_ms: 4n,
    min_resolve_delay_ms: 5n,
    challenge_ms: 6n,
    registry: { id: ADDRESS, size: 0n },
  }).toBytes();
  assert.deepEqual(parseConfig(config), { id: ADDRESS, treasury: OTHER, feeBps: 100n, minStake: 1n, maxStakePerUser: 2n, maxPool: 3n, refundAfterMs: 4n, minResolveDelayMs: 5n, challengeMs: 6n });
  assert.deepEqual(parsePosition(PositionBcs.serialize({ side: true, amount: 9n, claimed: false }).toBytes()), { side: true, amount: 9n, claimed: false });
});

const moveCall = (tx: ReturnType<typeof buildClaim>, index = 0) => tx.getData().commands[index].MoveCall!;

test("each builder targets the right function with the right arguments", () => {
  const cases: [ReturnType<typeof buildClaim>, string, number][] = [
    [buildCreatePool(IDS, { resolverCap: OTHER, questionHash: HASH, closeMs: 5n }), "create_pool", 5],
    [buildResolve(IDS, { resolverCap: OTHER, poolId: ADDRESS, outcomeYes: true, evidence: "smoke test" }), "resolve", 5],
    [buildClaim(IDS, { poolId: ADDRESS }), "claim", 2],
    [buildCollectFee(IDS, { poolId: ADDRESS }), "collect_fee", 3],
    [buildOverturn(IDS, { adminCap: OTHER, poolId: ADDRESS }), "overturn", 3],
    [buildSetDelays(IDS, { adminCap: OTHER, minResolveDelayMs: 0n, challengeMs: 60_000n }), "set_delays", 4],
  ];
  for (const [tx, name, count] of cases) {
    assert.equal(moveCall(tx).function, name);
    assert.equal(moveCall(tx).module, "pool");
    assert.equal(moveCall(tx).arguments.length, count, name);
  }
});

test("evidence is limited to 200 bytes, counted in UTF-8", () => {
  assert.doesNotThrow(() => buildResolve(IDS, { resolverCap: OTHER, poolId: ADDRESS, outcomeYes: true, evidence: "a".repeat(200) }));
  assert.throws(() => buildResolve(IDS, { resolverCap: OTHER, poolId: ADDRESS, outcomeYes: true, evidence: "a".repeat(201) }), /at most 200 bytes/);
  assert.throws(() => buildResolve(IDS, { resolverCap: OTHER, poolId: ADDRESS, outcomeYes: true, evidence: "é".repeat(101) }), /at most 200 bytes/);
});

test("a stake splits the amount from gas, then calls stake with it", () => {
  const tx = buildStake(IDS, { poolId: ADDRESS, side: true, amount: 100_000_000n, pickHash: HASH });
  const { commands } = tx.getData();
  assert.ok(commands[0].SplitCoins);
  assert.equal(commands[1].MoveCall!.function, "stake");
  assert.equal(commands[1].MoveCall!.arguments.length, 6);
});

test("hashes must be exactly 32 bytes", () => {
  assert.throws(() => buildCreatePool(IDS, { resolverCap: OTHER, questionHash: "abcd", closeMs: 5n }), /questionHash must be 32 bytes/);
  assert.throws(() => buildStake(IDS, { poolId: ADDRESS, side: true, amount: 1n, pickHash: "zz".repeat(32) }), /pickHash must be 32 bytes/);
});
