// Market creation: quote -> build -> simulate -> send -> register.
// The user's wallet signs in the browser; this Worker never sees a private
// key. Signed transactions pass through to the RPC and are never logged or stored.
import { assembleV0, type BuiltInstruction } from "./assemble";
import { encodeBase58, isAddress, isSignature } from "./base58";
import { json, readJsonObject, type Env } from "./http";
import { PANTA_BASE } from "./markets";
import {
  DESCRIPTION_MAX_LENGTH,
  DRAFT_MARKET_TYPE,
  MARKET_PAGE_BASE,
  MAX_BUILT_TRANSACTION_BYTES,
  MIN_START_DELAY_SEC,
  RESOLUTION_DELAY_SEC,
  START_BUFFER_SEC,
  USDC_DECIMALS,
  validateDraft,
  type MarketDraft,
} from "./pantaRules";
import { fitDraft, MAX_FIT_LEVEL } from "./resolution";
import { rpc, RpcError } from "./rpc";

const QUOTE_TTL_SEC = 24 * 3600;
const TOO_LONG = "The question is too long to fit in one Solana transaction. Shorten it.";
const TRANSIENT_QUOTE_FAILURE = "unexpected create quote failure";
const TRANSIENT_QUOTE_RETRY_WAITS_MS = [1500, 4000];
// A serialized transaction is at most 1232 bytes: 1644 base64 characters.
const MAX_TX_BASE64 = 1700;
const POLL_INTERVAL_MS = 2500;
const SEND_CONFIRM_WAIT_MS = 60_000;
const RETRY_CONFIRM_WAIT_MS = 20_000;
// Work after the response is sent may run for about 30 seconds.
const BACKGROUND_FINISH_WAIT_MS = 22_000;
const REGISTER_ATTEMPTS = 3;
const MAX_CREATOR_MARKETS = 100;

/** What we remember about a quote so a paid market can always be finished. */
interface QuoteRecord {
  wallet: string;
  /** The question as sent to Panta (it may have been trimmed to fit). */
  question: string;
  /** The draft and shrink level behind this quote, so build can shrink further. */
  draft?: MarketDraft;
  level?: number;
  expectedEventPda: string;
  expiresAt: string;
  signature?: string;
}

interface CreatedMarket {
  marketId: string;
  question: string;
  signature: string;
  createdAt: string;
  marketUrl: string;
  registered: boolean;
}

