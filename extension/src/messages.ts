// Message types shared by the extension's scripts. Names are namespaced so
// they cannot collide with messages a page or another extension sends.

// Content script -> background service worker, via chrome.runtime.sendMessage.
export const HEALTH_REQUEST = "soothia:v1:health";

export interface HealthResponse {
  online: boolean;
}

// MAIN world -> isolated world: the page called history.pushState/replaceState.
export const NAV_CHANGED = "soothia:v1:nav-changed";

// Content script -> background: run detection for a page.
export const DETECT_REQUEST = "soothia:v1:detect";

export interface PageContext {
  url: string;
  site: string;
  title: string;
  text: string;
}

export interface DetectRequestMessage {
  type: typeof DETECT_REQUEST;
  page: PageContext;
  /** "Scan again": skip the 10-minute rule here and the Worker's URL cache. */
  refresh: boolean;
  /** Event mode: an upcoming sports fixture read from the page (extension/src/fixture.ts). */
  fixture?: FixtureSignal;
}

export interface FixtureSignal {
  home: string;
  away: string;
  competition?: string;
  startISO: string;
  dateLabel: string;
  sourceUrl: string;
  evidence: string[];
}

// Mirrors the Worker's Claim (worker/src/claims.ts).
export interface Claim {
  id: string;
  question: string;
  category: string;
  endTime: string;
  resolution: { type: string; details: string; sources: string[] };
  confidence: number;
  sourceQuote: string;
  /** The page says this event is happening right now. */
  eventLive?: boolean;
  /** Built from a sports fixture's match info rather than a sentence on the page. */
  fromFixture?: boolean;
}

export interface Tile {
  claim: Claim;
}

/** A draft the Worker's validation refused. */
export interface DroppedClaim {
  question: string;
  reason: string;
}

/** What happened on the way to the Worker, for the debug footer. */
export interface DetectDebug {
  /** /detect HTTP status, or null when the request never completed. */
  httpStatus: number | null;
  /** X-Soothia-Cache from the Worker. */
  cache: "HIT" | "MISS" | null;
  /** True when the 10-minute rule answered and no request was made. */
  fromClientCache: boolean;
  claimsReturned: number;
  dropped: DroppedClaim[];
  /** Which path the Worker took: prose, or the fixture's match info. */
  path?: "prose" | "fixture";
}

export type DetectResult = { debug: DetectDebug } & (
  { status: "ok"; tiles: Tile[] } | { status: "error"; reason: "limit" | "unavailable" }
);

// Relay one call to the Worker. Only the paths in API_ROUTES are allowed.
export const API_REQUEST = "soothia:v1:api";
// Open the bundled welcome page in a new tab.
export const OPEN_WELCOME = "soothia:v1:open-welcome";
// Onboarding music in the offscreen document (welcome page only).
export const MUSIC_CONTROL = "soothia:v1:music";
export type MusicAction = "ensure" | "start" | "stop" | "mute" | "unmute" | "duck" | "status";
export interface MusicStatus {
  playing: boolean;
  muted: boolean;
  /** Why playback is not running, when it is not. */
  error: string;
}

export const API_ROUTES = {
  "/recall/status": "GET",
  "/recall/record": "GET",
  "/recall/proof": "GET",
  "/recall/insights": "POST",
  "/recall/pick": "POST",
  "/recall/pref": "POST",
  "/stake/pool": "POST",
  "/stake/build": "POST",
  "/stake/confirm": "POST",
  "/stake/positions": "GET",
  "/stake/balance": "GET",
  "/stake/claim/build": "POST",
  "/social/profile/challenge": "POST",
  "/social/profile/publish": "POST",
  "/social/profile/update": "POST",
  "/social/profile/unpublish": "POST",
  "/social/profile/by-address": "GET",
  "/social/suins": "GET",
  "/social/leaderboard": "GET",
} as const;
export type ApiPath = keyof typeof API_ROUTES;

