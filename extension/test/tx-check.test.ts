// The checker that stands between the Worker and the wallet. Every transaction here
// is real BCS, decoded the same way as production. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { Inputs, Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { STAKE_CONFIG, STAKE_PACKAGE } from "../src/config";
import { checkTransaction, type ExpectedTx } from "../src/tx-check";

const SENDER = `0x${"aa".repeat(32)}`;
const OTHER = `0x${"cc".repeat(32)}`;
const POOL = `0x${"bb".repeat(32)}`;
const HASH = "11".repeat(32);
const AMOUNT = 250_000_000n;
const CLOCK = "0x6";
const GAS = { objectId: `0x${"dd".repeat(32)}`, version: "1", digest: "11111111111111111111111111111111" };

const shared = (tx: Transaction, objectId: string, mutable = true) => tx.object(Inputs.SharedObjectRef({ objectId, initialSharedVersion: "1", mutable }));

async function finish(tx: Transaction, sender = SENDER, owner?: string): Promise<string> {
  tx.setSender(sender);
  tx.setGasBudget(20_000_000);
  tx.setGasPrice(1000);
  tx.setGasPayment([GAS]);
  if (owner) tx.setGasOwner(owner);
  return toBase64(await tx.build());
}

interface StakeShape {
  packageId?: string;
  module?: string;
  fn?: string;
  config?: string;
  pool?: string;
  side?: boolean;
  amount?: bigint;
  hash?: string;
  clock?: string;
  sender?: string;
  owner?: string;
  coinFromGas?: boolean;
  before?: (tx: Transaction) => void;
  after?: (tx: Transaction) => void;
  twoAmounts?: boolean;
}

function stakeTx(shape: StakeShape = {}): Promise<string> {
  const tx = new Transaction();
  shape.before?.(tx);
  const amounts = shape.twoAmounts ? [shape.amount ?? AMOUNT, 1n] : [shape.amount ?? AMOUNT];
  const [payment] = shape.coinFromGas === false ? tx.splitCoins(shared(tx, OTHER), amounts) : tx.splitCoins(tx.gas, amounts);
  tx.moveCall({
    target: `${shape.packageId ?? STAKE_PACKAGE}::${shape.module ?? "pool"}::${shape.fn ?? "stake"}`,
    arguments: [
      shared(tx, shape.config ?? STAKE_CONFIG, false),
      shared(tx, shape.pool ?? POOL),
      tx.pure.bool(shape.side ?? true),
      payment,
      tx.pure.vector("u8", Array(32).fill(0).map((_, i) => parseInt((shape.hash ?? HASH).slice(i * 2, i * 2 + 2), 16))),
      shared(tx, shape.clock ?? CLOCK, false),
    ],
  });
  shape.after?.(tx);
  return finish(tx, shape.sender, shape.owner);
}

function claimTx(shape: Pick<StakeShape, "packageId" | "fn" | "pool" | "sender" | "after" | "clock"> = {}): Promise<string> {
  const tx = new Transaction();
  tx.moveCall({
    target: `${shape.packageId ?? STAKE_PACKAGE}::pool::${shape.fn ?? "claim"}`,
    arguments: [shared(tx, shape.pool ?? POOL), shared(tx, shape.clock ?? CLOCK, false)],
  });
  shape.after?.(tx);
  return finish(tx, shape.sender);
}

const STAKE: ExpectedTx = { kind: "stake", poolId: POOL, side: true, amountMist: AMOUNT.toString() };
const CLAIM: ExpectedTx = { kind: "claim", poolId: POOL };

const refusedWith = (bytes: unknown, expected: ExpectedTx, pattern: RegExp, sender = SENDER): void => {
  const verdict = checkTransaction(bytes, expected, sender);
  assert.equal(verdict.ok, false, `expected a refusal matching ${pattern}`);
  if (!verdict.ok) assert.match(verdict.reason, pattern);
};

test("a correct stake passes", async () => {
  assert.deepEqual(checkTransaction(await stakeTx(), STAKE, SENDER), { ok: true });
});

test("a correct NO stake passes, and a pick hash can be pinned", async () => {
  assert.deepEqual(checkTransaction(await stakeTx({ side: false }), { ...STAKE, side: false } as ExpectedTx, SENDER), { ok: true });
  assert.deepEqual(checkTransaction(await stakeTx(), { ...STAKE, pickHash: HASH } as ExpectedTx, SENDER), { ok: true });
});

test("a correct claim passes", async () => {
  assert.deepEqual(checkTransaction(await claimTx(), CLAIM, SENDER), { ok: true });
});

