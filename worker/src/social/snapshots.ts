// Public profiles: the sweep that turns private records into public numbers, so no
// request ever reads Walrus. Three limits shape it:
//  - KV writes are rationed, so a snapshot is written only when it changed, and every
//    board lives in one value.
//  - One run can make about 50 outbound calls, so work is budgeted, profiles take turns,
//    and anything that can never change (a proof, a final result) is kept in the snapshot.
//  - A pick's kickoff comes from the web page it was made on, so "before kickoff" is
//    checked against ESPN's kickoff. Otherwise a faked late kickoff could farm the board.

import type { Env } from "../http";
import { fetchScoreboard, locateFixture, type ParsedScoreboard, type ScoreboardFetcher } from "../recall/espn";
import { memwalBackend, memwalConfigured, RecallStore } from "../recall/memory";
import { mergePicks } from "../recall/picks";
import type { OutcomeRecord, PickRecord, RecordByKind, StakeRecord } from "../recall/records";
import { latestBy, leanSide } from "../recall/scoring";
import { verifyCommit, type CommitProof } from "../recall/sui";
import { cacheGet, cachePut, kvPut } from "../store";
import { stakeSettings, tatumStakeChain, type StakeChain } from "../stake/chain";
import { estimatedPayout, positionResult } from "../stake/math";
import { BOARDS_KEY, HIDDEN_KEY, statsKey, type ProfileIndex } from "./context";
import { BOARDS, PERIODS, rankBoard, statsForPeriod, type Board, type BoardRow, type CallEntry, type Period, type PeriodStats, type StakeEntry } from "./stats";

const MAX_RECENT_CALLS = 50;
/** Leaves room under the 50 outbound calls for KV and the cache. */
const SWEEP_BUDGET = 40;
const WALRUS_READS = 3;
const POSITION_READS = 2;
/** One commit read, plus six leagues on two days when nothing is cached yet. */
const PROOF_WORST_CASE = 13;
const CURSOR_KEY = "social:sweep-cursor";
const CURSOR_TTL_SEC = 86_400;

export interface Proof {
  proven: boolean;
  kickoffMs?: number;
  competition?: string;
  teams?: string[];
}

export interface FinalPosition {
  result: "won" | "lost" | "refunded";
  amountMist: string;
  payoutMist: string;
}

export interface PublicCall {
  at: string;
  match: { home: string; away: string; startISO: string; competition: string | null };
  lean: string;
  side: "YES" | "NO";
  confidence: number;
  status: "open" | "right" | "wrong";
  stake: { amountMist: string; result: FinalPosition["result"] | null; payoutMist: string | null } | null;
  proof: { digest: string; url: string } | null;
}

export interface ProfileSnapshot {
  handle: string;
  address: string;
  publicSince: string;
  shareHistory: boolean;
  builtAt: string;
  periods: Record<Period, PeriodStats>;
  recent: PublicCall[];
  /** Kept between runs and never sent to a reader. */
  proofs: Record<string, Proof>;
  finals: Record<string, FinalPosition>;
}

export interface BoardsDocument {
  generatedAt: string;
  boards: Record<Board, Record<Period, BoardRow[]>>;
  /** For the league and team filters. */
  entries: { handle: string; periods: Record<Period, PeriodStats> }[];
}

export interface SnapshotDeps {
  store: (userKey: string) => Pick<RecallStore, "list">;
  checkCommit: (digest: string, hash: string) => Promise<CommitProof>;
  fetcher: ScoreboardFetcher;
  chain: Pick<StakeChain, "readPool" | "readPosition"> | null;
  now: Date;
}

export class Budget {
  constructor(public left: number) {}
  take(amount: number): boolean {
    if (this.left < amount) return false;
    this.left -= amount;
    return true;
  }
}

