// The Call it sheet, rendered in jsdom with a fake Worker. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { openCallSheet, type CallHost } from "../src/call-sheet";
import type { ApiResponse, FixtureSignal, RecallPickBody, RecallSavedPick, Tile } from "../src/messages";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });

const FIXTURE: FixtureSignal = {
  home: "Arsenal",
  away: "Chelsea",
  startISO: "2026-11-21T15:00:00.000Z",
  dateLabel: "Sat 21 Nov",
  sourceUrl: "https://espn.com/x",
  evidence: [],
};

const fixtureTile = (): Tile => ({
  claim: {
    id: "c1",
    question: "Will Arsenal beat Chelsea on Sat 21 Nov?",
    category: "sports",
    endTime: "2026-11-21T18:00:00.000Z",
    resolution: { type: "sports_result", details: "", sources: [] },
    confidence: 0.8,
    sourceQuote: "",
    fromFixture: true,
  },
});

function setup(answer: ApiResponse<unknown>, overrides: Partial<CallHost> = {}) {
  const sent: { path: string; body: RecallPickBody }[] = [];
  const locked: RecallSavedPick[] = [];
  const sheet = openCallSheet({
    tile: fixtureTile(),
    page: { site: "espn.com", url: "https://www.espn.com/match" },
    fixture: FIXTURE,
    shrink: 1,
    calibrationBias: async () => null,
    api: (async (path: string, body: RecallPickBody) => {
      sent.push({ path, body });
      return answer;
    }) as CallHost["api"],
    layout: () => undefined,
    back: () => undefined,
    locked: (pick) => locked.push(pick),
    ...overrides,
  });
  const q = <T extends Element>(selector: string): T => sheet.node.querySelector<T>(selector)!;
  const lock = async (): Promise<void> => {
    q<HTMLButtonElement>(".button.buy").click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  };
  return { sheet, sent, locked, q, lock };
}

const saved = (over: Partial<RecallSavedPick>): ApiResponse<RecallSavedPick> => ({
  ok: true,
  status: 200,
  body: { id: "p_1", at: "2026-11-08T00:00:00.000Z", pYes: 0.6, commit: null, ...over },
});

function setSlider(input: HTMLInputElement, value: number): void {
  input.value = String(value);
  input.dispatchEvent(new window.Event("input"));
}

test("locking sends the chosen side as pYes, with the match", async () => {
  const { sent, q, lock } = setup(saved({ commit: { digest: "D1", network: "mainnet" } }));
  q<HTMLButtonElement>(".side-no").click();
  setSlider(q<HTMLInputElement>(".call-slider"), 75);
  assert.equal(q(".call-value").textContent, "NO 75%");
  await lock();
  const pick = sent.find(({ path }) => path === "/recall/pick")!;
  assert.equal(pick.body.pYes, 0.25);
  assert.equal(pick.body.fixture?.subject, "home");
  assert.equal(pick.body.source.site, "espn.com");
});

test("a committed call shows the Sui link", async () => {
  const { q, lock, locked } = setup(saved({ commit: { digest: "D1", network: "mainnet" } }));
  await lock();
  assert.match(q(".outcome").textContent!, /Locked on Sui · remembered on Walrus/);
  assert.equal(q<HTMLAnchorElement>(".outcome a").href, "https://suivision.xyz/txblock/D1");
  assert.equal(locked.length, 1);
});

test("a skipped commit says why in plain words", async () => {
  const { q, lock } = setup(saved({ commitSkipped: "user_cap" }));
  await lock();
  assert.equal(q(".outcome .question").textContent, "Saved to Walrus. Sui proof skipped (you reached today's limit).");
});

