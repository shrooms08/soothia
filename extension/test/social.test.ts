// The Social tab, the tile line and the orb badge's logic. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { ApiResponse } from "../src/messages";
import {
  badgeText,
  cachedFeedCount,
  callLine,
  canTail,
  FEED_CHECK_MS,
  followedLine,
  handleLine,
  initials,
  matchLine,
  pageFollowedCount,
  tailSheetFor,
  timeAgo,
  type FeedEntry,
  type OpenFollowedCall,
} from "../src/social-logic";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });
const { createSocialView, followedRow } = await import("../src/social-view");

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const fixture = {
  home: "Newcastle",
  away: "Arsenal",
  competition: "Premier League",
  startISO: KICKOFF,
  subject: "away" as const,
};
const entry = (overrides: Partial<FeedEntry> = {}): FeedEntry => ({
  handle: "ada",
  score: 612,
  item: {
    pickId: "a1",
    fixture,
    lean: "Arsenal win",
    side: "YES",
    confidence: 70,
    stakeMist: "1000000000",
    at: new Date(NOW - 3_600_000).toISOString(),
  },
  myCall: null,
  ...overrides,
});
const call = (handle: string, overrides: Partial<OpenFollowedCall> = {}): OpenFollowedCall => ({
  handle,
  lean: "Arsenal win",
  confidence: 70,
  stakeMist: null,
  side: "YES",
  pickId: "x",
  fixture,
  at: "x",
  ...overrides,
});

test("time ago reads simply", () => {
  assert.equal(timeAgo(NOW - 5000, NOW), "just now");
  assert.equal(timeAgo(NOW - 5 * 60_000, NOW), "5m ago");
  assert.equal(timeAgo(NOW - 3 * 3_600_000, NOW), "3h ago");
  assert.equal(timeAgo(NOW - 2 * 86_400_000, NOW), "2d ago");
});

test("names and lines", () => {
  assert.equal(initials("ada"), "AD");
  assert.equal(initials("_t_unde"), "TU");
  assert.equal(handleLine("ada", 612), "@ada · 612");
  assert.equal(handleLine("ada", null), "@ada");
  assert.equal(matchLine(fixture), "Newcastle v Arsenal");
  assert.equal(callLine("Arsenal win", 70, "1000000000"), "Arsenal win · 70% · 1 SUI");
  assert.equal(callLine("Arsenal win", 70), "Arsenal win · 70%");
});

test("the tile line names people and the consensus", () => {
  const consensus = { lean: "Arsenal win", count: 2, total: 2, text: "2 of 2 say Arsenal win" };
  assert.equal(
    followedLine([call("ada"), call("tunde")], consensus),
    "@ada and @tunde called this · 2 say Arsenal win",
  );
  assert.equal(followedLine([call("ada")], null), "@ada called this");
  assert.equal(
    followedLine([call("a1a"), call("b2b"), call("c3c"), call("d4d")], null),
    "@a1a, @b2b and 2 more called this",
  );
});

test("tailing closes two minutes before kickoff", () => {
  const start = Date.parse(KICKOFF);
  assert.equal(canTail(fixture, start - 120_001), true);
  assert.equal(canTail(fixture, start - 120_000), false);
});

test("a tail sheet asks their question, with their side", () => {
  const { tile, prefill, fixture: signal } = tailSheetFor("ada", { fixture, side: "YES", confidence: 70 });
  assert.equal(tile.claim.question, "Will Arsenal beat Newcastle in Premier League on 21 November 2026?");
  assert.equal(tile.claim.fromFixture, true);
  assert.deepEqual(prefill, { side: "yes", percent: 70, tailOf: "ada" });
  assert.equal(signal.home, "Newcastle");
  assert.equal(signal.startISO, KICKOFF);
});

test("a tail sheet keeps confidence in range", () => {
  assert.equal(tailSheetFor("ada", { fixture, side: "NO", confidence: 50 }).prefill.percent, 51);
  assert.equal(tailSheetFor("ada", { fixture, side: "NO", confidence: 100 }).prefill.side, "no");
});

test("the badge hides at zero and caps at 9+", () => {
  assert.equal(badgeText(0), null);
  assert.equal(badgeText(3), "3");
  assert.equal(badgeText(10), "9+");
});

