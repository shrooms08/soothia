// Runs in the page's MAIN world, where wallet providers are visible.
// Only detects Phantom and reports a boolean. Never calls connect().
import { WALLET_REQUEST, WALLET_STATUS, type WalletStatusMessage } from "./messages";

interface WalletWindow {
  phantom?: { solana?: unknown };
  solana?: { isPhantom?: boolean };
}

function report(): void {
  const w = window as unknown as WalletWindow;
  const message: WalletStatusMessage = {
    type: WALLET_STATUS,
    phantom: Boolean(w.phantom?.solana) || w.solana?.isPhantom === true,
  };
  window.postMessage(message, window.location.origin);
}

if (window.top === window) {
  report();
  // Phantom can inject after this script runs, so check again a few times.
  for (const delay of [500, 1500, 4000]) setTimeout(report, delay);

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type === WALLET_REQUEST) report();
  });
}
