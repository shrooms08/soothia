// Run with `npm test`. Uses the real unsigned create transaction Panta built
// for a throwaway address (test/fixtures/panta-create-tx.txt) and rebuilds
// variants of it the way a wallet might.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { checkSignedTransaction } from "../src/tx-check";

const unsigned = readFileSync(new URL("./fixtures/panta-create-tx.txt", import.meta.url), "utf8").trim();
const toBase64 = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64");

/** The fixture, optionally with its instructions or blockhash changed, then "signed". */
function variant(
  change?: (instructions: TransactionInstruction[], payer: PublicKey) => TransactionInstruction[],
  options: { blockhash?: string; sign?: boolean } = {},
): string {
  const original = VersionedTransaction.deserialize(Buffer.from(unsigned, "base64"));
  const message = TransactionMessage.decompile(original.message);
  if (change) message.instructions = change(message.instructions, message.payerKey);
  if (options.blockhash) message.recentBlockhash = options.blockhash;
  const tx = change || options.blockhash ? new VersionedTransaction(message.compileToV0Message()) : original;
  if (options.sign !== false) tx.signatures[0] = new Uint8Array(64).fill(9);
  return toBase64(tx.serialize());
}

test("the fixture is the real Panta create transaction, under Soothia's 1,150-byte limit", () => {
  const bytes = Buffer.from(unsigned, "base64").length;
  assert.ok(bytes <= 1150, `fixture is ${bytes} bytes`);
});

test("the same transaction, signed, passes", () => {
  const result = checkSignedTransaction(unsigned, variant());
  assert.deepEqual(result, { ok: true, bytes: Buffer.from(unsigned, "base64").length, addedComputeBudget: 0 });
});

test("an added or changed compute-budget instruction is allowed", () => {
  const added = checkSignedTransaction(
    unsigned,
    variant((instructions) => [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50_000 }), ...instructions]),
  );
  assert.equal(added.ok && added.addedComputeBudget, 1);
  assert.ok(added.bytes <= 1232);

  const changed = checkSignedTransaction(
    unsigned,
    variant((instructions) =>
      instructions.map((instruction) =>
        instruction.programId.equals(ComputeBudgetProgram.programId)
          ? ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 })
          : instruction,
      ),
    ),
  );
  assert.equal(changed.ok, true);
});

test("any other added instruction is refused", () => {
  const result = checkSignedTransaction(
    unsigned,
    variant((instructions, payer) => [
      ...instructions,
      SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1 }),
    ]),
  );
  assert.equal(result.ok, false);
  assert.equal(!result.ok && result.problem, "changed");
  assert.match(!result.ok ? result.detail : "", /unexpected instruction for program 1111/);
});

test("raising an existing account's privileges is refused", () => {
  // Sending lamports to the USDC mint makes that account writable in every
  // instruction that uses it, including Panta's own.
  const result = checkSignedTransaction(
    unsigned,
    variant((instructions, payer) => [
      ...instructions,
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        lamports: 1,
      }),
    ]),
  );
  assert.equal(!result.ok && result.problem, "changed");
});

test("altered instruction data, a removed instruction, or a new blockhash is refused", () => {
  const altered = checkSignedTransaction(
    unsigned,
    variant((instructions) =>
      instructions.map((instruction, index) => {
        if (index !== instructions.length - 1) return instruction;
        const data = Buffer.from(instruction.data);
        data[data.length - 1] ^= 0xff;
        return new TransactionInstruction({ ...instruction, data });
      }),
    ),
  );
  assert.equal(!altered.ok && altered.problem, "changed");
  assert.match(!altered.ok ? altered.detail : "", /was altered/);

  const removed = checkSignedTransaction(unsigned, variant((instructions) => instructions.slice(0, -1)));
  assert.equal(!removed.ok && removed.problem, "changed");

  const reblocked = checkSignedTransaction(
    unsigned,
    variant(undefined, { blockhash: "GHtXQBsoZHVnNFa9YevAzFr17DJjgHXk3ycTKD5xD3Zi" }),
  );
  assert.equal(!reblocked.ok && reblocked.detail, "blockhash differs");
});

test("an unsigned, oversized, or garbage result is refused", () => {
  const notSigned = checkSignedTransaction(unsigned, variant(undefined, { sign: false }));
  assert.equal(!notSigned.ok && notSigned.problem, "not_signed");

  const padded = Buffer.concat([Buffer.from(variant(), "base64"), Buffer.alloc(400)]);
  assert.ok(padded.length > 1232);
  const tooLarge = checkSignedTransaction(unsigned, toBase64(padded));
  assert.equal(!tooLarge.ok && tooLarge.problem, "too_large");

  const garbage = checkSignedTransaction(unsigned, toBase64(new Uint8Array(200).fill(1)));
  assert.equal(garbage.ok, false);
  assert.equal(checkSignedTransaction(unsigned, "not base64 !!").ok, false);
});