test("a recent check stands in only for the same last-seen time", () => {
  const check = { at: NOW, seen: 100, count: 4 };
  assert.equal(cachedFeedCount(check, 100, NOW + 1000), 4);
  assert.equal(cachedFeedCount(check, 200, NOW + 1000), null);
  assert.equal(cachedFeedCount(check, 100, NOW + FEED_CHECK_MS), null);
  assert.equal(cachedFeedCount(null, 100, NOW), null);
});

test("people on the page count once each", () => {
  assert.equal(pageFollowedCount([[call("ada"), call("bob")], [call("ada")], undefined]), 2);
  assert.equal(pageFollowedCount([]), 0);
});

const ok = (body: unknown): ApiResponse<unknown> => ({ ok: true, status: 200, body });
const tick = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

function social(answers: Record<string, ApiResponse<unknown>>) {
  const pane = window.document.createElement("div");
  const asked: [string, unknown][] = [];
  const tails: unknown[] = [];
  const view = createSocialView(pane, {
    api: (async (path: string, body: unknown) => {
      asked.push([path, body]);
      return answers[path] ?? ok({ rows: [] });
    }) as never,
    layout: () => undefined,
    state: (_kind, text, ...extra) => {
      const node = window.document.createElement("div");
      node.className = "state";
      node.textContent = text;
      node.append(...extra);
      return node;
    },
    onTail: (handle, source) => tails.push([handle, source]),
    now: () => NOW,
  });
  const named = (label: string) =>
    [...pane.querySelectorAll("button")].find((node) => node.textContent === label) as HTMLButtonElement;
  return { pane, view, asked, tails, named };
}

test("Feed is the default, with Leaderboard and Following beside it", async () => {
  const s = social({ "/social/feed": ok({ items: [] }) });
  await s.view.render();
  assert.deepEqual(
    [...s.pane.querySelectorAll(".record-segment")].map((node) => node.textContent),
    ["Feed", "Leaderboard", "Following"],
  );
  assert.equal(s.pane.querySelector(".record-segment.selected")!.textContent, "Feed");
  assert.match(s.pane.textContent!, /Follow people to see their calls here/);
});

test("a feed row shows the handle, match, call and time, with Tail", async () => {
  const s = social({ "/social/feed": ok({ items: [entry()] }) });
  await s.view.render();
  const row = s.pane.querySelector(".feed-row")!;
  assert.equal(row.querySelector(".feed-handle")!.textContent, "@ada · 612");
  assert.equal(row.querySelector(".feed-match")!.textContent, "Newcastle v Arsenal");
  assert.equal(row.querySelector(".feed-call")!.textContent, "Arsenal win · 70% · 1 SUI");
  assert.equal(row.querySelector(".feed-time")!.textContent, "1h ago");
  s.named("Tail").click();
  assert.equal((s.tails[0] as [string])[0], "ada");
});

test("if I already called the match, my call replaces Tail", async () => {
  const s = social({
    "/social/feed": ok({ items: [entry({ myCall: { side: "Newcastle win", confidence: 55, pickId: "m" } })] }),
  });
  await s.view.render();
  assert.equal(s.pane.querySelector(".feed-mine")!.textContent, "You: Newcastle win · 55%");
  assert.equal(s.named("Tail"), undefined);
});

test("a match about to start has no Tail", async () => {
  const soon = entry();
  soon.item = { ...soon.item, fixture: { ...fixture, startISO: new Date(NOW + 60_000).toISOString() } };
  const s = social({ "/social/feed": ok({ items: [soon] }) });
  await s.view.render();
  assert.equal(s.named("Tail"), undefined);
});

test("a tailed call in the feed says whose it was", async () => {
  const tailed = entry();
  tailed.item = { ...tailed.item, tailOf: "bob" };
  const s = social({ "/social/feed": ok({ items: [tailed] }) });
  await s.view.render();
  assert.match(s.pane.textContent!, /Tail of @bob/);
});

