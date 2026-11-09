// The My record tab, rendered in jsdom with a fake Worker. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { ApiResponse, RecallProof, RecallRecord } from "../src/messages";
import { calledRow, createRecordView, type RecordHost } from "../src/record-view";

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

const named = (pane: Element, label: string) => [...pane.querySelectorAll("button")].find((node) => node.textContent === label) as HTMLButtonElement;

async function shown(answers: Record<string, ApiResponse<unknown>>, section: "Calls" | "Lessons" | "Wallet" | "Me", overrides: Partial<RecordHost> = {}) {
  const made = setup(answers, overrides);
  await made.view.render();
  if (section !== "Calls") named(made.pane, section).click();
  return made;
}

test("the header shows the score, and the sections are one tap apart", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full) });
  await view.render();
  assert.equal(pane.querySelector(".record-who")!.textContent, "Private");
  assert.equal(pane.querySelector(".record-tally")!.textContent, "1 of 2 right");
  assert.deepEqual([...pane.querySelectorAll(".record-segment")].map((node) => node.textContent), ["Calls", "Lessons", "Wallet", "Me"]);
  assert.equal(pane.querySelector(".record-segment.selected")!.textContent, "Calls");
});

test("no main view uses the jargon", async () => {
  for (const section of ["Calls", "Lessons", "Wallet", "Me"] as const) {
    const { pane } = await shown({ "/recall/record": ok(full) }, section);
    for (const details of pane.querySelectorAll("details")) details.remove();
    for (const word of [/brier/i, /calibration bucket/i, /namespace/i, /memory account/i]) assert.doesNotMatch(pane.textContent!, word, `${section}: ${word}`);
  }
});

test("collapsed rows show only the match, date, lean and icon", async () => {
  const { pane } = await shown({ "/recall/record": ok(full) }, "Calls");
  const rows = pane.querySelectorAll(".call-row");
  assert.equal(rows.length, 2);
  assert.equal(pane.querySelector(".call-detail"), null);
  const settled = [...rows].find((row) => row.querySelector(".call-icon"))!;
  assert.equal(settled.querySelector(".call-icon")!.textContent, "\u2713");
  assert.equal(settled.querySelector(".call-match")!.textContent, "Arsenal v Chelsea");
  assert.equal(settled.querySelector(".call-lean")!.textContent, "Arsenal win \u00b7 70%");
  assert.doesNotMatch(settled.textContent!, /Proof|2-0/);
});

test("tapping a row expands it with confidence, result and proof", async () => {
  const { pane } = await shown({ "/recall/record": ok(full) }, "Calls");
  const head = [...pane.querySelectorAll<HTMLButtonElement>(".call-row-head")].find((node) => node.textContent!.includes("Arsenal"))!;
  head.click();
  const detail = pane.querySelector(".call-detail")!;
  assert.match(detail.textContent!, /Arsenal win \u00b7 70% confident/);
  assert.match(detail.textContent!, /Arsenal 2-0 Chelsea \(ESPN, full time\)/);
  assert.ok(named(pane, "Proof on Sui"));
  [...pane.querySelectorAll<HTMLButtonElement>(".call-row-head")].find((node) => node.textContent!.includes("Arsenal"))!.click();
  assert.equal(pane.querySelector(".call-detail"), null);
});

