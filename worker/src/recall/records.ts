// Total Recall: the shapes Soothia writes to Walrus Memory, and how they are
// written. Every memory is two parts: a plain sentence first (that is what
// Walrus Memory embeds, so semantic recall finds "my Arsenal calls") and a
// tagged JSON line after it, so the Worker can read the record back exactly.
//
// Each install gets its own set of namespaces, one per kind, so "all my picks"
// is a single recall against one namespace rather than a filter over everyone.

export type RecordKind = "pick" | "outcome" | "lesson" | "pref" | "stake" | "profile" | "follow" | "unlock";
export const RECORD_KINDS: readonly RecordKind[] = [
  "pick",
  "outcome",
  "lesson",
  "pref",
  "stake",
  "profile",
  "follow",
  "unlock",
];

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

export type CommitSkipReason = "user_cap" | "global_cap" | "low_balance" | "kv_unavailable";

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
  /** Legacy, never set now. Kept because canonicalPick hashes it, so existing commits still verify. */
  marketId?: string;
  /** Anchor: the call was made after this Sui mainnet checkpoint. Says nothing about kickoff. */
  anchor?: { checkpoint: string; timestampMs: number; via: "tatum-sui-mainnet" };
  /** SHA-256 of the canonical pick, committed on Sui before the event. */
  hash: string;
  /** The Sui transaction that committed the hash, if the commit went through. */
  commit: { digest: string; network: "mainnet" } | null;
  /** Why the Worker chose not to commit this pick on Sui. */
  commitSkipped?: CommitSkipReason;
  /** The public handle this call copied, if any. */
  tailOf?: string;
  /** The user chose the opposite side to the one they tailed. */
  tailFlipped?: boolean;
  /** Whether this call matched what the people followed had said when it was made. */
  followedConsensus?: "with" | "against";
  /** Hidden from everyone else until kickoff, and sold for this price. */
  premium?: { priceMist: string };
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

export type LessonKey =
  | "calibration"
  | "favourites"
  | "vs_market"
  | "stakes"
  | "stake_size"
  | "consensus"
  | "premium"
  | `entity:${string}`
  | `category:${string}`
  | `tail:${string}`;

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

export interface SitePref {
  kind: PrefKind;
  at: string;
  site: string;
}

/** Which Sui address belongs to this user. Written once, after their first confirmed stake. */
export interface WalletLinkPref {
  kind: "wallet_link";
  at: string;
  address: string;
}

export type PrefRecord = SitePref | WalletLinkPref;

/** SUI staked behind a call, confirmed from a Staked event on chain. */
export interface StakeRecord {
  pickId: string;
  poolId: string;
  questionHash: string;
  side: Side;
  /** MIST, as a decimal string. */
  amountMist: string;
  digest: string;
  at: string;
  sender: string;
  /** What YES means in words: "Arsenal win vs Newcastle United on 2026-11-21". */
  about: string;
}

/** A public profile. Append-only: the newest one for an address says how it stands now. */
export interface ProfileRecord {
  address: string;
  handle: string;
  publicSince: string;
  /** When true, calls made before publicSince are public too. */
  shareHistory: boolean;
  unpublished?: boolean;
}

/** Following someone, or no longer. The newest record for a handle says which. */
export interface FollowRecord {
  handle: string;
  /** Who is followed. Older records have only the handle. */
  address?: string;
  kind: "follow" | "unfollow";
  at: string;
}

/** A premium call this user paid to see. */
export interface UnlockRecord {
  pickId: string;
  handle: string;
  priceMist: string;
  digest: string;
  at: string;
  fixture: { home: string; away: string; competition: string | null; startISO: string; subject: "home" | "away" };
  side: Side;
  /** Written once the match is over. */
  hit?: boolean;
}

export interface RecordByKind {
  pick: PickRecord;
  outcome: OutcomeRecord;
  lesson: LessonRecord;
  pref: PrefRecord;
  stake: StakeRecord;
  profile: ProfileRecord;
  follow: FollowRecord;
  unlock: UnlockRecord;
}

const TAG = /⟦soothia:(pick|outcome|lesson|pref|stake|profile|follow|unlock):v1 (\{[\s\S]*\})⟧\s*$/;

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

const MIST_PER_SUI = 1_000_000_000n;

/** "1", "0.25": whole MIST, so no rounding. */
function suiAmount(mist: string): string {
  const value = BigInt(mist);
  const fraction = (value % MIST_PER_SUI).toString().padStart(9, "0").replace(/0+$/, "");
  return `${value / MIST_PER_SUI}${fraction ? `.${fraction}` : ""}`;
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
      if (pref.kind === "wallet_link") return `My Sui wallet is ${pref.address}.`;
      return pref.kind === "quiet_site"
        ? `Preference: stay quiet on ${pref.site}.`
        : `Preference: show calls on ${pref.site} again.`;
    }
    case "follow": {
      const follow = record as FollowRecord;
      return follow.kind === "follow"
        ? `I follow @${follow.handle} on Soothia.`
        : `I no longer follow @${follow.handle} on Soothia.`;
    }
    case "unlock": {
      const unlock = record as UnlockRecord;
      return `Unlocked @${unlock.handle}'s premium call on ${unlock.fixture.home} v ${unlock.fixture.away} for ${suiAmount(unlock.priceMist)} SUI.`;
    }
    case "profile": {
      const profile = record as ProfileRecord;
      return profile.unpublished
        ? `My Soothia profile @${profile.handle} is no longer public.`
        : `My public Soothia profile is @${profile.handle}, for ${profile.address}.`;
    }
    case "stake": {
      const stake = record as StakeRecord;
      return `Staked ${suiAmount(stake.amountMist)} SUI ${stake.side === "YES" ? "on" : "against"} ${stake.about}.`;
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
