// The Back it sheet, rendered in jsdom with a fake Worker and wallet. Run with `npm test`.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { JSDOM } from "jsdom";
import type { ApiPath, RecallCalled } from "../src/messages";
import type { PoolView } from "../src/stake-logic";
import type { ExpectedTx } from "../src/tx-check";
import type { WalletAccess } from "../src/wallet-access";
import type { ConnectedWallet, WalletSummary } from "../src/wallet-protocol";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: dom.window.document });
const { openBackSheet, TRUST_DOC_URL } = await import("../src/back-sheet");
const { STYLES } = await import("../src/styles");

const KICKOFF = "2026-11-21T17:30:00.000Z";
const called: RecallCalled = { side: "Arsenal win", confidence: 60, pickId: "p1", committed: true, pYes: 0.6, fixture: { home: "Newcastle United", away: "Arsenal", startISO: KICKOFF, subject: "away" } };
const LIMITS = { minStakeMist: "100000000", maxStakePerUserMist: "5000000000", maxPoolMist: "50000000000" };
const POOL_ID = `0x${"bb".repeat(32)}`;
const pool: PoolView = { exists: true, poolId: POOL_ID, status: "open", closeMs: Date.parse(KICKOFF), yesTotal: "3000000000", noTotal: "1000000000", feeBps: 100, limits: LIMITS };
const emptyPool: PoolView = { ...pool, exists: false, poolId: null, status: null, yesTotal: "0", noTotal: "0" };
const WALLET: ConnectedWallet = { address: `0x${"aa".repeat(32)}`, walletId: "slush", walletName: "Slush" };
const DIGEST = "8teWqYrBWopnhq2Wy22BQq1uvzepDoUzDzdRA6oE8iY";
const BUILT = { txBytes: "BYTES", summary: { poolId: POOL_ID, side: "YES", amountMist: "100000000", multiplierNow: 1.2 } };

type Reply = { ok: boolean; status: number; body: unknown };
const OK = (body: unknown): Reply => ({ ok: true, status: 200, body });
const NO = (status: number, body: unknown): Reply => ({ ok: false, status, body });

interface Options {
  pool?: PoolView;
  wallet?: ConnectedWallet | null;
  wallets?: WalletSummary[];
  balance?: string;
  balanceFails?: boolean;
  poolFails?: boolean;
  held?: string;
  build?: () => Reply;
  confirm?: (() => Reply)[];
  sign?: () => Promise<{ digest: string }>;
  sideCalled?: RecallCalled;
}

const sheets: { dispose(): void }[] = [];
afterEach(() => {
  for (const sheet of sheets.splice(0)) sheet.dispose();
});

const tick = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

async function open(options: Options = {}) {
  const asked: [ApiPath, Record<string, unknown>][] = [];
  const signed: { txBytes: string; expected: ExpectedTx; wallet: ConnectedWallet }[] = [];
  const confirms = [...(options.confirm ?? [])];
  let current = options.wallet === undefined ? WALLET : options.wallet;
  let connects = 0;
  let backs = 0;
  const access: WalletAccess = {
    current: async () => current,
    connect: async (choose) => {
      connects += 1;
      const list = options.wallets ?? [{ id: "slush", name: "Slush" }];
      const picked = list.length === 1 ? list[0] : await choose(list);
      if (!picked) return null;
      current = { address: WALLET.address, walletId: picked.id, walletName: picked.name };
      return current;
    },
    sign: async (wallet, txBytes, expected) => {
      signed.push({ wallet, txBytes, expected });
      return options.sign ? options.sign() : { digest: DIGEST };
    },
  };
  const sheet = openBackSheet({
    called: options.sideCalled ?? called,
    wallet: access,
    layout: () => undefined,
    back: () => {
      backs += 1;
    },
    wait: async () => undefined,
    api: async <T,>(path: ApiPath, body: unknown) => {
      asked.push([path, body as Record<string, unknown>]);
      let reply: Reply;
      if (path === "/stake/pool") reply = options.poolFails ? NO(502, { error: "stake_unavailable" }) : OK(options.pool ?? pool);
      else if (path === "/stake/balance") reply = options.balanceFails ? NO(502, { error: "stake_unavailable" }) : OK({ balanceMist: options.balance ?? "1000000000" });
      else if (path === "/stake/positions") reply = OK({ positions: options.held ? [{ pickId: "p1", amountMist: options.held }] : [] });
      else if (path === "/stake/build") reply = options.build ? options.build() : OK(BUILT);
      else if (path === "/stake/confirm") reply = (confirms.shift() ?? (() => OK({ ok: true })))();
      else reply = NO(404, null);
      return reply as { ok: boolean; status: number; body: T | null };
    },
  });
  sheets.push(sheet);
  await tick();
  const q = <T extends Element>(selector: string) => sheet.node.querySelector<T>(selector);
  const main = () => q<HTMLButtonElement>(".back-submit")!;
  const status = () => q(".status-line")?.textContent ?? "";
  const problem = status;
  const chip = (label: string) => [...sheet.node.querySelectorAll<HTMLButtonElement>(".back-chip")].find((node) => node.textContent === label)!;
  const paths = () => asked.map(([path]) => path);
  return { sheet, asked, signed, q, main, status, problem, chip, paths, connects: () => connects, backs: () => backs };
}

