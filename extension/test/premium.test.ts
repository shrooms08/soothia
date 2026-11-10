// Premium calls in the extension: reading a 402, paying, the agent's rules and the
// locked rows. Transactions are real BCS. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { Inputs, Transaction } from "@mysten/sui/transactions";
import { toBase64 } from "@mysten/sui/utils";
import { PAY_CONFIG, PAY_PACKAGE } from "../src/config";
import type { ApiResponse, FixtureSignal, RecallPickBody, Tile } from "../src/messages";
import {
  AGENT_HARD_CAP_MIST,
  agentCandidates,
  cleanAgentSettings,
  DEFAULT_AGENT_SETTINGS,
  parsePremiumPrice,
  paymentHeader,
  premiumLine,
  readRequirement,
  runUnlock,
  spentToday,
  unlockFailureText,
  type PremiumCallResponse,
  type UnlockResult,
} from "../src/premium-logic";
import type { FeedEntry, FollowedCall, LockedFeedItem } from "../src/social-logic";
import { checkTransaction, type ExpectedTx } from "../src/tx-check";

const { window } = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: window.document });
const { createSocialView, followedRow } = await import("../src/social-view");
const { openCallSheet } = await import("../src/call-sheet");
type SocialHost = import("../src/social-view").SocialHost;
type CallHost = import("../src/call-sheet").CallHost;

const SENDER = `0x${"aa".repeat(32)}`;
const SELLER = `0x${"bb".repeat(32)}`;
const OTHER = `0x${"cc".repeat(32)}`;
const NONCE = "00112233445566778899aabbccddeeff";
const PRICE = "20000000";
const GAS = { objectId: `0x${"dd".repeat(32)}`, version: "1", digest: "11111111111111111111111111111111" };
const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const KICKOFF = "2026-11-21T17:30:00.000Z";

async function finish(tx: Transaction, sender = SENDER, budget = 10_000_000, owner?: string): Promise<string> {
  tx.setSender(sender);
  tx.setGasBudget(budget);
  tx.setGasPrice(1000);
  tx.setGasPayment([GAS]);
  if (owner) tx.setGasOwner(owner);
  return toBase64(await tx.build());
}

interface PayShape {
  amount?: bigint;
  packageId?: string;
  fn?: string;
  config?: string;
  nonce?: string;
  payTo?: string;
  extra?: (tx: Transaction) => void;
  budget?: number;
  owner?: string;
  gasCoin?: boolean;
}

function payTx(shape: PayShape = {}): Promise<string> {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [shape.amount ?? BigInt(PRICE)]);
  tx.moveCall({
    target: `${shape.packageId ?? PAY_PACKAGE}::pay::${shape.fn ?? "pay"}`,
    arguments: [
      tx.object(
        Inputs.SharedObjectRef({ objectId: shape.config ?? PAY_CONFIG, initialSharedVersion: "1", mutable: true }),
      ),
      tx.pure.vector(
        "u8",
        (shape.nonce ?? NONCE).match(/../g)!.map((pair) => parseInt(pair, 16)),
      ),
      tx.pure.address(shape.payTo ?? SELLER),
      shape.gasCoin ? tx.gas : coin,
    ],
  });
  shape.extra?.(tx);
  return finish(tx, SENDER, shape.budget, shape.owner);
}

const PAY: ExpectedTx = { kind: "pay", nonce: NONCE, recipient: SELLER, priceMist: PRICE };
const refused = (bytes: string, expected: ExpectedTx, pattern: RegExp): void => {
  const verdict = checkTransaction(bytes, expected, SENDER);
  assert.equal(verdict.ok, false);
  if (!verdict.ok) assert.match(verdict.reason, pattern);
};

test("the exact payment passes the checker", async () => {
  assert.deepEqual(checkTransaction(await payTx(), PAY, SENDER), { ok: true });
});

