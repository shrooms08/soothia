// Runs in the page's own world, injected only when the user asks for a wallet. It
// answers the content script and nothing else. It is given the session nonce through
// its own script tag, and removes the tag at once.

import { connectWallet, disconnectWallet, listWallets, signAndExecute, signOnly, signPersonalMessage, walletAccounts } from "./sui-wallet-core";
import { acceptRequest, BRIDGE_READY_ID, WALLET_CHANNEL, type WalletRequest, type WalletResponse } from "./wallet-protocol";

const script = document.currentScript as HTMLScriptElement | null;
const nonce = script?.dataset.soothiaNonce ?? "";
script?.remove();

function reply(id: string, outcome: Pick<WalletResponse, "ok" | "result" | "error">): void {
  const response: WalletResponse = { channel: WALLET_CHANNEL, direction: "response", nonce, id, ...outcome };
  window.postMessage(response, window.location.origin);
}

function run(request: WalletRequest): Promise<unknown> | unknown {
  const walletId = String(request.params.walletId ?? "");
  switch (request.method) {
    case "list":
      return listWallets().map(({ id, name }) => ({ id, name }));
    case "connect":
      return connectWallet(walletId, request.params.silent === true);
    case "disconnect":
      return disconnectWallet(walletId);
    case "getAccounts":
      return walletAccounts(walletId);
    case "signPersonalMessage":
      return signPersonalMessage(walletId, String(request.params.address ?? ""), String(request.params.message ?? ""));
    case "signTransaction":
      return signOnly(walletId, String(request.params.address ?? ""), String(request.params.txBytes ?? ""));
    case "signAndExecute":
      return signAndExecute(walletId, String(request.params.address ?? ""), String(request.params.txBytes ?? ""));
  }
}

if (nonce) {
  window.addEventListener("message", (event) => {
    const request = acceptRequest(event, window, nonce);
    if (!request) return;
    Promise.resolve()
      .then(() => run(request))
      .then(
        (result) => reply(request.id, { ok: true, result }),
        (error: unknown) => reply(request.id, { ok: false, error: String((error as Error)?.message ?? error).slice(0, 200) }),
      );
  });
  reply(BRIDGE_READY_ID, { ok: true });
}
