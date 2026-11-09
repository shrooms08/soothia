// Total Recall: route validation and the cron sweep, with KV faked. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Env } from "../src/http";
import { clearMemoryCache } from "../src/store";
import type { PickRecord } from "../src/recall/records";
import { entitiesFromQuestion, isDuplicatePick, isHostname, parseClaims, validatePickBody } from "../src/recall/routes";
import { groupSweepKeys, sweepRecall } from "../src/recall/sweep";

const NOW = Date.parse("2026-11-08T12:00:00.000Z");
const FUTURE = "2026-11-08T18:00:00.000Z";
const PAST = "2026-11-08T08:00:00.000Z";

const good = (): Record<string, unknown> => ({
  question: "Will Arsenal beat Chelsea in English Premier League on Sat 21 Nov?",
  category: "sports",
  pYes: 0.6,
  endTime: FUTURE,
  source: { site: "espn.com", url: "https://www.espn.com/soccer" },
});

const fieldOf = (body: Record<string, unknown>): string | null => {
  const result = validatePickBody(body, NOW);
  return result.ok ? null : result.field;
};

test("the entity pattern reads both teams, with or without a competition", () => {
  assert.deepEqual(entitiesFromQuestion("Will Arsenal beat Chelsea in English Premier League on Sat 21 Nov?"), ["Arsenal", "Chelsea"]);
  assert.deepEqual(entitiesFromQuestion("Will Real Madrid beat FC Barcelona on Sun 22 Nov?"), ["Real Madrid", "FC Barcelona"]);
  assert.deepEqual(entitiesFromQuestion("Will Bitcoin reach 200k this year?"), []);
});

test("a valid pick passes and gets entities from its question", () => {
  const result = validatePickBody(good(), NOW);
  assert.ok(result.ok);
  assert.deepEqual(result.input.entities, ["Arsenal", "Chelsea"]);
  assert.equal(result.input.marketYes, null);
});

test("pYes must be within 0.01 and 0.99", () => {
  assert.equal(fieldOf({ ...good(), pYes: 0 }), "pYes");
  assert.equal(fieldOf({ ...good(), pYes: 1 }), "pYes");
  assert.equal(fieldOf({ ...good(), pYes: "0.5" }), "pYes");
  assert.equal(fieldOf({ ...good(), pYes: 0.01 }), null);
  assert.equal(fieldOf({ ...good(), pYes: 0.99 }), null);
});

test("endTime and fixture.startISO must be in the future", () => {
  assert.equal(fieldOf({ ...good(), endTime: PAST }), "endTime");
  assert.equal(fieldOf({ ...good(), endTime: "soon" }), "endTime");
  const fixture = { home: "Arsenal", away: "Chelsea", startISO: PAST, subject: "home" };
  assert.equal(fieldOf({ ...good(), fixture }), "fixture.startISO");
  assert.equal(fieldOf({ ...good(), fixture: { ...fixture, startISO: FUTURE } }), null);
});

test("the question is capped at 200 characters and source must be a web link", () => {
  assert.equal(fieldOf({ ...good(), question: "x".repeat(201) }), "question");
  assert.equal(fieldOf({ ...good(), source: { site: "x.com", url: "javascript:alert(1)" } }), "source");
});

test("duplicates are caught by question and by fixture", () => {
  const checked = validatePickBody({ ...good(), fixture: { home: "A", away: "B", startISO: FUTURE, subject: "home" } }, NOW);
  assert.ok(checked.ok);
  const sameQuestion = { question: checked.input.question } as PickRecord;
  const sameFixture = { question: "other", fixture: checked.input.fixture } as PickRecord;
  const unrelated = { question: "other" } as PickRecord;
  assert.equal(isDuplicatePick([sameQuestion], checked.input), true);
  assert.equal(isDuplicatePick([sameFixture], checked.input), true);
  assert.equal(isDuplicatePick([unrelated], checked.input), false);
});

test("a tail names a handle, and a flip must be asked for", () => {
  const fixture = { home: "A", away: "B", startISO: FUTURE, subject: "home" };
  const tailed = validatePickBody({ ...good(), fixture, tailOf: "Ada_1" }, NOW);
  assert.ok(tailed.ok);
  assert.deepEqual(tailed.tail, { handle: "ada_1", flip: false });
  const flipped = validatePickBody({ ...good(), fixture, tailOf: "ada", tailFlip: true }, NOW);
  assert.ok(flipped.ok);
  assert.equal(flipped.tail?.flip, true);
  assert.equal(fieldOf({ ...good(), fixture, tailOf: "x" }), "tailOf");
  const plain = validatePickBody(good(), NOW);
  assert.ok(plain.ok);
  assert.equal(plain.tail, undefined);
});

test("hostnames are checked", () => {
  for (const site of ["espn.com", "www.bbc.co.uk", "my-site.example.org"]) assert.equal(isHostname(site), true, site);
  for (const site of ["", "localhost", "https://espn.com", "espn.com/path", "a b.com", "-bad.com", "1.2.3.4", 7])
    assert.equal(isHostname(site), false, String(site));
});

test("sweep keys group by user and ignore keys with no user", () => {
  const groups = groupSweepKeys([
    { name: "rp:a", metadata: { userKey: "u1" } },
    { name: "rp:b", metadata: { userKey: "u2" } },
    { name: "rp:c", metadata: { userKey: "u1" } },
    { name: "rp:d" },
    { name: "other:e", metadata: { userKey: "u1" } },
  ]);
  assert.deepEqual([...groups.entries()], [
    ["u1", ["a", "c"]],
    ["u2", ["b"]],
  ]);
});

function fakeEnv(keys: { name: string; metadata: { userKey: string } }[]): { env: Env; deleted: string[] } {
  const deleted: string[] = [];
  const env = {
    SOOTHIA_CACHE: {
      list: async () => ({ keys, list_complete: true, cacheStatus: null }),
      delete: async (name: string) => {
        deleted.push(name);
      },
    },
  } as unknown as Env;
  return { env, deleted };
}

test("the sweep deletes only entries whose picks now have outcomes", async () => {
  clearMemoryCache();
  const { env, deleted } = fakeEnv([
    { name: "rp:done", metadata: { userKey: "u1" } },
    { name: "rp:open", metadata: { userKey: "u1" } },
  ]);
  const result = await sweepRecall(env, async () => ["done"]);
  assert.deepEqual(deleted, ["rp:done"]);
  assert.deepEqual(result, { users: 1, closed: 1 });
});

test("one user's failure keeps their entries and does not stop the next user", async () => {
  clearMemoryCache();
  const { env, deleted } = fakeEnv([
    { name: "rp:a", metadata: { userKey: "bad" } },
    { name: "rp:b", metadata: { userKey: "good" } },
  ]);
  await sweepRecall(env, async (userKey) => {
    if (userKey === "bad") throw new Error("boom");
    return ["b"];
  });
  assert.deepEqual(deleted, ["rp:b"]);
});

test("insight claims may carry their match, and a malformed match is refused", () => {
  const base = { id: "c1", question: "Q?", category: "sports" };
  const fixture = { home: "A", away: "B", startISO: FUTURE };
  assert.deepEqual(parseClaims([{ ...base, fixture }]), [{ ...base, fixture }]);
  assert.deepEqual(parseClaims([base]), [base]);
  assert.equal(parseClaims([{ ...base, fixture: { home: "A" } }]), null);
});
