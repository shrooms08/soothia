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
  admin_wallet_low_balance:
    "The wallet holding the AdminCap needs at least 0.02 SUI for gas. Send it some SUI and try again.",
};

export function errorText(code: string, messages: Record<string, string> = MESSAGES): string {
  return messages[code] ?? MESSAGES[code] ?? `The Worker refused: ${code}`;
}

export const DRILL_STEPS = ["shorten", "create", "stake", "resolve", "overturn", "refund", "restore"] as const;
export type DrillStep = (typeof DRILL_STEPS)[number];

export interface DrillState {
  poolId: string | null;
  closeMs: number | null;
  done: Partial<Record<DrillStep, string>>;
}

export const emptyDrill = (): DrillState => ({ poolId: null, closeMs: null, done: {} });

/**
 * Steps run in order. Restore is always open: if a drill goes wrong part way, the
 * delays must still be able to go back, or new pools stay paused.
 */
export function drillStepEnabled(step: DrillStep, state: DrillState, isOwner: boolean): boolean {
  if (!isOwner || state.done[step]) return step === "restore" ? isOwner : false;
  if (step === "restore") return true;
  const previous = DRILL_STEPS[DRILL_STEPS.indexOf(step) - 1];
  return previous === undefined || Boolean(state.done[previous]);
}

export const DRILL_MESSAGES: Record<string, string> = {
  delays_not_shortened:
    "The delays are not shortened on chain yet. If you just signed, wait a few seconds and press again.",
  drill_pool_closed: "The pool has closed without a stake. Press Start over, then begin again from Create drill pool.",
  drill_pool_not_closed: "The pool has not closed yet. Wait for the countdown, then press again.",
  nothing_staked: "Nothing was staked in this pool. Press Start over, then begin again from Create drill pool.",
  pool_not_void: "The pool is not overturned on chain yet. If you just signed, wait a few seconds and press again.",
  pool_not_open: "The pool is no longer open.",
  pool_not_resolved:
    "The pool is not resolved on chain yet. If you just pressed Resolve, wait a few seconds and press again.",
  already_staked: "The gas wallet has already staked in this pool.",
  already_refunded: "The refund has already been claimed.",
  resolver_busy: "Another resolver transaction is running. Wait a minute and press again.",
  resolver_low_balance: "RESOLVER_KEY is below 0.05 SUI. Send it some SUI first.",
  not_a_drill_pool: "That pool is not marked as a drill.",
};
