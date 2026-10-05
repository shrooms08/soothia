// Writes the resolution rule and sources of truth for a market draft.
// Deterministic, so the review sheet shows exactly what Panta will receive.
import {
  ONCHAIN_TEXT_BUDGET_BYTES,
  PAGE_SOURCE_MAX_BYTES,
  TRANSACTION_FIXED_BYTES,
  TRIMMED_QUESTION_MAX_LENGTH,
  RESOLUTION_RULE_MAX_LENGTH,
  SOURCES_OF_TRUTH_MAX,
  type MarketDraft,
  type ResolutionType,
} from "./pantaRules";

// Kept short on purpose: this text is paid for in transaction bytes.
const HOW_DECIDED: Record<ResolutionType, string> = {
  price_threshold: "Judged by the USD price on the listed price source. Touching the level at any time before the deadline counts.",
  sports_result: "Judged by the official final result. Postponed past the deadline, cancelled or abandoned resolves NO.",
  official_outcome: "Must be confirmed by an official or authoritative public source.",
};

const encoder = new TextEncoder();

export function utf8Bytes(text: string): number {
  return encoder.encode(text).length;
}

/** UTF-8 bytes this text takes in the create transaction. */
export function onchainTextBytes(question: string, rule: string, sources: string[]): number {
  return utf8Bytes(question) + utf8Bytes(rule) + sources.reduce((sum, source) => sum + utf8Bytes(source) + 4, 0);
}

// CoinGecko page per asset, matched on whole words in the question.
const COINGECKO: [RegExp, string][] = [
  [/\b(bitcoin|btc)\b/i, "bitcoin"],
  [/\b(ethereum|ether|eth)\b/i, "ethereum"],
  [/\b(solana|sol)\b/i, "solana"],
  [/\b(xrp|ripple)\b/i, "ripple"],
  [/\b(dogecoin|doge)\b/i, "dogecoin"],
  [/\b(bnb|binance coin)\b/i, "binancecoin"],
  [/\b(cardano|ada)\b/i, "cardano"],
  [/\b(avalanche|avax)\b/i, "avalanche-2"],
  [/\b(chainlink|link)\b/i, "chainlink"],
  [/\b(sui)\b/i, "sui"],
  [/\b(hyperliquid|hype)\b/i, "hyperliquid"],
  [/\b(zcash|zec)\b/i, "zcash"],
];

// Official site per league or competition.
const LEAGUES: [RegExp, string][] = [
  [/\bpremier league\b|\b(arsenal|liverpool|chelsea|tottenham|spurs|manchester (united|city)|man (utd|city)|newcastle|aston villa|everton|west ham)\b/i, "https://www.premierleague.com"],
  [/\b(champions league|europa league|uefa|euro 20\d\d)\b/i, "https://www.uefa.com"],
  [/\b(world cup|fifa)\b/i, "https://www.fifa.com"],
  [/\b(la ?liga|real madrid|barcelona|atl[eé]tico)\b/i, "https://www.laliga.com"],
  [/\b(nba|lakers|celtics|warriors|knicks)\b/i, "https://www.nba.com"],
  [/\b(nfl|super bowl|chiefs|eagles|cowboys|steelers|browns)\b/i, "https://www.nfl.com"],
  [/\b(mlb|world series|yankees|dodgers)\b/i, "https://www.mlb.com"],
  [/\b(nhl|stanley cup)\b/i, "https://www.nhl.com"],
  [/\b(formula ?1|f1|grand prix)\b/i, "https://www.formula1.com"],
  [/\bufc\b/i, "https://www.ufc.com"],
  [/\b(wimbledon|us open|french open|australian open|atp|wta)\b/i, "https://www.atptour.com"],
];