interface PantaError {
  code?: string;
  message?: string;
  field?: string;
  fields?: Record<string, string[]>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function pantaPost<T>(
  env: Env,
  path: string,
  body: unknown,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: PantaError }> {
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return { ok: false, status: 500, error: { code: "PROXY_MISCONFIGURED" } };
  try {
    const response = await fetch(`${PANTA_BASE}${path}`, {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await response.json().catch(() => ({}))) as T & PantaError;
    if (response.ok) return { ok: true, data };
    return { ok: false, status: response.status, error: data };
  } catch {
    return { ok: false, status: 502, error: { code: "UPSTREAM_UNAVAILABLE" } };
  }
}

/** Our error body for a failed Panta call. Passes Panta's code and message through. */
function pantaFailure(request: Request, failure: { status: number; error: PantaError }): Response {
  const { code, message, field, fields } = failure.error;
  const status = failure.status >= 400 && failure.status < 600 ? failure.status : 502;
  return json(
    request,
    {
      error: (code ?? "UPSTREAM_ERROR").toLowerCase(),
      message: message ?? null,
      field: field ?? (fields ? Object.keys(fields)[0] : null),
    },
    status,
  );
}

function usdc(baseUnits: string | undefined): number {
  return Number(baseUnits ?? 0) / 10 ** USDC_DECIMALS;
}

const quoteKey = (quoteId: string): string => `quote:${quoteId}`;

function isQuoteId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{4,80}$/.test(value);
}

function isTxBase64(value: unknown): value is string {
  return typeof value === "string" && value.length > 100 && value.length <= MAX_TX_BASE64 && /^[A-Za-z0-9+/]+=*$/.test(value);
}

// ---- POST /create/quote ----

interface PantaQuote {
  createId: string;
  expectedEventPda: string;
  paymentUsdc: string;
  liquidityInjectionUsdc?: string;
  platformRevenueUsdc?: string;
  expiresAt: string;
}

type Issued = { ok: true; payload: Record<string, unknown> } | { ok: false; response: Response };

/** Fits the draft's text, quotes it with Panta, and records the quote. */
async function issueQuote(
  request: Request,
  env: Env,
  wallet: string,
  draft: MarketDraft,
  minLevel: number,
): Promise<Issued> {
  const fitted = fitDraft(draft, minLevel);
  if (!fitted) {
    return {
      ok: false,
      response: json(request, { error: "invalid_draft", field: "question", message: TOO_LONG }, 400),
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const endTime = Math.floor(Date.parse(draft.endTime) / 1000);
  // Served by this same Worker from its static assets.
  const imageUrl = `${new URL(request.url).origin}/img/${draft.category}.png`;

  const pantaRequest = {
    wallet,
    question: fitted.question,
    resolutionRule: fitted.resolutionRule,
    sourcesOfTruth: fitted.sourcesOfTruth,
    category: draft.category,
    startTime: nowSec + MIN_START_DELAY_SEC + START_BUFFER_SEC,
    endTime,
    resolutionTime: endTime + RESOLUTION_DELAY_SEC,
    imageUrl,
    marketType: DRAFT_MARKET_TYPE,
    description: `Created with Soothia from ${draft.pageUrl}`.slice(0, DESCRIPTION_MAX_LENGTH),
  };

  // Panta's quote endpoint fails for a few seconds at a time with a generic
  // message (seen live several times); the same request then succeeds.
  let result = await pantaPost<PantaQuote>(env, "/markets/create/quote/", pantaRequest);
  for (const waitMs of TRANSIENT_QUOTE_RETRY_WAITS_MS) {
    if (result.ok || !result.error.message?.includes(TRANSIENT_QUOTE_FAILURE)) break;
    await sleep(waitMs);
    result = await pantaPost<PantaQuote>(env, "/markets/create/quote/", pantaRequest);
  }
  if (!result.ok) return { ok: false, response: pantaFailure(request, result) };
  const quote = result.data;

  const record: QuoteRecord = {
    wallet,
    question: fitted.question,
    draft,
    level: fitted.level,
    expectedEventPda: quote.expectedEventPda,
    expiresAt: quote.expiresAt,
  };
  await env.SOOTHIA_CACHE.put(quoteKey(quote.createId), JSON.stringify(record), { expirationTtl: QUOTE_TTL_SEC });

  return {
    ok: true,
    payload: {
      quoteId: quote.createId,
      paymentUsdc: usdc(quote.paymentUsdc),
      breakdown: {
        liquidityUsdc: usdc(quote.liquidityInjectionUsdc),
        platformFeeUsdc: usdc(quote.platformRevenueUsdc),
      },
      expiresAt: quote.expiresAt,
      marketId: quote.expectedEventPda,
      // Exactly what Panta was sent, so the review sheet can show it.
      question: fitted.question,
      resolutionRule: fitted.resolutionRule,
      sourcesOfTruth: fitted.sourcesOfTruth,
      // What was shrunk to fit the transaction: one_source, minimal_rule, question_trimmed.
      adjustments: fitted.adjustments,
      predictedBytes: fitted.predictedBytes,
      imageUrl,
      startTime: new Date(pantaRequest.startTime * 1000).toISOString(),
      endTime: draft.endTime,
      resolutionTime: new Date(pantaRequest.resolutionTime * 1000).toISOString(),
    },
  };
}

export async function handleQuote(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet)) return json(request, { error: "bad_wallet" }, 400);
  const checked = validateDraft(body.draft, Date.now());
  if (!checked.ok) {
    return json(request, { error: "invalid_draft", field: checked.field, message: checked.message }, 400);
  }
  const issued = await issueQuote(request, env, body.wallet, checked.draft, 0);
  return issued.ok ? json(request, issued.payload) : issued.response;
}

// ---- POST /create/build ----

interface PantaBuild {
  transaction?: string;
  instructions?: BuiltInstruction[];
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
  expiresAt?: string;
}

function base64Bytes(base64: string): number {
  return Math.floor((base64.replace(/=+$/, "").length * 3) / 4);
}

export async function handleBuild(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isAddress(body.wallet) || !isQuoteId(body.quoteId)) {
    return json(request, { error: "bad_request" }, 400);
  }
  const wallet = body.wallet;
  let quoteId = body.quoteId;
  // Set when the first build came out too big and the draft was shrunk and re-quoted.
  let requote: Record<string, unknown> | null = null;