export interface ApiRequestMessage {
  type: typeof API_REQUEST;
  path: ApiPath;
  /** POST body, or the query string for a GET route. */
  body: unknown;
}

/** `status` 0 means the request never completed. */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
}

// ---- Total Recall (worker/src/recall/routes.ts) ----

export const RECALL_ID_KEY = "soothia.recallId";

/** The connected Sui wallet: { address, walletId, walletName }. */
export const SUI_WALLET_KEY = "soothia.suiWallet";

/** Which section of My record was open last. */
export const RECORD_SECTION_KEY = "soothia.recordSection";

// Content script -> background: check a transaction before any wallet is asked to sign it.
export const CHECK_TX = "soothia:v1:check-tx";

export interface RecallCalled {
  /** "Arsenal win", or "Arsenal doesn't win (Chelsea win or draw)". */
  side: string;
  confidence: number;
  pickId: string;
  committed: boolean;
  /** Missing on a Worker older than this extension. */
  pYes?: number;
  fixture?: { home: string; away: string; startISO: string; subject: "home" | "away" } | null;
}

export interface RecallInsight {
  claimId: string;
  relevance: number;
  notes: string[];
  nudge: number;
  /** Missing on a Worker older than this extension. */
  called?: RecallCalled | null;
}

export interface RecallInsights {
  insights: RecallInsight[];
  shrink: number;
  quietSites: string[];
}

export type CommitSkipReason = "user_cap" | "global_cap" | "low_balance" | "kv_unavailable";

export interface RecallPickBody {
  question: string;
  category: string;
  pYes: number;
  endTime: string;
  source: { site: string; url: string };
  fixture?: { home: string; away: string; competition?: string; startISO: string; subject: "home" | "away" };
}

export interface RecallSavedPick {
  id: string;
  at: string;
  pYes: number;
  commit: { digest: string; network: string } | null;
  commitSkipped?: CommitSkipReason;
  fixture?: { home: string; away: string; startISO: string; subject: "home" | "away" };
}

export interface RecallLesson {
  key: string;
  at: string;
  text: string;
  n: number;
  bias?: number;
  entity?: string;
}

export interface RecallRecordPick {
  id: string;
  at: string;
  question: string;
  pYes: number;
  endTime?: string;
  fixture: { home: string; away: string; subject: "home" | "away"; startISO?: string } | null;
  status: "open" | "right" | "wrong";
  detail: string | null;
  brier: number | null;
  commit: { digest: string; explorerUrl: string } | null;
  commitSkipped: CommitSkipReason | null;
  /** Missing on a Worker older than this extension. */
  stake?: RecallPickStake | null;
}

export interface RecallPickStake {
  poolId: string;
  side: "YES" | "NO";
  amountMist: string;
  status: "open" | "awaiting_result" | "challenge_window" | "claimable" | "lost" | "refundable" | "claimed" | null;
  payoutMist: string | null;
  claimOpensAtMs: number | null;
  digests: string[];
}

export interface RecallRecord {
  summary: {
    picks: number;
    open: number;
    resolved: number;
    hits: number;
    brier: number | null;
    marketBrier: number | null;
    vsMarketCalls: number;
    calibration: { label: string; calls: number; hitRate: number; claimed: number }[];
    entities: { entity: string; calls: number; hits: number; brier: number }[];
    /** Missing on a Worker older than this extension. */
    callScore?: number;
  };
  picks: RecallRecordPick[];
  lessons: RecallLesson[];
  account: { accountId: string; owner: string | null; explorerUrl: string } | null;
}

export interface RecallProof {
  digest: string;
  verified: boolean;
  timestampMs: number | null;
  explorerUrl: string;
  problem?: string;
  kickoffISO: string | null;
  gapMs: number | null;
  beforeKickoff: boolean | null;
}

/** Worker error body. */
export interface ApiError {
  error?: string;
  message?: string | null;
  field?: string | null;
  reason?: string;
}
