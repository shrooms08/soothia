// Writes the resolution rule and sources of truth for a market draft.
// Deterministic, so the review sheet shows exactly what Panta will receive.
import {
  RESOLUTION_RULE_MAX_LENGTH,
  SOURCES_OF_TRUTH_MAX,
  type MarketDraft,
  type ResolutionType,
} from "./pantaRules";

const HOW_DECIDED: Record<ResolutionType, string> = {
  price_threshold:
    "The price is the asset's USD price as published by the price source listed below. Reaching the level at any moment up to the deadline counts, unless the question names a specific time.",
  sports_result:
    "The result is the official final result published by the competition's organiser. If the event is postponed past the deadline, cancelled, or abandoned, this market resolves NO.",
  official_outcome:
    "The outcome must be confirmed by an official or authoritative public source, such as those listed below, on or before the deadline.",
};

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

/** The page the claim came from, then the category's standard sources. */
export function sourcesOfTruth(draft: MarketDraft): string[] {
  const sources = [draft.pageUrl];
  switch (draft.category) {
    case "crypto": {
      sources.push("https://www.coingecko.com");
      const asset = firstMatch(draft.question, COINGECKO);
      if (asset) sources.push(`https://www.coingecko.com/en/coins/${asset}`);
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

export function resolutionRule(draft: MarketDraft, sources: string[]): string {
  const rule = [
    `This market asks: "${draft.question}"`,
    `It resolves YES if that happens on or before the deadline of ${deadlineUtc(draft.endTime)}. Otherwise it resolves NO.`,
    draft.details ? `How YES is decided: ${draft.details}` : "",
    HOW_DECIDED[draft.resolutionType],
    `Sources of truth: ${sources.join(", ")}.`,
  ]
    .filter(Boolean)
    .join(" ");
  return rule.slice(0, RESOLUTION_RULE_MAX_LENGTH);
}
