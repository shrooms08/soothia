// The pure logic behind the Social tab, tile lines and the orb's badge.

import type { FixtureSignal, Tile } from "./messages";
import { formatSui, MIN_KICKOFF_LEAD_MS } from "./stake-logic";
import type { CallSide } from "./recall-logic";

export interface FeedFixture {
  home: string;
  away: string;
  competition: string | null;
  startISO: string;
  subject: "home" | "away";
}

/** A followed user's call, as much as tailing it needs. */
export interface TailSource {
  fixture: FeedFixture;
  side: "YES" | "NO";
  confidence: number;
}

export interface FeedItem extends TailSource {
  pickId: string;
  lean: string;
  stakeMist?: string;
  at: string;
  tailOf?: string;
  premium?: { priceMist: string };
  proof?: { digest: string; url: string };
}

/** A premium call before kickoff: the match, the price and the proof, and no side. */
export interface LockedFeedItem {
  pickId: string;
  fixture: Omit<FeedFixture, "subject">;
  at: string;
  premium: { priceMist: string };
  proof?: { digest: string; url: string };
  locked: true;
}

export interface FeedEntry {
  handle: string;
  score: number | null;
  item: FeedItem | LockedFeedItem;
  myCall: { side: string; confidence: number; pickId: string } | null;
}

export interface OpenFollowedCall extends TailSource {
  handle: string;
  lean: string;
  stakeMist: string | null;
  pickId: string;
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

export const isLockedCall = (call: FollowedCall): call is LockedFollowedCall => (call as LockedFollowedCall).locked === true;

export interface ConsensusView {
  lean: string;
  count: number;
  total: number;
  text: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function timeAgo(atMs: number, nowMs: number): string {
  const gap = nowMs - atMs;
  if (gap < MINUTE) return "just now";
  if (gap < HOUR) return `${Math.floor(gap / MINUTE)}m ago`;
  if (gap < DAY) return `${Math.floor(gap / HOUR)}h ago`;
  return `${Math.floor(gap / DAY)}d ago`;
}

export const initials = (handle: string): string => handle.replace(/_/g, "").slice(0, 2).toUpperCase();

export const handleLine = (handle: string, score: number | null): string => (score === null ? `@${handle}` : `@${handle} · ${score}`);

export const matchLine = (fixture: Pick<FeedFixture, "home" | "away">): string => `${fixture.home} v ${fixture.away}`;

/** "Arsenal win · 70% · 1 SUI". */
export function callLine(lean: string, confidence: number, stakeMist?: string | null): string {
  return `${lean} · ${confidence}%${stakeMist ? ` · ${formatSui(stakeMist, 4)} SUI` : ""}`;
}

export const canTail = (fixture: Pick<FeedFixture, "startISO">, nowMs: number): boolean => Date.parse(fixture.startISO) - nowMs > MIN_KICKOFF_LEAD_MS;

/** "@ada and @tunde called this · 2 say Arsenal win". */
export function followedLine(calls: Pick<FollowedCall, "handle">[], consensus: ConsensusView | null): string {
  const names = calls.map((call) => `@${call.handle}`);
  const who = names.length <= 2 ? names.join(" and ") : `${names[0]}, ${names[1]} and ${names.length - 2} more`;
  return `${who} called this${consensus ? ` · ${consensus.count} say ${consensus.lean}` : ""}`;
}

const MIN_PERCENT = 51;
const MAX_PERCENT = 99;

export interface TailPrefill {
  side: CallSide;
  percent: number;
  tailOf: string;
}

const LONG_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** The tile and sheet settings for tailing a call, including with no match page open. */
export function tailSheetFor(handle: string, source: TailSource): { tile: Tile; fixture: FixtureSignal; prefill: TailPrefill } {
  const { home, away, competition, startISO, subject } = source.fixture;
  const [team, other] = subject === "home" ? [home, away] : [away, home];
  const dateLabel = LONG_DATE.format(new Date(startISO));
  return {
    tile: {
      claim: {
        id: `tail:${handle}:${startISO}`,
        question: `Will ${team} beat ${other}${competition ? ` in ${competition}` : ""} on ${dateLabel}?`,
        category: "sports",
        endTime: startISO,
        resolution: { type: "sports_result", details: "", sources: [] },
        confidence: 1,
        sourceQuote: "",
        fromFixture: true,
      },
    },
    fixture: { home, away, ...(competition ? { competition } : {}), startISO, dateLabel, sourceUrl: `https://soothia.fun/u/${handle}`, evidence: [] },
    prefill: { side: source.side === "YES" ? "yes" : "no", percent: Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, source.confidence)), tailOf: handle },
  };
}

/** The orb's badge: nothing at zero, and "9+" past nine. */
export const badgeText = (count: number): string | null => (count <= 0 ? null : count > 9 ? "9+" : String(count));

export interface FeedCheck {
  at: number;
  seen: number;
  count: number;
}

export const FEED_CHECK_MS = 180_000;

/** A recent check for the same last-seen time can stand in for asking again. */
export function cachedFeedCount(check: FeedCheck | null | undefined, seen: number, nowMs: number): number | null {
  return check && check.seen === seen && nowMs - check.at < FEED_CHECK_MS ? check.count : null;
}

/** Distinct people called something on this page. */
export function pageFollowedCount(callsByClaim: (FollowedCall[] | undefined)[]): number {
  return new Set(callsByClaim.flatMap((calls) => (calls ?? []).map((call) => call.handle))).size;
}
