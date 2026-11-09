// Soothia staking: the /stake/* routes. The Worker never holds a staker's key: it
// builds an unsigned transaction, the wallet signs it, and /stake/confirm checks what
// actually happened on chain before anything is recorded.

import { isAdmin, json, readJsonObject, type Env } from "../http";
import { fetchScoreboard, locateFixture, type LocatedFixture, type ScoreboardFetcher } from "../recall/espn";
import type { RecallStore } from "../recall/memory";
import { mergePicks } from "../recall/picks";
import type { PickRecord, Side, StakeRecord } from "../recall/records";
import { identify, storeFor } from "../recall/routes";
import { cacheGet, cachePut, kvPut } from "../store";
import { pushStakeToFeed } from "../social/feed";
import { ADMIN_ROUTES } from "./admin";
import { DRILL_ROUTES } from "./drill";
import { stakeSettings, tatumStakeChain, type StakeChain, type StakeSettings } from "./chain";
import { abortCodeOf, clearPoolCreation, parseAddress, refuse, StakeRefusal, type Context } from "./context";
import { flipSubject, poolIdentity, type PoolFixture, type PoolIdentity, type Subject } from "./identity";
import { claimOpensAtMs, inChallengeWindow, multiplierAfterFee, poolTotals, PROD_CHALLENGE_MS, PROD_MIN_RESOLVE_DELAY_MS } from "./math";
import { viewPosition } from "./positions";
import type { StakeConfig, StakePool } from "./readers";
import { poolIndexKey, releaseResolverLock, STAKE_LOG_KEY, STAKE_POOL_PREFIX, writePoolIndex, type PoolIndexEntry, type PoolIndexMeta } from "./sweep";
import { buildClaim, buildStake } from "./transactions";

const STAKE_GAS_BUDGET = 20_000_000;
const CLAIM_GAS_BUDGET = 20_000_000;
const MIN_KICKOFF_LEAD_MS = 120_000;
const POOL_CACHE_SEC = 15;
// Each position takes two reads, and one request has a limited number of outbound calls.
const MAX_POSITIONS = 20;
const MAX_PENDING = 20;
const STAKE_ADDRESS_PREFIX = "stakeaddr:";

const DIGEST = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const AMOUNT = /^[1-9][0-9]{0,18}$/;

export interface StakeDeps {
  chain?: StakeChain;
  settings?: StakeSettings;
  fetcher?: ScoreboardFetcher;
  store?: RecallStore;
  now?: () => number;
}

const shortString = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function parseAmount(value: unknown): bigint {
  const text = typeof value === "number" && Number.isSafeInteger(value) ? String(value) : value;
  if (typeof text !== "string" || !AMOUNT.test(text)) refuse(400, "invalid_amount");
  return BigInt(text as string);
}

function parseFixtureQuestion(body: Record<string, unknown>): { fixture: PoolFixture; subject: Subject } {
  const raw = body.fixture as Partial<PoolFixture> | null | undefined;
  if (typeof raw !== "object" || raw === null || !shortString(raw.home, 100) || !shortString(raw.away, 100) || !shortString(raw.startISO, 40)) {
    refuse(400, "invalid_fixture");
  }
  if (body.subject !== "home" && body.subject !== "away") refuse(400, "invalid_subject");
  return { fixture: raw as PoolFixture, subject: body.subject as Subject };
}

function identityOf(fixture: PoolFixture, subject: Subject): Promise<PoolIdentity> {
  return poolIdentity(fixture, subject).catch(() => refuse(400, "invalid_fixture"));
}

const limitsOf = (config: StakeConfig) => ({
  minStakeMist: config.minStake.toString(),
  maxStakePerUserMist: config.maxStakePerUser.toString(),
  maxPoolMist: config.maxPool.toString(),
});

const poolCacheKey = (questionHash: string): string => `stake:pool:${questionHash}`;

/** Forgets a cached pool view, because a stake or a new pool has changed it. */
const forgetPool = (questionHash: string): Promise<void> => cachePut(poolCacheKey(questionHash), null, 1);

async function poolRoute(context: Context): Promise<Response> {
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const { fixture, subject } = parseFixtureQuestion(body);
  const identity = await identityOf(fixture, subject);
  const cacheKey = poolCacheKey(identity.questionHash);
  const cached = await cacheGet<Record<string, unknown>>(cacheKey);
  if (cached) return json(context.request, cached);

  const config = await context.chain.readConfig();
  const poolId = await context.chain.findPoolId(config, identity.questionHash);
  const view = poolId ? poolView(poolId, await context.chain.readPool(poolId), config) : emptyPoolView(identity, config);
  await cachePut(cacheKey, view, POOL_CACHE_SEC);
  return json(context.request, view);
}

