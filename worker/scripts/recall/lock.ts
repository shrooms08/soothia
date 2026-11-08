// Lists upcoming football fixtures, asks for a probability on each, and writes
// each answer to Walrus Memory mainnet straight away, so a crash loses nothing.
// Run: cd worker && npx tsx scripts/recall/lock.ts

import { createInterface } from "node:readline/promises";
import { upcomingFixtures, type Fixture } from "../../src/recall/espn";
import { latestCheckpoint } from "../../src/recall/sui";
import {
  appendLocalPick,
  buildPick,
  dayLabel,
  fixtureKey,
  loadEnvOrExit,
  openStore,
  readLocalPicks,
  safeError,
  timeIn,
} from "./shared";

const MIN_LEAD_MS = 10 * 60_000;
const DAY_MS = 86_400_000;

const lockable = (fixture: Fixture): boolean => Date.parse(fixture.startISO) - Date.now() >= MIN_LEAD_MS;

function parsePercent(answer: string): number | null {
  if (!/^\d{1,2}$/.test(answer)) return null;
  const value = Number(answer);
  return value >= 1 && value <= 99 ? value : null;
}

const env = loadEnvOrExit();

async function main(): Promise<number> {
  const store = await openStore(env);
  if (!env.TATUM_API_KEY) console.log("No TATUM_API_KEY set: calls will be saved without a Sui checkpoint anchor.\n");

  const now = new Date();
  const days = await Promise.all([upcomingFixtures(now), upcomingFixtures(new Date(now.getTime() + DAY_MS))]);
  const byId = new Map(days.flat().map((fixture) => [fixture.espnId, fixture]));
  const locked = new Set(readLocalPicks().flatMap((pick) => (pick.fixture ? [fixtureKey(pick.fixture)] : [])));
  const all = [...byId.values()].filter(lockable).sort((a, b) => a.startISO.localeCompare(b.startISO));
  const fixtures = all.filter((fixture) => !locked.has(fixtureKey(fixture)));

  if (all.length > fixtures.length) console.log(`Skipping ${all.length - fixtures.length} fixture(s) you already called.\n`);
  if (fixtures.length === 0) {
    console.log("No fixtures left to call.");
    return 0;
  }

  fixtures.forEach((fixture, index) => {
    const start = new Date(fixture.startISO);
    console.log(
      `${String(index + 1).padStart(2)}. ${dayLabel(start)}  ${timeIn(start, "UTC")} UTC / ${timeIn(start, "Africa/Lagos")} Lagos  ${fixture.home} vs ${fixture.away}  (${fixture.competition})`,
    );
  });
  console.log("");

  const input = createInterface({ input: process.stdin, output: process.stdout });
  const closed = new Promise<null>((resolve) => input.once("close", () => resolve(null)));
  let saved = 0;
  let failed = 0;

  for (const fixture of fixtures) {
    let percent: number | null = null;
    let stop = false;
    for (;;) {
      const answer = await Promise.race([input.question(`Chance ${fixture.home} beats ${fixture.away}? (1-99, Enter to skip) `), closed]);
      if (answer === null) {
        stop = true;
        break;
      }
      if (answer.trim() === "") break;
      percent = parsePercent(answer.trim());
      if (percent !== null) break;
      console.log("Please type a whole number from 1 to 99, or press Enter to skip.");
    }
    if (stop) break;
    if (percent === null) continue;
    if (!lockable(fixture)) {
      console.log(`Too close to kickoff, not saved: ${fixture.home} vs ${fixture.away}`);
      continue;
    }

    let anchor: Awaited<ReturnType<typeof latestCheckpoint>> = null;
    try {
      anchor = await latestCheckpoint(env);
    } catch (error) {
      console.log(`Warning: no Sui anchor for this call: ${safeError(error, env)}`);
    }

    const pick = buildPick(fixture, percent, anchor, new Date());
    appendLocalPick(pick);
    const lean = `${fixture.home} ${percent}%`;
    const checkpoint = anchor ? anchor.checkpoint : "none";
    try {
      const { jobId } = await store.write("pick", pick).catch(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        return store.write("pick", pick);
      });
      saved += 1;
      console.log(`Locked ${pick.id}: ${lean} | job ${jobId} | anchor: after checkpoint ${checkpoint}`);
    } catch (error) {
      failed += 1;
      console.log(`NOT saved to Walrus (kept in the local backup): ${lean}\n  ${safeError(error, env)}`);
    }
  }

  input.close();
  console.log(`\nDone. Saved to Walrus: ${saved}. Failed: ${failed}.`);
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
