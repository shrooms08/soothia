// Tailing: copying a followed user's call, including from the feed with no match page
// open. So the source call is looked up here rather than taken from the client, and
// the kickoff comes from ESPN just as it does when a pool is created.

import type { Env } from "../http";
import { teamKey, type ScoreboardFetcher } from "../recall/espn";
import { checkUpcomingFixture, fixtureRefusalStatus } from "../recall/fixture-check";
import type { PickInput } from "../recall/picks";
import { sameMatch } from "../recall/scoring";
import { recentKey, userIndexKey } from "./context";
import type { FeedItem } from "./feed";

const MATCH_LENGTH_MS = 3 * 3_600_000;

export interface TailRequest {
  handle: string;
  /** The user chose the other side on purpose. */
  flip: boolean;
}

export type TailResult = { ok: true; input: PickInput } | { ok: false; status: number; code: string };

const subjectTeam = (fixture: { home: string; away: string; subject: "home" | "away" }): string => teamKey(fixture.subject === "home" ? fixture.home : fixture.away);

/** Checks a tail against its source call and returns the pick to save. */
export async function applyTail(env: Env, input: PickInput, tail: TailRequest, userKey: string, fetcher: ScoreboardFetcher, nowMs: number): Promise<TailResult> {
  const { fixture } = input;
  if (!fixture) return { ok: false, status: 400, code: "tail_needs_match" };
  if ((await env.SOOTHIA_CACHE.get(userIndexKey(userKey))) === tail.handle) return { ok: false, status: 400, code: "cannot_tail_self" };

  const items = (await env.SOOTHIA_CACHE.get<FeedItem[]>(recentKey(tail.handle), "json")) ?? [];
  const source = items.filter((item) => sameMatch(fixture, item.fixture)).sort((a, b) => b.at.localeCompare(a.at))[0];
  if (!source) return { ok: false, status: 404, code: "tail_source_not_found" };
  if (subjectTeam(fixture) !== subjectTeam(source.fixture)) return { ok: false, status: 400, code: "tail_wrong_question" };
  const side = input.pYes >= 0.5 ? "YES" : "NO";
  if (side !== source.side && !tail.flip) return { ok: false, status: 400, code: "tail_side_mismatch" };

  const check = await checkUpcomingFixture(fixture, fetcher, nowMs);
  if (!check.ok) return { ok: false, status: fixtureRefusalStatus(check.code), code: check.code };
  const kickoffMs = Date.parse(check.located.event.startISO);
  return {
    ok: true,
    input: {
      ...input,
      endTime: new Date(kickoffMs + MATCH_LENGTH_MS).toISOString(),
      fixture: { ...fixture, startISO: check.located.event.startISO },
      tailOf: tail.handle,
      ...(side !== source.side ? { tailFlipped: true } : {}),
    },
  };
}
