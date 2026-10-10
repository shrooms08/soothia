// Event mode on the Worker: grounded fixture claims. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fixtureClaims, fixtureGrounded, parseFixture, type FixturePayload } from "../src/detect";

const NOW = Date.parse("2026-10-10T15:00:00Z");
const levante: FixturePayload = {
  home: "Levante", away: "Sevilla", competition: "LaLiga", startISO: "2026-10-12T18:00:00.000Z", dateLabel: "October 12, 2026",
  evidence: ["Levante vs Sevilla Live Scores | LiveScore", "12 Oct 20:00", "LaLiga"],
};

test("a grounded fixture gives two match-winner claims with the league as the source", () => {
  const { claims, dropped } = fixtureClaims(levante, NOW);
  assert.deepEqual(dropped, []);
  assert.deepEqual(claims.map((c) => c.question), ["Will Levante beat Sevilla in LaLiga on October 12, 2026?", "Will Sevilla beat Levante in LaLiga on October 12, 2026?"]);
  const first = claims[0];
  assert.equal(first.category, "sports");
  assert.equal(first.resolution.type, "sports_result");
  assert.deepEqual(first.resolution.sources, ["https://www.laliga.com"]);
  assert.match(first.resolution.details, /draw.*resolves NO/i);
  assert.equal(first.endTime, "2026-10-12T21:00:00.000Z");
  assert.equal(first.fromFixture, true);
  assert.equal(first.sourceQuote, "Levante vs Sevilla Live Scores | LiveScore · 12 Oct 20:00 · LaLiga");
});

test("grounding: invented team names or a date not on the page are refused", () => {
  assert.equal(fixtureGrounded(levante), true);
  assert.equal(fixtureGrounded({ ...levante, home: "Real Madrid" }), false, "team not in evidence");
  assert.equal(fixtureGrounded({ ...levante, dateLabel: "October 19, 2026", startISO: "2026-10-19T18:00:00.000Z" }), false, "date not in evidence");
  assert.equal(fixtureGrounded({ ...levante, evidence: ["Levante vs Sevilla", "startDate 2026-10-12T18:00:00Z"] }), true, "ISO date counts");
  assert.equal(fixtureGrounded({ ...levante, evidence: ["Levante vs Sevilla", "Sun, October 12 8:00 PM"] }), true, "month-first counts");
  const bad = fixtureClaims({ ...levante, away: "Barcelona" }, NOW);
  assert.deepEqual(bad.claims, []);
  assert.equal(bad.dropped[0].reason, "source_quote_not_on_page");
});

test("a kickoff in the past or too far ahead gives no claims; the payload is validated", () => {
  assert.deepEqual(fixtureClaims({ ...levante, startISO: "2026-10-10T14:00:00.000Z" }, NOW).claims, []);
  assert.deepEqual(fixtureClaims({ ...levante, startISO: "2027-01-12T18:00:00.000Z", dateLabel: "January 12, 2027" }, NOW).claims, []);
  assert.equal(parseFixture(null), null);
  assert.equal(parseFixture({ home: "A" }), null);
  assert.equal(parseFixture({ ...levante, startISO: "not a date" }), null);
  assert.equal(parseFixture(levante)?.competition, "LaLiga");
});
