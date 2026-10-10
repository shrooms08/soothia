// Primary buys, positions, and win claims. Same shape as the create flow:
// Panta quotes and builds, the wallet signs in the browser, this Worker
// sends on its RPC, then tells Panta the signature. Signed transactions pass
// through and are never logged or stored.
import { assembleV0, type BuiltInstruction } from "./assemble";
import { isAddress, isSignature } from "./base58";
import {
  base64Bytes,
  firstSignature,
  isQuoteId,
  isTxBase64,
  pantaFailure,
  pantaPostWithRetry,
  RELEVANT_LOG,
  simulationReason,
  sleep,
  txState,
  waitForConfirmation,
  type CreatedMarket,
} from "./create";
import { json, readJsonObject, type Env } from "./http";
import { PANTA_BASE } from "./markets";
import { MARKET_PAGE_BASE, MAX_BUILT_TRANSACTION_BYTES } from "./pantaRules";
import { rpc, RpcError } from "./rpc";

// Soothia's floor and Panta's early-market cap per order, in USDC.
export const MIN_BUY_USDC = 1;
export const MAX_BUY_USDC = 100;
// Panta's default; build rejects with QUOTE_STALE if the curve moved more.
export const MAX_SLIPPAGE_BPS = 100;
const RECORD_TTL_SEC = 30 * 24 * 3600;
const BACKGROUND_FINISH_WAIT_MS = 22_000;
const STATUS_WAIT_MS = 20_000;
const MAX_POSITION_DETAILS = 20;
// The documented settlement: a winning share pays about 1 USDC.
const PAYOUT_PER_SHARE_USDC = 1;

export type Side = "yes" | "no";

export interface BuyRecord {
  wallet: string;
  marketId: string;
  side: Side;
  amountUsdc: string;
  quoteId: string;
  orderId?: string;
  signature?: string;
  /** Creator-fee claims are not attributable through /trades/. */
  kind?: "creator";
  /** Where the order came from; "blink" for Solana Actions bet links. */
  source?: "blink";
  /** Panta has stored the attribution for this order's signature. */
  attributed?: boolean;
  /** When the reconcile sweep last looked at this order (ms). */
  reconciledAt?: number;
}

export function parseSide(value: unknown): Side | null {
  const side = typeof value === "string" ? value.toLowerCase() : "";
  return side === "yes" || side === "no" ? side : null;
}

/** "1", "1.5", 2 -> "1.00", "1.50", "2.00"; null when out of range or malformed. */
export function parseAmount(value: unknown): string | null {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const amount = Number(text);
  if (amount < MIN_BUY_USDC || amount > MAX_BUY_USDC) return null;
  return amount.toFixed(2);
}

const recordKey = (orderOrQuoteId: string): string => `buy:${orderOrQuoteId}`;

export async function loadRecord(env: Env, id: string): Promise<BuyRecord | null> {
  return (await env.SOOTHIA_CACHE.get(recordKey(id), "json")) as BuyRecord | null;
}

export async function saveRecord(env: Env, id: string, record: BuyRecord): Promise<void> {
  await env.SOOTHIA_CACHE.put(recordKey(id), JSON.stringify(record), { expirationTtl: RECORD_TTL_SEC });
}

// ---- POST /buy/quote ----

export interface PantaBuyQuote {
  quoteId: string;
  shares?: string;
  avgPrice?: string;
  feeUsdc?: string;
  amountUsdc?: string;
  expiresAt: string;
}

