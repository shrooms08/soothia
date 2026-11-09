// Public profiles: the two pages anyone can read. KV only, and briefly cached.

import { cacheGet, cachePut } from "../store";
import { BOARDS_KEY, handleKey, HIDDEN_KEY, parseHandle, publicProfile, refuse, socialJson, statsKey, type ProfileIndex, type SocialContext } from "./context";
import type { BoardsDocument, ProfileSnapshot } from "./snapshots";
import { BOARDS, findBreakdown, PERIODS, rankBoard, type Board, type BoardRow, type Period } from "./stats";

const CACHE_SEC = 60;
const MAX_FILTER_CHARS = 80;

export async function profileRoute(context: SocialContext, rawHandle: string): Promise<Response> {
  const handle = parseHandle(decodeURIComponent(rawHandle));
  if (!handle) return refuse(404, "not_found");
  const cacheKey = `social:profile:${handle}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return socialJson(context, cached);

  const kv = context.env.SOOTHIA_CACHE;
  const profile = await kv.get<ProfileIndex>(handleKey(handle), "json");
  if (!profile) return refuse(404, "not_found");
  const snapshot = await kv.get<ProfileSnapshot>(statsKey(handle), "json");
  // Listed field by field, so what the sweep keeps for itself can never leak out.
  const view = {
    profile: publicProfile(profile),
    builtAt: snapshot?.builtAt ?? null,
    stats: snapshot?.periods.all.stats ?? null,
    periods: snapshot ? Object.fromEntries(PERIODS.map((period) => [period, snapshot.periods[period].stats])) : null,
    breakdowns: snapshot ? { leagues: snapshot.periods.all.leagues, teams: snapshot.periods.all.teams } : null,
    calls: snapshot?.recent ?? [],
  };
  await cachePut(cacheKey, view, CACHE_SEC);
  return socialJson(context, view);
}

function filterValue(value: string | null): string | null {
  if (value === null || value.trim() === "") return null;
  if (value.length > MAX_FILTER_CHARS) refuse(400, "invalid_filter");
  return value;
}

function renumber(rows: BoardRow[], hidden: Set<string>): BoardRow[] {
  return rows.filter((row) => !hidden.has(row.handle)).map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function leaderboardRoute(context: SocialContext): Promise<Response> {
  const { searchParams } = new URL(context.request.url);
  const board = (searchParams.get("board") ?? "score") as Board;
  const period = (searchParams.get("period") ?? "all") as Period;
  if (!BOARDS.includes(board)) refuse(400, "invalid_board");
  if (!PERIODS.includes(period)) refuse(400, "invalid_period");
  const league = filterValue(searchParams.get("league"));
  const team = filterValue(searchParams.get("team"));
  if (league && team) refuse(400, "one_filter_at_a_time");

  const cacheKey = `social:lb:${board}|${period}|${league ?? ""}|${team ?? ""}`;
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return socialJson(context, cached);

  const kv = context.env.SOOTHIA_CACHE;
  const [document, hiddenEntries] = await Promise.all([kv.get<BoardsDocument>(BOARDS_KEY, "json"), kv.get<{ handle: string }[]>(HIDDEN_KEY, "json")]);
  const hidden = new Set((hiddenEntries ?? []).map((entry) => entry.handle));
  const entries = (document?.entries ?? []).filter((entry) => !hidden.has(entry.handle));

  let rows: BoardRow[];
  if (league || team) {
    const scoped = entries.flatMap((entry) => {
      const stats = findBreakdown(league ? entry.periods[period].leagues : entry.periods[period].teams, (league ?? team) as string, league ? "league" : "team");
      return stats ? [{ handle: entry.handle, stats }] : [];
    });
    rows = rankBoard(board, scoped);
  } else {
    rows = renumber(document?.boards[board][period] ?? [], hidden);
  }

  const view = {
    board,
    period,
    league,
    team,
    generatedAt: document?.generatedAt ?? null,
    rows,
    filters: {
      leagues: [...new Set(entries.flatMap((entry) => Object.keys(entry.periods.all.leagues)))].sort(),
      teams: [...new Set(entries.flatMap((entry) => Object.keys(entry.periods.all.teams)))].sort(),
    },
  };
  await cachePut(cacheKey, view, CACHE_SEC);
  return socialJson(context, view);
}
