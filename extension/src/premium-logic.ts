// x402 from the client's side, and the rules the agent wallet follows. Shared by the
// content script (a wallet signs) and the background (the agent key signs).

import { PAY_CONFIG, PAY_PACKAGE } from "./config";
import type { FeedEntry, FeedItem, LockedFeedItem } from "./social-logic";
import { formatSui, parseSuiAmount } from "./stake-logic";
import type { ExpectedTx } from "./tx-check";

const NETWORK = "sui:mainnet";
const ASSET = "0x2::sui::SUI";
const ADDRESS = /^0x[0-9a-f]{64}$/i;
const NONCE = /^[0-9a-f]{32}$/;
const AMOUNT = /^[1-9][0-9]{0,18}$/;

export const PREMIUM_PRICES = ["0.01", "0.02", "0.05", "0.1"];
export const MIN_PREMIUM_MIST = 10_000_000n;
export const MAX_PREMIUM_MIST = 500_000_000n;

/** No setting can raise what the agent pays for one call above this. */
export const AGENT_HARD_CAP_MIST = 100_000_000n;
export const AGENT_DEFAULT_BUDGET_MIST = 200_000_000n;
export const AGENT_DEFAULT_MAX_MIST = 50_000_000n;
const AGENT_MAX_BUDGET_MIST = 10_000_000_000n;
const AGENT_MIN_MIST = 10_000_000n;
/** Each payment takes a few seconds, and a service worker can't run for long. */
export const AGENT_MAX_PER_RUN = 3;
const KICKOFF_MARGIN_MS = 120_000;

export const premiumLine = (priceMist: string): string => `Premium · ${formatSui(priceMist, 4)} SUI`;

/** A custom price in MIST, or null outside 0.01 to 0.5 SUI. */
export function parsePremiumPrice(text: string): bigint | null {
  const mist = parseSuiAmount(text);
  return mist !== null && mist >= MIN_PREMIUM_MIST && mist <= MAX_PREMIUM_MIST ? mist : null;
}

export interface Requirement {
  accepted: Record<string, unknown>;
  amount: string;
  payTo: string;
  nonce: string;
  resource: unknown;
}

/** The payment asked for, or null unless it is exactly the kind Soothia makes. */
export function readRequirement(header: string | null): Requirement | null {
  if (!header) return null;
  let parsed: { x402Version?: unknown; accepts?: unknown; resource?: unknown };
  try {
    parsed = JSON.parse(atob(header)) as typeof parsed;
  } catch {
    return null;
  }
  if (parsed.x402Version !== 2 || !Array.isArray(parsed.accepts)) return null;
  const accepted = parsed.accepts[0] as Record<string, unknown> | undefined;
  const extra = accepted?.extra as Record<string, unknown> | undefined;
  if (!accepted || !extra) return null;
  const { scheme, network, asset, amount, payTo } = accepted;
  if (scheme !== "exact" || network !== NETWORK || asset !== ASSET) return null;
  if (extra.payPackage !== PAY_PACKAGE || extra.payConfig !== PAY_CONFIG) return null;
  if (typeof amount !== "string" || !AMOUNT.test(amount)) return null;
  if (typeof payTo !== "string" || !ADDRESS.test(payTo)) return null;
  if (typeof extra.nonce !== "string" || !NONCE.test(extra.nonce)) return null;
  return { accepted, amount, payTo, nonce: extra.nonce, resource: parsed.resource };
}

export function paymentHeader(requirement: Requirement, signed: { bytes: string; signature: string }): string {
  return btoa(JSON.stringify({ x402Version: 2, resource: requirement.resource, accepted: requirement.accepted, payload: { signature: signed.signature, transaction: signed.bytes } }));
}

export interface PremiumCallResponse {
  status: number;
  /** The PAYMENT-REQUIRED header. */
  required: string | null;
  body: unknown;
}

export interface UnlockReceipt {
  digest: string;
  priceMist: string;
  at: string;
  url: string;
}

export interface UnlockDeps {
  /** Asks for the call, with a payment header once there is one. */
  fetchCall(payment?: string): Promise<PremiumCallResponse>;
  build(): Promise<string>;
  sign(txBytes: string, expected: ExpectedTx): Promise<{ bytes: string; signature: string }>;
  /** What the user was shown. A quote for anything else is refused. */
  expectedPriceMist: string;
}

export type UnlockResult =
  | { ok: true; handle: string; call: FeedItem; receipt: UnlockReceipt | null }
  | {
      ok: false;
      code: string;
      /** The wallet's own words, when it was the wallet that stopped. */
      walletMessage?: string;
      /** The payment may have gone through, so it must not be counted as refunded. */
      maybePaid: boolean;
    };

const failed = (code: string, maybePaid = false): UnlockResult => ({ ok: false, code, maybePaid });
const message = (error: unknown): string => String((error as Error)?.message ?? error);
const opened = (response: PremiumCallResponse): UnlockResult => {
  const body = response.body as { handle: string; call: FeedItem; receipt: UnlockReceipt | null };
  return { ok: true, handle: body.handle, call: body.call, receipt: body.receipt ?? null };
};

