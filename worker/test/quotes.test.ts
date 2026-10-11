// The quote policy against a flaky fake Panta. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  displayQuote,
  isTransient,
  quoteWithRetry,
  resetQuoteState,
  RETRY_WAITS_MS,
  type PantaQuote,
  type QuoteDeps,
  type QuoteResult,
} from "../src/quotes";

const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const WALLET = "BCMmCN6PPN4LaZjoWLvufmCaHYZE5PEaU3hHzYqeorne";
const ok = (id: string): QuoteResult => ({
  ok: true,
  data: { quoteId: id, shares: "1.99", feeUsdc: "0.02", expiresAt: "soon" },
});
const invalid: QuoteResult = { ok: false, status: 400, error: { code: "INVALID_MARKET_PARAMS" } };
const unexpected: QuoteResult = { ok: false, status: 500, error: { message: "unexpected quote failure" } };
const bad: QuoteResult = { ok: false, status: 400, error: { code: "VALIDATION_ERROR", message: "amount too small" } };

function fake(answers: QuoteResult[]) {
  let clock = 1_000_000;
  const calls: { at: number; wallet: string }[] = [];
  const sleeps: number[] = [];
  const cache = new Map<string, { data: PantaQuote; at: number }>();
  const deps: QuoteDeps = {
    call: async (request) => {
      calls.push({ at: clock, wallet: request.wallet });
      return answers.shift() ?? ok("qt_fallback");
    },
    sleep: async (ms) => {
      sleeps.push(ms);
      clock += ms;
    },
    now: () => clock,
    cacheGet: async (key) => cache.get(key) ?? null,
    cachePut: async (key, value) => {
      cache.set(key, value);
    },
  };
  return {
    deps,
    calls,
    sleeps,
    cache,
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

test("transient failures are retried three times with 0.6, 1.2 and 2.4 s backoff; the fourth answer wins", async () => {
  resetQuoteState();
  const f = fake([invalid, unexpected, { ok: false, status: 503, error: {} }, ok("qt_ok")]);
  const result = await quoteWithRetry(f.deps, { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "1.00" });
  assert.equal(result.ok && result.data.quoteId, "qt_ok");
  assert.equal(f.calls.length, 4);
  assert.deepEqual(
    f.sleeps.filter((ms) => RETRY_WAITS_MS.includes(ms)),
    [600, 1200, 2400],
  );
  // After the last retry the failure is passed through, and real errors are never retried.
  resetQuoteState();
  const stubborn = fake([invalid, invalid, invalid, invalid, ok("never")]);
  assert.equal(
    (await quoteWithRetry(stubborn.deps, { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "1.00" })).ok,
    false,
  );
  assert.equal(stubborn.calls.length, 4);
  resetQuoteState();
  const validation = fake([bad, ok("never")]);
  assert.equal(
    (await quoteWithRetry(validation.deps, { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "1.00" })).ok,
    false,
  );
  assert.equal(validation.calls.length, 1);
  assert.equal(isTransient({ status: 429, error: {} }), true);
  assert.equal(isTransient({ status: 400, error: { code: "MARKET_NOT_FOUND" } }), false);
});

test("outgoing quote calls for one market are spaced 400 ms apart", async () => {
  resetQuoteState();
  const f = fake([ok("a"), ok("b"), ok("c")]);
  await quoteWithRetry(f.deps, { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "1.00" });
  await quoteWithRetry(f.deps, { wallet: WALLET, marketId: MARKET, side: "no", amountUsdc: "5.00" });
  f.tick(1000);
  await quoteWithRetry(f.deps, { wallet: WALLET, marketId: MARKET, side: "yes", amountUsdc: "2.00" });
  assert.equal(f.calls[1].at - f.calls[0].at, 400, "second call waited for the gap");
  assert.equal(f.sleeps[0], 400);
  assert.equal(f.sleeps.length, 1, "a call after a quiet second needs no wait");
});

test("display quotes use the stand-in wallet, share one in-flight call, and are cached for 15 s", async () => {
  resetQuoteState();
  const f = fake([ok("first"), ok("second")]);
  const request = { marketId: MARKET, side: "yes" as const, amountUsdc: "1.00" };
  const [a, b, c] = await Promise.all([
    displayQuote(f.deps, request),
    displayQuote(f.deps, request),
    displayQuote(f.deps, request),
  ]);
  assert.equal(f.calls.length, 1, "three identical requests in flight made one upstream call");
  assert.equal(f.calls[0].wallet, "11111111111111111111111111111111");
  assert.deepEqual(
    [a, b, c].map((r) => r.ok && r.data.quoteId),
    ["first", "first", "first"],
  );
  f.tick(10_000);
  assert.equal((await displayQuote(f.deps, request)).ok && f.calls.length, 1, "served from cache inside 15 s");
  f.tick(6_000);
  const fresh = await displayQuote(f.deps, request);
  assert.equal(fresh.ok && fresh.data.quoteId, "second");
  assert.equal(f.calls.length, 2, "refetched after 15 s");
  // A failed display quote is not cached, so the next request tries again.
  resetQuoteState();
  const flaky = fake([invalid, invalid, invalid, invalid, ok("later")]);
  assert.equal((await displayQuote(flaky.deps, request)).ok, false);
  assert.equal((await displayQuote(flaky.deps, request)).ok, true);
});
