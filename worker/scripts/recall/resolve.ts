// After the matches: scores every open call against ESPN, writes the outcomes
// to Walrus Memory, then writes any lesson that changed.
// Run: cd worker && npx tsx scripts/recall/resolve.ts

import { fetchScoreboard, resolveFixture, sideForWinner, type ParsedScoreboard } from "../../src/recall/espn";
import type { OutcomeRecord, PickRecord } from "../../src/recall/records";
import { deriveLessons, newLessons, scoreOutcome, summarize } from "../../src/recall/scoring";
import { loadEnvOrExit, openStore, readLocalPicks, safeError } from "./shared";

const env = loadEnvOrExit();

// Each pick checks every league; one fetch per league and day is enough.
const boards = new Map<string, Promise<ParsedScoreboard>>();
function cachedScoreboard(league: string, day: string): Promise<ParsedScoreboard> {
  const key = `${league}:${day}`;
  let board = boards.get(key);
  if (!board) {
    board = fetchScoreboard(league, day);
    boards.set(key, board);
  }
  return board;
}

async function main(): Promise<number> {
  const store = await openStore(env);

  // Walrus can lag behind a write, so the local backup fills any gaps.
  let walrusPicks: PickRecord[] = [];
  try {
    walrusPicks = await store.list("pick", true);
  } catch (error) {
    console.log(`Could not read picks from Walrus, using the local backup: ${safeError(error, env)}`);
  }
  const localPicks = readLocalPicks();
  const picks = [...new Map([...localPicks, ...walrusPicks].map((pick) => [pick.id, pick])).values()];
  console.log(`Picks: ${picks.length} (${walrusPicks.length} on Walrus, ${localPicks.length} in the local backup)`);

  // If these reads fail, stop: guessing "none yet" would write duplicates.
  const previousOutcomes = await store.list("outcome", true);
  const previousLessons = await store.list("lesson", true);
  const done = new Set(previousOutcomes.map((outcome) => outcome.pickId));

  const written: OutcomeRecord[] = [];
  let pending = 0;
  let notFound = 0;
  let failed = 0;

  for (const pick of picks) {
    if (done.has(pick.id) || !pick.fixture) continue;
    const label = `${pick.fixture.home} vs ${pick.fixture.away}`;
    try {
      const result = await resolveFixture(pick.fixture, cachedScoreboard);
      if (result.status === "pending") {
        pending += 1;
        continue;
      }
      if (result.status === "not_found") {
        notFound += 1;
        console.log(`Not found on ESPN: ${label}`);
        continue;
      }
      const side = sideForWinner(pick.fixture.subject, result.winner);
      const outcome = scoreOutcome(pick, side, result.detail, new Date().toISOString());
      const { jobId } = await store.write("outcome", outcome);
      written.push(outcome);
      console.log(`${outcome.hit ? "Right" : "Wrong"}: ${result.detail} | Brier ${outcome.brier.toFixed(3)} | job ${jobId}`);
    } catch (error) {
      failed += 1;
      console.log(`Failed on ${label}: ${safeError(error, env)}`);
    }
  }

  const outcomes = [...previousOutcomes, ...written];
  const lessons = newLessons(previousLessons, deriveLessons(outcomes, new Date().toISOString()));
  for (const lesson of lessons) {
    try {
      await store.write("lesson", lesson);
    } catch (error) {
      failed += 1;
      console.log(`Lesson not saved: ${safeError(error, env)}`);
    }
  }

  const summary = summarize(picks, outcomes);
  console.log(`\nResolved this run: ${written.length}. Still pending: ${pending}. Not found: ${notFound}. Failed: ${failed}.`);
  console.log(`All time: ${summary.resolved} resolved, ${summary.hits} right, Brier ${summary.brier ?? "n/a"}.`);
  if (lessons.length) {
    console.log("\nNew lessons:");
    for (const lesson of lessons) console.log(`  ${lesson.text}`);
  } else {
    console.log("No new lessons.");
  }
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
