// Premium calls: who may make one, and what everyone else sees before kickoff.

import type { Env } from "../http";
import type { ScoreboardFetcher } from "../recall/espn";
import { checkUpcomingFixture, fixtureRefusalStatus } from "../recall/fixture-check";
import type { PickInput } from "../recall/picks";
import { kvPut } from "../store";
import { HIDDEN_KEY, statsKey, handleKey, userIndexKey, type ProfileIndex } from "./context";
import type { FeedItem } from "./feed";

export const MIN_PRICE_MIST = 10_000_000n;
export const MAX_PRICE_MIST = 500_000_000n;
export const MIN_PREMIUM_SCORE = 550;
export const MIN_PREMIUM_SETTLED = 10;
const ENTRY_AFTER_KICKOFF_SEC = 30 * 86_400;

export const premiumKey = (pickId: string): string => `premium:${pickId}`;
export const unlockKey = (userKey: string, pickId: string): string => `unlock:${userKey}:${pickId}`;
export const earningsKey = (address: string): string => `earnings:${address}`;

/** What the x402 route needs to sell a call. */
export interface PremiumEntry {
  pickId: string;
  handle: string;
  payTo: string;
  userKey: string;
  priceMist: string;
  kickoffMs: number;
  /** The whole call, only ever sent to someone entitled to it. */
  item: FeedItem;
}

export interface Eligibility {
  eligible: boolean;
  handle: string | null;
  address: string | null;
  score: number | null;
  settled: number;
  reason: "not_public" | "score_too_low" | "too_few_settled" | null;
}

/** Needs a public profile with a Call Score of 550 and 10 settled, proven calls. */
export async function premiumEligibility(env: Env, userKey: string): Promise<Eligibility> {
  const kv = env.SOOTHIA_CACHE;
  const handle = await kv.get(userIndexKey(userKey));
  const [profile, hidden] = await Promise.all([
    handle ? kv.get<ProfileIndex>(handleKey(handle), "json") : null,
    kv.get<{ handle: string }[]>(HIDDEN_KEY, "json"),
  ]);
  // Someone taken off the public pages has no public score to sell on.
  if (!profile || hidden?.some((entry) => entry.handle === profile.handle))
    return { eligible: false, handle: null, address: null, score: null, settled: 0, reason: "not_public" };
  const snapshot = await kv.get<{ periods: { all: { stats: { score: number; settled: number } } } }>(
    statsKey(profile.handle),
    "json",
  );
  const score = snapshot?.periods.all.stats.score ?? null;
  const settled = snapshot?.periods.all.stats.settled ?? 0;
  const reason =
    settled < MIN_PREMIUM_SETTLED ? "too_few_settled" : (score ?? 0) < MIN_PREMIUM_SCORE ? "score_too_low" : null;
  return { eligible: reason === null, handle: profile.handle, address: profile.address, score, settled, reason };
}

export function parsePriceMist(value: unknown): bigint | null {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !/^[1-9][0-9]{0,18}$/.test(text)) return null;
  const price = BigInt(text);
  return price >= MIN_PRICE_MIST && price <= MAX_PRICE_MIST ? price : null;
}

export const isHidden = (premium: { priceMist: string } | undefined, startISO: string, nowMs: number): boolean =>
  premium !== undefined && nowMs < Date.parse(startISO);

export interface Seller {
  handle: string;
  address: string;
  kickoffMs: number;
}

export type PremiumCheck =
  { ok: true; input: PickInput; seller: Seller } | { ok: false; status: number; body: Record<string, unknown> };

/** Whether this call may be premium, with the kickoff replaced by ESPN's: it decides when the call reveals. */
export async function preparePremium(
  env: Env,
  userKey: string,
  input: PickInput,
  priceMist: bigint,
  fetcher: ScoreboardFetcher,
  nowMs: number,
): Promise<PremiumCheck> {
  if (!input.fixture) return { ok: false, status: 400, body: { error: "premium_needs_match" } };
  const eligibility = await premiumEligibility(env, userKey);
  if (!eligibility.eligible)
    return { ok: false, status: 403, body: { error: "premium_not_eligible", reason: eligibility.reason } };
  const check = await checkUpcomingFixture(input.fixture, fetcher, nowMs);
  if (!check.ok) return { ok: false, status: fixtureRefusalStatus(check.code), body: { error: check.code } };
  const { startISO } = check.located.event;
  return {
    ok: true,
    input: { ...input, fixture: { ...input.fixture, startISO }, premium: { priceMist: priceMist.toString() } },
    seller: {
      handle: eligibility.handle as string,
      address: eligibility.address as string,
      kickoffMs: Date.parse(startISO),
    },
  };
}

export async function savePremiumEntry(env: Env, entry: PremiumEntry, nowMs: number): Promise<boolean> {
  const ttl = Math.max(60, Math.ceil((entry.kickoffMs - nowMs) / 1000) + ENTRY_AFTER_KICKOFF_SEC);
  return kvPut(env, premiumKey(entry.pickId), JSON.stringify(entry), { expirationTtl: ttl });
}