async function press(s: Awaited<ReturnType<typeof open>>): Promise<void> {
  s.main().click();
  await tick();
}

test("the sheet shows the fixed side, chips, estimate, fee, schedule and notice", async () => {
  const s = await open();
  const text = s.sheet.node.textContent ?? "";
  assert.ok(text.includes("Arsenal win"));
  assert.equal(s.sheet.node.querySelectorAll(".side").length, 0);
  assert.deepEqual([...s.sheet.node.querySelectorAll(".back-chip")].map((node) => node.textContent), ["0.1 SUI", "0.5 SUI", "1 SUI", "5 SUI"]);
  // (4 + 0.1) * 0.99 / 3.1
  assert.ok(text.includes("Pays about 1.31x"));
  assert.ok(text.includes("About 0.1309 SUI back"));
  assert.ok(text.includes("1% fee"));
  assert.ok(text.includes("Results from ESPN, settled 2h15m after kickoff, 6h challenge window, then claim"));
  assert.ok(text.includes("Staking may be restricted where you live. Unaudited beta: stake only what you can lose."));
  assert.ok(text.includes("Check the amount in your wallet popup before approving."));
  assert.equal(s.q<HTMLAnchorElement>("a.link")?.href, TRUST_DOC_URL);
});

test("a NO call backs the NO side", async () => {
  const s = await open({ sideCalled: { ...called, pYes: 0.3, side: "Arsenal doesn't win (Newcastle United win or draw)" } });
  await press(s);
  assert.equal((s.signed[0].expected as { side: boolean }).side, false);
});

// The states reported from Chrome: label, enabled flag and the reason right above the button.
function reasonAboveButton(s: Awaited<ReturnType<typeof open>>): string {
  const above = s.main().previousElementSibling as HTMLElement;
  assert.ok(above.classList.contains("status-line"));
  return above.textContent ?? "";
}

test("the default chip sets the amount, so a fresh sheet can act at once", async () => {
  const s = await open({ wallet: null });
  assert.ok(s.chip("0.1 SUI").classList.contains("selected"));
  assert.equal(s.main().disabled, false);
  await press(s);
  assert.equal(s.asked.find(([path]) => path === "/stake/build")?.[1].amountMist, "100000000");
});

test("state: no wallet is enabled and offers to connect", async () => {
  const s = await open({ wallet: null });
  assert.equal(s.main().textContent, "Connect wallet to back it");
  assert.equal(s.main().disabled, false);
  assert.equal(reasonAboveButton(s), "");
});

test("state: an unreadable balance still allows the attempt", async () => {
  const s = await open({ balanceFails: true });
  assert.equal(s.main().textContent, "Back it");
  assert.equal(s.main().disabled, false);
  assert.equal(reasonAboveButton(s), "");
  assert.ok(s.q(".sheet-foot")?.textContent?.includes("Couldn't check your balance"));
  await press(s);
  assert.equal(s.signed.length, 1);
});

test("state: not enough SUI is disabled, with the reason above it", async () => {
  const s = await open({ balance: "50000000" });
  assert.equal(s.main().textContent, "Back it");
  assert.equal(s.main().disabled, true);
  assert.equal(reasonAboveButton(s), "Not enough SUI: you have 0.05, need 0.12 with gas");
});

test("state: over the limit is disabled, with the reason above it", async () => {
  const s = await open();
  const input = s.q<HTMLInputElement>(".back-custom")!;
  input.value = "6";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.equal(s.main().disabled, true);
  assert.equal(reasonAboveButton(s), "Above your 5 SUI limit");
});

test("state: a closed pool is disabled, with the reason above it", async () => {
  const s = await open({ pool: { ...pool, status: "void" } });
  assert.equal(s.main().disabled, true);
  assert.equal(reasonAboveButton(s), "Pool closed");
});

test("state: valid is enabled with no reason", async () => {
  const s = await open();
  assert.equal(s.main().textContent, "Back it");
  assert.equal(s.main().disabled, false);
  assert.equal(reasonAboveButton(s), "");
});

test("a pool still loading or failing says so instead of sitting disabled", async () => {
  const s = await open({ poolFails: true });
  assert.equal(s.main().disabled, true);
  assert.equal(reasonAboveButton(s), "Couldn't load this pool. Trying again\u2026");
});

