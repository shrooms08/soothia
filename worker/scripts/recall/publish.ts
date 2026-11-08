// Publishes move/soothia_recall to Sui mainnet through Tatum and records the
// package id in worker/.dev.vars. Spends real SUI. Skips if already published.
// Run: cd worker && npx tsx scripts/recall/publish.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Transaction } from "@mysten/sui/transactions";
import { commitKeypair } from "../../src/recall/sui";
import { tatumSuiClient } from "../../src/recall/tatumGrpc";
import { loadEnvOrExit, safeError, setDevVar, WORKER_ROOT } from "./shared";

const PUBLISH_GAS_BUDGET = 100_000_000;

const env = loadEnvOrExit();

async function main(): Promise<void> {
  const signer = commitKeypair(env);
  if (!signer) throw new Error("The commit key in worker/.dev.vars is not a usable Ed25519 key.");
  const client = tatumSuiClient(env.TATUM_API_KEY.trim());

  const existing = env.SOOTHIA_RECALL_PACKAGE?.trim();
  if (existing) {
    const found = await client.core.getObject({ objectId: existing }).catch(() => null);
    if (found) {
      console.log(`Already published: ${existing}`);
      return;
    }
    console.log("SOOTHIA_RECALL_PACKAGE is set but that package was not found. Publishing again.");
  }

  const build = JSON.parse(readFileSync(join(WORKER_ROOT, "..", "move", "soothia_recall", "publish.json"), "utf8")) as {
    modules: string[];
    dependencies: string[];
  };
  const sender = signer.toSuiAddress();
  const tx = new Transaction();
  tx.setSender(sender);
  tx.setGasBudget(PUBLISH_GAS_BUDGET);
  const upgradeCap = tx.publish({ modules: build.modules, dependencies: build.dependencies });
  tx.transferObjects([upgradeCap], sender);

  const result = await client.core.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true } });
  if (result.$kind === "FailedTransaction")
    throw new Error(`publish_failed: ${JSON.stringify(result.FailedTransaction.status.error).slice(0, 300)}`);
  const created = result.Transaction.effects.changedObjects.find(
    (change) => change.outputState === "PackageWrite" && change.idOperation === "Created",
  );
  if (!created) throw new Error(`publish_no_package_in_effects, digest ${result.Transaction.digest}`);
  await client.core.waitForTransaction({ result, timeout: 30_000 }).catch(() => undefined);

  setDevVar("SOOTHIA_RECALL_PACKAGE", created.objectId);
  console.log(`Package id: ${created.objectId}`);
  console.log(`Explorer: https://suivision.xyz/package/${created.objectId}`);
  console.log(`Digest: ${result.Transaction.digest}`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
