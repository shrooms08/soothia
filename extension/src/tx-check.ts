// Checks what the wallet handed back before anything is sent. A wallet may
// add compute-budget (priority fee) instructions when signing; anything else
// that differs from the transaction Soothia built is refused. Pure byte
// parsing with no dependencies, so it runs in the content script, outside
// the page's reach.

export const SOLANA_MAX_TRANSACTION_BYTES = 1232;
const COMPUTE_BUDGET_PROGRAM = "ComputeBudget111111111111111111111111111111";

export type SignedCheck =
  | { ok: true; bytes: number; addedComputeBudget: number }
  | { ok: false; problem: "too_large" | "not_signed" | "changed" | "unreadable"; bytes: number; detail: string };

interface Instruction {
  program: string;
  /** Each account as "address:signer:writable". */
  accounts: string[];
  data: string;
}

interface Parsed {
  signatures: Uint8Array[];
  feePayer: string;
  blockhash: string;
  instructions: Instruction[];
  lookups: string;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let out = "";
  for (; value > 0n; value /= 58n) out = ALPHABET[Number(value % 58n)] + out;
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

/** Reads a v0 transaction. Throws on anything else or on truncated bytes. */
function parse(bytes: Uint8Array): Parsed {
  let at = 0;
  const take = (count: number): Uint8Array => {
    if (at + count > bytes.length) throw new Error("truncated");
    at += count;
    return bytes.subarray(at - count, at);
  };
  // Solana's compact-u16 length prefix.
  const length = (): number => {
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      const byte = take(1)[0];
      value |= (byte & 0x7f) << shift;
      if (!(byte & 0x80)) return value;
      if (shift > 14) throw new Error("bad length");
    }
  };

  const signatures = Array.from({ length: length() }, () => take(64));
  if (take(1)[0] !== 0x80) throw new Error("not a v0 transaction");
  const [signers, readonlySigned, readonlyUnsigned] = take(3);
  const keys = Array.from({ length: length() }, () => base58(take(32)));
  const blockhash = hex(take(32));

  const describe = (index: number): string => {
    // Indexes past the static keys point into address lookup tables.
    if (index >= keys.length) return `lookup#${index - keys.length}`;
    const signer = index < signers;
    const writable = signer ? index < signers - readonlySigned : index < keys.length - readonlyUnsigned;
    return `${keys[index]}:${signer ? "s" : "-"}:${writable ? "w" : "-"}`;
  };

  const instructions = Array.from({ length: length() }, (): Instruction => {
    const program = keys[take(1)[0]] ?? "unknown";
    const accounts = [...take(length())].map(describe);
    return { program, accounts, data: hex(take(length())) };
  });
  const lookups = hex(bytes.subarray(at));
  if (keys.length === 0) throw new Error("no accounts");
  return { signatures, feePayer: keys[0], blockhash, instructions, lookups };
}

const same = (a: Instruction, b: Instruction): boolean =>
  a.program === b.program && a.data === b.data && a.accounts.join() === b.accounts.join();

/**
 * Compares the signed transaction with the unsigned one Soothia built.
 * Passes when it is signed, fits in a Solana packet, and every instruction
 * other than compute-budget ones is unchanged and in the same order.
 */
export function checkSignedTransaction(unsignedBase64: string, signedBase64: string): SignedCheck {
  let signedBytes: Uint8Array;
  let built: Parsed;
  try {
    signedBytes = fromBase64(signedBase64);
    built = parse(fromBase64(unsignedBase64));
  } catch (error) {
    return { ok: false, problem: "unreadable", bytes: 0, detail: String((error as Error).message) };
  }
  const bytes = signedBytes.length;
  const fail = (problem: "too_large" | "not_signed" | "changed" | "unreadable", detail: string): SignedCheck => ({
    ok: false,
    problem,
    bytes,
    detail,
  });

  if (bytes > SOLANA_MAX_TRANSACTION_BYTES) {
    return fail("too_large", `${bytes} bytes, limit ${SOLANA_MAX_TRANSACTION_BYTES}`);
  }

  let signed: Parsed;
  try {
    signed = parse(signedBytes);
  } catch (error) {
    return fail("unreadable", String((error as Error).message));
  }

  if (signed.signatures.length === 0 || signed.signatures[0].every((byte) => byte === 0)) {
    return fail("not_signed", "first signature is empty");
  }
  if (signed.signatures.length !== built.signatures.length) return fail("changed", "signer count differs");
  if (signed.feePayer !== built.feePayer) return fail("changed", "fee payer differs");
  if (signed.blockhash !== built.blockhash) return fail("changed", "blockhash differs");
  if (signed.lookups !== built.lookups) return fail("changed", "address lookup tables differ");

  const core = (parsed: Parsed): Instruction[] =>
    parsed.instructions.filter((instruction) => instruction.program !== COMPUTE_BUDGET_PROGRAM);
  const builtCore = core(built);
  const signedCore = core(signed);
  if (signedCore.length !== builtCore.length) {
    const extra = signedCore.find((instruction) => !builtCore.some((original) => same(original, instruction)));
    return fail("changed", extra ? `unexpected instruction for program ${extra.program}` : "an instruction was removed");
  }
  for (let index = 0; index < builtCore.length; index++) {
    if (!same(builtCore[index], signedCore[index])) {
      return fail("changed", `instruction ${index + 1} (${builtCore[index].program}) was altered`);
    }
  }

  const computeBudget = (parsed: Parsed): number => parsed.instructions.length - core(parsed).length;
  return { ok: true, bytes, addedComputeBudget: computeBudget(signed) - computeBudget(built) };
}
