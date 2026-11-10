// Total Recall: the /recall/* routes the extension calls. A user's memory is
// found by X-Soothia-Recall when sent, so the extension can show a record made
// with the CLI, and otherwise by the install id.

import { installId, isAdmin, json, readJsonObject, type Env } from "../http";
import { recordNewCall } from "../stats";
import { cacheGet, cachePut, kvPut } from "../store";
import { checkCommitGuard } from "./commitGuard";
import { memwalBackend, memwalHealth, RecallStore, userKeyFor } from "./memory";
import { buildPick, mergePicks, type PickInput } from "./picks";
import type { PickFixture, PickRecord, PrefKind } from "./records";
import { resolveUser } from "./resolve";
import { insightsFor, latestBy, quietSites, sameMatch, shrinkFactor, summarize, type RelatedHit } from "./scoring";
import { fetchScoreboard } from "./espn";
import { commitConfigured, latestCheckpoint, memoryAccount, tatumConfigured, verifyCommit } from "./sui";
import { SWEEP_PREFIX } from "./sweep";
import { parseHandle } from "../social/context";
import { applyTail, type TailRequest } from "../social/tail";
import {
  consensusOf,
  feedItemFor,
  followedCallsOn,
  followedStance,
  loadFollowedItems,
  pushPickToFeed,
  visibleToViewer,
  type FeedItem,
} from "../social/feed";
import { parsePriceMist, preparePremium, savePremiumEntry, type Seller } from "../social/premium";
import { callScore } from "../social/stats";
import { stakeSummaries } from "../stake/positions";

const RECALL_API_VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION = 200;
const MAX_INSIGHT_CLAIMS = 3;
const RELATED_LIMIT = 5;
const ENTITY_QUESTION = /^Will (.+?) beat (.+?)(?: in .+?)? on .+\?$/;
const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

export function entitiesFromQuestion(question: string): string[] {
  const match = ENTITY_QUESTION.exec(question);
  return match ? [match[1], match[2]] : [];
}

export function isHostname(site: unknown): site is string {
  return typeof site === "string" && HOSTNAME.test(site);
}

const shortString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.trim().length > 0 && value.length <= max;

function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export type PickValidation =
  { ok: true; input: PickInput; tail?: TailRequest; premiumMist?: bigint } | { ok: false; field: string };

/** Checks a POST /recall/pick body. */
export function validatePickBody(body: Record<string, unknown>, nowMs: number): PickValidation {
  const fail = (field: string): PickValidation => ({ ok: false, field });
  const { question, category, pYes, endTime, fixture, source, tailOf, tailFlip, premium } = body;
  if (!shortString(question, MAX_QUESTION)) return fail("question");
  if (!shortString(category, 40)) return fail("category");
  if (typeof pYes !== "number" || !Number.isFinite(pYes) || pYes < 0.01 || pYes > 0.99) return fail("pYes");
  if (typeof endTime !== "string" || !(Date.parse(endTime) > nowMs)) return fail("endTime");

  const rawSource = source as { site?: unknown; url?: unknown } | null | undefined;
  if (
    typeof rawSource !== "object" ||
    rawSource === null ||
    !shortString(rawSource.site, 100) ||
    !isWebUrl(rawSource.url)
  )
    return fail("source");

  let parsedFixture: PickFixture | undefined;
  if (fixture !== undefined) {
    const raw = fixture as Partial<PickFixture> | null;
    if (typeof raw !== "object" || raw === null || !shortString(raw.home, 100) || !shortString(raw.away, 100))
      return fail("fixture");
    if (raw.subject !== "home" && raw.subject !== "away") return fail("fixture.subject");
    if (typeof raw.startISO !== "string" || !(Date.parse(raw.startISO) > nowMs)) return fail("fixture.startISO");
    if (raw.competition !== undefined && !shortString(raw.competition, 100)) return fail("fixture.competition");
    parsedFixture = {
      home: raw.home,
      away: raw.away,
      // One spelling per moment, so the duplicate check and the hash see the same value.
      startISO: new Date(Date.parse(raw.startISO)).toISOString(),
      subject: raw.subject,
      ...(raw.competition ? { competition: raw.competition } : {}),
    };
  }

  let tail: TailRequest | undefined;
  if (tailOf !== undefined) {
    const handle = parseHandle(tailOf);
    if (!handle) return fail("tailOf");
    tail = { handle, flip: tailFlip === true };
  }

  let premiumMist: bigint | undefined;
  if (premium !== undefined) {
    const price = parsePriceMist((premium as { priceMist?: unknown } | null)?.priceMist);
    if (price === null) return fail("premium");
    premiumMist = price;
  }

  return {
    ok: true,
    ...(premiumMist !== undefined ? { premiumMist } : {}),
    ...(tail ? { tail } : {}),
    input: {
      question: question.trim(),
      category,
      pYes,
      marketYes: null,
      entities: parsedFixture ? [parsedFixture.home, parsedFixture.away] : entitiesFromQuestion(question.trim()),
      endTime,
      source: { site: rawSource.site, url: rawSource.url },
      ...(parsedFixture ? { fixture: parsedFixture } : {}),
    },
  };
}

