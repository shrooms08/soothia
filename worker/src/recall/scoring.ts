// Total Recall: turning remembered calls into a record, lessons and nudges.
// Pure functions over records read from Walrus Memory; no I/O here, so the
// whole learning loop is unit-tested without a relayer.

import { teamKey } from "./espn";
import {
  entityKey,
  type LessonRecord,
  type OutcomeRecord,
  type PickRecord,
  type PrefRecord,
  type SitePref,
  type Side,
  type StakeRecord,
  type UnlockRecord,
} from "./records";

/** Brier score for one probability against what happened. */
export function brier(pYes: number, result: Side): number {
  const actual = result === "YES" ? 1 : 0;
  return Math.round((pYes - actual) ** 2 * 10_000) / 10_000;
}

export function scoreOutcome(pick: PickRecord, result: Side, detail: string, at: string): OutcomeRecord {
  const lean: Side = pick.pYes >= 0.5 ? "YES" : "NO";
  const confidence = Math.max(pick.pYes, 1 - pick.pYes);
  return {
    pickId: pick.id,
    at,
    question: pick.question,
    category: pick.category,
    entities: pick.entities,
    result,
    pYes: pick.pYes,
    marketYes: pick.marketYes,
    brier: brier(pick.pYes, result),
    marketBrier: pick.marketYes === null ? null : brier(pick.marketYes, result),
    hit: lean === result,
    detail,
    favourite: confidence >= 0.6,
  };
}

const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / (values.length || 1);
const round = (value: number, places = 3): number => Math.round(value * 10 ** places) / 10 ** places;

/** Newest record per key wins (Walrus Memory is append-only). */
export function latestBy<T extends { at: string }>(records: T[], key: (record: T) => string): Map<string, T> {
  const out = new Map<string, T>();
  for (const record of [...records].sort((a, b) => a.at.localeCompare(b.at))) out.set(key(record), record);
  return out;
}

export interface EntityLine {
  entity: string;
  calls: number;
  hits: number;
  brier: number;
}

export interface CalibrationBucket {
  /** "50-59%", by the confidence of the lean. */
  label: string;
  calls: number;
  /** How often calls at this confidence were right. */
  hitRate: number;
  /** The confidence those calls claimed, on average. */
  claimed: number;
}

export interface RecordSummary {
  picks: number;
  open: number;
  resolved: number;
  hits: number;
  brier: number | null;
  /** The market's Brier on the same calls, where Soothia saw a price. */
  marketBrier: number | null;
  /** Calls scored against a market price, the base for marketBrier. */
  vsMarketCalls: number;
  calibration: CalibrationBucket[];
  entities: EntityLine[];
}

export function summarize(picks: PickRecord[], outcomes: OutcomeRecord[]): RecordSummary {
  const uniquePicks = latestBy(picks, (pick) => pick.id);
  const scored = [...latestBy(outcomes, (outcome) => outcome.pickId).values()];
  const resolvedIds = new Set(scored.map((outcome) => outcome.pickId));
  const vsMarket = scored.filter((outcome) => outcome.marketBrier !== null);

  const buckets: CalibrationBucket[] = [];
  for (const [low, high] of [
    [0.5, 0.6],
    [0.6, 0.7],
    [0.7, 0.8],
    [0.8, 1.01],
  ]) {
    const inBucket = scored.filter((outcome) => {
      const confidence = Math.max(outcome.pYes, 1 - outcome.pYes);
      return confidence >= low && confidence < high;
    });
    if (inBucket.length === 0) continue;
    buckets.push({
      label: high > 1 ? `${low * 100}%+` : `${low * 100}-${high * 100 - 1}%`,
      calls: inBucket.length,
      hitRate: round(inBucket.filter((outcome) => outcome.hit).length / inBucket.length, 2),
      claimed: round(mean(inBucket.map((outcome) => Math.max(outcome.pYes, 1 - outcome.pYes))), 2),
    });
  }

  const byEntity = new Map<string, { name: string; list: OutcomeRecord[] }>();
  for (const outcome of scored) {
    for (const name of outcome.entities) {
      const key = entityKey(name);
      if (!key) continue;
      const line = byEntity.get(key) ?? { name, list: [] };
      line.list.push(outcome);
      byEntity.set(key, line);
    }
  }
  const entities = [...byEntity.values()]
    .map(({ name, list }) => ({
      entity: name,
      calls: list.length,
      hits: list.filter((outcome) => outcome.hit).length,
      brier: round(mean(list.map((outcome) => outcome.brier))),
    }))
    .sort((a, b) => b.calls - a.calls || a.entity.localeCompare(b.entity));

  return {
    picks: uniquePicks.size,
    open: [...uniquePicks.keys()].filter((id) => !resolvedIds.has(id)).length,
    resolved: scored.length,
    hits: scored.filter((outcome) => outcome.hit).length,
    brier: scored.length ? round(mean(scored.map((outcome) => outcome.brier))) : null,
    marketBrier: vsMarket.length ? round(mean(vsMarket.map((outcome) => outcome.marketBrier as number))) : null,
    vsMarketCalls: vsMarket.length,
    calibration: buckets,
    entities,
  };
}

