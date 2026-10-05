// Runs in the page's MAIN world, where wallet providers are visible.
// Reports whether Phantom is present and answers connect / disconnect /
// getPublicKey requests from the content script. Signing lives in
// wallet-sign.ts, which is loaded only when the user creates a market.
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

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey?: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
}

interface WalletWindow {
  phantom?: { solana?: PhantomProvider };
  solana?: PhantomProvider;
}

function phantom(): PhantomProvider | null {
  const w = window as unknown as WalletWindow;
  if (w.phantom?.solana) return w.phantom.solana;
  return w.solana?.isPhantom ? w.solana : null;
}

function report(): void {
  const message: WalletStatusMessage = { type: WALLET_STATUS, phantom: phantom() !== null };
  window.postMessage(message, window.location.origin);
}

function isRejection(error: unknown): boolean {
  return (error as { code?: unknown } | null)?.code === 4001;
}

async function handle(request: WalletRpcRequest): Promise<WalletRpcOutcome | null> {
  // signTransaction and signerPing belong to the signer bundle.
  if (request.method !== "connect" && request.method !== "disconnect" && request.method !== "getPublicKey") {
    return null;
  }
  const provider = phantom();
  if (!provider) return { ok: false, reason: "no_wallet" };
  try {
    switch (request.method) {
      case "connect":
        return { ok: true, publicKey: (await provider.connect()).publicKey.toString() };
      case "disconnect":
        await provider.disconnect();
        return { ok: true, publicKey: null };
      case "getPublicKey": {
        if (provider.publicKey) return { ok: true, publicKey: provider.publicKey.toString() };
        // Reconnects silently if this site was approved before; never opens a popup.
        try {
          return { ok: true, publicKey: (await provider.connect({ onlyIfTrusted: true })).publicKey.toString() };
        } catch {
          return { ok: true, publicKey: null };
        }
      }
    }
  } catch (error) {
    if (isRejection(error)) return { ok: false, reason: "rejected" };
    return { ok: false, reason: "failed", message: String((error as Error)?.message ?? "").slice(0, 200) };
  }
}

if (window.top === window) {
  report();
  // Phantom can inject after this script runs, so check again a few times.
  for (const delay of [500, 1500, 4000]) setTimeout(report, delay);

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data as Partial<WalletRpcRequest> | { type?: string } | null;
    if (data?.type === WALLET_REQUEST) {
      report();
      return;
    }
    if (data?.type !== WALLET_RPC_REQUEST) return;
    const request = data as WalletRpcRequest;
    if (typeof request.id !== "string" || typeof request.method !== "string") return;
    void handle(request).then((outcome) => {
      if (!outcome) return;
      const response: WalletRpcResponse = { type: WALLET_RPC_RESPONSE, id: request.id, ...outcome };
      window.postMessage(response, window.location.origin);
    });
  });
}
