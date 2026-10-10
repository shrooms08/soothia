// Solana Actions handlers with a fake Panta, fake RPC and fake KV. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ACTION_HEADERS,
  bettingOpen,
  describe,
  friendlyPantaError,
  handleActionConfirm,
  handleActionGet,
  handleActionPost,
  handleActionQuote,
  handleTxSend,
  handleTxStatus,
  type ActionDeps,
} from "../src/actions";
import { RpcError } from "../src/rpc";
import type { BuyRecord, BuyStatus, MarketBrief } from "../src/buy";
import { encodeBase58 } from "../src/base58";

const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const WALLET = "BCMmCN6PPN4LaZjoWLvufmCaHYZE5PEaU3hHzYqeorne";
const OTHER = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SIGNATURE = encodeBase58(new Uint8Array(64).fill(9));
const BASE = `https://proxy.test/api/actions/market/${MARKET}`;
const TX = btoa(String.fromCharCode(...new Uint8Array(700).fill(1)));

const brief: MarketBrief = {
  title: "Will BTC reach a new all-time high by December 31, 2026?",
  category: "crypto",
  phase: "primary",
  marketType: "breaking",
  yesPrice: 0.501663897,
  noPrice: 0.498336103,
  endTime: "2027-01-01T00:00:00.000Z",
  primaryPhaseEnd: new Date(Date.now() + 86_400_000).toISOString(),
  liquidity: null,
};

interface Fake {
  deps: ActionDeps;
  store: Map<string, BuyRecord>;
  calls: string[];
  finishResult: BuyStatus;
}

function fake(overrides: Partial<ActionDeps> = {}, briefValue: MarketBrief | null = brief): Fake {
  const store = new Map<string, BuyRecord>();
  const calls: string[] = [];
  const finishResult: BuyStatus = {
    signature: SIGNATURE, status: "confirmed", confirmed: true, submitted: true, verified: "confirmed", attributed: true, errors: {},
    marketUrl: `https://www.panta.market/market/${MARKET}`,
  };
  const fakeDeps: Fake = {
    store,
    calls,
    finishResult,
    deps: {
      brief: async () => briefValue,
      quote: async (wallet, marketId, side, amountUsdc) => {
        calls.push(`quote ${wallet} ${marketId} ${side} ${amountUsdc}`);
        return { ok: true, data: { quoteId: "qt_1", shares: "1.996677", feeUsdc: "0.02", amountUsdc, expiresAt: "soon" } };
      },
      displayQuote: async (marketId, side, amountUsdc) => {
        calls.push(`quote 11111111111111111111111111111111 ${marketId} ${side} ${amountUsdc}`);
        return { ok: true, data: { quoteId: "qt_display", shares: "1.996677", feeUsdc: "0.02", amountUsdc, expiresAt: "soon" } };
      },
      build: async (quoteId, wallet) => {
        calls.push(`build ${quoteId} ${wallet}`);
        return { ok: true, data: { orderId: "ord_1", instructions: [{ programId: OTHER, data: "", accounts: [] }], expectedShares: "1.996677" } };
      },
      assemble: async () => ({ txBase64: TX }),
      load: async (id) => store.get(id) ?? null,
      save: async (id, record) => { store.set(id, record); },
      finish: async (record, signature) => {
        calls.push(`finish ${record.orderId} ${signature}`);
        return fakeDeps.finishResult;
      },
      background: () => {},
      send: async () => {},
      status: async () => ({ state: "confirmed" as const }),
      ...overrides,
    },
  };
  return fakeDeps;
}