/** Lessons need this many resolved calls behind them before Soothia says anything. */
export const LESSON_MIN_CALLS = 3;
const BIAS_THRESHOLD = 0.08;

function signedPoints(value: number): string {
  const points = Math.round(Math.abs(value) * 100);
  return `${points} point${points === 1 ? "" : "s"}`;
}

export interface LessonContext {
  picks: PickRecord[];
  stakes: StakeRecord[];
  unlocks?: UnlockRecord[];
}

const hitPercent = (list: { hit?: boolean }[]): number =>
  Math.round((list.filter((outcome) => outcome.hit).length / list.length) * 100);

/** What staking and following teach, each needing enough calls on both sides. */
export function stakingAndSocialLessons(
  scored: OutcomeRecord[],
  { picks, stakes, unlocks }: LessonContext,
  at: string,
): LessonRecord[] {
  const lessons: LessonRecord[] = [];
  const staked = new Map<string, bigint>();
  const counted = new Set<string>();
  for (const stake of stakes) {
    if (counted.has(stake.digest)) continue;
    counted.add(stake.digest);
    staked.set(stake.pickId, (staked.get(stake.pickId) ?? 0n) + BigInt(stake.amountMist));
  }

  const withStake = scored.filter((outcome) => staked.has(outcome.pickId));
  const free = scored.filter((outcome) => !staked.has(outcome.pickId));
  if (withStake.length >= LESSON_MIN_CALLS && free.length >= LESSON_MIN_CALLS) {
    lessons.push({
      key: "stakes",
      at,
      n: scored.length,
      text: `Your staked calls land ${hitPercent(withStake)}%, free ones ${hitPercent(free)}%.`,
    });
  }

  if (withStake.length > 0) {
    const sizes = withStake
      .map((outcome) => staked.get(outcome.pickId) as bigint)
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const middle = Math.floor(sizes.length / 2);
    const median = sizes.length % 2 === 1 ? sizes[middle] * 2n : sizes[middle - 1] + sizes[middle];
    // Doubled on both sides, so an even count's midpoint needs no rounding.
    const bigger = withStake.filter((outcome) => (staked.get(outcome.pickId) as bigint) * 2n > median);
    const smaller = withStake.filter((outcome) => (staked.get(outcome.pickId) as bigint) * 2n < median);
    if (bigger.length >= LESSON_MIN_CALLS && smaller.length >= LESSON_MIN_CALLS) {
      const big = hitPercent(bigger);
      const small = hitPercent(smaller);
      const verdict =
        big > small
          ? "You size up well."
          : big < small
            ? "You size up on the wrong calls."
            : "Stake size makes no difference to your calls.";
      lessons.push({
        key: "stake_size",
        at,
        n: bigger.length + smaller.length,
        text: `Your bigger stakes land ${big}%, your smaller ones ${small}%. ${verdict}`,
      });
    }
  }

  const byPick = new Map(picks.map((pick) => [pick.id, pick]));
  const tails = new Map<string, OutcomeRecord[]>();
  const against: OutcomeRecord[] = [];
  for (const outcome of scored) {
    const pick = byPick.get(outcome.pickId);
    if (pick?.tailOf && !pick.tailFlipped) tails.set(pick.tailOf, [...(tails.get(pick.tailOf) ?? []), outcome]);
    if (pick?.followedConsensus === "against") against.push(outcome);
  }
  for (const [handle, list] of tails) {
    if (list.length < LESSON_MIN_CALLS) continue;
    lessons.push({
      key: `tail:${handle}`,
      at,
      n: list.length,
      text: `Tailing @${handle}: ${list.filter((outcome) => outcome.hit).length} of ${list.length} right`,
    });
  }
  if (against.length >= LESSON_MIN_CALLS) {
    lessons.push({
      key: "consensus",
      at,
      n: against.length,
      text: `When you go against the people you follow, you're right ${hitPercent(against)}%.`,
    });
  }

  const bought = (unlocks ?? []).filter((unlock) => unlock.hit !== undefined);
  if (bought.length >= LESSON_MIN_CALLS && scored.length > 0) {
    lessons.push({
      key: "premium",
      at,
      n: bought.length,
      text: `Premium calls you bought hit ${hitPercent(bought)}%, your own calls ${hitPercent(scored)}%.`,
    });
  }
  return lessons;
}

