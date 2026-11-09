// The feed: a public user's newest calls, kept in KV so followers can read them
// cheaply. Only calls that are already public ever get here.

import type { Env } from "../http";
import { teamKey } from "../recall/espn";
import { mergePicks } from "../recall/picks";
import type { PickRecord, Side } from "../recall/records";
import { leanSide, matchCalled, sameMatch } from "../recall/scoring";
import { kvPut } from "../store";
import { handleKey, recentKey, refuse, socialJson, userIndexKey, type ProfileIndex, type SocialContext } from "./context";
import { readFollowing, scoresByHandle } from "./follow";

const MAX_RECENT = 50;
const MAX_FEED = 50;

export interface FeedFixture {
  home: string;
  away: string;
  competition: string | null;
  startISO: string;
  subject: "home" | "away";
}

export interface FeedItem {
  pickId: string;
  fixture: FeedFixture;
  lean: string;
  side: Side;
  confidence: number;
  /** MIST, as text. */
  stakeMist?: string;
  at: string;
  tailOf?: string;
}

export interface FollowedItem {
  handle: string;
  item: FeedItem;
}

export function feedItemFor(pick: PickRecord): FeedItem | null {
  if (!pick.fixture) return null;
  const { home, away, competition, startISO, subject } = pick.fixture;
  return {
    pickId: pick.id,
    fixture: { home, away, competition: competition ?? null, startISO, subject },
    lean: leanSide(pick),
    side: pick.pYes >= 0.5 ? "YES" : "NO",
    confidence: Math.round(Math.max(pick.pYes, 1 - pick.pYes) * 100),
    at: pick.at,
    ...(pick.tailOf ? { tailOf: pick.tailOf } : {}),
  };
}

async function publicProfileOf(env: Env, userKey: string): Promise<ProfileIndex | null> {
  const handle = await env.SOOTHIA_CACHE.get(userIndexKey(userKey));
  return handle ? env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(handle), "json") : null;
}

/** The newest first, one entry per pick, no more than the limit. */
export function withItem(items: FeedItem[], item: FeedItem): FeedItem[] {
  return [item, ...items.filter((existing) => existing.pickId !== item.pickId)].sort((a, b) => b.at.localeCompare(a.at)).slice(0, MAX_RECENT);
}

