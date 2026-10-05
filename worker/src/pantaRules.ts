// Panta market creation rules, as documented in docs/panta-create-rules.md.
// The /detect prompt and the server-side claim validation both read these
// constants, so a claim the model drafts is checked against the same limits
// it was told about. Change this file and the doc together.

// ---- Panta rules (from the docs and live quote probes) ----

// Allowlist from GET /categories/. Quote rejects anything else.
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
export type Category = (typeof CATEGORIES)[number];

export const QUESTION_MAX_LENGTH = 512;
export const RESOLUTION_RULE_MAX_LENGTH = 2048;
export const SOURCES_OF_TRUTH_MAX = 20;
export const IMAGE_URL_MAX_LENGTH = 2048;

// Standard markets must start at least this far ahead of now (on-chain
// minimumStartDelay), and startTime < endTime <= resolutionTime.
export const MIN_START_DELAY_SEC = 3600;

export const MARKET_TYPES = ["standard", "breaking"] as const;

// ---- Soothia drafting rules (ours, stricter than Panta) ----

// Soothia only drafts standard markets.
export const DRAFT_MARKET_TYPE = "standard";

// Earliest end time we draft: the start delay plus room for the user to
// review, sign, and broadcast.
export const MIN_END_LEAD_SEC = 2 * 3600;

// Panta documents no maximum horizon; this cap is a product choice.
export const MAX_END_HORIZON_SEC = 365 * 24 * 3600;

// Shown on a small tile, so far shorter than Panta's 512.
export const DRAFT_QUESTION_TARGET_LENGTH = 160;

export const MAX_CLAIMS = 3;
export const SOURCE_QUOTE_MAX_WORDS = 20;

// Panta resolution is free text (resolutionRule + sourcesOfTruth). Soothia
// limits drafts to shapes it can state precisely.
export const RESOLUTION_TYPES = {
  price_threshold: {
    description:
      "An asset price or index level compared with a number at a set time, read from a named public price source (for example CoinGecko).",
    categories: ["crypto", "finance"],
  },
  sports_result: {
    description:
      "The result of a scheduled match or competition, read from the official league or competition result.",
    categories: ["sports"],
  },
  official_outcome: {
    description:
      "A dated outcome confirmed by an official or authoritative public source: an election result, a release, an announcement, a published figure.",
    categories: CATEGORIES,
  },
} as const satisfies Record<string, { description: string; categories: readonly Category[] }>;
export type ResolutionType = keyof typeof RESOLUTION_TYPES;
export const RESOLUTION_TYPE_NAMES = Object.keys(RESOLUTION_TYPES) as ResolutionType[];

// ---- Creating a market ----

export const USDC_DECIMALS = 6;
// Mainnet USDC mint.
export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// startTime is set this far past Panta's minimum so a quote made now is
// still valid when Panta checks it.
export const START_BUFFER_SEC = 300;
// resolutionTime = endTime + this, as in Panta's own quote example.
export const RESOLUTION_DELAY_SEC = 3600;
export const DRAFT_QUESTION_MIN_LENGTH = 10;

// The real ceiling on text is Solana's transaction size, not Panta's field
// limits. The question, resolutionRule, and sourcesOfTruth are all written
// into the create transaction, which must fit in 1232 bytes. Measured live:
// everything else in the transaction takes 725 bytes, each source costs 4
// more, and the two strings cost 4 each, leaving about 495 bytes of text.
export const MAX_TRANSACTION_BYTES = 1232;
// UTF-8 bytes for question + resolutionRule + every source (plus 4 per source), with a margin.
export const ONCHAIN_TEXT_BUDGET_BYTES = 470;
// So a question always leaves room for a rule and sources.
export const DRAFT_QUESTION_MAX_LENGTH = 200;
// A longer page URL is cut back to its origin and path, then to its origin.
export const PAGE_SOURCE_MAX_BYTES = 120;
export const DESCRIPTION_MAX_LENGTH = 500;
export const PAGE_URL_MAX_LENGTH = 2048;

// A wallet needs at least this much SOL for network fees and account rent.
export const MIN_SOL_FOR_CREATE = 0.01;

export const MARKET_PAGE_BASE = "https://www.panta.market/market/";

/** What the review sheet sends to /create/quote. */
export interface MarketDraft {
  question: string;
  category: Category;
  /** ISO-8601 UTC. */
  endTime: string;
  /** The page the claim came from; always the first source of truth. */
  pageUrl: string;
  resolutionType: ResolutionType;
  /** The drafted "how YES is decided" sentence, when the question is unedited. */
  details?: string;
}

