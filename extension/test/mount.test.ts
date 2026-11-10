// The content script must mount the orb from a cold start. This bundles the real
// src/content.ts and runs it in jsdom with a fake chrome.*, so any error during the
// card's init (which the script's guards would otherwise swallow) shows up as no orb.
// Regression for 0.16.3, where the orb never appeared. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";
import { JSDOM } from "jsdom";

const bundle = buildSync({
  entryPoints: [fileURLToPath(new URL("../src/content.ts", import.meta.url))],
  bundle: true,
  format: "iife",
  target: "chrome110",
  write: false,
  logLevel: "silent",
}).outputFiles[0].text;

const RECALL_ID = "208c1234-5678-4abc-9def-0123456ffb9f";

async function mountWith(stored: Record<string, unknown>, health: { online: boolean } | undefined) {
  const dom = new JSDOM(
    "<!doctype html><html><head><title>A page</title></head><body><p>Arsenal will host Chelsea on Saturday.</p></body></html>",
    {
      url: "https://example.com/article",
      runScripts: "outside-only",
      pretendToBeVisual: true,
    },
  );
  const { window } = dom;
  const errors: string[] = [];
  const data = new Map(Object.entries(stored));
  const get = async (keys?: string | string[] | null) => {
    if (keys === null || keys === undefined) return Object.fromEntries(data);
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(list.filter((key) => data.has(key)).map((key) => [key, data.get(key)]));
  };
  const area = {
    get,
    set: async (values: Record<string, unknown>) => Object.entries(values).forEach(([k, v]) => data.set(k, v)),
    remove: async (key: string) => void data.delete(key),
  };
  const listeners = { addListener: () => undefined, removeListener: () => undefined };
  Object.assign(window, {
    chrome: {
      runtime: {
        id: "test",
        getURL: (path: string) => `chrome-extension://test/${path}`,
        getManifest: () => ({ version: "0.0.0-test" }),
        sendMessage: async (message: { type?: string }) => (message?.type === "soothia:v1:health" ? health : undefined),
        onMessage: listeners,
      },
      storage: { local: area, session: area, onChanged: listeners },
    },
    matchMedia: () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }),
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    IntersectionObserver: class {
      observe() {}
      disconnect() {}
    },
  });
  window.addEventListener("error", (event) => errors.push(String(event.error ?? event.message)));
  // The script's own guards hide its errors; this reports what they hid.
  const original = window.console.warn.bind(window.console);
  window.console.warn = (...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
    original(...args);
  };
  window.eval(bundle);
  for (let i = 0; i < 40 && !window.document.getElementById("soothia-host"); i++)
    await new Promise((resolve) => setTimeout(resolve, 25));
  const host = window.document.getElementById("soothia-host");
  window.close();
  return { host, errors };
}

for (const [name, stored, health] of [
  ["no stored recall id, proxy status unknown", {}, undefined],
  ["a stored recall id, proxy online", { "soothia.recallId": RECALL_ID }, { online: true }],
  [
    "a stored recall id and wallet, proxy offline",
    {
      "soothia.recallId": RECALL_ID,
      "soothia.suiWallet": {
        address: `0x${"8e".repeat(32)}`,
        walletId: "slush",
        walletName: "Slush",
        site: "soothia.fun",
      },
    },
    { online: false },
  ],
] as const) {
  test(`the orb mounts with ${name}`, async () => {
    const { host, errors } = await mountWith(stored as Record<string, unknown>, health);
    assert.ok(host, `no orb host. Errors: ${errors.join(" | ") || "none reported"}`);
    assert.equal(host.parentElement?.tagName, "HTML");
  });
}
