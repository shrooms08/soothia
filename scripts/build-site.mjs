// Bundles site/src/share-tx.ts (web3.js + the signed-transaction check) into
// site/share-tx.js, an ES module the share page imports after Connect.
// Run from anywhere: `node scripts/build-site.mjs`.
import { fileURLToPath } from "node:url";
import { build } from "../extension/node_modules/vite/dist/node/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
await build({
  configFile: false,
  logLevel: "warn",
  publicDir: false,
  root: `${root}site`,
  resolve: { alias: { "@solana/web3.js": `${root}extension/node_modules/@solana/web3.js` } },
  build: {
    outDir: `${root}site`,
    emptyOutDir: false,
    target: "es2020",
    minify: true,
    lib: { entry: `${root}site/src/share-tx.ts`, formats: ["es"], fileName: () => "share-tx.js" },
  },
});
console.log("Built site/share-tx.js");
