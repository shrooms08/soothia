// Following: Walrus Memory holds the record of who follows whom (newest per handle
// wins), and KV holds the list and the counts so reads stay cheap.

import { readJsonObject, type Env } from "../http";
import type { FollowRecord } from "../recall/records";
import { latestBy } from "../recall/scoring";
import { kvPut } from "../store";
import {
  addressKey,
  BOARDS_KEY,
  followersKey,
  followingKey,
  handleKey,
  parseAddress,
  parseHandle,
  refuse,
  socialJson,
  type ProfileIndex,
  type SocialContext,
} from "./context";
import type { BoardsDocument } from "./snapshots";

export const MAX_FOLLOWING = 100;
const MAX_SEARCH_RESULTS = 10;
const QUERY = /^[a-z0-9_]{1,20}$/;

/** Who is being followed, from the follow records: the newest record per person wins. */
export function followingFrom(records: FollowRecord[]): string[] {
  return [...latestBy(records, (record) => record.address ?? record.handle).entries()]
    .filter(([, record]) => record.kind === "follow")
    .map(([key]) => key)
    .sort();
}

// The full length, because a handle may also begin with 0x.
const isAddress = (value: string): boolean => /^0x[0-9a-f]{64}$/.test(value);

/**
 * The wallet addresses a user follows. Lists from before follows moved to addresses
 * hold handles: they are swapped here, once, so a recycled handle can't inherit them.
 */
export async function readFollowing(context: Pick<SocialContext, "env">, userKey: string): Promise<string[]> {
  const kv = context.env.SOOTHIA_CACHE;
  const stored = await kv.get<string[]>(followingKey(userKey), "json");
  if (!stored) return [];
  if (stored.every(isAddress)) return stored;
  const profiles = await Promise.all(
    stored.map((entry) => (isAddress(entry) ? null : kv.get<ProfileIndex>(handleKey(entry), "json"))),
  );
  const addresses = [
    ...new Set(
      stored.flatMap((entry, index) => (isAddress(entry) ? [entry] : profiles[index] ? [profiles[index].address] : [])),
    ),
  ].sort();
  await kvPut(context.env as Env, followingKey(userKey), JSON.stringify(addresses));
  return addresses;
}

export interface FollowedPerson {
  address: string;
  /** Null once they are no longer public. */
  handle: string | null;
}

/** Handles are looked up at read time, so a handle someone else takes doesn't carry followers. */
export async function resolveFollowed(
  context: Pick<SocialContext, "env">,
  addresses: string[],
): Promise<FollowedPerson[]> {
  const profiles = await Promise.all(
    addresses.map((address) => context.env.SOOTHIA_CACHE.get<ProfileIndex>(addressKey(address), "json")),
  );
  return addresses.map((address, index) => ({ address, handle: profiles[index]?.handle ?? null }));
}

async function saveFollowing(context: SocialContext, userKey: string, addresses: string[]): Promise<void> {
  if (!(await kvPut(context.env, followingKey(userKey), JSON.stringify(addresses)))) refuse(503, "kv_unavailable");
}

/** A count under the address, carrying over any from before follows moved to addresses. */
export async function followerCount(
  context: Pick<SocialContext, "env">,
  address: string,
  handle: string | null,
): Promise<number> {
  const kv = context.env.SOOTHIA_CACHE;
  const current = await kv.get(followersKey(address));
  if (current !== null) return Number(current) || 0;
  return handle ? Number(await kv.get(followersKey(handle))) || 0 : 0;
}

async function moveFollowerCount(
  context: SocialContext,
  address: string,
  handle: string | null,
  change: 1 | -1,
): Promise<void> {
  const count = await followerCount(context, address, handle);
  await kvPut(context.env, followersKey(address), String(Math.max(0, count + change)));
  if (handle) await context.env.SOOTHIA_CACHE.delete(followersKey(handle));
}

export async function followRoute(context: SocialContext, userKey: string): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const handle = parseHandle(body.handle);
  if (!handle) return refuse(400, "invalid_handle");
  const profile = await context.env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(handle), "json");
  if (!profile) return refuse(404, "not_found");
  if (profile.userKey === userKey) refuse(400, "cannot_follow_self");
  const following = await readFollowing(context, userKey);
  if (following.includes(profile.address)) return socialJson(context, { ok: true, following: true });
  if (following.length >= MAX_FOLLOWING) refuse(409, "follow_limit", { max: MAX_FOLLOWING });

  await context
    .store(userKey)
    .write("follow", { handle, address: profile.address, kind: "follow", at: new Date(context.nowMs).toISOString() });
  await saveFollowing(context, userKey, [...following, profile.address].sort());
  await moveFollowerCount(context, profile.address, handle, 1);
  return socialJson(context, { ok: true, following: true });
}

export async function unfollowRoute(context: SocialContext, userKey: string): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const handle = body.handle === undefined ? null : parseHandle(body.handle);
  if (body.handle !== undefined && !handle) return refuse(400, "invalid_handle");
  const profile = handle ? await context.env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(handle), "json") : null;
  const address = body.address !== undefined ? parseAddress(body.address) : (profile?.address ?? null);
  const following = await readFollowing(context, userKey);
  if (!address || !following.includes(address)) return socialJson(context, { ok: true, following: false });

  await context.store(userKey).write("follow", {
    handle: handle ?? profile?.handle ?? "",
    address,
    kind: "unfollow",
    at: new Date(context.nowMs).toISOString(),
  });
  await saveFollowing(
    context,
    userKey,
    following.filter((entry) => entry !== address),
  );
  await moveFollowerCount(context, address, handle ?? profile?.handle ?? null, -1);
  return socialJson(context, { ok: true, following: false });
}

export async function scoresByHandle(context: Pick<SocialContext, "env">): Promise<Map<string, number>> {
  const document = await context.env.SOOTHIA_CACHE.get<BoardsDocument>(BOARDS_KEY, "json");
  return new Map((document?.entries ?? []).map((entry) => [entry.handle, entry.periods.all.stats.score]));
}

export async function followingRoute(context: SocialContext, userKey: string): Promise<Response> {
  const kv = context.env.SOOTHIA_CACHE;
  if ((await kv.get(followingKey(userKey))) === null) {
    // The index is only a shortcut, so it can always be rebuilt from Walrus.
    await kvPut(
      context.env,
      followingKey(userKey),
      JSON.stringify(followingFrom(await context.store(userKey).list("follow"))),
    );
  }
  const [people, scores] = await Promise.all([
    readFollowing(context, userKey).then((addresses) => resolveFollowed(context, addresses)),
    scoresByHandle(context),
  ]);
  return socialJson(context, {
    following: people.map(({ address, handle }) => ({
      address,
      handle,
      score: handle ? (scores.get(handle) ?? null) : null,
      public: handle !== null,
    })),
  });
}

export async function searchRoute(context: SocialContext, userKey: string): Promise<Response> {
  const query = (new URL(context.request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!QUERY.test(query)) return refuse(400, "invalid_query");
  const prefix = handleKey(query);
  const [listed, scores, following] = await Promise.all([
    context.env.SOOTHIA_CACHE.list<{ address?: string }>({ prefix, limit: MAX_SEARCH_RESULTS }),
    scoresByHandle(context),
    readFollowing(context, userKey),
  ]);
  return socialJson(context, {
    results: listed.keys.map((key) => {
      const handle = key.name.slice(handleKey("").length);
      return {
        handle,
        score: scores.get(handle) ?? null,
        following: key.metadata?.address ? following.includes(key.metadata.address) : false,
      };
    }),
  });
}