export async function handleBuyQuote(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet)) return json(request, { error: "bad_wallet" }, 400);
  if (!isAddress(body.marketId)) return json(request, { error: "bad_market" }, 400);
  const side = parseSide(body.side);
  if (!side) return json(request, { error: "bad_side" }, 400);
  const amountUsdc = parseAmount(body.amountUsdc);
  if (!amountUsdc) {
    return json(
      request,
      { error: "bad_amount", message: `Bets are between ${MIN_BUY_USDC.toFixed(2)} and ${MAX_BUY_USDC.toFixed(2)} USDC.` },
      400,
    );
  }

  const result = await pantaPostWithRetry<PantaBuyQuote>(env, "/primaryorderquote/", {
    wallet: body.wallet,
    marketId: body.marketId,
    side,
    amountUsdc,
  });
  if (!result.ok) return pantaFailure(request, result);
  const quote = result.data;

  const record: BuyRecord = { wallet: body.wallet, marketId: body.marketId, side, amountUsdc, quoteId: quote.quoteId };
  await saveRecord(env, quote.quoteId, record);

  const fee = Number(quote.feeUsdc ?? 0);
  return json(request, {
    quoteId: quote.quoteId,
    marketId: body.marketId,
    side,
    amountUsdc: Number(amountUsdc),
    shares: Number(quote.shares ?? 0),
    avgPrice: Number(quote.avgPrice ?? 0),
    feeUsdc: fee,
    // Confirmed on-chain: the fee is a second transfer to Panta's fee vault, on top of the stake.
    totalUsdc: Math.round((Number(amountUsdc) + fee) * 100) / 100,
    payoutPerShareUsdc: PAYOUT_PER_SHARE_USDC,
    expiresAt: quote.expiresAt,
  });
}

// ---- POST /buy/build ----

export interface PantaBuyBuild {
  orderId: string;
  instructions?: BuiltInstruction[];
  expectedShares?: string;
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
}

export async function assembleWithFreshBlockhash(
  env: Env,
  instructions: BuiltInstruction[],
  wallet: string,
): Promise<{ txBase64: string; recentBlockhash: string; lastValidBlockHeight: number }> {
  const latest = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(env, "getLatestBlockhash", [
    { commitment: "confirmed" },
  ]);
  const txBase64 = await assembleV0(instructions, wallet, latest.value.blockhash);
  return { txBase64, recentBlockhash: latest.value.blockhash, lastValidBlockHeight: latest.value.lastValidBlockHeight };
}

export async function handleBuyBuild(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet) || !isQuoteId(body.quoteId)) return json(request, { error: "bad_request" }, 400);
  const record = await loadRecord(env, body.quoteId);
  if (!record || record.wallet !== body.wallet) return json(request, { error: "unknown_quote" }, 404);

  const result = await pantaPostWithRetry<PantaBuyBuild>(env, "/primaryorderbuild/", {
    quoteId: body.quoteId,
    wallet: body.wallet,
    maxSlippageBps: MAX_SLIPPAGE_BPS,
  });
  if (!result.ok) return pantaFailure(request, result);
  const build = result.data;
  if (!Array.isArray(build.instructions) || build.instructions.length === 0 || !build.orderId) {
    return json(request, { error: "build_failed", message: "Panta returned no instructions." }, 502);
  }

  let assembled: { txBase64: string; recentBlockhash: string; lastValidBlockHeight: number };
  try {
    // A fresh blockhash from our RPC, as the playground does; Panta's hint is already ageing.
    assembled = await assembleWithFreshBlockhash(env, build.instructions, body.wallet);
  } catch (error) {
    if (error instanceof RpcError && error.message === "rpc_not_configured") {
      return json(request, { error: "proxy_misconfigured" }, 500);
    }
    return json(request, { error: "build_failed", message: "Could not assemble the transaction." }, 502);
  }
  const bytes = base64Bytes(assembled.txBase64);
  if (bytes > MAX_BUILT_TRANSACTION_BYTES) {
    return json(request, { error: "transaction_too_large", message: "This order does not fit in one transaction.", bytes }, 400);
  }

  const withOrder: BuyRecord = { ...record, orderId: build.orderId };
  await Promise.all([saveRecord(env, build.orderId, withOrder), saveRecord(env, body.quoteId, withOrder)]);

  return json(request, {
    orderId: build.orderId,
    txBase64: assembled.txBase64,
    bytes,
    expectedShares: Number(build.expectedShares ?? 0),
    recentBlockhash: assembled.recentBlockhash,
    lastValidBlockHeight: assembled.lastValidBlockHeight,
    // Panta's order session, not the blockhash.
    expiresAt: build.expiresAt ?? null,
  });
}

// ---- Confirm, submit, verify, report ----

export interface BuyStatus {
  signature: string;
  status: "confirmed" | "failed" | "pending";
  confirmed: boolean;
  submitted: boolean;
  verified: string | null;
  attributed: boolean;
  errors: Record<string, string>;
  marketUrl: string;
  error?: string;
}

