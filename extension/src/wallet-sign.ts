// MAIN-world helper for legacy wallet providers, injected only when needed:
// it carries @solana/web3.js, which turns the unsigned bytes into the
// VersionedTransaction object a legacy provider's signTransaction expects.
// Standard wallets sign raw bytes in wallet-bridge.ts and never need this.
// It never sends anything: signAndSendTransaction is deliberately not used.
import { VersionedTransaction } from "@solana/web3.js";
import { SIGNER_READY, WALLET_RPC_REQUEST, WALLET_RPC_RESPONSE, type WalletRpcRequest, type WalletRpcResponse } from "./messages";

const LOADED_FLAG = "__soothiaSignerLoaded";
const LEGACY_SIGNER_KEY = "__soothiaLegacySigner";

const flags = window as unknown as Record<string, unknown>;
if (window.top === window && !flags[LOADED_FLAG]) {
  flags[LOADED_FLAG] = true;
  flags[LEGACY_SIGNER_KEY] = {
    deserialize: (bytes: Uint8Array) => VersionedTransaction.deserialize(bytes),
    serialize: (transaction: unknown) => (transaction as VersionedTransaction).serialize(),
  };
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const request = event.data as WalletRpcRequest | null;
    if (request?.type !== WALLET_RPC_REQUEST || typeof request.id !== "string" || request.method !== "signerPing") return;
    const response: WalletRpcResponse = { type: WALLET_RPC_RESPONSE, id: request.id, ok: true };
    window.postMessage(response, window.location.origin);
  });
}
// Announce on every injection, so a second request for the signer also gets an answer.
window.postMessage({ type: SIGNER_READY }, window.location.origin);