const tamperedStakes: [string, StakeShape, RegExp][] = [
  ["another package", { packageId: OTHER }, /not Soothia's/],
  ["another module", { module: "vault" }, /other than stake/],
  ["another function", { fn: "stake_all" }, /other than stake/],
  ["another config", { config: OTHER }, /different config/],
  ["another pool", { pool: OTHER }, /different pool/],
  ["the other side", { side: false }, /other side/],
  ["a larger amount", { amount: AMOUNT + 1n }, /amount differs/],
  ["a smaller amount", { amount: AMOUNT - 1n }, /amount differs/],
  ["a coin not from gas", { coinFromGas: false }, /your SUI balance/],
  ["two split amounts", { twoAmounts: true }, /more than one coin/],
  ["a different sender", { sender: OTHER }, /different address/],
  ["someone else's gas", { owner: OTHER }, /else would pay/],
  ["a fake clock", { clock: OTHER }, /Sui clock/],
  ["an extra transfer after", { after: (tx) => tx.transferObjects([tx.gas], OTHER) }, /more than split/],
  ["an extra call before", { before: (tx) => tx.moveCall({ target: `${OTHER}::x::y` }) }, /more than split/],
];

for (const [name, shape, pattern] of tamperedStakes) {
  test(`a stake is refused with ${name}`, async () => {
    refusedWith(await stakeTx(shape), STAKE, pattern);
  });
}

test("a stake tied to another call is refused when the hash is pinned", async () => {
  refusedWith(await stakeTx({ hash: "22".repeat(32) }), { ...STAKE, pickHash: HASH } as ExpectedTx, /different call/);
});

test("a stake that spends a different coin than the split is refused", async () => {
  const tx = new Transaction();
  tx.splitCoins(tx.gas, [AMOUNT]);
  tx.moveCall({
    target: `${STAKE_PACKAGE}::pool::stake`,
    arguments: [shared(tx, STAKE_CONFIG, false), shared(tx, POOL), tx.pure.bool(true), tx.gas, tx.pure.vector("u8", Array(32).fill(17)), shared(tx, CLOCK, false)],
  });
  refusedWith(await finish(tx), STAKE, /split coin/);
});

test("the two steps must be in order", async () => {
  const tx = new Transaction();
  tx.moveCall({ target: `${STAKE_PACKAGE}::pool::stake` });
  tx.splitCoins(tx.gas, [AMOUNT]);
  refusedWith(await finish(tx), STAKE, /not a coin split/);
});

test("an extra input nobody uses is refused", async () => {
  const tx = new Transaction();
  const [payment] = tx.splitCoins(tx.gas, [AMOUNT]);
  const args = [shared(tx, STAKE_CONFIG, false), shared(tx, POOL), tx.pure.bool(true), payment, tx.pure.vector("u8", Array(32).fill(17)), shared(tx, CLOCK, false)];
  tx.moveCall({ target: `${STAKE_PACKAGE}::pool::stake`, arguments: args });
  tx.pure.u64(9n);
  refusedWith(await finish(tx), STAKE, /extra inputs/);
});

const tamperedClaims: [string, Parameters<typeof claimTx>[0], RegExp][] = [
  ["another package", { packageId: OTHER }, /not Soothia's/],
  ["another function", { fn: "stake" }, /other than claim/],
  ["another pool", { pool: OTHER }, /different pool/],
  ["a different sender", { sender: OTHER }, /different address/],
  ["a fake clock", { clock: OTHER }, /Sui clock/],
  ["an extra step", { after: (tx) => tx.transferObjects([tx.gas], OTHER) }, /more than claim/],
];

for (const [name, shape, pattern] of tamperedClaims) {
  test(`a claim is refused with ${name}`, async () => {
    refusedWith(await claimTx(shape), CLAIM, pattern);
  });
}

test("a stake transaction cannot pass as a claim, or the reverse", async () => {
  refusedWith(await stakeTx(), CLAIM, /more than claim/);
  refusedWith(await claimTx(), STAKE, /more than split/);
});

test("an address in another format still matches", async () => {
  assert.deepEqual(checkTransaction(await stakeTx(), STAKE, SENDER.toUpperCase().replace("0X", "0x")), { ok: true });
});

test("things that are not transactions are refused without throwing", async () => {
  const json = await new Transaction().toJSON();
  for (const bytes of [json, "", "not base64!", "AAAA", 7, null, undefined]) refusedWith(bytes, STAKE, /refused/);
});

test("an unknown kind is refused", async () => {
  refusedWith(await stakeTx(), { kind: "transfer" } as unknown as ExpectedTx, /Unknown transaction type/);
});
