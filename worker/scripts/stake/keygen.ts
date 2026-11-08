// Makes RESOLVER_KEY and saves it to worker/.dev.vars. Prints only its address.
// Does nothing if the key already exists, so it can never replace a funded key.
// Run: cd worker && npx tsx scripts/stake/keygen.ts

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { resolverKeypair } from "../../src/recall/sui";
import { loadEnvOrExit, readDevVars, setDevVar } from "../recall/shared";

const env = loadEnvOrExit();

if (readDevVars().RESOLVER_KEY) {
  const existing = resolverKeypair(env);
  if (!existing) {
    console.error("RESOLVER_KEY is set in worker/.dev.vars but is not a usable key.");
    process.exit(1);
  }
  console.log(`RESOLVER_KEY already exists. Address: ${existing!.toSuiAddress()}`);
  process.exit(0);
}

const keypair = Ed25519Keypair.generate();
setDevVar("RESOLVER_KEY", keypair.getSecretKey());
console.log(`RESOLVER_KEY saved to worker/.dev.vars. Address: ${keypair.toSuiAddress()}`);
process.exit(0);
