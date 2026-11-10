// The page bridge's message filter, the signing gate and the settings UI.
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { acceptRequest, acceptResponse, WALLET_CHANNEL } from "../src/wallet-protocol";
import { isOwnershipMessage, signChecked, type TxChecker, type WalletBridge } from "../src/wallet-client";
import type { ExpectedTx } from "../src/tx-check";
import type { ConnectedWallet } from "../src/wallet-protocol";

const NONCE = "nonce-1";
const win = { location: { origin: "https://example.com" } };
const request = { channel: WALLET_CHANNEL, direction: "request", nonce: NONCE, id: "w1", method: "list", params: {} };
const response = { channel: WALLET_CHANNEL, direction: "response", nonce: NONCE, id: "w1", ok: true };
const event = (data: unknown, overrides: Record<string, unknown> = {}) => ({
  source: win,
  origin: win.location.origin,
  data,
  ...overrides,
});

test("a well-formed request and response are accepted", () => {
  assert.deepEqual(acceptRequest(event(request), win, NONCE), request);
  assert.deepEqual(acceptResponse(event(response), win, NONCE), response);
});

test("anything else is ignored", () => {
  const bad: [string, ReturnType<typeof event>][] = [
    ["another window", event(request, { source: {} })],
    ["no source", event(request, { source: null })],
    ["another origin", event(request, { origin: "https://evil.example" })],
    ["wrong nonce", event({ ...request, nonce: "guess" })],
    ["no nonce", event({ ...request, nonce: undefined })],
    ["wrong channel", event({ ...request, channel: "other" })],
    ["a response sent as a request", event(response)],
    ["an unknown method", event({ ...request, method: "drainWallet" })],
    ["no params", event({ ...request, params: undefined })],
    ["a numeric id", event({ ...request, id: 1 })],
    ["text", event("hello")],
    ["null", event(null)],
  ];
  for (const [name, message] of bad) assert.equal(acceptRequest(message, win, NONCE), null, name);
  assert.equal(acceptResponse(event(request), win, NONCE), null);
  assert.equal(acceptResponse(event({ ...response, nonce: "guess" }), win, NONCE), null);
  assert.equal(acceptResponse(event({ ...response, ok: "yes" }), win, NONCE), null);
});

const WALLET: ConnectedWallet = { address: "0xabc", walletId: "slush", walletName: "Slush" };
const EXPECTED: ExpectedTx = { kind: "claim", poolId: "0x1" };

function recordingBridge(): { bridge: WalletBridge; calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    bridge: {
      call: async (method, params) => {
        calls.push([method, params]);
        return { digest: "D" };
      },
    },
  };
}

const OWNERSHIP = `Soothia: confirm you own this wallet.\nThis is not a transaction and costs nothing.\n\nAction: publish\nAddress: 0xabc\nNonce: n\nExpires: t`;

test("only Soothia's ownership message, for this address, may be signed", () => {
  assert.equal(isOwnershipMessage(OWNERSHIP, "0xabc"), true);
  assert.equal(isOwnershipMessage(OWNERSHIP, "0xdef"), false);
  assert.equal(isOwnershipMessage("Please sign this", "0xabc"), false);
  assert.equal(isOwnershipMessage(`${OWNERSHIP}${"x".repeat(400)}`, "0xabc"), false);
  assert.equal(isOwnershipMessage(7, "0xabc"), false);
});

test("the sign-message method passes the filter", () => {
  assert.ok(acceptRequest(event({ ...request, method: "signPersonalMessage" }), win, NONCE));
});

test("checked bytes go to the wallet unchanged", async () => {
  const { bridge, calls } = recordingBridge();
  const result = await signChecked(bridge, async () => ({ ok: true }), WALLET, "BYTES", EXPECTED);
  assert.deepEqual(result, { digest: "D" });
  assert.deepEqual(calls, [["signAndExecute", { walletId: "slush", address: "0xabc", txBytes: "BYTES" }]]);
});

test("a refusal never reaches the wallet", async () => {
  const { bridge, calls } = recordingBridge();
  await assert.rejects(
    signChecked(bridge, async () => ({ ok: false, reason: "Transaction refused. Nope." }), WALLET, "BYTES", EXPECTED),
    /Nope/,
  );
  assert.deepEqual(calls, []);
});

