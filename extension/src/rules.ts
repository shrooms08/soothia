// The limits the review sheet enforces before asking the Worker.
// Mirrors worker/src/pantaRules.ts, which is the source of truth and checks
// everything again server-side. Change the two together.

export const CATEGORIES = [
  "sports",
  "crypto",
  "politics",
  "entertainment",
  "finance",
  "science",
  "world",
  "other",
] as const;

// Not Panta's 512: the question is stored in the create transaction, which
// has to fit in 1232 bytes along with the rule and sources.
export const QUESTION_MAX_LENGTH = 200;
export const MIN_END_LEAD_MS = 2 * 3600 * 1000;
export const MAX_END_HORIZON_MS = 365 * 24 * 3600 * 1000;
// SOL a wallet needs for account rent and network fees.
export const MIN_SOL_FOR_CREATE = 0.02;
// What Panta charges to create a market, shown on the type cards until the live quote arrives.
export const BREAKING_MARKET_COST_USDC = 20;
export const STANDARD_MARKET_COST_USDC = 50;

// Market types. Breaking: the event must start within 72 hours of creation;
// buying runs until then, then shares trade between people until it
// resolves. Standard: for events further out that need a longer window.
export const MARKET_TYPES = ["breaking", "standard"] as const;
export type MarketType = (typeof MARKET_TYPES)[number];
export const DEFAULT_MARKET_TYPE: MarketType = "breaking";
export const DEFAULT_BUY_WINDOW_HOURS = 48;
export const BREAKING_MAX_BUY_WINDOW_HOURS = 72;
// Choices for "Buying window closes", in hours after creation.
export const BUY_WINDOW_CHOICES: { hours: number; label: string }[] = [
  { hours: 1, label: "In 1 hour" },
  { hours: 6, label: "In 6 hours" },
  { hours: 12, label: "In 12 hours" },
  { hours: 24, label: "In 24 hours" },
  { hours: 48, label: "In 2 days" },
  { hours: 72, label: "In 3 days" },
  { hours: 24 * 7, label: "In 1 week" },
  { hours: 24 * 14, label: "In 2 weeks" },
  { hours: 24 * 30, label: "In 30 days" },
];
// A buying window that closes right away, for an event already under way.
export const LIVE_NOW = "live";

// Bets: Soothia's floor, Panta's early-market cap, and the SOL a buy needs.
export const MIN_BET_USDC = 1;
export const MAX_BET_USDC = 100;
export const MIN_SOL_FOR_BET = 0.005;
export const BET_CHIPS = [1, 2, 5];
