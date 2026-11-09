// Public profiles: Call Score and the numbers behind it. Pure, so all of it is tested.
// Amounts are MIST as bigint here and text once they leave this module.

import { teamKey } from "../recall/espn";

export const PERIODS = ["week", "month", "all"] as const;
export type Period = (typeof PERIODS)[number];
const PERIOD_MS: Record<Exclude<Period, "all">, number> = { week: 7 * 86_400_000, month: 30 * 86_400_000 };

/** One public call. Settled calls reach here only once proven on Sui before kickoff. */
export interface CallEntry {
  kickoffMs: number;
  competition: string;
  teams: string[];
  /** Null while the match is open. */
  result: { hit: boolean; brier: number } | null;
}

export interface StakeEntry {
  kickoffMs: number;
  competition: string;
  teams: string[];
  match: string;
  stakedMist: bigint;
  /** Null until the result is final. */
  result: "won" | "lost" | "refunded" | null;
  payoutMist: bigint;
}

export interface BestMultiplier {
  value: number;
  match: string;
}

export interface Stats {
  calls: number;
  settled: number;
  hits: number;
  hitRate: number | null;
  brier: number | null;
  score: number;
  currentStreak: number;
  bestStreak: number;
  stakedMist: string;
  returnedMist: string;
  profitMist: string;
  roiPercent: number | null;
  bestMultiplier: BestMultiplier | null;
  wonStakes: number;
  lostStakes: number;
}

/** Call Score: 500 at no evidence, moving with skill as settled calls build up. */
export function callScore(brier: number | null, settled: number): number {
  if (brier === null || settled <= 0) return 500;
  const skill = Math.min(1, Math.max(-1, 1 - brier / 0.25));
  return Math.round(500 + (500 * skill * settled) / (settled + 10));
}