test("an uncommitted call says why it has no proof", async () => {
  const { pane } = await shown({ "/recall/record": ok(full) }, "Calls");
  [...pane.querySelectorAll<HTMLButtonElement>(".call-row-head")].find((node) => node.textContent!.includes("rates"))!.click();
  assert.match(pane.querySelector(".call-detail")!.textContent!, /No Sui proof \(Soothia reached today's limit\)/);
});

const settledPick = (i: number) => ({ ...full.picks[0], id: `s${i}`, fixture: { home: `H${i}`, away: "A", subject: "home" as const, startISO: new Date(Date.UTC(2026, 10, 1 + i)).toISOString() } });

test("settled calls show 10, newest first, then Show more", async () => {
  const picks = Array.from({ length: 12 }, (_, i) => settledPick(i));
  const { pane } = await shown({ "/recall/record": ok({ ...full, picks }) }, "Calls");
  assert.equal(pane.querySelectorAll(".call-row").length, 10);
  assert.equal(pane.querySelector(".call-match")!.textContent, "H11 v A");
  named(pane, "Show more").click();
  assert.equal(pane.querySelectorAll(".call-row").length, 12);
  assert.equal(named(pane, "Show more"), undefined);
});

test("Proof asks the Worker and shows the gap", async () => {
  const proof: RecallProof = { digest: "D1", verified: true, timestampMs: 1, explorerUrl: "x", kickoffISO: "2026-11-08T14:00:00.000Z", gapMs: 2 * 3_600_000 + 7 * 60_000, beforeKickoff: true };
  const { pane, calls } = await shown({ "/recall/record": ok(full), "/recall/proof": ok(proof) }, "Calls");
  [...pane.querySelectorAll<HTMLButtonElement>(".call-row-head")].find((node) => node.textContent!.includes("Arsenal"))!.click();
  named(pane, "Proof on Sui").click();
  await tick();
  assert.deepEqual(calls.at(-1), { path: "/recall/proof", body: { pickId: "p_1" } });
  assert.equal(pane.querySelector(".proof-result")!.textContent, "Committed 2h 7m before kickoff \u2713");
});

test("a Proof failure is reported and does not touch the rest", async () => {
  const { pane } = await shown({ "/recall/record": ok(full), "/recall/proof": { ok: false, status: 502, body: null } }, "Calls");
  [...pane.querySelectorAll<HTMLButtonElement>(".call-row-head")].find((node) => node.textContent!.includes("Arsenal"))!.click();
  named(pane, "Proof on Sui").click();
  await tick();
  assert.equal(pane.querySelector(".proof-result")!.textContent, "Couldn't check the proof just now.");
  assert.equal(pane.querySelectorAll(".call-row").length, 2);
});

test("an empty record still has its header and tells the user what to do", async () => {
  const { pane } = await shown({ "/recall/record": ok({ summary: emptySummary, picks: [], lessons: [], account: null }) }, "Calls");
  assert.equal(pane.querySelector(".record-score")!.textContent, "\u2014");
  assert.match(pane.textContent!, /Needs 1 settled call/);
  assert.equal(pane.querySelector(".state")!.textContent, "No calls yet. Open a match page and tap Call it.");
});

test("a load failure offers a retry", async () => {
  const { pane, view } = setup({ "/recall/record": { ok: false, status: 502, body: null } });
  await view.render();
  assert.match(pane.textContent!, /Couldn't load your record/);
  assert.ok(named(pane, "Try again"));
});

test("Lessons show lessons, the plain chart and the two expanders", async () => {
  const { pane } = await shown({ "/recall/record": ok(full) }, "Lessons");
  assert.equal(pane.querySelector(".lesson-text")!.textContent, "Shade your calls toward 50%.");
  assert.equal(pane.querySelector(".cal-label")!.textContent, "When you say ~75%, you're right 50%");
  assert.equal(pane.querySelector<HTMLElement>(".cal-fill.claimed")!.style.width, "75%");
  assert.equal(pane.querySelector<HTMLElement>(".cal-fill.landed")!.style.width, "50%");
  const titles = [...pane.querySelectorAll("summary")].map((node) => node.textContent);
  assert.deepEqual(titles, ["How Soothia learns", "More numbers"]);
  const more = [...pane.querySelectorAll("details")].at(-1)!;
  assert.match(more.textContent!, /Brier 0\.210/);
  assert.equal(more.querySelector("tbody td")!.textContent, "Arsenal");
});

test("Me has the footer with its details in an expander", async () => {
  const { pane } = await shown({ "/recall/record": ok(full) }, "Me");
  const details = [...pane.querySelectorAll("details")].at(-1)!;
  assert.equal(details.querySelector("summary")!.textContent, "Calls stored on Walrus \u00b7 proofs on Sui");
  const links = [...details.querySelectorAll("a")].map((link) => link.href);
  assert.ok(links.includes(`https://suivision.xyz/object/${ACCOUNT}`));
  assert.ok(links.includes(`https://suivision.xyz/account/${OWNER}`));
  assert.equal(links.filter((link) => link.includes("/package/")).length, 2);
});

test("Me lists quiet sites and Undo removes them", async () => {
  const undone: string[] = [];
  const { pane } = await shown({ "/recall/record": ok(full) }, "Me", {
    quietSites: () => ["espn.com"],
    unquiet: async (site) => {
      undone.push(site);
      return true;
    },
  });
  assert.equal(pane.querySelector(".quiet-site")!.textContent, "espn.com");
  named(pane, "Undo").click();
  await tick();
  assert.deepEqual(undone, ["espn.com"]);
  assert.equal(pane.querySelector(".quiet-site"), null);
});

test("Me holds the Link record field", async () => {
  const field = window.document.createElement("div");
  field.className = "the-link-field";
  const { pane } = await shown({ "/recall/record": ok(full) }, "Me", { linkRecord: () => field });
  assert.ok(pane.querySelector(".the-link-field"));
});

test("the last section is remembered and restored", async () => {
  const saved: string[] = [];
  const first = await shown({ "/recall/record": ok(full) }, "Lessons", { saveSection: (section) => saved.push(section) });
  assert.deepEqual(saved, ["lessons"]);
  assert.ok(first);
  const { pane, view } = setup({ "/recall/record": ok(full) }, { loadSection: async () => "me" });
  await view.render();
  assert.equal(pane.querySelector(".record-segment.selected")!.textContent, "Me");
});

test("a saved section that makes no sense falls back to Calls", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full) }, { loadSection: async () => "nonsense" });
  await view.render();
  assert.equal(pane.querySelector(".record-segment.selected")!.textContent, "Calls");
});

