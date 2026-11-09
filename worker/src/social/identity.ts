// Public profiles: going public, changing it and leaving, each proven by a wallet
// signature over a one-time message. A signature only answers the action it was
// asked for, so one taken for publishing can't be replayed to unpublish.

import { readJsonObject } from "../http";
import { kvPut } from "../store";
import { addressKey, handleKey, HIDDEN_KEY, parseAddress, parseHandle, publicProfile, refuse, socialJson, statsKey, userIndexKey, type ProfileIndex, type SocialContext } from "./context";

export const CHALLENGE_TTL_SEC = 600;
const ACTIONS = ["publish", "update", "unpublish"] as const;
type Action = (typeof ACTIONS)[number];

interface Challenge {
  action: Action;
  message: string;
  expiresAt: number;
}

const challengeKey = (address: string): string => `socialchallenge:${address}`;

export async function challengeRoute(context: SocialContext): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const address = parseAddress(body.address);
  const action = (body.action ?? "publish") as Action;
  if (!ACTIONS.includes(action)) refuse(400, "invalid_action");
  const expiresAt = context.nowMs + CHALLENGE_TTL_SEC * 1000;
  const message = [
    "Soothia: confirm you own this wallet.",
    "This is not a transaction and costs nothing.",
    "",
    `Action: ${action}`,
    `Address: ${address}`,
    `Nonce: ${crypto.randomUUID()}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");
  const challenge: Challenge = { action, message, expiresAt };
  if (!(await kvPut(context.env, challengeKey(address), JSON.stringify(challenge), { expirationTtl: CHALLENGE_TTL_SEC }))) refuse(503, "kv_unavailable");
  return socialJson(context, { message, expiresAt });
}

/** Checks the signature against this address's open challenge, and uses the challenge up. */
async function consumeChallenge(context: SocialContext, address: string, action: Action, signature: unknown): Promise<void> {
  if (typeof signature !== "string" || signature.length === 0 || signature.length > 20_000) refuse(400, "invalid_signature");
  const key = challengeKey(address);
  const challenge = await context.env.SOOTHIA_CACHE.get<Challenge>(key, "json");
  if (!challenge || challenge.expiresAt <= context.nowMs) return refuse(401, "challenge_expired");
  if (challenge.action !== action) refuse(401, "challenge_expired");
  if (!(await context.verify(new TextEncoder().encode(challenge.message), signature as string, address))) refuse(401, "invalid_signature");
  await context.env.SOOTHIA_CACHE.delete(key);
}

async function hiddenHandles(context: SocialContext): Promise<{ handle: string; at: number }[]> {
  return (await context.env.SOOTHIA_CACHE.get<{ handle: string; at: number }[]>(HIDDEN_KEY, "json")) ?? [];
}

/** Takes a handle off the leaderboards at once, ahead of the next snapshot. */
async function hide(context: SocialContext, handle: string): Promise<void> {
  const others = (await hiddenHandles(context)).filter((entry) => entry.handle !== handle);
  await kvPut(context.env, HIDDEN_KEY, JSON.stringify([...others, { handle, at: context.nowMs }]));
}

async function unhide(context: SocialContext, handle: string): Promise<void> {
  const current = await hiddenHandles(context);
  if (current.some((entry) => entry.handle === handle)) await kvPut(context.env, HIDDEN_KEY, JSON.stringify(current.filter((entry) => entry.handle !== handle)));
}

async function writeIndex(context: SocialContext, profile: ProfileIndex): Promise<void> {
  const value = JSON.stringify(profile);
  const metadata = { address: profile.address, userKey: profile.userKey };
  const saved =
    (await kvPut(context.env, handleKey(profile.handle), value, { metadata })) &&
    (await kvPut(context.env, addressKey(profile.address), value)) &&
    (await kvPut(context.env, userIndexKey(profile.userKey), profile.handle));
  if (!saved) refuse(503, "kv_unavailable");
}

const loadByAddress = (context: SocialContext, address: string): Promise<ProfileIndex | null> => context.env.SOOTHIA_CACHE.get<ProfileIndex>(addressKey(address), "json");

export async function publishRoute(context: SocialContext, userKey: string): Promise<Response> {
  const { env, nowMs } = context;
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const handle = parseHandle(body.handle);
  if (!handle) return refuse(400, "invalid_handle");
  const address = parseAddress(body.address);

  // Checked first, so a taken handle doesn't use up the signature.
  if (await loadByAddress(context, address)) refuse(409, "already_public");
  if ((await env.SOOTHIA_CACHE.get(handleKey(handle))) !== null) refuse(409, "handle_taken");
  // One record, one profile: otherwise the same calls could fill the boards twice.
  if ((await env.SOOTHIA_CACHE.get(userIndexKey(userKey))) !== null) refuse(409, "record_already_public");
  await consumeChallenge(context, address, "publish", body.signature);

  const publicSince = new Date(nowMs).toISOString();
  await context.store(userKey).write("profile", { address, handle, publicSince, shareHistory: false });
  const profile: ProfileIndex = { handle, address, userKey, publicSince, shareHistory: false };
  await writeIndex(context, profile);
  await unhide(context, handle);
  return socialJson(context, { ok: true, profile: publicProfile(profile) });
}

export async function updateRoute(context: SocialContext): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const address = parseAddress(body.address);
  if (typeof body.shareHistory !== "boolean") return refuse(400, "invalid_share_history");
  const profile = await loadByAddress(context, address);
  if (!profile) return refuse(404, "not_public");
  await consumeChallenge(context, address, "update", body.signature);

  const next: ProfileIndex = { ...profile, shareHistory: body.shareHistory };
  await context.store(profile.userKey).write("profile", { address, handle: profile.handle, publicSince: profile.publicSince, shareHistory: next.shareHistory });
  await writeIndex(context, next);
  if (!next.shareHistory) {
    // Older calls must disappear now, not at the next snapshot.
    await context.env.SOOTHIA_CACHE.delete(statsKey(profile.handle));
    await hide(context, profile.handle);
  }
  return socialJson(context, { ok: true, profile: publicProfile(next) });
}

export async function unpublishRoute(context: SocialContext): Promise<Response> {
  const { env } = context;
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const address = parseAddress(body.address);
  const profile = await loadByAddress(context, address);
  if (!profile) return refuse(404, "not_public");
  await consumeChallenge(context, address, "unpublish", body.signature);

  await context.store(profile.userKey).write("profile", { address, handle: profile.handle, publicSince: profile.publicSince, shareHistory: profile.shareHistory, unpublished: true });
  await Promise.all([handleKey(profile.handle), addressKey(address), userIndexKey(profile.userKey), statsKey(profile.handle)].map((key) => env.SOOTHIA_CACHE.delete(key)));
  await hide(context, profile.handle);
  return socialJson(context, { ok: true });
}

export async function byAddressRoute(context: SocialContext): Promise<Response> {
  const address = parseAddress(new URL(context.request.url).searchParams.get("address"));
  const profile = await loadByAddress(context, address);
  if (!profile) return socialJson(context, { public: false });
  // So the extension shows the same score as the public page.
  const snapshot = await context.env.SOOTHIA_CACHE.get<{ periods: { all: { stats: { score: number } } } }>(statsKey(profile.handle), "json");
  return socialJson(context, { public: true, profile: publicProfile(profile), score: snapshot?.periods.all.stats.score ?? null });
}

/** "alice.sui" or "@alice" to a usable handle, or null. Only the first label of a subname. */
export function handleFromName(name: string | null): string | null {
  if (!name) return null;
  const label = name.replace(/^@/, "").split(/[.@]/)[0].toLowerCase().replace(/-/g, "_");
  return parseHandle(label);
}

export async function suinsRoute(context: SocialContext): Promise<Response> {
  const address = parseAddress(new URL(context.request.url).searchParams.get("address"));
  // A suggestion only, so a failed lookup is the same as no name.
  const name = await context.lookupName(address).catch(() => null);
  return socialJson(context, { name, suggestion: handleFromName(name) });
}
