// Hands the staking caps to their final owners, in one all-or-nothing transaction:
//   ResolverCap -> RESOLVER_KEY's address, plus 0.2 SUI for gas
//   AdminCap, the staking UpgradeCap, the soothia_recall UpgradeCap -> the Slush wallet
// Cannot be undone from here. It refuses to run unless the production delays are set.
// Run: cd worker && npx tsx scripts/stake/handover.ts

import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { resolverKeypair } from "../../src/recall/sui";
import { readConfig } from "../../src/stake/readers";
import { loadEnvOrExit, readDevVars, safeError, setDevVarComment } from "../recall/shared";
import { balanceOf, execute, explorerTx, PROD_CHALLENGE_MS, PROD_MIN_RESOLVE_DELAY_MS, stakeContext, sui, type StakeContext } from "./shared";

const SLUSH = "0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a";
const RESOLVER_GAS = 200_000_000n;
const UPGRADE_CAP_TYPE = "0x2::package::UpgradeCap";
const UpgradeCapBcs = bcs.struct("UpgradeCap", { id: bcs.Address, package: bcs.Address, version: bcs.u64(), policy: bcs.u8() });

const env = loadEnvOrExit();

function required(vars: Record<string, string>, name: string): string {
  const value = vars[name]?.trim();
  if (!value) throw new Error(`${name} is missing in worker/.dev.vars.`);
  return value;
}

async function upgradeCapFor(context: StakeContext, packageId: string): Promise<string> {
  const { objects } = await context.client.core.listOwnedObjects({
    owner: context.sender,
    type: UPGRADE_CAP_TYPE,
    limit: 50,
    include: { content: true },
  });
  const wanted = packageId.toLowerCase();
  const match = objects.find((object) => UpgradeCapBcs.parse(object.content).package.toLowerCase() === wanted);
  if (!match) throw new Error(`the gas wallet holds no UpgradeCap for ${packageId}`);
  return match.objectId;
}

function ownerText(owner: { $kind: string; AddressOwner?: string }): string {
  return owner.$kind === "AddressOwner" ? (owner.AddressOwner as string) : owner.$kind;
}

async function main(context: StakeContext): Promise<void> {
  const vars = readDevVars();
  const resolver = resolverKeypair(env);
  if (!resolver) throw new Error("RESOLVER_KEY is missing. Run keygen.ts first.");
  const resolverAddress = resolver.toSuiAddress();
  const ids = { packageId: required(vars, "STAKE_PACKAGE"), configId: required(vars, "STAKE_CONFIG") };
  const adminCap = required(vars, "STAKE_ADMIN_CAP");
  const resolverCap = required(vars, "STAKE_RESOLVER_CAP");

  const config = await readConfig(context.client, ids.configId);
  if (config.minResolveDelayMs !== PROD_MIN_RESOLVE_DELAY_MS || config.challengeMs !== PROD_CHALLENGE_MS) {
    throw new Error(`refusing to hand over: delays are ${config.minResolveDelayMs} and ${config.challengeMs}, not the production values`);
  }
  if (config.treasury.toLowerCase() !== SLUSH) throw new Error("refusing to hand over: the treasury is not the Slush wallet");

  const stakeUpgradeCap = await upgradeCapFor(context, ids.packageId);
  const recallUpgradeCap = await upgradeCapFor(context, required(vars, "SOOTHIA_RECALL_PACKAGE"));

  const tx = new Transaction();
  tx.transferObjects([tx.object(resolverCap)], resolverAddress);
  tx.transferObjects([tx.object(adminCap), tx.object(stakeUpgradeCap), tx.object(recallUpgradeCap)], SLUSH);
  const [gas] = tx.splitCoins(tx.gas, [RESOLVER_GAS]);
  tx.transferObjects([gas], resolverAddress);
  const result = await execute(context, tx);
  console.log(`Handover: ${result.digest}\n  ${explorerTx(result.digest)}`);

  setDevVarComment("STAKE_ADMIN_CAP", "Held in the Slush wallet. Scripts cannot use it.");

  console.log("\nOwners, read back from chain:");
  const rows: [string, string][] = [
    ["Config", ids.configId],
    ["AdminCap", adminCap],
    ["ResolverCap", resolverCap],
    ["Staking UpgradeCap", stakeUpgradeCap],
    ["soothia_recall UpgradeCap", recallUpgradeCap],
  ];
  for (const [name, objectId] of rows) {
    const { object } = await context.client.core.getObject({ objectId });
    console.log(`  ${name}: ${objectId}\n    owner: ${ownerText(object.owner)}`);
  }
  console.log(`\nRESOLVER_KEY address: ${resolverAddress}, balance ${sui(await balanceOf(context, resolverAddress))}`);
  console.log(`Gas wallet: ${context.sender}, balance ${sui(await balanceOf(context, context.sender))}`);
}

main(stakeContext(env)).then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
