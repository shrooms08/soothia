// Writes the resolution rule and sources of truth for a market draft.
// Deterministic, so the review sheet shows exactly what Panta will receive.
import {
  ONCHAIN_TEXT_BUDGET_BYTES,
  PAGE_SOURCE_MAX_BYTES,
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

/**
 * The rule sent to Panta. It does not repeat the question or the sources
 * (both are stored beside it), and it adds detail only while the whole text
 * still fits in one transaction. Returns null when even the core sentence
 * does not fit: the question is too long.
 */
export function resolutionRule(draft: MarketDraft, sources: string[]): string | null {
  const room = ONCHAIN_TEXT_BUDGET_BYTES - onchainTextBytes(draft.question, "", sources);
  let rule = `Resolves YES if this happens on or before ${deadlineUtc(draft.endTime)}, as shown by the listed sources. Otherwise NO.`;
  if (utf8Bytes(rule) > room) return null;
  for (const extra of [draft.details, HOW_DECIDED[draft.resolutionType]]) {
    if (extra && utf8Bytes(`${rule} ${extra}`) <= room) rule = `${rule} ${extra}`;
  }
  return rule.slice(0, RESOLUTION_RULE_MAX_LENGTH);
}