  for (;;) {
    const result = await pantaPost<PantaBuild>(env, "/markets/create/build/", { createId: quoteId, wallet });
    if (!result.ok) return pantaFailure(request, result);
    const build = result.data;

    let txBase64 = build.transaction ?? null;
    let recentBlockhash = build.recentBlockhash ?? null;
    let lastValidBlockHeight = build.lastValidBlockHeight ?? null;
    if (!txBase64 && Array.isArray(build.instructions) && build.instructions.length > 0) {
      try {
        const latest = await rpc<{ value: { blockhash: string; lastValidBlockHeight: number } }>(
          env,
          "getLatestBlockhash",
          [{ commitment: "confirmed" }],
        );
        txBase64 = await assembleV0(build.instructions, wallet, latest.value.blockhash);
        recentBlockhash = latest.value.blockhash;
        lastValidBlockHeight = latest.value.lastValidBlockHeight;
      } catch {
        return json(request, { error: "build_failed", message: "Could not assemble the transaction." }, 502);
      }
    }
    if (!txBase64) return json(request, { error: "build_failed", message: "Panta returned no transaction." }, 502);

    const bytes = base64Bytes(txBase64);
    if (bytes <= MAX_BUILT_TRANSACTION_BYTES) {
      return json(request, {
        txBase64,
        bytes,
        recentBlockhash,
        lastValidBlockHeight,
        // Not the session expiry: this one tracks the blockhash, about a minute out.
        txExpiresAt: build.expiresAt ?? null,
        // Present only when the text had to be shrunk further: the quote now in force.
        quote: requote,
      });
    }

    // Panta builds whatever was quoted, even when the text makes the
    // transaction too big. Shrink one more step, quote again, and rebuild.
    const record = await loadQuote(env, quoteId);
    const nextLevel = (record?.level ?? MAX_FIT_LEVEL) + 1;
    if (!record?.draft || nextLevel > MAX_FIT_LEVEL) {
      return json(request, { error: "transaction_too_large", message: TOO_LONG, bytes }, 400);
    }
    const issued = await issueQuote(request, env, wallet, record.draft, nextLevel);
    if (!issued.ok) return issued.response;
    requote = issued.payload;
    quoteId = issued.payload.quoteId as string;
  }
}

// ---- POST /create/simulate ----

interface Simulation {
  value: { err: unknown; logs: string[] | null; unitsConsumed?: number };
}

const RELEVANT_LOG = /insufficient|error|failed|already in use|exceeded|invalid|custom program/i;

/** A sentence a person can act on, from the simulation's error and logs. */
function simulationReason(err: unknown, logs: string[]): string {
  const text = `${typeof err === "string" ? err : JSON.stringify(err)} ${logs.join(" ")}`.toLowerCase();
  if (text.includes("accountnotfound")) {
    return "This wallet is empty. It needs SOL for network fees and USDC for the creation fee.";
  }
  if (text.includes("insufficient lamports") || text.includes("insufficientfundsforfee") || text.includes("insufficientfundsforrent")) {
    return "This wallet does not have enough SOL for network fees.";
  }
  if (text.includes("insufficient funds")) return "This wallet does not have enough USDC for the creation fee.";
  if (text.includes("already in use")) return "This wallet has already created a market with this exact question.";
  if (text.includes("blockhashnotfound")) return "The transaction expired before it was checked. Try again.";
  return "Solana rejected this transaction in a test run, so nothing was sent.";
}