/**
 * The patterns worth telling the user about, from resolved calls only.
 * Each has a stable key so a newer lesson replaces an older one.
 */
export function deriveLessons(outcomes: OutcomeRecord[], at: string, context?: LessonContext): LessonRecord[] {
  const scored = [...latestBy(outcomes, (outcome) => outcome.pickId).values()];
  const lessons: LessonRecord[] = [];
  if (scored.length < LESSON_MIN_CALLS) return lessons;
  if (context) lessons.push(...stakingAndSocialLessons(scored, context, at));

  // Calibration: how far the confidence of the lean sits above the hit rate.
  const claimed = mean(scored.map((outcome) => Math.max(outcome.pYes, 1 - outcome.pYes)));
  const hitRate = scored.filter((outcome) => outcome.hit).length / scored.length;
  const gap = claimed - hitRate;
  lessons.push({
    key: "calibration",
    at,
    n: scored.length,
    bias: round(gap, 2),
    text:
      gap > BIAS_THRESHOLD
        ? `You call ${Math.round(claimed * 100)}% on average but land ${Math.round(hitRate * 100)}%: you run ${signedPoints(gap)} overconfident. Shade your calls toward 50%.`
        : gap < -BIAS_THRESHOLD
          ? `You land ${Math.round(hitRate * 100)}% of calls while claiming ${Math.round(claimed * 100)}%: you are ${signedPoints(gap)} underconfident. Back yourself more.`
          : `Your confidence matches your hit rate (${Math.round(claimed * 100)}% claimed, ${Math.round(hitRate * 100)}% landed). Keep calling it like this.`,
  });

  // Favourites: strong leans (60%+) specifically.
  const strong = scored.filter((outcome) => outcome.favourite);
  if (strong.length >= LESSON_MIN_CALLS) {
    const strongHit = strong.filter((outcome) => outcome.hit).length / strong.length;
    const strongClaimed = mean(strong.map((outcome) => Math.max(outcome.pYes, 1 - outcome.pYes)));
    const strongGap = strongClaimed - strongHit;
    if (Math.abs(strongGap) > BIAS_THRESHOLD)
      lessons.push({
        key: "favourites",
        at,
        n: strong.length,
        bias: round(strongGap, 2),
        text:
          strongGap > 0
            ? `Your strong calls (60%+) come in ${Math.round(strongHit * 100)}% of the time, ${signedPoints(strongGap)} below what you claim. Favourites have burned you.`
            : `Your strong calls (60%+) come in ${Math.round(strongHit * 100)}% of the time, better than you claim. Your conviction is earned.`,
      });
  }

  // Against the market: only where Soothia saw a price at the time.
  const vsMarket = scored.filter((outcome) => outcome.marketBrier !== null);
  if (vsMarket.length >= LESSON_MIN_CALLS) {
    const edge = mean(vsMarket.map((outcome) => (outcome.marketBrier as number) - outcome.brier));
    lessons.push({
      key: "vs_market",
      at,
      n: vsMarket.length,
      bias: round(edge, 3),
      text:
        edge > 0.01
          ? `You have beaten the market price on ${vsMarket.length} calls (Brier ${round(edge, 3)} better). Your edge is real so far.`
          : edge < -0.01
            ? `The market price has beaten you on ${vsMarket.length} calls (Brier ${round(-edge, 3)} worse). When you disagree with the odds, think twice.`
            : `You and the market have scored about the same on ${vsMarket.length} calls.`,
    });
  }

  // Teams and names: where the user is clearly better or worse than usual.
  const overall = mean(scored.map((outcome) => outcome.brier));
  const byEntity = new Map<string, { name: string; list: OutcomeRecord[] }>();
  for (const outcome of scored)
    for (const name of outcome.entities) {
      const key = entityKey(name);
      if (!key) continue;
      const line = byEntity.get(key) ?? { name, list: [] };
      line.list.push(outcome);
      byEntity.set(key, line);
    }
  for (const [key, { name, list }] of byEntity) {
    if (list.length < LESSON_MIN_CALLS) continue;
    const hits = list.filter((outcome) => outcome.hit).length;
    const entityBrier = mean(list.map((outcome) => outcome.brier));
    // Signed lean on this name: mean of (pYes - actual), + means too high on YES.
    const bias = mean(list.map((outcome) => outcome.pYes - (outcome.result === "YES" ? 1 : 0)));
    if (Math.abs(entityBrier - overall) < 0.05 && Math.abs(bias) < BIAS_THRESHOLD * 2) continue;
    const better = entityBrier < overall;
    lessons.push({
      key: `entity:${key}`,
      at,
      n: list.length,
      bias: round(bias, 2),
      entity: name,
      text: better
        ? `You read ${name} well: ${hits} of ${list.length} right, better than your usual.`
        : bias > 0
          ? `You overrate ${name}: ${hits} of ${list.length} right, and your YES runs ${signedPoints(bias)} high on them.`
          : bias < 0
            ? `You underrate ${name}: ${hits} of ${list.length} right, and they keep doing better than you expect.`
            : `${name} is a blind spot: ${hits} of ${list.length} right.`,
    });
  }
  return lessons;
}