/** True when the user already has a pick on this question or fixture. */
export function isDuplicatePick(existing: PickRecord[], input: PickInput): boolean {
  // The same match however it is spelled or listed: team aliases, either order, the UTC day.
  return existing.some(
    (pick) =>
      pick.question === input.question ||
      Boolean(pick.fixture && input.fixture && sameMatch(pick.fixture, input.fixture)),
  );
}

export const storeFor = (env: Env, userKey: string, cache = true): RecallStore =>
  new RecallStore(memwalBackend(env), userKey, cache);

/** The user's memory key, or a Response explaining why there is none. */
export async function identify(request: Request): Promise<string | Response> {
  const install = installId(request);
  if (!install) return json(request, { error: "missing_install" }, 400);
  const recallId = request.headers.get("X-Soothia-Recall");
  if (recallId === null) return userKeyFor(install);
  if (!UUID.test(recallId)) return json(request, { error: "invalid_recall_id" }, 400);
  return userKeyFor(recallId);
}

const STATUS_CACHE_KEY = "recall:status";
const STATUS_CACHE_SEC = 30;

/** Cached, because anyone may call it and each call would cost Tatum and Walrus requests. */
async function status(request: Request, env: Env): Promise<Response> {
  const cached = await cacheGet<Record<string, unknown>>(STATUS_CACHE_KEY);
  if (cached) return json(request, cached);
  const [memwal, latest] = await Promise.all([
    memwalHealth(env),
    // A short code only: upstream error text is not for the public.
    latestCheckpoint(env).catch(() => ({ error: "tatum_unavailable" })),
  ]);
  const body = {
    version: RECALL_API_VERSION,
    memwal,
    tatum: { configured: tatumConfigured(env), latest },
    commit: { packageSet: Boolean(env.SOOTHIA_RECALL_PACKAGE?.trim()), ready: commitConfigured(env) },
  };
  await cachePut(STATUS_CACHE_KEY, body, STATUS_CACHE_SEC);
  return json(request, body);
}

async function record(request: Request, env: Env, userKey: string): Promise<Response> {
  const memory = await storeFor(env, userKey).listAll();
  const picks = mergePicks(memory.pick);
  const outcomes = latestBy(memory.outcome, (outcome) => outcome.pickId);
  const stakes = await stakeSummaries(env, memory.stake, Date.now());
  const view = [...picks]
    .sort((a, b) => b.at.localeCompare(a.at))
    .map((pick) => {
      const outcome = outcomes.get(pick.id);
      return {
        id: pick.id,
        at: pick.at,
        question: pick.question,
        category: pick.category,
        pYes: pick.pYes,
        marketYes: pick.marketYes,
        entities: pick.entities,
        endTime: pick.endTime,
        source: pick.source,
        fixture: pick.fixture ?? null,
        status: outcome ? (outcome.hit ? "right" : "wrong") : "open",
        detail: outcome?.detail ?? null,
        brier: outcome?.brier ?? null,
        anchor: pick.anchor ?? null,
        commit: pick.commit
          ? { ...pick.commit, explorerUrl: `https://suivision.xyz/txblock/${pick.commit.digest}` }
          : null,
        commitSkipped: pick.commit ? null : (pick.commitSkipped ?? null),
        stake: stakes.get(pick.id) ?? null,
      };
    });
  const summary = summarize(picks, memory.outcome);
  return json(request, {
    summary: { ...summary, callScore: callScore(summary.brier, summary.resolved) },
    picks: view,
    lessons: [...latestBy(memory.lesson, (lesson) => lesson.key).values()],
    account: await memoryAccount(env).catch(() => null),
  });
}