function poolView(poolId: string, pool: StakePool, config: StakeConfig): Record<string, unknown> {
  const { yes, no } = poolTotals(pool);
  return {
    exists: true,
    poolId,
    status: pool.status,
    closeMs: Number(pool.closeMs),
    yesTotal: yes.toString(),
    noTotal: no.toString(),
    feeBps: Number(pool.feeBps),
    payoutIfYes: multiplierAfterFee(yes, no, yes, pool.feeBps),
    payoutIfNo: multiplierAfterFee(yes, no, no, pool.feeBps),
    limits: limitsOf(config),
    ...(pool.status === "resolved" ? { claimOpensAtMs: Number(claimOpensAtMs(pool)) } : {}),
  };
}

function emptyPoolView(identity: PoolIdentity, config: StakeConfig): Record<string, unknown> {
  return {
    exists: false,
    poolId: null,
    status: null,
    closeMs: Number(identity.closeMs),
    yesTotal: "0",
    noTotal: "0",
    feeBps: Number(config.feeBps),
    payoutIfYes: null,
    payoutIfNo: null,
    limits: limitsOf(config),
  };
}

async function loadPick(context: Context, userKey: string, pickId: unknown): Promise<PickRecord & { fixture: NonNullable<PickRecord["fixture"]> }> {
  if (!shortString(pickId, 100)) refuse(400, "invalid_pick_id");
  const pick = mergePicks(await context.store(userKey).list("pick")).find((candidate) => candidate.id === pickId);
  if (!pick) return refuse(404, "pick_not_found");
  if (!pick.fixture) return refuse(400, "not_a_fixture_pick");
  return pick as PickRecord & { fixture: NonNullable<PickRecord["fixture"]> };
}

const leanYes = (pick: PickRecord): boolean => pick.pYes >= 0.5;

function checkStakeLimits(config: StakeConfig, pool: StakePool | null, held: { side: boolean; amount: bigint } | null, amount: bigint, side: boolean): void {
  if (amount < config.minStake) refuse(400, "below_min_stake", { minStakeMist: config.minStake.toString() });
  if (held && held.side !== side) refuse(409, "side_switch");
  if ((held?.amount ?? 0n) + amount > config.maxStakePerUser) {
    refuse(400, "above_user_limit", { maxStakePerUserMist: config.maxStakePerUser.toString(), heldMist: (held?.amount ?? 0n).toString() });
  }
  if ((pool ? pool.yes + pool.no : 0n) + amount > config.maxPool) refuse(409, "pool_full", { maxPoolMist: config.maxPool.toString() });
}

/**
 * The real fixture from ESPN. A pick's kickoff comes from the page the user was on,
 * and a pool closes at kickoff: a pool with a late close could be staked on after the
 * final whistle, so the page's time never reaches the chain.
 */
async function verifiedFixture(context: Context, fixture: PoolFixture): Promise<LocatedFixture> {
  const { located } = await locateFixture(fixture, context.fetcher).catch(() => refuse(503, "espn_unavailable"));
  if (!located) return refuse(400, "fixture_not_on_espn");
  if (located.event.state !== "pre" || located.notPlayed) refuse(409, "fixture_not_open");
  if (Date.parse(located.event.startISO) - context.nowMs <= MIN_KICKOFF_LEAD_MS) refuse(409, "too_close_to_kickoff");
  if (new Date(Date.parse(fixture.startISO)).toISOString().slice(0, 10) !== located.event.startISO.slice(0, 10)) refuse(409, "fixture_date_mismatch");
  return located;
}

function indexEntry(poolId: string, questionHash: string, pick: { fixture: PickRecord["fixture"] & object }, located?: LocatedFixture): PoolIndexEntry {
  const { fixture } = pick;
  // Stored the way ESPN lists the match, with the subject turned to match.
  return {
    poolId,
    questionHash,
    home: located ? located.event.home.name : fixture.home,
    away: located ? located.event.away.name : fixture.away,
    startISO: located ? located.event.startISO : fixture.startISO,
    subject: located?.reversed ? flipSubject(fixture.subject) : fixture.subject,
    ...(located ? { league: located.league } : {}),
  };
}

