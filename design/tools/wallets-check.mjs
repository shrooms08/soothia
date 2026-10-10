// Headless check of the Wallet Standard layer: two fake wallets ("Phantom" and
// "Jupiter") register through wallet-standard:register-wallet with connect and
// signTransaction stubs backed by throwaway, unfunded keypairs. On the share
// page the picker must list both, connecting with Jupiter signs and the bet
// pipeline runs to Solana's insufficient-funds refusal. In the extension card
// (dry run, localhost harness) the same picker connects Jupiter and the bet
// sheet reaches "Dry run complete". On a phone with no wallet, only the
// verified deep links render. `node design/tools/wallets-check.mjs`
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "../../scripts/node_modules/playwright/index.mjs";
import { Keypair, VersionedTransaction } from "../../worker/node_modules/@solana/web3.js/lib/index.cjs.js";
import { ed25519 } from "../../worker/node_modules/@noble/curves/ed25519.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const out = `${root}design/applied/`;
const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const SITE = "https://soothia.fun";
const SHARE = `${SITE}/m/${MARKET}`;
let failures = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok " : "FAIL"} ${name}${detail ? ` (${String(detail).slice(0, 160)})` : ""}`); if (!ok) failures++; };

const keys = { Phantom: Keypair.generate(), Jupiter: Keypair.generate() };
const PUBKEYS = Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, key.publicKey.toBase58()]));
const ICON = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#AB9FF2"/></svg>').toString("base64");

// Registers the fake wallets in the page's MAIN world (where the real ones live).
const fakeWallets = ({ pubkeys, icon }) => {
  const make = (name, address) => {
    const account = { address, publicKey: new Uint8Array(32), chains: ["solana:mainnet"], features: ["solana:signTransaction"] };
    const wallet = {
      version: "1.0.0", name, icon, chains: ["solana:mainnet"], accounts: [],
      features: {
        // Like a real wallet: a silent connect only succeeds once the site was approved.
        "standard:connect": { version: "1.0.0", connect: async (input) => {
          const key = "fake-trusted:" + name;
          let trusted = false;
          try { trusted = sessionStorage.getItem(key) === "1"; } catch {}
          if (input?.silent && !trusted) throw new Error("not trusted");
          try { sessionStorage.setItem(key, "1"); } catch {}
          wallet.accounts = [account];
          return { accounts: [account] };
        } },
        "standard:disconnect": { version: "1.0.0", disconnect: async () => { wallet.accounts = []; } },
        "standard:events": { version: "1.0.0", on: () => () => {} },
        "solana:signTransaction": {
          version: "1.0.0", supportedTransactionVersions: ["legacy", 0],
          signTransaction: async (...inputs) => {
            const outputs = [];
            for (const input of inputs) {
              const base64 = btoa(String.fromCharCode(...input.transaction));
              const signed = await window.__soothiaSign(name, base64);
              outputs.push({ signedTransaction: Uint8Array.from(atob(signed), (c) => c.charCodeAt(0)) });
            }
            return outputs;
          },
        },
      },
    };
    return wallet;
  };
  const wallets = Object.entries(pubkeys).map(([name, address]) => make(name, address));
  const register = ({ register }) => { register(...wallets); };
  window.addEventListener("wallet-standard:app-ready", ({ detail }) => register(detail));
  try { window.dispatchEvent(new CustomEvent("wallet-standard:register-wallet", { detail: register })); } catch {}
};
const signer = (name, base64) => {
  const tx = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
  try {
    tx.sign([keys[name]]);
  } catch {
    // The extension harness signs a fixture built for another wallet (dry run, never sent):
    // put a real ed25519 signature over the message in the fee payer's slot.
    tx.signatures[0] = ed25519.sign(tx.message.serialize(), keys[name].secretKey.slice(0, 32));
  }
  return Buffer.from(tx.serialize()).toString("base64");
};

const browser = await chromium.launch();