function budgetedFetcher(fetcher: ScoreboardFetcher, budget: Budget): ScoreboardFetcher {
  const boards = new Map<string, Promise<ParsedScoreboard>>();
  return (league, day) => {
    const key = `${league}:${day}`;
    let board = boards.get(key);
    if (!board) {
      budget.left -= 1;
      board = fetcher(league, day);
      boards.set(key, board);
    }
    return board;
  };
}

/** Whether a settled call was committed on Sui before ESPN's kickoff. Null means try again later. */
async function proveCall(pick: PickRecord, deps: SnapshotDeps, fetcher: ScoreboardFetcher): Promise<Proof | null> {
  const commit = await deps.checkCommit((pick.commit as NonNullable<PickRecord["commit"]>).digest, pick.hash);
  if (!commit.verified) return commit.problem === "hash_mismatch" || commit.problem === "no_commit_event" ? { proven: false } : null;
  if (commit.timestampMs === null) return null;
  const { located, eventsSeen } = await locateFixture(pick.fixture as NonNullable<PickRecord["fixture"]>, fetcher);
  if (!located) return eventsSeen > 0 ? { proven: false } : null;
  const kickoffMs = Date.parse(located.event.startISO);
  return { proven: commit.timestampMs < kickoffMs, kickoffMs, competition: located.event.competition, teams: [located.event.home.name, located.event.away.name] };
}

async function finalPosition(poolId: string, address: string, chain: NonNullable<SnapshotDeps["chain"]>, nowMs: number): Promise<FinalPosition | null> {
  const pool = await chain.readPool(poolId);
  const position = await chain.readPosition(pool, address);
  if (!position) return null;
  const result = positionResult(pool, position, BigInt(nowMs));
  return result === null ? null : { result, amountMist: position.amount.toString(), payoutMist: estimatedPayout(pool, position).toString() };
}

const isPublic = (pick: PickRecord, profile: ProfileIndex): boolean => profile.shareHistory || pick.at >= profile.publicSince;

