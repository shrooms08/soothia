// Writes the resolution rule and sources of truth for a market draft, sized
// to fit the create transaction. Deterministic, so the review sheet shows
// exactly what Panta will receive.
import {
  ONCHAIN_TEXT_BUDGET_BYTES,
  PAGE_SOURCE_MAX_BYTES,
  RESOLUTION_RULE_MAX_LENGTH,
  TRANSACTION_FIXED_BYTES,
  TRIMMED_QUESTION_MAX_LENGTH,
  type MarketDraft,
  type ResolutionType,
} from "./pantaRules";

/**
 * The data source a market resolves on. Every market has one, and it is
 * never dropped: a market that resolves on a social post alone is not
 * resolvable.
 */
export interface Authority {
  /** How people say it: "CoinGecko", "the Premier League". */
  name: string;
  url: string;
  /** How the rule cites it: "per CoinGecko's BTC/USD price". */
  cite: string;
}

// CoinGecko page per asset, matched on whole words in the question.
const COINS: [RegExp, slug: string, ticker: string][] = [
  [/\b(bitcoin|btc)\b/i, "bitcoin", "BTC"],
  [/\b(ethereum|ether|eth)\b/i, "ethereum", "ETH"],
  [/\b(solana|sol)\b/i, "solana", "SOL"],
  [/\b(xrp|ripple)\b/i, "ripple", "XRP"],
  [/\b(dogecoin|doge)\b/i, "dogecoin", "DOGE"],
  [/\b(bnb|binance coin)\b/i, "binancecoin", "BNB"],
  [/\b(cardano|ada)\b/i, "cardano", "ADA"],
  [/\b(avalanche|avax)\b/i, "avalanche-2", "AVAX"],
  [/\b(chainlink|link)\b/i, "chainlink", "LINK"],
  [/\b(sui)\b/i, "sui", "SUI"],
  [/\b(hyperliquid|hype)\b/i, "hyperliquid", "HYPE"],
  [/\b(zcash|zec)\b/i, "zcash", "ZEC"],
];

// Official site per league or competition.
const LEAGUES: [RegExp, name: string, url: string][] = [
  [
    /\bpremier league\b|\b(arsenal|liverpool|chelsea|tottenham|spurs|manchester (united|city)|man (utd|city)|newcastle|aston villa|everton|west ham)\b/i,
    "the Premier League",
    "https://www.premierleague.com",
  ],
  [/\b(champions league|europa league|uefa|euro 20\d\d)\b/i, "UEFA", "https://www.uefa.com"],
  [/\b(world cup|fifa)\b/i, "FIFA", "https://www.fifa.com"],
  [/\b(la ?liga|real madrid|barcelona|atl[eé]tico)\b/i, "LaLiga", "https://www.laliga.com"],
  [/\b(nba|lakers|celtics|warriors|knicks)\b/i, "the NBA", "https://www.nba.com"],
  [/\b(nfl|super bowl|chiefs|eagles|cowboys|steelers|browns)\b/i, "the NFL", "https://www.nfl.com"],
  [/\b(mlb|world series|yankees|dodgers)\b/i, "MLB", "https://www.mlb.com"],
  [/\b(nhl|stanley cup)\b/i, "the NHL", "https://www.nhl.com"],
  [/\b(formula ?1|f1|grand prix)\b/i, "Formula 1", "https://www.formula1.com"],
  [/\bufc\b/i, "the UFC", "https://www.ufc.com"],
  [/\b(wimbledon|us open|french open|australian open|atp|wta)\b/i, "the ATP Tour", "https://www.atptour.com"],
];

/** The authoritative source for a draft, chosen by category. */
export function authorityFor(draft: MarketDraft): Authority {
  switch (draft.category) {
    case "crypto": {
      // Only price questions resolve on CoinGecko. An approval, launch,
      // listing, or regulation question is news, and falls through to Reuters.
      if (draft.resolutionType !== "price_threshold") break;
      const coin = COINS.find(([pattern]) => pattern.test(draft.question));
      const url = coin ? `https://www.coingecko.com/en/coins/${coin[1]}` : "https://www.coingecko.com";
      const cite = coin ? `per CoinGecko's ${coin[2]}/USD price` : "per CoinGecko's USD price for the asset";
      return { name: "CoinGecko", url, cite };
    }
    case "sports": {
      const league = LEAGUES.find(([pattern]) => pattern.test(draft.question));
      return league
        ? { name: league[1], url: league[2], cite: `per the official result from ${league[1]}` }
        : { name: "ESPN", url: "https://www.espn.com", cite: "per the result reported by ESPN" };
    }
    default:
      break;
  }
  return { name: "Reuters", url: "https://www.reuters.com", cite: "as reported by Reuters" };
}

