// Solana Actions ("Blinks") for betting on a market without the extension.
// Spec: solana.com/docs/advanced/actions and docs.dialect.to (summarised in
// docs/blinks.md). Routes, all under /api/actions/market/<marketId>:
//   GET            action metadata (buttons YES/NO $1/$5 and custom amounts)
//   POST ?side&amount {account}   an unsigned v0 buy transaction to sign
//   POST /confirm?orderId {account, signature}   chaining callback after the
//                  wallet sent it: submit -> verify -> report to Panta
// Every response carries the spec's CORS headers, X-Action-Version and
// X-Blockchain-Ids. Panta's buy session, assembly and attribution are the
// same code the extension uses (buy.ts).
import { isAddress, isSignature } from "./base58";
import {
  assembleWithFreshBlockhash,
  finishBuy,
  loadRecord,
  marketBrief,
  MAX_BUY_USDC,
  MAX_SLIPPAGE_BPS,
  MIN_BUY_USDC,
  parseAmount,
  parseSide,
  saveRecord,
  type BuyRecord,
  type BuyStatus,
  type MarketBrief,
  type PantaBuyBuild,
  type PantaBuyQuote,
  type Side,
} from "./buy";
import { base64Bytes, isQuoteId, pantaPostWithRetry, type PantaError } from "./create";
import { readJsonObject, type Env } from "./http";
import { MAX_BUILT_TRANSACTION_BYTES } from "./pantaRules";

export const ACTION_VERSION = "2.4";
/** CAIP-2 id of Solana mainnet. */
export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";

export const ACTION_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "Content-Type": "application/json",
  "X-Action-Version": ACTION_VERSION,
  "X-Blockchain-Ids": SOLANA_MAINNET,
};

const ACTION_PATH = /^\/api\/actions\/market\/([1-9A-HJ-NP-Za-km-z]{32,44})(\/confirm)?$/;
const CATEGORY_IMAGES = new Set(["crypto", "entertainment", "finance", "other", "politics", "science", "sports", "world"]);
const FIXED_AMOUNTS = [1, 5];
const CONFIRM_WAIT_MS = 20_000;
const BACKGROUND_WAIT_MS = 22_000;
const CLOSED_MESSAGE = "Betting is closed for this market.";

type PantaResult<T> = { ok: true; data: T } | { ok: false; status: number; error: PantaError };

/** Everything the handlers need from the outside world, so tests can fake it. */
export interface ActionDeps {
  brief(marketId: string): Promise<MarketBrief | null>;
  quote(wallet: string, marketId: string, side: Side, amountUsdc: string): Promise<PantaResult<PantaBuyQuote>>;
  build(quoteId: string, wallet: string): Promise<PantaResult<PantaBuyBuild>>;
  assemble(instructions: PantaBuyBuild["instructions"], wallet: string): Promise<{ txBase64: string }>;
  load(orderId: string): Promise<BuyRecord | null>;
  save(id: string, record: BuyRecord): Promise<void>;
  finish(record: BuyRecord, signature: string, maxWaitMs: number): Promise<BuyStatus>;
  background(work: Promise<unknown>): void;
}

export function actionDeps(env: Env, ctx: ExecutionContext): ActionDeps {
  return {
    brief: (marketId) => marketBrief(env, marketId),
    quote: (wallet, marketId, side, amountUsdc) =>
      pantaPostWithRetry<PantaBuyQuote>(env, "/primaryorderquote/", { wallet, marketId, side, amountUsdc }),
    build: (quoteId, wallet) =>
      pantaPostWithRetry<PantaBuyBuild>(env, "/primaryorderbuild/", { quoteId, wallet, maxSlippageBps: MAX_SLIPPAGE_BPS }),
    assemble: (instructions, wallet) => assembleWithFreshBlockhash(env, instructions ?? [], wallet),
    load: (orderId) => loadRecord(env, orderId),
    save: (id, record) => saveRecord(env, id, record),
    finish: (record, signature, maxWaitMs) => finishBuy(env, record, signature, maxWaitMs),
    background: (work) => ctx.waitUntil(work.catch(() => {})),
  };
}

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: ACTION_HEADERS });
}

/** A spec ActionError: shown to the user by the wallet or blink client. */
function fail(message: string, status = 400): Response {
  return reply({ message }, status);
}

export function iconFor(origin: string, category: string): string {
  return `${origin}/img/${CATEGORY_IMAGES.has(category) ? category : "other"}.png`;
}

export function oddsLine(brief: Pick<MarketBrief, "yesPrice" | "noPrice">): string | null {
  if (brief.yesPrice === null || brief.noPrice === null) return null;
  return `YES ${Math.round(brief.yesPrice * 100)}% · NO ${Math.round(brief.noPrice * 100)}%`;
}

