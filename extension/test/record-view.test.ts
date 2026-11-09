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
  assert.equal(calls[0].querySelector(".position-text")!.textContent, "Arsenal win \u00b7 70%");
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
      sign: async (_wallet, txBytes, expected) => {
        signed.push([txBytes, expected]);
        return options.sign ? options.sign() : { digest: D };
      },
    },
    api: (async (path: string, body: unknown) => {
      asked.push([path, body]);
      if (path === "/recall/record") return { ok: true, status: 200, body: record };
      if (path === "/stake/positions") return { ok: true, status: 200, body: { positions: options.positions ?? [] } };
      if (path === "/social/profile/by-address") return { ok: true, status: 200, body: { public: false } };
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

test("a staked call shows amount, side and status", async () => {
  const r = await stakeRecord({ positions: [position()] });
  assert.equal(r.line(), "Staked 0.5 SUI on Arsenal win \u00b7 Open");
  assert.equal(r.claim(), undefined);
});

test("every status on the record reads in words", async () => {
  const cases: [Record<string, unknown>, RegExp][] = [
    [{ status: "awaiting_result" }, /Awaiting result/],
    [{ status: "challenge_window", claimOpensAtMs: 1_794_200_000_000 }, /In challenge window until /],
    [{ status: "claimable", result: "won" }, /Won 0\.7 SUI/],
    [{ status: "lost", result: "lost", estimatedPayoutMist: "0" }, /Lost/],
    [{ status: "refundable", result: "refunded", estimatedPayoutMist: "500000000" }, /Refund of 0\.5 SUI ready/],
    [{ status: "claimed", result: "refunded", estimatedPayoutMist: "500000000" }, /Refunded 0\.5 SUI/],
    [{ status: "claimed", result: "won" }, /Claimed 0\.7 SUI/],
  ];
  for (const [overrides, pattern] of cases) assert.match((await stakeRecord({ positions: [position(overrides)] })).line()!, pattern);
});

test("Claim builds, checks through the wallet, and shows the payout and digest", async () => {
  const r = await stakeRecord({ positions: [position({ status: "claimable", result: "won" })] });
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
  const r = await stakeRecord({ positions: [position({ status: "refundable", result: "refunded" })] });
  assert.ok(r.claim());
});

test("cancelling a claim says nothing was claimed, and it can be retried", async () => {
  const r = await stakeRecord({
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
  const r = await stakeRecord({ positions: [position({ status: "claimable", result: "won" })], claimBuild: { ok: false, status: 409, body: { error: "not_claimable" } } });
  r.claim()!.click();
  await r.tick();
  await r.tick();
  assert.equal(r.note(), "This can't be claimed yet.");
  assert.equal(r.signed.length, 0);
});

test("with no wallet connected the record still shows the stake, without a Claim button", async () => {
  const stake = { poolId: POOL, side: "YES" as const, amountMist: "500000000", status: "claimable" as const, payoutMist: "700000000", claimOpensAtMs: null, digests: [D] };
  const r = await stakeRecord({ wallet: null, picks: [stakePick({ stake })] });
  assert.match(r.line()!, /Staked 0\.5 SUI on Arsenal win/);
  assert.equal(r.claim(), undefined);
  assert.equal(r.note(), "Connect your wallet in settings to claim.");
  assert.equal(r.asked.some(([path]) => path === "/stake/positions"), false);
  assert.equal(r.pane.querySelector(".wallet-stats"), null);
});

test("a connected wallet gets a summary at the top", async () => {
  const r = await stakeRecord({
    positions: [
      position({ status: "claimed", result: "won", amountMist: "1000000000", estimatedPayoutMist: "1500000000" }),
      position({ pickId: "p_2", status: "lost", result: "lost", amountMist: "500000000", estimatedPayoutMist: "0" }),
    ],
  });
  const text = r.pane.querySelector(".wallet-stats")?.textContent ?? "";
  for (const part of ["1.5 SUIstaked", "1.5 SUIwon", "0.5 SUIlost", "+0 SUIprofit or loss", "0.0%ROI", "1.50xbest multiplier"]) assert.ok(text.includes(part), part);
  assert.ok(r.pane.firstElementChild?.nextElementSibling?.querySelector(".wallet-stats"));
});

test("a call with no stake shows no stake line", async () => {
  assert.equal((await stakeRecord()).line(), undefined);
});
