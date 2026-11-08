// The admin page's decisions, kept apart from the DOM so they can be tested.

/** Compares Sui addresses whatever their case or leading zeros. */
export function sameAddress(a: string, b: string): boolean {
  const normal = (address: string): string => address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  return normal(a) === normal(b);
}

/** "1h 02m 05s", "4m 09s", "12s"; "ended" once there is no time left. */
export function formatLeft(ms: number): string {
  if (ms <= 0) return "ended";
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (value: number): string => String(value).padStart(2, "0");
  if (hours > 0) return `${hours}h ${two(minutes)}m ${two(seconds)}s`;
  return minutes > 0 ? `${minutes}m ${two(seconds)}s` : `${seconds}s`;
}

export const suiAmount = (mist: string): string => {
  const value = BigInt(mist);
  const fraction = (value % 1_000_000_000n).toString().padStart(9, "0").replace(/0+$/, "");
  return `${value / 1_000_000_000n}${fraction ? `.${fraction}` : ""} SUI`;
};

export const explorerLink = (digest: string): string => `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`;

const MESSAGES: Record<string, string> = {
  not_found: "The token was not accepted.",
  challenge_window_over: "The challenge window has ended, so this can no longer be overturned.",
  pool_not_resolved: "That pool is not in a challenge window.",
  pool_not_found: "That pool was not found.",
  rate_limited: "Too many requests. Wait a minute and try again.",
};

export function errorText(code: string, messages: Record<string, string> = MESSAGES): string {
  return messages[code] ?? MESSAGES[code] ?? `The Worker refused: ${code}`;
}