async function createPool(
  context: Context,
  pick: { fixture: PickRecord["fixture"] & object },
  identity: PoolIdentity,
  config: StakeConfig,
): Promise<string> {
  const { env, chain } = context;
  // Pools copy the delays when created. While a drill has them shortened, a real pool must wait.
  if (config.minResolveDelayMs !== PROD_MIN_RESOLVE_DELAY_MS || config.challengeMs !== PROD_CHALLENGE_MS) refuse(503, "staking_paused");
  const located = await verifiedFixture(context, pick.fixture);
  await clearPoolCreation(context);

  const closeMs = BigInt(Date.parse(located.event.startISO));
  let poolId: string;
  try {
    ({ poolId } = await chain.createPool(identity.questionHash, closeMs));
  } catch (error) {
    // Someone else may have created it first; the registry only ever holds one.
    const existing = await chain.findPoolId(config, identity.questionHash).catch(() => null);
    if (!existing) throw error;
    return existing;
  } finally {
    await releaseResolverLock(env);
  }
  await writePoolIndex(env, indexEntry(poolId, identity.questionHash, pick, located), { phase: "open", dueMs: Number(closeMs + config.minResolveDelayMs) });
  await forgetPool(identity.questionHash);
  return poolId;
}

async function buildRoute(context: Context, userKey: string): Promise<Response> {
  const { chain, settings, nowMs } = context;
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const amount = parseAmount(body.amountMist);
  const sender = parseAddress(body.sender, "invalid_sender");
  const pick = await loadPick(context, userKey, body.pickId);
  if (!pick.commit) refuse(400, "pick_not_committed");
  if (!(Date.parse(pick.fixture.startISO) - nowMs > MIN_KICKOFF_LEAD_MS)) refuse(409, "too_close_to_kickoff");

  const side = leanYes(pick);
  const identity = await identityOf(pick.fixture, pick.fixture.subject);
  const config = await chain.readConfig();
  let poolId = await chain.findPoolId(config, identity.questionHash);
  const pool = poolId ? await chain.readPool(poolId) : null;
  if (pool) {
    if (pool.status !== "open") refuse(409, "pool_not_open");
    // The chain's close time, because the pick's kickoff came from a web page.
    if (!(Number(pool.closeMs) - nowMs > MIN_KICKOFF_LEAD_MS)) refuse(409, "too_close_to_kickoff");
  }
  const held = pool ? await chain.readPosition(pool, sender) : null;
  checkStakeLimits(config, pool, held, amount, side);

  // Checked first, so nobody can make Soothia pay for a pool they cannot stake in.
  const needed = amount + BigInt(STAKE_GAS_BUDGET);
  if ((await chain.balanceOf(sender)) < needed) refuse(400, "insufficient_balance", { neededMist: needed.toString() });

  if (!poolId) poolId = await createPool(context, pick, identity, config);

  const tx = buildStake(settings, { poolId, side, amount, pickHash: pick.hash });
  let txBytes: string;
  try {
    txBytes = await chain.buildForSender(tx, sender, STAKE_GAS_BUDGET);
  } catch (error) {
    const abortCode = abortCodeOf(error);
    if (abortCode === null) throw error;
    return refuse(409, "stake_rejected", { abortCode });
  }

  const { yes, no } = pool ? poolTotals(pool) : { yes: 0n, no: 0n };
  const after = side ? { yes: yes + amount, no } : { yes, no: no + amount };
  const feeBps = pool?.feeBps ?? config.feeBps;
  return json(context.request, {
    txBytes,
    summary: {
      poolId,
      side: side ? "YES" : "NO",
      amountMist: amount.toString(),
      multiplierNow: multiplierAfterFee(after.yes, after.no, side ? after.yes : after.no, feeBps),
    },
  });
}

interface AddressIndexValue {
  digests: string[];
}

interface AddressIndexMeta {
  pickId: string;
  home: string;
  away: string;
  startISO: string;
  subject: Subject;
}

const addressIndexKey = (sender: string, poolId: string): string => `${STAKE_ADDRESS_PREFIX}${sender}:${poolId}`;

function describeStake(fixture: NonNullable<PickRecord["fixture"]>): string {
  const [team, opponent] = fixture.subject === "home" ? [fixture.home, fixture.away] : [fixture.away, fixture.home];
  return `${team} win vs ${opponent} on ${new Date(Date.parse(fixture.startISO)).toISOString().slice(0, 10)}`;
}

/** Remembers which address is this user's. Best effort: the stake is already recorded. */
async function linkWallet(context: Context, userKey: string, address: string): Promise<void> {
  const key = `walletlink:${userKey}`;
  try {
    if ((await context.env.SOOTHIA_CACHE.get(key)) === address) return;
    await context.store(userKey).write("pref", { kind: "wallet_link", at: new Date(context.nowMs).toISOString(), address });
    await kvPut(context.env, key, address);
  } catch (error) {
    console.warn(`Soothia: wallet link failed: ${String((error as Error)?.message ?? error).slice(0, 160)}`);
  }
}

