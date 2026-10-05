// Run with `npm test`. Pure logic only: no network, no keys.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleV0 } from "../src/assemble";
import { decodeBase58, encodeBase58, isAddress, isSignature } from "../src/base58";
import { validateDraft, type MarketDraft } from "../src/pantaRules";
import { MAX_BUILT_TRANSACTION_BYTES, TRANSACTION_FIXED_BYTES, TRIMMED_QUESTION_MAX_LENGTH } from "../src/pantaRules";
import { authorityFor, deadlineUtc, fitDraft, onchainTextBytes, pageSource, trimQuestion } from "../src/resolution";

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

const CAP = MAX_BUILT_TRANSACTION_BYTES;

test("the built-transaction cap is 1,150 bytes", () => {
  assert.equal(CAP, 1150);
});

test("every category has an authoritative source, listed first, with the page second", () => {
  assert.deepEqual(fitDraft(draft)!.sourcesOfTruth, ["https://www.coingecko.com/en/coins/bitcoin", draft.pageUrl]);
  assert.equal(authorityFor({ ...draft, question: "Will FARTCOIN trade above $2 by December 31, 2026?" }).url, "https://www.coingecko.com");
  const sports = { ...draft, category: "sports" as const, resolutionType: "sports_result" as const, question: "Will Arsenal beat Liverpool on October 10, 2026?" };
  assert.equal(authorityFor(sports).url, "https://www.premierleague.com");
  assert.equal(authorityFor({ ...sports, question: "Will Wrexham win promotion by May 2, 2027?" }).url, "https://www.espn.com");
  for (const category of ["politics", "entertainment", "finance", "science", "world", "other"] as const) {
    assert.equal(authorityFor({ ...draft, category, resolutionType: "official_outcome" }).url, "https://www.reuters.com");
  }
});

test("the rule names the authoritative source", () => {
  assert.equal(deadlineUtc(draft.endTime), "2026-12-31 23:59 UTC");
  const rule = fitDraft(draft, 2)!.resolutionRule;
  assert.equal(rule, "YES if this happens by 2026-12-31 23:59 UTC, per CoinGecko's BTC/USD price. Otherwise NO.");
  const sports = { ...draft, category: "sports" as const, resolutionType: "sports_result" as const, question: "Will Arsenal beat Liverpool on October 10, 2026?" };
  assert.ok(fitDraft(sports)!.resolutionRule.includes("per the official result from the Premier League"));
  assert.ok(fitDraft({ ...draft, category: "politics", resolutionType: "official_outcome" })!.resolutionRule.includes("as reported by Reuters"));
  // A crypto question that is not about a price does not claim a price feed.
  const listing = { ...draft, resolutionType: "official_outcome" as const, question: "Will a spot Solana ETF be approved by December 31, 2026?" };
  assert.ok(fitDraft(listing)!.resolutionRule.includes("as shown on CoinGecko"));
});

test("a long page URL is shortened so it cannot use up the transaction", () => {
  const long = `https://news.example.com/world/a-story?utm_source=${"x".repeat(300)}`;
  assert.equal(pageSource(long), "https://news.example.com/world/a-story");
  assert.equal(pageSource(`https://news.example.com/${"p".repeat(300)}`), "https://news.example.com");
});

test("a normal draft keeps both sources and the full rule, under the cap", () => {
  const fitted = fitDraft(draft)!;
  assert.equal(fitted.level, 0);
  assert.deepEqual(fitted.adjustments, []);
  assert.equal(fitted.sourcesOfTruth.length, 2);
  assert.equal(
    fitted.resolutionRule,
    "YES if this happens by 2026-12-31 23:59 UTC, per CoinGecko's BTC/USD price. Otherwise NO. Touching the level at any time before the deadline counts.",
  );
  assert.ok(fitted.predictedBytes <= CAP);
});

test("the all-time-high draft from the smoke test keeps CoinGecko and the post, under the cap", () => {
  const ath = { ...draft, question: "Will Bitcoin reach a new all-time high by December 31, 2026?" };
  const fitted = fitDraft(ath)!;
  assert.deepEqual(fitted.adjustments, []);
  assert.deepEqual(fitted.sourcesOfTruth, ["https://www.coingecko.com/en/coins/bitcoin", ath.pageUrl]);
  assert.ok(fitted.predictedBytes <= CAP, `predicted ${fitted.predictedBytes}`);
});

test("model-drafted wording never reaches the rule", () => {
  const invented = "previous all-time high of approximately $73,835";
  const fitted = fitDraft({ ...draft, details: invented } as MarketDraft)!;
  assert.ok(!fitted.resolutionRule.includes("73,835"));
  const validated = validateDraft({ ...draft, details: invented }, NOW);
  assert.ok(validated.ok && !("details" in validated.draft));
});

const LONG: MarketDraft = {
  question:
    "Will the United States Federal Reserve announce a cut of at least fifty basis points to the federal funds target range at or before its scheduled December 2026 meeting, according to its statement?",
  category: "finance",
  endTime: "2026-12-16T23:59:59.000Z",
  pageUrl: "https://www.example-news.com/markets/2026/10/05/fed-officials-signal-larger-cuts-are-on-the-table-as-labour-market-cools",
  resolutionType: "official_outcome",
};

