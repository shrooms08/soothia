// Commits the hash of every uncommitted pick on Sui mainnet, soonest kickoff
// first, then saves the updated pick. Spends real SUI.
// Run: cd worker && npx tsx scripts/recall/commit-existing.ts

import type { PickRecord } from "../../src/recall/records";
import { commitConfigured, commitPick } from "../../src/recall/sui";
import { appendLocalPick, formatGap, loadEnvOrExit, loadPicks, openStore, safeError } from "./shared";

const MIN_LEAD_MS = 3 * 60_000;

const env = loadEnvOrExit();

async function main(): Promise<number> {
  if (!commitConfigured(env))
    throw new Error("Not configured: need TATUM_API_KEY, SOOTHIA_RECALL_PACKAGE and a usable commit key.");
  const store = await openStore(env);
  const { walrus, merged, walrusOk } = await loadPicks(store, env);
  const onWalrus = new Map(walrus.map((pick) => [pick.id, pick]));
  const picks = merged
    .filter((pick): pick is PickRecord & { fixture: NonNullable<PickRecord["fixture"]> } => Boolean(pick.fixture))
    .sort((a, b) => a.fixture.startISO.localeCompare(b.fixture.startISO));

  let committed = 0;
  let missed = 0;
  let failed = 0;

  for (const pick of picks) {
    const match = `${pick.fixture.home} vs ${pick.fixture.away}`;
    if (pick.commit) {
      if (walrusOk && !onWalrus.get(pick.id)?.commit) {
        await store
          .write("pick", pick)
          .catch((error) => console.log(`${pick.id} ${match}: Walrus update failed: ${safeError(error, env)}`));
        console.log(`${pick.id} ${match}: already committed, updated the Walrus copy`);
      } else {
        console.log(`${pick.id} ${match}: already committed`);
      }
      continue;
    }

    const lead = Date.parse(pick.fixture.startISO) - Date.now();
    if (lead <= 0) {
      missed += 1;
      console.log(`${pick.id} ${match}: missed: kicked off`);
      continue;
    }
    if (lead <= MIN_LEAD_MS) {
      missed += 1;
      console.log(`${pick.id} ${match}: missed: under 3 minutes to kickoff`);
      continue;
    }

    try {
      const digest = await commitPick(env, pick.hash, pick.id);
      const updated: PickRecord = { ...pick, commit: { digest, network: "mainnet" } };
      // Saved locally first, so a Walrus failure can never cause a second commit.
      appendLocalPick(updated);
      committed += 1;
      console.log(
        `${pick.id} ${match}: ${digest} committed ${formatGap(Date.parse(pick.fixture.startISO) - Date.now())} before kickoff`,
      );
      await store
        .write("pick", updated)
        .catch((error) => console.log(`  Walrus update failed, kept locally: ${safeError(error, env)}`));
    } catch (error) {
      failed += 1;
      console.log(`${pick.id} ${match}: COMMIT FAILED: ${safeError(error, env)}`);
    }
  }

  console.log(`\nCommitted now: ${committed}. Missed: ${missed}. Failed: ${failed}.`);
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
