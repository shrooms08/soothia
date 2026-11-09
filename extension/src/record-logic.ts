// The pure logic behind the My record tab. No DOM and no chrome.*, so all of it is tested.

import type { RecallLesson, RecallRecord, RecallRecordPick } from "./messages";
import { isClaimable, signedSuiShort, walletSummary, type StakePositionView } from "./stake-logic";

export const RECORD_SECTIONS = ["calls", "lessons", "wallet", "me"] as const;
export type RecordSection = (typeof RECORD_SECTIONS)[number];

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
