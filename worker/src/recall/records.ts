// Total Recall: the shapes Soothia writes to Walrus Memory, and how they are
// written. Every memory is two parts: a plain sentence first (that is what
// Walrus Memory embeds, so semantic recall finds "my Arsenal calls") and a
// tagged JSON line after it, so the Worker can read the record back exactly.
//
// Each install gets its own set of namespaces, one per kind, so "all my picks"
// is a single recall against one namespace rather than a filter over everyone.

export type RecordKind = "pick" | "outcome" | "lesson" | "pref";
export const RECORD_KINDS: readonly RecordKind[] = ["pick", "outcome", "lesson", "pref"];

export type Side = "YES" | "NO";

/** A sports fixture a pick is about, with which team the question backs. */
export interface PickFixture {
  home: string;
  away: string;
  competition?: string;
  startISO: string;
  /** The team the question asks about ("Will <subject> beat ..."). */
  subject: "home" | "away";
}

/** The user's call on a claim, written before the event. */
export interface PickRecord {
  id: string;
  at: string;
  question: string;
  category: string;
  /** The user's probability that the question resolves YES, 0.01 to 0.99. */
  pYes: number;
  /** The market's YES price when the call was made, if Soothia had one. */
  marketYes: number | null;
  /** Teams, tickers or names the claim is about; used to group the record. */
  entities: string[];
  endTime: string;
  source: { site: string; url: string };
  fixture?: PickFixture;
  /** Panta market the claim matched, when it resolves through Panta. */
  marketId?: string;
  /** The latest Sui mainnet checkpoint seen when the call was made. */
  anchor?: { checkpoint: string; timestampMs: number; via: "tatum-sui-mainnet" };
  /** SHA-256 of the canonical pick, committed on Sui before the event. */
  hash: string;
  /** The Sui transaction that committed the hash, if the commit went through. */
  commit: { digest: string; network: "mainnet" } | null;
}

/** What happened, and how the call scored. */
export interface OutcomeRecord {
  pickId: string;
  at: string;
  question: string;
  category: string;
  entities: string[];
  result: Side;
  pYes: number;
  marketYes: number | null;
  /** (pYes - result)^2: 0 is perfect, 0.25 is a coin flip, 1 is maximally wrong. */
  brier: number;
  /** The same score for the market price at the time, when there was one. */
  marketBrier: number | null;
  /** The side the user leaned (pYes >= 0.5 means YES) matched the result. */
  hit: boolean;
  /** "Arsenal 2-0 Hull City (ESPN, full time)". */
  detail: string;
  /** Favourite means the user's lean was at 60% or more. */
  favourite: boolean;
}

export type LessonKey = "calibration" | "favourites" | "vs_market" | `entity:${string}` | `category:${string}`;

/** A pattern Soothia has learned about the user's calls. */
export interface LessonRecord {
  key: LessonKey;
  at: string;
  text: string;
  /** How many resolved calls the lesson rests on. */
  n: number;
  /** Signed bias in probability points where it applies (+ means too high on YES). */
  bias?: number;
  entity?: string;
}

export type PrefKind = "quiet_site" | "unquiet_site";

export interface PrefRecord {
  kind: PrefKind;
  at: string;
  site: string;
}

export interface RecordByKind {
  pick: PickRecord;
  outcome: OutcomeRecord;
  lesson: LessonRecord;
  pref: PrefRecord;
}

const TAG = /⟦soothia:(pick|outcome|lesson|pref):v1 (\{[\s\S]*\})⟧\s*$/;

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

/** The sentence Walrus Memory embeds for a record. Readable on its own. */
export function sentenceFor<K extends RecordKind>(kind: K, record: RecordByKind[K]): string {
  switch (kind) {
    case "pick": {
      const pick = record as PickRecord;
      const lean = pick.pYes >= 0.5 ? `YES at ${pct(pick.pYes)}` : `NO at ${pct(1 - pick.pYes)}`;
      const market = pick.marketYes === null ? "" : ` The market had YES at ${pct(pick.marketYes)}.`;
      const about = pick.entities.length ? ` About ${pick.entities.join(", ")}.` : "";
      return `Call: ${lean} on "${pick.question}" (${pick.category}).${about}${market} Read on ${pick.source.site}.`;
    }
    case "outcome": {
      const outcome = record as OutcomeRecord;
      const verdict = outcome.hit ? "Called it right" : "Called it wrong";
      return `${verdict}: "${outcome.question}" resolved ${outcome.result}. ${outcome.detail}. My YES was ${pct(outcome.pYes)}, Brier ${outcome.brier.toFixed(3)}.`;
    }
    case "lesson":
      return `Lesson about my calls: ${(record as LessonRecord).text}`;
    case "pref": {
      const pref = record as PrefRecord;
      return pref.kind === "quiet_site"
        ? `Preference: stay quiet on ${pref.site}.`
        : `Preference: show calls on ${pref.site} again.`;
    }
    default:
      return "";
  }
}

/** Full memory text: the sentence, then the tagged record on its own line. */
export function encodeRecord<K extends RecordKind>(kind: K, record: RecordByKind[K]): string {
  return `${sentenceFor(kind, record)}\n⟦soothia:${kind}:v1 ${JSON.stringify(record)}⟧`;
}

/** Reads a record back from memory text, or null if it is not one of ours. */
export function decodeRecord<K extends RecordKind>(kind: K, text: string): RecordByKind[K] | null {
  const match = TAG.exec(text);
  if (!match || match[1] !== kind) return null;
  try {
    const parsed: unknown = JSON.parse(match[2]);
    return typeof parsed === "object" && parsed !== null ? (parsed as RecordByKind[K]) : null;
  } catch {
    return null;
  }
}

/** One namespace per install and kind: soothia-<16 hex>-<kind>. */
export function namespaceFor(userKey: string, kind: RecordKind): string {
  return `soothia-${userKey}-${kind}`;
}

/** The fields a pick's hash covers, in a fixed order, so anyone can recompute it. */
export function canonicalPick(pick: Omit<PickRecord, "hash" | "commit">): string {
  return JSON.stringify({
    v: 1,
    id: pick.id,
    at: pick.at,
    question: pick.question,
    pYes: pick.pYes,
    marketYes: pick.marketYes,
    endTime: pick.endTime,
    fixture: pick.fixture
      ? {
          home: pick.fixture.home,
          away: pick.fixture.away,
          startISO: pick.fixture.startISO,
          subject: pick.fixture.subject,
        }
      : null,
    marketId: pick.marketId ?? null,
    anchor: pick.anchor
      ? { checkpoint: pick.anchor.checkpoint, timestampMs: pick.anchor.timestampMs, via: pick.anchor.via }
      : null,
  });
}

/** Normalised names for grouping: lower case, no accents, no "FC"/"AFC". */
export function entityKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(a?fc|cf|sc|the)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
