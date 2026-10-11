// Site images: the 1200x630 Open Graph image rendered with headless Chromium.
// (The "How it works" card images come from design/tools/how-shots.mjs.)
// Run with `npm run make-site-assets`.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const img = `${root}site/img/`;

// The "How it works" card images are made by design/tools/how-shots.mjs.

const lora = (await readFile(`${root}site/fonts/soothia-lora.woff2`)).toString("base64");
const inter = (await readFile(`${root}site/fonts/soothia-inter.woff2`)).toString("base64");
const STAR = `<svg viewBox="-50 -50 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient></defs><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#c)"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></svg>`;
const page = await (await chromium.launch()).newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><style>
@font-face{font-family:Lora;src:url(data:font/woff2;base64,${lora}) format("woff2");font-weight:100 900}
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${inter}) format("woff2");font-weight:100 900}
body{margin:0;width:1200px;height:630px;background:#000;display:flex;align-items:center;justify-content:center;gap:64px;font-family:Inter,sans-serif}
.orb{position:relative;width:220px;height:220px}
.orb-body{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 38% 34%,#FFFFFF 0%,#F4F1FF 24%,#D6D1F6 52%,#AFA9EC 76%,#7F77DD 100%);box-shadow:0 0 50px 8px rgba(127,119,221,.5),0 0 140px 24px rgba(83,74,183,.3)}
.glint{position:absolute;right:-30px;top:-42px;width:100px;height:100px}
.s{position:absolute}
.text{display:flex;flex-direction:column;gap:18px;max-width:640px}
h1{margin:0;font:400 64px/1.1 Lora,serif;color:#F5F0E6;letter-spacing:-.01em}
p{margin:0;font:400 26px/1.4 Inter,sans-serif;color:#A9A5BD}
.brand{font:400 22px/1 Lora,serif;color:#CFCAF6;letter-spacing:.02em}
</style></head><body>
<div class="orb"><div class="orb-body"></div><div class="glint">${STAR}</div><div class="s" style="left:-70px;top:-10px;width:40px;height:40px">${STAR}</div><div class="s" style="left:-100px;top:90px;width:26px;height:26px">${STAR}</div><div class="s" style="left:20px;top:-90px;width:30px;height:30px">${STAR}</div><div class="s" style="left:230px;top:200px;width:22px;height:22px;opacity:.7">${STAR}</div></div>
<div class="text"><div class="brand">Soothia</div><h1>See the odds on everything you read.</h1><p>Claims on X, news and sports pages become live prediction markets on Solana.</p></div>
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: `${img}og-image.png` });
await page.context().browser().close();
console.log("og-image.png");
