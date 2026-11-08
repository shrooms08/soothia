// One-off: adds rp:<pickId> sweep entries to production KV for picks made with
// the CLI, so the deployed cron settles them. Run once, after deploying.
// Run: cd worker && npx tsx scripts/recall/index-existing.ts
// Add --dry-run to print the count without writing to KV.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { userKeyFor } from "../../src/recall/memory";
import { SWEEP_PREFIX } from "../../src/recall/sweep";
import { loadEnvOrExit, loadPicks, openStore, safeError, WORKER_ROOT } from "./shared";

const BULK_FILE = join(WORKER_ROOT, ".recall-local", "rp-bulk.json");

const env = loadEnvOrExit();

async function main(): Promise<void> {
  const store = await openStore(env);
  const { merged } = await loadPicks(store, env);
  const closed = new Set((await store.list("outcome", true)).map((outcome) => outcome.pickId));
  const open = merged.filter((pick) => !closed.has(pick.id));
  const userKey = await userKeyFor(env.RECALL_INSTALL_ID);
  const entries = open.map((pick) => ({
    key: `${SWEEP_PREFIX}${pick.id}`,
    value: JSON.stringify({ userKey }),
    metadata: { userKey },
  }));
  console.log(`Open picks to index: ${entries.length} of ${merged.length}`);
  if (process.argv.includes("--dry-run") || entries.length === 0) return;

  mkdirSync(dirname(BULK_FILE), { recursive: true });
  writeFileSync(BULK_FILE, JSON.stringify(entries));
  execFileSync("npx", ["wrangler", "kv", "bulk", "put", BULK_FILE, "--binding", "SOOTHIA_CACHE", "--remote"], {
    cwd: WORKER_ROOT,
    stdio: "inherit",
  });
  console.log("Indexed.");
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
