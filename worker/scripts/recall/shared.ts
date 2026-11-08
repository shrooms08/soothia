// Shared by the Total Recall CLI scripts: reads worker/.dev.vars, opens the
// Walrus Memory store, and keeps the local backup of picks. Nothing here may
// print a secret; every error shown to the operator goes through safeError.

import { createHash, randomBytes } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecallEnv } from "../../src/recall/env";
import type { Fixture } from "../../src/recall/espn";
import { memwalBackend, RecallStore, userKeyFor } from "../../src/recall/memory";
import { canonicalPick, type PickRecord } from "../../src/recall/records";

const WORKER_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const LOCAL_PICKS = join(WORKER_ROOT, ".recall-local", "picks.jsonl");

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
  return parseDevVars(readFileSync(join(WORKER_ROOT, ".dev.vars"), "utf8"));
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

/** The full error text, with any secret scrubbed. */
export function safeError(error: unknown, env?: Partial<RecallEnv>): string {
  const err = error as { name?: string; message?: string; cause?: { message?: string } };
  let text = err?.message ? `${err.name ?? "Error"}: ${err.message}` : String(error);
  if (err?.cause?.message) text += ` (cause: ${err.cause.message})`;
  for (const secret of [env?.MEMWAL_KEY, env?.TATUM_API_KEY, env?.SUI_COMMIT_KEY]) {
    if (!secret) continue;
    text = text.split(secret).join("[redacted]");
    text = text.split(secret.replace(/^0x/, "")).join("[redacted]");
  }
  return text;
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

/** Identifies a fixture across runs, so one match cannot be called twice. */
export function fixtureKey(fixture: { home: string; away: string; startISO: string }): string {
  return `${fixture.home}|${fixture.away}|${fixture.startISO}`;
}

/** "Sun 8 Nov", in UTC. */
export function dayLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).formatToParts(date);
  const part = (type: string): string => parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("weekday")} ${part("day")} ${part("month")}`;
}

export function timeIn(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

export function buildPick(
  fixture: Fixture,
  percent: number,
  anchor: { checkpoint: string; timestampMs: number } | null,
  now: Date,
): PickRecord {
  const start = new Date(fixture.startISO);
  const unsigned: Omit<PickRecord, "hash" | "commit"> = {
    id: `p_${Array.from(randomBytes(8), (byte) => byte.toString(16).padStart(2, "0")).join("")}`,
    at: now.toISOString(),
    question: `Will ${fixture.home} beat ${fixture.away} in ${fixture.competition} on ${dayLabel(start)}?`,
    category: "sports",
    pYes: percent / 100,
    marketYes: null,
    entities: [fixture.home, fixture.away],
    endTime: new Date(start.getTime() + 3 * 3_600_000).toISOString(),
    source: { site: "espn.com", url: fixture.url },
    fixture: {
      home: fixture.home,
      away: fixture.away,
      competition: fixture.competition,
      startISO: fixture.startISO,
      subject: "home",
    },
    ...(anchor ? { anchor: { ...anchor, via: "tatum-sui-mainnet" as const } } : {}),
  };
  const hash = createHash("sha256").update(canonicalPick(unsigned)).digest("hex");
  return { ...unsigned, hash, commit: null };
}
