// Base58 (Bitcoin alphabet), as Solana uses for addresses and signatures.
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let out = "";
  while (value > 0n) {
    out = ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

/** Returns null for anything that is not valid base58. */
export function decodeBase58(text: string): Uint8Array | null {
  let value = 0n;
  for (const char of text) {
    const digit = ALPHABET.indexOf(char);
    if (digit < 0) return null;
    value = value * 58n + BigInt(digit);
  }
  const bytes: number[] = [];
  while (value > 0n) {
    bytes.unshift(Number(value & 0xffn));
    value >>= 8n;
  }
  for (const char of text) {
    if (char !== "1") break;
    bytes.unshift(0);
  }
  return new Uint8Array(bytes);
}

/** A Solana address: base58 for exactly 32 bytes. */
export function isAddress(text: unknown): text is string {
  return typeof text === "string" && text.length >= 32 && text.length <= 44 && decodeBase58(text)?.length === 32;
}

/** A transaction signature: base58 for exactly 64 bytes. */
export function isSignature(text: unknown): text is string {
  return typeof text === "string" && text.length >= 64 && text.length <= 90 && decodeBase58(text)?.length === 64;
}
