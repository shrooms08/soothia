// The reconcile sweep with a fake KV, fake RPC and fake Panta. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { BuyRecord } from "../src/buy";
import { PANTA_PROGRAM, reconcileOrders, resetReconcileState, type ReconcileDeps } from "../src/reconcile";

const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const WALLET = "G253T2aiwYAoTT45a4W26HCfwn9EP3FJsanG9bCV6t4M";
const NOW = Date.parse("2026-10-10T17:30:00Z");
const SIG_BET = "5".repeat(87);
const SIG_OLD = "4".repeat(87);
const SIG_OTHER = "3".repeat(87);

function fake(records: Record<string, BuyRecord>, createdAtMs = NOW - 10 * 60_000) {
  resetReconcileState();
  const store = new Map(Object.entries(records));
  const saves: string[] = [];
  const claimed = new Map<string, string>();
  const finished: string[] = [];
  const deps: ReconcileDeps = {
    listOrders: async () => [...store.keys()].map((orderId) => ({ orderId, createdAtMs })),
    load: async (id) => store.get(id) ?? null,
    save: async (id, record) => {
      store.set(id, record);
      saves.push(id);
    },
    taken: async (sig) => claimed.has(sig),
    claim: async (sig, id) => {
      claimed.set(sig, id);
    },
    signaturesFor: async () => [
      { signature: SIG_BET, blockTime: Math.floor((NOW - 5 * 60_000) / 1000) },
      { signature: SIG_OTHER, blockTime: Math.floor((NOW - 4 * 60_000) / 1000) },
      { signature: SIG_OLD, blockTime: Math.floor((NOW - 3 * 3600_000) / 1000) },
    ],
    transaction: async (sig) => ({
      transaction: {
        message: { accountKeys: sig === SIG_OTHER ? [WALLET, "SomeOtherProgram"] : [WALLET, PANTA_PROGRAM, MARKET] },
      },
    }),
    finish: async (record, signature) => {
      finished.push(`${record.orderId}:${signature}`);
      return { attributed: true, status: "confirmed" };
    },
    now: () => NOW,
  };
  return { deps, store, finished, claimed, saves };
}

const order = (orderId: string, extra: Partial<BuyRecord> = {}): BuyRecord => ({
  wallet: WALLET,
  marketId: MARKET,
  side: "yes",
  amountUsdc: "1.00",
  quoteId: `qt_${orderId}`,
  orderId,
  source: "blink",
  ...extra,
});

test("an order without a signature is matched to the wallet's Panta transaction on that market and reported", async () => {
  const f = fake({ ord_1: order("ord_1") });
  const report = await reconcileOrders(f.deps);
  assert.deepEqual(report.found, ["ord_1"]);
  assert.deepEqual(report.attributed, ["ord_1"]);
  assert.deepEqual(f.finished, [`ord_1:${SIG_BET}`]);
  const saved = f.store.get("ord_1")!;
  assert.equal(saved.signature, SIG_BET);
  assert.equal(saved.attributed, true);
  assert.equal(f.claimed.get(SIG_BET), "ord_1");
  assert.deepEqual(f.saves, ["ord_1"], "one write, because something changed");
});

test("a signature is claimed by one order only, and attributed or recently looked-at orders are left alone", async () => {
  const f = fake({
    ord_a: order("ord_a"),
    ord_b: order("ord_b"),
    ord_done: order("ord_done", { attributed: true, signature: SIG_OLD }),
    ord_fresh: order("ord_fresh", { reconciledAt: NOW - 60_000 }),
  });
  const report = await reconcileOrders(f.deps);
  assert.equal(report.found.length, 1, "only one order can own the bet signature");
  assert.equal(report.skipped, 1);
  assert.equal(f.finished.length, 1);
  // Second sweep right away: nothing new, nothing finished twice, and no KV writes at all.
  const writesBefore = f.saves.length;
  const again = await reconcileOrders(f.deps);
  assert.deepEqual(again.attributed, []);
  assert.equal(f.finished.length, 1);
  assert.equal(f.saves.length, writesBefore, "orders that did not change are not rewritten");
});

test("an order with a stored signature is finished directly; an old unsigned order is given up on", async () => {
  const f = fake({ ord_sig: order("ord_sig", { signature: SIG_OTHER }) });
  const report = await reconcileOrders(f.deps);
  assert.deepEqual(f.finished, [`ord_sig:${SIG_OTHER}`]);
  assert.deepEqual(report.attributed, ["ord_sig"]);
  const stale = fake({ ord_old: order("ord_old") }, NOW - 3 * 24 * 3600_000);
  const staleReport = await reconcileOrders(stale.deps);
  assert.equal(staleReport.looked, 0);
  assert.equal(stale.finished.length, 0);
});
