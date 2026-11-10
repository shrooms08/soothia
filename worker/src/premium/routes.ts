// x402 for premium calls. GET /premium/call/:pickId answers 402 with what to pay; the
// client signs the payment without executing it and retries; the Worker checks the bytes,
// broadcasts them, and only then reveals the call. The other routes exist because the
// extension has no connection to Sui of its own.

import { json, readJsonObject, type Env } from "../http";
import type { RecallStore } from "../recall/memory";
import { identify, storeFor } from "../recall/routes";
import { handleKey, recentKey, type ProfileIndex } from "../social/context";
import type { FeedItem } from "../social/feed";
import { earningsKey, premiumEligibility, premiumKey, unlockKey, type PremiumEntry } from "../social/premium";
import { cacheGet, cachePut, kvPut } from "../store";
import { paySettings, tatumPayChain, type PayChain, type PaySettings } from "./chain";
import { checkPayment, checkWithdrawal } from "./verify";

export const NETWORK = "sui:mainnet";
export const ASSET = "0x2::sui::SUI";
const TIMEOUT_SEC = 300;
const NONCE_BYTES = 16;
/** A nonce with less life than this is replaced, so a slow wallet still has time. */
const MIN_NONCE_LIFE_MS = 120_000;
const UNLOCK_AFTER_KICKOFF_SEC = 86_400;
const BUSY_SEC = 60;
const MAX_HEADER_CHARS = 8_000;
const MIN_FUNDING_MIST = 1_000_000n;
const MAX_FUNDING_MIST = 10_000_000_000n;

const ADDRESS = /^0x[0-9a-f]{64}$/i;
const PICK_ID = /^[A-Za-z0-9_-]{1,100}$/;
const AMOUNT = /^[1-9][0-9]{0,18}$/;
const SIGNATURE = /^[A-Za-z0-9+/]+={0,2}$/;

export interface PremiumDeps {
  chain?: PayChain;
  settings?: PaySettings;
  store?: (userKey: string) => RecallStore;
  now?: () => number;
}

interface Context {
  request: Request;
  env: Env;
  chain: PayChain;
  settings: PaySettings;
  store: (userKey: string) => RecallStore;
  nowMs: number;
}

/** One buyer's quote for one call. */
export interface PaymentEntry {
  nonce: string;
  pickId: string;
  priceMist: string;
  payTo: string;
  userKey: string;
  expiresMs: number;
  consumed?: true;
}

export interface UnlockReceipt {
  digest: string;
  priceMist: string;
  at: string;
}

export const paymentKey = (userKey: string, pickId: string): string => `x402:${userKey}:${pickId}`;

const encodeHeader = (value: unknown): string => btoa(JSON.stringify(value));

/** The quote's terms as the client repeats them. Every field is checked, so none is trusted. */
interface AcceptedTerms {
  scheme?: unknown;
  network?: unknown;
  asset?: unknown;
  amount?: unknown;
  payTo?: unknown;
  extra?: { nonce?: unknown; payPackage?: unknown; payConfig?: unknown };
}

interface SignedPayment {
  x402Version?: unknown;
  accepted?: AcceptedTerms;
  payload?: unknown;
}

function decodeHeader(value: string): SignedPayment | null {
  if (value.length > MAX_HEADER_CHARS) return null;
  try {
    const parsed: unknown = JSON.parse(atob(value));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as SignedPayment) : null;
  } catch {
    return null;
  }
}

const receiptOf = (digest: string, priceMist: string, at: string) => ({
  digest,
  priceMist,
  at,
  url: `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`,
});

/** The call as it stands now: a stake made after locking is only in the feed. */
async function latestItem(context: Context, entry: PremiumEntry): Promise<FeedItem> {
  const items = await context.env.SOOTHIA_CACHE.get<FeedItem[]>(recentKey(entry.handle), "json").catch(() => null);
  return items?.find((item) => item.pickId === entry.pickId) ?? entry.item;
}

async function reveal(
  context: Context,
  entry: PremiumEntry,
  access: "owner" | "kickoff" | "unlocked",
  receipt: UnlockReceipt | null,
  headers: Record<string, string> = {},
): Promise<Response> {
  const call = await latestItem(context, entry);
  return json(
    context.request,
    {
      handle: entry.handle,
      call,
      access,
      receipt: receipt ? receiptOf(receipt.digest, receipt.priceMist, receipt.at) : null,
    },
    200,
    headers,
  );
}