const get = (url = BASE) => new Request(url, { method: "GET" });
const post = (url: string, body: unknown) => new Request(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

test("GET returns the spec shape with four fixed buttons, two custom ones, and the action headers", async () => {
  const response = await handleActionGet(get(), fake().deps, MARKET);
  assert.equal(response.status, 200);
  for (const [name, value] of Object.entries(ACTION_HEADERS)) assert.equal(response.headers.get(name), value, name);
  const body = (await response.json()) as any;
  assert.equal(body.type, "action");
  assert.equal(body.icon, "https://proxy.test/img/crypto.png");
  assert.equal(body.title, brief.title);
  assert.equal(body.description, "YES 50.2% · NO 49.8% · Breaking market on Panta. Made with Soothia.");
  assert.equal(body.label, "Bet");
  assert.equal(body.disabled, undefined);
  const labels = body.links.actions.map((a: any) => a.label);
  assert.deepEqual(labels, ["YES $1", "YES $5", "NO $1", "NO $5", "Bet YES", "Bet NO"]);
  assert.equal(body.links.actions[0].href, `${BASE}?side=yes&amount=1`);
  assert.equal(body.links.actions[0].type, "transaction");
  const custom = body.links.actions[4];
  assert.equal(custom.href, `${BASE}?side=yes&amount={amount}`);
  assert.deepEqual(custom.parameters, [{ name: "amount", label: "USDC amount (1–100)", type: "number", min: 1, max: 100, required: true }]);
  // ?side=no narrows to that side.
  const no = (await (await handleActionGet(get(`${BASE}?side=no`), fake().deps, MARKET)).json()) as any;
  assert.deepEqual(no.links.actions.map((a: any) => a.label), ["NO $1", "NO $5", "Bet NO"]);
});

test("GET omits the odds when prices are missing, and is disabled outside the buying window", async () => {
  const noPrices = (await (await handleActionGet(get(), fake({}, { ...brief, yesPrice: null, noPrice: null }).deps, MARKET)).json()) as any;
  assert.equal(noPrices.description, "Breaking market on Panta. Made with Soothia.");
  const closed = (await (await handleActionGet(get(), fake({}, { ...brief, phase: "secondary" }).deps, MARKET)).json()) as any;
  assert.equal(closed.disabled, true);
  assert.equal(closed.error.message, "Betting is closed for this market.");
  assert.equal(closed.links, undefined);
  assert.equal(bettingOpen({ ...brief, primaryPhaseEnd: "2020-01-01T00:00:00Z" }, Date.now()), false);
  assert.equal(describe({ ...brief, marketType: "standard" }), "YES 50.2% · NO 49.8% · Market on Panta. Made with Soothia.");
  const missing = await handleActionGet(get(), fake({}, null).deps, MARKET);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { message: "Market not found." });
});

test("POST validates side, amount and account before touching Panta", async () => {
  const f = fake();
  const cases: [string, unknown, string][] = [
    [`${BASE}?amount=1`, { account: WALLET }, "Choose YES or NO."],
    [`${BASE}?side=yes&amount=0.5`, { account: WALLET }, "Bets are between 1 and 100 USDC."],
    [`${BASE}?side=yes&amount=101`, { account: WALLET }, "Bets are between 1 and 100 USDC."],
    [`${BASE}?side=yes&amount=1`, { account: "nope" }, "The wallet address is not a valid Solana public key."],
    [`${BASE}?side=yes&amount=1`, "not json", "The wallet address is not a valid Solana public key."],
  ];
  for (const [url, body, message] of cases) {
    const response = await handleActionPost(new Request(url, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }), f.deps, MARKET);
    assert.equal(response.status, 400, message);
    assert.deepEqual(await response.json(), { message });
  }
  assert.deepEqual(f.calls, []);
  const closed = await handleActionPost(post(`${BASE}?side=yes&amount=1`, { account: WALLET }), fake({}, { ...brief, phase: "resolved" }).deps, MARKET);
  assert.equal(closed.status, 400);
  assert.deepEqual(await closed.json(), { message: "Betting is closed for this market." });
});

test("POST quotes, builds, assembles, stores the order and returns a transaction with a chaining link", async () => {
  const f = fake();
  const response = await handleActionPost(post(`${BASE}?side=yes&amount=1`, { account: WALLET }), f.deps, MARKET);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("X-Blockchain-Ids"), "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
  const body = (await response.json()) as any;
  assert.equal(body.type, "transaction");
  assert.equal(body.transaction, TX);
  assert.equal(body.message, "Buying ~2.00 YES shares for $1.02 (incl. 2% fee)");
  assert.deepEqual(body.links.next, { type: "post", href: `/api/actions/market/${MARKET}/confirm?orderId=ord_1` });
  assert.deepEqual(f.calls, [`quote ${WALLET} ${MARKET} yes 1.00`, `build qt_1 ${WALLET}`]);
  assert.deepEqual(f.store.get("ord_1"), { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "1.00", quoteId: "qt_1", orderId: "ord_1", source: "blink" });
  assert.equal(f.store.get("qt_1")?.orderId, "ord_1");
});

