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
  { hours: 1, label: "1 hour" },
  { hours: 6, label: "6 hours" },
  { hours: 12, label: "12 hours" },
  { hours: 24, label: "1 day" },
  { hours: 48, label: "2 days" },
  { hours: 72, label: "3 days" },
  { hours: 24 * 7, label: "1 week" },
  { hours: 24 * 14, label: "2 weeks" },
  { hours: 24 * 30, label: "30 days" },
];
// A buying window that closes right away, for an event already under way.
export const LIVE_NOW = "live";
