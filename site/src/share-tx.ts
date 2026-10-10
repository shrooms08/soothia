// Loaded by share.js only after the viewer connects a wallet: the pieces
// that need @solana/web3.js (turning the proxy's base64 into the object
// Phantom signs) plus the same signed-transaction check the extension runs.
import { VersionedTransaction } from "@solana/web3.js";

export { checkSignedTransaction } from "../../extension/src/tx-check";

export function deserialize(base64: string): VersionedTransaction {
  return VersionedTransaction.deserialize(Uint8Array.from(atob(base64), (char) => char.charCodeAt(0)));
}

export function serialize(transaction: { serialize(): Uint8Array }): string {
  return btoa(String.fromCharCode(...transaction.serialize()));
}