// One extra sentence when there is room. The rule is written only from
// these fixed sentences, never from model-drafted wording: a drafted
// "how it resolves" can carry numbers that are not on the page (one draft
// asserted a previous all-time high of $73,835), and this text goes on-chain.
const HOW_DECIDED: Record<ResolutionType, string> = {
  price_threshold: "Touching the level at any time before the deadline counts.",
  sports_result: "Postponed past the deadline, cancelled or abandoned resolves NO.",
  official_outcome: "Confirmation from the official body responsible also counts.",
};

const encoder = new TextEncoder();

export function utf8Bytes(text: string): number {
  return encoder.encode(text).length;
}

/** UTF-8 bytes this text takes in the create transaction. */
export function onchainTextBytes(question: string, rule: string, sources: string[]): number {
  return utf8Bytes(question) + utf8Bytes(rule) + sources.reduce((sum, source) => sum + utf8Bytes(source) + 4, 0);
}

/** The page URL as a source, shortened if it would eat the transaction's text budget. */
export function pageSource(pageUrl: string): string {
  if (utf8Bytes(pageUrl) <= PAGE_SOURCE_MAX_BYTES) return pageUrl;
  try {
    const url = new URL(pageUrl);
    const withoutQuery = url.origin + url.pathname;
    return utf8Bytes(withoutQuery) <= PAGE_SOURCE_MAX_BYTES ? withoutQuery : url.origin;
  } catch {
    return pageUrl.slice(0, PAGE_SOURCE_MAX_BYTES);
  }
}

/** "2026-12-31 23:59 UTC" */
export function deadlineUtc(endTime: string): string {
  return `${new Date(endTime).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/** Cuts a question to at most `max` characters without splitting a word, keeping it a question. */
export function trimQuestion(question: string, max: number): string {
  if (question.length <= max) return question;
  // One character is kept back for the closing question mark.
  const room = question.slice(0, max - 1);
  const endsOnWord = question[max - 1] === " ";
  const cut = endsOnWord || !room.includes(" ") ? room : room.slice(0, room.lastIndexOf(" "));
  return `${cut.replace(/[\s,;:.!?\-–—]+$/, "")}?`;
}

export type Adjustment = "page_link_dropped" | "minimal_rule" | "question_trimmed";

/** The exact text Panta will be sent, sized to fit the create transaction. */
export interface FittedDraft {
  question: string;
  resolutionRule: string;
  /** The authoritative source first, then the page when there is room. */
  sourcesOfTruth: string[];
  authority: Authority;
  /** 0 is the full draft; each level applies one more adjustment. */
  level: number;
  adjustments: Adjustment[];
  /** Transaction size this text is expected to build to. */
  predictedBytes: number;
}

export const MAX_FIT_LEVEL = 3;

/**
 * Sizes a draft's text to fit the create transaction. The rule names the
 * authoritative source and never repeats the question. When the full text
 * is too big it is shrunk in a fixed order, stopping as soon as it fits:
 * drop the page link, then the minimal rule, then the question trimmed to
 * 150 characters. The authoritative source is never dropped. `minLevel`
 * forces at least that much shrinking, for when a real build came out
 * larger than predicted. Returns null if nothing fits.
 */
export function fitDraft(draft: MarketDraft, minLevel = 0): FittedDraft | null {
  const authority = authorityFor(draft);
  const minimal = `YES if this happens by ${deadlineUtc(draft.endTime)}, ${authority.cite}. Otherwise NO.`;
  const page = pageSource(draft.pageUrl);

  for (let level = minLevel; level <= MAX_FIT_LEVEL; level++) {
    const sources = level >= 1 || page === authority.url ? [authority.url] : [authority.url, page];
    const question = level >= 3 ? trimQuestion(draft.question, TRIMMED_QUESTION_MAX_LENGTH) : draft.question;
    const rule =
      level >= 2 ? minimal : `${minimal} ${HOW_DECIDED[draft.resolutionType]}`.slice(0, RESOLUTION_RULE_MAX_LENGTH);
    // A question with one enormous "word" would trim down to nothing useful.
    if (question !== draft.question && question.length < TRIMMED_QUESTION_MAX_LENGTH / 2) continue;
    const textBytes = onchainTextBytes(question, rule, sources);
    if (textBytes > ONCHAIN_TEXT_BUDGET_BYTES) continue;

    const adjustments: Adjustment[] = [];
    if (level >= 1 && page !== authority.url) adjustments.push("page_link_dropped");
    if (level >= 2) adjustments.push("minimal_rule");
    if (question !== draft.question) adjustments.push("question_trimmed");
    return {
      question,
      resolutionRule: rule,
      sourcesOfTruth: sources,
      authority,
      level,
      adjustments,
      predictedBytes: TRANSACTION_FIXED_BYTES + textBytes,
    };
  }
  return null;
}
