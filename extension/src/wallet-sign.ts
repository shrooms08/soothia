// MAIN-world signer, injected only when the user creates a market (it
// carries @solana/web3.js, too heavy to load on every page). Turns the
// unsigned base64 transaction into a VersionedTransaction, asks Phantom to
// sign it, and hands back the signed bytes. It never sends anything:
// signAndSendTransaction is deliberately not used.
import { VersionedTransaction } from "@solana/web3.js";
import {
  SIGNER_READY,
  WALLET_RPC_REQUEST,
  WALLET_RPC_RESPONSE,
  type WalletRpcOutcome,
  type WalletRpcRequest,
  type WalletRpcResponse,
} from "./messages";

interface SigningProvider {
  isPhantom?: boolean;
  signTransaction(transaction: VersionedTransaction): Promise<VersionedTransaction>;
}

const LOADED_FLAG = "__soothiaSignerLoaded";

function phantom(): SigningProvider | null {
  const w = window as unknown as { phantom?: { solana?: SigningProvider }; solana?: SigningProvider };
  if (w.phantom?.solana) return w.phantom.solana;
  return w.solana?.isPhantom ? w.solana : null;
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let out = "";
  for (; value > 0n; value /= 58n) out = BASE58[Number(value % 58n)] + out;
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

async function sign(txBase64: string): Promise<WalletRpcOutcome> {
  const provider = phantom();
  if (!provider) return { ok: false, reason: "no_wallet" };
  try {
    const transaction = VersionedTransaction.deserialize(fromBase64(txBase64));
    const signed = await provider.signTransaction(transaction);
    return {
      ok: true,
      signedTxBase64: toBase64(signed.serialize()),
      // The transaction id, so its fate can be checked even if sending is interrupted.
      signature: base58(signed.signatures[0]),
    };
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === 4001) return { ok: false, reason: "rejected" };
    return { ok: false, reason: "failed", message: String((error as Error)?.message ?? "").slice(0, 200) };
  }
}

const flags = window as unknown as Record<string, boolean>;
if (window.top === window && !flags[LOADED_FLAG]) {
  flags[LOADED_FLAG] = true;

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const request = event.data as WalletRpcRequest | null;
    if (request?.type !== WALLET_RPC_REQUEST || typeof request.id !== "string") return;
    const reply = (outcome: WalletRpcOutcome): void => {
      const response: WalletRpcResponse = { type: WALLET_RPC_RESPONSE, id: request.id, ...outcome };
      window.postMessage(response, window.location.origin);
    };
    if (request.method === "signerPing") reply({ ok: true });
    else if (request.method === "signTransaction" && typeof request.txBase64 === "string") {
      void sign(request.txBase64).then(reply);
    }
  });
}
// Announce on every injection, so a second request for the signer also gets an answer.
window.postMessage({ type: SIGNER_READY }, window.location.origin);