test("the attention strip opens its section", async () => {
  const lesson = { key: "favourites", at: new Date().toISOString(), text: "Your strong calls come in. More.", n: 6 };
  const { pane, view } = setup({ "/recall/record": ok({ ...full, lessons: [lesson] }) });
  await view.render();
  const item = pane.querySelector<HTMLButtonElement>(".record-attention-item")!;
  assert.equal(item.textContent, "New lesson: Your strong calls come in");
  item.click();
  assert.equal(pane.querySelector(".record-segment.selected")!.textContent, "Lessons");
});

test("no strip when nothing needs attention", async () => {
  const { pane, view } = setup({ "/recall/record": ok({ ...full, lessons: [] }) });
  await view.render();
  assert.equal(pane.querySelector(".record-attention"), null);
});

test("the Go public link in the header opens Me", async () => {
  const { pane, view } = setup({ "/recall/record": ok(full) });
  await view.render();
  named(pane, "Go public").click();
  assert.equal(pane.querySelector(".record-segment.selected")!.textContent, "Me");
});

test("a called tile shows the call and a Proof link that works", async () => {
  const proof = { digest: "D", verified: true, timestampMs: 1, explorerUrl: "x", kickoffISO: "k", gapMs: 3_600_000, beforeKickoff: true };
  const calls: unknown[] = [];
  const row = calledRow(
    { side: "Arsenal win", confidence: 60, pickId: "p_1", committed: true },
    {
      api: (async (_path: string, body: unknown) => {
        calls.push(body);
        return ok(proof);
      }) as RecordHost["api"],
      layout: () => undefined,
    },
  );
  assert.equal(row.querySelector(".called-badge")!.textContent, "Your call: Arsenal win \u00b7 60%");
  row.querySelector("button")!.click();
  await tick();
  assert.deepEqual(calls, [{ pickId: "p_1" }]);
  assert.equal(row.querySelector(".proof-result")!.textContent, "Committed 1h 0m before kickoff \u2713");
});

test("a called tile with no commit has no Proof link", () => {
  const row = calledRow({ side: "YES", confidence: 80, pickId: "p_2", committed: false }, { api: (async () => ok({})) as RecordHost["api"], layout: () => undefined });
  assert.equal(row.querySelector("button"), null);
  assert.equal(row.textContent, "Your call: YES \u00b7 80%");
});

// ---- staking on the record ----

const STAKER = `0x${"aa".repeat(32)}`;
const POOL = `0x${"bb".repeat(32)}`;
const CONNECTED = { address: STAKER, walletId: "slush", walletName: "Slush" };
const D = "8teWqYrBWopnhq2Wy22BQq1uvzepDoUzDzdRA6oE8iY";

const stakePick = (overrides: Partial<RecallRecord["picks"][number]> = {}): RecallRecord["picks"][number] => ({
  id: "p_1",
  at: "2026-11-08T12:00:00.000Z",
  question: "Will Arsenal beat Chelsea?",
  pYes: 0.7,
  fixture: { home: "Arsenal", away: "Chelsea", subject: "home" },
  status: "open",
  detail: null,
  brier: null,
  commit: { digest: "D1", explorerUrl: "https://suivision.xyz/txblock/D1" },
  commitSkipped: null,
  ...overrides,
});