/** Builds one profile's snapshot, reusing what can't have changed. */
export async function buildSnapshot(profile: ProfileIndex, previous: ProfileSnapshot | null, deps: SnapshotDeps, budget: Budget): Promise<ProfileSnapshot> {
  const nowMs = deps.now.getTime();
  const store = deps.store(profile.userKey);
  const [rawPicks, rawOutcomes, rawStakes] = (await Promise.all([store.list("pick", true), store.list("outcome", true), store.list("stake", true)])) as [
    RecordByKind["pick"][],
    OutcomeRecord[],
    StakeRecord[],
  ];
  budget.take(WALRUS_READS);

  const picks = mergePicks(rawPicks).filter((pick) => pick.fixture && isPublic(pick, profile));
  const outcomes = latestBy(rawOutcomes, (outcome) => outcome.pickId);
  const seenDigests = new Set<string>();
  const stakesByPick = new Map<string, StakeRecord[]>();
  for (const stake of rawStakes) {
    if (seenDigests.has(stake.digest) || stake.sender.toLowerCase() !== profile.address) continue;
    seenDigests.add(stake.digest);
    stakesByPick.set(stake.pickId, [...(stakesByPick.get(stake.pickId) ?? []), stake]);
  }

  const proofs = { ...previous?.proofs };
  const finals = { ...previous?.finals };
  const fetcher = budgetedFetcher(deps.fetcher, budget);

  for (const pick of picks) {
    if (proofs[pick.id] || !pick.commit || !outcomes.has(pick.id)) continue;
    if (!budget.take(1) || budget.left < PROOF_WORST_CASE - 1) break;
    try {
      const proof = await proveCall(pick, deps, fetcher);
      if (proof) proofs[pick.id] = proof;
    } catch (error) {
      console.warn(`Soothia: proof check failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }

  if (deps.chain) {
    for (const pick of picks) {
      const stakes = stakesByPick.get(pick.id);
      if (!stakes || nowMs < Date.parse((pick.fixture as NonNullable<PickRecord["fixture"]>).startISO)) continue;
      const { poolId } = stakes[0];
      if (finals[poolId]) continue;
      if (!budget.take(POSITION_READS)) break;
      try {
        const final = await finalPosition(poolId, profile.address, deps.chain, nowMs);
        if (final) finals[poolId] = final;
      } catch (error) {
        console.warn(`Soothia: position read failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
      }
    }
  }

  const calls: CallEntry[] = [];
  const stakes: StakeEntry[] = [];
  const recent: PublicCall[] = [];
  for (const pick of picks) {
    const fixture = pick.fixture as NonNullable<PickRecord["fixture"]>;
    const outcome = outcomes.get(pick.id);
    const proof = proofs[pick.id];
    const kickoffMs = proof?.kickoffMs ?? Date.parse(fixture.startISO);
    const competition = proof?.competition ?? fixture.competition ?? "";
    const teams = proof?.teams ?? [fixture.home, fixture.away];
    const match = `${fixture.home} vs ${fixture.away}`;

    // An open call counts as made; a settled one only once it is proven before kickoff.
    if (pick.commit && (!outcome || proof?.proven)) {
      calls.push({ kickoffMs, competition, teams, result: outcome ? { hit: outcome.hit, brier: outcome.brier } : null });
    }

    const pickStakes = stakesByPick.get(pick.id) ?? [];
    const final = pickStakes[0] ? finals[pickStakes[0].poolId] : undefined;
    const recorded = pickStakes.reduce((sum, stake) => sum + BigInt(stake.amountMist), 0n);
    if (pickStakes.length > 0) {
      stakes.push({ kickoffMs, competition, teams, match, stakedMist: final ? BigInt(final.amountMist) : recorded, result: final?.result ?? null, payoutMist: final ? BigInt(final.payoutMist) : 0n });
    }

    recent.push({
      at: pick.at,
      match: { home: fixture.home, away: fixture.away, startISO: fixture.startISO, competition: competition || null },
      lean: leanSide(pick),
      side: pick.pYes >= 0.5 ? "YES" : "NO",
      confidence: Math.round(Math.max(pick.pYes, 1 - pick.pYes) * 100),
      status: outcome ? (outcome.hit ? "right" : "wrong") : "open",
      stake: pickStakes.length > 0 ? { amountMist: (final ? BigInt(final.amountMist) : recorded).toString(), result: final?.result ?? null, payoutMist: final?.payoutMist ?? null } : null,
      proof: pick.commit ? { digest: pick.commit.digest, url: `https://suivision.xyz/txblock/${encodeURIComponent(pick.commit.digest)}` } : null,
    });
  }

  recent.sort((a, b) => b.at.localeCompare(a.at));
  return {
    handle: profile.handle,
    address: profile.address,
    publicSince: profile.publicSince,
    shareHistory: profile.shareHistory,
    builtAt: deps.now.toISOString(),
    periods: Object.fromEntries(PERIODS.map((period) => [period, statsForPeriod(calls, stakes, period, nowMs)])) as Record<Period, PeriodStats>,
    recent: recent.slice(0, MAX_RECENT_CALLS),
    proofs,
    finals,
  };
}

const withoutTime = <T extends { builtAt?: string; generatedAt?: string }>(value: T): string => JSON.stringify({ ...value, builtAt: "", generatedAt: "" });

/** Boards from every profile's snapshot. */
export function buildBoards(snapshots: ProfileSnapshot[], now: Date): BoardsDocument {
  const entries = snapshots.map(({ handle, periods }) => ({ handle, periods }));
  const boards = Object.fromEntries(
    BOARDS.map((board) => [board, Object.fromEntries(PERIODS.map((period) => [period, rankBoard(board, entries.map(({ handle, periods }) => ({ handle, stats: periods[period].stats })))]))]),
  ) as BoardsDocument["boards"];
  return { generatedAt: now.toISOString(), boards, entries };
}