export async function handleSimulate(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isTxBase64(body.txBase64)) return json(request, { error: "bad_request" }, 400);

  let simulation: Simulation;
  try {
    simulation = await rpc<Simulation>(env, "simulateTransaction", [
      body.txBase64,
      { encoding: "base64", sigVerify: false, replaceRecentBlockhash: false, commitment: "confirmed" },
    ]);
  } catch (error) {
    const message = error instanceof RpcError ? error.message : "rpc_error";
    if (message === "rpc_not_configured") return json(request, { error: "proxy_misconfigured" }, 500);
    // The node refused to simulate at all (for example a malformed transaction).
    return json(request, {
      ok: false,
      err: message,
      reason: "Solana could not check this transaction.",
      logLine: null,
      logs: [],
      unitsConsumed: null,
    });
  }

  const { err, unitsConsumed } = simulation.value;
  const logs = simulation.value.logs ?? [];
  return json(request, {
    ok: err === null,
    err,
    reason: err === null ? null : simulationReason(err, logs),
    logLine: err === null ? null : (logs.find((line) => RELEVANT_LOG.test(line)) ?? null),
    logs: logs.slice(-20),
    unitsConsumed: unitsConsumed ?? null,
  });
}

// ---- Confirm, register, remember ----

type TxState = "confirmed" | "failed" | "pending";

async function txState(env: Env, signature: string): Promise<{ state: TxState; err?: unknown }> {
  const statuses = await rpc<{ value: ({ confirmationStatus?: string; err: unknown } | null)[] }>(
    env,
    "getSignatureStatuses",
    [[signature], { searchTransactionHistory: true }],
  );
  const status = statuses.value[0];
  if (!status) return { state: "pending" };
  if (status.err) return { state: "failed", err: status.err };
  const done = status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized";
  return { state: done ? "confirmed" : "pending" };
}

async function waitForConfirmation(env: Env, signature: string, maxWaitMs: number): Promise<{ state: TxState; err?: unknown }> {
  const deadline = Date.now() + maxWaitMs;
  for (;;) {
    try {
      const current = await txState(env, signature);
      if (current.state !== "pending") return current;
    } catch {
      // An RPC hiccup is not a verdict on the transaction; keep polling.
    }
    if (Date.now() + POLL_INTERVAL_MS > deadline) return { state: "pending" };
    await sleep(POLL_INTERVAL_MS);
  }
}

async function rememberMarket(env: Env, wallet: string, market: CreatedMarket): Promise<void> {
  const key = `creator:${wallet}`;
  const existing = ((await env.SOOTHIA_CACHE.get(key, "json")) as CreatedMarket[] | null) ?? [];
  const others = existing.filter((entry) => entry.marketId !== market.marketId);
  const createdAt = existing.find((entry) => entry.marketId === market.marketId)?.createdAt ?? market.createdAt;
  await env.SOOTHIA_CACHE.put(key, JSON.stringify([{ ...market, createdAt }, ...others].slice(0, MAX_CREATOR_MARKETS)));
}

interface FinishResult {
  signature: string;
  status: TxState;
  marketId: string;
  eventPda: string;
  marketUrl: string;
  registered: boolean;
  registerError: string | null;
  error?: string;
}

/**
 * Waits for the transaction, then registers it with Panta. Safe to call any
 * number of times for the same signature: register is idempotent.
 */
async function finish(
  env: Env,
  quoteId: string,
  record: QuoteRecord,
  signature: string,
  maxWaitMs: number,
): Promise<FinishResult> {
  const result: FinishResult = {
    signature,
    status: "pending",
    marketId: record.expectedEventPda,
    eventPda: record.expectedEventPda,
    marketUrl: MARKET_PAGE_BASE + record.expectedEventPda,
    registered: false,
    registerError: null,
  };

  const confirmation = await waitForConfirmation(env, signature, maxWaitMs);
  result.status = confirmation.state;
  if (confirmation.state === "failed") {
    result.error = "The transaction failed on Solana. Nothing was created and the fee was not taken.";
    return result;
  }
  if (confirmation.state === "pending") return result;

  for (let attempt = 1; attempt <= REGISTER_ATTEMPTS; attempt++) {
    const registered = await pantaPost<{ marketId?: string; status?: string }>(env, "/markets/register/", {
      createId: quoteId,
      signature,
    });
    if (registered.ok) {
      result.registered = true;
      result.registerError = null;
      if (registered.data.marketId) {
        result.marketId = registered.data.marketId;
        result.marketUrl = MARKET_PAGE_BASE + registered.data.marketId;
      }
      break;
    }
    result.registerError = (registered.error.code ?? "UPSTREAM_ERROR").toLowerCase();
    if (attempt < REGISTER_ATTEMPTS) await sleep(1500 * attempt);
  }

  // Recorded as soon as it is on-chain, registered or not, so it is never lost.
  await rememberMarket(env, record.wallet, {
    marketId: result.marketId,
    question: record.question,
    signature,
    createdAt: new Date().toISOString(),
    marketUrl: result.marketUrl,
    registered: result.registered,
  });
  return result;
}

