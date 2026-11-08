// Mainnet smoke test for soothia_stake: create a pool, stake 0.1 SUI on YES, wait
// for it to close, resolve YES, and claim. Spends real SUI and takes about 4 minutes.
// Run: cd worker && npx tsx scripts/stake/smoke.ts

import { sha256Hex } from "../../src/recall/picks";
import { claimAmount, feeOn } from "../../src/stake/math";
import { ClaimedBcs, PoolCreatedBcs, readConfig, readPool, readPosition, ResolvedBcs } from "../../src/stake/readers";
import { buildClaim, buildCreatePool, buildResolve, buildStake } from "../../src/stake/transactions";
import { loadEnvOrExit, readDevVars, safeError } from "../recall/shared";
import { balanceOf, execute, explorerTx, stakeContext, sui, type StakeContext } from "./shared";

const STAKE_AMOUNT = 100_000_000n;
const OPEN_FOR_MS = 3 * 60_000;
// The chain's clock can trail ours by a few seconds.
const CLOCK_MARGIN_MS = 20_000;
const PICK_HASH = "ab".repeat(32);

const env = loadEnvOrExit();

type Executed = Awaited<ReturnType<typeof execute>>;

function eventBytes(result: Executed, name: string): Uint8Array {
  const event = result.events.find((candidate) => candidate.eventType.endsWith(`::pool::${name}`));
  if (!event) throw new Error(`no ${name} event in ${result.digest}`);
  return event.bcs;
}

function report(step: string, result: Executed): void {
  console.log(`${step}: ${result.digest}\n  ${explorerTx(result.digest)}`);
}

function required(vars: Record<string, string>, name: string): string {
  const value = vars[name]?.trim();
  if (!value) throw new Error(`${name} is missing in worker/.dev.vars. Run publish.ts first.`);
  return value;
}

async function main(context: StakeContext): Promise<void> {
  const vars = readDevVars();
  const ids = { packageId: required(vars, "STAKE_PACKAGE"), configId: required(vars, "STAKE_CONFIG") };
  const resolverCap = required(vars, "STAKE_RESOLVER_CAP");
  const config = await readConfig(context.client, ids.configId);

  const gasBefore = await balanceOf(context, context.sender);
  const treasuryBefore = await balanceOf(context, config.treasury);
  console.log(`Gas wallet before: ${sui(gasBefore)}. Treasury before: ${sui(treasuryBefore)}.`);

  const questionHash = await sha256Hex(`soothia-smoke-${Date.now()}`);
  const closeMs = Date.now() + OPEN_FOR_MS;
  const created = await execute(context, buildCreatePool(ids, { resolverCap, questionHash, closeMs: BigInt(closeMs) }));
  report("Create pool", created);
  const poolId = PoolCreatedBcs.parse(eventBytes(created, "PoolCreated")).pool;
  console.log(`  Pool: ${poolId}`);

  report("Stake 0.1 SUI on YES", await execute(context, buildStake(ids, { poolId, side: true, amount: STAKE_AMOUNT, pickHash: PICK_HASH })));
  const open = await readPool(context.client, poolId);
  const position = await readPosition(context.client, open, context.sender);
  console.log(`  Read back: status ${open.status}, YES ${sui(open.yes)}, position ${position ? `${sui(position.amount)} on ${position.side ? "YES" : "NO"}` : "NOT FOUND"}`);

  const waitMs = closeMs + CLOCK_MARGIN_MS - Date.now();
  console.log(`Waiting ${Math.ceil(waitMs / 1000)} seconds for the pool to close...`);
  await new Promise((resolve) => setTimeout(resolve, waitMs));

  const resolved = await execute(context, buildResolve(ids, { resolverCap, poolId, outcomeYes: true }));
  report("Resolve YES", resolved);
  const fee = BigInt(ResolvedBcs.parse(eventBytes(resolved, "Resolved")).fee);
  const settled = await readPool(context.client, poolId);
  const expected = position ? claimAmount(settled, position) : 0n;

  const claimed = await execute(context, buildClaim(ids, { poolId }));
  report("Claim", claimed);
  const amount = BigInt(ClaimedBcs.parse(eventBytes(claimed, "Claimed")).amount);

  const gasAfter = await balanceOf(context, context.sender);
  const treasuryAfter = await balanceOf(context, config.treasury);
  const spent = await readPosition(context.client, settled, context.sender);

  console.log(`\nClaimed: ${sui(amount)} (the TypeScript math expected ${sui(expected)})`);
  console.log(`Fee to treasury: ${sui(fee)} (1% of the stake is ${sui(feeOn(STAKE_AMOUNT, config.feeBps))})`);
  console.log(`Treasury: ${sui(treasuryBefore)} -> ${sui(treasuryAfter)}`);
  console.log(`Gas wallet: ${sui(gasBefore)} -> ${sui(gasAfter)}`);
  console.log(`Position marked claimed: ${spent?.claimed === true ? "yes" : "NO"}`);
  if (amount !== expected) throw new Error("The claimed amount does not match the TypeScript math.");
}

main(stakeContext(env)).then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
