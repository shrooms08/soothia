// Bundles site/src/orb3d.js (three.js) into site/orb3d.js: one minified ES
// module, self-hosted, loaded on demand by app.js. `node scripts/build-orb.mjs`
import { build } from "../extension/node_modules/esbuild/lib/main.js";
import { gzipSync } from "node:zlib";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
await build({
  entryPoints: [`${root}site/src/orb3d.js`],
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  outfile: `${root}site/orb3d.js`,
  nodePaths: [`${root}scripts/node_modules`],
  legalComments: "none",
  logLevel: "warning",
});
const bytes = statSync(`${root}site/orb3d.js`).size;
const gz = gzipSync(readFileSync(`${root}site/orb3d.js`), { level: 9 }).length;
console.log(`Built site/orb3d.js: ${(bytes / 1024).toFixed(0)} KB raw, ${(gz / 1024).toFixed(0)} KB gzipped`);