/** The x402 round trip: ask, check what is being asked for, sign, retry. */
export async function runUnlock(deps: UnlockDeps): Promise<UnlockResult> {
  const first = await deps.fetchCall();
  if (first.status === 200) return opened(first);
  if (first.status !== 402) return failed((first.body as { error?: string } | null)?.error ?? "unavailable");

  const requirement = readRequirement(first.required);
  if (!requirement) return failed("bad_requirements");
  if (requirement.amount !== deps.expectedPriceMist) return failed("price_changed");

  let signed: { bytes: string; signature: string };
  try {
    const txBytes = await deps.build();
    signed = await deps.sign(txBytes, { kind: "pay", nonce: requirement.nonce, recipient: requirement.payTo, priceMist: requirement.amount });
  } catch (error) {
    const text = message(error);
    if (/^[a-z_]+$/.test(text)) return failed(text);
    return { ok: false, code: "wallet", walletMessage: text, maybePaid: false };
  }

  let second: PremiumCallResponse;
  try {
    second = await deps.fetchCall(paymentHeader(requirement, signed));
  } catch {
    return failed("network", true);
  }
  if (second.status === 200) return opened(second);
  if (second.status === 0) return failed("network", true);
  const reason = (second.body as { reason?: string; error?: string } | null)?.reason ?? (second.body as { error?: string } | null)?.error ?? "unavailable";
  return failed(reason, reason === "broadcast_failed" || reason === "no_payment_event");
}

export function unlockFailureText(result: Extract<UnlockResult, { ok: false }>, walletText: (message: string) => string): string {
  if (result.walletMessage !== undefined) return walletText(result.walletMessage);
  switch (result.code) {
    case "insufficient_balance":
      return "Not enough SUI to pay for this and gas.";
    case "price_changed":
      return "The price changed. Refresh and try again.";
    case "bad_requirements":
      return "Soothia refused this payment request. Nothing was paid.";
    case "premium_no_proof":
      return "This call has no proof on Sui, so it can't be sold.";
    case "premium_unavailable":
      return "This call isn't for sale any more.";
    case "not_found":
      return "That call has gone.";
    case "nonce_used":
    case "nonce_expired":
      return "That payment request ran out. Try again.";
    case "payment_in_progress":
      return "That payment is still going through. Give it a moment.";
    case "transaction_failed":
      return "The transaction failed on Sui. The call stays locked.";
    case "broadcast_failed":
    case "network":
      return "It's unclear whether that went through. Check your wallet before trying again.";
    default:
      return "That didn't work. Nothing was unlocked.";
  }
}

export interface AgentSettings {
  enabled: boolean;
  dailyBudgetMist: string;
  maxPerCallMist: string;
}

export interface AgentSpend {
  day: string;
  spentMist: string;
}

export interface AgentReceipt {
  at: string;
  handle: string;
  match: string;
  priceMist: string;
  digest: string;
}

export interface AgentStatus {
  address: string | null;
  balanceMist: string | null;
  settings: AgentSettings;
  spentTodayMist: string;
  receipts: AgentReceipt[];
}

export const DEFAULT_AGENT_SETTINGS: AgentSettings = { enabled: false, dailyBudgetMist: AGENT_DEFAULT_BUDGET_MIST.toString(), maxPerCallMist: AGENT_DEFAULT_MAX_MIST.toString() };

const mistOr = (value: unknown, fallback: bigint, max: bigint): bigint => {
  if (typeof value !== "string" || !AMOUNT.test(value)) return fallback;
  const mist = BigInt(value);
  return mist < AGENT_MIN_MIST || mist > max ? fallback : mist;
};

/** Saved or submitted settings, with anything out of range replaced by the default. */
export function cleanAgentSettings(raw: unknown): AgentSettings {
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    dailyBudgetMist: mistOr(value.dailyBudgetMist, AGENT_DEFAULT_BUDGET_MIST, AGENT_MAX_BUDGET_MIST).toString(),
    maxPerCallMist: mistOr(value.maxPerCallMist, AGENT_DEFAULT_MAX_MIST, AGENT_HARD_CAP_MIST).toString(),
  };
}

export const utcDay = (nowMs: number): string => new Date(nowMs).toISOString().slice(0, 10);

/** What the agent has spent today. Yesterday's total doesn't count. */
export function spentToday(spend: AgentSpend | null | undefined, nowMs: number): bigint {
  return spend?.day === utcDay(nowMs) && AMOUNT.test(spend.spentMist) ? BigInt(spend.spentMist) : 0n;
}

export const isLockedItem = (item: FeedItem | LockedFeedItem): item is LockedFeedItem => (item as LockedFeedItem).locked === true;

export interface AgentCandidate {
  handle: string;
  item: LockedFeedItem;
}

/** The locked calls the agent may buy now, inside the per-call cap and the day's budget. */
export function agentCandidates(entries: Pick<FeedEntry, "handle" | "item">[], settings: AgentSettings, spentMist: bigint, nowMs: number): AgentCandidate[] {
  if (!settings.enabled) return [];
  const perCall = BigInt(settings.maxPerCallMist) < AGENT_HARD_CAP_MIST ? BigInt(settings.maxPerCallMist) : AGENT_HARD_CAP_MIST;
  let left = BigInt(settings.dailyBudgetMist) - spentMist;
  const chosen: AgentCandidate[] = [];
  for (const { handle, item } of entries) {
    if (chosen.length >= AGENT_MAX_PER_RUN) break;
    if (!isLockedItem(item) || !item.proof || Date.parse(item.fixture.startISO) - nowMs <= KICKOFF_MARGIN_MS) continue;
    const price = BigInt(item.premium.priceMist);
    if (price > perCall || price > left) continue;
    left -= price;
    chosen.push({ handle, item });
  }
  return chosen;
}