export interface SweepSocialDeps extends Partial<SnapshotDeps> {
  budget?: number;
}

/** Rebuilds as many profiles as the budget allows, then the boards. */
export async function sweepSocial(env: Env, overrides: SweepSocialDeps = {}): Promise<{ rebuilt: number; written: number; boardsWritten: boolean }> {
  if (!overrides.store && !memwalConfigured(env)) return { rebuilt: 0, written: 0, boardsWritten: false };
  const settings = stakeSettings(env);
  const deps: SnapshotDeps = {
    store: overrides.store ?? ((userKey) => new RecallStore(memwalBackend(env), userKey, false)),
    checkCommit: overrides.checkCommit ?? ((digest, hash) => verifyCommit(env, digest, hash)),
    fetcher: overrides.fetcher ?? fetchScoreboard,
    chain: overrides.chain !== undefined ? overrides.chain : settings ? tatumStakeChain(env, settings) : null,
    now: overrides.now ?? new Date(),
  };
  const kv = env.SOOTHIA_CACHE;
  const startedMs = deps.now.getTime();

  const profileNames = (await kv.list({ prefix: "profile:", limit: 1000 })).keys.map((key) => key.name.slice("profile:".length));
  const built = new Set((await kv.list({ prefix: "socialstats:", limit: 1000 })).keys.map((key) => key.name.slice("socialstats:".length)));

  // New profiles first, then whoever's turn it is.
  const cursor = (await cacheGet<string>(CURSOR_KEY)) ?? "";
  const rest = profileNames.filter((handle) => built.has(handle)).sort();
  const turn = rest.findIndex((handle) => handle > cursor);
  const order = [...profileNames.filter((handle) => !built.has(handle)), ...(turn < 0 ? rest : [...rest.slice(turn), ...rest.slice(0, turn)])];

  const budget = new Budget(overrides.budget ?? SWEEP_BUDGET);
  let rebuilt = 0;
  let written = 0;
  for (const handle of order) {
    if (budget.left < WALRUS_READS) break;
    try {
      const profile = await kv.get<ProfileIndex>(`profile:${handle}`, "json");
      if (!profile) continue;
      const previous = await kv.get<ProfileSnapshot>(statsKey(handle), "json");
      const next = await buildSnapshot(profile, previous, deps, budget);
      rebuilt += 1;
      await cachePut(CURSOR_KEY, handle, CURSOR_TTL_SEC);
      if (!previous || withoutTime(previous) !== withoutTime(next)) {
        if (await kvPut(env, statsKey(handle), JSON.stringify(next))) written += 1;
      }
    } catch (error) {
      // One profile's failure must not stop the others.
      console.warn(`Soothia: social sweep failed on ${handle}: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    }
  }

  const live = new Set(profileNames);
  const snapshots = (await Promise.all(profileNames.map((handle) => kv.get<ProfileSnapshot>(statsKey(handle), "json")))).filter(
    (snapshot): snapshot is ProfileSnapshot => snapshot !== null && live.has(snapshot.handle),
  );
  const boards = buildBoards(snapshots, deps.now);
  const previousBoards = await kv.get<BoardsDocument>(BOARDS_KEY, "json");
  const boardsChanged = !previousBoards || withoutTime(previousBoards) !== withoutTime(boards);
  if (boardsChanged) await kvPut(env, BOARDS_KEY, JSON.stringify(boards));

  // The boards no longer list these, so the stop-gap can go.
  const hidden = (await kv.get<{ handle: string; at: number }[]>(HIDDEN_KEY, "json")) ?? [];
  const stillHidden = hidden.filter((entry) => entry.at >= startedMs);
  if (stillHidden.length !== hidden.length) await kvPut(env, HIDDEN_KEY, JSON.stringify(stillHidden));

  return { rebuilt, written, boardsWritten: boardsChanged };
}
