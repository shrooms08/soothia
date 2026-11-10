// Regression tests for the security audit (docs/security-audit.md). Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { Inputs, Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { PAY_CONFIG, PAY_PACKAGE, STAKE_CONFIG, STAKE_PACKAGE } from "../src/config";
import { agentCandidates, DEFAULT_AGENT_SETTINGS, type PremiumCallResponse } from "../src/premium-logic";
import type { LockedFeedItem } from "../src/social-logic";
import { walletErrorText } from "../src/stake-logic";
import { checkTransaction } from "../src/tx-check";
import { createWalletAccess } from "../src/wallet-access";
import { isWalletSite, UNTRUSTED_SITE, untrustedSiteBridge } from "../src/wallet-site";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });
const { externalLink } = await import("../src/dom");

const SENDER = `0x${"aa".repeat(32)}`;
const SELLER = `0x${"bb".repeat(32)}`;
const POOL = `0x${"cc".repeat(32)}`;
const GAS = { objectId: `0x${"dd".repeat(32)}`, version: "1", digest: "11111111111111111111111111111111" };
const NONCE = "00112233445566778899aabbccddeeff";
const shared = (tx: Transaction, objectId: string) =>
  tx.object(Inputs.SharedObjectRef({ objectId, initialSharedVersion: "1", mutable: true }));

async function finish(tx: Transaction, sender: string, budget: number): Promise<string> {
  tx.setSender(sender);
  tx.setGasBudget(budget);
  tx.setGasPrice(1000);
  tx.setGasPayment([GAS]);
  return toBase64(await tx.build());
}

// ---- X-1: wallets only on trusted sites ----

test("wallets work only on soothia.fun and ESPN, not on look-alikes", () => {
  for (const host of ["soothia.fun", "www.soothia.fun", "www.espn.com", "africa.espn.com", "espn.com"])
    assert.equal(isWalletSite(host), true, host);
  for (const host of ["evil.example", "espn.com.evil.example", "notespn.com", "soothia.fun.evil.example", "", null])
    assert.equal(isWalletSite(host), false, String(host));
});

test("on other sites the bridge never runs and says why", async () => {
  await assert.rejects(untrustedSiteBridge.call("connect", { walletId: "slush" }), new RegExp(UNTRUSTED_SITE));
  assert.match(walletErrorText(UNTRUSTED_SITE).text, /only on soothia\.fun and ESPN/);
});

test("a connected wallet remembers the site it was connected on", async () => {
  const saved: unknown[] = [];
  const bridge = {
    call: async (method: string) =>
      method === "list" ? [{ id: "slush", name: "Slush" }] : { address: SENDER, walletName: "Slush" },
  };
  Object.assign(globalThis, { location: { hostname: "www.espn.com" } });
  try {
    const access = createWalletAccess(
      bridge as never,
      { read: async () => null, write: async (value: unknown) => void saved.push(value) } as never,
      async () => ({ ok: true }),
    );
    await access.connect(async () => null);
  } finally {
    delete (globalThis as { location?: unknown }).location;
  }
  assert.deepEqual(saved[0], { address: SENDER, walletId: "slush", walletName: "Slush", site: "www.espn.com" });
});

// ---- X-2 and the withdraw guard: the agent with a fake chrome.storage ----

const store = new Map<string, unknown>();
Object.assign(globalThis, {
  chrome: {
    storage: {
      local: {
        get: async (key: string) => (store.has(key) ? { [key]: store.get(key) } : {}),
        set: async (values: Record<string, unknown>) =>
          Object.entries(values).forEach(([key, value]) => store.set(key, value)),
      },
    },
  },
});
const { createAgent } = await import("../src/agent");

const KICKOFF = "2030-01-01T15:00:00.000Z";
const lockedItem = (pickId: string): LockedFeedItem => ({
  pickId,
  fixture: { home: "A", away: "B", competition: null, startISO: KICKOFF },
  at: "2026-11-10T10:00:00.000Z",
  premium: { priceMist: "10000000" },
  proof: { digest: "D", url: "https://suivision.xyz" },
  locked: true,
});
const requirement = btoa(
  JSON.stringify({
    x402Version: 2,
    resource: {},
    accepts: [
      {
        scheme: "exact",
        network: "sui:mainnet",
        amount: "10000000",
        asset: "0x2::sui::SUI",
        payTo: SELLER,
        maxTimeoutSeconds: 300,
        extra: { payPackage: PAY_PACKAGE, payConfig: PAY_CONFIG, nonce: NONCE },
      },
    ],
  }),
);

async function payFor(sender: string): Promise<string> {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [10_000_000n]);
  tx.moveCall({
    target: `${PAY_PACKAGE}::pay::pay`,
    arguments: [
      shared(tx, PAY_CONFIG),
      tx.pure.vector(
        "u8",
        NONCE.match(/../g)!.map((pair) => parseInt(pair, 16)),
      ),
      tx.pure.address(SELLER),
      coin,
    ],
  });
  return finish(tx, sender, 10_000_000);
}

