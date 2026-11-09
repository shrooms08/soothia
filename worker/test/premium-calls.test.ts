// Who may make a premium call, and what others see before kickoff. KV and ESPN are faked.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import type { ScoreboardEvent, ScoreboardFetcher } from "../src/recall/espn";
import type { PickInput } from "../src/recall/picks";
import { validatePickBody } from "../src/recall/routes";
import { clearMemoryCache } from "../src/store";
import { consensusOf, followedCallsOn, isLockedItem, lockItem, visibleToViewer, type FeedItem, type FollowedItem } from "../src/social/feed";
import { isHidden, parsePriceMist, premiumEligibility, preparePremium } from "../src/social/premium";
import { applyTail } from "../src/social/tail";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const AFTER = Date.parse(KICKOFF) + 1;
const ADDRESS = `0x${"a".repeat(64)}`;
const PRICE = { priceMist: "20000000" };

const item = (overrides: Partial<FeedItem> = {}): FeedItem => ({
  pickId: "p1",
  fixture: { home: "Newcastle", away: "Arsenal", competition: "Premier League", startISO: KICKOFF, subject: "away" },
  lean: "Arsenal win",
  side: "YES",
  confidence: 70,
  stakeMist: "1000000000",
  at: "2026-11-09T10:00:00.000Z",
  premium: PRICE,
  proof: { digest: "D1", url: "https://suivision.xyz/txblock/D1" },
  ...overrides,
});

function kvFake() {
  const data = new Map<string, string>();
  const kv = {
    get: async (key: string, type?: string) => {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => void data.set(key, value),
  };
  return { data, env: { SOOTHIA_CACHE: kv } as unknown as Env };
}

function seller(data: Map<string, string>, score = 583, settled = 14): void {
  data.set("profileuser:u1", "ada");
  data.set("profile:ada", JSON.stringify({ handle: "ada", address: ADDRESS, userKey: "u1", publicSince: "2026-01-01T00:00:00.000Z", shareHistory: true }));
  data.set("socialstats:ada", JSON.stringify({ periods: { all: { stats: { score, settled } } } }));
}

const event = (overrides: Partial<ScoreboardEvent> = {}): ScoreboardEvent => ({
  espnId: "1",
  startISO: KICKOFF,
  statusName: "STATUS_SCHEDULED",
  state: "pre",
  completed: false,
  home: { name: "Newcastle United", short: "Newcastle", abbreviation: "NEW", score: null },
  away: { name: "Arsenal", short: "Arsenal", abbreviation: "ARS", score: null },
  competition: "English Premier League",
  url: "",
  ...overrides,
});

const board = (found: ScoreboardEvent): ScoreboardFetcher => async (league) => ({ competition: "", events: league === "eng.1" ? [found] : [] });

const input = (overrides: Partial<PickInput> = {}): PickInput => ({
  question: "Will Arsenal beat Newcastle?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: ["Newcastle", "Arsenal"],
  endTime: "2026-11-21T20:00:00.000Z",
  source: { site: "espn.com", url: "https://espn.com/x" },
  // The page's kickoff is wrong on purpose: the reveal must use ESPN's.
  fixture: { home: "Newcastle", away: "Arsenal", startISO: "2026-11-21T20:00:00.000Z", subject: "away" },
  ...overrides,
});

beforeEach(() => clearMemoryCache());

test("a price is 0.01 to 0.5 SUI, as a whole number of MIST", () => {
  assert.equal(parsePriceMist("10000000"), 10_000_000n);
  assert.equal(parsePriceMist(500_000_000), 500_000_000n);
  for (const bad of ["9999999", "500000001", "0", "1.5", -10_000_000, null, undefined, "1e8", {}]) assert.equal(parsePriceMist(bad), null, String(bad));
});

test("the pick body takes a premium price and refuses a bad one", () => {
  const body = { question: "Will Arsenal beat Newcastle?", category: "sports", pYes: 0.7, endTime: "2026-11-21T20:00:00.000Z", source: { site: "espn.com", url: "https://espn.com/x" } };
  const good = validatePickBody({ ...body, premium: { priceMist: "20000000" } }, NOW);
  assert.equal(good.ok && good.premiumMist, 20_000_000n);
  const none = validatePickBody(body, NOW);
  assert.equal(none.ok && none.premiumMist, undefined);
  const bad = validatePickBody({ ...body, premium: { priceMist: "1" } }, NOW);
  assert.deepEqual(bad, { ok: false, field: "premium" });
});

test("eligibility needs a public profile, a score of 550 and 10 settled calls", async () => {
  const none = kvFake();
  assert.deepEqual(await premiumEligibility(none.env, "u1"), { eligible: false, handle: null, address: null, score: null, settled: 0, reason: "not_public" });

  const good = kvFake();
  seller(good.data);
  assert.deepEqual(await premiumEligibility(good.env, "u1"), { eligible: true, handle: "ada", address: ADDRESS, score: 583, settled: 14, reason: null });

  const edge = kvFake();
  seller(edge.data, 550, 10);
  assert.equal((await premiumEligibility(edge.env, "u1")).eligible, true);

  const low = kvFake();
  seller(low.data, 549, 14);
  assert.equal((await premiumEligibility(low.env, "u1")).reason, "score_too_low");

  const few = kvFake();
  seller(few.data, 700, 9);
  assert.equal((await premiumEligibility(few.env, "u1")).reason, "too_few_settled");

  const hidden = kvFake();
  seller(hidden.data);
  hidden.data.set("social:hidden", JSON.stringify([{ handle: "ada", at: NOW }]));
  assert.equal((await premiumEligibility(hidden.env, "u1")).reason, "not_public");
});

test("a premium call takes ESPN's kickoff, not the page's", async () => {
  const { data, env } = kvFake();
  seller(data);
  const result = await preparePremium(env, "u1", input(), 20_000_000n, board(event()), NOW);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.input.fixture?.startISO, KICKOFF);
  assert.deepEqual(result.input.premium, PRICE);
  assert.deepEqual(result.seller, { handle: "ada", address: ADDRESS, kickoffMs: Date.parse(KICKOFF) });
});

