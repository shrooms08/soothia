// Soothia staking: which pool a fixture question belongs to. A pool is permanent on
// Sui, so this key must never change once pools exist under it.
//
// Listings disagree about who is home, so the teams are put in alphabetical order
// and the subject is expressed against that order: "Arsenal to beat Newcastle" is one
// pool however the page lists the match. Names go through teamKey, which is entityKey
// plus the alias table, so "Newcastle" and "Newcastle United" are one pool too.

import { sha256Hex } from "../http";
import { teamKey } from "../recall/espn";

export type Subject = "home" | "away";

export interface PoolFixture {
  home: string;
  away: string;
  startISO: string;
}

export interface PoolIdentity {
  key: string;
  /** SHA-256 of the key, 64 hex characters. */
  questionHash: string;
  /** Kickoff in milliseconds. */
  closeMs: bigint;
}

export const flipSubject = (subject: Subject): Subject => (subject === "home" ? "away" : "home");

/** The pool key, or an error for a fixture that cannot name a pool. */
export function poolKey(fixture: PoolFixture, subject: Subject): string {
  const home = teamKey(fixture.home);
  const away = teamKey(fixture.away);
  if (!home || !away || home === away) throw new Error("invalid_fixture_teams");
  const startMs = Date.parse(fixture.startISO);
  if (Number.isNaN(startMs)) throw new Error("invalid_fixture_start");
  const date = new Date(startMs).toISOString().slice(0, 10);
  const swapped = home > away;
  const [first, second] = swapped ? [away, home] : [home, away];
  return `soothia-pool-v1|fixture|${first}|${second}|${date}|${swapped ? flipSubject(subject) : subject}`;
}

export async function poolIdentity(fixture: PoolFixture, subject: Subject): Promise<PoolIdentity> {
  const key = poolKey(fixture, subject);
  return { key, questionHash: await sha256Hex(key), closeMs: BigInt(Date.parse(fixture.startISO)) };
}