async function confirmRoute(context: Context, userKey: string): Promise<Response> {
  const { env, chain } = context;
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const { digest } = body;
  if (typeof digest !== "string" || !DIGEST.test(digest)) refuse(400, "invalid_digest");
  const pick = await loadPick(context, userKey, body.pickId);

  const transaction = await chain.readStakeTransaction(digest as string);
  if (!transaction) return refuse(404, "transaction_not_found");
  if (!transaction.succeeded) refuse(400, "transaction_failed");

  const identity = await identityOf(pick.fixture, pick.fixture.subject);
  const config = await chain.readConfig();
  const poolId = (await chain.findPoolId(config, identity.questionHash))?.toLowerCase();
  const side = leanYes(pick);
  const matching = transaction.staked.filter(
    (event) =>
      event.poolId.toLowerCase() === poolId &&
      event.side === side &&
      event.pickHash === pick.hash.toLowerCase() &&
      event.staker.toLowerCase() === event.sender.toLowerCase() &&
      event.amount > 0n,
  );
  if (!poolId || matching.length === 0) return refuse(400, "stake_mismatch");
  const sender = matching[0].staker.toLowerCase();
  const amount = matching.filter((event) => event.staker.toLowerCase() === sender).reduce((sum, event) => sum + event.amount, 0n);

  const addressKey = addressIndexKey(sender, poolId);
  const previous = await env.SOOTHIA_CACHE.get<AddressIndexValue>(addressKey, "json");
  if (previous?.digests.includes(digest as string)) return json(context.request, { ok: true, duplicate: true, poolId, digest });

  const stake: StakeRecord = {
    pickId: pick.id,
    poolId,
    questionHash: identity.questionHash,
    side: (side ? "YES" : "NO") as Side,
    amountMist: amount.toString(),
    digest: digest as string,
    at: new Date(context.nowMs).toISOString(),
    sender,
    about: describeStake(pick.fixture),
  };
  // Walrus first: if this fails nothing is marked done, and a retry is safe.
  await context.store(userKey).write("stake", stake);

  const metadata: AddressIndexMeta = {
    pickId: pick.id,
    home: pick.fixture.home.slice(0, 100),
    away: pick.fixture.away.slice(0, 100),
    startISO: pick.fixture.startISO,
    subject: pick.fixture.subject,
  };
  const indexed = await kvPut(env, addressKey, JSON.stringify({ digests: [...(previous?.digests ?? []), digest] }), { metadata });
  // Pools are indexed when created. This covers a create whose index write failed.
  if ((await env.SOOTHIA_CACHE.get(poolIndexKey(poolId))) === null) {
    const pool = await chain.readPool(poolId);
    await writePoolIndex(env, indexEntry(poolId, identity.questionHash, pick), { phase: "open", dueMs: Number(pool.closeMs + pool.minResolveDelayMs) });
  }
  await forgetPool(identity.questionHash);
  await linkWallet(context, userKey, sender);
  await pushStakeToFeed(env, userKey, pick, amount);
  return json(context.request, { ok: true, duplicate: false, indexed, stake });
}

async function positionsRoute(context: Context): Promise<Response> {
  const { env, chain, nowMs } = context;
  const address = parseAddress(new URL(context.request.url).searchParams.get("address"), "invalid_address");
  const prefix = `${STAKE_ADDRESS_PREFIX}${address}:`;
  const listed = await env.SOOTHIA_CACHE.list<AddressIndexMeta>({ prefix, limit: 1000 });
  const keys = listed.keys
    .filter((key) => key.metadata)
    .sort((a, b) => b.metadata!.startISO.localeCompare(a.metadata!.startISO));

  const positions = [];
  for (const key of keys.slice(0, MAX_POSITIONS)) {
    const poolId = key.name.slice(prefix.length);
    const pool = await chain.readPool(poolId);
    const position = await chain.readPosition(pool, address);
    if (!position) continue;
    const { home, away, startISO, subject, pickId } = key.metadata!;
    positions.push({
      poolId,
      pickId,
      match: { home, away, startISO, subject },
      side: position.side ? "YES" : "NO",
      ...viewPosition(pool, position, nowMs),
    });
  }
  return json(context.request, { positions, truncated: keys.length > MAX_POSITIONS });
}

async function balanceRoute(context: Context): Promise<Response> {
  const address = parseAddress(new URL(context.request.url).searchParams.get("address"), "invalid_address");
  return json(context.request, { address, balanceMist: (await context.chain.balanceOf(address)).toString() });
}

