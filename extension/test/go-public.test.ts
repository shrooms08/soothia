// The Go public panel and the Leaderboard tab, with a fake Worker and wallet.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import type { ApiPath } from "../src/messages";
import type { WalletAccess } from "../src/wallet-access";
import { createWalletAccess } from "../src/wallet-access";
import type { ConnectedWallet, WalletSummary } from "../src/wallet-protocol";

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: dom.window.document });
const { createGoPublicPanel, handleProblem, socialErrorText } = await import("../src/go-public");
const { createLeaderboardView } = await import("../src/leaderboard-view");

const ADDRESS = `0x${"aa".repeat(32)}`;
const WALLET: ConnectedWallet = { address: ADDRESS, walletId: "slush", walletName: "Slush" };
const MESSAGE = `Soothia: confirm you own this wallet.\nAction: publish\nAddress: ${ADDRESS}\nNonce: n`;
const PROFILE = { handle: "amy", address: ADDRESS, publicSince: "2026-11-09T12:00:00.000Z", shareHistory: false };
type Reply = { ok: boolean; status: number; body: unknown };
const OK = (body: unknown): Reply => ({ ok: true, status: 200, body });
const NO = (status: number, error: string): Reply => ({ ok: false, status, body: { error } });

interface Options {
  wallet?: ConnectedWallet | null;
  isPublic?: typeof PROFILE | null;
  suggestion?: string | null;
  publish?: Reply;
  sign?: () => Promise<{ signature: string }>;
  wallets?: WalletSummary[];
}

const tick = async () => {
  for (let i = 0; i < 8; i++) await new Promise((resolve) => setTimeout(resolve, 0));
};

async function panel(options: Options = {}) {
  const asked: [ApiPath, Record<string, unknown>][] = [];
  const signed: string[] = [];
  let current = options.wallet === undefined ? WALLET : options.wallet;
  const wallet: WalletAccess = {
    current: async () => current,
    connect: async (choose) => {
      const list = options.wallets ?? [{ id: "slush", name: "Slush" }];
      const picked = list.length === 1 ? list[0] : await choose(list);
      if (!picked) return null;
      current = { ...WALLET, walletId: picked.id, walletName: picked.name };
      return current;
    },
    sign: async () => ({ digest: "D" }),
    signMessage: async (_wallet, message) => {
      signed.push(message);
      return options.sign ? options.sign() : { signature: "SIG" };
    },
  };
  const view = createGoPublicPanel({
    wallet,
    layout: () => undefined,
    api: (async (path: ApiPath, body: Record<string, unknown>) => {
      asked.push([path, body]);
      switch (path) {
        case "/social/profile/by-address":
          return OK(options.isPublic ? { public: true, profile: options.isPublic } : { public: false });
        case "/social/suins":
          return OK({ suggestion: options.suggestion ?? null });
        case "/social/profile/challenge":
          return OK({ message: MESSAGE });
        case "/social/profile/publish":
          return options.publish ?? OK({ ok: true, profile: { ...PROFILE, handle: body.handle } });
        case "/social/profile/update":
          return OK({ ok: true, profile: { ...PROFILE, shareHistory: body.shareHistory } });
        default:
          return OK({ ok: true });
      }
    }) as never,
  });
  await view.load();
  const q = <T extends Element>(selector: string) => view.node.querySelector<T>(selector);
  const named = (label: string) => [...view.node.querySelectorAll("button")].find((node) => node.textContent === label) as HTMLButtonElement;
  const type = (text: string) => {
    q<HTMLInputElement>(".go-public-handle")!.value = text;
  };
  return { view, asked, signed, q, named, type, status: () => q(".go-public-status")?.textContent ?? "", paths: () => asked.map(([path]) => path) };
}

test("handles are checked before anything is signed", () => {
  assert.equal(handleProblem("Arsenal_Fan"), null);
  assert.match(handleProblem("ab")!, /3 to 20/);
  assert.match(handleProblem("has space")!, /3 to 20/);
});