const LESSON_MOVE_POINTS = 5;

const MEANINGS: [RegExp, string][] = [
  [/overconfident/, "over"],
  [/underconfident/, "under"],
  [/matches your hit rate/, "matched"],
  [/conviction is earned/, "earned"],
  [/burned you/, "burned"],
  [/beaten the market/, "ahead"],
  [/market price has beaten/, "behind"],
  [/about the same/, "level"],
  [/You read .+ well/, "better"],
  [/You overrate/, "overrate"],
  [/You underrate/, "underrate"],
  [/blind spot/, "blind_spot"],
  [/Your staked calls land/, "stakes"],
  [/You size up well/, "bigger_better"],
  [/You size up on the wrong calls/, "bigger_worse"],
  [/Stake size makes no difference/, "size_level"],
  [/^Tailing @/, "tail"],
  [/When you go against the people you follow/, "consensus"],
  [/Premium calls you bought/, "premium"],
];

/** What a lesson is saying, apart from its numbers. Read from the text so older lessons compare too. */
export function lessonMeaning(lesson: Pick<LessonRecord, "text">): string {
  return MEANINGS.find(([pattern]) => pattern.test(lesson.text))?.[1] ?? lesson.text;
}

/** A lesson's figures in points: percentages, "x of y right", gaps, or the market edge. */
function lessonFigures(lesson: LessonRecord): number[] {
  if (lesson.key === "vs_market") return lesson.bias === undefined ? [] : [lesson.bias * 100];
  const figures = [...lesson.text.matchAll(/(\d+)%/g)].map((match) => Number(match[1]));
  for (const match of lesson.text.matchAll(/(\d+) of (\d+) right/g))
    figures.push((Number(match[1]) / Number(match[2])) * 100);
  for (const match of lesson.text.matchAll(/(\d+) points?\b/g)) figures.push(Number(match[1]));
  return figures;
}

function lessonChanged(previous: LessonRecord | undefined, fresh: LessonRecord): boolean {
  if (!previous) return true;
  if (lessonMeaning(previous) !== lessonMeaning(fresh)) return true;
  const before = lessonFigures(previous);
  const after = lessonFigures(fresh);
  if (before.length !== after.length) return true;
  return after.some((figure, index) => Math.abs(figure - before[index]) >= LESSON_MOVE_POINTS);
}

/** Only lessons whose meaning changed, or with a figure that moved 5 points, since the last with the same key. */
export function newLessons(previous: LessonRecord[], fresh: LessonRecord[]): LessonRecord[] {
  const latest = latestBy(previous, (lesson) => lesson.key);
  return fresh.filter((lesson) => lessonChanged(latest.get(lesson.key), lesson));
}

