// Headless check of the share page's bet flow against the deployed site, with
// a fake Phantom that signs with a throwaway, unfunded keypair. The pipeline
// runs build -> sign -> check -> send; Solana refuses the send because the
// wallet is empty, so nothing real happens. Also checks the Phantom deep link
// on a mobile browser without a wallet. `node design/tools/share-bet-check.mjs`
import { fileURLToPath } from "node:url";
import { chromium, devices } from "../../scripts/node_modules/playwright/index.mjs";
import { Keypair, VersionedTransaction } from "../../worker/node_modules/@solana/web3.js/lib/index.cjs.js";

const MARKET = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";
const SITE = "https://soothia.heylana.workers.dev";
const URL_ = `${SITE}/m/${MARKET}`;
const out = fileURLToPath(new URL("../applied/", import.meta.url));
const keypair = Keypair.generate();
const PUBKEY = keypair.publicKey.toBase58();
let failures = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "ok " : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`); if (!ok) failures++; };

const browser = await chromium.launch();

// ---- Desktop with a fake Phantom ----
{
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await page.exposeFunction("__soothiaSign", (base64) => {
    const tx = VersionedTransaction.deserialize(Buffer.from(base64, "base64"));
    tx.sign([keypair]);
    return Buffer.from(tx.serialize()).toString("base64");
  });
  await page.addInitScript((pubkey) => {
    window.phantom = {
      solana: {
        isPhantom: true,
        publicKey: null,
        connect: async () => { const pk = { toString: () => pubkey }; window.phantom.solana.publicKey = pk; return { publicKey: pk }; },
        signTransaction: async (tx) => {
          const base64 = btoa(String.fromCharCode(...tx.serialize()));
          const signed = await window.__soothiaSign(base64);
          return { serialize: () => Uint8Array.from(atob(signed), (c) => c.charCodeAt(0)) };
        },
      },
    };
  }, PUBKEY);
  const requests = [];
  page.on("request", (r) => { if (r.url().includes("soothia-proxy")) requests.push(`${r.method()} ${r.url().replace("https://soothia-proxy.heylana.workers.dev", "")}`); });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const quote = page.locator("#quote");
  await page.waitForFunction(() => /shares for \$/.test(document.getElementById("quote")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  const quoteText = await quote.textContent();
  check("quote line renders", /^~\d+\.\d\d YES shares for \$1\.02 incl\. 2% fee$/.test(quoteText), quoteText);
  const yesPct = await page.locator('[data-pct="yes"]').first().textContent();
  check("odds have one decimal (or a dash when Panta has no price)", /^\d+\.\d%$/.test(yesPct) || yesPct === "—", yesPct);
  const fine = await page.locator("main > .fine").textContent();
  check("closing time is local", /Buying closes \w{3}, \w{3} \d{1,2}, \d{1,2}:\d{2}/.test(fine), fine);
  await page.click("text=Connect Phantom");
  await page.waitForSelector(".wallet-row", { timeout: 5000 });
  check("connected address shown", (await page.locator(".wallet-row .mono").textContent()).includes(PUBKEY.slice(0, 4)));
  // Switch to NO $5 and back to check the quote follows.
  await page.click('.side[data-side="no"]');
  await page.click('.chip[data-amount="5"]');
  await page.waitForFunction(() => /NO shares for \$5\.10/.test(document.getElementById("quote")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  check("quote follows side and amount", /NO shares for \$5\.10/.test(await quote.textContent()), await quote.textContent());
  await page.click('.side[data-side="yes"]');
  await page.click('.chip[data-amount="1"]');
  await page.waitForFunction(() => /YES shares for \$1\.02/.test(document.getElementById("quote")?.textContent ?? ""), null, { timeout: 15000 }).catch(() => {});
  check("place button is enabled", !(await page.locator("#place").isDisabled()));
  await page.screenshot({ path: `${out}share-bet-desktop.png` });
  await page.click("#place");
  await page.waitForFunction(() => document.getElementById("status")?.classList.contains("error") || !document.getElementById("outcome")?.hidden, null, { timeout: 60000 });
  const status = await page.locator("#status").textContent();
  const stepStates = await page.$$eval("#steps .step", (items) => items.map((i) => `${i.querySelector(".step-label").textContent}:${i.dataset.state}`));
  check("pipeline reached Sending and Solana refused the empty wallet", /wallet is empty|not have enough SOL/.test(status), status);
  check("steps show Signing done, Sending error", stepStates.join(",") === "Signing:done,Sending:error,Confirming:todo,Recording:todo", stepStates.join(","));
  check("proxy calls: quote, build, send (no confirm)", requests.some((r) => r.startsWith(`POST /api/actions/market/${MARKET}?side=yes&amount=1.00`)) && requests.some((r) => r === "POST /api/tx/send") && !requests.some((r) => r.includes("/confirm")), requests.join(" | "));
  await page.close();
}

// ---- Mobile without a wallet ----
{
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForTimeout(3200);
  const yes = await page.getAttribute('a[data-deeplink="yes"]', "href");
  const connect = await page.getAttribute('a[data-deeplink="connect"]', "href");
  const expectedYes = `https://phantom.app/ul/browse/${encodeURIComponent(`${URL_}?side=yes`)}?ref=${encodeURIComponent(SITE)}`;
  check("mobile Bet YES deep-links into Phantom", yes === expectedYes, yes);
  check("mobile Connect deep-links into Phantom", connect === `https://phantom.app/ul/browse/${encodeURIComponent(`${URL_}?side=yes`)}?ref=${encodeURIComponent(SITE)}`, connect);
  check("no horizontal scroll on phone", (await page.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await page.screenshot({ path: `${out}share-bet-mobile.png` });
  await context.close();
}
await browser.close();
console.log(failures ? `${failures} check(s) failed` : "all checks passed");
process.exit(failures ? 1 : 0);
