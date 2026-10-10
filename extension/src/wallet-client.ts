// Content-script side of the wallet bridge: sends a request to the MAIN
// world and waits for the answer with the same id. Remembers the last wallet
// used (chrome.storage.local) so it is offered first and reconnected silently.
import {
  INJECT_SIGNER,
  WALLET_RPC_REQUEST,
  WALLET_RPC_RESPONSE,
  type WalletInfo,
  type WalletMethod,
  type WalletRpcOutcome,
  type WalletRpcRequest,
  type WalletRpcResponse,
} from "./messages";

const LAST_WALLET_KEY = "soothia:wallet";

// How long each call may take. Calls that open a wallet prompt wait for a person.
const TIMEOUT_MS: Record<WalletMethod, number> = {
  listWallets: 2000,
  getPublicKey: 4000,
  signerPing: 1500,
  disconnect: 5000,
  connect: 120_000,
  signTransaction: 180_000,
};

function call(method: WalletMethod, extra: { txBase64?: string; wallet?: string } = {}): Promise<WalletRpcOutcome> {
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
    const request: WalletRpcRequest = { type: WALLET_RPC_REQUEST, id, method, ...extra };
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

let current: WalletInfo | null = null;

async function lastUsed(): Promise<string | null> {
  try {
    const stored = await chrome.storage.local.get(LAST_WALLET_KEY);
    return typeof stored[LAST_WALLET_KEY] === "string" ? (stored[LAST_WALLET_KEY] as string) : null;
  } catch {
    return null;
  }
}

function remember(outcome: WalletRpcOutcome): void {
  if (!outcome.ok) return;
  current = outcome.wallet ?? null;
  if (outcome.wallet) chrome.storage.local.set({ [LAST_WALLET_KEY]: outcome.wallet.name }).catch(() => {});
}

export const wallet = {
  /** Detected wallets, the last used one first. */
  async list(): Promise<WalletInfo[]> {
    const outcome = await call("listWallets");
    const wallets = outcome.ok ? (outcome.wallets ?? []) : [];
    const preferred = await lastUsed();
    return wallets.slice().sort((a, b) => Number(b.name === preferred) - Number(a.name === preferred));
  },
  async connect(name: string): Promise<WalletRpcOutcome> {
    const outcome = await call("connect", { wallet: name });
    remember(outcome);
    return outcome;
  },
  async disconnect(): Promise<WalletRpcOutcome> {
    current = null;
    return call("disconnect");
  },
  /** The connected address, or null. Never opens a prompt. */
  async publicKey(): Promise<string | null> {
    const outcome = await call("getPublicKey", { wallet: (await lastUsed()) ?? undefined });
    if (outcome.ok && outcome.wallet) current = outcome.wallet;
    return outcome.ok ? (outcome.publicKey ?? null) : null;
  },
  /** The connected wallet's name and icon, once known. */
  current: (): WalletInfo | null => current,
  async signTransaction(txBase64: string): Promise<WalletRpcOutcome> {
    const first = await call("signTransaction", { txBase64 });
    if (first.ok || first.reason !== "legacy_needs_signer") return first;
    if (!(await ensureSigner())) return { ok: false, reason: "failed", message: "signer did not load" };
    return call("signTransaction", { txBase64 });
  },
};
