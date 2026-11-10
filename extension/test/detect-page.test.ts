// What a page sends to /detect. Regression for 0.16.4: on an ESPN match page with a
// preview article, the prose went too, the Worker drafted claims from it, and those had
// no fixture, so "Make it premium" never showed. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { detectPage } from "../src/detect-page";
import type { FixtureSignal, PageContext } from "../src/messages";

const here = {
  url: "https://www.espn.com/soccer/match/_/gameId/401878755",
  site: "espn.com",
  title: "Man United vs Liverpool",
};
const article: PageContext = { ...here, text: "Liverpool host Manchester United at Anfield on Sunday. ".repeat(20) };
const fixture: FixtureSignal = {
  home: "Liverpool",
  away: "Manchester United",
  competition: "English Premier League",
  startISO: "2026-11-22T16:30:00.000Z",
  dateLabel: "November 22, 2026",
  sourceUrl: here.url,
  evidence: ["Manchester United vs Liverpool", "Nov 22", "Premier League"],
};
// The Worker writes claims from prose at 200 characters or more (worker/src/detect.ts).
const WORKER_PROSE_THRESHOLD = 200;

test("a match page with a long article asks for the match, not the prose", () => {
  const page = detectPage({ kind: "page", page: article }, fixture, here);
  assert.equal(page.text, "");
  assert.ok(page.text.length < WORKER_PROSE_THRESHOLD);
  assert.equal(page.url, here.url);
  assert.equal(page.title, here.title);
});

test("a match page with little text asks for the match too", () => {
  assert.deepEqual(detectPage({ kind: "thin" }, fixture, here), { ...here, text: "" });
});

test("a page with no match sends its article as before", () => {
  assert.deepEqual(detectPage({ kind: "page", page: article }, null, here), article);
});