test("no answer from the check counts as a refusal", async () => {
  const { bridge, calls } = recordingBridge();
  const silent: TxChecker = async () => undefined;
  await assert.rejects(signChecked(bridge, silent, WALLET, "BYTES", EXPECTED), /could not be checked/);
  assert.deepEqual(calls, []);
});

const dom = new JSDOM("<!doctype html><body></body>");
Object.assign(globalThis, { document: dom.window.document });
const { createWalletSettings, isConnectedWallet, shortAddress } = await import("../src/wallet-settings");

const ADDRESS = `0x${"ab".repeat(32)}`;

function settings(wallets: { id: string; name: string }[], saved: unknown = undefined, failConnect = false) {
  const store = { value: saved as unknown };
  const calls: string[] = [];
  const view = createWalletSettings(
    {
      call: async (method, params) => {
        calls.push(`${method}:${String(params?.walletId ?? "")}`);
        if (method === "list") return wallets;
        if (method === "connect") {
          if (failConnect) throw new Error("User rejected");
          return { address: ADDRESS, walletName: wallets.find((wallet) => wallet.id === params?.walletId)?.name };
        }
        return undefined;
      },
    },
    {
      read: async () => store.value,
      write: async (wallet) => {
        store.value = wallet;
      },
      clear: async () => {
        store.value = undefined;
      },
    },
  );
  const buttons = () => [...view.root.querySelectorAll("button")].filter((node) => !node.hidden);
  const named = (name: string) => buttons().find((node) => node.textContent === name);
  const note = () => view.root.querySelector(".wallet-note")?.textContent ?? "";
  return { view, store, calls, buttons, named, note };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const SLUSH = { id: "slush", name: "Slush" };
const PHANTOM = { id: "phantom", name: "Phantom" };

test("one wallet connects straight away and is saved", async () => {
  const s = settings([SLUSH]);
  await s.view.load();
  s.named("Connect Sui wallet")!.click();
  await tick();
  assert.deepEqual(s.store.value, { address: ADDRESS, walletId: "slush", walletName: "Slush" });
  assert.equal(s.note(), `Connected to Slush: ${shortAddress(ADDRESS)}`);
  assert.ok(s.named("Disconnect"));
  assert.equal(s.named("Connect Sui wallet"), undefined);
});

test("several wallets show a picker, and picking one connects it", async () => {
  const s = settings([SLUSH, PHANTOM]);
  await s.view.load();
  s.named("Connect Sui wallet")!.click();
  await tick();
  assert.equal(s.note(), "Choose a wallet.");
  s.named("Phantom")!.click();
  await tick();
  assert.equal((s.store.value as ConnectedWallet).walletId, "phantom");
  assert.equal(s.named("Slush"), undefined);
});

test("no wallet says so", async () => {
  const s = settings([]);
  await s.view.load();
  s.named("Connect Sui wallet")!.click();
  await tick();
  assert.equal(s.note(), "No Sui wallet found in this browser.");
  assert.equal(s.store.value, undefined);
});

test("a rejected connection saves nothing and shows why", async () => {
  const s = settings([SLUSH], undefined, true);
  await s.view.load();
  s.named("Connect Sui wallet")!.click();
  await tick();
  assert.equal(s.store.value, undefined);
  assert.equal(s.note(), "User rejected");
});

test("a saved wallet shows on load and can be disconnected", async () => {
  const s = settings([SLUSH], { address: ADDRESS, walletId: "slush", walletName: "Slush" });
  await s.view.load();
  assert.match(s.note(), /^Connected to Slush/);
  s.named("Disconnect")!.click();
  await tick();
  assert.equal(s.store.value, undefined);
  assert.ok(s.named("Connect Sui wallet"));
  assert.ok(s.calls.includes("disconnect:slush"));
});

test("Test wallet is hidden until debug is on, and only shows the address", async () => {
  const s = settings([SLUSH]);
  await s.view.load();
  assert.equal(s.named("Test wallet"), undefined);
  s.view.setDebugVisible(true);
  s.named("Test wallet")!.click();
  await tick();
  assert.equal(s.note(), `Test wallet: ${ADDRESS}`);
  assert.equal(s.store.value, undefined);
});

test("saved values are checked before use", () => {
  assert.equal(isConnectedWallet({ address: "0x1" }), false);
  assert.equal(isConnectedWallet(null), false);
  assert.equal(isConnectedWallet({ address: "0x1", walletId: "a", walletName: "b" }), true);
});
