// The pure logic behind the My record tab. No DOM and no chrome.*, so all of it is tested.

import type { RecallRecord, RecallRecordPick } from "./messages";
import { signedSuiShort, walletSummary, type StakePositionView } from "./stake-logic";

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
