// Total Recall: the /recall/* routes the extension calls. A user's memory is
// found by X-Soothia-Recall when sent, so the extension can show a record made
// with the CLI, and otherwise by the install id.

import { installId, isAdmin, json, readJsonObject, type Env } from "../http";
import { recordNewCall } from "../stats";
import { kvPut } from "../store";
import { checkCommitGuard } from "./commitGuard";
import { memwalBackend, memwalHealth, RecallStore, userKeyFor } from "./memory";
import { buildPick, mergePicks, type PickInput } from "./picks";
import type { PickFixture, PickRecord, PrefKind } from "./records";
import { resolveUser } from "./resolve";
import { insightsFor, latestBy, quietSites, shrinkFactor, summarize, type RelatedHit } from "./scoring";
import { commitConfigured, latestCheckpoint, memoryAccount, tatumConfigured, verifyCommit } from "./sui";
import { SWEEP_PREFIX } from "./sweep";
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

const shortString = (value: unknown, max: number): value is string => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function isWebUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export type PickValidation = { ok: true; input: PickInput } | { ok: false; field: string };

/** Checks a POST /recall/pick body. */
export function validatePickBody(body: Record<string, unknown>, nowMs: number): PickValidation {
  const fail = (field: string): PickValidation => ({ ok: false, field });
  const { question, category, pYes, endTime, fixture, source } = body;
  if (!shortString(question, MAX_QUESTION)) return fail("question");
  if (!shortString(category, 40)) return fail("category");
  if (typeof pYes !== "number" || !Number.isFinite(pYes) || pYes < 0.01 || pYes > 0.99) return fail("pYes");
  if (typeof endTime !== "string" || !(Date.parse(endTime) > nowMs)) return fail("endTime");

  const rawSource = source as { site?: unknown; url?: unknown } | null | undefined;
  if (typeof rawSource !== "object" || rawSource === null || !shortString(rawSource.site, 100) || !isWebUrl(rawSource.url)) return fail("source");

  let parsedFixture: PickFixture | undefined;
  if (fixture !== undefined) {
    const raw = fixture as Partial<PickFixture> | null;
    if (typeof raw !== "object" || raw === null || !shortString(raw.home, 100) || !shortString(raw.away, 100)) return fail("fixture");
    if (raw.subject !== "home" && raw.subject !== "away") return fail("fixture.subject");
    if (typeof raw.startISO !== "string" || !(Date.parse(raw.startISO) > nowMs)) return fail("fixture.startISO");
    if (raw.competition !== undefined && !shortString(raw.competition, 100)) return fail("fixture.competition");
    parsedFixture = {
      home: raw.home,
      away: raw.away,
      startISO: raw.startISO,
      subject: raw.subject,
      ...(raw.competition ? { competition: raw.competition } : {}),
    };
  }

  return {
    ok: true,
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
  const key = (fixture: PickFixture): string => `${fixture.home}|${fixture.away}|${fixture.startISO}`;
  return existing.some(
    (pick) => pick.question === input.question || (pick.fixture && input.fixture && key(pick.fixture) === key(input.fixture)),
  );
}

export const storeFor = (env: Env, userKey: string, cache = true): RecallStore => new RecallStore(memwalBackend(env), userKey, cache);

/** The user's memory key, or a Response explaining why there is none. */
export async function identify(request: Request): Promise<string | Response> {
  const install = installId(request);
  if (!install) return json(request, { error: "missing_install" }, 400);
  const recallId = request.headers.get("X-Soothia-Recall");
  if (recallId === null) return userKeyFor(install);
  if (!UUID.test(recallId)) return json(request, { error: "invalid_recall_id" }, 400);
  return userKeyFor(recallId);
}

async function status(request: Request, env: Env): Promise<Response> {
  const [memwal, latest] = await Promise.all([
    memwalHealth(env),
    latestCheckpoint(env).catch((error: Error) => ({ error: String(error?.message ?? error).slice(0, 160) })),
  ]);
  return json(request, {
    version: RECALL_API_VERSION,
    memwal,
    tatum: { configured: tatumConfigured(env), latest },
    commit: { packageSet: Boolean(env.SOOTHIA_RECALL_PACKAGE?.trim()), ready: commitConfigured(env) },
  });
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
        commit: pick.commit ? { ...pick.commit, explorerUrl: `https://suivision.xyz/txblock/${pick.commit.digest}` } : null,
        commitSkipped: pick.commit ? null : (pick.commitSkipped ?? null),
        stake: stakes.get(pick.id) ?? null,
      };
    });
  return json(request, {
    summary: summarize(picks, memory.outcome),
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
  return json(request, { ...result, kickoffISO: pick.fixture?.startISO ?? null, gapMs, beforeKickoff: gapMs === null ? null : gapMs > 0 });
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
    if (!shortString(claim.id, 100) || !shortString(claim.question, MAX_QUESTION) || !shortString(claim.category, 40)) return null;
    const fixture = claim.fixture as Partial<NonNullable<Claim["fixture"]>> | null | undefined;
    if (fixture !== undefined && fixture !== null) {
      if (!shortString(fixture.home, 100) || !shortString(fixture.away, 100) || !shortString(fixture.startISO, 40)) return null;
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
      related.set(claim.id, hits.map((hit) => ({ pick: hit.record, distance: hit.distance })));
    }),
  );
  return json(request, {
    insights: insightsFor(
      claims.map((claim) => ({ ...claim, entities: entitiesFromQuestion(claim.question) })),
      { picks: mergePicks(memory.pick), outcomes: memory.outcome, lessons: memory.lesson, related },
    ),
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
  if (isDuplicatePick(mergePicks(await store.list("pick")), checked.input)) return json(request, { error: "duplicate_pick" }, 409);
  return json(request, await savePick(checked.input, env, userKey, store));
}

/** Builds a pick under the spending guard and saves it, committed on Sui or not. */
export async function savePick(input: PickInput, env: Env, userKey: string, store: RecallStore): Promise<PickRecord> {
  const pick = await buildPick(input, env, { guard: () => checkCommitGuard(env, userKey) });
  await store.write("pick", pick);
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
    console.warn(`Soothia: ${request.method} ${path} failed: ${String((error as Error)?.message ?? error).slice(0, 300)}`);
    return json(request, { error: "recall_unavailable" }, 502);
  }
}
