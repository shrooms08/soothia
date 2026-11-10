// The x402 flow, with real transaction bytes and a faked chain, KV and memory.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { Inputs, Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import type { Env } from "../src/http";
import { userKeyFor, type RecallStore } from "../src/recall/memory";
import type { UnlockRecord } from "../src/recall/records";
import type { Executed, PayChain } from "../src/premium/chain";
import { ASSET, NETWORK, paymentKey, premiumRoute } from "../src/premium/routes";
import { checkPayment, checkWithdrawal } from "../src/premium/verify";
import { clearMemoryCache } from "../src/store";

const addr = (char: string): string => `0x${char.repeat(64)}`;
const PACKAGE = addr("1");
const CONFIG = addr("2");
const SELLER = addr("a");
const BUYER = addr("b");
const OTHER = addr("c");
const NONCE = "00112233445566778899aabbccddeeff";
const PRICE = "20000000";
const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const INSTALL = "12345678-1234-1234-1234-123456789abc";
const SETTINGS = { packageId: PACKAGE, configId: CONFIG };
const EXPECTED = { ...SETTINGS, nonce: NONCE, payTo: SELLER, priceMist: PRICE };

interface Shape {
  sender?: string;
  gasOwner?: string;
  amount?: bigint;
  packageId?: string;
  module?: string;
  fn?: string;
  config?: string;
  nonce?: string;
  payTo?: string;
  extra?: (tx: Transaction) => void;
  owned?: boolean;
  coinFromGas?: boolean;
}

const hexBytes = (hex: string): number[] => hex.match(/../g)!.map((pair) => parseInt(pair, 16));

async function payment(shape: Shape = {}): Promise<string> {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [shape.amount ?? BigInt(PRICE)]);
  const config = shape.config ?? CONFIG;
  tx.moveCall({
    target: `${shape.packageId ?? PACKAGE}::${shape.module ?? "pay"}::${shape.fn ?? "pay"}`,
    arguments: [
      shape.owned
        ? tx.object(Inputs.ObjectRef({ objectId: config, version: "1", digest: "11111111111111111111111111111111" }))
        : tx.object(Inputs.SharedObjectRef({ objectId: config, initialSharedVersion: "1", mutable: true })),
      tx.pure.vector("u8", hexBytes(shape.nonce ?? NONCE)),
      tx.pure.address(shape.payTo ?? SELLER),
      shape.coinFromGas ? tx.gas : coin,
    ],
  });
  shape.extra?.(tx);
  return finish(tx, shape.sender ?? BUYER, shape.gasOwner);
}

async function finish(tx: Transaction, sender: string, gasOwner?: string): Promise<string> {
  tx.setSender(sender);
  if (gasOwner) tx.setGasOwner(gasOwner);
  tx.setGasPrice(1000);
  tx.setGasBudget(10_000_000);
  tx.setGasPayment([{ objectId: addr("9"), version: "1", digest: "11111111111111111111111111111111" }]);
  return toBase64(await tx.build());
}