export type DraftValidation =
  | { ok: true; draft: MarketDraft }
  | { ok: false; field: string; message: string };

export function validateDraft(raw: unknown, nowMs: number): DraftValidation {
  const bad = (field: string, message: string): DraftValidation => ({ ok: false, field, message });
  if (typeof raw !== "object" || raw === null) return bad("draft", "Missing market details.");
  const input = raw as Record<string, unknown>;

  if (!isString(input.question)) return bad("question", "Write a question.");
  const question = input.question.trim().replace(/\s+/g, " ");
  if (question.length < DRAFT_QUESTION_MIN_LENGTH) return bad("question", "The question is too short.");
  if (question.length > DRAFT_QUESTION_MAX_LENGTH) {
    return bad("question", `The question can be at most ${DRAFT_QUESTION_MAX_LENGTH} characters.`);
  }

  if (!isString(input.category) || !CATEGORIES.includes(input.category as Category)) {
    return bad("category", "Pick one of the listed categories.");
  }
  const category = input.category as Category;

  if (!isString(input.endTime)) return bad("endTime", "Pick an end date.");
  const timeProblem = endTimeProblem(input.endTime, nowMs);
  if (timeProblem === "end_time_too_soon") return bad("endTime", "The end date must be at least 2 hours from now.");
  if (timeProblem === "end_time_too_far") return bad("endTime", "The end date can be at most 365 days from now.");
  if (timeProblem) return bad("endTime", "Pick a valid end date.");
  const endTime = new Date(Date.parse(input.endTime)).toISOString();

  if (!isString(input.pageUrl) || !/^https?:\/\//i.test(input.pageUrl) || input.pageUrl.length > PAGE_URL_MAX_LENGTH) {
    return bad("pageUrl", "Missing the page this market came from.");
  }

  // A type that does not fit the (possibly edited) category falls back to the general one.
  let resolutionType: ResolutionType = "official_outcome";
  if (isString(input.resolutionType) && RESOLUTION_TYPE_NAMES.includes(input.resolutionType as ResolutionType)) {
    const wanted = input.resolutionType as ResolutionType;
    if ((RESOLUTION_TYPES[wanted].categories as readonly string[]).includes(category)) resolutionType = wanted;
  }

  const details = isString(input.details) ? input.details.trim().slice(0, 1000) : "";
  return {
    ok: true,
    draft: { question, category, endTime, pageUrl: input.pageUrl, resolutionType, ...(details ? { details } : {}) },
  };
}

// ---- Claim shape ----

export interface Claim {
  id: string;
  question: string;
  category: Category;
  /** ISO-8601 UTC. Becomes Panta `endTime`. */
  endTime: string;
  resolution: {
    type: ResolutionType;
    /** Becomes Panta `resolutionRule`. */
    details: string;
    /** Becomes Panta `sourcesOfTruth`. */
    sources: string[];
  };
  confidence: number;
  sourceQuote: string;
}

export type ClaimDraft = Omit<Claim, "id">;

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}$%.]+/gu, " ").trim();
}

// The quote must come from the page. Models sometimes tidy punctuation, so an
// exact match or nearly all of the words appearing on the page both pass.
function quoteIsFromPage(quote: string, pageText: string): boolean {
  const page = normalize(pageText);
  const wanted = normalize(quote);
  if (!wanted) return false;
  if (page.includes(wanted)) return true;
  const pageWords = new Set(page.split(" "));
  const words = wanted.split(" ");
  const found = words.filter((word) => pageWords.has(word)).length;
  return found / words.length >= 0.8;
}

export type DropReason =
  | "not_an_object"
  | "question_format"
  | "question_too_long"
  | "category_not_allowed"
  | "end_time_invalid"
  | "end_time_too_soon"
  | "end_time_too_far"
  | "resolution_missing"
  | "resolution_type_unknown"
  | "resolution_type_wrong_category"
  | "resolution_details_invalid"
  | "resolution_sources_missing"
  | "confidence_invalid"
  | "source_quote_not_on_page"
  | "duplicate";

function endTimeProblem(endTime: string, nowMs: number): DropReason | null {
  const endMs = Date.parse(endTime);
  if (Number.isNaN(endMs)) return "end_time_invalid";
  const leadSec = (endMs - nowMs) / 1000;
  if (leadSec < MIN_END_LEAD_SEC) return "end_time_too_soon";
  if (leadSec > MAX_END_HORIZON_SEC) return "end_time_too_far";
  return null;
}

