// Following: routes and the newest-wins rule, with KV and Walrus faked.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import type { Env } from "../src/http";
import type { RecallStore } from "../src/recall/memory";
import type { FollowRecord } from "../src/recall/records";
import { clearMemoryCache } from "../src/store";
import { followingFrom, MAX_FOLLOWING } from "../src/social/follow";
import { socialRoute } from "../src/social/routes";
import { userKeyFor } from "../src/recall/memory";

const INSTALL = "12345678-1234-1234-1234-123456789abc";
const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const at = (minute: number) => new Date(Date.UTC(2026, 10, 9, 12, minute)).toISOString();

const addressOf = (name: string): string => `0x${Buffer.from(name).toString("hex").padEnd(64, "0")}`;

function harness() {
  const data = new Map<string, string>();
  const written: FollowRecord[] = [];
  const stored: FollowRecord[] = [];
  const kv = {
    get: async (key: string, type?: string) => {
      const value = data.get(key);
      if (value === undefined) return null;
      return type === "json" ? JSON.parse(value) : value;
    },
    put: async (key: string, value: string) => {
      data.set(key, value);
    },
    delete: async (key: string) => {
      data.delete(key);
    },
    list: async ({ prefix, limit }: { prefix: string; limit: number }) => ({
      keys: [...data.keys()]
        .filter((key) => key.startsWith(prefix))
        .sort()
        .slice(0, limit)
        .map((name) => ({ name, metadata: { address: JSON.parse(data.get(name)!).address } })),
      list_complete: true,
    }),
  };
  const env = { SOOTHIA_CACHE: kv } as unknown as Env;
  const store = {
    write: async (_kind: string, record: FollowRecord) => (written.push(record), { jobId: "j" }),
    list: async () => stored,
  } as unknown as RecallStore;
  const call = async (
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = { "X-Soothia-Install": INSTALL },
  ) => {
    const response = await socialRoute(
      new Request(`https://x${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      env,
      path.split("?")[0],
      { now: () => NOW, store: () => store, verify: async () => true, lookupName: async () => null },
    );
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  };
  const addProfile = (handle: string, userKey = `key-${handle}`, address = addressOf(handle)) => {
    const value = JSON.stringify({ handle, address, userKey, publicSince: at(0), shareHistory: false });
    data.set(`profile:${handle}`, value);
    data.set(`profileaddr:${address}`, value);
  };
  const dropProfile = (handle: string) => {
    data.delete(`profile:${handle}`);
    data.delete(`profileaddr:${addressOf(handle)}`);
  };
  return { data, written, stored, call, addProfile, dropProfile };
}

beforeEach(() => clearMemoryCache());

test("the newest record per handle wins", () => {
  const records: FollowRecord[] = [
    { handle: "ada", kind: "follow", at: at(0) },
    { handle: "ada", kind: "unfollow", at: at(5) },
    { handle: "bob", kind: "unfollow", at: at(0) },
    { handle: "bob", kind: "follow", at: at(5) },
    { handle: "cal", kind: "follow", at: at(1) },
  ];
  assert.deepEqual(followingFrom(records), ["bob", "cal"]);
  assert.deepEqual(followingFrom([...records].reverse()), ["bob", "cal"]);
});

test("following needs an install id but not a public profile", async () => {
  const h = harness();
  h.addProfile("ada");
  assert.equal((await h.call("POST", "/social/follow", { handle: "ada" }, {})).body.error, "missing_install");
  const { status, body } = await h.call("POST", "/social/follow", { handle: "ADA" });
  assert.equal(status, 200);
  assert.deepEqual(body, { ok: true, following: true });
  assert.equal(h.written[0].handle, "ada");
  assert.equal(h.written[0].address, addressOf("ada"));
  assert.equal(h.written[0].kind, "follow");
  assert.equal(h.data.get(`followers:${addressOf("ada")}`), "1");
});

test("following twice counts once", async () => {
  const h = harness();
  h.addProfile("ada");
  await h.call("POST", "/social/follow", { handle: "ada" });
  await h.call("POST", "/social/follow", { handle: "ada" });
  assert.equal(h.written.length, 1);
  assert.equal(h.data.get(`followers:${addressOf("ada")}`), "1");
});

test("only public handles can be followed, and never yourself", async () => {
  const h = harness();
  assert.equal((await h.call("POST", "/social/follow", { handle: "nobody" })).status, 404);
  assert.equal((await h.call("POST", "/social/follow", { handle: "a" })).body.error, "invalid_handle");
  h.addProfile("myself", await userKeyFor(INSTALL));
  assert.equal((await h.call("POST", "/social/follow", { handle: "myself" })).body.error, "cannot_follow_self");
});

test("the follow list has a limit", async () => {
  const h = harness();
  h.addProfile("ada");
  h.data.set(
    `following:${await userKeyFor(INSTALL)}`,
    JSON.stringify(Array.from({ length: MAX_FOLLOWING }, (_, i) => addressOf(`u${i}`))),
  );
  assert.equal((await h.call("POST", "/social/follow", { handle: "ada" })).body.error, "follow_limit");
});

test("unfollow writes the memory, lowers the count, and is safe to repeat", async () => {
  const h = harness();
  h.addProfile("ada");
  await h.call("POST", "/social/follow", { handle: "ada" });
  assert.deepEqual((await h.call("POST", "/social/unfollow", { handle: "ada" })).body, { ok: true, following: false });
  assert.equal(h.written.at(-1)?.kind, "unfollow");
  assert.equal(h.data.get(`followers:${addressOf("ada")}`), "0");
  await h.call("POST", "/social/unfollow", { handle: "ada" });
  assert.equal(h.written.length, 2);
  assert.equal(h.data.get(`followers:${addressOf("ada")}`), "0");
});

test("someone who went private can still be unfollowed", async () => {
  const h = harness();
  h.addProfile("ada");
  await h.call("POST", "/social/follow", { handle: "ada" });
  h.dropProfile("ada");
  assert.deepEqual((await h.call("POST", "/social/unfollow", { address: addressOf("ada") })).body, {
    ok: true,
    following: false,
  });
  assert.equal(h.written.at(-1)?.kind, "unfollow");
  assert.equal(h.written.at(-1)?.address, addressOf("ada"));
  assert.equal(h.data.get(`following:${await userKeyFor(INSTALL)}`), "[]");
});

const boards = (scores: Record<string, number>) =>
  JSON.stringify({
    entries: Object.entries(scores).map(([handle, score]) => ({ handle, periods: { all: { stats: { score } } } })),
  });

test("the following list has each handle's score and whether it is still public", async () => {
  const h = harness();
  h.addProfile("ada");
  h.addProfile("bob");
  await h.call("POST", "/social/follow", { handle: "ada" });
  await h.call("POST", "/social/follow", { handle: "bob" });
  h.dropProfile("bob");
  h.data.set("social:boards", boards({ ada: 612 }));
  const { body } = await h.call("GET", "/social/following");
  assert.deepEqual(body.following, [
    { address: addressOf("ada"), handle: "ada", score: 612, public: true },
    { address: addressOf("bob"), handle: null, score: null, public: false },
  ]);
});

test("a lost index is rebuilt from Walrus, once", async () => {
  const h = harness();
  h.addProfile("ada");
  h.stored.push(
    { handle: "ada", kind: "follow", at: at(1) },
    { handle: "gone", kind: "follow", at: at(1) },
    { handle: "gone", kind: "unfollow", at: at(2) },
  );
  const { body } = await h.call("GET", "/social/following");
  assert.deepEqual(
    body.following.map((row: { handle: string }) => row.handle),
    ["ada"],
  );
  assert.equal(h.data.get(`following:${await userKeyFor(INSTALL)}`), JSON.stringify([addressOf("ada")]));
});

test("search finds public handles by prefix, at most ten", async () => {
  const h = harness();
  for (let i = 0; i < 12; i++) h.addProfile(`ada${i}`);
  h.addProfile("bob");
  h.data.set("social:boards", boards({ ada0: 700 }));
  const { body } = await h.call("GET", "/social/search?q=ADA");
  assert.equal(body.results.length, 10);
  assert.deepEqual(body.results[0], { handle: "ada0", score: 700, following: false });
});

test("search says who you already follow, and checks its input", async () => {
  const h = harness();
  h.addProfile("ada");
  await h.call("POST", "/social/follow", { handle: "ada" });
  assert.equal((await h.call("GET", "/social/search?q=ad")).body.results[0].following, true);
  assert.equal((await h.call("GET", "/social/search?q=")).body.error, "invalid_query");
  assert.equal((await h.call("GET", "/social/search?q=a%20b")).body.error, "invalid_query");
});

test("a public profile shows follower and following counts", async () => {
  const h = harness();
  h.addProfile("ada", "ada-user");
  h.data.set("followers:ada", "3");
  h.data.set("following:ada-user", '["x","y"]');
  const { body } = await h.call("GET", "/social/profile/ada");
  assert.equal(body.followers, 3);
  assert.equal(body.following, 2);
});

test("a list from before follows moved to addresses is swapped once", async () => {
  const h = harness();
  h.addProfile("ada");
  h.addProfile("0xada");
  const key = `following:${await userKeyFor(INSTALL)}`;
  h.data.set(key, JSON.stringify(["ada", "0xada", "gone"]));
  const { body } = await h.call("GET", "/social/following");
  assert.deepEqual(body.following.map((row: { handle: string }) => row.handle).sort(), ["0xada", "ada"]);
  assert.deepEqual(JSON.parse(h.data.get(key)!), [addressOf("0xada"), addressOf("ada")].sort());
});

test("a handle someone else takes does not inherit followers or followed calls", async () => {
  const h = harness();
  h.addProfile("ada");
  await h.call("POST", "/social/follow", { handle: "ada" });
  h.dropProfile("ada");
  h.addProfile("ada", "someone-else", addressOf("newcomer"));
  assert.deepEqual((await h.call("GET", "/social/following")).body.following, [
    { address: addressOf("ada"), handle: null, score: null, public: false },
  ]);
  const profile = (await h.call("GET", "/social/profile/ada")).body;
  assert.equal(profile.followers, 0);
});

test("a follower count from before the move carries over, then goes", async () => {
  const h = harness();
  h.addProfile("ada");
  h.data.set("followers:ada", "3");
  await h.call("POST", "/social/follow", { handle: "ada" });
  assert.equal(h.data.get(`followers:${addressOf("ada")}`), "4");
  assert.equal(h.data.has("followers:ada"), false);
});
