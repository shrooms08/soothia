// Which pool a fixture question maps to. Run with `npm test`.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { flipSubject, poolIdentity, poolKey } from "../src/stake/identity";

const KICKOFF = "2026-11-21T17:30:00.000Z";
const match = { home: "Arsenal", away: "Newcastle United", startISO: KICKOFF };

test("the key has the documented shape", () => {
  assert.equal(poolKey(match, "home"), "soothia-pool-v1|fixture|arsenal|newcastle united|2026-11-21|home");
});

test("a reversed listing of the same question is the same pool", () => {
  const reversed = { ...match, home: match.away, away: match.home };
  assert.equal(poolKey(reversed, "away"), poolKey(match, "home"));
  assert.equal(poolKey(reversed, "home"), poolKey(match, "away"));
});

test("the two questions about one match are different pools", () => {
  assert.notEqual(poolKey(match, "home"), poolKey(match, "away"));
});

test("names normalise: accents, FC and aliases do not split a pool", () => {
  assert.equal(poolKey({ ...match, away: "Newcastle" }, "home"), poolKey(match, "home"));
  assert.equal(poolKey({ ...match, home: "Arsenal FC" }, "home"), poolKey(match, "home"));
  assert.equal(
    poolKey({ home: "Atlético Madrid", away: "Sevilla", startISO: KICKOFF }, "home"),
    poolKey({ home: "Atletico Madrid", away: "Sevilla FC", startISO: KICKOFF }, "home"),
  );
});

test("the date is the kickoff's UTC date, and the time of day does not matter", () => {
  assert.equal(poolKey({ ...match, startISO: "2026-11-21T23:30:00-02:00" }, "home").includes("|2026-11-22|"), true);
  assert.equal(poolKey({ ...match, startISO: "2026-11-21T12:30:00.000Z" }, "home"), poolKey(match, "home"));
  assert.notEqual(poolKey({ ...match, startISO: "2026-11-22T12:30:00.000Z" }, "home"), poolKey(match, "home"));
});

test("the identity is the SHA-256 of the key, and closes at kickoff", async () => {
  const identity = await poolIdentity(match, "away");
  assert.equal(identity.questionHash, createHash("sha256").update(identity.key).digest("hex"));
  assert.equal(identity.questionHash.length, 64);
  assert.equal(identity.closeMs, BigInt(Date.parse(KICKOFF)));
});

test("a fixture that cannot name a pool is an error", () => {
  assert.throws(() => poolKey({ ...match, away: "Arsenal FC" }, "home"), /invalid_fixture_teams/);
  assert.throws(() => poolKey({ ...match, home: "!!!" }, "home"), /invalid_fixture_teams/);
  assert.throws(() => poolKey({ ...match, startISO: "soon" }, "home"), /invalid_fixture_start/);
});

test("flipSubject swaps sides", () => {
  assert.equal(flipSubject("home"), "away");
  assert.equal(flipSubject("away"), "home");
});
