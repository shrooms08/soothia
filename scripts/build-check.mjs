// Proves the extension compiles: builds it into a temporary directory (never
// extension/dist or the shipped zip) and checks the expected files came out.
// Run from the repo root with `npm run build`.
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = await mkdtemp(join(tmpdir(), "soothia-build-"));
try {
  execFileSync("node", ["build.mjs"], { cwd: join(root, "extension"), stdio: "inherit", env: { ...process.env, SOOTHIA_OUT_DIR: out } });
  const files = await readdir(out);
  for (const name of ["manifest.json", "background.js", "content.js", "wallet-bridge.js", "welcome.js"]) {
    if (!files.includes(name)) throw new Error(`build is missing ${name}`);
  }
  console.log(`extension builds (${files.length} entries in a temp dir)`);
} finally {
  await rm(out, { recursive: true, force: true });
}
