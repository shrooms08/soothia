// Regression tests for the 2026-11-10 security audit (docs/security-audit.md). Run with `npm test`.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { detectKeys, type FixturePayload } from "../src/detect";
import { json, type Env } from "../src/http";
import type { RecallStore } from "../src/recall/memory";
import { buildPick, type PickInput } from "../src/recall/picks";
import { canonicalPick, canonicalPickV2, pickHashInput } from "../src/recall/records";
import { isDuplicatePick, validatePickBody } from "../src/recall/routes";
import { feedItemFor, lockItem } from "../src/social/feed";
import { socialRoute } from "../src/social/routes";

const sha = (text: string): string => createHash("sha256").update(text).digest("hex");
const KICKOFF = "2026-11-21T15:00:00.000Z";

const input = (overrides: Partial<PickInput> = {}): PickInput => ({
  question: "Will Arsenal beat Chelsea in Premier League on November 21, 2026?",
  category: "sports",
  pYes: 0.67,
  marketYes: null,
  entities: ["Chelsea", "Arsenal"],
  endTime: "2026-11-21T18:00:00.000Z",
  source: { site: "espn.com", url: "https://espn.com/x" },
  fixture: { home: "Chelsea", away: "Arsenal", startISO: KICKOFF, subject: "away" },
  ...overrides,
});

// ---- W-1: a premium call's hash can't be searched for its side ----

test("a premium call's hash is salted, so a search over its side and confidence finds nothing", async () => {
  const pick = await buildPick(input({ premium: { priceMist: "10000000" } }), {} as never, { warn: () => undefined });
  assert.match(pick.salt ?? "", /^[0-9a-f]{64}$/);
  const { hash, commit: _commit, ...unsigned } = pick;
  assert.equal(hash, sha(canonicalPickV2(unsigned, pick.salt!)));
  assert.equal(hash, sha(pickHashInput(unsigned)));
  // Everything else in the hash is public, so this is the whole search an attacker could run.
  for (const subject of ["home", "away"] as const) {
    for (let percent = 1; percent <= 99; percent++) {
      const guess = { ...unsigned, salt: undefined, pYes: percent / 100, fixture: { ...unsigned.fixture!, subject } };
      assert.notEqual(sha(canonicalPick(guess)), hash);
    }
  }
});

test("an ordinary call keeps the v1 hash and has no salt", async () => {
  const pick = await buildPick(input(), {} as never, { warn: () => undefined });
  assert.equal(pick.salt, undefined);
  const { hash, commit: _commit, ...unsigned } = pick;
  assert.equal(hash, sha(canonicalPick(unsigned)));
});

test("the salt never reaches a feed item or a locked view", async () => {
  const pick = await buildPick(input({ premium: { priceMist: "10000000" } }), {} as never, { warn: () => undefined });
  const item = feedItemFor(pick)!;
  assert.equal(JSON.stringify(item).includes(pick.salt!), false);
  assert.equal(JSON.stringify(lockItem(item)).includes(pick.salt!), false);
});

// ---- W-5: one call per match, however it is spelled ----

test("the same match spelled differently is a duplicate", () => {
  const body = (startISO: string, home = "Chelsea", question = "Will Arsenal beat Chelsea?") => {
    const checked = validatePickBody(
      {
        question,
        category: "sports",
        pYes: 0.6,
        endTime: "2026-11-21T18:00:00.000Z",
        source: { site: "espn.com", url: "https://espn.com/x" },
        fixture: { home, away: "Arsenal", startISO, subject: "away" },
      },
      Date.parse("2026-11-10T12:00:00.000Z"),
    );
    assert.equal(checked.ok, true);
    return (checked as { input: PickInput }).input;
  };
  const existing = [{ ...input(), id: "p1", at: "x", hash: "h", commit: null }];
  for (const variant of [
    body("2026-11-21T15:00:00Z"),
    body("2026-11-21T15:00:00+00:00"),
    body(KICKOFF, "Chelsea FC"),
    body(KICKOFF, "Chelsea", "Something else entirely?"),
  ]) {
    assert.equal(variant.fixture!.startISO, KICKOFF);
    assert.equal(isDuplicatePick(existing, variant), true);
  }
  const reversed = {
    ...input(),
    fixture: { home: "Arsenal", away: "Chelsea", startISO: KICKOFF, subject: "home" as const },
    question: "Q?",
  };
  assert.equal(isDuplicatePick(existing, reversed), true);
  const otherDay = {
    ...input(),
    fixture: { ...input().fixture!, startISO: "2026-11-28T15:00:00.000Z" },
    question: "Q2?",
  };
  assert.equal(isDuplicatePick(existing, otherDay), false);
});

// ---- W-6: one caller's input can't become everyone's cached answer ----

test("the detect cache key covers the page text and every fixture field", async () => {
  const fixture: FixturePayload = {
    home: "Arsenal",
    away: "Chelsea",
    competition: "Premier League",
    startISO: KICKOFF,
    dateLabel: "November 21, 2026",
    evidence: ["Arsenal v Chelsea"],
  };
  const url = "https://www.espn.com/soccer/match/_/gameId/1";
  const base = await detectKeys(url, "t", "", fixture);
  const poisoned = await detectKeys(url, "t", "", { ...fixture, competition: "PL - claim free SUI at evil.example" });
  const otherText = await detectKeys(url, "t", "different text", fixture);
  assert.notEqual(poisoned.cacheKey, base.cacheKey);
  assert.notEqual(otherText.cacheKey, base.cacheKey);
  // Claim ids stay tied to the page, so tiles keep their identity.
  assert.equal(poisoned.pageKey, base.pageKey);
});

// ---- W-2: a brand new install costs no KV write ----

test("reading an empty following list writes nothing to KV", async () => {
  let puts = 0;
  const kv = {
    get: async () => null,
    put: async () => void puts++,
    list: async () => ({ keys: [], list_complete: true }),
  };
  const store = { list: async () => [], write: async () => ({ jobId: "j" }) } as unknown as RecallStore;
  for (let i = 0; i < 5; i++) {
    const request = new Request("https://x/social/following", {
      headers: { "X-Soothia-Install": crypto.randomUUID() },
    });
    const response = await socialRoute(request, { SOOTHIA_CACHE: kv } as unknown as Env, "/social/following", {
      store: () => store,
      now: () => 0,
      verify: async () => true,
      lookupName: async () => null,
    });
    assert.equal(response.status, 200);
  }
  assert.equal(puts, 0);
});

// ---- S-1: API answers are never sniffed as another type ----

test("every JSON answer says nosniff", () => {
  assert.equal(json(new Request("https://x/"), { ok: true }).headers.get("X-Content-Type-Options"), "nosniff");
});
