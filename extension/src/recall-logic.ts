// Total Recall: the pure logic behind the extension's call sheet, record tab and
// quiet sites. No DOM and no chrome.*, so all of it is unit-tested.

import type {
  ApiError,
  CommitSkipReason,
  FixtureSignal,
  RecallCalled,
  RecallInsight,
  RecallPickBody,
  RecallProof,
  RecallRecord,
  RecallRecordPick,
  RecallSavedPick,
  Tile,
} from "./messages";

export type CallSide = "yes" | "no";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const MAX_SOURCE_URL = 500;
const MIN_CALL_PERCENT = 51;
// The relayer stores asynchronously, so a just-changed site can be missing from
// the next server list. A local change wins over the server for this long.
export const QUIET_PENDING_MS = 15 * 60 * 1000;

export function isRecallId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** Whether Soothia can remember a preference for this site (not localhost or an IP). */
export function isQuietableSite(site: string): boolean {
  return HOSTNAME.test(site);
}

/** The probability of YES for "<percent>% on <side>". */
export function pYesFor(side: CallSide, percent: number): number {
  return (side === "yes" ? percent : 100 - percent) / 100;
}

/** Pulls a call toward 50% by the user's calibration shrink. */
export function suggestedPercent(chosen: number, shrink: number): number {
  return Math.max(MIN_CALL_PERCENT, Math.round(50 + (chosen - 50) * shrink));
}

/** The calibration lesson's bias in points when known, otherwise derived from the shrink. */
export function overconfidencePoints(shrink: number, bias: number | null | undefined): number {
  return typeof bias === "number" ? Math.round(bias * 100) : Math.round((1 - shrink) * 100);
}

/** Which team a fixture question backs. */
export function fixtureSubject(question: string, home: string): "home" | "away" {
  return question.toLowerCase().startsWith(`will ${home.toLowerCase()} beat`) ? "home" : "away";
}

/** The page URL, shortened to what the Worker accepts. */
export function trimSourceUrl(url: string): string {
  if (url.length <= MAX_SOURCE_URL) return url;
  try {
    const parsed = new URL(url);
    const withoutQuery = `${parsed.origin}${parsed.pathname}`;
    return withoutQuery.length <= MAX_SOURCE_URL ? withoutQuery : parsed.origin;
  } catch {
    return url.slice(0, MAX_SOURCE_URL);
  }
}

/** The POST /recall/pick body for a tile. */
export function callBody(
  { claim }: Tile,
  side: CallSide,
  percent: number,
  page: { site: string; url: string },
  fixture: FixtureSignal | null,
): RecallPickBody {
  return {
    question: claim.question,
    category: claim.category,
    pYes: pYesFor(side, percent),
    endTime: claim.endTime,
    source: { site: page.site, url: trimSourceUrl(page.url) },
    ...(claim.fromFixture && fixture
      ? {
          fixture: {
            home: fixture.home,
            away: fixture.away,
            ...(fixture.competition ? { competition: fixture.competition } : {}),
            startISO: fixture.startISO,
            subject: fixtureSubject(claim.question, fixture.home),
          },
        }
      : {}),
  };
}

/** "YES 70%" or "NO 65%". */
export function leanLabel(pYes: number): string {
  return pYes >= 0.5 ? `YES ${Math.round(pYes * 100)}%` : `NO ${Math.round((1 - pYes) * 100)}%`;
}

/** What a call backs. YES on "Will A beat B" is "A win"; NO is "A doesn't win (B win or draw)". */
export function leanSide(pick: Pick<RecallRecordPick, "pYes"> & { fixture?: RecallRecordPick["fixture"] }): string {
  const yes = pick.pYes >= 0.5;
  if (!pick.fixture) return yes ? "YES" : "NO";
  const { home, away, subject } = pick.fixture;
  const backed = subject === "home" ? home : away;
  const other = subject === "home" ? away : home;
  return yes ? `${backed} win` : `${backed} doesn't win (${other} win or draw)`;
}

/** A call's confidence in the side it backs, in percent. */
export function callConfidence(pYes: number): number {
  return Math.round(Math.max(pYes, 1 - pYes) * 100);
}

/** A call's lean, in the same words as "Your call" on a tile. */
export function pickLean(pick: Pick<RecallRecordPick, "pYes" | "fixture">): string {
  if (!pick.fixture) return leanLabel(pick.pYes);
  return `${leanSide(pick)} \u00b7 ${callConfidence(pick.pYes)}%`;
}