async function loadQuote(env: Env, quoteId: string): Promise<QuoteRecord | null> {
  return (await env.SOOTHIA_CACHE.get(quoteKey(quoteId), "json")) as QuoteRecord | null;
}

// ---- POST /create/send ----

/** The transaction's id is its first signature: 64 bytes after the count byte. */
function firstSignature(signedTxBase64: string): string | null {
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(signedTxBase64), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  if (bytes.length < 65 || bytes[0] < 1) return null;
  const signature = bytes.slice(1, 65);
  if (signature.every((byte) => byte === 0)) return null; // Not signed.
  return encodeBase58(signature);
}

export async function handleSend(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isTxBase64(body.signedTxBase64) || !isQuoteId(body.quoteId)) {
    return json(request, { error: "bad_request" }, 400);
  }
  const signature = firstSignature(body.signedTxBase64);
  if (!signature) return json(request, { error: "not_signed" }, 400);

  // Only transactions for a quote we issued are relayed.
  const record = await loadQuote(env, body.quoteId);
  if (!record) return json(request, { error: "unknown_quote" }, 404);

  try {
    await rpc<string>(env, "sendTransaction", [
      body.signedTxBase64,
      { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed", maxRetries: 3 },
    ]);
  } catch (error) {
    const message = error instanceof RpcError ? error.message : "rpc_error";
    if (message === "rpc_not_configured") return json(request, { error: "proxy_misconfigured" }, 500);

    // Before reporting a failure, check whether this exact transaction already
    // landed (a resend, or a send that succeeded but whose reply was lost).
    const landed = await txState(env, signature).catch(() => ({ state: "pending" as TxState }));
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

  // Keep the signature with the quote so the market can be finished later.
  await env.SOOTHIA_CACHE.put(quoteKey(body.quoteId), JSON.stringify({ ...record, signature }), {
    expirationTtl: 30 * 24 * 3600,
  });

  // `confirm: false` returns straight after broadcast; the caller then
  // finishes with /create/register-retry. The extension does this because a
  // browser service worker cannot hold one request open for a minute.
  if (body.confirm === false) {
    // Also finish in the background, so the market still gets registered if
    // the user closes the tab right after paying.
    ctx.waitUntil(finish(env, body.quoteId, record, signature, BACKGROUND_FINISH_WAIT_MS).catch(() => {}));
    return json(request, await finish(env, body.quoteId, record, signature, 0));
  }
  return json(request, await finish(env, body.quoteId, record, signature, SEND_CONFIRM_WAIT_MS));
}

// ---- POST /create/register-retry ----

export async function handleRegisterRetry(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body || !isSignature(body.signature) || !isQuoteId(body.quoteId)) {
    return json(request, { error: "bad_request" }, 400);
  }
  const record = await loadQuote(env, body.quoteId);
  if (!record) return json(request, { error: "unknown_quote" }, 404);
  try {
    return json(request, await finish(env, body.quoteId, record, body.signature, RETRY_CONFIRM_WAIT_MS));
  } catch {
    return json(request, { error: "rpc_unavailable" }, 502);
  }
}

// ---- GET /creator/markets ----

export async function handleCreatorMarkets(request: Request, env: Env): Promise<Response> {
  const wallet = new URL(request.url).searchParams.get("wallet");
  if (!isAddress(wallet)) return json(request, { error: "bad_wallet" }, 400);
  const markets = ((await env.SOOTHIA_CACHE.get(`creator:${wallet}`, "json")) as CreatedMarket[] | null) ?? [];
  return json(request, { markets });
}
