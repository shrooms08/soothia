// Landing footer screenshots (rest and hover) in a plain browser, no extension.
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";
const out = fileURLToPath(new URL("../../design/applied/", import.meta.url));
const url = process.argv[2] || "https://soothia.fun/";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 820 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "networkidle" });
await page.locator(".maker").scrollIntoViewIfNeeded();
await page.waitForTimeout(1200);
await page.locator(".footer").screenshot({ path: `${out}footer-wizard.png` });
await page.hover(".maker");
await page.waitForTimeout(900);
await page.locator(".footer").screenshot({ path: `${out}footer-wizard-hover.png` });
console.log("footer-wizard, footer-wizard-hover");
await browser.close();
