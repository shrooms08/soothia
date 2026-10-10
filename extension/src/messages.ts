// Message types shared by the extension's scripts. Names are namespaced so
// they cannot collide with messages a page or another extension sends.

// MAIN world -> isolated world, via window.postMessage.
export const WALLET_STATUS = "soothia:v1:wallet-status";
// Isolated world -> MAIN world, asking for a fresh check.
export const WALLET_REQUEST = "soothia:v1:wallet-request";

export interface WalletStatusMessage {
  type: typeof WALLET_STATUS;
  phantom: boolean;
}

// Content script -> background service worker, via chrome.runtime.sendMessage.
export const HEALTH_REQUEST = "soothia:v1:health";

export interface HealthResponse {
  online: boolean;
}

// MAIN world -> isolated world: the page called history.pushState/replaceState.
export const NAV_CHANGED = "soothia:v1:nav-changed";

// Content script -> background: run detection (and matching) for a page.
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
}

// Mirrors the Worker's Claim (worker/src/pantaRules.ts).
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
}

export interface MatchedMarket {
  id: string;
  title: string;
  category: string;
  yesPrice: number | null;
  noPrice: number | null;
  endTime: string;
}

export interface Tile {
  claim: Claim;
  market: MatchedMarket | null;
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
}

export type DetectResult = { debug: DetectDebug } & (
  | { status: "ok"; tiles: Tile[] }
  | { status: "error"; reason: "limit" | "unavailable" }
);

// ---- Wallet bridge (isolated world <-> MAIN world, via window.postMessage) ----

export const WALLET_RPC_REQUEST = "soothia:v1:wallet-rpc";
export const WALLET_RPC_RESPONSE = "soothia:v1:wallet-rpc-result";
// The on-demand signer bundle announces itself once it has loaded.
export const SIGNER_READY = "soothia:v1:signer-ready";

export type WalletMethod = "connect" | "disconnect" | "getPublicKey" | "signTransaction" | "signerPing";

export interface WalletRpcRequest {
  type: typeof WALLET_RPC_REQUEST;
  id: string;
  method: WalletMethod;
  /** signTransaction only: the unsigned transaction. */
  txBase64?: string;
}

export type WalletRpcOutcome =
  | { ok: true; publicKey?: string | null; signedTxBase64?: string; signature?: string }
  // The user said no in Phantom. A normal outcome, not a failure.
  | { ok: false; reason: "rejected" }
  | { ok: false; reason: "no_wallet" | "timeout" | "failed"; message?: string };

export type WalletRpcResponse = { type: typeof WALLET_RPC_RESPONSE; id: string } & WalletRpcOutcome;

// ---- Content script -> background ----

// Relay one call to the Worker. Only the paths in API_ROUTES are allowed.
export const API_REQUEST = "soothia:v1:api";
// Load the signer bundle (with @solana/web3.js) into this tab's MAIN world.
export const INJECT_SIGNER = "soothia:v1:inject-signer";
// Fetch a category image as a data: URL (page CSP can block the direct load).
export const IMAGE_REQUEST = "soothia:v1:image";
// Open the bundled welcome page in a new tab.
export const OPEN_WELCOME = "soothia:v1:open-welcome";

export const API_ROUTES = {
  "/wallet/balances": "POST",
  "/create/quote": "POST",
  "/create/build": "POST",
  "/create/simulate": "POST",
  "/create/send": "POST",
  "/create/register-retry": "POST",
  "/tx/simulate": "POST",
  "/tx/status": "POST",
  "/buy/quote": "POST",
  "/buy/build": "POST",
  "/buy/send": "POST",
  "/buy/status": "POST",
  "/claim/build": "POST",
  "/claim/send": "POST",
  "/creator/markets": "GET",
  "/positions": "GET",
  "/market": "GET",
} as const;
export type ApiPath = keyof typeof API_ROUTES;

export interface ApiRequestMessage {
  type: typeof API_REQUEST;
  path: ApiPath;
  /** POST body, or the query string for a GET route. */
  body: unknown;
}

// ---- Buying ----

export interface BuyTarget {
  marketId: string;
  title: string;
  yesPrice: number | null;
  noPrice: number | null;
}

export interface BuyQuote {
  quoteId: string;
  marketId: string;
  side: "yes" | "no";
  amountUsdc: number;
  shares: number;
  avgPrice: number;
  feeUsdc: number;
  totalUsdc: number;
  payoutPerShareUsdc: number;
  expiresAt: string;
}

export interface BuyBuild {
  orderId: string;
  txBase64: string;
  bytes: number;
  expectedShares: number;
  expiresAt: string | null;
}

export interface BuyStatus {
  signature: string;
  status: "confirmed" | "failed" | "pending";
  confirmed: boolean;
  submitted: boolean;
  verified: string | null;
  attributed: boolean;
  errors: Record<string, string>;
  marketUrl: string;
  error?: string;
}

export interface Position {
  marketId: string;
  title: string;
  side: "yes" | "no";
  shares: number;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome: string | null;
  marketUrl: string;
  /** Shares per side minted to this wallet for creating the market, or null. */
  creatorSeedShares: number | null;
}

export interface CreatorMarket {
  marketId: string;
  question: string;
  pageUrl?: string;
  marketUrl: string;
  registered: boolean;
}

/** `status` 0 means the request never completed. */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  body: T | null;
}

// ---- Worker shapes used by the review sheet ----

export interface Balances {
  sol: number;
  usdc: number;
}

export interface Quote {
  quoteId: string;
  paymentUsdc: number;
  breakdown: { liquidityUsdc: number; platformFeeUsdc: number };
  expiresAt: string;
  marketId: string;
  marketType: "breaking" | "standard";
  eventInProgress: boolean;
  /** When buying closes (Panta startTime), ISO-8601. */
  startTime: string;
  /** The question as sent to Panta: trimmed if it had to be. */
  question: string;
  /** The data source the market resolves on; always the first source of truth. */
  authority: { name: string; url: string };
  /** What was shrunk to fit the transaction: page_link_dropped, minimal_rule, question_trimmed. */
  adjustments: string[];
  predictedBytes: number;
  resolutionRule: string;
  sourcesOfTruth: string[];
  imageUrl: string;
}

export interface Build {
  txBase64: string;
  bytes: number;
  /** Set when the build came out too big and the Worker shrank and re-quoted the draft. */
  quote: Quote | null;
}

export interface Simulation {
  ok: boolean;
  err: unknown;
  reason: string | null;
  logLine: string | null;
  unitsConsumed: number | null;
}

export interface FinishResult {
  signature: string;
  status: "confirmed" | "failed" | "pending";
  marketId: string;
  marketUrl: string;
  registered: boolean;
  registerError: string | null;
  error?: string;
}

/** Worker error body. */
export interface ApiError {
  error?: string;
  message?: string | null;
  field?: string | null;
  reason?: string;
  logLine?: string | null;
  signature?: string;
}
