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

export type DetectResult =
  | { status: "ok"; tiles: Tile[] }
  | { status: "error"; reason: "limit" | "unavailable" };