test("POST maps Panta errors to friendly messages and rejects oversized transactions", async () => {
  const quoteFail = fake({ quote: async () => ({ ok: false, status: 400, error: { code: "MARKET_CLOSED" } }) });
  const closed = await handleActionPost(post(`${BASE}?side=no&amount=5`, { account: WALLET }), quoteFail.deps, MARKET);
  assert.equal(closed.status, 400);
  assert.deepEqual(await closed.json(), { message: "Betting is closed for this market.", code: "market_closed" });
  const upstream = fake({ build: async () => ({ ok: false, status: 500, error: { message: "unexpected quote failure" } }) });
  const down = await handleActionPost(post(`${BASE}?side=no&amount=5`, { account: WALLET }), upstream.deps, MARKET);
  assert.equal(down.status, 502);
  assert.deepEqual(await down.json(), { message: "Prices are busy on Panta. Try again in a moment.", code: "upstream_error" });
  const big = fake({ assemble: async () => ({ txBase64: btoa(String.fromCharCode(...new Uint8Array(1200).fill(1))) }) });
  const tooBig = await handleActionPost(post(`${BASE}?side=yes&amount=1`, { account: WALLET }), big.deps, MARKET);
  assert.equal(tooBig.status, 400);
  assert.deepEqual(await tooBig.json(), { message: "This bet does not fit in one transaction." });
  assert.equal(friendlyPantaError({ code: "INSUFFICIENT_BALANCE" }), "Not enough USDC in this wallet for that bet.");
  assert.equal(friendlyPantaError({ code: "MARKET_NOT_FOUND" }), "This market does not exist.");
  assert.equal(friendlyPantaError({ code: "VALIDATION_ERROR", message: "amountUsdc must be positive" }), "amountUsdc must be positive");
});