export function streaks(calls: CallEntry[]): { current: number; best: number } {
  const settled = calls.filter((call) => call.result !== null).sort((a, b) => a.kickoffMs - b.kickoffMs);
  let current = 0;
  let best = 0;
  for (const call of settled) {
    current = call.result!.hit ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return { current, best };
}

const round = (value: number, places: number): number => Number(value.toFixed(places));

export function computeStats(calls: CallEntry[], stakes: StakeEntry[]): Stats {
  const settled = calls.filter((call) => call.result !== null);
  const hits = settled.filter((call) => call.result!.hit).length;
  const brier = settled.length > 0 ? round(settled.reduce((sum, call) => sum + call.result!.brier, 0) / settled.length, 4) : null;
  const { current, best } = streaks(calls);

  let staked = 0n;
  let returned = 0n;
  let settledStake = 0n;
  let wonStake = 0n;
  let lost = 0n;
  let winnings = 0n;
  let wonStakes = 0;
  let lostStakes = 0;
  let bestMultiplier: BestMultiplier | null = null;
  for (const stake of stakes) {
    staked += stake.stakedMist;
    if (stake.result === "won") {
      wonStakes += 1;
      wonStake += stake.stakedMist;
      winnings += stake.payoutMist;
      returned += stake.payoutMist;
      settledStake += stake.stakedMist;
      if (stake.stakedMist > 0n) {
        const value = Number((stake.payoutMist * 10_000n) / stake.stakedMist) / 10_000;
        if (!bestMultiplier || value > bestMultiplier.value) bestMultiplier = { value, match: stake.match };
      }
    } else if (stake.result === "lost") {
      lostStakes += 1;
      lost += stake.stakedMist;
      settledStake += stake.stakedMist;
    } else if (stake.result === "refunded") {
      // Money back: it was never at stake in a result, so it moves neither profit nor ROI.
      returned += stake.stakedMist;
    }
  }
  const profit = winnings - wonStake - lost;
  return {
    calls: calls.length,
    settled: settled.length,
    hits,
    hitRate: settled.length > 0 ? round(hits / settled.length, 4) : null,
    brier,
    score: callScore(brier, settled.length),
    currentStreak: current,
    bestStreak: best,
    stakedMist: staked.toString(),
    returnedMist: returned.toString(),
    profitMist: profit.toString(),
    roiPercent: settledStake > 0n ? Number((profit * 10_000n) / settledStake) / 100 : null,
    bestMultiplier,
    wonStakes,
    lostStakes,
  };
}

export interface PeriodStats {
  stats: Stats;
  leagues: Record<string, Stats>;
  teams: Record<string, Stats>;
}

const inPeriod = (kickoffMs: number, period: Period, nowMs: number): boolean => period === "all" || kickoffMs >= nowMs - PERIOD_MS[period];

function groupKeys(keys: (entry: { competition: string; teams: string[] }) => string[], calls: CallEntry[], stakes: StakeEntry[]): Record<string, Stats> {
  const names = new Set([...calls, ...stakes].flatMap(keys).filter(Boolean));
  const out: Record<string, Stats> = {};
  for (const name of names) out[name] = computeStats(calls.filter((call) => keys(call).includes(name)), stakes.filter((stake) => keys(stake).includes(name)));
  return out;
}

export function statsForPeriod(calls: CallEntry[], stakes: StakeEntry[], period: Period, nowMs: number): PeriodStats {
  const inScopeCalls = calls.filter((call) => inPeriod(call.kickoffMs, period, nowMs));
  const inScopeStakes = stakes.filter((stake) => inPeriod(stake.kickoffMs, period, nowMs));
  return {
    stats: computeStats(inScopeCalls, inScopeStakes),
    leagues: groupKeys((entry) => [entry.competition], inScopeCalls, inScopeStakes),
    teams: groupKeys((entry) => entry.teams, inScopeCalls, inScopeStakes),
  };
}

export const BOARDS = ["score", "earners", "roi", "hits", "streaks"] as const;
export type Board = (typeof BOARDS)[number];
export const MAX_BOARD_ROWS = 100;
const MIN_SETTLED_CALLS = 10;
const MIN_SETTLED_STAKES = 5;
const MIN_STREAK_SETTLED = 5;

const settledStakes = (stats: Stats): number => stats.wonStakes + stats.lostStakes;

/** A profile's number on a board, or null when it doesn't qualify. */
export function boardValue(board: Board, stats: Stats): number | null {
  switch (board) {
    case "score":
      return stats.settled >= MIN_SETTLED_CALLS ? stats.score : null;
    case "earners":
      return settledStakes(stats) >= MIN_SETTLED_STAKES ? Number(BigInt(stats.profitMist)) / 1e9 : null;
    case "roi":
      return settledStakes(stats) >= MIN_SETTLED_STAKES ? stats.roiPercent : null;
    case "hits":
      return stats.bestMultiplier?.value ?? null;
    case "streaks":
      return stats.settled >= MIN_STREAK_SETTLED ? stats.currentStreak : null;
  }
}

export interface BoardEntry {
  handle: string;
  stats: Stats;
}

export interface BoardRow {
  rank: number;
  handle: string;
  score: number;
  value: number;
  calls: number;
  hitRate: number | null;
  /** MIST, as text. */
  profit: string;
  /** Percent. */
  roi: number | null;
  bestMultiplier: number | null;
  streak: number;
}

/** The best rows, ties broken by more settled calls and then by handle. */
export function rankBoard(board: Board, entries: BoardEntry[]): BoardRow[] {
  return entries
    .flatMap(({ handle, stats }) => {
      const value = boardValue(board, stats);
      return value === null ? [] : [{ handle, stats, value }];
    })
    .sort((a, b) => b.value - a.value || b.stats.settled - a.stats.settled || a.handle.localeCompare(b.handle))
    .slice(0, MAX_BOARD_ROWS)
    .map(({ handle, stats, value }, index) => ({
      rank: index + 1,
      handle,
      score: stats.score,
      value,
      calls: stats.calls,
      hitRate: stats.hitRate,
      profit: stats.profitMist,
      roi: stats.roiPercent,
      bestMultiplier: stats.bestMultiplier?.value ?? null,
      streak: stats.currentStreak,
    }));
}

/** Finds a breakdown by name, whatever its case or team alias. */
export function findBreakdown(group: Record<string, Stats>, name: string, kind: "league" | "team"): Stats | null {
  const wanted = kind === "team" ? teamKey(name) : name.trim().toLowerCase();
  for (const [key, stats] of Object.entries(group)) {
    if ((kind === "team" ? teamKey(key) : key.trim().toLowerCase()) === wanted) return stats;
  }
  return null;
}
