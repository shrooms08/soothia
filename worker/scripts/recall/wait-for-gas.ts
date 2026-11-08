// Polls the commit key's SUI balance through Tatum until it can pay for commits.
// Run: cd worker && npx tsx scripts/recall/wait-for-gas.ts

import { commitKeypair } from "../../src/recall/sui";
import { tatumSuiClient } from "../../src/recall/tatumGrpc";
import { loadEnvOrExit, safeError } from "./shared";

const MIN_MIST = 300_000_000n;
const POLL_MS = 30_000;
const MAX_POLLS = 90;

const env = loadEnvOrExit();
const signer = commitKeypair(env);
if (!signer) {
  console.error("The commit key in worker/.dev.vars is not a usable Ed25519 key.");
  process.exit(1);
}
const owner = signer!.toSuiAddress();
const client = tatumSuiClient(env.TATUM_API_KEY.trim());

let last = "";
for (let poll = 0; poll < MAX_POLLS; poll++) {
  try {
    const { balance } = await client.core.getBalance({ owner });
    if (balance.balance !== last) {
      last = balance.balance;
      console.log(`${new Date().toISOString()} balance ${Number(balance.balance) / 1e9} SUI`);
    }
    if (BigInt(balance.balance) >= MIN_MIST) {
      console.log("FUNDED");
      process.exit(0);
    }
  } catch (error) {
    console.log(`${new Date().toISOString()} poll failed: ${safeError(error, env)}`);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_MS));
}
console.log("TIMED OUT after 45 minutes");
process.exit(2);
