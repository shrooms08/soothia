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