test("the button uses the primary style in every state", async () => {
  for (const options of [{}, { wallet: null }, { balance: "50000000" }]) {
    const s = await open(options);
    assert.ok(s.main().classList.contains("primary"));
    assert.ok(s.main().classList.contains("wide"));
    // .button.buy has dark text and needs data-side for a background.
    assert.equal(s.main().classList.contains("buy"), false);
  }
});

test("the disabled style keeps the primary colours at reduced opacity", () => {
  const rule = /\.button\.primary\.back-submit:disabled[^{]*\{([^}]*)\}/.exec(STYLES)?.[1] ?? "";
  assert.match(rule, /background: linear-gradient/);
  assert.match(rule, /color: var\(--sth-text-on-orb\)/);
  assert.match(rule, /opacity: \.55/);
});

test("a failure stays on screen until the amount changes", async () => {
  const s = await open({ build: () => NO(409, { error: "too_close_to_kickoff" }) });
  await press(s);
  assert.match(reasonAboveButton(s), /about to start/);
  assert.equal(s.main().disabled, true);
  s.chip("0.5 SUI").click();
  assert.equal(reasonAboveButton(s), "");
  assert.equal(s.main().disabled, false);
});

test("the full path: build, check and sign, confirm, done with proof", async () => {
  const s = await open();
  await press(s);
  assert.deepEqual(s.asked.find(([path]) => path === "/stake/build")?.[1], { pickId: "p1", amountMist: "100000000", sender: WALLET.address });
  assert.deepEqual(s.signed, [{ wallet: WALLET, txBytes: "BYTES", expected: { kind: "stake", poolId: POOL_ID, side: true, amountMist: "100000000" } }]);
  assert.deepEqual(s.asked.find(([path]) => path === "/stake/confirm")?.[1], { pickId: "p1", digest: DIGEST });
  const done = s.q(".outcome")!;
  assert.equal((done as HTMLElement).hidden, false);
  assert.ok(done.textContent?.includes("Backed 0.1 SUI on Arsenal win. Proof:"));
  assert.equal(done.querySelector("a")?.href, `https://suivision.xyz/txblock/${DIGEST}`);
  [...done.querySelectorAll("button")].find((node) => node.textContent === "Done")!.click();
  assert.equal(s.backs(), 1);
});

test("the first stake on a pool uses the pool the Worker created", async () => {
  const s = await open({ pool: emptyPool });
  assert.ok(s.sheet.node.textContent?.includes("Pays about 0.99x"));
  await press(s);
  assert.equal((s.signed[0].expected as { poolId: string }).poolId, POOL_ID);
});

test("the pool we were shown is what the checker expects, whatever the Worker says", async () => {
  const other = `0x${"cc".repeat(32)}`;
  const s = await open({ build: () => OK({ ...BUILT, summary: { ...BUILT.summary, poolId: other } }) });
  await press(s);
  assert.equal((s.signed[0].expected as { poolId: string }).poolId, POOL_ID);
});

test("the chosen amount is what is built and checked", async () => {
  const s = await open();
  s.chip("0.5 SUI").click();
  await press(s);
  assert.equal(s.asked.find(([path]) => path === "/stake/build")?.[1].amountMist, "500000000");
  assert.equal((s.signed[0].expected as { amountMist: string }).amountMist, "500000000");
});

test("a custom amount works, and bad text blocks the button", async () => {
  const s = await open();
  const input = s.q<HTMLInputElement>(".back-custom")!;
  input.value = "0.25";
  input.dispatchEvent(new dom.window.Event("input"));
  assert.equal(s.main().disabled, false);
  await press(s);
  assert.equal(s.asked.find(([path]) => path === "/stake/build")?.[1].amountMist, "250000000");

  const t = await open();
  const bad = t.q<HTMLInputElement>(".back-custom")!;
  bad.value = "abc";
  bad.dispatchEvent(new dom.window.Event("input"));
  assert.equal(t.main().disabled, true);
  assert.equal(t.problem(), "Enter an amount in SUI");
});

test("the wallet balance limits the amount", async () => {
  const s = await open({ balance: "153574000" });
  assert.equal(s.main().disabled, false);
  s.chip("0.5 SUI").click();
  assert.equal(s.main().disabled, true);
  assert.equal(s.problem(), "Not enough SUI: you have 0.1535, need 0.52 with gas");
});

test("earlier stakes count against the personal limit", async () => {
  const s = await open({ held: "4500000000" });
  s.chip("1 SUI").click();
  assert.equal(s.problem(), "Above your 5 SUI limit: you can add 0.5 more");
  assert.equal(s.main().disabled, true);
});

test("with no wallet connected, Back it connects first and then stakes", async () => {
  const s = await open({ wallet: null });
  await press(s);
  assert.equal(s.connects(), 1);
  assert.ok(s.paths().includes("/stake/balance"));
  assert.equal(s.signed.length, 1);
});

