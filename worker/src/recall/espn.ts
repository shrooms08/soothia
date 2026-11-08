// Total Recall: football fixtures and results from ESPN's public scoreboard.
// parseScoreboard and matching are pure so they can be tested without a network;
// the fetcher is a parameter for the same reason.

import { entityKey, type Side } from "./records";

export const LEAGUES = ["eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "eng.2"] as const;

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const DAY_MS = 86_400_000;
// ESPN can mark these as finished or pre-match; none of them is a real result or a real fixture.
const NOT_PLAYED = /POSTPONED|CANCEL|ABANDON|SUSPEND|FORFEIT/;

export interface EventTeam {
  name: string;
  short: string;
  abbreviation: string;
  score: number | null;
}

export interface ScoreboardEvent {
  espnId: string;
  startISO: string;
  statusName: string;
  state: string;
  completed: boolean;
  home: EventTeam;
  away: EventTeam;
  competition: string;
  url: string;
}

export interface ParsedScoreboard {
  competition: string;
  events: ScoreboardEvent[];
}

export interface Fixture {
  home: string;
  away: string;
  competition: string;
  startISO: string;
  espnId: string;
  league: string;
  url: string;
}

export type Winner = "home" | "away" | "draw";

export type Resolution = { status: "final"; winner: Winner; detail: string } | { status: "pending" } | { status: "not_found" };

export interface FixtureQuery {
  home: string;
  away: string;
  startISO: string;
  league?: string;
}

export type ScoreboardFetcher = (league: string, yyyymmdd: string) => Promise<ParsedScoreboard>;

interface RawCompetitor {
  homeAway?: string;
  score?: string | number;
  team?: { displayName?: string; shortDisplayName?: string; abbreviation?: string };
}

interface RawEvent {
  id?: string | number;
  date?: string;
  status?: { type?: { name?: string; state?: string; completed?: boolean } };
  competitions?: { competitors?: RawCompetitor[] }[];
  links?: { rel?: string[]; href?: string }[];
}

interface RawScoreboard {
  leagues?: { name?: string }[];
  events?: RawEvent[];
}

function parseTeam(raw: RawCompetitor): EventTeam | null {
  const name = raw.team?.displayName?.trim();
  if (!name) return null;
  const score = raw.score === undefined || raw.score === "" ? null : Number(raw.score);
  return {
    name,
    short: raw.team?.shortDisplayName?.trim() || name,
    abbreviation: raw.team?.abbreviation?.trim() || "",
    score: score === null || !Number.isFinite(score) ? null : score,
  };
}

function gameUrl(raw: RawEvent, espnId: string): string {
  const link = raw.links?.find((candidate) => candidate.rel?.includes("summary") && candidate.href);
  return link?.href ?? `https://www.espn.com/soccer/match/_/gameId/${espnId}`;
}

/** Turns an ESPN scoreboard response into events. Malformed events are dropped. */
export function parseScoreboard(json: unknown): ParsedScoreboard {
  const board = (json ?? {}) as RawScoreboard;
  const competition = board.leagues?.[0]?.name?.trim() || "";
  const events: ScoreboardEvent[] = [];
  for (const raw of board.events ?? []) {
    const competitors = raw.competitions?.[0]?.competitors ?? [];
    const homeRaw = competitors.find((team) => team.homeAway === "home");
    const awayRaw = competitors.find((team) => team.homeAway === "away");
    const home = homeRaw ? parseTeam(homeRaw) : null;
    const away = awayRaw ? parseTeam(awayRaw) : null;
    const startMs = Date.parse(raw.date ?? "");
    if (raw.id === undefined || !home || !away || Number.isNaN(startMs)) continue;
    const espnId = String(raw.id);
    events.push({
      espnId,
      startISO: new Date(startMs).toISOString(),
      statusName: raw.status?.type?.name ?? "",
      state: raw.status?.type?.state ?? "",
      completed: raw.status?.type?.completed === true,
      home,
      away,
      competition,
      url: gameUrl(raw, espnId),
    });
  }
  return { competition, events };
}

export async function fetchScoreboard(league: string, yyyymmdd: string): Promise<ParsedScoreboard> {
  const response = await fetch(`${BASE}/${league}/scoreboard?dates=${yyyymmdd}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`espn_http_${response.status}`);
  return parseScoreboard(await response.json());
}

export function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Every not-yet-started fixture ESPN lists on a UTC day, soonest first. */
export async function upcomingFixtures(dateUTC: Date, fetcher: ScoreboardFetcher = fetchScoreboard): Promise<Fixture[]> {
  const day = yyyymmdd(dateUTC);
  const boards = await Promise.allSettled(LEAGUES.map((league) => fetcher(league, day)));
  const fixtures: Fixture[] = [];
  boards.forEach((board, index) => {
    const league = LEAGUES[index];
    if (board.status === "rejected") {
      console.warn(`Warning: could not load ${league} for ${day}: ${String(board.reason?.message ?? board.reason)}`);
      return;
    }
    for (const event of board.value.events) {
      if (event.state !== "pre" || NOT_PLAYED.test(event.statusName)) continue;
      fixtures.push({
        home: event.home.name,
        away: event.away.name,
        competition: event.competition,
        startISO: event.startISO,
        espnId: event.espnId,
        league,
        url: event.url,
      });
    }
  });
  return fixtures.sort((a, b) => a.startISO.localeCompare(b.startISO));
}

const ALIAS_GROUPS: [string, string[]][] = [
  ["Manchester United", ["Man Utd", "Man United"]],
  ["Manchester City", ["Man City"]],
  ["Tottenham Hotspur", ["Spurs", "Tottenham"]],
  ["Brighton & Hove Albion", ["Brighton"]],
  ["Wolverhampton Wanderers", ["Wolves"]],
  ["Newcastle United", ["Newcastle"]],
  ["Nottingham Forest", ["Forest"]],
  ["Internazionale", ["Inter", "Inter Milan"]],
];

const CANONICAL = new Map(
  ALIAS_GROUPS.flatMap(([full, aliases]) => aliases.map((alias) => [entityKey(alias), entityKey(full)] as const)),
);

export function teamKey(name: string): string {
  const key = entityKey(name);
  return CANONICAL.get(key) ?? key;
}

function sameTeam(name: string, team: EventTeam): boolean {
  const wanted = teamKey(name);
  return wanted !== "" && (teamKey(team.name) === wanted || teamKey(team.short) === wanted);
}

export function resolutionOf(event: ScoreboardEvent): Resolution {
  const { home, away } = event;
  if (!event.completed || NOT_PLAYED.test(event.statusName) || home.score === null || away.score === null)
    return { status: "pending" };
  const winner: Winner = home.score > away.score ? "home" : home.score < away.score ? "away" : "draw";
  return { status: "final", winner, detail: `${home.name} ${home.score}-${away.score} ${away.name} (ESPN, full time)` };
}

/** Finds a fixture on ESPN and reports its result. Throws if ESPN could not be checked. */
export async function resolveFixture(query: FixtureQuery, fetcher: ScoreboardFetcher = fetchScoreboard): Promise<Resolution> {
  const startMs = Date.parse(query.startISO);
  if (Number.isNaN(startMs)) return { status: "not_found" };
  const days = [yyyymmdd(new Date(startMs)), yyyymmdd(new Date(startMs + DAY_MS))];
  const leagues = query.league ? [query.league] : [...LEAGUES];
  const boards = await Promise.allSettled(leagues.flatMap((league) => days.map((day) => fetcher(league, day))));
  const events = boards.flatMap((board) => (board.status === "fulfilled" ? board.value.events : []));
  const event = events.find((candidate) => sameTeam(query.home, candidate.home) && sameTeam(query.away, candidate.away));
  if (event) return resolutionOf(event);
  // A failed league might be the one holding this fixture, so "not found" would be a guess.
  if (boards.some((board) => board.status === "rejected")) throw new Error("espn_unavailable");
  return { status: "not_found" };
}

export interface LocatedFixture {
  event: ScoreboardEvent;
  league: string;
  /** ESPN lists the teams the other way round from the query. */
  reversed: boolean;
  /** Postponed, cancelled, abandoned, suspended or forfeited. */
  notPlayed: boolean;
}

export interface FixtureSearch {
  located: LocatedFixture | null;
  /** How many events ESPN returned. Zero means an empty answer, not a missing match. */
  eventsSeen: number;
}

/** Finds a fixture whichever way round it is listed. Throws if ESPN could not be checked. */
export async function locateFixture(query: FixtureQuery, fetcher: ScoreboardFetcher = fetchScoreboard): Promise<FixtureSearch> {
  const startMs = Date.parse(query.startISO);
  if (Number.isNaN(startMs)) return { located: null, eventsSeen: 0 };
  const days = [yyyymmdd(new Date(startMs)), yyyymmdd(new Date(startMs + DAY_MS))];
  const searches = (query.league ? [query.league] : [...LEAGUES]).flatMap((league) => days.map((day) => ({ league, day })));
  const boards = await Promise.allSettled(searches.map(({ league, day }) => fetcher(league, day)));

  let eventsSeen = 0;
  let found: LocatedFixture | null = null;
  boards.forEach((board, index) => {
    if (board.status === "rejected") return;
    eventsSeen += board.value.events.length;
    for (const event of board.value.events) {
      const direct = sameTeam(query.home, event.home) && sameTeam(query.away, event.away);
      const reversed = sameTeam(query.home, event.away) && sameTeam(query.away, event.home);
      if (found || (!direct && !reversed)) continue;
      found = { event, league: searches[index].league, reversed: !direct, notPlayed: NOT_PLAYED.test(event.statusName) };
    }
  });
  if (!found && boards.some((board) => board.status === "rejected")) throw new Error("espn_unavailable");
  return { located: found, eventsSeen };
}

/** How a "Will <subject> beat ..." question settles. A draw is NO for either side. */
export function sideForWinner(subject: "home" | "away", winner: Winner): Side {
  return winner === subject ? "YES" : "NO";
}