async function proof(request: Request, env: Env, userKey: string, pickId: string | null): Promise<Response> {
  if (!pickId) return json(request, { error: "missing_pick_id" }, 400);
  const pick = mergePicks(await storeFor(env, userKey).list("pick")).find((candidate) => candidate.id === pickId);
  if (!pick) return json(request, { error: "not_found" }, 404);
  if (!pick.commit) return json(request, { error: "not_committed" }, 404);
  const result = await verifyCommit(env, pick.commit.digest, pick.hash);
  const kickoffMs = pick.fixture ? Date.parse(pick.fixture.startISO) : null;
  const gapMs = kickoffMs !== null && result.timestampMs !== null ? kickoffMs - result.timestampMs : null;
  return json(request, {
    ...result,
    kickoffISO: pick.fixture?.startISO ?? null,
    gapMs,
    beforeKickoff: gapMs === null ? null : gapMs > 0,
  });
}

interface Claim {
  id: string;
  question: string;
  category: string;
  fixture?: { home: string; away: string; startISO: string };
}

export function parseClaims(value: unknown): Claim[] | null {
  if (!Array.isArray(value)) return null;
  const claims: Claim[] = [];
  for (const raw of value.slice(0, MAX_INSIGHT_CLAIMS)) {
    const claim = raw as Partial<Claim> | null;
    if (typeof claim !== "object" || claim === null) return null;
    if (!shortString(claim.id, 100) || !shortString(claim.question, MAX_QUESTION) || !shortString(claim.category, 40))
      return null;
    const fixture = claim.fixture as Partial<NonNullable<Claim["fixture"]>> | null | undefined;
    if (fixture !== undefined && fixture !== null) {
      if (!shortString(fixture.home, 100) || !shortString(fixture.away, 100) || !shortString(fixture.startISO, 40))
        return null;
    }
    claims.push({
      id: claim.id,
      question: claim.question,
      category: claim.category,
      ...(fixture ? { fixture: { home: fixture.home!, away: fixture.away!, startISO: fixture.startISO! } } : {}),
    });
  }
  return claims;
}

async function insights(request: Request, env: Env, userKey: string): Promise<Response> {
  const body = await readJsonObject(request);
  const claims = parseClaims(body?.claims);
  if (!claims) return json(request, { error: "invalid_claims" }, 400);
  const store = storeFor(env, userKey);
  const memory = await store.listAll();
  const related = new Map<string, RelatedHit[]>();
  await Promise.all(
    claims.map(async (claim) => {
      const hits = await store.search("pick", claim.question, RELATED_LIMIT).catch(() => []);
      related.set(
        claim.id,
        hits.map((hit) => ({ pick: hit.record, distance: hit.distance })),
      );
    }),
  );
  const followed = await loadFollowedItems({ env }, userKey)
    .then((items) => visibleToViewer({ env }, userKey, items, Date.now()))
    .catch(() => []);
  const consensusLesson = latestBy(memory.lesson, (lesson) => lesson.key).get("consensus");
  const fixtures = new Map(claims.map((claim) => [claim.id, claim.fixture]));
  return json(request, {
    insights: insightsFor(
      claims.map((claim) => ({ ...claim, entities: entitiesFromQuestion(claim.question) })),
      { picks: mergePicks(memory.pick), outcomes: memory.outcome, lessons: memory.lesson, related },
    ).map((insight) => {
      const fixture = fixtures.get(insight.claimId);
      const followedCalls = fixture ? followedCallsOn(followed, fixture) : [];
      const notes =
        followedCalls.length > 0 && consensusLesson ? [...insight.notes, consensusLesson.text] : insight.notes;
      return { ...insight, notes, followedCalls, consensus: consensusOf(followedCalls) };
    }),
    shrink: shrinkFactor(memory.lesson),
    quietSites: quietSites(memory.pref),
  });
}

