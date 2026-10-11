// Builds each entry as its own self-contained file with Vite. Content scripts
// cannot use ES module imports, so every entry is bundled separately as an IIFE.
import { build } from "vite";
import { cp, rm } from "node:fs/promises";

const entries = ["background", "content", "wallet-bridge", "wallet-sign", "nav-hook", "welcome", "offscreen"];
// CI builds into a temp dir (SOOTHIA_OUT_DIR) so the checked-in zip is never touched by a check.
const outDir = process.env.SOOTHIA_OUT_DIR ?? "dist";

await rm(outDir, { recursive: true, force: true });

for (const name of entries) {
  await build({
    configFile: false,
    logLevel: "warn",
    publicDir: false,
    build: {
      outDir,
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

await cp("public", outDir, { recursive: true });
console.log(`Built ${entries.length} scripts to ${outDir === "dist" ? "extension/dist" : outDir}`);