test("the confirm callback finishes the order idempotently and returns a completed action", async () => {
  const f = fake();
  await handleActionPost(post(`${BASE}?side=yes&amount=1`, { account: WALLET }), f.deps, MARKET);
  f.calls.length = 0;
  const first = await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET, signature: SIGNATURE }), f.deps, MARKET);
  assert.equal(first.status, 200);
  const done = (await first.json()) as any;
  assert.equal(done.type, "completed");
  assert.equal(done.title, "Bet placed. Good luck.");
  assert.equal(done.description, `$1.00 on YES: ${brief.title}.`);
  assert.equal(done.icon, "https://proxy.test/img/crypto.png");
  assert.equal(done.links, undefined);
  assert.equal(f.store.get("ord_1")?.signature, SIGNATURE);
  // A second callback with the same signature repeats the idempotent finish and answers the same.
  const second = (await (await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET, signature: SIGNATURE }), f.deps, MARKET)).json()) as any;
  assert.equal(second.title, "Bet placed. Good luck.");
  assert.deepEqual(f.calls, [`finish ord_1 ${SIGNATURE}`, `finish ord_1 ${SIGNATURE}`]);
  // Another wallet, another signature, or an unknown order are refused.
  assert.equal((await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: OTHER, signature: SIGNATURE }), f.deps, MARKET)).status, 403);
  const other = encodeBase58(new Uint8Array(64).fill(3));
  assert.equal((await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET, signature: other }), f.deps, MARKET)).status, 409);
  assert.equal((await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_9`, { account: WALLET, signature: SIGNATURE }), f.deps, MARKET)).status, 404);
  assert.equal((await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET }), f.deps, MARKET)).status, 400);
});

test("the confirm callback reports failed and still-pending transactions honestly", async () => {
  const f = fake();
  await handleActionPost(post(`${BASE}?side=no&amount=5`, { account: WALLET }), f.deps, MARKET);
  f.finishResult = { ...f.finishResult, status: "failed", confirmed: false, error: "failed" };
  const failed = (await (await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET, signature: SIGNATURE }), f.deps, MARKET)).json()) as any;
  assert.equal(failed.type, "completed");
  assert.equal(failed.title, "Bet failed");
  assert.equal(failed.error.message, "The transaction failed on Solana. No USDC was taken.");
  let queued = 0;
  f.deps.background = () => { queued++; };
  f.finishResult = { ...f.finishResult, status: "pending", confirmed: false };
  const pending = (await (await handleActionConfirm(post(`${BASE}/confirm?orderId=ord_1`, { account: WALLET, signature: SIGNATURE }), f.deps, MARKET)).json()) as any;
  assert.equal(pending.title, "Bet sent");
  assert.equal(queued, 1);
});

test("the quote route prices a side and amount, with a stand-in wallet before connecting", async () => {
  const f = fake();
  const response = await handleActionQuote(get(`${BASE}/quote?side=no&amount=5`), f.deps, MARKET);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  const body = (await response.json()) as any;
  assert.deepEqual(body, { side: "no", amountUsdc: 5, shares: 1.996677, avgPrice: 0, feeUsdc: 0.02, totalUsdc: 5.02, yesPrice: brief.yesPrice, noPrice: brief.noPrice, expiresAt: "soon" });
  assert.deepEqual(f.calls, [`quote 11111111111111111111111111111111 ${MARKET} no 5.00`]);
  // The account is ignored for display quotes: Panta limits quotes per wallet.
  const withAccount = await handleActionQuote(get(`${BASE}/quote?side=yes&amount=1&account=${WALLET}`), f.deps, MARKET);
  assert.equal(withAccount.status, 200);
  assert.equal(f.calls[1], `quote 11111111111111111111111111111111 ${MARKET} yes 1.00`);
  assert.equal((await handleActionQuote(get(`${BASE}/quote?side=yes&amount=0`), f.deps, MARKET)).status, 400);
  const closed = await handleActionQuote(get(`${BASE}/quote?side=yes&amount=1`), fake({}, { ...brief, phase: "resolved" }).deps, MARKET);
  assert.deepEqual(await closed.json(), { message: "Betting is closed for this market." });
});

test("tx send broadcasts a signed transaction and turns RPC rejections into plain words", async () => {
  const signed = btoa(String.fromCharCode(1, ...new Uint8Array(64).fill(5), ...new Uint8Array(200).fill(2)));
  const ok = await handleTxSend(post("https://proxy.test/api/tx/send", { signedTxBase64: signed }), fake().deps);
  assert.equal(ok.status, 200);
  assert.equal(typeof ((await ok.json()) as any).signature, "string");
  const unsigned = btoa(String.fromCharCode(1, ...new Uint8Array(64), ...new Uint8Array(200).fill(2)));
  assert.equal((await handleTxSend(post("https://proxy.test/api/tx/send", { signedTxBase64: unsigned }), fake().deps)).status, 400);
  assert.equal((await handleTxSend(post("https://proxy.test/api/tx/send", {}), fake().deps)).status, 400);
  const empty = fake({
    send: async () => { throw new RpcError("Transaction simulation failed: Attempt to debit an account but found no record of a prior credit. AccountNotFound", []); },
    status: async () => ({ state: "pending" as const }),
  });
  const rejected = await handleTxSend(post("https://proxy.test/api/tx/send", { signedTxBase64: signed }), empty.deps);
  assert.equal(rejected.status, 400);
  assert.equal(((await rejected.json()) as any).message, "This wallet is empty. It needs SOL for network fees and USDC to pay with.");
  const status = await handleTxStatus(get(`https://proxy.test/api/tx/status?signature=${SIGNATURE}`), fake().deps);
  assert.deepEqual(await status.json(), { signature: SIGNATURE, status: "confirmed" });
  assert.equal((await handleTxStatus(get("https://proxy.test/api/tx/status?signature=nope"), fake().deps)).status, 400);
});
