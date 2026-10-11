// Creator earnings copy for My bets. Pure, so it can be unit-tested. The
// estimate is the market's current royalty share of everything in the pool;
// Panta's on-chain royalty already drops when a market is very one-sided.

export interface Liquidity {
  totalVolumeUsdc: number;
  royaltyBps: number;
  skewBps: number;
  creatorFeesUsdc: number;
  isGraduated: boolean;
  graduationThresholdUsdc: number;
}

export interface EarningsView {
  /** "open" while buying runs, "claimable" after the window closes. */
  phase: "open" | "claimable";
  text: string;
  /** The estimate in USDC, or null when Panta gave no pool figure. */
  estimateUsdc: number | null;
}

const LOCAL_DATE = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function estimateUsdc(liquidity: Liquidity | null): number | null {
  if (!liquidity) return null;
  return Math.round(liquidity.totalVolumeUsdc * (liquidity.royaltyBps / 10_000) * 100) / 100;
}

/** The earnings line for a market the connected wallet created. */
export function earningsView(primaryPhaseEnd: string | null, liquidity: Liquidity | null, nowMs: number): EarningsView {
  const closes = primaryPhaseEnd ? Date.parse(primaryPhaseEnd) : NaN;
  const closed = Number.isFinite(closes) && closes <= nowMs;
  const when = Number.isFinite(closes) ? LOCAL_DATE.format(new Date(closes)) : "the buying window closes";
  const estimate = estimateUsdc(liquidity);
  if (closed) {
    return {
      phase: "claimable",
      estimateUsdc: estimate,
      text:
        estimate === null
          ? "The buying window has closed."
          : `Estimated ~${money(estimate)}. The buying window has closed.`,
    };
  }
  if (estimate === null) {
    return { phase: "open", estimateUsdc: null, text: `Up to 20% of the pool. Claimable after ${when}.` };
  }
  const share = liquidity ? `${Math.round(liquidity.royaltyBps / 100)}%` : "20%";
  return {
    phase: "open",
    estimateUsdc: estimate,
    text: `Estimated ~${money(estimate)} so far (${share === "20%" ? "up to 20%" : `${share}, down from 20%`} of the pool, lower if the market is very one-sided). Claimable after the buying window closes on ${when}.`,
  };
}
