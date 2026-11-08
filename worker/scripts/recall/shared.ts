// Shared by the Total Recall CLI scripts: reads worker/.dev.vars, opens the
// Walrus Memory store, and keeps the local backup of picks. Nothing here may
// print a secret; every error shown to the operator goes through safeError.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecallEnv } from "../../src/recall/env";
import { memwalBackend, RecallStore, userKeyFor } from "../../src/recall/memory";
import { mergePicks } from "../../src/recall/picks";
import type { PickRecord } from "../../src/recall/records";

export const WORKER_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const LOCAL_PICKS = join(WORKER_ROOT, ".recall-local", "picks.jsonl");
const DEV_VARS = join(WORKER_ROOT, ".dev.vars");

export type CliEnv = RecallEnv & { RECALL_INSTALL_ID: string };

export function parseDevVars(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals < 1) continue;
    vars[trimmed.slice(0, equals).trim()] = trimmed
      .slice(equals + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
  }
  return vars;
}

export function readDevVars(): Record<string, string> {
  return parseDevVars(readFileSync(DEV_VARS, "utf8"));
}

/** Sets one non-secret key in .dev.vars, leaving every other line alone. */
export function setDevVar(name: string, value: string): void {
  const text = readFileSync(DEV_VARS, "utf8");
  const line = new RegExp(`^${name}=.*$`, "m");
  const next = line.test(text) ? text.replace(line, `${name}=${value}`) : `${text.replace(/\n*$/, "\n")}${name}=${value}\n`;
  writeFileSync(DEV_VARS, next);
}

export function loadEnv(): CliEnv {
  const vars = readDevVars();
  const missing = ["MEMWAL_ACCOUNT_ID", "MEMWAL_KEY", "RECALL_INSTALL_ID"].filter((name) => !vars[name]);
  if (missing.length) throw new Error(`Missing in worker/.dev.vars: ${missing.join(", ")}`);
  // Sui object ids are 0x-prefixed and the client sends this one as given.
  if (/^[0-9a-f]{64}$/i.test(vars.MEMWAL_ACCOUNT_ID)) vars.MEMWAL_ACCOUNT_ID = `0x${vars.MEMWAL_ACCOUNT_ID}`;
  return vars as unknown as CliEnv;
}

export function loadEnvOrExit(): CliEnv {
  try {
    return loadEnv();
  } catch (error) {
    console.error(safeError(error));
    process.exit(1);
    throw error;
  }
}

export async function openStore(env: CliEnv): Promise<RecallStore> {
  return new RecallStore(memwalBackend(env), await userKeyFor(env.RECALL_INSTALL_ID), false);
}

/** Removes any secret from text about to be printed. */
export function scrub(text: string, env?: Partial<RecallEnv>): string {
  let clean = text;
  for (const secret of [env?.MEMWAL_KEY, env?.TATUM_API_KEY, env?.SUI_COMMIT_KEY]) {
    if (!secret) continue;
    clean = clean.split(secret).join("[redacted]");
    clean = clean.split(secret.replace(/^0x/, "")).join("[redacted]");
  }
  return clean;
}

/** The full error text, with any secret scrubbed. */
export function safeError(error: unknown, env?: Partial<RecallEnv>): string {
  const err = error as { name?: string; message?: string; cause?: { message?: string } };
  let text = err?.message ? `${err.name ?? "Error"}: ${err.message}` : String(error);
  if (err?.cause?.message) text += ` (cause: ${err.cause.message})`;
  return scrub(text, env);
}

export function readLocalPicks(): PickRecord[] {
  if (!existsSync(LOCAL_PICKS)) return [];
  const picks: PickRecord[] = [];
  for (const line of readFileSync(LOCAL_PICKS, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try {
      picks.push(JSON.parse(line) as PickRecord);
    } catch {
      console.warn("Warning: skipped an unreadable line in the local picks backup.");
    }
  }
  return picks;
}

export function appendLocalPick(pick: PickRecord): void {
  mkdirSync(dirname(LOCAL_PICKS), { recursive: true });
  appendFileSync(LOCAL_PICKS, `${JSON.stringify(pick)}\n`);
}

/** Walrus and the local backup combined, with one record per pick. */
export async function loadPicks(store: RecallStore, env: CliEnv): Promise<{ walrus: PickRecord[]; merged: PickRecord[]; walrusOk: boolean }> {
  let walrus: PickRecord[] = [];
  let walrusOk = true;
  try {
    walrus = mergePicks(await store.list("pick", true));
  } catch (error) {
    walrusOk = false;
    console.log(`Could not read picks from Walrus, using the local backup: ${safeError(error, env)}`);
  }
  return { walrus, merged: mergePicks([...walrus, ...readLocalPicks()]), walrusOk };
}

/** Identifies a fixture across runs, so one match cannot be called twice. */
export function fixtureKey(fixture: { home: string; away: string; startISO: string }): string {
  return `${fixture.home}|${fixture.away}|${fixture.startISO}`;
}

export function timeIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "3h 12m". */
export function formatGap(ms: number): string {
  const minutes = Math.floor(Math.abs(ms) / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