const position = (overrides: Record<string, unknown> = {}) => ({
  poolId: POOL,
  pickId: "p_1",
  match: { home: "Arsenal", away: "Chelsea", startISO: "x", subject: "home" },
  side: "YES",
  status: "open",
  amountMist: "500000000",
  estimatedPayoutMist: "700000000",
  claimOpensAtMs: null,
  result: null,
  ...overrides,
});

interface StakeHarnessOptions {
  picks?: RecallRecord["picks"];
  positions?: unknown[];
  wallet?: typeof CONNECTED | null;
  claimBuild?: ApiResponse<unknown>;
  sign?: () => Promise<{ digest: string }>;
  isPublic?: { handle: string; score: number };
}

async function stakeRecord(options: StakeHarnessOptions = {}) {
  const pane = window.document.createElement("div");
  const asked: [string, unknown][] = [];
  const signed: unknown[] = [];
  const record: RecallRecord = { ...full, picks: options.picks ?? [stakePick()], lessons: [], account: null };
  const host: RecordHost = {
    layout: () => undefined,
    state: (_kind, text) => {
      const node = window.document.createElement("p");
      node.textContent = text;
      return node;
    },
    quietSites: () => [],
    unquiet: async () => true,
    wallet: {
      current: async () => (options.wallet === undefined ? CONNECTED : options.wallet),
      connect: async () => null,
      signMessage: async () => ({ signature: "S" }),
      signOnly: async () => ({ bytes: "B", signature: "S" }),
      sign: async (_wallet, txBytes, expected) => {
        signed.push([txBytes, expected]);
        return options.sign ? options.sign() : { digest: D };
      },
    },
    api: (async (path: string, body: unknown) => {
      asked.push([path, body]);
      if (path === "/recall/record") return { ok: true, status: 200, body: record };
      if (path === "/stake/positions") return { ok: true, status: 200, body: { positions: options.positions ?? [] } };
      if (path === "/social/profile/by-address") return { ok: true, status: 200, body: options.isPublic ? { public: true, profile: { handle: options.isPublic.handle }, score: options.isPublic.score } : { public: false } };
      if (path === "/social/suins") return { ok: true, status: 200, body: { suggestion: null } };
      if (path === "/stake/claim/build") return options.claimBuild ?? { ok: true, status: 200, body: { txBytes: "BYTES" } };
      return { ok: false, status: 404, body: null };
    }) as RecordHost["api"],
  };
  await createRecordView(pane, host).render();
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const claim = () => [...pane.querySelectorAll("button")].find((node) => node.textContent === "Claim");
  return { pane, asked, signed, tick, claim, line: () => pane.querySelector(".stake-text")?.textContent, note: () => pane.querySelector(".stake-claim-note")?.textContent };
}

const inWallet = async (options: StakeHarnessOptions) => {
  const r = await stakeRecord(options);
  named(r.pane, "Wallet").click();
  return r;
};

test("a staked call adds its amount to the row, and the rest when expanded", async () => {
  const r = await stakeRecord({ positions: [position()] });
  assert.equal(r.pane.querySelector(".call-lean")!.textContent, "Arsenal win \u00b7 70% \u00b7 0.5 SUI");
  r.pane.querySelector<HTMLButtonElement>(".call-row-head")!.click();
  assert.match(r.pane.querySelector(".call-detail")!.textContent!, /Staked 0\.5 SUI on Arsenal win \u00b7 Open \u00b7 about 0\.7 SUI if right/);
});

test("every status reads in words in the Wallet list", async () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ status: "awaiting_result" }, /Awaiting result/],
    [{ status: "challenge_window", claimOpensAtMs: 1_794_200_000_000 }, /In challenge window until /],
    [{ status: "claimable", result: "won" }, /Won 0\.7 SUI/],
    [{ status: "lost", result: "lost", estimatedPayoutMist: "0" }, /Lost/],
    [{ status: "refundable", result: "refunded", estimatedPayoutMist: "500000000" }, /Refund of 0\.5 SUI ready/],
    [{ status: "claimed", result: "refunded", estimatedPayoutMist: "500000000" }, /Refunded 0\.5 SUI/],
    [{ status: "claimed", result: "won" }, /Claimed 0\.7 SUI/],
  ];
  for (const [overrides, pattern] of cases) {
    const r = await inWallet({ positions: [position(overrides)] });
    assert.match([...r.pane.querySelectorAll(".stake-text")].at(-1)!.textContent!, pattern);
  }
});