test("a premium call is refused once the match has started, or isn't on ESPN", async () => {
  const { data, env } = kvFake();
  seller(data);
  const started = await preparePremium(env, "u1", input(), 20_000_000n, board(event({ state: "in" })), NOW);
  assert.deepEqual(started, { ok: false, status: 409, body: { error: "fixture_not_open" } });
  const missing = await preparePremium(env, "u1", input(), 20_000_000n, async () => ({ competition: "", events: [] }), NOW);
  assert.equal(missing.ok === false && missing.body.error, "fixture_not_on_espn");
});

test("a premium call needs a match and an eligible caller", async () => {
  const { data, env } = kvFake();
  assert.equal((await preparePremium(env, "u1", input({ fixture: undefined }), 20_000_000n, board(event()), NOW)).ok, false);
  const refused = await preparePremium(env, "u1", input(), 20_000_000n, board(event()), NOW);
  assert.deepEqual(refused, { ok: false, status: 403, body: { error: "premium_not_eligible", reason: "not_public" } });
  assert.equal(data.size, 0);
});

test("a locked item gives no side, confidence, stake or question subject", () => {
  const locked = lockItem(item());
  assert.deepEqual(Object.keys(locked).sort(), ["at", "fixture", "locked", "pickId", "premium", "proof"]);
  assert.deepEqual(Object.keys(locked.fixture).sort(), ["away", "competition", "home", "startISO"]);
  const text = JSON.stringify(locked);
  for (const leak of ["Arsenal win", "YES", '"confidence"', "stakeMist", "subject"]) assert.equal(text.includes(leak), false, leak);
});

test("a premium call is hidden until kickoff, and only then", () => {
  assert.equal(isHidden(PRICE, KICKOFF, NOW), true);
  assert.equal(isHidden(PRICE, KICKOFF, Date.parse(KICKOFF)), false);
  assert.equal(isHidden(undefined, KICKOFF, NOW), false);
});

const followed: FollowedItem[] = [{ handle: "ada", item: item() }];

test("a viewer who hasn't paid sees it locked before kickoff, and open after", async () => {
  const { env } = kvFake();
  assert.equal(isLockedItem((await visibleToViewer({ env }, "buyer", followed, NOW))[0].item), true);
  const after = (await visibleToViewer({ env }, "buyer", followed, AFTER))[0].item;
  assert.equal(isLockedItem(after), false);
  assert.equal((after as FeedItem).lean, "Arsenal win");
});

test("a viewer who has paid sees it open, and nobody else does", async () => {
  const { data, env } = kvFake();
  data.set("unlock:buyer:p1", "{}");
  assert.equal(isLockedItem((await visibleToViewer({ env }, "buyer", followed, NOW))[0].item), false);
  assert.equal(isLockedItem((await visibleToViewer({ env }, "other", followed, NOW))[0].item), true);
});

test("an ordinary call is never locked", async () => {
  const { env } = kvFake();
  const plain: FollowedItem[] = [{ handle: "ada", item: item({ premium: undefined }) }];
  assert.equal(isLockedItem((await visibleToViewer({ env }, "buyer", plain, NOW))[0].item), false);
});

test("a locked call shows in followed calls without its side, and doesn't move the consensus", async () => {
  const { env } = kvFake();
  const match = { home: "Newcastle", away: "Arsenal", startISO: KICKOFF };
  const others: FollowedItem[] = [{ handle: "bob", item: item({ pickId: "p2", premium: undefined, side: "NO", lean: "No Arsenal win" }) }];
  const calls = followedCallsOn(await visibleToViewer({ env }, "buyer", [...followed, ...others], NOW), match);
  const locked = calls.find((call) => call.handle === "ada")!;
  assert.equal(JSON.stringify(locked).includes("Arsenal win"), false);
  assert.equal("side" in locked, false);
  assert.equal(consensusOf(calls)?.total, 1);
  assert.deepEqual(consensusOf(calls.filter((call) => call.handle === "ada")), null);
});

test("tailing a locked call is refused before any check that could give away the side", async () => {
  const { data, env } = kvFake();
  data.set("recent:ada", JSON.stringify([item()]));
  const wrongSide = input({ pYes: 0.2, tailOf: "ada" });
  const refused = await applyTail(env, wrongSide, { handle: "ada", flip: false }, "buyer", board(event()), NOW);
  assert.deepEqual(refused, { ok: false, status: 402, code: "tail_locked" });
  const rightSide = await applyTail(env, input({ tailOf: "ada" }), { handle: "ada", flip: false }, "buyer", board(event()), NOW);
  assert.deepEqual(rightSide, { ok: false, status: 402, code: "tail_locked" });
});