export function describe(brief: MarketBrief): string {
  const kind = brief.marketType === "breaking" ? "Breaking market" : "Market";
  const odds = oddsLine(brief);
  return `${odds ? `${odds} · ` : ""}${kind} on Panta. Made with Soothia.`;
}

/** Buying is open only in the primary phase, and only until it ends. */
export function bettingOpen(brief: MarketBrief, nowMs: number): boolean {
  if (brief.phase !== "primary") return false;
  const ends = brief.primaryPhaseEnd ? Date.parse(brief.primaryPhaseEnd) : NaN;
  return !Number.isFinite(ends) || ends > nowMs;
}

/** Panta's error codes, in words a bettor can act on. */
export function friendlyPantaError(error: PantaError): string {
  const code = (error.code ?? "").toUpperCase();
  if (code === "MARKET_NOT_FOUND") return "This market does not exist.";
  if (/CLOSED|NOT_PRIMARY|PHASE|ENDED|RESOLVED|CANCELLED/.test(code)) return CLOSED_MESSAGE;
  if (/INSUFFICIENT|BALANCE|FUNDS/.test(code)) return "Not enough USDC in this wallet for that bet.";
  if (/VALIDATION|INVALID|AMOUNT/.test(code) && error.message) return error.message;
  return "Panta could not price this bet right now. Please try again in a moment.";
}

function sideLabel(side: Side): string {
  return side.toUpperCase();
}

// ---- GET: action metadata ----

export async function handleActionGet(request: Request, deps: ActionDeps, marketId: string): Promise<Response> {
  const url = new URL(request.url);
  const brief = await deps.brief(marketId);
  if (!brief?.title) return fail("Market not found.", 404);
  const base = `${url.origin}/api/actions/market/${marketId}`;
  const action = {
    type: "action",
    icon: iconFor(url.origin, brief.category),
    title: brief.title,
    description: describe(brief),
    label: "Bet",
  };
  if (!bettingOpen(brief, Date.now())) {
    return reply({ ...action, disabled: true, error: { message: CLOSED_MESSAGE } });
  }
  // ?side=yes|no narrows the buttons to one side (the share page links each side).
  const only = parseSide(url.searchParams.get("side"));
  const sides: Side[] = only ? [only] : ["yes", "no"];
  const fixed = sides.flatMap((side) =>
    FIXED_AMOUNTS.map((amount) => ({
      type: "transaction",
      label: `${sideLabel(side)} $${amount}`,
      href: `${base}?side=${side}&amount=${amount}`,
    })),
  );
  const custom = sides.map((side) => ({
    type: "transaction",
    label: `Bet ${sideLabel(side)}`,
    href: `${base}?side=${side}&amount={amount}`,
    parameters: [
      {
        name: "amount",
        label: `USDC amount (${MIN_BUY_USDC}–${MAX_BUY_USDC})`,
        type: "number",
        min: MIN_BUY_USDC,
        max: MAX_BUY_USDC,
        required: true,
      },
    ],
  }));
  return reply({ ...action, links: { actions: [...fixed, ...custom] } });
}

// ---- POST: build the buy transaction ----

export async function handleActionPost(request: Request, deps: ActionDeps, marketId: string): Promise<Response> {
  const url = new URL(request.url);
  const side = parseSide(url.searchParams.get("side"));
  if (!side) return fail("Choose YES or NO.");
  const amountUsdc = parseAmount(url.searchParams.get("amount") ?? "");
  if (!amountUsdc) return fail(`Bets are between ${MIN_BUY_USDC} and ${MAX_BUY_USDC} USDC.`);
  const body = await readJsonObject(request);
  const account = body?.account;
  if (!isAddress(account)) return fail("The wallet address is not a valid Solana public key.");

  const brief = await deps.brief(marketId);
  if (!brief?.title) return fail("Market not found.", 404);
  if (!bettingOpen(brief, Date.now())) return fail(CLOSED_MESSAGE);

  const quoted = await deps.quote(account, marketId, side, amountUsdc);
  if (!quoted.ok) return fail(friendlyPantaError(quoted.error), quoted.status >= 500 ? 502 : 400);
  const quote = quoted.data;
  const record: BuyRecord = { wallet: account, marketId, side, amountUsdc, quoteId: quote.quoteId, source: "blink" };

  const built = await deps.build(quote.quoteId, account);
  if (!built.ok) return fail(friendlyPantaError(built.error), built.status >= 500 ? 502 : 400);
  const build = built.data;
  if (!Array.isArray(build.instructions) || build.instructions.length === 0 || !build.orderId) {
    return fail("Panta returned no transaction for this bet. Please try again.", 502);
  }
  let txBase64: string;
  try {
    txBase64 = (await deps.assemble(build.instructions, account)).txBase64;
  } catch {
    return fail("Could not assemble the transaction. Please try again.", 502);
  }
  const bytes = base64Bytes(txBase64);
  if (bytes > MAX_BUILT_TRANSACTION_BYTES) return fail("This bet does not fit in one transaction.");

  const withOrder: BuyRecord = { ...record, orderId: build.orderId };
  await Promise.all([deps.save(build.orderId, withOrder), deps.save(quote.quoteId, withOrder)]);

  const shares = Number(build.expectedShares ?? quote.shares ?? 0);
  const total = Math.round((Number(amountUsdc) + Number(quote.feeUsdc ?? 0)) * 100) / 100;
  return reply({
    type: "transaction",
    transaction: txBase64,
    message: `Buying ~${shares.toFixed(2)} ${sideLabel(side)} shares for $${total.toFixed(2)} (incl. 2% fee)`,
    links: { next: { type: "post", href: `/api/actions/market/${marketId}/confirm?orderId=${encodeURIComponent(build.orderId)}` } },
  });
}

