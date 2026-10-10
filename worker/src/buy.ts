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
} from "./create";
import { json, readJsonObject, type Env } from "./http";
import { PANTA_BASE } from "./markets";
import { MARKET_PAGE_BASE, MAX_BUILT_TRANSACTION_BYTES } from "./pantaRules";
import { rpc, RpcError } from "./rpc";

// Soothia's floor and Panta's early-market cap per order, in USDC.
export const MIN_BUY_USDC = 1;
export const MAX_BUY_USDC = 100;
// Panta's default; build rejects with QUOTE_STALE if the curve moved more.
const MAX_SLIPPAGE_BPS = 100;
const RECORD_TTL_SEC = 30 * 24 * 3600;
const BACKGROUND_FINISH_WAIT_MS = 22_000;
const STATUS_WAIT_MS = 20_000;
const MAX_POSITION_DETAILS = 20;
// The documented settlement: a winning share pays about 1 USDC.
const PAYOUT_PER_SHARE_USDC = 1;

type Side = "yes" | "no";

interface BuyRecord {
  wallet: string;
  marketId: string;
  side: Side;
  amountUsdc: string;
  quoteId: string;
  orderId?: string;
  signature?: string;
}

function parseSide(value: unknown): Side | null {
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

async function loadRecord(env: Env, id: string): Promise<BuyRecord | null> {
  return (await env.SOOTHIA_CACHE.get(recordKey(id), "json")) as BuyRecord | null;
}

async function saveRecord(env: Env, id: string, record: BuyRecord): Promise<void> {
  await env.SOOTHIA_CACHE.put(recordKey(id), JSON.stringify(record), { expirationTtl: RECORD_TTL_SEC });
}

// ---- POST /buy/quote ----

interface PantaBuyQuote {
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
    // The deposit is the amount; Panta's example shows the fee inside it (shares x avgPrice = amount).
    totalUsdc: Number(amountUsdc),
    payoutPerShareUsdc: PAYOUT_PER_SHARE_USDC,
    expiresAt: quote.expiresAt,
  });
}

// ---- POST /buy/build ----

interface PantaBuyBuild {
  orderId: string;
  instructions?: BuiltInstruction[];
  expectedShares?: string;
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
}

async function assembleWithFreshBlockhash(
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

interface BuyStatus {
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
async function finishBuy(env: Env, record: BuyRecord, signature: string, maxWaitMs: number): Promise<BuyStatus> {
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

interface MarketBrief {
  title: string;
  yesPrice: number | null;
  noPrice: number | null;
  endTime: string | null;
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
  if (cached?.title) return cached;
  const detail = await pantaGet<{
    title?: string;
    description?: string;
    yesPrice?: string | null;
    noPrice?: string | null;
    endTime?: number;
  }>(env, `/markets/${encodeURIComponent(marketId)}/`);
  if (!detail) return cached;
  const price = (value: string | null | undefined): number | null => {
    const parsed = Number.parseFloat(value ?? "");
    return Number.isFinite(parsed) ? parsed : null;
  };
  const brief: MarketBrief = {
    title: (detail.title || detail.description || "").trim(),
    yesPrice: price(detail.yesPrice),
    noPrice: price(detail.noPrice),
    endTime: typeof detail.endTime === "number" ? new Date(detail.endTime * 1000).toISOString() : null,
  };
  if (brief.title) await env.SOOTHIA_CACHE.put(key, JSON.stringify(brief), { expirationTtl: 3600 });
  return brief;
}

export async function handlePositions(request: Request, env: Env): Promise<Response> {
  const wallet = new URL(request.url).searchParams.get("wallet");
  if (!isAddress(wallet)) return json(request, { error: "bad_wallet" }, 400);
  const body = await pantaGet<{ positions?: PantaPosition[] }>(env, `/positions/?wallet=${wallet}`);
  if (!body) return json(request, { error: "upstream_unavailable" }, 502);
  const rows = body.positions ?? [];

  const ids = [...new Set(rows.map((row) => row.marketId))].slice(0, MAX_POSITION_DETAILS);
  const briefs = new Map(await Promise.all(ids.map(async (id) => [id, await marketBrief(env, id)] as const)));

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
  if (!(await loadRecord(env, `claim:${body.wallet}:${body.marketId}`))) {
    return json(request, { error: "unknown_claim" }, 404);
  }
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
  // Attribution for the claim once it confirms; the caller polls /tx/status.
  ctx.waitUntil(
    waitForConfirmation(env, signature, BACKGROUND_FINISH_WAIT_MS)
      .then((state) =>
        state.state === "confirmed"
          ? pantaPostWithRetry(env, "/trades/", { signature, wallet: body.wallet, marketId: body.marketId })
          : null,
      )
      .catch(() => {}),
  );
  return json(request, { signature, status: "sent" });
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
