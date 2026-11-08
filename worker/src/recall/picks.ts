// Total Recall: building a pick. Shared by the CLI and the Worker routes, so it
// uses only Web APIs. Anchor and commit failures never lose the call: the pick is
// still returned, with a warning, and with no anchor or commit.

import type { RecallEnv } from "./env";
import type { Fixture } from "./espn";
import { canonicalPick, type CommitSkipReason, type PickFixture, type PickRecord } from "./records";
import { commitConfigured, commitPick, latestCheckpoint } from "./sui";

export interface PickInput {
  question: string;
  category: string;
  pYes: number;
  marketYes: number | null;
  entities: string[];
  endTime: string;
  source: { site: string; url: string };
  fixture?: PickFixture;
  marketId?: string;
}

export interface BuildPickOptions {
  warn?: (message: string) => void;
  /** Asked before spending on a commit. A returned reason skips the commit. */
  guard?: () => Promise<CommitSkipReason | null>;
}

const MATCH_LENGTH_MS = 3 * 3_600_000;

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

/** The question and fields for "Will <home> beat <away>". */
export function fixturePickInput(fixture: Fixture, percent: number): PickInput {
  const start = new Date(fixture.startISO);
  return {
    question: `Will ${fixture.home} beat ${fixture.away} in ${fixture.competition} on ${dayLabel(start)}?`,
    category: "sports",
    pYes: percent / 100,
    marketYes: null,
    entities: [fixture.home, fixture.away],
    endTime: new Date(start.getTime() + MATCH_LENGTH_MS).toISOString(),
    source: { site: "espn.com", url: fixture.url },
    fixture: {
      home: fixture.home,
      away: fixture.away,
      competition: fixture.competition,
      startISO: fixture.startISO,
      subject: "home",
    },
  };
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(text: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
}

const message = (error: unknown): string => String((error as Error)?.message ?? error);

/** Adds the id, anchor, hash and, when configured, the Sui commit. */
export async function buildPick(input: PickInput, env: RecallEnv, options: BuildPickOptions = {}): Promise<PickRecord> {
  const warn = options.warn ?? ((text: string) => console.warn(text));

  let anchor: { checkpoint: string; timestampMs: number } | null = null;
  try {
    anchor = await latestCheckpoint(env);
  } catch (error) {
    warn(`no Sui anchor for this call: ${message(error)}`);
  }

  const unsigned: Omit<PickRecord, "hash" | "commit"> = {
    id: `p_${hex(crypto.getRandomValues(new Uint8Array(8)))}`,
    at: new Date().toISOString(),
    question: input.question,
    category: input.category,
    pYes: input.pYes,
    marketYes: input.marketYes,
    entities: input.entities,
    endTime: input.endTime,
    source: input.source,
    ...(input.fixture ? { fixture: input.fixture } : {}),
    ...(input.marketId ? { marketId: input.marketId } : {}),
    ...(anchor ? { anchor: { ...anchor, via: "tatum-sui-mainnet" as const } } : {}),
  };
  const hash = await sha256Hex(canonicalPick(unsigned));

  let commit: PickRecord["commit"] = null;
  let commitSkipped: CommitSkipReason | null = null;
  if (commitConfigured(env)) {
    commitSkipped = options.guard ? await options.guard() : null;
    if (!commitSkipped) {
      try {
        commit = { digest: await commitPick(env, hash, unsigned.id), network: "mainnet" };
      } catch (error) {
        warn(`not committed on Sui: ${message(error)}`);
      }
    }
  }
  return { ...unsigned, hash, commit, ...(commitSkipped ? { commitSkipped } : {}) };
}

/**
 * One record per pick id, keeping a version with a Sui commit. An updated pick
 * keeps its original `at` because `at` is hashed, so timestamps cannot rank
 * versions, and Walrus Memory is append-only so both versions come back.
 */
export function mergePicks(picks: PickRecord[]): PickRecord[] {
  const byId = new Map<string, PickRecord>();
  for (const pick of picks) {
    const existing = byId.get(pick.id);
    if (!existing || (!existing.commit && pick.commit)) byId.set(pick.id, pick);
  }
  return [...byId.values()];
}