/** The record tab's one-line summary. */
export function recordHeadline(summary: RecallRecord["summary"]): string {
  const parts = [`${summary.picks} ${summary.picks === 1 ? "call" : "calls"}`, `${summary.hits} right`];
  if (summary.resolved > 0) parts.push(`${Math.round((summary.hits / summary.resolved) * 100)}% hit rate`);
  if (summary.brier !== null) {
    const market = summary.vsMarketCalls > 0 && summary.marketBrier !== null ? ` vs market ${summary.marketBrier.toFixed(3)}` : "";
    parts.push(`Brier ${summary.brier.toFixed(3)}${market}`);
  }
  return parts.join(" · ");
}

/** Up to two notes for a tile. */
export function visibleNotes(insight: RecallInsight | undefined): string[] {
  return insight ? insight.notes.slice(0, 2) : [];
}

/** The tile's call state, right after the user locks a new call. */
export function calledFromPick(pick: RecallSavedPick): RecallCalled {
  return {
    side: leanSide(pick),
    confidence: callConfidence(pick.pYes),
    pickId: pick.id,
    committed: pick.commit !== null,
  };
}

/** Most relevant first; equal tiles keep their order. */
export function sortByRelevance(tiles: Tile[], insights: Map<string, RecallInsight>): Tile[] {
  const relevance = (tile: Tile): number => insights.get(tile.claim.id)?.relevance ?? 0;
  return [...tiles].sort((a, b) => relevance(b) - relevance(a));
}

export function skipReasonText(reason: CommitSkipReason): string {
  switch (reason) {
    case "user_cap":
      return "you reached today's limit";
    case "global_cap":
      return "Soothia reached today's limit";
    case "low_balance":
      return "Soothia's Sui wallet is low";
    default:
      return "the daily counter could not be checked";
  }
}

export function callErrorMessage(status: number, body: ApiError | null): { text: string; retry: boolean } {
  if (status === 0) return { text: "I couldn't reach Soothia's server. Check your connection.", retry: true };
  if (status === 429) return { text: "Too many requests just now. Try again in a minute.", retry: true };
  if (status === 409 && body?.error === "duplicate_pick") return { text: "You already called this.", retry: false };
  if (status === 400) {
    if (body?.field === "fixture.startISO") return { text: "This match has already kicked off.", retry: false };
    if (body?.field === "endTime") return { text: "The deadline for this call has passed.", retry: false };
    return { text: "Soothia couldn't accept this call.", retry: false };
  }
  return { text: "Your call wasn't saved. Please try again.", retry: true };
}

/** "2h 7m". */
export function formatGap(ms: number): string {
  const minutes = Math.floor(Math.abs(ms) / 60_000);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function proofProblem(problem: string | undefined): string {
  switch (problem) {
    case "hash_mismatch":
      return "The proof on Sui does not match this call.";
    case "no_commit_event":
      return "No commit was found in that transaction.";
    default:
      return "Couldn't check the proof just now.";
  }
}

/** One line for the Proof link's result. */
export function proofText(proof: RecallProof): { text: string; good: boolean } {
  if (!proof.verified) return { text: proofProblem(proof.problem), good: false };
  if (proof.gapMs === null) return { text: "Committed on Sui ✓", good: true };
  if (proof.gapMs <= 0) return { text: `Committed ${formatGap(proof.gapMs)} after kickoff`, good: false };
  return { text: `Committed ${formatGap(proof.gapMs)} before kickoff ✓`, good: true };
}

/** "0x1234…abcd". */
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

export type QuietPending = Record<string, { quiet: boolean; at: number }>;

/** The server's quiet list with recent local changes applied. Expired changes are dropped. */
export function mergeQuietSites(server: string[], pending: QuietPending, now: number): { sites: string[]; pending: QuietPending } {
  const live = Object.fromEntries(Object.entries(pending).filter(([, change]) => now - change.at < QUIET_PENDING_MS));
  const sites = new Set(server.map((site) => site.toLowerCase()));
  for (const [site, change] of Object.entries(live)) {
    if (change.quiet) sites.add(site);
    else sites.delete(site);
  }
  return { sites: [...sites].sort(), pending: live };
}