function hostileWorker(secondAnswer: PremiumCallResponse) {
  const signatures: string[] = [];
  const agent = createAgent({
    now: () => Date.parse("2026-11-10T12:00:00.000Z"),
    relay: async (path, body) => {
      if (path === "/social/feed")
        return {
          ok: true,
          status: 200,
          body: {
            items: ["p1", "p2", "p3"].map((id) => ({ handle: "ada", score: 600, item: lockedItem(id), myCall: null })),
          },
        };
      if (path === "/premium/build")
        return { ok: true, status: 200, body: { transaction: await payFor((body as { sender: string }).sender) } };
      if (path === "/premium/transfer/build")
        return { ok: false, status: 409, body: { error: "insufficient_balance" } };
      return { ok: false, status: 404, body: null };
    },
    // The Worker takes every signed payment, then claims it failed.
    fetchCall: async (_pickId, payment) =>
      payment
        ? (signatures.push(payment), secondAnswer)
        : { status: 402, required: requirement, body: { error: "payment_required" } },
  });
  return { agent, signatures };
}

test("a Worker that keeps signed payments and answers with errors can't get past the daily budget", async () => {
  for (const answer of [
    { status: 500, required: null, body: null },
    { status: 402, required: null, body: { error: "payment_failed", reason: "nonce_used" } },
    { status: 200, required: null, body: { handle: "ada", call: lockedItem("p1"), access: "kickoff", receipt: null } },
  ] satisfies PremiumCallResponse[]) {
    store.clear();
    const { agent, signatures } = hostileWorker(answer);
    await agent.create();
    await agent.saveSettings({ enabled: true, dailyBudgetMist: "20000000", maxPerCallMist: "10000000" });
    for (let run = 0; run < 3; run++) await agent.run();
    assert.equal(signatures.length, 2, `budget 0.02 at 0.01 a call allows two signatures (answer ${answer.status})`);
    assert.equal((await agent.status()).spentTodayMist, "20000000");
  }
});

test("Withdraw all refuses a wallet that wasn't connected on a trusted site", async () => {
  store.clear();
  const { agent } = hostileWorker({ status: 500, required: null, body: null });
  await agent.create();
  for (const saved of [
    { address: SENDER, walletId: "x", walletName: "Slush" },
    { address: SENDER, walletId: "x", walletName: "Slush", site: "evil.example" },
  ]) {
    store.set("soothia.suiWallet", saved);
    assert.deepEqual(await agent.withdraw(), { error: "wallet_untrusted" });
  }
  store.set("soothia.suiWallet", { address: SENDER, walletId: "x", walletName: "Slush", site: "soothia.fun" });
  assert.deepEqual(await agent.withdraw(), { error: "insufficient_balance" });
});

// ---- X-3: gas caps on stakes and claims ----

test("stakes and claims with a huge gas budget are refused", async () => {
  const claim = new Transaction();
  claim.moveCall({ target: `${STAKE_PACKAGE}::pool::claim`, arguments: [shared(claim, POOL), shared(claim, "0x6")] });
  const verdict = checkTransaction(
    await finish(claim, SENDER, 50_000_000_000),
    { kind: "claim", poolId: POOL },
    SENDER,
  );
  assert.equal(verdict.ok, false);
  assert.match((verdict as { reason: string }).reason, /too much gas/);

  const stake = new Transaction();
  const [payment] = stake.splitCoins(stake.gas, [100_000_000n]);
  stake.moveCall({
    target: `${STAKE_PACKAGE}::pool::stake`,
    arguments: [
      shared(stake, STAKE_CONFIG),
      shared(stake, POOL),
      stake.pure.bool(true),
      payment,
      stake.pure.vector("u8", Array(32).fill(1)),
      shared(stake, "0x6"),
    ],
  });
  const expected = { kind: "stake" as const, poolId: POOL, side: true, amountMist: "100000000" };
  assert.equal(checkTransaction(await finish(stake, SENDER, 50_000_000_000), expected, SENDER).ok, false);
});

// ---- X-7: links from the API ----

test("links open only https pages on known hosts", () => {
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,x",
    "http://suivision.xyz/x",
    "https://evil.example/x",
    "not a url",
  ])
    assert.equal(externalLink("x", bad, "").getAttribute("href"), null, bad);
  assert.equal(
    externalLink("x", "https://suivision.xyz/txblock/abc", "").getAttribute("href"),
    "https://suivision.xyz/txblock/abc",
  );
});

// ---- X-9: malformed feed items ----

test("the agent skips a call with a bad kickoff or price instead of failing the run", () => {
  const on = { ...DEFAULT_AGENT_SETTINGS, enabled: true };
  const bad = [
    { handle: "ada", item: { ...lockedItem("a"), fixture: { ...lockedItem("a").fixture, startISO: "soon" } } },
    { handle: "ada", item: { ...lockedItem("b"), premium: { priceMist: "lots" } } },
    { handle: "ada", item: lockedItem("c") },
  ];
  assert.deepEqual(
    agentCandidates(bad, on, 0n, Date.parse("2026-11-10T12:00:00.000Z")).map((row) => row.item.pickId),
    ["c"],
  );
});
