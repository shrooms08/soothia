// Content-script side of the wallet bridge: sends a request to the MAIN
// world and waits for the answer with the same id.
import {
  INJECT_SIGNER,
  WALLET_RPC_REQUEST,
  WALLET_RPC_RESPONSE,
  type WalletMethod,
  type WalletRpcOutcome,
  type WalletRpcRequest,
  type WalletRpcResponse,
} from "./messages";

// How long each call may take. Calls that open a Phantom popup wait for a person.
const TIMEOUT_MS: Record<WalletMethod, number> = {
  getPublicKey: 4000,
  signerPing: 1500,
  disconnect: 5000,
  connect: 120_000,
  signTransaction: 180_000,
};

function call(method: WalletMethod, txBase64?: string): Promise<WalletRpcOutcome> {
  return new Promise((resolve) => {
    const id = crypto.randomUUID();

    function done(outcome: WalletRpcOutcome): void {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(outcome);
    }

    function onMessage(event: MessageEvent): void {
      // Only this window talking to itself, answering this exact request.
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as Partial<WalletRpcResponse> | null;
      if (data?.type !== WALLET_RPC_RESPONSE || data.id !== id || typeof data.ok !== "boolean") return;
      const { type: _type, id: _id, ...outcome } = data as WalletRpcResponse;
      done(outcome as WalletRpcOutcome);
    }

    const timer = setTimeout(() => done({ ok: false, reason: "timeout" }), TIMEOUT_MS[method]);
    window.addEventListener("message", onMessage);
    const request: WalletRpcRequest = { type: WALLET_RPC_REQUEST, id, method, ...(txBase64 ? { txBase64 } : {}) };
    window.postMessage(request, window.location.origin);
  });
}

async function ensureSigner(): Promise<boolean> {
  if ((await call("signerPing")).ok) return true;
  try {
    await chrome.runtime.sendMessage({ type: INJECT_SIGNER });
  } catch {
    return false;
  }
  // The bundle is large; give it a few tries to finish loading.
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await call("signerPing")).ok) return true;
  }
  return false;
}

export const wallet = {
  connect: (): Promise<WalletRpcOutcome> => call("connect"),
  disconnect: (): Promise<WalletRpcOutcome> => call("disconnect"),
  /** The connected address, or null. Never opens a popup. */
  async publicKey(): Promise<string | null> {
    const outcome = await call("getPublicKey");
    return outcome.ok ? (outcome.publicKey ?? null) : null;
  },
  async signTransaction(txBase64: string): Promise<WalletRpcOutcome> {
    if (!(await ensureSigner())) return { ok: false, reason: "failed", message: "signer did not load" };
    return call("signTransaction", txBase64);
  },
};