const tampered: [string, PayShape, RegExp][] = [
  ["a different amount", { amount: 20_000_001n }, /differs/],
  ["a different recipient", { payTo: OTHER }, /someone else/],
  ["a different nonce", { nonce: "ff".repeat(16) }, /different payment/],
  ["another package", { packageId: OTHER }, /not Soothia's/],
  ["another function", { fn: "drain" }, /other than pay/],
  ["another config", { config: OTHER }, /different config/],
  ["the whole gas coin", { gasCoin: true }, /split coin/],
  [
    "an extra step",
    { extra: (tx) => void tx.transferObjects([tx.splitCoins(tx.gas, [1n])[0]], OTHER) },
    /more than split/,
  ],
  ["a huge gas budget", { budget: 500_000_000 }, /too much gas/],
  ["someone else's gas", { owner: OTHER }, /Someone else/],
];

for (const [name, shape, pattern] of tampered) {
  test(`the checker refuses a payment with ${name}`, async () => refused(await payTx(shape), PAY, pattern));
}

async function fundTx(amount = 50_000_000n, recipient = OTHER): Promise<string> {
  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amount]);
  tx.transferObjects([coin], recipient);
  return finish(tx);
}

async function withdrawTx(recipient = OTHER): Promise<string> {
  const tx = new Transaction();
  tx.transferObjects([tx.gas], recipient);
  return finish(tx);
}

test("funding passes for the chosen amount and agent only", async () => {
  const expected: ExpectedTx = { kind: "fund", recipient: OTHER, amountMist: "50000000" };
  assert.deepEqual(checkTransaction(await fundTx(), expected, SENDER), { ok: true });
  refused(await fundTx(60_000_000n), expected, /differs/);
  refused(await fundTx(50_000_000n, SELLER), expected, /someone else/);
  refused(await withdrawTx(), expected, /more than/);
});

test("a withdrawal passes only for the whole balance, to the connected wallet", async () => {
  const expected: ExpectedTx = { kind: "withdraw", recipient: OTHER };
  assert.deepEqual(checkTransaction(await withdrawTx(), expected, SENDER), { ok: true });
  refused(await withdrawTx(SELLER), expected, /someone else/);
  refused(await fundTx(), expected, /more than/);
});

const accepted = (overrides: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => ({
  scheme: "exact",
  network: "sui:mainnet",
  amount: PRICE,
  asset: "0x2::sui::SUI",
  payTo: SELLER,
  maxTimeoutSeconds: 300,
  extra: { payPackage: PAY_PACKAGE, payConfig: PAY_CONFIG, nonce: NONCE, ...extra },
  ...overrides,
});
const header = (entry = accepted(), version = 2): string =>
  btoa(
    JSON.stringify({
      x402Version: version,
      resource: { url: "https://api.soothia.fun/premium/call/p1" },
      accepts: [entry],
    }),
  );

test("a requirement is read when it is exactly Soothia's kind", () => {
  const read = readRequirement(header());
  assert.equal(read?.amount, PRICE);
  assert.equal(read?.payTo, SELLER);
  assert.equal(read?.nonce, NONCE);
  for (const bad of [
    header(accepted({ network: "sui:testnet" })),
    header(accepted({ asset: "0x2::foo::FOO" })),
    header(accepted({ scheme: "upto" })),
    header(accepted({ payTo: "0x1" })),
    header(accepted({ amount: "0" })),
    header(accepted({}, { payPackage: OTHER })),
    header(accepted({}, { payConfig: OTHER })),
    header(accepted({}, { nonce: "xyz" })),
    header(accepted(), 1),
    "not base64!",
    null,
  ]) {
    assert.equal(readRequirement(bad), null);
  }
});

test("the payment header repeats the requirement and carries the signed bytes", () => {
  const value = paymentHeader(readRequirement(header())!, { bytes: "BYTES", signature: "SIG" });
  const parsed = JSON.parse(atob(value));
  assert.equal(parsed.x402Version, 2);
  assert.deepEqual(parsed.accepted, accepted());
  assert.deepEqual(parsed.payload, { signature: "SIG", transaction: "BYTES" });
});

const openCall = {
  pickId: "p1",
  fixture: {
    home: "Newcastle",
    away: "Arsenal",
    competition: "Premier League",
    startISO: KICKOFF,
    subject: "away" as const,
  },
  lean: "Arsenal win",
  side: "YES" as const,
  confidence: 70,
  at: "2026-11-09T11:59:00.000Z",
  premium: { priceMist: PRICE },
  proof: { digest: "D1", url: "https://suivision.xyz/txblock/D1" },
};
const receipt = {
  digest: "TX9",
  priceMist: PRICE,
  at: "2026-11-09T12:00:00.000Z",
  url: "https://suivision.xyz/txblock/TX9",
};
const required: PremiumCallResponse = { status: 402, required: header(), body: { error: "payment_required" } };
const paid: PremiumCallResponse = {
  status: 200,
  required: null,
  body: { handle: "ada", call: openCall, access: "unlocked", receipt },
};

function unlockDeps(responses: PremiumCallResponse[], overrides: Partial<Parameters<typeof runUnlock>[0]> = {}) {
  const payments: (string | undefined)[] = [];
  const signed: ExpectedTx[] = [];
  return {
    payments,
    signed,
    deps: {
      expectedPriceMist: PRICE,
      fetchCall: async (payment?: string) => (payments.push(payment), responses.shift()!),
      build: async () => "BUILT",
      sign: async (_bytes: string, expected: ExpectedTx) => (
        signed.push(expected),
        { bytes: "SIGNED", signature: "SIG" }
      ),
      ...overrides,
    },
  };
}

test("unlocking asks, signs what was asked for, and retries with the payment", async () => {
  const { deps, payments, signed } = unlockDeps([required, paid]);
  const result = await runUnlock(deps);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.call.lean, "Arsenal win");
  assert.equal(result.ok && result.receipt?.digest, "TX9");
  assert.deepEqual(signed, [{ kind: "pay", nonce: NONCE, recipient: SELLER, priceMist: PRICE }]);
  assert.equal(payments[0], undefined);
  assert.equal(JSON.parse(atob(payments[1]!)).payload.transaction, "SIGNED");
});

