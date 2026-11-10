// Shared by the staking CLI scripts. Real SUI moves here: every transaction is
// checked, and every error goes through safeError so no secret is printed.

import type { Transaction } from "@mysten/sui/transactions";
import type { CliEnv } from "../recall/shared";
import { commitKeypair } from "../../src/recall/sui";
import { tatumSuiClient } from "../../src/recall/tatumGrpc";

export { PROD_CHALLENGE_MS, PROD_MIN_RESOLVE_DELAY_MS } from "../../src/stake/math";

const GAS_BUDGET = 50_000_000;
const SETTLE_MS = 30_000;

export function stakeContext(env: CliEnv) {
  const signer = commitKeypair(env);
  if (!signer) throw new Error("The commit key in worker/.dev.vars is not a usable Ed25519 key.");
  const key = env.TATUM_API_KEY?.trim();
  if (!key) throw new Error("TATUM_API_KEY is missing in worker/.dev.vars.");
  return { signer, sender: signer.toSuiAddress(), client: tatumSuiClient(key) };
}

export type StakeContext = ReturnType<typeof stakeContext>;

/** Signs and runs a transaction, and waits until it settles. Throws if it failed. */
export async function execute(context: StakeContext, tx: Transaction, gasBudget = GAS_BUDGET) {
  tx.setSender(context.sender);
  tx.setGasBudget(gasBudget);
  const result = await context.client.core.signAndExecuteTransaction({
    transaction: tx,
    signer: context.signer,
    include: { effects: true, objectTypes: true, events: true },
  });
  if (result.$kind === "FailedTransaction") {
    throw new Error(
      `transaction ${result.FailedTransaction.digest} failed: ${JSON.stringify(result.FailedTransaction.status.error).slice(0, 400)}`,
    );
  }
  await context.client.core.waitForTransaction({ result, timeout: SETTLE_MS }).catch(() => undefined);
  return result.Transaction;
}

export const explorerTx = (digest: string): string => `https://suivision.xyz/txblock/${digest}`;

export const sui = (mist: bigint): string => `${(Number(mist) / 1e9).toFixed(6)} SUI`;

export async function balanceOf(context: StakeContext, owner: string): Promise<bigint> {
  const { balance } = await context.client.core.getBalance({ owner });
  return BigInt(balance.balance);
}
