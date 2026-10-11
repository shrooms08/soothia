// Runs in the page's MAIN world, where wallet providers are visible. Finds
// every Solana wallet (Wallet Standard first, legacy providers as a fallback),
// reports them to the content script, and answers connect / disconnect /
// getPublicKey / signTransaction requests. Standard wallets sign raw bytes
// here; a legacy provider needs wallet-sign.ts (web3.js), injected on demand.
// Never calls signAndSendTransaction: Soothia's Worker does the sending.
import {
  WALLET_REQUEST,
  WALLET_RPC_REQUEST,
  WALLET_RPC_RESPONSE,
  WALLET_STATUS,
  type WalletRpcOutcome,
  type WalletRpcRequest,
  type WalletRpcResponse,
  type WalletStatusMessage,
} from "./messages";
import {
  connect,
  connected,
  disconnect,
  listWallets,
  onWalletsChange,
  signTransaction,
  WalletError,
  type LegacySigner,
} from "./wallets";

/** wallet-sign.ts leaves its web3.js helpers here for legacy providers. */
const LEGACY_SIGNER_KEY = "__soothiaLegacySigner";

function legacySigner(): LegacySigner | undefined {
  return (window as unknown as Record<string, LegacySigner | undefined>)[LEGACY_SIGNER_KEY];
}

let lastReport = "";

function report(force = false): void {
  const message: WalletStatusMessage = { type: WALLET_STATUS, wallets: listWallets(), connected: connected() };
  const serialized = JSON.stringify(message);
  if (!force && serialized === lastReport) return;
  lastReport = serialized;
  window.postMessage(message, window.location.origin);
}

function failure(error: unknown): WalletRpcOutcome {
  if (error instanceof WalletError) {
    if (error.reason === "rejected" || error.reason === "legacy_needs_signer")
      return { ok: false, reason: error.reason };
    return { ok: false, reason: error.reason, message: error.message.slice(0, 200) };
  }
  return { ok: false, reason: "failed", message: String((error as Error)?.message ?? "").slice(0, 200) };
}

async function handle(request: WalletRpcRequest): Promise<WalletRpcOutcome | null> {
  try {
    switch (request.method) {
      case "listWallets":
        return { ok: true, wallets: listWallets(), wallet: connected(), publicKey: connected()?.publicKey ?? null };
      case "connect": {
        if (!request.wallet) return { ok: false, reason: "no_wallet" };
        const result = await connect(request.wallet);
        return { ok: true, publicKey: result?.publicKey ?? null, wallet: result };
      }
      case "disconnect":
        await disconnect();
        return { ok: true, publicKey: null, wallet: null };
      case "getPublicKey": {
        // Already connected, or reconnect the remembered wallet silently; never a popup.
        const current = connected();
        if (current) return { ok: true, publicKey: current.publicKey, wallet: current };
        const preferred = request.wallet ?? listWallets()[0]?.name;
        if (!preferred) return { ok: true, publicKey: null, wallet: null };
        const result = await connect(preferred, { silent: true });
        return { ok: true, publicKey: result?.publicKey ?? null, wallet: result };
      }
      case "signTransaction": {
        if (typeof request.txBase64 !== "string") return { ok: false, reason: "failed", message: "no transaction" };
        const signed = await signTransaction(request.txBase64, legacySigner());
        return { ok: true, ...signed };
      }
      default:
        return null; // signerPing belongs to wallet-sign.ts
    }
  } catch (error) {
    return failure(error);
  }
}

if (window.top === window) {
  report(true);
  onWalletsChange(() => report());
  // Legacy providers inject without an event, so look again a few times.
  for (const delay of [500, 1500, 4000]) setTimeout(() => report(), delay);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data as Partial<WalletRpcRequest> | { type?: string } | null;
    if (data?.type === WALLET_REQUEST) {
      report(true);
      return;
    }
    if (data?.type !== WALLET_RPC_REQUEST) return;
    const request = data as WalletRpcRequest;
    if (typeof request.id !== "string" || typeof request.method !== "string") return;
    void handle(request).then((outcome) => {
      if (!outcome) return;
      const response: WalletRpcResponse = { type: WALLET_RPC_RESPONSE, id: request.id, ...outcome };
      window.postMessage(response, window.location.origin);
      report();
    });
  });
}