test("Claim is first in Wallet, and builds, signs and shows the payout and digest", async () => {
  const r = await inWallet({ positions: [position({ status: "claimable", result: "won" })] });
  assert.equal(r.pane.querySelector(".record-section .field-label")!.textContent, "Ready to claim");
  r.claim()!.click();
  await r.tick();
  await r.tick();
  assert.deepEqual(r.asked.find(([path]) => path === "/stake/claim/build")?.[1], { poolId: POOL, sender: STAKER });
  assert.deepEqual(r.signed, [["BYTES", { kind: "claim", poolId: POOL }]]);
  assert.match(r.note()!, /Claimed 0\.7 SUI\. Proof:/);
  assert.equal(r.pane.querySelector<HTMLAnchorElement>(".stake-claim-note a")?.href, `https://suivision.xyz/txblock/${D}`);
  assert.equal(r.claim()!.hidden, true);
});

test("a refund is claimed the same way", async () => {
  assert.ok((await inWallet({ positions: [position({ status: "refundable", result: "refunded" })] })).claim());
});

test("cancelling a claim says nothing was claimed, and it can be retried", async () => {
  const r = await inWallet({
    positions: [position({ status: "claimable", result: "won" })],
    sign: async () => {
      throw new Error("User rejected");
    },
  });
  r.claim()!.click();
  await r.tick();
  await r.tick();
  assert.equal(r.note(), "You cancelled in your wallet. Nothing was claimed.");
  assert.equal(r.claim()!.disabled, false);
});

test("a claim the Worker refuses never reaches the wallet", async () => {
  const r = await inWallet({ positions: [position({ status: "claimable", result: "won" })], claimBuild: { ok: false, status: 409, body: { error: "not_claimable" } } });
  r.claim()!.click();
  await r.tick();
  await r.tick();
  assert.equal(r.note(), "This can't be claimed yet.");
  assert.equal(r.signed.length, 0);
});

test("with no wallet connected, Wallet is just the button and one sentence", async () => {
  const stake = { poolId: POOL, side: "YES" as const, amountMist: "500000000", status: "claimable" as const, payoutMist: "700000000", claimOpensAtMs: null, digests: [D] };
  const r = await inWallet({ wallet: null, picks: [stakePick({ stake })] });
  assert.ok(named(r.pane, "Connect Sui wallet"));
  assert.equal(r.claim(), undefined);
  assert.equal(r.pane.querySelector(".wallet-stats"), null);
  assert.equal(r.asked.some(([path]) => path === "/stake/positions"), false);
});

test("a connected wallet gets the stats grid", async () => {
  const r = await inWallet({
    positions: [
      position({ status: "claimed", result: "won", amountMist: "1000000000", estimatedPayoutMist: "1500000000" }),
      position({ pickId: "p_2", status: "lost", result: "lost", amountMist: "500000000", estimatedPayoutMist: "0" }),
    ],
  });
  const text = r.pane.querySelector(".wallet-stats")?.textContent ?? "";
  for (const part of ["1.5 SUIstaked", "1.5 SUIwon", "0.5 SUIlost", "+0 SUIprofit or loss", "0.0%ROI", "1.50xbest multiplier"]) assert.ok(text.includes(part), part);
});

test("a connected wallet with no stakes says so", async () => {
  assert.match((await inWallet({})).pane.textContent!, /No stakes from this wallet yet/);
});

test("a call with no stake shows no amount", async () => {
  assert.equal((await stakeRecord()).pane.querySelector(".call-lean")!.textContent, "Arsenal win \u00b7 70%");
});

test("the header says public, and carries profit once staked", async () => {
  const r = await stakeRecord({ positions: [position()], isPublic: { handle: "amy", score: 612 } });
  assert.equal(r.pane.querySelector(".record-who")!.textContent, "@amy \u00b7 Public");
  assert.equal(r.pane.querySelector(".record-score")!.textContent, "612");
  assert.equal(named(r.pane, "Go public"), undefined);
  assert.equal(r.pane.querySelector(".record-tally")!.textContent, "1 of 2 right \u00b7 +0.0 SUI");
});
