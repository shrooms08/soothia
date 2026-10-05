// Run with `npm test`. Pure logic only: no network, no keys.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleV0 } from "../src/assemble";
import { decodeBase58, encodeBase58, isAddress, isSignature } from "../src/base58";
import { validateDraft, type MarketDraft } from "../src/pantaRules";
import { MAX_BUILT_TRANSACTION_BYTES, TRANSACTION_FIXED_BYTES, TRIMMED_QUESTION_MAX_LENGTH } from "../src/pantaRules";
import { deadlineUtc, fitDraft, onchainTextBytes, sourcesOfTruth, trimQuestion } from "../src/resolution";

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

test("a normal draft keeps two sources and its drafted detail, under 1,100 bytes", () => {
  const fitted = fitDraft({ ...draft, details: "Bitcoin's USD price is above 105,000 at any time before the deadline." })!;
  assert.equal(deadlineUtc(draft.endTime), "2026-12-31 23:59 UTC");
  assert.equal(fitted.level, 0);
  assert.deepEqual(fitted.adjustments, []);
  assert.equal(fitted.sourcesOfTruth.length, 2);
  assert.ok(fitted.resolutionRule.startsWith("YES if this happens by 2026-12-31 23:59 UTC"));
  assert.ok(fitted.resolutionRule.includes("above 105,000"));
  assert.ok(fitted.predictedBytes <= MAX_BUILT_TRANSACTION_BYTES);
});

test("a long draft is shrunk in order and lands under 1,100 bytes", () => {
  const long: MarketDraft = {
    question:
      "Will the United States Federal Reserve announce a cut of at least fifty basis points to the federal funds target range at or before its scheduled December 2026 meeting, according to its statement?",
    category: "finance",
    endTime: "2026-12-16T23:59:59.000Z",
    pageUrl: "https://www.example-news.com/markets/2026/10/05/fed-officials-signal-larger-cuts-are-on-the-table-as-labour-market-cools",
    resolutionType: "official_outcome",
    details: "The Federal Open Market Committee statement published after the meeting lowers the target range by 50 basis points or more. ".repeat(3),
  };
  assert.ok(long.question.length > TRIMMED_QUESTION_MAX_LENGTH && long.question.length <= 200);

  // Unshrunk, this text would build to far more than Solana allows.
  const fullRule = `YES if this happens by 2026-12-16 23:59 UTC, per the listed sources. Otherwise NO. ${long.details}`;
  const unshrunk = TRANSACTION_FIXED_BYTES + onchainTextBytes(long.question, fullRule, sourcesOfTruth(long));
  assert.ok(unshrunk > 1232, `unshrunk is ${unshrunk}`);

  const fitted = fitDraft(long)!;
  assert.deepEqual(fitted.adjustments, ["one_source", "minimal_rule", "question_trimmed"]);
  assert.deepEqual(fitted.sourcesOfTruth, [long.pageUrl]);
  assert.equal(fitted.resolutionRule, "YES if this happens by 2026-12-16 23:59 UTC, per the listed source. Otherwise NO.");
  assert.ok(fitted.predictedBytes <= MAX_BUILT_TRANSACTION_BYTES, `predicted ${fitted.predictedBytes}`);
  assert.equal(
    fitted.predictedBytes,
    TRANSACTION_FIXED_BYTES + onchainTextBytes(fitted.question, fitted.resolutionRule, fitted.sourcesOfTruth),
  );

  // The question is cut on a word boundary and is still a question.
  assert.ok(fitted.question.length <= TRIMMED_QUESTION_MAX_LENGTH);
  assert.ok(fitted.question.endsWith("?"));
  const kept = fitted.question.slice(0, -1);
  assert.ok(long.question.startsWith(kept));
  assert.equal(long.question[kept.length], " ");
});

test("shrinking stops at the first step that fits, and can be forced further", () => {
  const medium = { ...draft, details: "x".repeat(150) };
  assert.deepEqual(fitDraft(medium)!.adjustments, ["one_source"]);
  const longer = { ...draft, details: "x".repeat(260) };
  assert.deepEqual(fitDraft(longer)!.adjustments, ["one_source", "minimal_rule"]);
  // A real build that came out too big asks for the next level.
  assert.deepEqual(fitDraft(draft, 1)!.adjustments, ["one_source"]);
  assert.deepEqual(fitDraft(draft, 2)!.adjustments, ["one_source", "minimal_rule"]);
  // Multi-byte text that cannot fit even when trimmed is refused, not truncated mid-character.
  assert.equal(fitDraft({ ...draft, question: `Will ${"\u6f22".repeat(190)}?` }), null);
});

test("trimming a question never cuts a word", () => {
  assert.equal(trimQuestion("Will it rain?", 150), "Will it rain?");
  assert.equal(trimQuestion("Will Bitcoin trade above one hundred thousand dollars?", 30), "Will Bitcoin trade above one?");
  assert.equal(trimQuestion("Will prices rise, fall, or stay flat this year?", 24), "Will prices rise, fall?");
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
