// The pure logic behind the My record tab. No DOM and no chrome.*, so all of it is tested.

import type { RecallLesson, RecallRecord, RecallRecordPick } from "./messages";
import { leanSide } from "./recall-logic";
import { formatSui, isClaimable, positionStatusText, signedSuiShort, walletSummary, type StakePositionView } from "./stake-logic";

export const RECORD_SECTIONS = ["calls", "lessons", "wallet", "me"] as const;
export type RecordSection = (typeof RECORD_SECTIONS)[number];

export const isRecordSection = (value: unknown): value is RecordSection => (RECORD_SECTIONS as readonly unknown[]).includes(value);

export interface RecordHeader {
  identity: string;
  isPublic: boolean;
  score: string;
  scoreNote: string | null;
  summary: string;
}

/** Wallet positions when connected, otherwise what the record itself knows. */
export function stakesForSummary(positions: StakePositionView[], picks: RecallRecordPick[]): StakePositionView[] {
  if (positions.length > 0) return positions;
  return picks.flatMap((pick) => {
    if (!pick.stake) return [];
    const position = {
      poolId: pick.stake.poolId,
      pickId: pick.id,
      match: { home: pick.fixture?.home ?? "", away: pick.fixture?.away ?? "", startISO: pick.fixture?.startISO ?? "", subject: pick.fixture?.subject ?? "home" },
      side: pick.stake.side,
      status: pick.stake.status ?? "open",
      amountMist: pick.stake.amountMist,
      estimatedPayoutMist: pick.stake.payoutMist ?? "0",
      claimOpensAtMs: pick.stake.claimOpensAtMs,
    } satisfies StakePositionView;
    return [position];
  });
}

export function buildRecordHeader(input: { summary: RecallRecord["summary"]; handle: string | null; publicScore: number | null; stakes: StakePositionView[] }): RecordHeader {
  const { summary, handle, publicScore, stakes } = input;
  const settled = summary.resolved > 0;
  const score = publicScore ?? (settled ? (summary.callScore ?? null) : null);
  const parts = settled ? [`${summary.hits} of ${summary.resolved} right`] : [];
  if (stakes.length > 0) parts.push(signedSuiShort(walletSummary(stakes).profitMist ?? 0n));
  return {
    identity: handle ? `@${handle} · Public` : "Private",
    isPublic: handle !== null,
    score: score === null ? "—" : String(score),
    scoreNote: settled ? null : "Needs 1 settled call",
    summary: parts.join(" · "),
  };
}

export interface AttentionItem {
  text: string;
  section: RecordSection;
}

const MAX_ATTENTION = 2;
const NEW_LESSON_MS = 48 * 3_600_000;
const SHORT_LESSON_CHARS = 64;

/** A pick's kickoff in milliseconds, or NaN for a claim with no date. */
export function kickoffOf(pick: Pick<RecallRecordPick, "fixture" | "endTime">): number {
  return Date.parse(pick.fixture?.startISO ?? pick.endTime ?? "");
}

const sameLocalDay = (a: number, b: number): boolean => new Date(a).toDateString() === new Date(b).toDateString();

/** A lesson's first clause, short enough for one line. */
export function shortLesson(text: string): string {
  const first = text.split(/[.:]\s/)[0].replace(/\.$/, "");
  return first.length > SHORT_LESSON_CHARS ? `${first.slice(0, SHORT_LESSON_CHARS - 1).trimEnd()}\u2026` : first;
}

/** What needs the user now, most urgent first. Empty when nothing does. */
export function attentionItems(input: { stakes: StakePositionView[]; picks: RecallRecordPick[]; lessons: RecallLesson[]; nowMs: number }): AttentionItem[] {
  const { stakes, picks, lessons, nowMs } = input;
  const items: AttentionItem[] = [];
  const claimable = stakes.filter((stake) => isClaimable(stake.status)).length;
  if (claimable > 0) items.push({ text: `${claimable} ${claimable === 1 ? "stake" : "stakes"} ready to claim`, section: "wallet" });
  const today = picks.filter((pick) => pick.status === "open" && sameLocalDay(kickoffOf(pick), nowMs)).length;
  if (today > 0) items.push({ text: `${today} ${today === 1 ? "call settles" : "calls settle"} today`, section: "calls" });
  const [newest] = lessons.filter((lesson) => nowMs - Date.parse(lesson.at) <= NEW_LESSON_MS).sort((a, b) => b.at.localeCompare(a.at));
  if (newest) items.push({ text: `New lesson: ${shortLesson(newest.text)}`, section: "lessons" });
  return items.slice(0, MAX_ATTENTION);
}

