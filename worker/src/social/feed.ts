// The feed: a public user's newest calls, kept in KV so followers can read them
// cheaply. Only calls that are already public ever get here.

import type { Env } from "../http";
import { teamKey } from "../recall/espn";
import { mergePicks } from "../recall/picks";
import type { PickRecord, Side } from "../recall/records";
import { leanSide, matchCalled, sameMatch } from "../recall/scoring";
import { kvPut } from "../store";
import {
  handleKey,
  recentKey,
  refuse,
  socialJson,
  userIndexKey,
  type ProfileIndex,
  type SocialContext,
} from "./context";
import { readFollowing, resolveFollowed, scoresByHandle } from "./follow";
import { isHidden, unlockKey } from "./premium";

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
  premium?: { priceMist: string };
  proof?: { digest: string; url: string };
}

/** What anyone may see of a premium call before kickoff: nothing that gives away the side. */
export interface LockedItem {
  pickId: string;
  fixture: Omit<FeedFixture, "subject">;
  at: string;
  premium: { priceMist: string };
  proof?: { digest: string; url: string };
  locked: true;
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
    ...(pick.premium ? { premium: pick.premium } : {}),
    ...(pick.commit
      ? {
          proof: {
            digest: pick.commit.digest,
            url: `https://suivision.xyz/txblock/${encodeURIComponent(pick.commit.digest)}`,
          },
        }
      : {}),
  };
}

export function lockItem(item: FeedItem): LockedItem {
  const { home, away, competition, startISO } = item.fixture;
  return {
    pickId: item.pickId,
    fixture: { home, away, competition, startISO },
    at: item.at,
    premium: item.premium as { priceMist: string },
    ...(item.proof ? { proof: item.proof } : {}),
    locked: true,
  };
}

export const isLockedItem = (item: FeedItem | LockedItem): item is LockedItem => (item as LockedItem).locked === true;

/** A public user's feed rebuilt from their record, for someone whose calls predate the feed. */
export function seedFeedItems(picks: PickRecord[], stakesMistByPick: Map<string, bigint>): FeedItem[] {
  return picks
    .flatMap((pick) => {
      const item = feedItemFor(pick);
      if (!item) return [];
      const stake = stakesMistByPick.get(pick.id);
      return [stake ? { ...item, stakeMist: stake.toString() } : item];
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_RECENT);
}

async function publicProfileOf(env: Env, userKey: string): Promise<ProfileIndex | null> {
  const handle = await env.SOOTHIA_CACHE.get(userIndexKey(userKey));
  return handle ? env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(handle), "json") : null;
}

/** The newest first, one entry per pick, no more than the limit. */
export function withItem(items: FeedItem[], item: FeedItem): FeedItem[] {
  return [item, ...items.filter((existing) => existing.pickId !== item.pickId)]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_RECENT);
}

