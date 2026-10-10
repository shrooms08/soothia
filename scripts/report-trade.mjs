// Backfill: tell Panta about a bet that landed on-chain but was never reported.
// Reads PANTA_API_KEY from the root .env (never printed). Idempotent: Panta
// keys attribution by signature. Usage:
//   node scripts/report-trade.mjs <signature> <wallet> <marketId> [quoteId]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const [signature, wallet, marketId, quoteId] = process.argv.slice(2);
if (!signature || !wallet || !marketId) {
  console.error("usage: node scripts/report-trade.mjs <signature> <wallet> <marketId> [quoteId]");
  process.exit(2);
}
const env = readFileSync(fileURLToPath(new URL("../.env", import.meta.url)), "utf8");
const key = (env.match(/^PANTA_API_KEY=(.*)$/m)?.[1] ?? "").trim();
if (!key) { console.error("PANTA_API_KEY missing in .env"); process.exit(2); }
const B = "https://live-api.panta.market/api/v1";
const headers = { "X-Api-Key": key, Accept: "application/json", "Content-Type": "application/json" };

const before = await (await fetch(`${B}/trades/${encodeURIComponent(signature)}/`, { headers })).json().catch(() => null);
console.log("status before:", JSON.stringify(before));
const body = { signature, wallet, marketId, ...(quoteId ? { quoteId } : {}) };
const response = await fetch(`${B}/trades/`, { method: "POST", headers, body: JSON.stringify(body) });
console.log("report:", response.status, JSON.stringify(await response.json().catch(() => null)));
const after = await (await fetch(`${B}/trades/${encodeURIComponent(signature)}/`, { headers })).json().catch(() => null);
console.log("status after:", JSON.stringify(after));