test("an already open call costs nothing and asks no wallet", async () => {
  const { deps, signed } = unlockDeps([
    { status: 200, required: null, body: { handle: "ada", call: openCall, access: "kickoff", receipt: null } },
  ]);
  const result = await runUnlock(deps);
  assert.equal(result.ok && result.receipt, null);
  assert.equal(signed.length, 0);
});

test("a price other than the one shown is refused before signing", async () => {
  const { deps, signed } = unlockDeps([required], { expectedPriceMist: "10000000" });
  assert.deepEqual(await runUnlock(deps), { ok: false, code: "price_changed", maybePaid: false });
  assert.equal(signed.length, 0);
});

test("a cancelled wallet says so and charges nothing", async () => {
  const { deps } = unlockDeps([required], { sign: async () => Promise.reject(new Error("User rejected the request")) });
  const result = (await runUnlock(deps)) as Extract<UnlockResult, { ok: false }>;
  assert.equal(result.maybePaid, false);
  assert.match(
    unlockFailureText(result, (text) => `wallet: ${text}`),
    /User rejected/,
  );
});

test("a build error keeps its code", async () => {
  const { deps } = unlockDeps([required], { build: async () => Promise.reject(new Error("insufficient_balance")) });
  const result = (await runUnlock(deps)) as Extract<UnlockResult, { ok: false }>;
  assert.equal(result.code, "insufficient_balance");
  assert.match(unlockFailureText(result, String), /Not enough SUI/);
});

test("a lost answer after paying may have been paid, and a refusal hasn't", async () => {
  const lost = unlockDeps([required, { status: 0, required: null, body: null }]);
  assert.deepEqual(await runUnlock(lost.deps), { ok: false, code: "network", maybePaid: true });
  const refusedPayment = unlockDeps([
    required,
    { status: 402, required: null, body: { error: "payment_failed", reason: "wrong_amount" } },
  ]);
  assert.deepEqual(await runUnlock(refusedPayment.deps), { ok: false, code: "wrong_amount", maybePaid: false });
  const unclear = unlockDeps([
    required,
    { status: 402, required: null, body: { error: "payment_failed", reason: "broadcast_failed" } },
  ]);
  assert.deepEqual(await runUnlock(unclear.deps), { ok: false, code: "broadcast_failed", maybePaid: true });
});

