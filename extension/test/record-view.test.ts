// The My record tab, rendered in jsdom with a fake Worker. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { ApiResponse, RecallProof, RecallRecord } from "../src/messages";
import { createRecordView, type RecordHost } from "../src/record-view";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });

const ACCOUNT = `0x${"ab".repeat(32)}`;
const OWNER = `0x${"cd".repeat(32)}`;

const emptySummary: RecallRecord["summary"] = {
  picks: 0,
  open: 0,
  resolved: 0,
  hits: 0,
  brier: null,
  marketBrier: null,
  vsMarketCalls: 0,
  calibration: [],
  entities: [],
};

const full: RecallRecord = {
  summary: {
    picks: 3,
    open: 1,
    resolved: 2,
    hits: 1,
    brier: 0.21,
    marketBrier: 0.25,
    vsMarketCalls: 2,
    calibration: [{ label: "70-79%", calls: 2, hitRate: 0.5, claimed: 0.75 }],
    entities: [{ entity: "Arsenal", calls: 2, hits: 1, brier: 0.2 }],
  },
  picks: [
    {
      id: "p_1",
      at: "2026-11-08T12:00:00.000Z",
      question: "Will Arsenal beat Chelsea?",
      pYes: 0.7,
      fixture: { home: "Arsenal", away: "Chelsea", subject: "home" },
      status: "right",
      detail: "Arsenal 2-0 Chelsea (ESPN, full time)",
      brier: 0.09,
      commit: { digest: "D1", explorerUrl: "https://suivision.xyz/txblock/D1" },
      commitSkipped: null,
    },
    {
      id: "p_2",
      at: "2026-11-08T11:00:00.000Z",
      question: "Will rates fall?",
      pYes: 0.3,
      fixture: null,
      status: "open",
      detail: null,
      brier: null,
      commit: null,
      commitSkipped: "global_cap",
    },
  ],
  lessons: [{ key: "calibration", at: "2026-11-08T12:00:00.000Z", text: "Shade your calls toward 50%.", n: 4, bias: 0.2 }],
  account: { accountId: ACCOUNT, owner: OWNER, explorerUrl: `https://suivision.xyz/object/${ACCOUNT}` },
};

function setup(answers: Record<string, ApiResponse<unknown>>, overrides: Partial<RecordHost> = {}) {
  const pane = window.document.createElement("div");
  const calls: { path: string; body: unknown }[] = [];
  const view = createRecordView(pane, {
    api: (async (path: string, body: unknown) => {
      calls.push({ path, body });
      return answers[path];
    }) as RecordHost["api"],
    layout: () => undefined,
    state: (_kind, text, ...extra) => {
      const node = window.document.createElement("div");
      node.className = "state";
      node.textContent = text;
      node.append(...extra);
      return node;
    },
    quietSites: () => [],
    unquiet: async () => true,
    ...overrides,
  });
  return { pane, view, calls };
}

const ok = (body: unknown): ApiResponse<unknown> => ({ ok: true, status: 200, body });
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

test("the record shows the headline, bars, teams, lessons and calls", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full) });
  await view.render();
  assert.equal(pane.querySelector(".record-headline")!.textContent, "3 calls · 1 right · 50% hit rate · Brier 0.210 vs market 0.250");
  assert.equal(pane.querySelector<HTMLElement>(".cal-fill.claimed")!.style.width, "75%");
  assert.equal(pane.querySelector<HTMLElement>(".cal-fill.landed")!.style.width, "50%");
  assert.equal(pane.querySelector("tbody td")!.textContent, "Arsenal");
  assert.equal(pane.querySelector(".lesson-text")!.textContent, "Shade your calls toward 50%.");
  const calls = pane.querySelectorAll(".record-call");
  assert.equal(calls[0].querySelector(".record-match")!.textContent, "Arsenal vs Chelsea");
  assert.equal(calls[0].querySelector(".position-text")!.textContent, "Arsenal to win: YES 70%");
  assert.equal(calls[1].querySelector(".record-match")!.textContent, "Will rates fall?");
  assert.match(calls[1].textContent!, /No Sui proof \(Soothia reached today's limit\)/);
});

test("the footer names the memory account and owner, with links", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full) });
  await view.render();
  const footer = pane.querySelector(".record-footer")!;
  assert.match(footer.textContent!, /^Memory on Walrus mainnet · account 0xabab…abab owned by 0xcdcd…cdcd$/);
  const links = [...footer.querySelectorAll("a")].map((link) => link.href);
  assert.deepEqual(links, [`https://suivision.xyz/object/${ACCOUNT}`, `https://suivision.xyz/account/${OWNER}`]);
});

test("Proof asks the Worker and shows the gap", async () => {
  const proof: RecallProof = {
    digest: "D1",
    verified: true,
    timestampMs: 1,
    explorerUrl: "x",
    kickoffISO: "2026-11-08T14:00:00.000Z",
    gapMs: 2 * 3_600_000 + 7 * 60_000,
    beforeKickoff: true,
  };
  const { pane, view, calls } = setup({ "/recall/record": ok(full), "/recall/proof": ok(proof) });
  await view.render();
  [...pane.querySelectorAll("button")].find((node) => node.textContent === "Proof")!.click();
  await tick();
  assert.deepEqual(calls.at(-1), { path: "/recall/proof", body: { pickId: "p_1" } });
  assert.equal(pane.querySelector(".proof-result")!.textContent, "Committed 2h 7m before kickoff ✓");
});

test("a Proof failure is reported and does not touch the rest", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full), "/recall/proof": { ok: false, status: 502, body: null } });
  await view.render();
  [...pane.querySelectorAll("button")].find((node) => node.textContent === "Proof")!.click();
  await tick();
  assert.equal(pane.querySelector(".proof-result")!.textContent, "Couldn't check the proof just now.");
  assert.equal(pane.querySelectorAll(".record-call").length, 2);
});

test("the empty state tells the user what to do", async () => {
  const { pane, view } = setup({ "/recall/record": ok({ summary: emptySummary, picks: [], lessons: [], account: null }) });
  await view.render();
  assert.equal(pane.querySelector(".state")!.textContent, "No calls yet. Open a match page and tap Call it.");
});

test("a load failure offers a retry", async () => {
  const { pane, view } = setup({ "/recall/record": { ok: false, status: 502, body: null } });
  await view.render();
  assert.match(pane.textContent!, /Couldn't load your record/);
  assert.ok([...pane.querySelectorAll("button")].some((node) => node.textContent === "Try again"));
});

test("quiet sites are listed and Undo removes them", async () => {
  const undone: string[] = [];
  const { pane, view } = setup(
    { "/recall/record": ok(full) },
    {
      quietSites: () => ["espn.com"],
      unquiet: async (site) => {
        undone.push(site);
        return true;
      },
    },
  );
  await view.render();
  assert.equal(pane.querySelector(".quiet-site")!.textContent, "espn.com");
  [...pane.querySelectorAll("button")].find((node) => node.textContent === "Undo")!.click();
  await tick();
  assert.deepEqual(undone, ["espn.com"]);
  assert.equal(pane.querySelector(".quiet-site"), null);
});