async function claimBuildRoute(context: Context): Promise<Response> {
  const { chain, settings, nowMs } = context;
  const body = (await readJsonObject(context.request)) ?? refuse(400, "invalid_body");
  const poolId = parseAddress(body.poolId, "invalid_pool_id");
  const sender = parseAddress(body.sender, "invalid_sender");
  const pool = await chain.readPool(poolId).catch((error) => {
    if (/not_a_stake_pool|not.?found|does not exist/i.test(String((error as Error)?.message))) refuse(404, "pool_not_found");
    throw error;
  });
  const position = await chain.readPosition(pool, sender);
  if (!position) return refuse(404, "no_position");

  const view = viewPosition(pool, position, nowMs);
  if (view.status !== "claimable" && view.status !== "refundable") {
    refuse(409, "not_claimable", { status: view.status, claimOpensAtMs: view.claimOpensAtMs });
  }
  const txBytes = await chain.buildForSender(buildClaim(settings, { poolId }), sender, CLAIM_GAS_BUDGET);
  return json(context.request, { txBytes, summary: { poolId, status: view.status, amountMist: view.estimatedPayoutMist } });
}

async function adminPendingRoute(context: Context): Promise<Response> {
  const { env, chain, nowMs } = context;
  const listed = await env.SOOTHIA_CACHE.list<PoolIndexMeta>({ prefix: STAKE_POOL_PREFIX, limit: 1000 });
  const windows = listed.keys.filter((key) => key.metadata?.phase === "resolved" && key.metadata.dueMs > nowMs).slice(0, MAX_PENDING);

  const pending = [];
  for (const key of windows) {
    const poolId = key.name.slice(STAKE_POOL_PREFIX.length);
    const [entry, pool] = await Promise.all([env.SOOTHIA_CACHE.get<PoolIndexEntry>(key.name, "json"), chain.readPool(poolId)]);
    if (!inChallengeWindow(pool, BigInt(nowMs))) continue;
    const opens = Number(claimOpensAtMs(pool));
    pending.push({
      poolId,
      match: entry ? { home: entry.home, away: entry.away, startISO: entry.startISO, subject: entry.subject } : null,
      evidence: pool.evidence,
      outcome: pool.outcomeYes ? "YES" : "NO",
      yesTotal: pool.yesTotal.toString(),
      noTotal: pool.noTotal.toString(),
      feeMist: pool.feeAmount.toString(),
      claimOpensAtMs: opens,
      timeLeftMs: opens - nowMs,
    });
  }
  const recentActions = (await env.SOOTHIA_CACHE.get(STAKE_LOG_KEY, "json")) ?? [];
  return json(context.request, { pending, recentActions });
}

const USER_ROUTES = ["POST /stake/pool", "POST /stake/build", "POST /stake/confirm", "GET /stake/positions", "GET /stake/balance", "POST /stake/claim/build"];

/** Answers a /stake/* request. */
export async function stakeRoute(request: Request, env: Env, path: string, deps: StakeDeps = {}): Promise<Response> {
  try {
    const route = `${request.method} ${path}`;
    const adminRoute = route === "GET /stake/admin/pending" ? adminPendingRoute : (ADMIN_ROUTES[route] ?? DRILL_ROUTES[route]);
    const admin = adminRoute !== undefined;
    // Without the admin header these paths do not exist.
    if (admin ? !isAdmin(request, env) : !USER_ROUTES.includes(route)) return json(request, { error: "not_found" }, 404);

    const user = admin ? "" : await identify(request);
    if (typeof user !== "string") return user;

    const settings = deps.settings ?? stakeSettings(env);
    if (!settings) return json(request, { error: "stake_not_configured" }, 503);
    const context: Context = {
      request,
      env,
      settings,
      chain: deps.chain ?? tatumStakeChain(env, settings),
      fetcher: deps.fetcher ?? fetchScoreboard,
      nowMs: deps.now?.() ?? Date.now(),
      store: (userKey) => deps.store ?? storeFor(env, userKey),
    };

    if (adminRoute) return await adminRoute(context);

    switch (route) {
      case "POST /stake/pool":
        return await poolRoute(context);
      case "POST /stake/build":
        return await buildRoute(context, user);
      case "POST /stake/confirm":
        return await confirmRoute(context, user);
      case "GET /stake/positions":
        return await positionsRoute(context);
      case "GET /stake/balance":
        return await balanceRoute(context);
      default:
        return await claimBuildRoute(context);
    }
  } catch (error) {
    if (error instanceof StakeRefusal) return json(request, { error: error.code, ...error.extra }, error.status);
    console.warn(`Soothia: ${request.method} ${path} failed: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
    return json(request, { error: "stake_unavailable" }, 502);
  }
}