function harness(options: { proof?: boolean; profile?: boolean } = {}) {
  const data = new Map<string, string>();
  const kv = {
    get: async (key: string, type?: string) => {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => void data.set(key, value),
    delete: async (key: string) => void data.delete(key),
  };
  const env = { SOOTHIA_CACHE: kv } as unknown as Env;
  const item = {
    pickId: "p1",
    fixture: { home: "Newcastle", away: "Arsenal", competition: "Premier League", startISO: KICKOFF, subject: "away" },
    lean: "Arsenal win",
    side: "YES",
    confidence: 70,
    at: "2026-11-09T10:00:00.000Z",
    premium: { priceMist: PRICE },
    ...(options.proof === false ? {} : { proof: { digest: "D1", url: "https://suivision.xyz/txblock/D1" } }),
  };
  data.set(
    "premium:p1",
    JSON.stringify({
      pickId: "p1",
      handle: "ada",
      payTo: SELLER,
      userKey: "seller-key",
      priceMist: PRICE,
      kickoffMs: Date.parse(KICKOFF),
      item,
    }),
  );
  if (options.profile !== false)
    data.set(
      "profile:ada",
      JSON.stringify({
        handle: "ada",
        address: SELLER,
        userKey: "seller-key",
        publicSince: "2026-01-01T00:00:00.000Z",
        shareHistory: true,
      }),
    );

  const executed: { transaction: string; signature: string }[] = [];
  const memories: UnlockRecord[] = [];
  let result = (): Executed => ({
    digest: "DIGEST",
    succeeded: true,
    paid: [{ nonce: currentNonce(), payer: BUYER, recipient: SELLER, amount: BigInt(PRICE), fee: 2_000_000n }],
  });
  let nonceForPaid = NONCE;
  const currentNonce = () => nonceForPaid;
  const built: unknown[][] = [];
  const chain: PayChain = {
    balanceOf: async () => 123n,
    buildPayment: async (...args) => (built.push(["payment", ...args]), "BUILT"),
    buildFunding: async (...args) => (built.push(["funding", ...args]), "FUNDED"),
    buildWithdrawAll: async (...args) => (built.push(["withdraw", ...args]), "WITHDRAWN"),
    execute: async (transaction, signature) => (executed.push({ transaction, signature }), result()),
  };
  const store = {
    write: async (_kind: string, record: UnlockRecord) => (memories.push(record), { jobId: "j" }),
  } as unknown as RecallStore;
  const call = async (
    method: string,
    path: string,
    options2: { headers?: Record<string, string>; body?: unknown; now?: number } = {},
  ) => {
    const response = await premiumRoute(
      new Request(`https://api.soothia.fun${path}`, {
        method,
        headers: { "X-Soothia-Install": INSTALL, ...options2.headers },
        ...(options2.body === undefined ? {} : { body: JSON.stringify(options2.body) }),
      }),
      env,
      path.split("?")[0],
      { chain, settings: SETTINGS, store: () => store, now: () => options2.now ?? NOW },
    );
    return { status: response.status, headers: response.headers, body: (await response.json()) as Record<string, any> };
  };
  return {
    data,
    executed,
    memories,
    built,
    call,
    setResult: (fn: () => Executed) => (result = fn),
    setPaidNonce: (nonce: string) => (nonceForPaid = nonce),
  };
}

const decodeHeader = (value: string | null): Record<string, any> => JSON.parse(atob(value!));

/** Asks for the call, then signs a transaction that matches the quote. */
async function pay(
  h: ReturnType<typeof harness>,
  shape: Shape = {},
  accepted?: (entry: Record<string, any>) => Record<string, any>,
) {
  const required = decodeHeader((await h.call("GET", "/premium/call/p1")).headers.get("PAYMENT-REQUIRED"));
  const quoted = required.accepts[0];
  h.setPaidNonce(quoted.extra.nonce);
  const transaction = await payment({ nonce: quoted.extra.nonce, ...shape });
  const header = btoa(
    JSON.stringify({
      x402Version: 2,
      resource: required.resource,
      accepted: accepted ? accepted(quoted) : quoted,
      payload: { signature: "c2lnbmF0dXJl", transaction },
    }),
  );
  return h.call("GET", "/premium/call/p1", { headers: { "PAYMENT-SIGNATURE": header } });
}

beforeEach(() => clearMemoryCache());

test("no payment gets a 402 in the spec's format, and no sign of the call", async () => {
  const h = harness();
  const { status, headers, body } = await h.call("GET", "/premium/call/p1");
  assert.equal(status, 402);
  assert.deepEqual(body, { error: "payment_required" });
  const required = decodeHeader(headers.get("PAYMENT-REQUIRED"));
  assert.equal(required.x402Version, 2);
  assert.deepEqual(required.resource, {
    url: "https://api.soothia.fun/premium/call/p1",
    description: "Premium call by @ada",
    mimeType: "application/json",
  });
  const [entry] = required.accepts;
  assert.deepEqual(
    { ...entry, extra: { ...entry.extra, nonce: "" } },
    {
      scheme: "exact",
      network: "sui:mainnet",
      amount: PRICE,
      asset: "0x2::sui::SUI",
      payTo: SELLER,
      maxTimeoutSeconds: 300,
      extra: { payPackage: PACKAGE, payConfig: CONFIG, nonce: "" },
    },
  );
  assert.match(entry.extra.nonce, /^[0-9a-f]{32}$/);
  assert.equal(ASSET, entry.asset);
  assert.equal(NETWORK, entry.network);
  assert.equal(JSON.stringify({ body, required }).includes("Arsenal win"), false);
});

test("the quote is stored for this buyer and reused, not written again", async () => {
  const h = harness();
  const first = decodeHeader((await h.call("GET", "/premium/call/p1")).headers.get("PAYMENT-REQUIRED"));
  const stored = JSON.parse(h.data.get(paymentKey(await userKeyFor(INSTALL), "p1"))!);
  assert.equal(stored.nonce, first.accepts[0].extra.nonce);
  assert.equal(stored.pickId, "p1");
  assert.equal(stored.priceMist, PRICE);
  assert.equal(stored.payTo, SELLER);
  assert.equal(stored.userKey, await userKeyFor(INSTALL));
  const second = decodeHeader((await h.call("GET", "/premium/call/p1")).headers.get("PAYMENT-REQUIRED"));
  assert.equal(second.accepts[0].extra.nonce, first.accepts[0].extra.nonce);
});

test("the seller, and anyone after kickoff, sees the call free", async () => {
  const owner = harness();
  owner.data.set("premium:p1", owner.data.get("premium:p1")!.replace("seller-key", await userKeyFor(INSTALL)));
  const mine = await owner.call("GET", "/premium/call/p1");
  assert.equal(mine.status, 200);
  assert.equal(mine.body.access, "owner");
  assert.equal(mine.body.call.lean, "Arsenal win");
  const after = await harness().call("GET", "/premium/call/p1", { now: Date.parse(KICKOFF) });
  assert.equal(after.status, 200);
  assert.equal(after.body.access, "kickoff");
});

test("a good payment is broadcast, recorded, and answered with the call and the digest", async () => {
  const h = harness();
  const { status, headers, body } = await pay(h);
  assert.equal(status, 200);
  assert.equal(body.call.lean, "Arsenal win");
  assert.equal(body.call.confidence, 70);
  assert.equal(body.handle, "ada");
  assert.deepEqual(body.receipt, {
    digest: "DIGEST",
    priceMist: PRICE,
    at: new Date(NOW).toISOString(),
    url: "https://suivision.xyz/txblock/DIGEST",
  });
  assert.deepEqual(decodeHeader(headers.get("PAYMENT-RESPONSE")), {
    success: true,
    transaction: "DIGEST",
    network: "sui:mainnet",
    payer: BUYER,
  });
  assert.equal(h.executed.length, 1);
  assert.equal(h.executed[0].signature, "c2lnbmF0dXJl");

  const key = await userKeyFor(INSTALL);
  assert.deepEqual(JSON.parse(h.data.get(`unlock:${key}:p1`)!), {
    digest: "DIGEST",
    priceMist: PRICE,
    at: new Date(NOW).toISOString(),
  });
  assert.equal(JSON.parse(h.data.get(paymentKey(key, "p1"))!).consumed, true);
  assert.deepEqual(JSON.parse(h.data.get(`earnings:${SELLER}`)!), { totalMist: "18000000", unlocks: 1 });
  assert.equal(h.memories.length, 1);
  assert.equal(h.memories[0].pickId, "p1");
  assert.equal(h.memories[0].handle, "ada");
  assert.equal(h.memories[0].priceMist, PRICE);
  assert.equal(h.memories[0].digest, "DIGEST");
});

test("re-opening a bought call is free, with its receipt", async () => {
  const h = harness();
  await pay(h);
  const again = await h.call("GET", "/premium/call/p1");
  assert.equal(again.status, 200);
  assert.equal(again.body.access, "unlocked");
  assert.equal(again.body.receipt.digest, "DIGEST");
  assert.equal(h.executed.length, 1);
});

test("earnings add up across buyers", async () => {
  const h = harness();
  h.data.set(`earnings:${SELLER}`, JSON.stringify({ totalMist: "9000000", unlocks: 1 }));
  await pay(h);
  assert.deepEqual(JSON.parse(h.data.get(`earnings:${SELLER}`)!), { totalMist: "27000000", unlocks: 2 });
});

test("a replayed payment is refused and not broadcast again", async () => {
  const h = harness();
  const required = decodeHeader((await h.call("GET", "/premium/call/p1")).headers.get("PAYMENT-REQUIRED"));
  const quoted = required.accepts[0];
  h.setPaidNonce(quoted.extra.nonce);
  const transaction = await payment({ nonce: quoted.extra.nonce });
  const header = btoa(
    JSON.stringify({ x402Version: 2, accepted: quoted, payload: { signature: "c2lnbmF0dXJl", transaction } }),
  );
  assert.equal((await h.call("GET", "/premium/call/p1", { headers: { "PAYMENT-SIGNATURE": header } })).status, 200);
  // Taking away the unlock forces the replay all the way to the nonce check.
  h.data.delete(`unlock:${await userKeyFor(INSTALL)}:p1`);
  const replay = await h.call("GET", "/premium/call/p1", { headers: { "PAYMENT-SIGNATURE": header } });
  assert.equal(replay.status, 402);
  assert.equal(replay.body.reason, "nonce_used");
  assert.equal(decodeHeader(replay.headers.get("PAYMENT-RESPONSE")).success, false);
  assert.equal(h.executed.length, 1);
});

test("a payment with no quote on file is refused", async () => {
  const h = harness();
  const header = btoa(
    JSON.stringify({
      x402Version: 2,
      accepted: {},
      payload: { signature: "c2lnbmF0dXJl", transaction: await payment() },
    }),
  );
  const { status, body } = await h.call("GET", "/premium/call/p1", { headers: { "PAYMENT-SIGNATURE": header } });
  assert.equal(status, 402);
  assert.equal(body.reason, "nonce_expired");
});

const refusals: [string, Shape, string][] = [
  ["a lower amount", { amount: 19_999_999n }, "wrong_amount"],
  ["a higher amount", { amount: 20_000_001n }, "wrong_amount"],
  ["a different recipient", { payTo: OTHER }, "wrong_recipient"],
  ["a different nonce", { nonce: "ffffffffffffffffffffffffffffffff" }, "wrong_nonce"],
  ["a different package", { packageId: addr("3") }, "wrong_package"],
  ["a different module", { module: "other" }, "wrong_function"],
  ["a different function", { fn: "steal" }, "wrong_function"],
  ["a different config", { config: addr("4") }, "wrong_config"],
  ["an owned object as the config", { owned: true }, "wrong_config"],
  ["the gas coin itself as the payment", { coinFromGas: true }, "wrong_coin"],
  ["someone else paying gas", { gasOwner: OTHER }, "sponsored_gas"],
  [
    "an extra command",
    { extra: (tx) => void tx.transferObjects([tx.splitCoins(tx.gas, [1n])[0]], OTHER) },
    "wrong_commands",
  ],
];

for (const [name, shape, code] of refusals) {
  test(`refused: ${name}`, async () => {
    assert.deepEqual(checkPayment(await payment({ ...shape }), EXPECTED), { ok: false, code });
    const h = harness();
    const { status, body } = await pay(h, shape);
    assert.equal(status, 402);
    assert.equal(body.reason, code);
    assert.equal(h.executed.length, 0);
    assert.equal(h.data.has(`unlock:${await userKeyFor(INSTALL)}:p1`), false);
  });
}

test("the checker passes the real shape and names its sender", async () => {
  assert.deepEqual(checkPayment(await payment(), EXPECTED), { ok: true, sender: BUYER });
});

test("JSON or junk is not a transaction", () => {
  for (const bad of ['{"version":2}', "", null, 5, "AAAA"]) assert.equal(checkPayment(bad, EXPECTED).ok, false);
});

test("the signed header must repeat exactly what was quoted", async () => {
  for (const change of [
    { amount: "1" },
    { payTo: OTHER },
    { network: "sui:testnet" },
    { asset: "0x2::foo::FOO" },
    { scheme: "upto" },
  ]) {
    const h = harness();
    const { status, body } = await pay(h, {}, (entry) => ({ ...entry, ...change }));
    assert.equal(status, 402);
    assert.equal(body.reason, "requirements_mismatch");
    assert.equal(h.executed.length, 0);
  }
  const h = harness();
  const { body } = await pay(h, {}, (entry) => ({ ...entry, extra: { ...entry.extra, payPackage: addr("3") } }));
  assert.equal(body.reason, "requirements_mismatch");
});

test("a transaction that fails on chain unlocks nothing and can be tried again", async () => {
  const h = harness();
  h.setResult(() => ({ digest: "FAILED", succeeded: false, paid: [] }));
  const failed = await pay(h);
  assert.equal(failed.status, 402);
  assert.equal(failed.body.reason, "transaction_failed");
  const key = await userKeyFor(INSTALL);
  assert.equal(h.data.has(`unlock:${key}:p1`), false);
  assert.equal(JSON.parse(h.data.get(paymentKey(key, "p1"))!).consumed, undefined);
  h.setResult(() => ({
    digest: "DIGEST",
    succeeded: true,
    paid: [
      {
        nonce: JSON.parse(h.data.get(paymentKey(key, "p1"))!).nonce,
        payer: BUYER,
        recipient: SELLER,
        amount: BigInt(PRICE),
        fee: 2_000_000n,
      },
    ],
  }));
  assert.equal((await pay(h)).status, 200);
});

test("a success without the right Paid event unlocks nothing", async () => {
  for (const paid of [[], [{ nonce: "aa", payer: BUYER, recipient: SELLER, amount: BigInt(PRICE), fee: 0n }]]) {
    const h = harness();
    h.setResult(() => ({ digest: "D", succeeded: true, paid }));
    const { status, body } = await pay(h);
    assert.equal(status, 402);
    assert.equal(body.reason, "no_payment_event");
    assert.equal(h.data.has(`unlock:${await userKeyFor(INSTALL)}:p1`), false);
  }
});

test("a call with no proof, or a caller gone private, can't be bought", async () => {
  assert.deepEqual((await harness({ proof: false }).call("GET", "/premium/call/p1")).body, {
    error: "premium_no_proof",
  });
  const gone = await harness({ profile: false }).call("GET", "/premium/call/p1");
  assert.equal(gone.status, 410);
});

test("an unknown call is 404, and an odd id is 400", async () => {
  const h = harness();
  assert.equal((await h.call("GET", "/premium/call/nope")).status, 404);
  assert.equal((await h.call("GET", "/premium/call/a%20b")).status, 400);
});

test("the call route needs an install id", async () => {
  const h = harness();
  const response = await premiumRoute(
    new Request("https://x/premium/call/p1"),
    { SOOTHIA_CACHE: {} } as unknown as Env,
    "/premium/call/p1",
    { chain: {} as PayChain, settings: SETTINGS },
  );
  assert.equal(response.status, 400);
  assert.equal(h.executed.length, 0);
});

test("building a payment uses the quote, not the client's numbers", async () => {
  const h = harness();
  await h.call("GET", "/premium/call/p1");
  const stored = JSON.parse(h.data.get(paymentKey(await userKeyFor(INSTALL), "p1"))!);
  const { body } = await h.call("POST", "/premium/build", { body: { pickId: "p1", sender: BUYER } });
  assert.deepEqual(body, { transaction: "BUILT" });
  assert.deepEqual(h.built[0], ["payment", BUYER, stored.nonce, SELLER, BigInt(PRICE)]);
  assert.equal((await h.call("POST", "/premium/build", { body: { pickId: "other", sender: BUYER } })).status, 404);
  assert.equal(
    (await h.call("POST", "/premium/build", { body: { pickId: "p1", sender: "nope" } })).body.error,
    "invalid_sender",
  );
});

test("funding and withdrawing build the right transfer", async () => {
  const h = harness();
  assert.deepEqual(
    (
      await h.call("POST", "/premium/transfer/build", {
        body: { sender: BUYER, recipient: OTHER, amountMist: "50000000" },
      })
    ).body,
    { transaction: "FUNDED" },
  );
  assert.deepEqual(h.built[0], ["funding", BUYER, OTHER, 50_000_000n]);
  assert.deepEqual(
    (await h.call("POST", "/premium/transfer/build", { body: { sender: OTHER, recipient: BUYER } })).body,
    { transaction: "WITHDRAWN" },
  );
  assert.deepEqual(h.built[1], ["withdraw", OTHER, BUYER]);
  assert.equal(
    (await h.call("POST", "/premium/transfer/build", { body: { sender: BUYER, recipient: OTHER, amountMist: "1" } }))
      .body.error,
    "invalid_amount",
  );
  assert.equal(
    (await h.call("POST", "/premium/transfer/build", { body: { sender: BUYER, recipient: "x" } })).body.error,
    "invalid_recipient",
  );
});

async function withdrawal(): Promise<string> {
  const tx = new Transaction();
  tx.transferObjects([tx.gas], BUYER);
  return finish(tx, OTHER);
}

test("only a withdrawal of the whole gas coin is relayed", async () => {
  const h = harness();
  const good = await withdrawal();
  assert.deepEqual(checkWithdrawal(good), { ok: true, sender: OTHER });
  assert.equal(
    (await h.call("POST", "/premium/transfer/execute", { body: { transaction: good, signature: "c2ln" } })).body.digest,
    "DIGEST",
  );
  assert.equal(h.executed.length, 1);

  const partial = new Transaction();
  partial.transferObjects([partial.splitCoins(partial.gas, [5n])[0]], BUYER);
  const refused = await h.call("POST", "/premium/transfer/execute", {
    body: { transaction: await finish(partial, OTHER), signature: "c2ln" },
  });
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error, "wrong_commands");
  assert.equal(
    (await h.call("POST", "/premium/transfer/execute", { body: { transaction: await payment(), signature: "c2ln" } }))
      .status,
    400,
  );
  assert.equal(h.executed.length, 1);
});

test("a balance is read for a valid address only", async () => {
  const h = harness();
  assert.deepEqual((await h.call("GET", `/premium/balance?address=${BUYER}`)).body, { balanceMist: "123" });
  assert.equal((await h.call("GET", "/premium/balance?address=nope")).status, 400);
});

test("without the ids the routes say so", async () => {
  const response = await premiumRoute(
    new Request("https://x/premium/eligible"),
    { SOOTHIA_CACHE: {} } as unknown as Env,
    "/premium/eligible",
  );
  assert.equal(response.status, 503);
});