test("a long draft drops the page link, keeps its authoritative source, and lands under the cap", () => {
  assert.ok(LONG.question.length > TRIMMED_QUESTION_MAX_LENGTH && LONG.question.length <= 200);

  // With both sources this text would build past the cap.
  const fullRule = fitDraft(LONG, 1)!.resolutionRule;
  const unshrunk =
    TRANSACTION_FIXED_BYTES + onchainTextBytes(LONG.question, fullRule, ["https://www.reuters.com", LONG.pageUrl]);
  assert.ok(unshrunk > CAP, `unshrunk is ${unshrunk}`);

  // Dropping the page link is enough: the question and the full rule survive.
  const fitted = fitDraft(LONG)!;
  assert.deepEqual(fitted.adjustments, ["page_link_dropped"]);
  assert.deepEqual(fitted.sourcesOfTruth, ["https://www.reuters.com"]);
  assert.equal(fitted.question, LONG.question);
  assert.ok(fitted.resolutionRule.startsWith("YES if this happens by 2026-12-16 23:59 UTC, as reported by Reuters. Otherwise NO."));
  assert.ok(fitted.predictedBytes <= CAP, `predicted ${fitted.predictedBytes}`);
  assert.equal(
    fitted.predictedBytes,
    TRANSACTION_FIXED_BYTES + onchainTextBytes(fitted.question, fitted.resolutionRule, fitted.sourcesOfTruth),
  );
});

// 200 characters but about 290 bytes: only non-Latin text is long enough to need the last step.
const WIDE_QUESTION = `Will ${"bitcoin \u0431\u0438\u0442\u043a\u043e\u0438\u043d ".repeat(13)}`.slice(0, 199) + "?";

test("the last step trims the question on a word boundary, and the result fits", () => {
  const wide: MarketDraft = { ...draft, question: WIDE_QUESTION };
  const fitted = fitDraft(wide)!;
  assert.deepEqual(fitted.adjustments, ["page_link_dropped", "minimal_rule", "question_trimmed"]);
  assert.deepEqual(fitted.sourcesOfTruth, ["https://www.coingecko.com/en/coins/bitcoin"]);
  assert.ok(fitted.predictedBytes <= CAP, `predicted ${fitted.predictedBytes}`);
  assert.ok(fitted.question.length <= TRIMMED_QUESTION_MAX_LENGTH);
  assert.ok(fitted.question.endsWith("?"));
  const kept = fitted.question.slice(0, -1);
  assert.ok(wide.question.startsWith(kept));
  assert.equal(wide.question[kept.length], " ");
});

test("a crypto draft keeps a coingecko.com source through every shrink step, under 1,150 bytes", () => {
  const drafts: MarketDraft[] = [
    draft,
    { ...draft, pageUrl: `https://x.com/someone/status/1?ref=${"r".repeat(400)}` },
    // The longest plain question with a long page URL.
    {
      ...draft,
      question: `Will Bitcoin ${"trade above its previous record high on every major exchange ".repeat(3)}`.slice(0, 199) + "?",
      pageUrl: `https://www.example-news.com/${"p".repeat(90)}`,
    },
    // Worst case: a question that needs every step.
    { ...draft, question: WIDE_QUESTION, pageUrl: `https://www.example-news.com/${"p".repeat(90)}` },
    { ...draft, question: "Will FARTCOIN trade above $2 by December 31, 2026?" },
  ];
  for (const candidate of drafts) {
    for (let level = 0; level <= 3; level++) {
      const fitted = fitDraft(candidate, level);
      // A forced level can be unreachable for a draft; when one is returned it must hold.
      if (!fitted) continue;
      assert.match(fitted.sourcesOfTruth[0], /^https:\/\/www\.coingecko\.com/);
      assert.equal(fitted.authority.name, "CoinGecko");
      assert.ok(fitted.resolutionRule.includes("CoinGecko"));
      assert.ok(fitted.predictedBytes <= 1150, `level ${level} predicted ${fitted.predictedBytes}`);
    }
    // And every one of these drafts does fit at some level.
    assert.ok(fitDraft(candidate), "draft must fit");
  }
  assert.deepEqual(fitDraft(drafts[2])!.adjustments, ["page_link_dropped"]);
  const worst = fitDraft(drafts[3])!;
  assert.deepEqual(worst.adjustments, ["page_link_dropped", "minimal_rule", "question_trimmed"]);
  assert.deepEqual(worst.sourcesOfTruth, ["https://www.coingecko.com/en/coins/bitcoin"]);
});

test("shrinking stops at the first step that fits, and can be forced further", () => {
  assert.deepEqual(fitDraft(draft)!.adjustments, []);
  assert.deepEqual(fitDraft(LONG)!.adjustments, ["page_link_dropped"]);
  // About 250 bytes of question: too big with the full rule, fine with the minimal one.
  const medium = { ...draft, question: WIDE_QUESTION.slice(0, 170) + "?" };
  assert.deepEqual(fitDraft(medium)!.adjustments, ["page_link_dropped", "minimal_rule"]);
  // A real build that came out too big asks for the next level.
  assert.deepEqual(fitDraft(draft, 1)!.adjustments, ["page_link_dropped"]);
  assert.deepEqual(fitDraft(draft, 1)!.sourcesOfTruth, ["https://www.coingecko.com/en/coins/bitcoin"]);
  assert.deepEqual(fitDraft(draft, 2)!.adjustments, ["page_link_dropped", "minimal_rule"]);
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