test("a commit that failed without a reason says so honestly", async () => {
  const { q, lock } = setup(saved({}));
  await lock();
  assert.match(q(".outcome").textContent!, /Saved to Walrus\. The Sui proof didn't go through/);
});

test("a duplicate says so and cannot be retried", async () => {
  const { q, lock } = setup({ ok: false, status: 409, body: { error: "duplicate_pick" } });
  await lock();
  assert.equal(q(".status-line").textContent, "You already called this.");
  assert.equal(q<HTMLButtonElement>(".button.buy").disabled, true);
});

test("a server failure offers a retry", async () => {
  const { q, lock } = setup({ ok: false, status: 502, body: { error: "recall_unavailable" } });
  await lock();
  assert.equal(q(".button.buy").textContent, "Try again");
  assert.equal(q<HTMLButtonElement>(".button.buy").disabled, false);
});

test("no nudge when the user is calibrated", () => {
  const { q } = setup(saved({}));
  assert.equal(q<HTMLElement>(".call-nudge").hidden, true);
});

test("the nudge suggests a shaded percent and Use applies it", async () => {
  const { q } = setup(saved({}), { shrink: 0.8, calibrationBias: async () => 0.2 });
  setSlider(q<HTMLInputElement>(".call-slider"), 80);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(q(".call-nudge .note").textContent, "You run 20 points overconfident. Soothia suggests 74%.");
  const use = q<HTMLButtonElement>(".call-nudge .link");
  assert.equal(use.textContent, "Use 74%");
  use.click();
  assert.equal(q<HTMLInputElement>(".call-slider").value, "74");
  assert.equal(q(".call-value").textContent, "YES 74%");
});

test("a fixture claim with no upcoming match cannot be locked", async () => {
  const { sent, q } = setup(saved({}), { fixture: null });
  assert.equal(q<HTMLButtonElement>(".button.buy").disabled, true);
  assert.match(q(".status-line").textContent!, /calls are closed/);
  assert.equal(sent.length, 0);
});

const PREFILL = { side: "no" as const, percent: 70, tailOf: "ada" };
const SAVED: RecallSavedPick = { id: "p1", at: "x", pYes: 0.3, commit: { digest: "d", network: "mainnet" }, fixture: { home: "Arsenal", away: "Chelsea", startISO: "2026-11-21T15:00:00.000Z", subject: "home" } };
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const named = (node: Element, label: string) => [...node.querySelectorAll("button")].find((item) => item.textContent === label) as HTMLButtonElement;

test("a tail starts from their side and confidence, and says whose it is", () => {
  const { sheet } = setup({ ok: true, status: 200, body: SAVED }, { prefill: PREFILL });
  assert.equal(sheet.node.querySelector(".tail-label")!.textContent, "Tail of @ada");
  assert.equal(sheet.node.querySelector(".call-value")!.textContent, "NO 70%");
  assert.equal(sheet.node.querySelector<HTMLInputElement>(".call-slider")!.value, "70");
});

test("a tail sends its handle, and no flip when the side is kept", async () => {
  const { sheet, sent } = setup({ ok: true, status: 200, body: SAVED }, { prefill: PREFILL });
  sheet.trigger!();
  await tick();
  assert.equal(sent[0].body.tailOf, "ada");
  assert.equal(sent[0].body.tailFlip, undefined);
  assert.equal(sent[0].body.pYes, 0.3);
});

test("changing the side of a tail sends an explicit flip", async () => {
  const { sheet, sent } = setup({ ok: true, status: 200, body: SAVED }, { prefill: PREFILL });
  sheet.node.querySelector<HTMLButtonElement>(".side-yes")!.click();
  sheet.trigger!();
  await tick();
  assert.equal(sent[0].body.tailFlip, true);
  assert.equal(sent[0].body.pYes, 0.7);
});

test("a normal call has no tail fields", async () => {
  const { sheet, sent } = setup({ ok: true, status: 200, body: SAVED });
  assert.equal(sheet.node.querySelector(".tail-label"), null);
  sheet.trigger!();
  await tick();
  assert.equal("tailOf" in sent[0].body, false);
});

test("after locking a tail, Back it is offered with the new call", async () => {
  const offered: unknown[] = [];
  const { sheet } = setup({ ok: true, status: 200, body: SAVED }, { prefill: PREFILL, offerBack: (called) => offered.push(called) });
  sheet.trigger!();
  await tick();
  named(sheet.node, "Back it").click();
  assert.equal((offered[0] as { pickId: string }).pickId, "p1");
});

test("no proof on Sui means no Back it", async () => {
  const { sheet } = setup({ ok: true, status: 200, body: { ...SAVED, commit: null } }, { prefill: PREFILL, offerBack: () => undefined });
  sheet.trigger!();
  await tick();
  assert.equal(named(sheet.node, "Back it"), undefined);
});

test("a refused tail explains itself", async () => {
  const { sheet } = setup({ ok: false, status: 404, body: { error: "tail_source_not_found" } }, { prefill: PREFILL });
  sheet.trigger!();
  await tick();
  assert.match(sheet.node.querySelector(".status-line")!.textContent!, /no longer in their feed/);
});
