// The pool line and Back it button on a tile. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { RecallCalled } from "../src/messages";
import type { PoolView } from "../src/stake-logic";
import type { WalletAccess } from "../src/wallet-access";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: dom.window.document });
const { createStakeRow } = await import("../src/stake-row");

const NOW = Date.parse("2026-11-20T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";
const called: RecallCalled = {
  side: "Arsenal win",
  confidence: 60,
  pickId: "p1",
  committed: true,
  pYes: 0.6,
  fixture: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" },
};
const LIMITS = { minStakeMist: "100000000", maxStakePerUserMist: "5000000000", maxPoolMist: "50000000000" };
const pool: PoolView = {
  exists: true,
  poolId: "0xp",
  status: "open",
  closeMs: Date.parse(KICKOFF),
  yesTotal: "3200000000",
  noTotal: "1100000000",
  feeBps: 100,
  limits: LIMITS,
};
const WALLET = { address: "0xabc", walletId: "slush", walletName: "Slush" };

function row(options: { pool?: PoolView | null; held?: string; wallet?: typeof WALLET | null } = {}) {
  const asked: [string, unknown][] = [];
  const backed: RecallCalled[] = [];
  const wallet = {
    current: async () => (options.wallet === undefined ? WALLET : options.wallet),
  } as unknown as WalletAccess;
  const view = createStakeRow(
    {
      wallet,
      layout: () => undefined,
      onBack: (value) => backed.push(value),
      now: () => NOW,
      api: async <T>(path: string, body: unknown) => {
        asked.push([path, body]);
        if (path === "/stake/positions")
          return {
            ok: true,
            status: 200,
            body: { positions: options.held ? [{ pickId: "p1", amountMist: options.held }] : [] } as T,
          };
        return options.pool === null
          ? { ok: false, status: 502, body: null }
          : { ok: true, status: 200, body: (options.pool ?? pool) as T };
      },
    },
    called,
  );
  const line = () => view.node.querySelector(".stake-line")?.textContent;
  const action = () => view.node.querySelector("button") as HTMLButtonElement;
  return { view, asked, backed, line, action };
}

test("nothing shows or loads until the card asks", () => {
  const r = row();
  assert.equal(r.view.node.hidden, true);
  assert.equal(r.asked.length, 0);
});

test("the pool line and Back it show, using the call's match", async () => {
  const r = row();
  await r.view.refresh();
  assert.equal(r.view.node.hidden, false);
  assert.equal(r.line(), "Pool: 3.2 SUI on Arsenal win · 1.1 SUI against · pays 1.33x");
  assert.equal(r.action().textContent, "Back it");
  assert.deepEqual(r.asked.find(([path]) => path === "/stake/pool")?.[1], {
    fixture: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF },
    subject: "away",
  });
  r.action().click();
  assert.deepEqual(r.backed, [called]);
});

test("no pool yet invites the first stake", async () => {
  const r = row({ pool: { ...pool, exists: false, poolId: null, status: null, yesTotal: "0", noTotal: "0" } });
  await r.view.refresh();
  assert.equal(r.line(), "No pool yet. Be the first to back it.");
});

test("no wallet means no positions lookup", async () => {
  const r = row({ wallet: null });
  await r.view.refresh();
  assert.equal(
    r.asked.some(([path]) => path === "/stake/positions"),
    false,
  );
  assert.equal(r.action().textContent, "Back it");
});

test("a stake already made shows instead, with a top-up under the limit", async () => {
  const r = row({ held: "1000000000" });
  await r.view.refresh();
  assert.equal(r.line(), "You backed 1 SUI · pays ~1.33x");
  assert.equal(r.action().textContent, "Top up");
  assert.equal(r.action().hidden, false);
});

test("no top-up at the limit", async () => {
  const r = row({ held: "5000000000" });
  await r.view.refresh();
  assert.match(r.line()!, /^You backed 5 SUI/);
  assert.equal(r.action().hidden, true);
});

test("a pool that closed or failed to load hides the row", async () => {
  for (const options of [
    { pool: null },
    { pool: { ...pool, status: "void" as const } },
    { pool: { ...pool, closeMs: NOW + 1000 } },
  ]) {
    const r = row(options);
    await r.view.refresh();
    assert.equal(r.view.node.hidden, true);
  }
});