function randomNonce(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function requirements(context: Context, entry: PremiumEntry, payment: PaymentEntry) {
  const url = new URL(context.request.url);
  return {
    x402Version: 2,
    error: "PAYMENT-SIGNATURE header is required",
    resource: {
      url: `${url.origin}${url.pathname}`,
      description: `Premium call by @${entry.handle}`,
      mimeType: "application/json",
    },
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        amount: payment.priceMist,
        asset: ASSET,
        payTo: payment.payTo,
        maxTimeoutSeconds: TIMEOUT_SEC,
        extra: { payPackage: context.settings.packageId, payConfig: context.settings.configId, nonce: payment.nonce },
      },
    ],
  };
}

/** Reuses a quote that is still good, so repeat requests don't spend KV writes. */
async function quote(
  context: Context,
  entry: PremiumEntry,
  userKey: string,
  payTo: string,
): Promise<PaymentEntry | null> {
  const key = paymentKey(userKey, entry.pickId);
  const current = await context.env.SOOTHIA_CACHE.get<PaymentEntry>(key, "json");
  if (
    current &&
    !current.consumed &&
    current.payTo === payTo &&
    current.priceMist === entry.priceMist &&
    current.expiresMs - context.nowMs >= MIN_NONCE_LIFE_MS
  )
    return current;
  const payment: PaymentEntry = {
    nonce: randomNonce(),
    pickId: entry.pickId,
    priceMist: entry.priceMist,
    payTo,
    userKey,
    expiresMs: context.nowMs + TIMEOUT_SEC * 1000,
  };
  return (await kvPut(context.env, key, JSON.stringify(payment), { expirationTtl: TIMEOUT_SEC })) ? payment : null;
}

function paymentFailed(context: Context, reason: string, digest = "", payer = ""): Response {
  const header = encodeHeader({ success: false, errorReason: reason, transaction: digest, network: NETWORK, payer });
  return json(context.request, { error: "payment_failed", reason }, 402, { "PAYMENT-RESPONSE": header });
}

/** Everything in the signed header's `accepted` must be what was quoted. */
function acceptedMatches(accepted: AcceptedTerms | undefined, payment: PaymentEntry, settings: PaySettings): boolean {
  return (
    accepted?.scheme === "exact" &&
    accepted.network === NETWORK &&
    accepted.asset === ASSET &&
    accepted.amount === payment.priceMist &&
    accepted.payTo === payment.payTo &&
    accepted.extra?.nonce === payment.nonce &&
    accepted.extra?.payPackage === settings.packageId &&
    accepted.extra?.payConfig === settings.configId
  );
}

async function recordUnlock(
  context: Context,
  entry: PremiumEntry,
  userKey: string,
  digest: string,
  earnedMist: bigint,
  payment: PaymentEntry,
): Promise<UnlockReceipt> {
  const { env, nowMs } = context;
  const at = new Date(nowMs).toISOString();
  const receipt: UnlockReceipt = { digest, priceMist: entry.priceMist, at };
  const ttl = Math.max(60, Math.ceil((entry.kickoffMs - nowMs) / 1000) + UNLOCK_AFTER_KICKOFF_SEC);
  await kvPut(env, unlockKey(userKey, entry.pickId), JSON.stringify(receipt), { expirationTtl: ttl });
  await kvPut(env, paymentKey(userKey, entry.pickId), JSON.stringify({ ...payment, consumed: true }), {
    expirationTtl: TIMEOUT_SEC,
  });

  const key = earningsKey(payment.payTo);
  const earnings = await env.SOOTHIA_CACHE.get<{ totalMist: string; unlocks: number }>(key, "json").catch(() => null);
  await kvPut(
    env,
    key,
    JSON.stringify({
      totalMist: (BigInt(earnings?.totalMist ?? "0") + earnedMist).toString(),
      unlocks: (earnings?.unlocks ?? 0) + 1,
    }),
  );

  // The payment is made and the call is theirs, so a memory failure can't take that back.
  await context
    .store(userKey)
    .write("unlock", {
      pickId: entry.pickId,
      handle: entry.handle,
      priceMist: entry.priceMist,
      digest,
      at,
      fixture: entry.item.fixture,
      side: entry.item.side,
    })
    .catch((error: unknown) =>
      console.warn(`Soothia: unlock memory failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`),
    );
  return receipt;
}