// ---- Share page, desktop, two fake standard wallets ----
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await page.exposeFunction("__soothiaSign", signer);
  await page.addInitScript(fakeWallets, { pubkeys: PUBKEYS, icon: ICON });
  await page.goto(SHARE, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-action="connect"]', { timeout: 10000 });
  await page.click('[data-action="connect"]');
  const options = await page.$$eval(".wallet-option", (nodes) => nodes.map((n) => n.textContent.trim()));
  check("share page picker lists both fake wallets", options.join(",") === "Phantom,Jupiter" || options.join(",") === "Jupiter,Phantom", options.join(","));
  check("picker shows wallet icons", (await page.$$("img.wallet-icon")).length === 2);
  await page.screenshot({ path: `${out}share-wallet-picker.png` });
  await page.click('.wallet-option[data-wallet="Jupiter"]');
  await page.waitForSelector(".wallet-row", { timeout: 5000 });
  const row = await page.locator(".wallet-row").innerText();
  check("connected row shows Jupiter and its address", /Jupiter/.test(row) && row.includes(PUBKEYS.Jupiter.slice(0, 4)), row.replace(/\s+/g, " "));
  check("last wallet remembered", (await page.evaluate(() => localStorage.getItem("soothia:wallet"))) === "Jupiter");
  await page.waitForFunction(() => /shares for \$1\.02/.test(document.getElementById("quote")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  await page.click("#place");
  await page.waitForFunction(() => document.getElementById("status")?.classList.contains("error") || !document.getElementById("outcome")?.hidden, null, { timeout: 60000 });
  const status = await page.locator("#status").textContent();
  const states = await page.$$eval("#steps .step", (items) => items.map((i) => i.dataset.state));
  check("Jupiter signed and Solana refused the empty wallet", /wallet is empty|not have enough SOL/.test(status), status);
  check("steps: Signing done, Sending error", states.join(",") === "done,error,todo,todo", states.join(","));
  // Reload: the remembered wallet reconnects silently.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".wallet-row", { timeout: 8000 }).catch(() => {});
  check("remembered wallet auto-connects on the next visit", (await page.locator(".wallet-row").count()) === 1 && /Jupiter/.test(await page.locator(".wallet-row").innerText().catch(() => "")));
  await page.close();
}

// ---- Share page, desktop, no wallet ----
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(SHARE, { waitUntil: "networkidle" });
  await page.waitForTimeout(3800);
  const text = await page.locator("#wallet").innerText();
  check("desktop without a wallet: install links", /No Solana wallet found/.test(text) && /Phantom/.test(text) && /Solflare/.test(text) && /Backpack/.test(text) && /Jupiter/.test(text), text.replace(/\s+/g, " "));
  await page.close();
}