const locked = (pickId: string, priceMist = "10000000", overrides: Partial<LockedFeedItem> = {}): LockedFeedItem => ({
  pickId,
  fixture: { home: "Newcastle", away: "Arsenal", competition: null, startISO: KICKOFF },
  at: "2026-11-09T11:00:00.000Z",
  premium: { priceMist },
  proof: { digest: "D", url: "https://x" },
  locked: true,
  ...overrides,
});
const lockedEntry = (item: LockedFeedItem) => ({ handle: "ada", item });
const on = { ...DEFAULT_AGENT_SETTINGS, enabled: true };

test("the agent is off until it is turned on", () => {
  assert.equal(DEFAULT_AGENT_SETTINGS.enabled, false);
  assert.deepEqual(agentCandidates([lockedEntry(locked("a"))], DEFAULT_AGENT_SETTINGS, 0n, NOW), []);
});

test("the agent buys locked calls within the per-call cap and the day's budget", () => {
  const entries = [
    lockedEntry(locked("a", "40000000")),
    lockedEntry(locked("b", "60000000")),
    lockedEntry(locked("c", "30000000")),
  ];
  const settings = { enabled: true, dailyBudgetMist: "70000000", maxPerCallMist: "50000000" };
  assert.deepEqual(
    agentCandidates(entries, settings, 0n, NOW).map((row) => row.item.pickId),
    ["a", "c"],
  );
  assert.deepEqual(
    agentCandidates(entries, settings, 40_000_000n, NOW).map((row) => row.item.pickId),
    ["c"],
  );
  assert.deepEqual(agentCandidates(entries, settings, 70_000_000n, NOW), []);
});

test("the agent's per-call cap can't exceed the hard cap", () => {
  const dear = lockedEntry(locked("a", (AGENT_HARD_CAP_MIST + 1n).toString()));
  const settings = { enabled: true, dailyBudgetMist: "1000000000", maxPerCallMist: "500000000" };
  assert.deepEqual(agentCandidates([dear], settings, 0n, NOW), []);
  assert.equal(cleanAgentSettings(settings).maxPerCallMist, DEFAULT_AGENT_SETTINGS.maxPerCallMist);
});

test("the agent skips calls without proof, near kickoff, or already open, and stops at three", () => {
  const near = new Date(NOW + 60_000).toISOString();
  const skipped = [
    lockedEntry(locked("a", "10000000", { proof: undefined })),
    lockedEntry(locked("b", "10000000", { fixture: { home: "A", away: "B", competition: null, startISO: near } })),
    { handle: "ada", item: openCall },
  ];
  assert.deepEqual(agentCandidates(skipped as Pick<FeedEntry, "handle" | "item">[], on, 0n, NOW), []);
  const many = ["a", "b", "c", "d"].map((id) => lockedEntry(locked(id)));
  assert.equal(agentCandidates(many, on, 0n, NOW).length, 3);
});

test("a new UTC day starts the spend again", () => {
  assert.equal(spentToday({ day: "2026-11-09", spentMist: "5" }, NOW), 5n);
  assert.equal(spentToday({ day: "2026-11-08", spentMist: "5" }, NOW), 0n);
  assert.equal(spentToday(null, NOW), 0n);
});

test("agent settings out of range go back to the defaults", () => {
  assert.deepEqual(
    cleanAgentSettings({ enabled: "yes", dailyBudgetMist: "1", maxPerCallMist: "abc" }),
    DEFAULT_AGENT_SETTINGS,
  );
  assert.deepEqual(cleanAgentSettings(null), DEFAULT_AGENT_SETTINGS);
  assert.equal(
    cleanAgentSettings({ enabled: true, dailyBudgetMist: "50000000", maxPerCallMist: "20000000" }).dailyBudgetMist,
    "50000000",
  );
});

test("custom prices run from 0.01 to 0.5 SUI", () => {
  assert.equal(parsePremiumPrice("0.01"), 10_000_000n);
  assert.equal(parsePremiumPrice("0.5"), 500_000_000n);
  for (const bad of ["0.009", "0.51", "abc", ""]) assert.equal(parsePremiumPrice(bad), null);
});

const tick = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};
const ok = (body: unknown): ApiResponse<unknown> => ({ ok: true, status: 200, body });

