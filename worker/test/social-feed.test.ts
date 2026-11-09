// The feed, followed calls and consensus, with KV faked.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import { userKeyFor, type RecallStore } from "../src/recall/memory";
import type { PickRecord } from "../src/recall/records";
import { clearMemoryCache } from "../src/store";
import { consensusOf, feedItemFor, followedCallsOn, mergeFeed, pushPickToFeed, pushStakeToFeed, withItem, type FeedItem, type FollowedItem } from "../src/social/feed";
import { socialRoute } from "../src/social/routes";

const INSTALL = "12345678-1234-1234-1234-123456789abc";
const KICKOFF = "2026-11-21T17:30:00.000Z";
const at = (minute: number) => new Date(Date.UTC(2026, 10, 9, 12, minute)).toISOString();
const PUBLIC_SINCE = at(0);

const pick = (id: string, overrides: Partial<PickRecord> = {}): PickRecord => ({
  id,
  at: at(10),
  question: "Will Arsenal beat Newcastle?",
  category: "sports",
  pYes: 0.7,
  marketYes: null,
  entities: [],
  endTime: KICKOFF,
  source: { site: "private.example", url: "https://private.example/x" },
  fixture: { home: "Newcastle", away: "Arsenal", startISO: KICKOFF, subject: "away", competition: "Premier League" },
  hash: "ab",
  commit: null,
  ...overrides,
});

const item = (pickId: string, minute: number, overrides: Partial<FeedItem> = {}): FeedItem => ({ ...feedItemFor(pick(pickId))!, at: at(minute), ...overrides });

function kvFake() {
  const data = new Map<string, string>();
  const kv = {
    get: async (key: string, type?: string) => {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
  return { data, env: { SOOTHIA_CACHE: kv } as unknown as Env };
}

function publicUser(data: Map<string, string>, userKey = "u1", handle = "ada", shareHistory = false): void {
  data.set(`profileuser:${userKey}`, handle);
  data.set(`profile:${handle}`, JSON.stringify({ handle, address: "0xa", userKey, publicSince: PUBLIC_SINCE, shareHistory }));
}

beforeEach(() => clearMemoryCache());

test("an item is compact, and says nothing about where the call was read", () => {
  const made = feedItemFor(pick("p1"))!;
  assert.deepEqual(made, { pickId: "p1", fixture: { home: "Newcastle", away: "Arsenal", competition: "Premier League", startISO: KICKOFF, subject: "away" }, lean: "Arsenal win", side: "YES", confidence: 70, at: at(10) });
  assert.equal(JSON.stringify(made).includes("private.example"), false);
});

test("a call that isn't a match has no item", () => {
  assert.equal(feedItemFor(pick("p1", { fixture: undefined })), null);
});

test("a public user's call reaches their feed", async () => {
  const { data, env } = kvFake();
  publicUser(data);
  await pushPickToFeed(env, "u1", pick("p1"));
  assert.equal(JSON.parse(data.get("recent:ada")!)[0].pickId, "p1");
});

test("a private user's call goes nowhere", async () => {
  const { data, env } = kvFake();
  await pushPickToFeed(env, "u1", pick("p1"));
  assert.equal([...data.keys()].length, 0);
});

test("the feed keeps the newest 50, one entry per pick", () => {
  let list: FeedItem[] = [];
  for (let i = 0; i < 60; i++) list = withItem(list, item(`p${i}`, i));
  assert.equal(list.length, 50);
  assert.equal(list[0].pickId, "p59");
  assert.equal(list.at(-1)!.pickId, "p10");
  assert.equal(withItem(list, { ...list[3], confidence: 99 }).filter((entry) => entry.pickId === list[3].pickId).length, 1);
});

test("a stake updates its call instead of adding another, and adds up", async () => {
  const { data, env } = kvFake();
  publicUser(data);
  await pushPickToFeed(env, "u1", pick("p1"));
  await pushStakeToFeed(env, "u1", pick("p1"), 100_000_000n);
  await pushStakeToFeed(env, "u1", pick("p1"), 50_000_000n);
  const list = JSON.parse(data.get("recent:ada")!);
  assert.equal(list.length, 1);
  assert.equal(list[0].stakeMist, "150000000");
});

test("backing a call made before going public can't make it public", async () => {
  const { data, env } = kvFake();
  publicUser(data);
  await pushStakeToFeed(env, "u1", pick("old", { at: "2026-11-01T00:00:00.000Z" }), 100_000_000n);
  assert.equal(data.has("recent:ada"), false);
});

test("with history shared, that same stake may show", async () => {
  const { data, env } = kvFake();
  publicUser(data, "u1", "ada", true);
  await pushStakeToFeed(env, "u1", pick("old", { at: "2026-11-01T00:00:00.000Z" }), 100_000_000n);
  assert.equal(JSON.parse(data.get("recent:ada")!)[0].stakeMist, "100000000");
});

test("a broken KV never fails the call", async () => {
  const env = { SOOTHIA_CACHE: { get: async () => { throw new Error("down"); } } } as unknown as Env;
  await pushPickToFeed(env, "u1", pick("p1"));
  await pushStakeToFeed(env, "u1", pick("p1"), 1n);
});

const followed = (handle: string, entry: FeedItem): FollowedItem => ({ handle, item: entry });

test("the feed merges everyone, newest first", () => {
  const merged = mergeFeed([followed("ada", item("a1", 1)), followed("bob", item("b1", 5)), followed("ada", item("a2", 3))]);
  assert.deepEqual(merged.map((entry) => entry.item.pickId), ["b1", "a2", "a1"]);
  assert.equal(mergeFeed(Array.from({ length: 60 }, (_, i) => followed("ada", item(`p${i}`, i)))).length, 50);
});

const page = { home: "Newcastle United", away: "Arsenal", startISO: "2026-11-21T20:00:00.000Z" };

test("followed calls match by teams and day, whichever way round", () => {
  const calls = followedCallsOn([followed("ada", item("a", 1))], page);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].handle, "ada");
  assert.equal(calls[0].lean, "Arsenal win");
  assert.equal(followedCallsOn([followed("ada", item("a", 1))], { ...page, home: "Arsenal", away: "Newcastle" }).length, 1);
});

