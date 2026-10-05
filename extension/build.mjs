// Builds each entry as its own self-contained file with Vite. Content scripts
// cannot use ES module imports, so every entry is bundled separately as an IIFE.
import { build } from "vite";
import { cp, rm } from "node:fs/promises";

const entries = ["background", "content", "wallet-detect"];

await rm("dist", { recursive: true, force: true });

for (const name of entries) {
  await build({
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    build: {
      outDir: "dist",
      emptyOutDir: false,
      target: "chrome110",
      minify: false,
      lib: {
        entry: `src/${name}.ts`,
        name: "soothia",
        formats: ["iife"],
        fileName: () => `${name}.js`,
      },
    },
  });
}

await cp("public", "dist", { recursive: true });
console.log(`Built ${entries.length} scripts to extension/dist`);
