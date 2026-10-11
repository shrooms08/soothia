// Fallback for /create/build. Panta's create build is documented to return a
// whole unsigned transaction; if it ever returns an instruction list instead
// (as its primary-buy and claim builds do), this compiles a v0 transaction
// with the wallet as fee payer. Mirrors the Panta playground's
// instructionsToVersionedTx. Loaded only when needed.
export interface BuiltInstruction {
  programId: string;
  /** Base64. */
  data: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
}

export async function assembleV0(
  instructions: BuiltInstruction[],
  feePayer: string,
  recentBlockhash: string,
): Promise<string> {
  const { PublicKey, TransactionInstruction, TransactionMessage, VersionedTransaction } =
    await import("@solana/web3.js");
  const message = new TransactionMessage({
    payerKey: new PublicKey(feePayer),
    recentBlockhash,
    instructions: instructions.map(
      (instruction) =>
        new TransactionInstruction({
          programId: new PublicKey(instruction.programId),
          keys: instruction.accounts.map((account) => ({
            pubkey: new PublicKey(account.pubkey),
            isSigner: account.isSigner,
            isWritable: account.isWritable,
          })),
          // web3.js types ask for a Buffer; at runtime any Uint8Array works.
          data: Uint8Array.from(atob(instruction.data), (char) => char.charCodeAt(0)) as never,
        }),
    ),
  }).compileToV0Message();
  return btoa(String.fromCharCode(...new VersionedTransaction(message).serialize()));
}
