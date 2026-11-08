// Publishes move/soothia_stake to Sui mainnet through Tatum and records its ids in
// worker/.dev.vars. Spends real SUI. Skips if already published.
// Run: cd worker && npx tsx scripts/stake/publish.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Transaction } from "@mysten/sui/transactions";
import { readConfig } from "../../src/stake/readers";
import { loadEnvOrExit, safeError, setDevVar, WORKER_ROOT } from "../recall/shared";
import { execute, explorerTx, stakeContext, sui } from "./shared";

const PUBLISH_GAS_BUDGET = 300_000_000;

const env = loadEnvOrExit();

async function main(): Promise<void> {
  const context = stakeContext(env);
  const existing = (env as unknown as Record<string, string | undefined>).STAKE_PACKAGE?.trim();
  if (existing) {
    const found = await context.client.core.getObject({ objectId: existing }).catch(() => null);
    if (found) {
      console.log(`Already published: ${existing}`);
      return;
    }
    console.log("STAKE_PACKAGE is set but that package was not found. Publishing again.");
  }

  const build = JSON.parse(readFileSync(join(WORKER_ROOT, "..", "move", "soothia_stake", "publish.json"), "utf8")) as {
    modules: string[];
    dependencies: string[];
  };
  const tx = new Transaction();
  const upgradeCap = tx.publish({ modules: build.modules, dependencies: build.dependencies });
  tx.transferObjects([upgradeCap], context.sender);
  const result = await execute(context, tx, PUBLISH_GAS_BUDGET);

  const created = result.effects.changedObjects.filter((change) => change.idOperation === "Created");
  const packageId = created.find((change) => change.outputState === "PackageWrite")?.objectId;
  const ofType = (suffix: string): string | undefined =>
    created.find((change) => result.objectTypes[change.objectId]?.endsWith(suffix))?.objectId;
  const config = ofType("::pool::Config");
  const adminCap = ofType("::pool::AdminCap");
  const resolverCap = ofType("::pool::ResolverCap");
  if (!packageId || !config || !adminCap || !resolverCap) {
    throw new Error(`published, but could not find every id in the effects. Digest ${result.digest}`);
  }

  setDevVar("STAKE_PACKAGE", packageId);
  setDevVar("STAKE_CONFIG", config);
  setDevVar("STAKE_ADMIN_CAP", adminCap);
  setDevVar("STAKE_RESOLVER_CAP", resolverCap);

  console.log(`STAKE_PACKAGE=${packageId}`);
  console.log(`STAKE_CONFIG=${config}`);
  console.log(`STAKE_ADMIN_CAP=${adminCap}`);
  console.log(`STAKE_RESOLVER_CAP=${resolverCap}`);
  console.log(`Explorer: https://suivision.xyz/package/${packageId}`);
  console.log(`Digest: ${result.digest} ${explorerTx(result.digest)}`);

  const live = await readConfig(context.client, config);
  console.log(`\nOn-chain config: treasury ${live.treasury}`);
  console.log(`  fee ${live.feeBps} bps, min ${sui(live.minStake)}, per user ${sui(live.maxStakePerUser)}, pool ${sui(live.maxPool)}, refund after ${live.refundAfterMs} ms`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