/** Sites the user asked Soothia to stay quiet on, newest preference per site winning. */
export function quietSites(prefs: PrefRecord[]): string[] {
  const sitePrefs = prefs.filter((pref): pref is SitePref => pref.kind !== "wallet_link");
  return [...latestBy(sitePrefs, (pref) => pref.site.toLowerCase()).values()]
    .filter((pref) => pref.kind === "quiet_site")
    .map((pref) => pref.site.toLowerCase())
    .sort();
}

export interface ClaimInput {
  id: string;
  question: string;
  category: string;
  entities: string[];
  /** The match on the page, when the claim was built from one. */
  fixture?: { home: string; away: string; startISO: string };
}

/** The user's existing call on this claim's match or question. */
export interface CalledMatch {
  /** "Arsenal win", or "Arsenal doesn't win (Chelsea win or draw)". */
  side: string;
  /** How sure the user was of that side, in percent. */
  confidence: number;
  pickId: string;
  committed: boolean;
  /** The user's probability of YES, which fixes the side they can back. */
  pYes: number;
  /** The match, so the card can look up its staking pool. */
  fixture: { home: string; away: string; startISO: string; subject: "home" | "away" } | null;
}

/** What a call backs. YES on "Will A beat B" is "A win"; NO is "A doesn't win (B win or draw)". */
export function leanSide(pick: Pick<PickRecord, "pYes" | "fixture">): string {
  const yes = pick.pYes >= 0.5;
  if (!pick.fixture) return yes ? "YES" : "NO";
  const backed = pick.fixture[pick.fixture.subject];
  const other = pick.fixture.subject === "home" ? pick.fixture.away : pick.fixture.home;
  return yes ? `${backed} win` : `${backed} doesn't win (${other} win or draw)`;
}

function kickoffDay(startISO: string): string | null {
  const ms = Date.parse(startISO);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString().slice(0, 10);
}

/** The same two teams on the same UTC day, whichever way round they are listed. */
export function sameMatch(
  a: { home: string; away: string; startISO: string },
  b: { home: string; away: string; startISO: string },
): boolean {
  const day = kickoffDay(a.startISO);
  if (day === null || day !== kickoffDay(b.startISO)) return false;
  const [teamA, teamB] = [teamKey(a.home), teamKey(a.away)];
  const [otherA, otherB] = [teamKey(b.home), teamKey(b.away)];
  return (teamA === otherA && teamB === otherB) || (teamA === otherB && teamB === otherA);
}

function isSameCall(claim: Pick<ClaimInput, "question" | "fixture">, pick: PickRecord): boolean {
  if (claim.fixture && pick.fixture && sameMatch(claim.fixture, pick.fixture)) return true;
  return pick.question === claim.question;
}

/** Finds the user's call on a claim in their full pick list. A committed call wins over one that is not. */
export function matchCalled(claim: Pick<ClaimInput, "question" | "fixture">, picks: PickRecord[]): CalledMatch | null {
  const matching = picks.filter((pick) => isSameCall(claim, pick));
  const pick = matching.find((candidate) => candidate.commit) ?? matching[0];
  if (!pick) return null;
  return {
    side: leanSide(pick),
    confidence: Math.round(Math.max(pick.pYes, 1 - pick.pYes) * 100),
    pickId: pick.id,
    committed: pick.commit !== null,
    pYes: pick.pYes,
    fixture: pick.fixture
      ? {
          home: pick.fixture.home,
          away: pick.fixture.away,
          startISO: pick.fixture.startISO,
          subject: pick.fixture.subject,
        }
      : null,
  };
}

/** A semantically close earlier call, found by Walrus Memory recall. */
export interface RelatedHit {
  pick: PickRecord;
  distance: number;
}

export interface ClaimInsight {
  claimId: string;
  /** Higher means more relevant to this user; the card sorts by it. */
  relevance: number;
  /** Short lines for the tile, most useful first. At most three. */
  notes: string[];
  /** The user's existing call on this exact question, if any. */
  existing: { pYes: number; at: string } | null;
  /** The user's call on this match or question, if any. */
  called: CalledMatch | null;
  /** Suggested shading in probability points for the next call (+ raises YES). */
  nudge: number;
}