test("a failed feed offers a retry", async () => {
  const s = social({ "/social/feed": { ok: false, status: 502, body: null } });
  await s.view.render();
  assert.match(s.pane.textContent!, /Couldn't load your feed/);
  assert.ok(s.named("Try again"));
});

test("Leaderboard shows the existing board", async () => {
  const s = social({
    "/social/feed": ok({ items: [] }),
    "/social/leaderboard": ok({ rows: [{ rank: 1, handle: "amy", score: 720, calls: 14, hitRate: 0.75 }] }),
  });
  await s.view.render();
  s.named("Leaderboard").click();
  await tick();
  assert.match(s.pane.textContent!, /@amy/);
});

test("Following lists people with scores and Unfollow", async () => {
  const s = social({
    "/social/feed": ok({ items: [] }),
    "/social/following": ok({
      following: [
        { address: "0xada", handle: "ada", score: 612, public: true },
        { address: "0xb0b", handle: null, score: null, public: false },
      ],
    }),
    "/social/unfollow": ok({ ok: true }),
  });
  await s.view.render();
  s.named("Following").click();
  await tick();
  assert.equal(s.pane.querySelector(".follow-row .feed-handle")!.textContent, "@ada · 612");
  assert.match(s.pane.textContent!, /No longer public/);
  s.named("Unfollow").click();
  await tick();
  assert.deepEqual(s.asked.find(([path]) => path === "/social/unfollow")?.[1], { address: "0xada" });
});

test("search finds people and Follow follows", async () => {
  const s = social({
    "/social/feed": ok({ items: [] }),
    "/social/following": ok({ following: [] }),
    "/social/search": ok({
      results: [
        { handle: "ada", score: 612, following: false },
        { handle: "adam", score: null, following: true },
      ],
    }),
    "/social/follow": ok({ ok: true }),
  });
  await s.view.render();
  s.named("Following").click();
  await tick();
  const input = s.pane.querySelector<HTMLInputElement>(".follow-search")!;
  input.value = "AD";
  input.dispatchEvent(new window.Event("input"));
  await new Promise((resolve) => setTimeout(resolve, 320));
  await tick();
  assert.deepEqual(s.asked.find(([path]) => path === "/social/search")?.[1], { q: "ad" });
  assert.match(s.pane.querySelector(".follow-results")!.textContent!, /Following/);
  s.named("Follow").click();
  await tick();
  assert.deepEqual(s.asked.find(([path]) => path === "/social/follow")?.[1], { handle: "ada" });
});

test("a follow that fails says why and stays usable", async () => {
  const s = social({
    "/social/feed": ok({ items: [] }),
    "/social/following": ok({ following: [] }),
    "/social/search": ok({ results: [{ handle: "ada", score: 1, following: false }] }),
    "/social/follow": { ok: false, status: 400, body: { error: "cannot_follow_self" } },
  });
  await s.view.render();
  s.named("Following").click();
  await tick();
  const input = s.pane.querySelector<HTMLInputElement>(".follow-search")!;
  input.value = "ada";
  input.dispatchEvent(new window.Event("input"));
  await new Promise((resolve) => setTimeout(resolve, 320));
  await tick();
  s.named("Follow").click();
  await tick();
  assert.match(s.pane.textContent!, /That's you/);
  assert.equal(s.named("Follow").disabled, false);
});

test("the tile line opens to a list, each with Tail", () => {
  const tailed: OpenFollowedCall[] = [];
  const consensus = { lean: "Arsenal win", count: 2, total: 2, text: "" };
  const node = followedRow(
    [call("ada"), call("tunde")],
    consensus,
    (item) => tailed.push(item),
    () => undefined,
  );
  assert.equal(node.querySelector(".followed-text")!.textContent, "@ada and @tunde called this · 2 say Arsenal win");
  assert.deepEqual(
    [...node.querySelectorAll(".followed-avatar")].map((item) => item.textContent),
    ["AD", "TU"],
  );
  const list = node.querySelector<HTMLElement>(".followed-list")!;
  assert.equal(list.hidden, true);
  node.querySelector<HTMLButtonElement>(".followed-head")!.click();
  assert.equal(list.hidden, false);
  [...list.querySelectorAll("button")][1].click();
  assert.equal(tailed[0].handle, "tunde");
});

test("once I've called the match there's no Tail on the tile line", () => {
  const node = followedRow([call("ada")], null, null, () => undefined);
  assert.equal(node.querySelector(".followed-list button"), null);
});