// ---- POST /confirm: chaining callback with the signature ----

export async function handleActionConfirm(request: Request, deps: ActionDeps, marketId: string): Promise<Response> {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!isQuoteId(orderId)) return fail("Unknown order.");
  const body = await readJsonObject(request);
  const account = body?.account;
  const signature = body?.signature;
  if (!isAddress(account)) return fail("The wallet address is not a valid Solana public key.");
  if (!isSignature(signature)) return fail("Missing transaction signature.");

  const record = await deps.load(orderId);
  if (!record?.orderId || record.marketId !== marketId) return fail("Unknown order.", 404);
  if (record.wallet !== account) return fail("This order belongs to another wallet.", 403);
  if (record.signature && record.signature !== signature) return fail("This order was already sent with a different transaction.", 409);

  const sent: BuyRecord = { ...record, signature };
  if (!record.signature) await deps.save(record.orderId, sent);

  const brief = await deps.brief(marketId);
  const icon = iconFor(url.origin, brief?.category ?? "other");
  const question = brief?.title ?? "your market";
  const stake = `$${Number(record.amountUsdc).toFixed(2)} on ${sideLabel(record.side)}`;

  let status: BuyStatus;
  try {
    status = await deps.finish(sent, signature, CONFIRM_WAIT_MS);
  } catch {
    deps.background(deps.finish(sent, signature, BACKGROUND_WAIT_MS));
    return reply({ type: "completed", icon, title: "Bet sent", description: `${stake}: ${question}. Solana is still confirming it.`, label: "Sent" });
  }
  if (status.status === "failed") {
    return reply({
      type: "completed",
      icon,
      title: "Bet failed",
      description: "The transaction failed on Solana. No USDC was taken.",
      label: "Failed",
      error: { message: "The transaction failed on Solana. No USDC was taken." },
    });
  }
  if (status.status === "pending") {
    deps.background(deps.finish(sent, signature, BACKGROUND_WAIT_MS));
    return reply({ type: "completed", icon, title: "Bet sent", description: `${stake}: ${question}. Solana is still confirming it.`, label: "Sent" });
  }
  const tail = status.attributed ? "" : " Panta will show it in your positions shortly.";
  return reply({ type: "completed", icon, title: "Bet placed. Good luck.", description: `${stake}: ${question}.${tail}`, label: "Done" });
}

// ---- Router ----

/** Answers action routes (and their preflights); null for every other path. */
export function actionRoute(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> | null {
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  if (path === "/actions.json") {
    if (request.method === "OPTIONS") return Promise.resolve(new Response(null, { status: 204, headers: ACTION_HEADERS }));
    return Promise.resolve(reply({ rules: [{ pathPattern: "/api/actions/**", apiPath: "/api/actions/**" }] }));
  }
  const match = ACTION_PATH.exec(path);
  if (!match) return null;
  if (request.method === "OPTIONS") return Promise.resolve(new Response(null, { status: 204, headers: ACTION_HEADERS }));
  const [, marketId, confirm] = match;
  const deps = actionDeps(env, ctx);
  if (confirm) {
    return request.method === "POST" ? handleActionConfirm(request, deps, marketId) : Promise.resolve(fail("Method not allowed.", 405));
  }
  if (request.method === "GET") return handleActionGet(request, deps, marketId);
  if (request.method === "POST") return handleActionPost(request, deps, marketId);
  return Promise.resolve(fail("Method not allowed.", 405));
}