const warn = (error: unknown): void =>
  console.warn(`Soothia: feed update failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);

const isPublicCall = (pick: PickRecord, profile: ProfileIndex): boolean =>
  profile.shareHistory || pick.at >= profile.publicSince;

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
  const followed = (await resolveFollowed(context, await readFollowing(context, userKey))).filter(
    (row) => row.handle !== null,
  ) as { address: string; handle: string }[];
  const lists = await Promise.all(
    followed.map(({ handle }) => context.env.SOOTHIA_CACHE.get<FeedItem[]>(recentKey(handle), "json")),
  );
  return followed.flatMap(({ handle }, index) => (lists[index] ?? []).map((item) => ({ handle, item })));
}

export interface VisibleItem {
  handle: string;
  item: FeedItem | LockedItem;
}

/** Locks every premium call this viewer hasn't bought, until kickoff. */
export async function visibleToViewer(
  context: Pick<SocialContext, "env">,
  userKey: string,
  items: FollowedItem[],
  nowMs: number,
): Promise<VisibleItem[]> {
  const hidden = items.filter(({ item }) => isHidden(item.premium, item.fixture.startISO, nowMs));
  const unlocked = await Promise.all(
    hidden.map(({ item }) => context.env.SOOTHIA_CACHE.get(unlockKey(userKey, item.pickId))),
  );
  const bought = new Set(hidden.filter((_, index) => unlocked[index] !== null).map(({ item }) => item.pickId));
  return items.map(({ handle, item }) => ({
    handle,
    item: isHidden(item.premium, item.fixture.startISO, nowMs) && !bought.has(item.pickId) ? lockItem(item) : item,
  }));
}

/** Everyone's items, newest first. */
export function mergeFeed<T extends { item: { at: string } }>(items: T[], limit = MAX_FEED): T[] {
  return [...items].sort((a, b) => b.item.at.localeCompare(a.item.at)).slice(0, limit);
}

export interface OpenFollowedCall {
  handle: string;
  lean: string;
  confidence: number;
  stakeMist: string | null;
  side: Side;
  pickId: string;
  fixture: FeedFixture;
  at: string;
  premium?: { priceMist: string };
}

export interface LockedFollowedCall {
  handle: string;
  pickId: string;
  fixture: Omit<FeedFixture, "subject">;
  at: string;
  premium: { priceMist: string };
  proof?: { digest: string; url: string };
  locked: true;
}

export type FollowedCall = OpenFollowedCall | LockedFollowedCall;

export const isOpenCall = (call: FollowedCall): call is OpenFollowedCall =>
  (call as LockedFollowedCall).locked !== true;

export function followedCallsOn(
  items: VisibleItem[],
  fixture: { home: string; away: string; startISO: string },
): FollowedCall[] {
  // One entry each: someone's newest call on the match.
  const seen = new Set<string>();
  return mergeFeed(items, Number.MAX_SAFE_INTEGER)
    .filter(({ handle, item }) => {
      if (seen.has(handle) || !sameMatch(fixture, item.fixture)) return false;
      seen.add(handle);
      return true;
    })
    .map(({ handle, item }) =>
      isLockedItem(item)
        ? {
            handle,
            pickId: item.pickId,
            fixture: item.fixture,
            at: item.at,
            premium: item.premium,
            ...(item.proof ? { proof: item.proof } : {}),
            locked: true as const,
          }
        : {
            handle,
            lean: item.lean,
            confidence: item.confidence,
            stakeMist: item.stakeMist ?? null,
            side: item.side,
            pickId: item.pickId,
            fixture: item.fixture,
            at: item.at,
            ...(item.premium ? { premium: item.premium } : {}),
          },
    );
}

/** What a call means regardless of how the match was listed: which team, and yes or no. */
export const leanKey = (fixture: { home: string; away: string; subject: "home" | "away" }, side: Side): string =>
  `${teamKey(fixture.subject === "home" ? fixture.home : fixture.away)}:${side}`;

export interface Consensus {
  key: string;
  lean: string;
  count: number;
  total: number;
  text: string;
}

/** The side most followed users took, or null when there's no single one. */
export function consensusOf(all: FollowedCall[]): Consensus | null {
  // A locked call must not move the count, or the count would give away its side.
  const calls = all.filter(isOpenCall);
  if (calls.length === 0) return null;
  const groups = new Map<string, OpenFollowedCall[]>();
  for (const call of calls) {
    const key = leanKey(call.fixture, call.side);
    groups.set(key, [...(groups.get(key) ?? []), call]);
  }
  const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  if (ranked.length > 1 && ranked[0][1].length === ranked[1][1].length) return null;
  const [key, group] = ranked[0];
  return {
    key,
    lean: group[0].lean,
    count: group.length,
    total: calls.length,
    text: `${group.length} of ${calls.length} say ${group[0].lean}`,
  };
}

/** Whether a new call goes with or against what the people followed have said. */
export function followedStance(
  fixture: FeedFixture | PickRecord["fixture"],
  pYes: number,
  calls: FollowedCall[],
): "with" | "against" | undefined {
  const consensus = consensusOf(calls);
  if (!consensus || !fixture) return undefined;
  return leanKey(fixture, pYes >= 0.5 ? "YES" : "NO") === consensus.key ? "with" : "against";
}

export async function feedRoute(context: SocialContext, userKey: string): Promise<Response> {
  const [raw, scores, picks] = await Promise.all([
    loadFollowedItems(context, userKey),
    scoresByHandle(context),
    // Used only to mark matches already called, so the feed survives without it.
    context
      .store(userKey)
      .list("pick")
      .then(mergePicks)
      .catch(() => [] as PickRecord[]),
  ]);
  const items = await visibleToViewer(context, userKey, mergeFeed(raw), context.nowMs);
  return socialJson(context, {
    items: items.map(({ handle, item }) => {
      const mine = matchCalled({ question: "", fixture: item.fixture }, picks);
      return {
        handle,
        score: scores.get(handle) ?? null,
        item,
        myCall: mine ? { side: mine.side, confidence: mine.confidence, pickId: mine.pickId } : null,
      };
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
