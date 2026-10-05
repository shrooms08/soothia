// Generates the eight placeholder market images the Worker serves at
// /img/<category>.png: a 1024x1024 gradient with the category word.
// Panta requires an imageUrl on every market; these are used until markets
// get real artwork. Run with `npm run make-category-images`, then deploy the Worker.
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const OUT_DIR = new URL("../worker/public/img/", import.meta.url);
const SIZE = 1024;

// Keep in step with CATEGORIES in worker/src/pantaRules.ts.
const CATEGORIES: Record<string, [string, string]> = {
  sports: ["#16a34a", "#064e3b"],
  crypto: ["#f59e0b", "#7c2d12"],
  politics: ["#3b82f6", "#1e1b4b"],
  entertainment: ["#ec4899", "#581c87"],
  finance: ["#14b8a6", "#134e4a"],
  science: ["#06b6d4", "#1e3a8a"],
  world: ["#6366f1", "#0f172a"],
  other: ["#9b7bff", "#15121f"],
};

function svg(word: string, [from, to]: [string, string]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="orb" cx="0.5" cy="0.45" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <circle cx="512" cy="400" r="210" fill="url(#orb)"/>
  <text x="512" y="760" text-anchor="middle" fill="#ffffff" font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
    font-size="${word.length > 9 ? 104 : 128}" font-weight="700" letter-spacing="6">${word.toUpperCase()}</text>
  <text x="512" y="850" text-anchor="middle" fill="#ffffff" fill-opacity="0.7"
    font-family="Helvetica Neue, Helvetica, Arial, sans-serif" font-size="44" letter-spacing="10">SOOTHIA</text>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });
for (const [category, colors] of Object.entries(CATEGORIES)) {
  const file = new URL(`${category}.png`, OUT_DIR);
  const info = await sharp(Buffer.from(svg(category, colors)))
    .png({ compressionLevel: 9, palette: true, colors: 128 })
    .toFile(file.pathname);
  console.log(`${category}.png ${info.width}x${info.height} ${Math.round(info.size / 1024)} KB`);
}