function feed(items: unknown[], overrides: Partial<SocialHost> = {}) {
  const pane = window.document.createElement("div");
  const view = createSocialView(pane, {
    api: (async () => ok({ items })) as never,
    layout: () => undefined,
    state: (_kind, text) => {
      const node = window.document.createElement("div");
      node.textContent = text;
      return node;
    },
    onTail: () => undefined,
    now: () => NOW,
    ...overrides,
  });
  const named = (label: string) =>
    [...pane.querySelectorAll("button")].find((node) => node.textContent === label) as HTMLButtonElement | undefined;
  return { pane, view, named };
}

const feedEntry = (item: unknown = locked("p1", PRICE)) => ({ handle: "ada", score: 612, item, myCall: null });
const unlocked = async (): Promise<UnlockResult> => ({ ok: true, handle: "ada", call: openCall, receipt });

test("a locked row shows the match, price and proof, and nothing of the side", async () => {
  const f = feed([feedEntry()], { unlock: unlocked });
  await f.view.render();
  const text = f.pane.textContent!;
  assert.match(text, /Newcastle v Arsenal/);
  assert.match(text, /@ada · 612/);
  assert.match(text, /Premium · 0\.02 SUI/);
  assert.match(text, /Proof on Sui/);
  assert.equal(/Arsenal win|70%/.test(text), false);
  assert.ok(f.named("Unlock"));
  assert.equal(f.named("Tail"), undefined);
});

test("Unlock opens the call in place with a receipt", async () => {
  const f = feed([feedEntry()], { unlock: unlocked });
  await f.view.render();
  f.named("Unlock")!.click();
  await tick();
  const text = f.pane.textContent!;
  assert.match(text, /Arsenal win · 70%/);
  assert.match(text, /Paid 0\.02 SUI/);
  const link = [...f.pane.querySelectorAll("a")].find((node) => node.href.includes("TX9"));
  assert.ok(link);
});

test("a failed Unlock explains itself and can be tried again", async () => {
  const f = feed([feedEntry()], {
    unlock: async () => ({ ok: false, code: "insufficient_balance", maybePaid: false }),
  });
  await f.view.render();
  f.named("Unlock")!.click();
  await tick();
  assert.match(f.pane.textContent!, /Not enough SUI/);
  assert.equal(f.named("Unlock")!.disabled, false);
});

test("the feed lets the agent run once, and shows what it bought", async () => {
  let runs = 0;
  let served = [feedEntry()];
  const f = feed([], {
    api: (async () => ok({ items: served })) as never,
    runAgent: async () => {
      runs += 1;
      served = [feedEntry(openCall)];
      return 1;
    },
  });
  await f.view.render();
  await tick();
  assert.equal(runs, 1);
  assert.match(f.pane.textContent!, /Your agent unlocked 1 call\./);
  assert.match(f.pane.textContent!, /Arsenal win/);
});

test("a call with no proof yet has no Unlock", async () => {
  const f = feed([feedEntry(locked("p1", PRICE, { proof: undefined }))], { unlock: unlocked });
  await f.view.render();
  assert.equal(f.named("Unlock"), undefined);
});

test("a locked call on a tile shows the price, with Unlock and no Tail", () => {
  const call: FollowedCall = {
    handle: "ada",
    pickId: "p1",
    fixture: locked("p1").fixture,
    at: "x",
    premium: { priceMist: PRICE },
    proof: { digest: "D", url: "https://x" },
    locked: true,
  };
  const node = followedRow(
    [call],
    null,
    () => undefined,
    () => undefined,
    unlocked,
  );
  assert.match(node.textContent!, /Premium · 0\.02 SUI/);
  assert.equal(/Arsenal/.test(node.textContent!), false);
  const labels = [...node.querySelectorAll("button")].map((button) => button.textContent);
  assert.ok(labels.includes("Unlock"));
  assert.equal(labels.includes("Tail"), false);
});

test("the line for a price reads simply", () => assert.equal(premiumLine("10000000"), "Premium · 0.01 SUI"));

