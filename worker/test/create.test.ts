// Run with `npm test`. Pure logic only: no network, no keys.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleV0 } from "../src/assemble";
import { decodeBase58, encodeBase58, isAddress, isSignature } from "../src/base58";
import { validateDraft, type MarketDraft } from "../src/pantaRules";
import { ONCHAIN_TEXT_BUDGET_BYTES } from "../src/pantaRules";
import { deadlineUtc, onchainTextBytes, resolutionRule, sourcesOfTruth } from "../src/resolution";

const NOW = Date.parse("2026-10-05T12:00:00Z");
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SYSTEM_PROGRAM = "11111111111111111111111111111111";

const draft: MarketDraft = {
  question: "Will Bitcoin trade above $105,000 by December 31, 2026?",
  category: "crypto",
  endTime: "2026-12-31T23:59:59.000Z",
  pageUrl: "https://x.com/intangiblecoins/status/2002741524950344005",
  resolutionType: "price_threshold",
};

test("base58 round-trips Solana addresses, including leading zero bytes", () => {
  for (const address of [USDC_MINT, SYSTEM_PROGRAM]) {
    const bytes = decodeBase58(address)!;
    assert.equal(bytes.length, 32);
    assert.equal(encodeBase58(bytes), address);
    assert.equal(isAddress(address), true);
  }
  assert.equal(isAddress("not-an-address"), false);
  assert.equal(isAddress(USDC_MINT.slice(0, 20)), false);
  assert.equal(isSignature(encodeBase58(new Uint8Array(64).fill(7))), true);
  assert.equal(isSignature(USDC_MINT), false);
});

test("sources start with the page, then the category default", () => {
  assert.deepEqual(sourcesOfTruth(draft), [draft.pageUrl, "https://www.coingecko.com/en/coins/bitcoin"]);
  const unknownCoin = { ...draft, question: "Will FARTCOIN trade above $2 by December 31, 2026?" };
  assert.deepEqual(sourcesOfTruth(unknownCoin), [draft.pageUrl, "https://www.coingecko.com"]);
  const sports = { ...draft, category: "sports" as const, question: "Will Arsenal beat Liverpool on October 10, 2026?" };
  assert.deepEqual(sourcesOfTruth(sports), [draft.pageUrl, "https://www.premierleague.com"]);
  const unknownLeague = { ...sports, question: "Will Wrexham win promotion by May 2, 2027?" };
  assert.deepEqual(sourcesOfTruth(unknownLeague), [draft.pageUrl, "https://www.espn.com"]);
  assert.deepEqual(sourcesOfTruth({ ...draft, category: "politics" }), [draft.pageUrl, "https://www.reuters.com"]);
});

test("a long page URL is shortened so it cannot use up the transaction", () => {
  const long = `https://news.example.com/world/a-story?utm_source=${"x".repeat(300)}`;
  assert.equal(sourcesOfTruth({ ...draft, pageUrl: long })[0], "https://news.example.com/world/a-story");
  const longPath = `https://news.example.com/${"p".repeat(300)}`;
  assert.equal(sourcesOfTruth({ ...draft, pageUrl: longPath })[0], "https://news.example.com");
});

test("the rule states the UTC deadline and always fits the transaction's text budget", () => {
  const sources = sourcesOfTruth(draft);
  const rule = resolutionRule(draft, sources)!;
  assert.equal(deadlineUtc(draft.endTime), "2026-12-31 23:59 UTC");
  assert.ok(rule.includes("Resolves YES") && rule.includes("Otherwise NO"));
  assert.ok(rule.includes("2026-12-31 23:59 UTC"));
  assert.ok(rule.includes("USD price"));
  assert.ok(onchainTextBytes(draft.question, rule, sources) <= ONCHAIN_TEXT_BUDGET_BYTES);

  // Drafted detail is used when it fits and left out when it does not.
  const short = resolutionRule({ ...draft, details: "CoinGecko BTC/USD." }, sources)!;
  assert.ok(short.includes("CoinGecko BTC/USD."));
  const huge = resolutionRule({ ...draft, details: "x".repeat(5000) }, sources)!;
  assert.ok(!huge.includes("xxxx"));

  // The longest allowed question, in multi-byte characters, with a long URL.
  const worst = { ...draft, question: `Will ${"\u00e9".repeat(194)}?`, pageUrl: `https://a.example/${"p".repeat(100)}` };
  const worstSources = sourcesOfTruth(worst);
  const worstRule = resolutionRule(worst, worstSources);
  if (worstRule !== null) {
    assert.ok(onchainTextBytes(worst.question, worstRule, worstSources) <= ONCHAIN_TEXT_BUDGET_BYTES);
  }
});

test("draft validation enforces Panta's categories, lengths, and the end-time window", () => {
  assert.equal(validateDraft(draft, NOW).ok, true);
  const field = (change: object): string => {
    const result = validateDraft({ ...draft, ...change }, NOW);
    return result.ok ? "" : result.field;
  };
  assert.equal(field({ category: "stocks" }), "category");
  assert.equal(field({ question: "Too short" }), "question");
  assert.equal(field({ question: "Will ".padEnd(201, "x") }), "question");
  assert.equal(field({ endTime: "2026-10-05T13:00:00Z" }), "endTime");
  assert.equal(field({ endTime: "2027-12-31T23:59:59Z" }), "endTime");
  assert.equal(field({ pageUrl: "javascript:alert(1)" }), "pageUrl");
  // A resolution type that does not fit the chosen category falls back.
  const moved = validateDraft({ ...draft, category: "politics" }, NOW);
  assert.equal(moved.ok && moved.draft.resolutionType, "official_outcome");
});

test("instructions compile to an unsigned v0 transaction with the wallet as fee payer", async () => {
  const { VersionedTransaction } = await import("@solana/web3.js");
  const base64 = await assembleV0(
    [
      {
        programId: SYSTEM_PROGRAM,
        data: btoa("\x02\x00\x00\x00\x01\x00\x00\x00\x00\x00\x00\x00"),
        accounts: [
          { pubkey: USDC_MINT, isSigner: true, isWritable: true },
          { pubkey: SYSTEM_PROGRAM, isSigner: false, isWritable: true },
        ],
      },
    ],
    USDC_MINT,
    "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi",
  );
  const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
  assert.equal(tx.version, 0);
  assert.equal(tx.message.staticAccountKeys[0].toBase58(), USDC_MINT);
  assert.equal(tx.message.recentBlockhash, "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi");
  assert.ok(tx.signatures[0].every((byte) => byte === 0));
});