const byKickoff = (a: RecallRecordPick, b: RecallRecordPick): number => (kickoffOf(a) || 0) - (kickoffOf(b) || 0);

/** Upcoming soonest first; settled newest first. */
export function groupCalls(picks: RecallRecordPick[]): { upcoming: RecallRecordPick[]; settled: RecallRecordPick[] } {
  const upcoming = picks.filter((pick) => pick.status === "open").sort(byKickoff);
  const settled = picks.filter((pick) => pick.status !== "open").sort((a, b) => byKickoff(b, a));
  return { upcoming, settled };
}

/** "21 Nov", or nothing for a claim with no date. */
export function shortDate(pick: Pick<RecallRecordPick, "fixture" | "endTime">): string {
  const ms = kickoffOf(pick);
  return Number.isNaN(ms) ? "" : new Date(ms).toLocaleDateString([], { day: "numeric", month: "short" });
}

/** "Locked 3h before kickoff", for a committed call with a kickoff. */
export function lockedText(pick: Pick<RecallRecordPick, "at" | "commit" | "fixture">): string | null {
  if (!pick.commit || !pick.fixture?.startISO) return null;
  const gapMs = Date.parse(pick.fixture.startISO) - Date.parse(pick.at);
  if (Number.isNaN(gapMs) || gapMs <= 0) return null;
  const hours = Math.floor(gapMs / 3_600_000);
  if (hours >= 48) return `Locked ${Math.floor(hours / 24)}d before kickoff`;
  return hours >= 1 ? `Locked ${hours}h before kickoff` : `Locked ${Math.max(1, Math.floor(gapMs / 60_000))}m before kickoff`;
}

const LESSON_RANK = (key: string): number => {
  if (key.startsWith("entity:")) return 0;
  if (key.startsWith("category:")) return 1;
  if (key === "favourites") return 2;
  if (key === "vs_market") return 3;
  return 4;
};

const MAX_LESSONS = 3;

/** The newest lesson per key, most specific first, at most three. */
export function lessonsForDisplay(lessons: RecallLesson[]): RecallLesson[] {
  const newest = new Map<string, RecallLesson>();
  for (const lesson of lessons) {
    const known = newest.get(lesson.key);
    if (!known || lesson.at > known.at) newest.set(lesson.key, lesson);
  }
  return [...newest.values()].sort((a, b) => LESSON_RANK(a.key) - LESSON_RANK(b.key) || b.at.localeCompare(a.at)).slice(0, MAX_LESSONS);
}

export interface ConfidenceRow {
  text: string;
  saidPercent: number;
  rightPercent: number;
}

/** "When you say ~70%, you're right 80%", for each bucket that has calls. */
export function calibrationRows(buckets: RecallRecord["summary"]["calibration"]): ConfidenceRow[] {
  return buckets
    .filter((bucket) => bucket.calls > 0)
    .map((bucket) => {
      const saidPercent = Math.round((bucket.claimed * 100) / 5) * 5;
      const rightPercent = Math.round(bucket.hitRate * 100);
      return { text: `When you say ~${saidPercent}%, you're right ${rightPercent}%`, saidPercent, rightPercent };
    });
}

const SHOWS_ESTIMATE: readonly string[] = ["open", "awaiting_result", "challenge_window"];

/** A stake's status and payout, for an expanded call. */
export function stakeDetailText(position: StakePositionView, pick: Pick<RecallRecordPick, "pYes" | "fixture">, when: (ms: number) => string): string {
  const estimate = SHOWS_ESTIMATE.includes(position.status) && BigInt(position.estimatedPayoutMist) > 0n ? ` \u00b7 about ${formatSui(position.estimatedPayoutMist, 4)} SUI if right` : "";
  return `Staked ${formatSui(position.amountMist, 4)} SUI on ${leanSide(pick)} \u00b7 ${positionStatusText(position, when)}${estimate}`;
}

/** One line of the Wallet section's stake list. */
export function stakeListLean(position: StakePositionView, picks: RecallRecordPick[], when: (ms: number) => string): string {
  const pick = picks.find((candidate) => candidate.id === position.pickId);
  const lean = leanSide(pick ?? { pYes: position.side === "YES" ? 1 : 0, fixture: position.match });
  return `${position.match.home} v ${position.match.away} \u00b7 ${formatSui(position.amountMist, 4)} SUI on ${lean} \u00b7 ${positionStatusText(position, when)}`;
}