const FIXTURE: FixtureSignal = {
  home: "Arsenal",
  away: "Chelsea",
  startISO: KICKOFF,
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

function sheet(eligible: boolean, overrides: Partial<CallHost> = {}) {
  const sent: { path: string; body: RecallPickBody }[] = [];
  const opened = openCallSheet({
    tile: fixtureTile(),
    page: { site: "espn.com", url: "https://www.espn.com/match" },
    fixture: FIXTURE,
    shrink: 1,
    calibrationBias: async () => null,
    api: (async (path: string, body: RecallPickBody) => {
      sent.push({ path, body });
      if (path === "/premium/eligible") return ok({ eligible });
      return ok({ id: "p1", at: "x", pYes: 0.6, commit: { digest: "D1", network: "mainnet" }, premium: body.premium });
    }) as CallHost["api"],
    layout: () => undefined,
    back: () => undefined,
    locked: () => undefined,
    ...overrides,
  });
  const q = <T extends Element>(selector: string): T => opened.node.querySelector<T>(selector)!;
  const toggle = (): void => {
    const box = q<HTMLInputElement>(".premium-field input[type=checkbox]");
    box.checked = true;
    box.dispatchEvent(new window.Event("change"));
  };
  const lock = async (): Promise<void> => {
    q<HTMLButtonElement>(".button.buy").click();
    await tick();
  };
  return { opened, sent, q, toggle, lock };
}

test("hidden always wins over a class's display rule, so Make it premium stays hidden", async () => {
  const { STYLES } = await import("../src/styles");
  assert.match(STYLES, /\[hidden\] \{ display: none !important; \}/);
  assert.match(STYLES, /\.premium-field \{ display: flex/);
});

test("Make it premium appears only for someone eligible", async () => {
  const no = sheet(false);
  await tick();
  assert.equal(no.q<HTMLElement>(".premium-field").hidden, true);
  const yes = sheet(true);
  await tick();
  assert.equal(yes.q<HTMLElement>(".premium-field").hidden, false);
  assert.match(yes.opened.node.textContent!, /Hidden until kickoff\. You keep 90%\./);
});

test("a tail never offers premium", async () => {
  const s = sheet(true, { prefill: { side: "yes", percent: 70, tailOf: "ada" } });
  await tick();
  assert.equal(s.q<HTMLElement>(".premium-field").hidden, true);
  assert.equal(
    s.sent.some(({ path }) => path === "/premium/eligible"),
    false,
  );
});

test("a premium call sends the chosen price, and an ordinary one sends none", async () => {
  const s = sheet(true);
  await tick();
  s.toggle();
  [...s.opened.node.querySelectorAll<HTMLButtonElement>(".premium-price")]
    .find((node) => node.textContent === "0.05")!
    .click();
  await s.lock();
  assert.deepEqual(s.sent.find(({ path }) => path === "/recall/pick")!.body.premium, { priceMist: "50000000" });
  assert.match(s.opened.node.textContent!, /Premium · 0\.05 SUI/);
  const plain = sheet(true);
  await tick();
  await plain.lock();
  assert.equal(plain.sent.find(({ path }) => path === "/recall/pick")!.body.premium, undefined);
});

test("a custom price outside the range stops the lock", async () => {
  const s = sheet(true);
  await tick();
  s.toggle();
  const custom = s.q<HTMLInputElement>(".premium-custom");
  custom.value = "0.9";
  custom.dispatchEvent(new window.Event("input"));
  assert.equal(s.q<HTMLButtonElement>(".button.buy").disabled, true);
  assert.match(s.opened.node.textContent!, /0\.01 to 0\.5 SUI/);
  custom.value = "0.25";
  custom.dispatchEvent(new window.Event("input"));
  assert.equal(s.q<HTMLButtonElement>(".button.buy").disabled, false);
  await s.lock();
  assert.deepEqual(s.sent.find(({ path }) => path === "/recall/pick")!.body.premium, { priceMist: "250000000" });
});

test("a premium call doesn't offer Back it, which would show its side on Sui", async () => {
  let offered = false;
  const s = sheet(true, { offerBack: () => (offered = true) });
  await tick();
  s.toggle();
  await s.lock();
  assert.equal(
    [...s.opened.node.querySelectorAll("button")].some((node) => node.textContent === "Back it"),
    false,
  );
  assert.equal(offered, false);
});
