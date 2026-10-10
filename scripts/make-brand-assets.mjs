// Renders the brand assets from design/soothia-ui-sheet.html with headless
// Chromium: the eight market images (worker/public/img/<category>.png,
// 1024x1024) and the extension icons (extension/public/icons/icon-{16,32,48,128}.png).
// Run with `npm run make-brand-assets`, then deploy the Worker and rebuild the extension.
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("..", import.meta.url));
const IMG_DIR = `${root}worker/public/img`;
const ICON_DIR = `${root}extension/public/icons`;
await mkdir(IMG_DIR, { recursive: true });
await mkdir(ICON_DIR, { recursive: true });

// From section 09 of the sheet: [key, word, orbit tilt, star 1, star 2].
const CATEGORIES = [
  ["crypto", "Crypto", -8, "translate(260 250) scale(.55)", "translate(800 560) scale(.4)"],
  ["sports", "Sports", 6, "translate(230 520) scale(.5)", "translate(790 230) scale(.42)"],
  ["politics", "Politics", -14, "translate(300 200) scale(.45)", "translate(760 610) scale(.55)"],
  ["entertainment", "Entertainment", 10, "translate(220 380) scale(.6)", "translate(820 470) scale(.38)"],
  ["finance", "Finance", -4, "translate(250 600) scale(.42)", "translate(300 220) scale(.36)"],
  ["science", "Science", 16, "translate(780 620) scale(.5)", "translate(240 300) scale(.48)"],
  ["world", "World", -18, "translate(210 460) scale(.4)", "translate(820 360) scale(.5)"],
  ["other", "Other", 2, "translate(290 610) scale(.46)", "translate(780 600) scale(.4)"],
];

const STAR = (id, chrome) =>
  `<g id="${id}"><path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#${chrome})"/><path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/><path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/></g>`;
const CHROME = (id) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient>`;

function marketSvg([key, word, rot, s1, s2]) {
  return `<svg id="market-img-${key}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
<radialGradient id="${key}-glow" cx="512" cy="440" r="460" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#534AB7" stop-opacity=".55"/><stop offset=".55" stop-color="#2A2560" stop-opacity=".35"/><stop offset="1" stop-color="#0E0D14" stop-opacity="0"/></radialGradient>
<radialGradient id="${key}-orb" cx="440" cy="370" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".24" stop-color="#F4F1FF"/><stop offset=".55" stop-color="#D6D1F6"/><stop offset=".8" stop-color="#AFA9EC"/><stop offset="1" stop-color="#7F77DD"/></radialGradient>
${CHROME(`${key}-chrome`)}
${STAR(`${key}-star`, `${key}-chrome`)}
</defs>
<rect width="1024" height="1024" fill="#000000"/>
<rect width="1024" height="1024" fill="url(#${key}-glow)"/>
<ellipse cx="512" cy="440" rx="330" ry="74" fill="none" stroke="#AFA9EC" stroke-opacity=".22" stroke-width="2" transform="rotate(${rot} 512 440)"/>
<circle cx="512" cy="440" r="196" fill="#7F77DD" opacity=".18"/>
<circle cx="512" cy="440" r="176" fill="url(#${key}-orb)"/>
<use href="#${key}-star" transform="translate(648 296) scale(1.5 2.1)"/>
<use href="#${key}-star" transform="${s1}"/>
<use href="#${key}-star" transform="${s2}"/>
<text x="512" y="802" text-anchor="middle" font-family="Lora, Georgia, serif" font-size="92" fill="#F5F0E6" letter-spacing="1">${word}</text>
<circle cx="452" cy="922" r="11" fill="url(#${key}-orb)"/>
<text x="472" y="932" font-family="Lora, Georgia, serif" font-size="30" fill="#A9A5BD">Soothia</text>
</svg>`;
}

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
${CATEGORIES.map((c) => `<div class="cell" id="img-${c[0]}">${marketSvg(c)}</div>`).join("")}
${Object.entries(ICONS).map(([size, html]) => `<div class="cell" id="icon-${size}">${html}</div>`).join("")}
</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.evaluate(() => document.fonts.load("92px Lora"));
for (const [key] of CATEGORIES) {
  await page.locator(`#img-${key} svg`).screenshot({ path: `${IMG_DIR}/${key}.png`, omitBackground: true });
  console.log(`${key}.png`);
}
for (const size of Object.keys(ICONS)) {
  await page.locator(`#icon-${size} > div`).screenshot({ path: `${ICON_DIR}/icon-${size}.png`, omitBackground: true });
  console.log(`icon-${size}.png`);
}
await page.context().browser().close();