async function createPick(request: Request, env: Env, userKey: string): Promise<Response> {
  const body = await readJsonObject(request);
  if (!body) return json(request, { error: "invalid_body" }, 400);
  const checked = validatePickBody(body, Date.now());
  if (!checked.ok) return json(request, { error: "invalid_pick", field: checked.field }, 400);
  const store = storeFor(env, userKey);
  // The cached list folds in recent writes, which the relayer has not stored yet.
  if (isDuplicatePick(mergePicks(await store.list("pick")), checked.input))
    return json(request, { error: "duplicate_pick" }, 409);
  let input = checked.input;
  if (checked.tail) {
    const tailed = await applyTail(env, input, checked.tail, userKey, fetchScoreboard, Date.now());
    if (!tailed.ok) return json(request, { error: tailed.code }, tailed.status);
    input = tailed.input;
  }
  let seller: Seller | null = null;
  if (checked.premiumMist !== undefined) {
    if (checked.tail) return json(request, { error: "premium_tail" }, 400);
    const prepared = await preparePremium(env, userKey, input, checked.premiumMist, fetchScoreboard, Date.now());
    if (!prepared.ok) return json(request, prepared.body, prepared.status);
    input = prepared.input;
    seller = prepared.seller;
  }
  if (input.fixture) {
    // Remembered at lock time, because what they said can change later. Never blocks the call.
    const followed = await loadFollowedItems({ env }, userKey)
      .then((items) => visibleToViewer({ env }, userKey, items, Date.now()))
      .catch(() => []);
    const stance = followedStance(input.fixture, input.pYes, followedCallsOn(followed, input.fixture));
    if (stance) input = { ...input, followedConsensus: stance };
  }
  const pick = await savePick(input, env, userKey, store);
  await pushPickToFeed(env, userKey, pick);
  if (seller) {
    await savePremiumEntry(
      env,
      {
        pickId: pick.id,
        handle: seller.handle,
        payTo: seller.address,
        userKey,
        priceMist: (pick.premium as { priceMist: string }).priceMist,
        kickoffMs: seller.kickoffMs,
        item: feedItemFor(pick) as FeedItem,
      },
      Date.now(),
    );
  }
  return json(request, pick);
}

/** Builds a pick under the spending guard and saves it, committed on Sui or not. */
export async function savePick(input: PickInput, env: Env, userKey: string, store: RecallStore): Promise<PickRecord> {
  const pick = await buildPick(input, env, { guard: () => checkCommitGuard(env, userKey) });
  await store.write("pick", pick);
  // Only a match can be settled, so other calls would sit in the sweep forever.
  if (pick.fixture)
    await kvPut(env, `${SWEEP_PREFIX}${pick.id}`, JSON.stringify({ userKey }), { metadata: { userKey } });
  await recordNewCall(env, userKey, Boolean(pick.commit && pick.fixture));
  return pick;
}

async function createPref(request: Request, env: Env, userKey: string): Promise<Response> {
  const body = await readJsonObject(request);
  const kind = body?.kind;
  if (kind !== "quiet_site" && kind !== "unquiet_site") return json(request, { error: "invalid_kind" }, 400);
  if (!isHostname(body?.site)) return json(request, { error: "invalid_site" }, 400);
  const pref = { kind: kind as PrefKind, at: new Date().toISOString(), site: body.site.toLowerCase() };
  await storeFor(env, userKey).write("pref", pref);
  return json(request, pref);
}

async function resolveRoute(request: Request, env: Env): Promise<Response> {
  if (!isAdmin(request, env)) return json(request, { error: "not_found" }, 404);
  const recallId = (await readJsonObject(request))?.recallId;
  if (typeof recallId !== "string" || !UUID.test(recallId)) return json(request, { error: "invalid_recall_id" }, 400);
  const result = await resolveUser(storeFor(env, await userKeyFor(recallId), false), new Date());
  return json(request, result);
}

/** Answers a /recall/* request. */
export async function recallRoute(request: Request, env: Env, path: string): Promise<Response> {
  try {
    const route = `${request.method} ${path}`;
    if (route === "GET /recall/status") return await status(request, env);
    if (route === "POST /recall/resolve") return await resolveRoute(request, env);

    const known = [
      "GET /recall/record",
      "GET /recall/proof",
      "POST /recall/insights",
      "POST /recall/pick",
      "POST /recall/pref",
    ];
    if (!known.includes(route)) return json(request, { error: "not_found" }, 404);
    const user = await identify(request);
    if (typeof user !== "string") return user;

    switch (route) {
      case "GET /recall/record":
        return await record(request, env, user);
      case "GET /recall/proof":
        return await proof(request, env, user, new URL(request.url).searchParams.get("pickId"));
      case "POST /recall/insights":
        return await insights(request, env, user);
      case "POST /recall/pick":
        return await createPick(request, env, user);
      default:
        return await createPref(request, env, user);
    }
  } catch (error) {
    console.warn(
      `Soothia: ${request.method} ${path} failed: ${String((error as Error)?.message ?? error).slice(0, 300)}`,
    );
    return json(request, { error: "recall_unavailable" }, 502);
  }
}
