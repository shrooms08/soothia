// Soothia staking helpers, without a network. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { claimAmount, feeOn, winnerPayout, type SettledPool } from "../src/stake/math";
import { ConfigBcs, parseConfig, parsePool, parsePosition, PoolBcs, PositionBcs } from "../src/stake/readers";
import { buildClaim, buildCreatePool, buildResolve, buildStake } from "../src/stake/transactions";

const SUI = 1_000_000_000n;
const U64_MAX = 18_446_744_073_709_551_615n;
const ADDRESS = `0x${"ab".repeat(32)}`;
const OTHER = `0x${"cd".repeat(32)}`;
const HASH = "11".repeat(32);
const IDS = { packageId: `0x${"01".repeat(32)}`, configId: ADDRESS };

const resolved = (yesTotal: bigint, noTotal: bigint, feeBps = 100n, outcomeYes = true): SettledPool => ({
  status: "resolved",
  outcomeYes,
  yesTotal,
  noTotal,
  feeTaken: feeOn(yesTotal + noTotal, feeBps),
});
const position = (side: boolean, amount: bigint, claimed = false) => ({ side, amount, claimed });

test("the fee is the pot times basis points, rounded down", () => {
  assert.equal(feeOn(6n * SUI, 100n), 60_000_000n);
  assert.equal(feeOn(99n, 100n), 0n);
  assert.equal(feeOn(100n, 100n), 1n);
});

test("three stakers are paid the same as the contract's happy path", () => {
  const pool = resolved(4n * SUI, 2n * SUI);
  assert.equal(claimAmount(pool, position(true, SUI)), 1_485_000_000n);
  assert.equal(claimAmount(pool, position(true, 3n * SUI)), 4_455_000_000n);
});

test("a single staker gets their stake back less the fee", () => {
  const stake = 100_000_000n;
  assert.equal(claimAmount(resolved(stake, 0n), position(true, stake)), 99_000_000n);
});

test("payouts round down and never exceed the net pot", () => {
  const stakes = [100_000_001n, 100_000_002n, 100_000_004n];
  const yesTotal = stakes.reduce((sum, value) => sum + value, 0n);
  const pool = resolved(yesTotal, 333_333_337n);
  const net = yesTotal + 333_333_337n - pool.feeTaken;
  const paid = stakes.reduce((sum, value) => sum + claimAmount(pool, position(true, value)), 0n);
  assert.ok(paid <= net);
  assert.ok(net - paid < BigInt(stakes.length));
});

test("the math does not lose precision near the top of u64", () => {
  assert.equal(winnerPayout(U64_MAX, U64_MAX, U64_MAX), U64_MAX);
});

test("a NO outcome pays the NO side", () => {
  const pool = resolved(2n * SUI, SUI, 100n, false);
  assert.equal(claimAmount(pool, position(false, SUI)), 2_970_000_000n);
  assert.equal(claimAmount(pool, position(true, 2n * SUI)), 0n);
});

test("losers, open pools and spent positions can claim nothing", () => {
  const pool = resolved(SUI, SUI);
  assert.equal(claimAmount(pool, position(false, SUI)), 0n);
  assert.equal(claimAmount({ ...pool, status: "open" }, position(true, SUI)), 0n);
  assert.equal(claimAmount(pool, position(true, SUI, true)), 0n);
});

test("a void pool refunds the stake on either side", () => {
  const pool: SettledPool = { status: "void", outcomeYes: false, yesTotal: 0n, noTotal: 0n, feeTaken: 0n };
  assert.equal(claimAmount(pool, position(true, SUI)), SUI);
  assert.equal(claimAmount(pool, position(false, 2n * SUI)), 2n * SUI);
});

test("a pool reads back from its bytes", () => {
  const bytes = PoolBcs.serialize({
    id: ADDRESS,
    question_hash: new Array(32).fill(17),
    close_ms: 1_794_000_000_000n,
    yes: { value: 5n },
    no: { value: 7n },
    positions: { id: OTHER, size: 2n },
    status: 1,
    outcome: true,
    fee_taken: 3n,
    yes_total: 5n,
    no_total: 7n,
  }).toBytes();
  assert.deepEqual(parsePool(bytes), {
    id: ADDRESS,
    questionHash: HASH,
    closeMs: 1_794_000_000_000n,
    yes: 5n,
    no: 7n,
    positionsTableId: OTHER,
    stakers: 2n,
    status: "resolved",
    outcomeYes: true,
    feeTaken: 3n,
    yesTotal: 5n,
    noTotal: 7n,
  });
});

test("an unknown pool status is an error, not a guess", () => {
  const bytes = PoolBcs.serialize({
    id: ADDRESS,
    question_hash: [],
    close_ms: 0n,
    yes: { value: 0n },
    no: { value: 0n },
    positions: { id: OTHER, size: 0n },
    status: 9,
    outcome: false,
    fee_taken: 0n,
    yes_total: 0n,
    no_total: 0n,
  }).toBytes();
  assert.throws(() => parsePool(bytes), /unknown pool status/);
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
    registry: { id: ADDRESS, size: 0n },
  }).toBytes();
  assert.deepEqual(parseConfig(config), { id: ADDRESS, treasury: OTHER, feeBps: 100n, minStake: 1n, maxStakePerUser: 2n, maxPool: 3n, refundAfterMs: 4n });
  assert.deepEqual(parsePosition(PositionBcs.serialize({ side: true, amount: 9n, claimed: false }).toBytes()), { side: true, amount: 9n, claimed: false });
});

const moveCall = (tx: ReturnType<typeof buildClaim>, index = 0) => tx.getData().commands[index].MoveCall!;

test("each builder targets the right function", () => {
  const create = buildCreatePool(IDS, { resolverCap: OTHER, questionHash: HASH, closeMs: 5n });
  assert.equal(moveCall(create).function, "create_pool");
  assert.equal(moveCall(create).module, "pool");
  assert.equal(moveCall(create).arguments.length, 5);
  const resolve = buildResolve(IDS, { resolverCap: OTHER, poolId: ADDRESS, outcomeYes: true });
  assert.equal(moveCall(resolve).function, "resolve");
  assert.equal(moveCall(resolve).arguments.length, 5);
  const claim = buildClaim(IDS, { poolId: ADDRESS });
  assert.equal(moveCall(claim).function, "claim");
  assert.equal(moveCall(claim).arguments.length, 1);
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
