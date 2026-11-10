// Whether a fixture is real and still to come, according to ESPN. A kickoff from a web
// page or a client is never trusted, because it decides what counts as "before kickoff".

import { locateFixture, type LocatedFixture, type ScoreboardFetcher } from "./espn";

export const MIN_KICKOFF_LEAD_MS = 120_000;

export type FixtureCheck =
  | { ok: true; located: LocatedFixture }
  | {
      ok: false;
      code:
        | "espn_unavailable"
        | "fixture_not_on_espn"
        | "fixture_not_open"
        | "too_close_to_kickoff"
        | "fixture_date_mismatch";
    };

export async function checkUpcomingFixture(
  fixture: { home: string; away: string; startISO: string },
  fetcher: ScoreboardFetcher,
  nowMs: number,
): Promise<FixtureCheck> {
  let located: LocatedFixture | null;
  try {
    ({ located } = await locateFixture(fixture, fetcher));
  } catch {
    return { ok: false, code: "espn_unavailable" };
  }
  if (!located) return { ok: false, code: "fixture_not_on_espn" };
  if (located.event.state !== "pre" || located.notPlayed) return { ok: false, code: "fixture_not_open" };
  if (Date.parse(located.event.startISO) - nowMs <= MIN_KICKOFF_LEAD_MS)
    return { ok: false, code: "too_close_to_kickoff" };
  if (new Date(Date.parse(fixture.startISO)).toISOString().slice(0, 10) !== located.event.startISO.slice(0, 10))
    return { ok: false, code: "fixture_date_mismatch" };
  return { ok: true, located };
}

/** The HTTP status for a refused fixture. */
export const fixtureRefusalStatus = (code: Exclude<FixtureCheck, { ok: true }>["code"]): number =>
  code === "espn_unavailable" ? 503 : code === "fixture_not_on_espn" ? 400 : 409;