test("several wallets show a picker in the sheet", async () => {
  const s = await open({ wallet: null, wallets: [{ id: "slush", name: "Slush" }, { id: "phantom", name: "Phantom" }] });
  await press(s);
  assert.equal(s.status(), "Choose a wallet.");
  assert.equal(s.signed.length, 0);
  [...s.q(".wallet-picker")!.querySelectorAll("button")].find((node) => node.textContent === "Phantom")!.click();
  await tick();
  assert.equal(s.signed[0].wallet.walletId, "phantom");
});

test("after connecting, an unaffordable amount stops before anything is built", async () => {
  const s = await open({ wallet: null, balance: "50000000" });
  await press(s);
  assert.equal(s.status(), "Not enough SUI: you have 0.05, need 0.12 with gas");
  assert.equal(s.paths().includes("/stake/build"), false);
  assert.equal(s.signed.length, 0);
});

test("the wallet rejecting says so, and Try again rebuilds", async () => {
  let attempts = 0;
  const s = await open({
    sign: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("User rejected the request");
      return { digest: DIGEST };
    },
  });
  await press(s);
  assert.equal(s.status(), "You cancelled in your wallet. Nothing was staked.");
  assert.equal(s.main().textContent, "Try again");
  assert.equal(s.paths().includes("/stake/confirm"), false);
  await press(s);
  assert.equal(s.paths().filter((path) => path === "/stake/build").length, 2);
  assert.ok(s.q(".outcome")?.textContent?.includes("Backed"));
});

test("insufficient gas from the wallet is plain words", async () => {
  const s = await open({
    sign: async () => {
      throw new Error("Insufficient gas balance for this transaction");
    },
  });
  await press(s);
  assert.equal(s.status(), "Your wallet doesn't have enough SUI to cover this and gas.");
});

test("a refusal from the checker never reaches confirm and cannot be retried", async () => {
  const s = await open({
    sign: async () => {
      throw new Error("Transaction refused. The amount differs from what you chose.");
    },
  });
  await press(s);
  assert.match(s.status(), /amount differs.*Nothing was sent to your wallet/);
  assert.equal(s.paths().includes("/stake/confirm"), false);
  assert.equal(s.main().disabled, true);
});

const buildRefusals: [string, Reply, RegExp, boolean][] = [
  ["the pool closed", NO(409, { error: "pool_not_open" }), /pool has closed/, false],
  ["kickoff too near", NO(409, { error: "too_close_to_kickoff" }), /about to start/, false],
  ["the limit reached", NO(400, { error: "above_user_limit" }), /over the limit/, false],
  ["the pool full", NO(409, { error: "pool_full" }), /full/, false],
  ["not enough SUI", NO(400, { error: "insufficient_balance", neededMist: "120000000" }), /0\.12 SUI including gas/, true],
  ["a contract refusal", NO(409, { error: "stake_rejected", abortCode: "4" }), /pool has closed/, false],
  ["the server being down", NO(0, null), /reach Soothia/, true],
];

for (const [name, reply, pattern, retry] of buildRefusals) {
  test(`build failure in plain words: ${name}`, async () => {
    const s = await open({ build: () => reply });
    await press(s);
    assert.match(s.status(), pattern);
    assert.equal(s.main().disabled, !retry);
    assert.equal(s.signed.length, 0);
  });
}

test("confirm waits for a transaction the chain hasn't shown yet", async () => {
  const notYet = () => NO(404, { error: "transaction_not_found" });
  const s = await open({ confirm: [notYet, notYet] });
  await press(s);
  assert.equal(s.paths().filter((path) => path === "/stake/confirm").length, 3);
  assert.ok(s.q(".outcome")?.textContent?.includes("Backed"));
});

test("if confirm fails, Try again confirms and never signs twice", async () => {
  const s = await open({ confirm: [() => NO(502, { error: "stake_unavailable" })] });
  await press(s);
  assert.match(s.status(), /went through on Sui/);
  assert.equal(s.q<HTMLAnchorElement>(".status-line a")?.href, `https://suivision.xyz/txblock/${DIGEST}`);
  assert.equal(s.signed.length, 1);
  await press(s);
  assert.equal(s.signed.length, 1);
  assert.equal(s.paths().filter((path) => path === "/stake/build").length, 1);
  assert.ok(s.q(".outcome")?.textContent?.includes("Backed"));
});

test("a second press while busy does nothing", async () => {
  let release: (value: { digest: string }) => void = () => undefined;
  const s = await open({ sign: () => new Promise((resolve) => (release = resolve)) });
  s.main().click();
  await tick();
  assert.equal(s.status(), "Waiting for your wallet…");
  s.sheet.trigger!();
  await tick();
  assert.equal(s.signed.length, 1);
  release({ digest: DIGEST });
  await tick();
});