/** Follows a sent buy until Panta knows about it. Idempotent: every step may be repeated. */
export async function finishBuy(env: Env, record: BuyRecord, signature: string, maxWaitMs: number): Promise<BuyStatus> {
  const status: BuyStatus = {
    signature,
    status: "pending",
    confirmed: false,
    submitted: false,
    verified: null,
    attributed: false,
    errors: {},
    marketUrl: MARKET_PAGE_BASE + record.marketId,
  };
  const confirmation = await waitForConfirmation(env, signature, maxWaitMs);
  status.status = confirmation.state;
  if (confirmation.state === "failed") {
    status.error = "The transaction failed on Solana. No USDC was taken.";
    return status;
  }
  if (confirmation.state === "pending") return status;
  status.confirmed = true;

  if (record.orderId) {
    const submitted = await pantaPostWithRetry<{ status?: string }>(env, "/primaryordersubmit/", {
      orderId: record.orderId,
      signature,
      wallet: record.wallet,
    });
    if (submitted.ok) status.submitted = true;
    else status.errors.submit = (submitted.error.code ?? "UPSTREAM_ERROR").toLowerCase();

    const verified = await pantaPostWithRetry<{ status?: string }>(env, "/primaryorderverify/", {
      orderId: record.orderId,
      signature,
      wallet: record.wallet,
    });
    if (verified.ok) status.verified = verified.data.status ?? null;
    else status.errors.verify = (verified.error.code ?? "UPSTREAM_ERROR").toLowerCase();
  }

  // Attribution. Panta may not see the transaction for a moment after we do.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const reported = await pantaPostWithRetry<{ status?: string }>(env, "/trades/", {
      signature,
      wallet: record.wallet,
      marketId: record.marketId,
      quoteId: record.quoteId,
    });
    if (reported.ok) {
      status.attributed = reported.data.status === "processed";
      delete status.errors.report;
      // Remember it, so the reconcile sweep leaves this order alone.
      if (status.attributed && record.orderId) {
        await saveRecord(env, record.orderId, { ...record, signature, attributed: true }).catch(() => {});
      }
      break;
    }
    status.errors.report = (reported.error.code ?? "UPSTREAM_ERROR").toLowerCase();
    if (reported.error.code !== "TX_NOT_FOUND" || attempt === 2) break;
    await sleep(2500);
  }
  return status;
}

// ---- POST /buy/send ----

export async function handleBuySend(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isTxBase64(body.signedTxBase64) || !isQuoteId(body.orderId)) {
    return json(request, { error: "bad_request" }, 400);
  }
  const signature = firstSignature(body.signedTxBase64);
  if (!signature) return json(request, { error: "not_signed" }, 400);
  const record = await loadRecord(env, body.orderId);
  if (!record?.orderId) return json(request, { error: "unknown_order" }, 404);

  try {
    await rpc<string>(env, "sendTransaction", [
      body.signedTxBase64,
      { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 },
    ]);
  } catch (error) {
    const message = error instanceof RpcError ? error.message : "rpc_error";
    if (message === "rpc_not_configured") return json(request, { error: "proxy_misconfigured" }, 500);
    const landed = await txState(env, signature).catch(() => ({ state: "pending" as const }));
    if (landed.state !== "confirmed" && !/already been processed/i.test(message)) {
      if (/blockhash not found|block height exceeded|expired/i.test(message)) {
        return json(request, { error: "blockhash_expired", signature }, 409);
      }
      const logs = error instanceof RpcError ? error.logs : [];
      return json(
        request,
        {
          error: "send_failed",
          signature,
          reason: simulationReason(message, logs),
          logLine: logs.find((line) => RELEVANT_LOG.test(line)) ?? message,
        },
        400,
      );
    }
  }

  const sent: BuyRecord = { ...record, signature };
  await saveRecord(env, record.orderId, sent);
  // Finish in the background too, in case the tab closes.
  ctx.waitUntil(finishBuy(env, sent, signature, BACKGROUND_FINISH_WAIT_MS).catch(() => {}));
  return json(request, await finishBuy(env, sent, signature, 0));
}

// ---- POST /buy/status ----

