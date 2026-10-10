// Bundles the share page's TypeScript into ES modules next to the page:
//   site/src/wallets.ts  -> site/wallets.js   (Wallet Standard layer + tx check)
//   site/src/mwa.ts      -> site/mwa.js       (Mobile Wallet Adapter, Android only)
//   site/src/share-tx.ts -> site/share-tx.js  (web3.js, legacy providers only)
// Run from anywhere: `node scripts/build-site.mjs`.
import { fileURLToPath } from "node:url";
import { build } from "../extension/node_modules/vite/dist/node/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const nodeModules = `${root}extension/node_modules`;
for (const [entry, file] of [["wallets", "wallets.js"], ["mwa", "mwa.js"], ["share-tx", "share-tx.js"]]) {
  await build({
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    root: `${root}site`,
    resolve: {
      alias: {
        "@solana/web3.js": `${nodeModules}/@solana/web3.js`,
        "@wallet-standard/app": `${nodeModules}/@wallet-standard/app`,
        "@solana-mobile/wallet-standard-mobile": `${nodeModules}/@solana-mobile/wallet-standard-mobile`,
      },
    },
    build: {
      outDir: `${root}site`,
      emptyOutDir: false,
      target: "es2020",
      minify: true,
      lib: { entry: `${root}site/src/${entry}.ts`, formats: ["es"], fileName: () => file },
    },
  });
  console.log(`Built site/${file}`);
}