test("errors read in plain words", () => {
  assert.match(socialErrorText("handle_taken"), /taken/);
  assert.match(socialErrorText("record_already_public"), /another wallet/);
  assert.match(socialErrorText(undefined, "User rejected the request"), /cancelled in your wallet/);
  assert.match(socialErrorText(undefined), /didn't work/);
});

test("the panel starts empty, or with the SuiNS suggestion", async () => {
  assert.equal((await panel()).q<HTMLInputElement>(".go-public-handle")!.value, "");
  assert.equal((await panel({ suggestion: "alice" })).q<HTMLInputElement>(".go-public-handle")!.value, "alice");
});

test("the share-history toggle is off by default", async () => {
  assert.equal((await panel()).q<HTMLInputElement>(".toggle-box")!.checked, false);
});

test("publishing signs the Worker's message and shows the public state", async () => {
  const p = await panel();
  p.type("Amy_1");
  p.named("Go public").click();
  await tick();
  assert.deepEqual(p.signed, [MESSAGE]);
  assert.deepEqual(p.asked.find(([path]) => path === "/social/profile/challenge")?.[1], { address: ADDRESS, action: "publish" });
  assert.deepEqual(p.asked.find(([path]) => path === "/social/profile/publish")?.[1], { address: ADDRESS, signature: "SIG", handle: "amy_1" });
  assert.equal(p.q(".go-public-title")?.textContent, "You're public as @amy_1");
  assert.equal(p.q<HTMLAnchorElement>("a")?.href, "https://soothia.fun/u/amy_1");
});

test("a bad handle signs nothing", async () => {
  const p = await panel();
  p.type("x");
  p.named("Go public").click();
  await tick();
  assert.match(p.status(), /3 to 20/);
  assert.equal(p.signed.length, 0);
  assert.equal(p.paths().includes("/social/profile/challenge"), false);
});

test("sharing history at publish takes a second signature", async () => {
  const p = await panel();
  p.type("amy");
  p.q<HTMLInputElement>(".toggle-box")!.checked = true;
  p.named("Go public").click();
  await tick();
  assert.equal(p.signed.length, 2);
  assert.deepEqual(p.asked.find(([path]) => path === "/social/profile/update")?.[1], { address: ADDRESS, signature: "SIG", shareHistory: true });
});

test("no wallet: the button offers to connect, then publishes", async () => {
  const p = await panel({ wallet: null });
  assert.ok(p.named("Connect wallet to go public"));
  p.type("amy");
  p.named("Connect wallet to go public").click();
  await tick();
  assert.equal(p.signed.length, 1);
  assert.equal(p.q(".go-public-title")?.textContent, "You're public as @amy");
});

test("connecting a wallet that is already public shows that instead of publishing", async () => {
  const asked = await panel({ wallet: null, isPublic: PROFILE });
  asked.type("other");
  asked.named("Connect wallet to go public").click();
  await tick();
  assert.equal(asked.signed.length, 0);
  assert.equal(asked.q(".go-public-title")?.textContent, "You're public as @amy");
});

test("several wallets show a picker", async () => {
  const p = await panel({ wallet: null, wallets: [{ id: "slush", name: "Slush" }, { id: "phantom", name: "Phantom" }] });
  p.type("amy");
  p.named("Connect wallet to go public").click();
  await tick();
  assert.equal(p.status(), "Choose a wallet.");
  [...p.q(".wallet-picker")!.querySelectorAll("button")].find((node) => node.textContent === "Phantom")!.click();
  await tick();
  assert.equal(p.signed.length, 1);
});

test("a taken handle says so and keeps the form", async () => {
  const p = await panel({ publish: NO(409, "handle_taken") });
  p.type("amy");
  p.named("Go public").click();
  await tick();
  assert.match(p.status(), /taken/);
  assert.ok(p.q(".go-public-handle"));
  assert.equal(p.named("Go public").disabled, false);
});

test("cancelling in the wallet changes nothing", async () => {
  const p = await panel({
    sign: async () => {
      throw new Error("User rejected");
    },
  });
  p.type("amy");
  p.named("Go public").click();
  await tick();
  assert.equal(p.status(), "You cancelled in your wallet. Nothing changed.");
  assert.equal(p.paths().includes("/social/profile/publish"), false);
});

test("a public wallet sees its handle, a page link and Unpublish", async () => {
  const p = await panel({ isPublic: PROFILE });
  assert.equal(p.q(".go-public-title")?.textContent, "You're public as @amy");
  assert.equal(p.q<HTMLAnchorElement>("a")?.href, "https://soothia.fun/u/amy");
  assert.equal(p.paths().includes("/social/suins"), false);
});

test("the history toggle updates, signed", async () => {
  const p = await panel({ isPublic: PROFILE });
  const box = p.q<HTMLInputElement>(".toggle-box")!;
  box.checked = true;
  box.dispatchEvent(new dom.window.Event("change"));
  await tick();
  assert.deepEqual(p.asked.find(([path]) => path === "/social/profile/update")?.[1], { address: ADDRESS, signature: "SIG", shareHistory: true });
  assert.equal(p.q<HTMLInputElement>(".toggle-box")!.checked, true);
});

test("a cancelled history change puts the toggle back", async () => {
  const p = await panel({
    isPublic: PROFILE,
    sign: async () => {
      throw new Error("User rejected");
    },
  });
  const box = p.q<HTMLInputElement>(".toggle-box")!;
  box.checked = true;
  box.dispatchEvent(new dom.window.Event("change"));
  await tick();
  assert.equal(box.checked, false);
});

test("unpublish returns to the form", async () => {
  const p = await panel({ isPublic: PROFILE });
  p.named("Unpublish").click();
  await tick();
  assert.ok(p.paths().includes("/social/profile/unpublish"));
  assert.ok(p.q(".go-public-handle"));
  assert.equal(p.status(), "You're private again.");
});

test("the wallet layer signs only the ownership message", async () => {
  const calls: unknown[] = [];
  const access = createWalletAccess({ call: async (method, params) => (calls.push([method, params]), { signature: "S" }) }, { read: async () => WALLET, write: async () => undefined, clear: async () => undefined }, async () => ({ ok: true }));
  await assert.rejects(access.signMessage(WALLET, "transfer everything"), /refused/);
  assert.equal(calls.length, 0);
  const message = `Soothia: confirm you own this wallet.\nAddress: ${ADDRESS}\nNonce: n`;
  assert.deepEqual(await access.signMessage(WALLET, message), { signature: "S" });
  assert.deepEqual(calls, [["signPersonalMessage", { walletId: "slush", address: ADDRESS, message }]]);
});

const ROW = { rank: 1, handle: "amy", score: 720, calls: 14, hitRate: 0.75 };

async function board(reply: Reply = OK({ rows: [ROW] })) {
  const pane = document.createElement("div");
  const asked: unknown[] = [];
  const view = createLeaderboardView(pane, { layout: () => undefined, api: (async (_path: string, body: unknown) => (asked.push(body), reply)) as never });
  await view.render();
  return { pane, asked, text: () => pane.textContent ?? "", view };
}

test("the Leaderboard tab shows the score board with a See all link", async () => {
  const b = await board();
  assert.deepEqual(b.asked, [{ board: "score", period: "all" }]);
  assert.match(b.text(), /@amy/);
  assert.match(b.text(), /720/);
  assert.match(b.text(), /14 calls · 75% right/);
  const links = [...b.pane.querySelectorAll("a")].map((a) => a.href);
  assert.ok(links.includes("https://soothia.fun/u/amy"));
  assert.ok(links.includes("https://soothia.fun/leaderboard"));
});

test("the period switch reloads the board", async () => {
  const b = await board();
  [...b.pane.querySelectorAll("button")].find((node) => node.textContent === "Week")!.click();
  await tick();
  assert.deepEqual(b.asked.at(-1), { board: "score", period: "week" });
});

test("an empty board and a failed one say so", async () => {
  assert.match((await board(OK({ rows: [] }))).text(), /Nobody qualifies yet/);
  assert.match((await board(NO(502, "x"))).text(), /Couldn't load/);
});
