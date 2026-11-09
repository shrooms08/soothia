// Publishes move/soothia_pay to Sui mainnet through Tatum, then hands the AdminCap and
// UpgradeCap to the Slush wallet. Spends real SUI. Safe to run again: an earlier
// publish is reused, and caps already handed over are left alone.
// Run: cd worker && npx tsx scripts/pay/publish.ts

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Transaction } from "@mysten/sui/transactions";
import { loadEnvOrExit, readDevVars, safeError, setDevVar, WORKER_ROOT } from "../recall/shared";
import { balanceOf, execute, explorerTx, stakeContext, sui, type StakeContext } from "../stake/shared";

const SLUSH = "0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a";
const PUBLISH_GAS_BUDGET = 200_000_000;

const env = loadEnvOrExit();

function ownerText(owner: { $kind: string; AddressOwner?: string }): string {
  return owner.$kind === "AddressOwner" ? (owner.AddressOwner as string) : owner.$kind;
}

async function publish(context: StakeContext): Promise<void> {
  const build = JSON.parse(readFileSync(join(WORKER_ROOT, "..", "move", "soothia_pay", "publish.json"), "utf8")) as { modules: string[]; dependencies: string[] };
  const tx = new Transaction();
  const upgradeCap = tx.publish({ modules: build.modules, dependencies: build.dependencies });
  tx.transferObjects([upgradeCap], context.sender);
  const result = await execute(context, tx, PUBLISH_GAS_BUDGET);
  const created = result.effects.changedObjects.filter((change) => change.idOperation === "Created");
  const packageId = created.find((change) => change.outputState === "PackageWrite")?.objectId;
  const ofType = (suffix: string): string | undefined => created.find((change) => result.objectTypes[change.objectId]?.endsWith(suffix))?.objectId;
  const config = ofType("::pay::PayConfig");
  const adminCap = ofType("::pay::AdminCap");
  const cap = ofType("::package::UpgradeCap");
  if (!packageId || !config || !adminCap || !cap) throw new Error(`published, but could not find every id. Digest ${result.digest}`);
  setDevVar("PAY_PACKAGE", packageId);
  setDevVar("PAY_CONFIG", config);
  setDevVar("PAY_ADMIN_CAP", adminCap);
  setDevVar("PAY_UPGRADE_CAP", cap);
  console.log(`Publish: ${result.digest}\n  ${explorerTx(result.digest)}`);
}

async function main(context: StakeContext): Promise<void> {
  if (!readDevVars().PAY_PACKAGE?.trim()) await publish(context);
  else console.log("Already published.");

  const vars = readDevVars();
  const caps = [vars.PAY_ADMIN_CAP.trim(), vars.PAY_UPGRADE_CAP.trim()];
  const owners = await Promise.all(caps.map(async (objectId) => ownerText((await context.client.core.getObject({ objectId })).object.owner)));
  if (owners.every((owner) => owner === context.sender)) {
    const tx = new Transaction();
    tx.transferObjects(caps.map((cap) => tx.object(cap)), SLUSH);
    const result = await execute(context, tx);
    console.log(`Handover: ${result.digest}\n  ${explorerTx(result.digest)}`);
  }

  console.log(`\nPAY_PACKAGE=${vars.PAY_PACKAGE.trim()}\nhttps://suivision.xyz/package/${vars.PAY_PACKAGE.trim()}`);
  const rows: [string, string][] = [["PayConfig", vars.PAY_CONFIG.trim()], ["AdminCap", caps[0]], ["UpgradeCap", caps[1]]];
  console.log("\nOwners, read back from chain:");
  for (const [name, objectId] of rows) {
    const { object } = await context.client.core.getObject({ objectId });
    console.log(`  ${name}: ${objectId}\n    owner: ${ownerText(object.owner)}`);
  }
  console.log(`\nGas wallet: ${context.sender}, balance ${sui(await balanceOf(context, context.sender))}`);
}

main(stakeContext(env)).then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
