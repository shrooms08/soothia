// Checks every committed pick against Sui mainnet through Tatum. Reads only.
// Run: cd worker && npx tsx scripts/recall/verify.ts

import { sha256Hex } from "../../src/recall/picks";
import { pickHashInput } from "../../src/recall/records";
import { verifyCommit } from "../../src/recall/sui";
import { formatGap, loadEnvOrExit, loadPicks, openStore, safeError } from "./shared";

const env = loadEnvOrExit();

async function main(): Promise<number> {
  const store = await openStore(env);
  const { merged } = await loadPicks(store, env);
  const committed = merged
    .filter((pick) => pick.commit)
    .sort((a, b) => (a.fixture?.startISO ?? "").localeCompare(b.fixture?.startISO ?? ""));

  let proven = 0;
  for (const pick of committed) {
    const match = pick.fixture ? `${pick.fixture.home} vs ${pick.fixture.away}` : pick.question;
    if ((await sha256Hex(pickHashInput(pick))) !== pick.hash) {
      console.log(`${pick.id} ${match}: PROBLEM: the saved pick does not match its hash`);
      continue;
    }
    const proof = await verifyCommit(env, pick.commit!.digest, pick.hash);
    if (!proof.verified || proof.timestampMs === null) {
      console.log(`${pick.id} ${match}: PROBLEM: ${proof.problem ?? "no timestamp yet"} (${proof.explorerUrl})`);
      continue;
    }
    const at = new Date(proof.timestampMs).toISOString();
    if (!pick.fixture) {
      proven += 1;
      console.log(`${pick.id} ${match}: PROVEN: committed ${at}`);
      continue;
    }
    const gap = Date.parse(pick.fixture.startISO) - proof.timestampMs;
    if (gap <= 0) {
      console.log(
        `${pick.id} ${match}: PROBLEM: committed ${at}, ${formatGap(gap)} AFTER kickoff ${pick.fixture.startISO}`,
      );
      continue;
    }
    proven += 1;
    console.log(
      `${pick.id} ${match}: PROVEN: committed ${at}, kickoff ${pick.fixture.startISO}, ${formatGap(gap)} before`,
    );
  }
  console.log(`\nProven: ${proven} of ${committed.length} committed picks (${merged.length} picks in total).`);
  return proven === committed.length ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
