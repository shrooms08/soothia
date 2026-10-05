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
// SOL a wallet needs for network fees and account rent.
export const MIN_SOL_FOR_CREATE = 0.01;
