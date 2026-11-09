// Following: Walrus Memory holds the record of who follows whom (newest per handle
// wins), and KV holds the list and the counts so reads stay cheap.

import { readJsonObject } from "../http";
import type { FollowRecord } from "../recall/records";
import { latestBy } from "../recall/scoring";
import { kvPut } from "../store";
import { BOARDS_KEY, followersKey, followingKey, handleKey, parseHandle, refuse, socialJson, type ProfileIndex, type SocialContext } from "./context";
import type { BoardsDocument } from "./snapshots";

export const MAX_FOLLOWING = 100;
const MAX_SEARCH_RESULTS = 10;
const QUERY = /^[a-z0-9_]{1,20}$/;

/** Who is being followed, from the follow records: the newest record per handle wins. */
export function followingFrom(records: FollowRecord[]): string[] {
  return [...latestBy(records, (record) => record.handle).values()]
    .filter((record) => record.kind === "follow")
    .map((record) => record.handle)
    .sort();
}

export const readFollowing = async (context: Pick<SocialContext, "env">, userKey: string): Promise<string[]> =>
  (await context.env.SOOTHIA_CACHE.get<string[]>(followingKey(userKey), "json")) ?? [];

async function saveFollowing(context: SocialContext, userKey: string, handles: string[]): Promise<void> {
  if (!(await kvPut(context.env, followingKey(userKey), JSON.stringify(handles)))) refuse(503, "kv_unavailable");
}

async function moveFollowerCount(context: SocialContext, handle: string, change: 1 | -1): Promise<void> {
  const key = followersKey(handle);
  const count = Number(await context.env.SOOTHIA_CACHE.get(key)) || 0;
  await kvPut(context.env, key, String(Math.max(0, count + change)));
}

function handleFromBody(body: Record<string, unknown>): string {
  const handle = parseHandle(body.handle);
  if (!handle) return refuse(400, "invalid_handle");
  return handle;
}

export async function followRoute(context: SocialContext, userKey: string): Promise<Response> {
  const handle = handleFromBody((await readJsonObject(context.request)) ?? refuse(400, "invalid_body"));
  const profile = await context.env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(handle), "json");
  if (!profile) return refuse(404, "not_found");
  if (profile.userKey === userKey) refuse(400, "cannot_follow_self");
  const following = await readFollowing(context, userKey);
  if (following.includes(handle)) return socialJson(context, { ok: true, following: true });
  if (following.length >= MAX_FOLLOWING) refuse(409, "follow_limit", { max: MAX_FOLLOWING });

  await context.store(userKey).write("follow", { handle, kind: "follow", at: new Date(context.nowMs).toISOString() });
  await saveFollowing(context, userKey, [...following, handle].sort());
  await moveFollowerCount(context, handle, 1);
  return socialJson(context, { ok: true, following: true });
}

export async function unfollowRoute(context: SocialContext, userKey: string): Promise<Response> {
  const handle = handleFromBody((await readJsonObject(context.request)) ?? refuse(400, "invalid_body"));
  const following = await readFollowing(context, userKey);
  if (!following.includes(handle)) return socialJson(context, { ok: true, following: false });

  await context.store(userKey).write("follow", { handle, kind: "unfollow", at: new Date(context.nowMs).toISOString() });
  await saveFollowing(context, userKey, following.filter((name) => name !== handle));
  await moveFollowerCount(context, handle, -1);
  return socialJson(context, { ok: true, following: false });
}

export async function scoresByHandle(context: Pick<SocialContext, "env">): Promise<Map<string, number>> {
  const document = await context.env.SOOTHIA_CACHE.get<BoardsDocument>(BOARDS_KEY, "json");
  return new Map((document?.entries ?? []).map((entry) => [entry.handle, entry.periods.all.stats.score]));
}

export async function followingRoute(context: SocialContext, userKey: string): Promise<Response> {
  const kv = context.env.SOOTHIA_CACHE;
  let handles = await kv.get<string[]>(followingKey(userKey), "json");
  if (handles === null) {
    // The index is only a shortcut, so it can always be rebuilt from Walrus.
    handles = followingFrom(await context.store(userKey).list("follow"));
    await kvPut(context.env, followingKey(userKey), JSON.stringify(handles));
  }
  const [scores, profiles] = await Promise.all([scoresByHandle(context), Promise.all(handles.map((handle) => kv.get(handleKey(handle))))]);
  return socialJson(context, {
    following: handles.map((handle, index) => ({ handle, score: scores.get(handle) ?? null, public: profiles[index] !== null })),
  });
}

export async function searchRoute(context: SocialContext, userKey: string): Promise<Response> {
  const query = (new URL(context.request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!QUERY.test(query)) return refuse(400, "invalid_query");
  const prefix = handleKey(query);
  const [listed, scores, following] = await Promise.all([context.env.SOOTHIA_CACHE.list({ prefix, limit: MAX_SEARCH_RESULTS }), scoresByHandle(context), readFollowing(context, userKey)]);
  return socialJson(context, {
    results: listed.keys.map((key) => {
      const handle = key.name.slice(handleKey("").length);
      return { handle, score: scores.get(handle) ?? null, following: following.includes(handle) };
    }),
  });
}