export async function handleBuyStatus(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isSignature(body.signature) || !isQuoteId(body.orderId)) return json(request, { error: "bad_request" }, 400);
  const record = await loadRecord(env, body.orderId);
  if (!record?.orderId) return json(request, { error: "unknown_order" }, 404);
  try {
    return json(request, await finishBuy(env, record, body.signature, STATUS_WAIT_MS));
  } catch {
    return json(request, { error: "rpc_unavailable" }, 502);
  }
}

// ---- GET /positions ----

interface PantaPosition {
  marketId: string;
  category?: string | null;
  side: string;
  shares: string;
  phase: string;
  claimable: boolean;
  claimed: boolean;
  outcome?: string | null;
}

export interface MarketBrief {
  title: string;
  category: string;
  /** Panta market phase: primary (buying), secondary, resolved, cancelled. */
  phase: string | null;
  marketType: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  endTime: string | null;
  /** Buying window end (Panta `primaryPhaseEndTime`), ISO. */
  primaryPhaseEnd: string | null;
  /** Pool and creator-fee figures from the market detail; null when Panta omits them. */
  liquidity: MarketLiquidity | null;
}

export interface MarketLiquidity {
  /** All USDC that has gone into the market, seed included (`totalVolume`). */
  totalVolumeUsdc: number;
  /** Creator royalty share right now, in basis points (`currentRoyaltyBps`, 2000 = 20%). */
  royaltyBps: number;
  /** How one-sided the market is, in basis points (`currentSkewBps`). */
  skewBps: number;
  /** Creator fees accrued so far, USDC (`totalCreatorFees`). */
  creatorFeesUsdc: number;
  isGraduated: boolean;
  /** Volume needed to graduate, USDC (`graduationThreshold`). */
  graduationThresholdUsdc: number;
}

interface MarketDetail {
  title?: string;
  description?: string;
  category?: string;
  phase?: string;
  marketType?: string;
  yesPrice?: string | null;
  noPrice?: string | null;
  endTime?: number;
  primaryPhaseEndTime?: number;
  totalVolume?: string;
  currentRoyaltyBps?: string | number;
  currentSkewBps?: string | number;
  totalCreatorFees?: string;
  isGraduated?: boolean;
  graduationThreshold?: string;
}

/** Pool figures from a market detail row, or null when the fields are absent. */
export function liquidityFrom(detail: MarketDetail): MarketLiquidity | null {
  if (detail.totalVolume === undefined || detail.currentRoyaltyBps === undefined) return null;
  const base = (value: string | undefined): number => Number(value ?? 0) / 1_000_000;
  return {
    totalVolumeUsdc: base(detail.totalVolume),
    royaltyBps: Number(detail.currentRoyaltyBps),
    skewBps: Number(detail.currentSkewBps ?? 0),
    creatorFeesUsdc: base(detail.totalCreatorFees),
    isGraduated: detail.isGraduated === true,
    graduationThresholdUsdc: base(detail.graduationThreshold),
  };
}

