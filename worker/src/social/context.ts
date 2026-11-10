// Public profiles: what the routes and the sweep share.

import { json, type Env } from "../http";
import type { RecallStore } from "../recall/memory";

export interface ProfileIndex {
  handle: string;
  address: string;
  userKey: string;
  publicSince: string;
  shareHistory: boolean;
}

export type SignatureVerifier = (message: Uint8Array, signature: string, address: string) => Promise<boolean>;
export type NameLookup = (address: string) => Promise<string | null>;

export interface SocialContext {
  request: Request;
  env: Env;
  nowMs: number;
  verify: SignatureVerifier;
  lookupName: NameLookup;
  store: (userKey: string) => RecallStore;
}

export class SocialRefusal extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(code);
  }
}

export const refuse = (status: number, code: string, extra: Record<string, unknown> = {}): never => {
  throw new SocialRefusal(status, code, extra);
};

const HANDLE = /^[a-z0-9_]{3,20}$/;
const ADDRESS = /^0x[0-9a-f]{64}$/i;

export const handleKey = (handle: string): string => `profile:${handle}`;
export const addressKey = (address: string): string => `profileaddr:${address}`;
export const userIndexKey = (userKey: string): string => `profileuser:${userKey}`;
export const statsKey = (handle: string): string => `socialstats:${handle}`;
export const followingKey = (userKey: string): string => `following:${userKey}`;
export const followersKey = (handle: string): string => `followers:${handle}`;
export const recentKey = (handle: string): string => `recent:${handle}`;
export const BOARDS_KEY = "social:boards";
export const HIDDEN_KEY = "social:hidden";

export function parseHandle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const handle = value.trim().toLowerCase();
  return HANDLE.test(handle) ? handle : null;
}

export function parseAddress(value: unknown, code = "invalid_address"): string {
  if (typeof value !== "string" || !ADDRESS.test(value)) refuse(400, code);
  return (value as string).toLowerCase();
}

/** What may be shown to anyone: never the user key. */
export const publicProfile = (profile: ProfileIndex) => ({
  handle: profile.handle,
  address: profile.address,
  publicSince: profile.publicSince,
  shareHistory: profile.shareHistory,
});

export const socialJson = (context: SocialContext, body: unknown, status = 200): Response =>
  json(context.request, body, status);