async function settle(context: Context, entry: PremiumEntry, userKey: string, header: string): Promise<Response> {
  const payment = await context.env.SOOTHIA_CACHE.get<PaymentEntry>(paymentKey(userKey, entry.pickId), "json");
  if (!payment) return paymentFailed(context, "nonce_expired");
  if (payment.consumed) return paymentFailed(context, "nonce_used");
  const body = decodeHeader(header);
  if (!body || body.x402Version !== 2) return paymentFailed(context, "invalid_payload");
  if (!acceptedMatches(body.accepted, payment, context.settings))
    return paymentFailed(context, "requirements_mismatch");
  const { signature, transaction } = (body.payload ?? {}) as { signature?: unknown; transaction?: unknown };
  if (typeof signature !== "string" || !SIGNATURE.test(signature)) return paymentFailed(context, "invalid_payload");

  const check = checkPayment(transaction, {
    packageId: context.settings.packageId,
    configId: context.settings.configId,
    nonce: payment.nonce,
    payTo: payment.payTo,
    priceMist: payment.priceMist,
  });
  if (!check.ok) return paymentFailed(context, check.code);

  const busyKey = `x402:busy:${payment.nonce}`;
  if (await cacheGet<boolean>(busyKey)) return paymentFailed(context, "payment_in_progress", "", check.sender);
  await cachePut(busyKey, true, BUSY_SEC);

  let executed;
  try {
    executed = await context.chain.execute(transaction as string, signature);
  } catch (error) {
    await cachePut(busyKey, null, 1);
    console.warn(`Soothia: payment did not broadcast: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    return paymentFailed(context, "broadcast_failed", "", check.sender);
  }
  if (!executed.succeeded) {
    await cachePut(busyKey, null, 1);
    return paymentFailed(context, "transaction_failed", executed.digest, check.sender);
  }
  const paid = executed.paid.find(
    (event) =>
      event.nonce === payment.nonce && event.recipient === payment.payTo && event.amount === BigInt(payment.priceMist),
  );
  if (!paid) return paymentFailed(context, "no_payment_event", executed.digest, check.sender);

  const receipt = await recordUnlock(context, entry, userKey, executed.digest, paid.amount - paid.fee, payment);
  return reveal(context, entry, "unlocked", receipt, {
    "PAYMENT-RESPONSE": encodeHeader({
      success: true,
      transaction: executed.digest,
      network: NETWORK,
      payer: check.sender,
    }),
  });
}

async function callRoute(context: Context, userKey: string, pickId: string): Promise<Response> {
  const { request, env, nowMs } = context;
  if (!PICK_ID.test(pickId)) return json(request, { error: "invalid_pick_id" }, 400);
  const entry = await env.SOOTHIA_CACHE.get<PremiumEntry>(premiumKey(pickId), "json");
  if (!entry) return json(request, { error: "not_found" }, 404);
  if (entry.userKey === userKey) return reveal(context, entry, "owner", null);
  if (nowMs >= entry.kickoffMs) return reveal(context, entry, "kickoff", null);
  const bought = await env.SOOTHIA_CACHE.get<UnlockReceipt>(unlockKey(userKey, pickId), "json");
  if (bought) return reveal(context, entry, "unlocked", bought);

  // A call with no commit on Sui has nothing to prove it came before the match.
  if (!entry.item.proof) return json(request, { error: "premium_no_proof" }, 409);
  const profile = await env.SOOTHIA_CACHE.get<ProfileIndex>(handleKey(entry.handle), "json");
  if (!profile || profile.userKey !== entry.userKey) return json(request, { error: "premium_unavailable" }, 410);

  const header = request.headers.get("PAYMENT-SIGNATURE");
  if (header) return settle(context, entry, userKey, header);
  const payment = await quote(context, entry, userKey, profile.address);
  if (!payment) return json(request, { error: "kv_unavailable" }, 503);
  return json(request, { error: "payment_required" }, 402, {
    "PAYMENT-REQUIRED": encodeHeader(requirements(context, entry, payment)),
  });
}

const refusalFor = (error: unknown): string =>
  /insufficient|not enough|balance/i.test(String((error as Error)?.message ?? error))
    ? "insufficient_balance"
    : "build_failed";

async function buildRoute(context: Context, userKey: string): Promise<Response> {
  const { request, env, chain } = context;
  const body = await readJsonObject(request);
  if (!body) return json(request, { error: "invalid_body" }, 400);
  if (typeof body.pickId !== "string" || !PICK_ID.test(body.pickId))
    return json(request, { error: "invalid_pick_id" }, 400);
  if (typeof body.sender !== "string" || !ADDRESS.test(body.sender))
    return json(request, { error: "invalid_sender" }, 400);
  const payment = await env.SOOTHIA_CACHE.get<PaymentEntry>(paymentKey(userKey, body.pickId), "json");
  if (!payment || payment.consumed) return json(request, { error: "payment_expired" }, 404);
  try {
    return json(request, {
      transaction: await chain.buildPayment(
        body.sender.toLowerCase(),
        payment.nonce,
        payment.payTo,
        BigInt(payment.priceMist),
      ),
    });
  } catch (error) {
    console.warn(`Soothia: payment build failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    return json(request, { error: refusalFor(error) }, 409);
  }
}

async function balanceRoute(context: Context): Promise<Response> {
  const { request, chain } = context;
  const address = new URL(request.url).searchParams.get("address") ?? "";
  if (!ADDRESS.test(address)) return json(request, { error: "invalid_address" }, 400);
  return json(request, { balanceMist: (await chain.balanceOf(address.toLowerCase())).toString() });
}

/** With an amount, a funding transfer. Without one, a withdrawal of everything. */
async function transferBuildRoute(context: Context): Promise<Response> {
  const { request, chain } = context;
  const body = await readJsonObject(request);
  if (!body) return json(request, { error: "invalid_body" }, 400);
  const { sender, recipient, amountMist } = body;
  if (typeof sender !== "string" || !ADDRESS.test(sender)) return json(request, { error: "invalid_sender" }, 400);
  if (typeof recipient !== "string" || !ADDRESS.test(recipient))
    return json(request, { error: "invalid_recipient" }, 400);
  let amount: bigint | null = null;
  if (amountMist !== undefined) {
    if (typeof amountMist !== "string" || !AMOUNT.test(amountMist))
      return json(request, { error: "invalid_amount" }, 400);
    amount = BigInt(amountMist);
    if (amount < MIN_FUNDING_MIST || amount > MAX_FUNDING_MIST) return json(request, { error: "invalid_amount" }, 400);
  }
  try {
    const transaction =
      amount === null
        ? await chain.buildWithdrawAll(sender.toLowerCase(), recipient.toLowerCase())
        : await chain.buildFunding(sender.toLowerCase(), recipient.toLowerCase(), amount);
    return json(request, { transaction });
  } catch (error) {
    console.warn(`Soothia: transfer build failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    if ((error as Error)?.message === "no_coins") return json(request, { error: "insufficient_balance" }, 409);
    return json(request, { error: refusalFor(error) }, 409);
  }
}

/** Broadcasts an agent wallet's signed withdrawal. No other kind of transaction is relayed. */
async function transferExecuteRoute(context: Context): Promise<Response> {
  const { request, chain } = context;
  const body = await readJsonObject(request);
  if (!body) return json(request, { error: "invalid_body" }, 400);
  const { transaction, signature } = body;
  if (typeof signature !== "string" || !SIGNATURE.test(signature))
    return json(request, { error: "invalid_signature" }, 400);
  const check = checkWithdrawal(transaction);
  if (!check.ok) return json(request, { error: check.code }, 400);
  try {
    const executed = await chain.execute(transaction as string, signature);
    if (!executed.succeeded) return json(request, { error: "transaction_failed", digest: executed.digest }, 409);
    return json(request, { digest: executed.digest });
  } catch (error) {
    console.warn(`Soothia: withdrawal did not broadcast: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    return json(request, { error: "broadcast_failed" }, 502);
  }
}

export async function premiumRoute(
  request: Request,
  env: Env,
  path: string,
  deps: PremiumDeps = {},
): Promise<Response> {
  const settings = deps.settings ?? paySettings(env);
  const chain = deps.chain ?? (settings ? tatumPayChain(env, settings) : null);
  if (!settings || !chain) return json(request, { error: "premium_unavailable" }, 503);
  const context: Context = {
    request,
    env,
    chain,
    settings,
    store: deps.store ?? ((userKey) => storeFor(env, userKey)),
    nowMs: deps.now?.() ?? Date.now(),
  };
  try {
    if (path === "/premium/balance" && request.method === "GET") return await balanceRoute(context);
    if (path === "/premium/transfer/build" && request.method === "POST") return await transferBuildRoute(context);
    if (path === "/premium/transfer/execute" && request.method === "POST") return await transferExecuteRoute(context);

    const userKey = await identify(request);
    if (userKey instanceof Response) return userKey;
    if (path === "/premium/eligible" && request.method === "GET")
      return json(request, await premiumEligibility(env, userKey));
    if (path === "/premium/build" && request.method === "POST") return await buildRoute(context, userKey);
    if (path.startsWith("/premium/call/") && request.method === "GET")
      return await callRoute(context, userKey, path.slice("/premium/call/".length));
    return json(request, { error: "not_found" }, 404);
  } catch (error) {
    console.warn(`Soothia: premium route failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
    return json(request, { error: "premium_failed" }, 502);
  }
}