async function pantaGet<T>(env: Env, path: string): Promise<T | null> {
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return null;
  try {
    const response = await fetch(`${PANTA_BASE}${path}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Title and prices for one market, cached an hour. Titles are blank on some list rows. */
export async function marketBrief(env: Env, marketId: string): Promise<MarketBrief | null> {
  const key = `mkt:${marketId}`;
  const cached = (await env.SOOTHIA_CACHE.get(key, "json")) as MarketBrief | null;
  if (cached?.title && "phase" in cached) return cached;
  const detail = await pantaGet<MarketDetail>(env, `/markets/${encodeURIComponent(marketId)}/`);
  if (!detail) return cached;
  const price = (value: string | null | undefined): number | null => {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : null;
  };
  const brief: MarketBrief = {
    title: (detail.title || detail.description || "").trim(),
    // Panta's detail row is sometimes partial (its RPC hiccups); keep the last seen values.
    category: detail.category ?? cached?.category ?? "other",
    phase: detail.phase ?? cached?.phase ?? null,
    marketType: detail.marketType ?? cached?.marketType ?? null,
    // Panta returns null prices when its RPC is unavailable; keep the last ones seen.
    yesPrice: price(detail.yesPrice) ?? cached?.yesPrice ?? null,
    noPrice: price(detail.noPrice) ?? cached?.noPrice ?? null,
    endTime: typeof detail.endTime === "number" ? new Date(detail.endTime * 1000).toISOString() : cached?.endTime ?? null,
    primaryPhaseEnd:
      typeof detail.primaryPhaseEndTime === "number" ? new Date(detail.primaryPhaseEndTime * 1000).toISOString() : cached?.primaryPhaseEnd ?? null,
    liquidity: liquidityFrom(detail) ?? cached?.liquidity ?? null,
  };
  // Pool figures move with every trade, so this cache is short; a partial row (Panta's RPC
  // hiccup left prices or the closing time out) is kept only for the KV minimum.
  const partial = brief.yesPrice === null || !brief.primaryPhaseEnd;
  if (brief.title) await env.SOOTHIA_CACHE.put(key, JSON.stringify(brief), { expirationTtl: partial ? 60 : 120 });
  return brief;
}

export async function handlePositions(request: Request, env: Env): Promise<Response> {
  const wallet = new URL(request.url).searchParams.get("wallet");
  if (!isAddress(wallet)) return json(request, { error: "bad_wallet" }, 400);
  const body = await pantaGet<{ positions?: PantaPosition[] }>(env, `/positions/?wallet=${wallet}`);
  if (!body) return json(request, { error: "upstream_unavailable" }, 502);
  const rows = body.positions ?? [];

  const ids = [...new Set(rows.map((row) => row.marketId))].slice(0, MAX_POSITION_DETAILS);
  const [briefs, created] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await marketBrief(env, id)] as const)).then((entries) => new Map(entries)),
    env.SOOTHIA_CACHE.get(`creator:${wallet}`, "json") as Promise<CreatedMarket[] | null>,
  ]);
  // Creating a market seeds liquidity, which mints half the seed to each side
  // at 0.50: a 5 USDC seed is 5 YES and 5 NO shares in the creator's wallet.
  const seedShares = new Map<string, number>();
  for (const market of created ?? []) {
    if (market.liquidityUsdc) seedShares.set(market.marketId, market.liquidityUsdc / 2 / 0.5);
  }

  return json(request, {
    positions: rows.map((row) => ({
      marketId: row.marketId,
      title: briefs.get(row.marketId)?.title || "",
      category: row.category ?? null,
      side: row.side.toLowerCase(),
      shares: Number(row.shares),
      phase: row.phase,
      claimable: row.claimable === true,
      claimed: row.claimed === true,
      outcome: row.outcome ?? null,
      marketUrl: MARKET_PAGE_BASE + row.marketId,
      // Shares per side this wallet got for creating the market, if it did.
      creatorSeedShares: seedShares.get(row.marketId) ?? null,
    })),
  });
}

// ---- GET /market?id=... ----

export async function handleMarket(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!isAddress(id)) return json(request, { error: "bad_market" }, 400);
  const brief = await marketBrief(env, id);
  if (!brief) return json(request, { error: "upstream_unavailable" }, 502);
  return json(request, { marketId: id, ...brief, marketUrl: MARKET_PAGE_BASE + id });
}

// ---- Win claims: POST /claim/build, POST /claim/send, POST /tx/status ----

interface PantaClaimBuild {
  outcome?: string;
  winningShares?: string;
  instructions?: BuiltInstruction[];
}

export async function handleClaimBuild(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet) || !isAddress(body.marketId)) return json(request, { error: "bad_request" }, 400);
  const result = await pantaPostWithRetry<PantaClaimBuild>(env, "/claim/build/", {
    wallet: body.wallet,
    marketId: body.marketId,
  });
  if (!result.ok) return pantaFailure(request, result);
  const build = result.data;
  if (!Array.isArray(build.instructions) || build.instructions.length === 0) {
    return json(request, { error: "build_failed", message: "Panta returned no instructions." }, 502);
  }
  try {
    const assembled = await assembleWithFreshBlockhash(env, build.instructions, body.wallet);
    const bytes = base64Bytes(assembled.txBase64);
    if (bytes > MAX_BUILT_TRANSACTION_BYTES) {
      return json(request, { error: "transaction_too_large", bytes }, 400);
    }
    // Remembered so /claim/send can report the claim for attribution.
    await saveRecord(env, `claim:${body.wallet}:${body.marketId}`, {
      wallet: body.wallet,
      marketId: body.marketId,
      side: "yes",
      amountUsdc: "0",
      quoteId: "claim",
    });
    return json(request, {
      txBase64: assembled.txBase64,
      bytes,
      outcome: build.outcome ?? null,
      winningShares: Number(build.winningShares ?? 0),
      lastValidBlockHeight: assembled.lastValidBlockHeight,
    });
  } catch {
    return json(request, { error: "build_failed", message: "Could not assemble the transaction." }, 502);
  }
}

export async function handleClaimSend(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isTxBase64(body.signedTxBase64) || !isAddress(body.wallet) || !isAddress(body.marketId)) {
    return json(request, { error: "bad_request" }, 400);
  }
  const signature = firstSignature(body.signedTxBase64);
  if (!signature) return json(request, { error: "not_signed" }, 400);
  const claimRecord = await loadRecord(env, `claim:${body.wallet}:${body.marketId}`);
  if (!claimRecord) return json(request, { error: "unknown_claim" }, 404);
  try {
    await rpc<string>(env, "sendTransaction", [
      body.signedTxBase64,
      { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 },
    ]);
  } catch (error) {
    const message = error instanceof RpcError ? error.message : "rpc_error";
    const landed = await txState(env, signature).catch(() => ({ state: "pending" as const }));
    if (landed.state !== "confirmed" && !/already been processed/i.test(message)) {
      const logs = error instanceof RpcError ? error.logs : [];
      return json(request, { error: "send_failed", signature, reason: simulationReason(message, logs) }, 400);
    }
  }
  // Attribution for a win claim once it confirms; the caller polls /tx/status.
  // Panta refuses creator-fee claims on /trades/, so those are not reported.
  if (claimRecord.kind !== "creator") {
    ctx.waitUntil(
      waitForConfirmation(env, signature, BACKGROUND_FINISH_WAIT_MS)
        .then((state) =>
          state.state === "confirmed"
            ? pantaPostWithRetry(env, "/trades/", { signature, wallet: body.wallet, marketId: body.marketId })
            : null,
        )
        .catch(() => {}),
    );
  }
  return json(request, { signature, status: "sent" });
}

// ---- POST /claim/creator-fees/build ----

interface PantaCreatorFeesBuild {
  claimableFeesUsdc?: string;
  instructions?: BuiltInstruction[];
}

/**
 * Builds the creator-fee claim for a market this wallet created. Panta only
 * allows it once the market has graduated and fees have accrued; until then
 * it answers MARKET_NOT_GRADUATED or NO_CREATOR_FEES, passed through here.
 */
export async function handleCreatorFeesBuild(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet) || !isAddress(body.marketId)) return json(request, { error: "bad_request" }, 400);
  const result = await pantaPostWithRetry<PantaCreatorFeesBuild>(env, "/claim/creator-fees/build/", {
    wallet: body.wallet,
    marketId: body.marketId,
  });
  if (!result.ok) return pantaFailure(request, result);
  const build = result.data;
  if (!Array.isArray(build.instructions) || build.instructions.length === 0) {
    return json(request, { error: "build_failed", message: "Panta returned no instructions." }, 502);
  }
  try {
    const assembled = await assembleWithFreshBlockhash(env, build.instructions, body.wallet);
    const bytes = base64Bytes(assembled.txBase64);
    if (bytes > MAX_BUILT_TRANSACTION_BYTES) return json(request, { error: "transaction_too_large", bytes }, 400);
    await saveRecord(env, `claim:${body.wallet}:${body.marketId}`, {
      wallet: body.wallet,
      marketId: body.marketId,
      side: "yes",
      amountUsdc: "0",
      quoteId: "creator",
      kind: "creator",
    });
    return json(request, {
      txBase64: assembled.txBase64,
      bytes,
      claimableFeesUsdc: Number(build.claimableFeesUsdc ?? 0) / 1_000_000,
      lastValidBlockHeight: assembled.lastValidBlockHeight,
    });
  } catch {
    return json(request, { error: "build_failed", message: "Could not assemble the transaction." }, 502);
  }
}

export async function handleTxStatus(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isSignature(body.signature)) return json(request, { error: "bad_request" }, 400);
  try {
    const state = await waitForConfirmation(env, body.signature, STATUS_WAIT_MS);
    return json(request, { signature: body.signature, status: state.state });
  } catch {
    return json(request, { error: "rpc_unavailable" }, 502);
  }
}
