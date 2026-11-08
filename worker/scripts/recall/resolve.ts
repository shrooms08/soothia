// After the matches: scores every open call against ESPN, writes the outcomes
// to Walrus Memory, then writes any lesson that changed.
// Run: cd worker && npx tsx scripts/recall/resolve.ts

import type { Env } from "../../src/http";
import { resolveUser } from "../../src/recall/resolve";
import { loadEnvOrExit, openStore, readLocalPicks, safeError, scrub } from "./shared";

const env = loadEnvOrExit();

async function main(): Promise<number> {
  const store = await openStore(env);
  // CLI picks are all fixtures, so the Panta catalog (which needs KV) is never read.
  const result = await resolveUser(store, new Date(), env as unknown as Env, {
    extraPicks: readLocalPicks(),
    log: (line) => console.log(scrub(line, env)),
    catalog: async () => [],
  });

  console.log(`\nResolved this run: ${result.resolved}. Still pending: ${result.pending}. Not found: ${result.notFound}. Failed: ${result.failed}.`);
  console.log(`All time: ${result.totalResolved} resolved, ${result.hits} right, Brier ${result.brier ?? "n/a"}.`);
  if (result.newLessons.length) {
    console.log("\nNew lessons:");
    for (const lesson of result.newLessons) console.log(`  ${lesson.text}`);
  } else {
    console.log("No new lessons.");
  }
  return result.failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
