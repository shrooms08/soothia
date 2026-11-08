// Mainnet smoke test for soothia_stake, run BEFORE the caps are handed over: it
// needs the AdminCap and ResolverCap in the gas wallet. It briefly shortens the
// delays, runs a pool end to end, and always puts the production delays back.
// Spends real SUI and takes about 4 minutes.
// Run: cd worker && npx tsx scripts/stake/smoke.ts

import { sha256Hex } from "../../src/recall/picks";
import { claimAmount, feeOn } from "../../src/stake/math";
import { ClaimedBcs, FeeCollectedBcs, PoolCreatedBcs, readConfig, readPool, readPosition } from "../../src/stake/readers";
import {
  buildClaim,
  buildCollectFee,
  buildCreatePool,
  buildResolve,
  buildSetDelays,
  buildStake,
  type StakeIds,
} from "../../src/stake/transactions";
import { loadEnvOrExit, readDevVars, safeError } from "../recall/shared";
import { balanceOf, execute, explorerTx, PROD_CHALLENGE_MS, PROD_MIN_RESOLVE_DELAY_MS, stakeContext, sui, type StakeContext } from "./shared";

const STAKE_AMOUNT = 100_000_000n;
const OPEN_FOR_MS = 2 * 60_000;
const SMOKE_CHALLENGE_MS = 60_000n;
// The chain's clock can trail ours by a few seconds.
const CLOCK_MARGIN_MS = 20_000;
const PICK_HASH = "ab".repeat(32);
const ABORT_CHALLENGE_WINDOW_OPEN = 19;

const env = loadEnvOrExit();
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

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

async function runPool(context: StakeContext, ids: StakeIds, resolverCap: string, feeBps: bigint, treasury: string): Promise<void> {
  const gasBefore = await balanceOf(context, context.sender);
  const treasuryBefore = await balanceOf(context, treasury);
  console.log(`Gas wallet before: ${sui(gasBefore)}. Treasury before: ${sui(treasuryBefore)}.`);

  const questionHash = await sha256Hex(`soothia-smoke-${Date.now()}`);
  const closeMs = Date.now() + OPEN_FOR_MS;
  const created = await execute(context, buildCreatePool(ids, { resolverCap, questionHash, closeMs: BigInt(closeMs) }));
  report("Create pool", created);
  const poolId = PoolCreatedBcs.parse(eventBytes(created, "PoolCreated")).pool;
  console.log(`  Pool: ${poolId}`);

  report("Stake 0.1 SUI on YES", await execute(context, buildStake(ids, { poolId, side: true, amount: STAKE_AMOUNT, pickHash: PICK_HASH })));

  const waitForClose = closeMs + CLOCK_MARGIN_MS - Date.now();
  console.log(`Waiting ${Math.ceil(waitForClose / 1000)} seconds for the pool to close...`);
  await sleep(waitForClose);

  report("Resolve YES", await execute(context, buildResolve(ids, { resolverCap, poolId, outcomeYes: true, evidence: "smoke test" })));
  const resolved = await readPool(context.client, poolId);
  console.log(`  Evidence on chain: "${resolved.evidence}". Challenge window: ${resolved.challengeMs} ms. Fee locked: ${resolved.feeBps} bps.`);

  let aborted = false;
  try {
    const early = await execute(context, buildClaim(ids, { poolId }));
    throw new Error(`the claim during the challenge window SUCCEEDED: ${early.digest}`);
  } catch (error) {
    const text = safeError(error, env);
    if (text.includes("SUCCEEDED") || !new RegExp(`\\b${ABORT_CHALLENGE_WINDOW_OPEN}\\b`).test(text)) throw error;
    aborted = true;
    console.log(`Early claim aborted as expected (code ${ABORT_CHALLENGE_WINDOW_OPEN}):\n  ${text.slice(0, 260)}`);
  }
  if (!aborted) throw new Error("expected the early claim to abort");

  const waitForWindow = Number(resolved.resolvedAtMs + resolved.challengeMs) + CLOCK_MARGIN_MS - Date.now();
  console.log(`Waiting ${Math.ceil(waitForWindow / 1000)} seconds for the challenge window to end...`);
  await sleep(waitForWindow);

  const position = await readPosition(context.client, resolved, context.sender);
  const expected = position ? claimAmount(resolved, position, BigInt(Date.now())) : 0n;
  const claimed = await execute(context, buildClaim(ids, { poolId }));
  report("Claim", claimed);
  const amount = BigInt(ClaimedBcs.parse(eventBytes(claimed, "Claimed")).amount);

  const collected = await execute(context, buildCollectFee(ids, { poolId }));
  report("Collect fee", collected);
  const fee = BigInt(FeeCollectedBcs.parse(eventBytes(collected, "FeeCollected")).amount);

  const final = await readPool(context.client, poolId);
  const spent = await readPosition(context.client, final, context.sender);
  const gasAfter = await balanceOf(context, context.sender);
  const treasuryAfter = await balanceOf(context, treasury);

  console.log(`\nClaimed: ${sui(amount)} (the TypeScript math expected ${sui(expected)})`);
  console.log(`Fee to treasury: ${sui(fee)} (1% of the stake is ${sui(feeOn(STAKE_AMOUNT, feeBps))})`);
  console.log(`Treasury: ${sui(treasuryBefore)} -> ${sui(treasuryAfter)}`);
  console.log(`Gas wallet: ${sui(gasBefore)} -> ${sui(gasAfter)}`);
  console.log(`Position marked claimed: ${spent?.claimed === true ? "yes" : "NO"}. Fee marked collected: ${final.feeCollected ? "yes" : "NO"}.`);
  if (amount !== expected) throw new Error("The claimed amount does not match the TypeScript math.");
  if (treasuryAfter - treasuryBefore !== fee) throw new Error("The treasury did not receive exactly the fee.");
}

async function main(context: StakeContext): Promise<void> {
  const vars = readDevVars();
  const ids = { packageId: required(vars, "STAKE_PACKAGE"), configId: required(vars, "STAKE_CONFIG") };
  const adminCap = required(vars, "STAKE_ADMIN_CAP");
  const resolverCap = required(vars, "STAKE_RESOLVER_CAP");
  const config = await readConfig(context.client, ids.configId);

  report("Shorten delays for the test", await execute(context, buildSetDelays(ids, { adminCap, minResolveDelayMs: 0n, challengeMs: SMOKE_CHALLENGE_MS })));
  try {
    await runPool(context, ids, resolverCap, config.feeBps, config.treasury);
  } finally {
    report(
      "Restore production delays",
      await execute(context, buildSetDelays(ids, { adminCap, minResolveDelayMs: PROD_MIN_RESOLVE_DELAY_MS, challengeMs: PROD_CHALLENGE_MS })),
    );
    const restored = await readConfig(context.client, ids.configId);
    console.log(`Config read back: min_resolve_delay_ms ${restored.minResolveDelayMs}, challenge_ms ${restored.challengeMs}`);
  }
}

main(stakeContext(env)).then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
