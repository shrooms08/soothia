// Renders the brand assets from design/soothia-ui-sheet.html with headless
// Chromium: the extension icons (extension/public/icons/icon-{16,32,48,128}.png).
// Run with `npm run make-brand-assets`, then rebuild the extension.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const ICON_DIR = `${root}extension/public/icons`;
await mkdir(ICON_DIR, { recursive: true });

const STAR = (id, chrome) =>
  `<g id="${id}"><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#${chrome})"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></g>`;
const CHROME = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient>`;

const ORB = "radial-gradient(circle at 38% 34%,#FFFFFF 0%,#F4F1FF 24%,#D6D1F6 52%,#AFA9EC 76%,#7F77DD 100%)";
const STAR_SVG = (size, style) =>
  `<svg viewBox="-50 -50 100 100" width="${size}" height="${size}" style="position:absolute;${style}"><use href="#sth-star"/></svg>`;

// From section 02 of the sheet, logo.icon.
const ICONS = {
  128: `<div style="width:128px;height:128px;border-radius:28px;background:radial-gradient(circle at 50% 45%,#1A1826 0%,#000000 70%);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(175,169,236,.18)"><div style="position:relative;width:72px;height:72px"><div style="position:absolute;inset:0;border-radius:50%;background:${ORB};box-shadow:0 0 20px 3px rgba(127,119,221,.55)"></div>${STAR_SVG(38, "right:-12px;top:-15px")}</div></div>`,
  48: `<div style="width:48px;height:48px;border-radius:11px;background:#000000;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(175,169,236,.22)"><div style="position:relative;width:28px;height:28px"><div style="position:absolute;inset:0;border-radius:50%;background:${ORB};box-shadow:0 0 8px rgba(127,119,221,.6)"></div>${STAR_SVG(16, "right:-5px;top:-6px")}</div></div>`,
  32: `<div style="width:32px;height:32px;border-radius:8px;background:#000000;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(175,169,236,.22)"><div style="position:relative;width:20px;height:20px"><div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 38% 34%,#FFFFFF 0%,#F4F1FF 26%,#C9C3F2 56%,#7F77DD 100%)"></div>${STAR_SVG(11, "right:-3px;top:-4px")}</div></div>`,
  // "no glint" variant.
  16: `<div style="width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 36%,#FFFFFF 0%,#E6E1FB 40%,#7F77DD 100%);box-shadow:inset 0 0 0 1px #534AB7"></div>`,
};

const page = await (await chromium.launch()).newPage({ deviceScaleFactor: 1 });
// Embedded: a page made with setContent cannot load file:// fonts.
const fontUrl = `data:font/woff2;base64,${(await readFile(`${root}extension/public/fonts/soothia-lora.woff2`)).toString("base64")}`;
await page.setContent(`<!doctype html><html><head><style>
@font-face{font-family:Lora;src:url("${fontUrl}") format("woff2");font-weight:100 900}
body{margin:0;background:transparent}
.cell{display:inline-block;margin:0}
</style></head><body>
<svg width="0" height="0" style="position:absolute"><defs>${CHROME("sth-chrome")}${STAR("sth-star", "sth-chrome")}</defs></svg>
${Object.entries(ICONS)
  .map(([size, html]) => `<div class="cell" id="icon-${size}">${html}</div>`)
  .join("")}
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.fonts.load("92px Lora"));
for (const size of Object.keys(ICONS)) {
  await page.locator(`#icon-${size} > div`).screenshot({ path: `${ICON_DIR}/icon-${size}.png`, omitBackground: true });
  console.log(`icon-${size}.png`);
}
await page.context().browser().close();