/** Checks that only depend on the clock; reused when serving cached claims. */
export function endTimeIsCreatable(endTime: string, nowMs: number): boolean {
  return endTimeProblem(endTime, nowMs) === null;
}

export type Validation = { ok: true; claim: ClaimDraft } | { ok: false; reason: DropReason };

/**
 * Passes a clean draft if Panta would accept a market built from it, else
 * says why not. `pageText` is the text the claim was drawn from.
 */
export function validateClaim(raw: unknown, pageText: string, nowMs: number): Validation {
  const drop = (reason: DropReason): Validation => ({ ok: false, reason });
  if (typeof raw !== "object" || raw === null) return drop("not_an_object");
  const input = raw as Record<string, unknown>;

  if (!isString(input.question)) return drop("question_format");
  const question = input.question.trim().replace(/\s+/g, " ");
  if (!/^Will\s.+\?$/.test(question)) return drop("question_format");
  if (question.length > DRAFT_QUESTION_MAX_LENGTH) return drop("question_too_long");

  if (!isString(input.category)) return drop("category_not_allowed");
  const category = input.category as Category;
  if (!CATEGORIES.includes(category)) return drop("category_not_allowed");

  if (!isString(input.endTime)) return drop("end_time_invalid");
  const timeProblem = endTimeProblem(input.endTime, nowMs);
  if (timeProblem) return drop(timeProblem);
  const endTime = new Date(Date.parse(input.endTime)).toISOString();

  if (typeof input.resolution !== "object" || input.resolution === null) return drop("resolution_missing");
  const resolution = input.resolution as Record<string, unknown>;
  if (!isString(resolution.type)) return drop("resolution_type_unknown");
  const type = resolution.type as ResolutionType;
  if (!RESOLUTION_TYPE_NAMES.includes(type)) return drop("resolution_type_unknown");
  if (!(RESOLUTION_TYPES[type].categories as readonly string[]).includes(category)) {
    return drop("resolution_type_wrong_category");
  }

  if (!isString(resolution.details)) return drop("resolution_details_invalid");
  const details = resolution.details.trim();
  if (!details || details.length > RESOLUTION_RULE_MAX_LENGTH) return drop("resolution_details_invalid");

  if (!Array.isArray(resolution.sources)) return drop("resolution_sources_missing");
  const sources = resolution.sources
    .filter(isString)
    .map((source) => source.trim())
    .filter(Boolean)
    .slice(0, SOURCES_OF_TRUTH_MAX);
  if (sources.length === 0) return drop("resolution_sources_missing");

  if (typeof input.confidence !== "number" || Number.isNaN(input.confidence)) return drop("confidence_invalid");
  const confidence = Math.min(1, Math.max(0, input.confidence));

  if (!isString(input.sourceQuote)) return drop("source_quote_not_on_page");
  const sourceQuote = input.sourceQuote.trim().split(/\s+/).slice(0, SOURCE_QUOTE_MAX_WORDS).join(" ");
  if (!quoteIsFromPage(sourceQuote, pageText)) return drop("source_quote_not_on_page");

  return {
    ok: true,
    claim: { question, category, endTime, resolution: { type, details, sources }, confidence, sourceQuote },
  };
}

/** The rules, worded for the drafting prompt. */
export function rulesForPrompt(nowMs: number): string {
  const earliest = new Date(nowMs + MIN_END_LEAD_SEC * 1000).toISOString();
  const latest = new Date(nowMs + MAX_END_HORIZON_SEC * 1000).toISOString();
  const types = RESOLUTION_TYPE_NAMES.map(
    (name) =>
      `- ${name}: ${RESOLUTION_TYPES[name].description} Allowed categories: ${RESOLUTION_TYPES[name].categories.join(", ")}.`,
  ).join("\n");
  return [
    `category must be one of: ${CATEGORIES.join(", ")}.`,
    `question is at most ${DRAFT_QUESTION_TARGET_LENGTH} characters, starts with "Will" and ends with "?".`,
    `endTime is an ISO-8601 UTC timestamp no earlier than ${earliest} and no later than ${latest}.`,
    `resolution.details states exactly how YES is decided, in at most ${RESOLUTION_RULE_MAX_LENGTH} characters: the measure, the threshold or result, and the moment it is read.`,
    `resolution.sources lists 1 to ${SOURCES_OF_TRUTH_MAX} public sources that will publish the answer, as https URLs of well-known sites.`,
    `resolution.type must be one of:\n${types}`,
  ].join("\n");
}