// ---- Share page, phone, no wallet ----
{
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await page.goto(`${SHARE}?side=no`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3800);
  const links = await page.$$eval("a[data-deeplink]", (nodes) => nodes.map((n) => [n.dataset.deeplink, n.href]));
  const names = links.map(([name]) => name).join(",");
  check("phone deep links only for verified wallets", names === "Phantom,Solflare,Backpack", names);
  const page_ = encodeURIComponent(`${SHARE}?side=no`);
  const ref = encodeURIComponent(SITE);
  check("Phantom link", links[0]?.[1] === `https://phantom.com/ul/browse/${page_}?ref=${ref}`, links[0]?.[1]);
  check("Solflare link", links[1]?.[1] === `https://solflare.com/ul/v1/browse/${page_}?ref=${ref}`, links[1]?.[1]);
  check("Backpack link", links[2]?.[1] === `https://backpack.app/ul/v1/browse/${page_}?ref=${ref}`, links[2]?.[1]);
  check("Copy link with the paste hint", (await page.locator('[data-action="copy-link"]').count()) === 1 && /Paste it into your wallet app's browser/.test(await page.locator("#wallet").innerText()));
  await page.screenshot({ path: `${out}share-wallet-phone.png` });
  await context.close();
}
await browser.close();

// ---- Extension card: picker + dry-run bet with the fake Jupiter wallet ----
{
  const tools = `${root}design/tools/`;
  const server = createServer(async (request, response) => {
    const file = request.url === "/" ? "dark.html" : request.url.slice(1).split("?")[0];
    try {
      const body = await readFile(tools + file);
      response.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : "text/html" });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://localhost:${server.address().port}`;
  const txBase64 = (await readFile(`${root}extension/test/fixtures/panta-create-tx.txt`, "utf8")).trim();
  const soon = new Date(Date.now() + 5 * 60_000).toISOString();
  const mocks = {
    "/wallet/balances": { sol: 0.05, usdc: 18 },
    "/buy/quote": { quoteId: "qt_mock", marketId: MARKET, side: "yes", amountUsdc: 1, shares: 1.996677, avgPrice: 0.500832, feeUsdc: 0.02, totalUsdc: 1.02, payoutPerShareUsdc: 1, expiresAt: soon },
    "/buy/build": { orderId: "ord_mock", txBase64, bytes: 706, expectedShares: 1.996677, expiresAt: soon },
    "/tx/simulate": { ok: true, err: null, reason: null, logLine: null, logs: [], unitsConsumed: 31800 },
    "/creator/markets": { markets: [] },
  };
  const tile = { claim: { id: "c2", question: "Will the Lakers win the Western Conference this season?", category: "sports", endTime: "2026-06-30T23:59:59Z", sourceQuote: "Lakers win the West.", confidence: 0.8, resolution: { type: "sports_result", details: "", sources: ["https://www.espn.com"] } }, market: { id: MARKET, title: "Will the Lakers win the Western Conference this season?", category: "sports", yesPrice: 0.62, noPrice: 0.38, endTime: "2026-06-30T23:59:59Z" } };
  const userDataDir = `${root}design/tools/.chromium-profile-wallets`;
  await rm(userDataDir, { recursive: true, force: true });
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium", headless: true, viewport: { width: 980, height: 760 }, deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${root}extension/dist`, `--load-extension=${root}extension/dist`],
  });
  await context.waitForEvent("serviceworker", { timeout: 15000 }).catch(() => {});
  const page = await context.newPage();
  await page.exposeFunction("__soothiaSign", signer);
  await page.addInitScript(fakeWallets, { pubkeys: PUBKEYS, icon: ICON });
  await page.goto(`${base}/dark.html`);
  await page.waitForTimeout(1800);
  const scene = (scene, extra = {}) => page.evaluate(({ scene, extra }) => window.postMessage({ type: "soothia:v1:dev-scene", scene, ...extra }, "*"), { scene, extra });
  const dump = async (selector) => {
    const result = await page.evaluate((selector) => new Promise((resolve) => {
      const onMessage = (event) => { if (event.data?.type === "soothia:v1:dev-dump") { window.removeEventListener("message", onMessage); resolve(selector ? event.data.node : event.data.text); } };
      window.addEventListener("message", onMessage);
      window.postMessage({ type: "soothia:v1:dev-scene", scene: "dump", selector }, "*");
    }), selector);
    return result;
  };
  // The debug footer first (its scene resets the view), then the bet sheet.
  await scene("debug", { mocks, tiles: [tile, tile, tile], dryRun: true });
  await page.waitForTimeout(600);
  await scene("bet", { mocks, tiles: [tile, tile, tile], dryRun: true });
  await page.waitForTimeout(2000);
  let text = await dump();
  console.log("card text:", text.replace(/\s+/g, " ").slice(0, 500));
  check("card debug footer lists both detected wallets", /Wallet: (Phantom, Jupiter|Jupiter, Phantom) detected/.test(text), text.match(/Wallet:[^\n]*/)?.[0]);
  check("bet sheet shows Connect wallet", /Connect wallet/.test(text));
  await scene("press", { selector: ".button.connect" });
  await page.waitForTimeout(800);
  text = await dump();
  check("card picker lists both wallets", /Choose a wallet/.test(text) && /Phantom/.test(text) && /Jupiter/.test(text), text.match(/Choose a wallet[\s\S]{0,60}/)?.[0]?.replace(/\s+/g, " "));
  await page.screenshot({ path: `${out}card-wallet-picker.png` });
  await scene("press", { selector: ".wallet-option:nth-child(2)" });
  await page.waitForTimeout(2500);
  text = await dump();
  console.log("after pick:", text.replace(/\s+/g, " ").slice(0, 300));
  const connectedName = Object.keys(PUBKEYS).find((name) => new RegExp(`${name}\\s*[\\u00b7\\u2022]`).test(text));
  check("card wallet row shows the chosen wallet's name and address", Boolean(connectedName) && text.includes(PUBKEYS[connectedName].slice(0, 4)), text.match(/(Phantom|Jupiter)\s*[\u00b7\u2022][^\n]*/)?.[0]);
  await page.waitForTimeout(1500);
  console.log("buy button before press:", await dump(".sheet-foot .button"));
  await scene("press", { selector: ".sheet-foot .button" });
  for (let i = 0; i < 4; i++) { await page.waitForTimeout(1000); const t = (await dump()).replace(/\s+/g, " "); console.log(`t+${i + 1}s:`, t.slice(t.indexOf("Disconnect"), t.indexOf("Disconnect") + 160)); }
  let done = "";
  for (let i = 0; i < 30 && !/Dry run complete|Nothing was sent|couldn't/.test(done); i++) { await page.waitForTimeout(700); done = (await dump()).replace("Dry run (sign only, never send)", ""); }
  console.log("after buy:", done.replace(/\s+/g, " ").slice(0, 400));
  check("dry-run bet signed by the chosen wallet", /Dry run complete: your wallet signed it/.test(done), done.match(/(Dry run[^\n]*|Cancelled[^\n]*|couldn't[^\n]*|not the one[^\n]*)/)?.[0]);
  await page.screenshot({ path: `${out}card-wallet-dryrun.png` });
  await context.close();
  server.close();
  await rm(userDataDir, { recursive: true, force: true });
}
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
