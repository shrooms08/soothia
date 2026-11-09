// The content script's side of the wallet bridge. The bridge is injected the first
// time the user asks for a wallet, so ordinary pages never carry it.

import { CHECK_TX } from "./messages";
import type { ExpectedTx, TxVerdict } from "./tx-check";
import { acceptResponse, BRIDGE_READY_ID, WALLET_CHANNEL, type ConnectedWallet, type MessageLike, type WalletMethod, type WalletRequest } from "./wallet-protocol";

const READY_TIMEOUT_MS = 5_000;
const LIST_TIMEOUT_MS = 5_000;
// Long enough to find the wallet popup and approve.
const APPROVAL_TIMEOUT_MS = 180_000;

export interface WalletBridge {
  call(method: WalletMethod, params?: Record<string, unknown>): Promise<unknown>;
}

const timeoutFor = (method: WalletMethod): number => (method === "connect" || method === "signAndExecute" || method === "signPersonalMessage" ? APPROVAL_TIMEOUT_MS : LIST_TIMEOUT_MS);

export function createWalletBridge(scriptUrl: () => string, win: Window = window, doc: Document = document): WalletBridge {
  const nonce = crypto.randomUUID();
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let starting: Promise<void> | null = null;
  let onReady: (() => void) | null = null;
  let nextId = 0;

  win.addEventListener("message", (event) => {
    const response = acceptResponse(event as unknown as MessageLike, win, nonce);
    if (!response) return;
    if (response.id === BRIDGE_READY_ID) {
      onReady?.();
      return;
    }
    const waiter = pending.get(response.id);
    if (!waiter) return;
    pending.delete(response.id);
    if (response.ok) waiter.resolve(response.result);
    else waiter.reject(new Error(response.error ?? "The wallet did not respond."));
  });

  function start(): Promise<void> {
    starting ??= new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        starting = null;
        reject(new Error("The wallet connection could not start on this page."));
      }, READY_TIMEOUT_MS);
      onReady = () => {
        clearTimeout(timer);
        resolve();
      };
      const script = doc.createElement("script");
      script.src = scriptUrl();
      script.dataset.soothiaNonce = nonce;
      (doc.head ?? doc.documentElement).append(script);
    });
    return starting;
  }

  return {
    async call(method, params = {}) {
      await start();
      const id = `w${++nextId}`;
      const request: WalletRequest = { channel: WALLET_CHANNEL, direction: "request", nonce, id, method, params };
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error("The wallet did not respond in time."));
        }, timeoutFor(method));
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
        win.postMessage(request, win.location.origin);
      });
    },
  };
}

/** Only Soothia's own ownership message, for this address, may reach the wallet to sign. */
export function isOwnershipMessage(message: unknown, address: string): message is string {
  return typeof message === "string" && message.length < 400 && message.startsWith("Soothia: confirm you own this wallet.\n") && message.includes(`\nAddress: ${address.toLowerCase()}\n`);
}

export type TxChecker = (txBytes: string, expected: ExpectedTx) => Promise<TxVerdict | undefined>;

/** Asks the background service worker, where the page cannot reach the check. */
export const checkInBackground: TxChecker = (txBytes, expected) => chrome.runtime.sendMessage({ type: CHECK_TX, txBytes, expected });

/**
 * The only way a transaction reaches a wallet from the extension: the bytes are
 * checked first, and no answer from the check counts as a refusal.
 */
export async function signChecked(
  bridge: WalletBridge,
  check: TxChecker,
  wallet: ConnectedWallet,
  txBytes: string,
  expected: ExpectedTx,
): Promise<{ digest: string }> {
  const verdict = await check(txBytes, expected);
  if (!verdict?.ok) throw new Error(verdict?.reason ?? "The transaction could not be checked.");
  return (await bridge.call("signAndExecute", { walletId: wallet.walletId, address: wallet.address, txBytes })) as { digest: string };
}