function pickLine(pick: PickRecord, outcome: OutcomeRecord | undefined): string {
  const lean = pick.pYes >= 0.5 ? `YES ${Math.round(pick.pYes * 100)}%` : `NO ${Math.round((1 - pick.pYes) * 100)}%`;
  const date = new Date(pick.at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  if (!outcome) return `On ${date} you called ${lean} on "${shorten(pick.question)}" (still open).`;
  return `On ${date} you called ${lean} on "${shorten(pick.question)}": ${outcome.hit ? "right" : "wrong"}.`;
}

function shorten(question: string): string {
  const trimmed = question.replace(/^Will /, "").replace(/\?$/, "");
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}

/** How close a recalled memory must be to count as "about the same thing". */
export const RELATED_MAX_DISTANCE = 0.55;

/**
 * What Soothia remembers that bears on each claim on the page. Uses the full
 * record plus semantic hits Walrus Memory returned for each claim's question.
 */
export function insightsFor(
  claims: ClaimInput[],
  memory: {
    picks: PickRecord[];
    outcomes: OutcomeRecord[];
    lessons: LessonRecord[];
    related: Map<string, RelatedHit[]>;
  },
): ClaimInsight[] {
  const picks = [...latestBy(memory.picks, (pick) => pick.id).values()];
  const outcomes = latestBy(memory.outcomes, (outcome) => outcome.pickId);
  const lessons = latestBy(memory.lessons, (lesson) => lesson.key);
  const summary = summarize(memory.picks, memory.outcomes);
  const entityStats = new Map(summary.entities.map((line) => [entityKey(line.entity), line]));
  const followed = new Map<string, number>();
  for (const pick of picks)
    for (const name of pick.entities) followed.set(entityKey(name), (followed.get(entityKey(name)) ?? 0) + 1);
  const categoryCount = new Map<string, number>();
  for (const pick of picks) categoryCount.set(pick.category, (categoryCount.get(pick.category) ?? 0) + 1);

  return claims.map((claim) => {
    const notes: string[] = [];
    let relevance = 0;
    let nudge = 0;
    const keys = claim.entities.map(entityKey).filter(Boolean);

    const existing = picks.find((pick) => pick.question === claim.question) ?? null;
    const called = matchCalled(claim, picks);
    if (called) relevance += 5;

    // Entity lessons first: they are the most specific thing Soothia knows.
    for (const key of keys) {
      const lesson = lessons.get(`entity:${key}`);
      if (lesson) {
        notes.push(lesson.text);
        // The question backs the first entity; shade the opposite of the bias on it.
        if (key === keys[0] && typeof lesson.bias === "number") nudge -= Math.round(lesson.bias * 50);
      }
    }

    for (const key of keys) {
      const line = entityStats.get(key);
      if (line && !lessons.has(`entity:${key}`) && notes.length < 3)
        notes.push(`Your record on ${line.entity}: ${line.hits} of ${line.calls} right.`);
      relevance += (followed.get(key) ?? 0) * 2;
    }

    // The closest earlier call that is not this exact question.
    const related = (memory.related.get(claim.id) ?? [])
      .filter((hit) => hit.distance < RELATED_MAX_DISTANCE && !isSameCall(claim, hit.pick))
      .sort((a, b) => a.distance - b.distance)[0];
    if (related && notes.length < 3) {
      notes.push(pickLine(related.pick, outcomes.get(related.pick.id)));
      relevance += 2;
    }

    const calibration = lessons.get("calibration");
    if (calibration && typeof calibration.bias === "number" && Math.abs(calibration.bias) > BIAS_THRESHOLD) {
      if (notes.length < 3)
        notes.push(
          calibration.bias > 0
            ? `You run ${Math.round(calibration.bias * 100)} points overconfident overall.`
            : `You run ${Math.round(-calibration.bias * 100)} points underconfident overall.`,
        );
    }

    relevance += Math.min(categoryCount.get(claim.category) ?? 0, 3);
    return {
      claimId: claim.id,
      relevance,
      notes: notes.slice(0, 3),
      existing: existing ? { pYes: existing.pYes, at: existing.at } : null,
      called,
      nudge: Math.max(-15, Math.min(15, nudge)),
    };
  });
}

/** Overall shading for a slider: overconfident users get pulled toward 50%. */
export function shrinkFactor(lessons: LessonRecord[]): number {
  const calibration = latestBy(lessons, (lesson) => lesson.key).get("calibration");
  if (!calibration || typeof calibration.bias !== "number" || calibration.bias <= BIAS_THRESHOLD) return 1;
  return Math.max(0.6, 1 - calibration.bias);
}
