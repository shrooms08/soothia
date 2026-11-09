// Total Recall: scores a user's open picks and writes outcomes and lessons.
// Shared by the CLI (scripts/recall/resolve.ts), POST /recall/resolve and the
// cron sweep. Football fixtures settle from ESPN; other picks stay open.

import { fetchScoreboard, resolveFixture, sideForWinner, type ParsedScoreboard, type ScoreboardFetcher } from "./espn";
import type { RecallStore } from "./memory";
import { mergePicks } from "./picks";
import type { LessonRecord, OutcomeRecord, PickRecord } from "./records";
import { deriveLessons, newLessons, scoreOutcome, summarize } from "./scoring";

export interface ResolveOptions {
  /** Picks known outside Walrus, such as the CLI's local backup. */
  extraPicks?: PickRecord[];
  log?: (line: string) => void;
  /** Most new outcomes to write in one run; the rest wait for the next. */
  maxOutcomes?: number;
  fetcher?: ScoreboardFetcher;
}

export interface ResolveResult {
  /** Outcomes written by this run. */
  resolved: number;
  /** All-time right calls and Brier score. */
  hits: number;
  brier: number | null;
  newLessons: LessonRecord[];
  totalResolved: number;
  pending: number;
  notFound: number;
  failed: number;
  /** Every pick id that now has an outcome. */
  closedIds: string[];
  /** Every pick this user has, one record each. */
  picks: PickRecord[];
}

function memoized(fetcher: ScoreboardFetcher): ScoreboardFetcher {
  // Each pick checks every league; one fetch per league and day is enough.
  const boards = new Map<string, Promise<ParsedScoreboard>>();
  return (league, day) => {
    const key = `${league}:${day}`;
    let board = boards.get(key);
    if (!board) {
      board = fetcher(league, day);
      boards.set(key, board);
    }
    return board;
  };
}

const message = (error: unknown): string => String((error as Error)?.message ?? error);

export async function resolveUser(store: RecallStore, now: Date, options: ResolveOptions = {}): Promise<ResolveResult> {
  const log = options.log ?? (() => undefined);
  const fetcher = memoized(options.fetcher ?? fetchScoreboard);

  // Walrus can lag behind a write, so any extra copies fill the gaps.
  let walrusPicks: PickRecord[] = [];
  try {
    walrusPicks = await store.list("pick", true);
  } catch (error) {
    if (!options.extraPicks) throw error;
    log(`Could not read picks from Walrus, using the local backup: ${message(error)}`);
  }
  const extra = options.extraPicks ?? [];
  const picks = mergePicks([...walrusPicks, ...extra]);
  log(`Picks: ${picks.length} (${mergePicks(walrusPicks).length} on Walrus, ${mergePicks(extra).length} in the local backup)`);

  // If these reads fail, stop: guessing "none yet" would write duplicates.
  const previousOutcomes = await store.list("outcome", true);
  const previousLessons = await store.list("lesson", true);
  const done = new Set(previousOutcomes.map((outcome) => outcome.pickId));

  const written: OutcomeRecord[] = [];
  const limit = options.maxOutcomes ?? Number.POSITIVE_INFINITY;
  let pending = 0;
  let notFound = 0;
  let failed = 0;

  for (const pick of picks) {
    if (done.has(pick.id) || !pick.fixture) continue;
    if (written.length >= limit) {
      pending += 1;
      continue;
    }
    const label = `${pick.fixture.home} vs ${pick.fixture.away}`;
    try {
      const result = await resolveFixture(pick.fixture, fetcher);
      if (result.status === "pending") {
        pending += 1;
        continue;
      }
      if (result.status === "not_found") {
        notFound += 1;
        log(`Not found on ESPN: ${label}`);
        continue;
      }
      const side = sideForWinner(pick.fixture.subject, result.winner);
      const detail = result.detail;
      const outcome = scoreOutcome(pick, side, detail, now.toISOString());
      const { jobId } = await store.write("outcome", outcome);
      written.push(outcome);
      log(`${outcome.hit ? "Right" : "Wrong"}: ${detail} | Brier ${outcome.brier.toFixed(3)} | job ${jobId}`);
    } catch (error) {
      failed += 1;
      log(`Failed on ${label}: ${message(error)}`);
    }
  }

  const outcomes = [...previousOutcomes, ...written];
  // Staking lessons are a bonus, so a failed read only means fewer of them this run.
  const stakes = await store.list("stake", true).catch(() => []);
  const lessons = newLessons(previousLessons, deriveLessons(outcomes, now.toISOString(), { picks, stakes }));
  const savedLessons: LessonRecord[] = [];
  for (const lesson of lessons) {
    try {
      await store.write("lesson", lesson);
      savedLessons.push(lesson);
    } catch (error) {
      failed += 1;
      log(`Lesson not saved: ${message(error)}`);
    }
  }

  const summary = summarize(picks, outcomes);
  return {
    resolved: written.length,
    hits: summary.hits,
    brier: summary.brier,
    newLessons: savedLessons,
    totalResolved: summary.resolved,
    pending,
    notFound,
    failed,
    closedIds: outcomes.map((outcome) => outcome.pickId),
    picks,
  };
}