function firstMatch(text: string, table: [RegExp, string][]): string | null {
  return table.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** The page URL as a source, shortened if it would eat the transaction's text budget. */
function pageSource(pageUrl: string): string {
  if (utf8Bytes(pageUrl) <= PAGE_SOURCE_MAX_BYTES) return pageUrl;
  try {
    const url = new URL(pageUrl);
    const withoutQuery = url.origin + url.pathname;
    return utf8Bytes(withoutQuery) <= PAGE_SOURCE_MAX_BYTES ? withoutQuery : url.origin;
  } catch {
    return pageUrl.slice(0, PAGE_SOURCE_MAX_BYTES);
  }
}

/** The page the claim came from, then the category's standard sources. */
export function sourcesOfTruth(draft: MarketDraft): string[] {
  const sources = [pageSource(draft.pageUrl)];
  switch (draft.category) {
    case "crypto": {
      // The asset's own page when known, otherwise the price site's front page.
      const asset = firstMatch(draft.question, COINGECKO);
      sources.push(asset ? `https://www.coingecko.com/en/coins/${asset}` : "https://www.coingecko.com");
      break;
    }
    case "sports":
      sources.push(firstMatch(draft.question, LEAGUES) ?? "https://www.espn.com");
      break;
    default:
      sources.push("https://www.reuters.com");
  }
  return [...new Set(sources)].slice(0, SOURCES_OF_TRUTH_MAX);
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
  return `${cut.replace(/[\s,;:.!?\-\u2013\u2014]+$/, "")}?`;
}

export type Adjustment = "one_source" | "minimal_rule" | "question_trimmed";

/** The exact text Panta will be sent, sized to fit the create transaction. */
export interface FittedDraft {
  question: string;
  resolutionRule: string;
  sourcesOfTruth: string[];
  /** 0 is the full draft; each level applies one more adjustment. */
  level: number;
  adjustments: Adjustment[];
  /** Transaction size this text is expected to build to. */
  predictedBytes: number;
}

export const MAX_FIT_LEVEL = 3;

/**
 * Sizes a draft's text to fit the create transaction. The rule never repeats
 * the question or the sources (both are stored beside it). When the full
 * text is too big it is shrunk in a fixed order, stopping as soon as it fits:
 * one source of truth, then the minimal rule, then the question trimmed to
 * 150 characters. `minLevel` forces at least that much shrinking, for when a
 * real build came out larger than predicted. Returns null if nothing fits.
 */
export function fitDraft(draft: MarketDraft, minLevel = 0): FittedDraft | null {
  const deadline = deadlineUtc(draft.endTime);
  const allSources = sourcesOfTruth(draft);
  const minimal = (count: number): string =>
    `YES if this happens by ${deadline}, per the listed ${count === 1 ? "source" : "sources"}. Otherwise NO.`;

  for (let level = minLevel; level <= MAX_FIT_LEVEL; level++) {
    const sources = level >= 1 ? allSources.slice(0, 1) : allSources;
    const question = level >= 3 ? trimQuestion(draft.question, TRIMMED_QUESTION_MAX_LENGTH) : draft.question;
    const rule =
      level >= 2
        ? minimal(sources.length)
        : `${minimal(sources.length)} ${draft.details ?? HOW_DECIDED[draft.resolutionType]}`.slice(
            0,
            RESOLUTION_RULE_MAX_LENGTH,
          );
    // A question with one enormous "word" would trim down to nothing useful.
    if (question !== draft.question && question.length < TRIMMED_QUESTION_MAX_LENGTH / 2) continue;
    const textBytes = onchainTextBytes(question, rule, sources);
    if (textBytes > ONCHAIN_TEXT_BUDGET_BYTES) continue;

    const adjustments: Adjustment[] = [];
    if (sources.length < allSources.length) adjustments.push("one_source");
    if (level >= 2) adjustments.push("minimal_rule");
    if (question !== draft.question) adjustments.push("question_trimmed");
    return {
      question,
      resolutionRule: rule,
      sourcesOfTruth: sources,
      level,
      adjustments,
      predictedBytes: TRANSACTION_FIXED_BYTES + textBytes,
    };
  }
  return null;
}
