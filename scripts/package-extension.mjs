// Builds the extension and zips extension/dist into site/soothia-extension.zip
// with a top-level folder named "soothia", for the landing page's install step.
// Run with `npm run package-extension`.
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "site", "soothia-extension.zip");

execFileSync("npm", ["run", "build"], { cwd: join(root, "extension"), stdio: "inherit" });
const manifest = JSON.parse(await readFile(join(root, "extension", "dist", "manifest.json"), "utf8"));

const staging = await mkdtemp(join(tmpdir(), "soothia-zip-"));
await cp(join(root, "extension", "dist"), join(staging, "soothia"), { recursive: true });
await rm(out, { force: true });
execFileSync("zip", ["-qr", "-X", out, "soothia"], { cwd: staging });
await rm(staging, { recursive: true, force: true });
console.log(`site/soothia-extension.zip (Soothia ${manifest.version})`);