test("another match or day isn't followed", () => {
  assert.equal(followedCallsOn([followed("ada", item("a", 1))], { ...page, away: "Chelsea" }).length, 0);
  assert.equal(followedCallsOn([followed("ada", item("a", 1))], { ...page, startISO: "2026-11-22T17:30:00.000Z" }).length, 0);
});

test("each person counts once, with their newest call", () => {
  const calls = followedCallsOn([followed("ada", item("old", 1, { confidence: 55 })), followed("ada", item("new", 5, { confidence: 80 }))], page);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].confidence, 80);
});

test("the consensus is the side most people took", () => {
  const no = item("n", 2, { side: "NO", lean: "Arsenal doesn't win (Newcastle win or draw)" });
  const calls = followedCallsOn([followed("ada", item("a", 1)), followed("bob", item("b", 2)), followed("cal", no)], page);
  const consensus = consensusOf(calls)!;
  assert.equal(consensus.text, "2 of 3 say Arsenal win");
  assert.equal(consensus.count, 2);
});

test("a split or empty crowd has no consensus", () => {
  const no = item("n", 2, { side: "NO", lean: "Arsenal doesn't win" });
  assert.equal(consensusOf(followedCallsOn([followed("ada", item("a", 1)), followed("cal", no)], page)), null);
  assert.equal(consensusOf([]), null);
});

test("the same side counts together however the match was listed", () => {
  const reversed = item("r", 2, { fixture: { home: "Arsenal", away: "Newcastle United", competition: null, startISO: KICKOFF, subject: "home" } });
  assert.equal(consensusOf(followedCallsOn([followed("ada", item("a", 1)), followed("bob", reversed)], page))!.count, 2);
});

async function feedHarness(picks: PickRecord[] = [], listFails = false) {
  const { data, env } = kvFake();
  const store = { list: async () => { if (listFails) throw new Error("walrus down"); return picks; } } as unknown as RecallStore;
  const userKey = await userKeyFor(INSTALL);
  const call = async (path: string, headers: Record<string, string> = { "X-Soothia-Install": INSTALL }) => {
    const response = await socialRoute(new Request(`https://x${path}`, { headers }), env, path.split("?")[0], { store: () => store, verify: async () => true, lookupName: async () => null, now: () => 0 });
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  };
  return { data, userKey, call };
}

test("the feed route gives handle, score, item and my call on the match", async () => {
  const h = await feedHarness([pick("mine", { pYes: 0.6 })]);
  h.data.set(`following:${h.userKey}`, '["ada"]');
  h.data.set("recent:ada", JSON.stringify([item("a", 1)]));
  h.data.set("social:boards", JSON.stringify({ entries: [{ handle: "ada", periods: { all: { stats: { score: 612 } } } }] }));
  const { body } = await h.call("/social/feed");
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].handle, "ada");
  assert.equal(body.items[0].score, 612);
  assert.deepEqual(body.items[0].myCall, { side: "Arsenal win", confidence: 60, pickId: "mine" });
});

test("no call of my own means none is claimed, and a Walrus failure doesn't stop the feed", async () => {
  const none = await feedHarness();
  none.data.set(`following:${none.userKey}`, '["ada"]');
  none.data.set("recent:ada", JSON.stringify([item("a", 1)]));
  assert.equal((await none.call("/social/feed")).body.items[0].myCall, null);
  const failing = await feedHarness([], true);
  failing.data.set(`following:${failing.userKey}`, '["ada"]');
  failing.data.set("recent:ada", JSON.stringify([item("a", 1)]));
  assert.equal((await failing.call("/social/feed")).status, 200);
});

test("following nobody is an empty feed, and the routes need an install id", async () => {
  const h = await feedHarness();
  assert.deepEqual((await h.call("/social/feed")).body, { items: [] });
  assert.equal((await h.call("/social/feed", {})).body.error, "missing_install");
});

test("the new-items count uses a time, and reads no Walrus", async () => {
  const h = await feedHarness([], true);
  h.data.set(`following:${h.userKey}`, '["ada"]');
  h.data.set("recent:ada", JSON.stringify([item("a", 1), item("b", 5)]));
  assert.deepEqual((await h.call(`/social/feed/new?since=${Date.parse(at(3))}`)).body, { count: 1 });
  assert.equal((await h.call("/social/feed/new?since=abc")).body.error, "invalid_since");
});