const warn = (error: unknown): void => console.warn(`Soothia: feed update failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);

const isPublicCall = (pick: PickRecord, profile: ProfileIndex): boolean => profile.shareHistory || pick.at >= profile.publicSince;

/** Adds a newly locked call to a public user's feed. Never fails the call. */
export async function pushPickToFeed(env: Env, userKey: string, pick: PickRecord): Promise<void> {
  try {
    const item = feedItemFor(pick);
    if (!item) return;
    const profile = await publicProfileOf(env, userKey);
    if (!profile || !isPublicCall(pick, profile)) return;
    const key = recentKey(profile.handle);
    const items = (await env.SOOTHIA_CACHE.get<FeedItem[]>(key, "json")) ?? [];
    await kvPut(env, key, JSON.stringify(withItem(items, item)));
  } catch (error) {
    warn(error);
  }
}

/** Adds a stake to its call in the feed. A stake can never make a private call public. */
export async function pushStakeToFeed(env: Env, userKey: string, pick: PickRecord, amountMist: bigint): Promise<void> {
  try {
    const profile = await publicProfileOf(env, userKey);
    const item = feedItemFor(pick);
    if (!profile || !item || !isPublicCall(pick, profile)) return;
    const key = recentKey(profile.handle);
    const items = (await env.SOOTHIA_CACHE.get<FeedItem[]>(key, "json")) ?? [];
    const known = items.find((existing) => existing.pickId === pick.id);
    const stakeMist = (BigInt(known?.stakeMist ?? "0") + amountMist).toString();
    await kvPut(env, key, JSON.stringify(withItem(items, { ...(known ?? item), stakeMist })));
  } catch (error) {
    warn(error);
  }
}

export async function loadFollowedItems(context: Pick<SocialContext, "env">, userKey: string): Promise<FollowedItem[]> {
  const handles = await readFollowing(context, userKey);
  const lists = await Promise.all(handles.map((handle) => context.env.SOOTHIA_CACHE.get<FeedItem[]>(recentKey(handle), "json")));
  return handles.flatMap((handle, index) => (lists[index] ?? []).map((item) => ({ handle, item })));
}

/** Everyone's items, newest first. */
export function mergeFeed(items: FollowedItem[], limit = MAX_FEED): FollowedItem[] {
  return [...items].sort((a, b) => b.item.at.localeCompare(a.item.at)).slice(0, limit);
}

export interface FollowedCall {
  handle: string;
  lean: string;
  confidence: number;
  stakeMist: string | null;
  side: Side;
  pickId: string;
  fixture: FeedFixture;
  at: string;
}

export function followedCallsOn(items: FollowedItem[], fixture: { home: string; away: string; startISO: string }): FollowedCall[] {
  // One entry each: someone's newest call on the match.
  const seen = new Set<string>();
  return mergeFeed(items, Number.MAX_SAFE_INTEGER)
    .filter(({ handle, item }) => {
      if (seen.has(handle) || !sameMatch(fixture, item.fixture)) return false;
      seen.add(handle);
      return true;
    })
    .map(({ handle, item }) => ({ handle, lean: item.lean, confidence: item.confidence, stakeMist: item.stakeMist ?? null, side: item.side, pickId: item.pickId, fixture: item.fixture, at: item.at }));
}

/** What a call means regardless of how the match was listed: which team, and yes or no. */
export const leanKey = (fixture: { home: string; away: string; subject: "home" | "away" }, side: Side): string => `${teamKey(fixture.subject === "home" ? fixture.home : fixture.away)}:${side}`;

export interface Consensus {
  key: string;
  lean: string;
  count: number;
  total: number;
  text: string;
}

/** The side most followed users took, or null when there's no single one. */
export function consensusOf(calls: FollowedCall[]): Consensus | null {
  if (calls.length === 0) return null;
  const groups = new Map<string, FollowedCall[]>();
  for (const call of calls) {
    const key = leanKey(call.fixture, call.side);
    groups.set(key, [...(groups.get(key) ?? []), call]);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (ranked.length > 1 && ranked[0][1].length === ranked[1][1].length) return null;
  const [key, group] = ranked[0];
  return { key, lean: group[0].lean, count: group.length, total: calls.length, text: `${group.length} of ${calls.length} say ${group[0].lean}` };
}

export async function feedRoute(context: SocialContext, userKey: string): Promise<Response> {
  const [items, scores, picks] = await Promise.all([
    loadFollowedItems(context, userKey),
    scoresByHandle(context),
    // Used only to mark matches already called, so the feed survives without it.
    context.store(userKey).list("pick").then(mergePicks).catch(() => [] as PickRecord[]),
  ]);
  return socialJson(context, {
    items: mergeFeed(items).map(({ handle, item }) => {
      const mine = matchCalled({ question: "", fixture: item.fixture }, picks);
      return { handle, score: scores.get(handle) ?? null, item, myCall: mine ? { side: mine.side, confidence: mine.confidence, pickId: mine.pickId } : null };
    }),
  });
}

/** How many followed calls are newer than `since`. KV only, for the orb's badge. */
export async function feedNewRoute(context: SocialContext, userKey: string): Promise<Response> {
  const since = Number(new URL(context.request.url).searchParams.get("since"));
  if (!Number.isFinite(since) || since < 0) return refuse(400, "invalid_since");
  const items = await loadFollowedItems(context, userKey);
  return socialJson(context, { count: items.filter(({ item }) => Date.parse(item.at) > since).length });
}
