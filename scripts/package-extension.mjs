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

// The zip must carry the version in extension/public/manifest.json, or the site ships a stale build.
const source = JSON.parse(await readFile(join(root, "extension", "public", "manifest.json"), "utf8"));
const zipped = JSON.parse(execFileSync("unzip", ["-p", out, "soothia/manifest.json"], { encoding: "utf8" }));
if (zipped.version !== source.version || manifest.version !== source.version) {
  throw new Error(`zip has ${zipped.version}, dist has ${manifest.version}, source has ${source.version}`);
}
console.log(`site/soothia-extension.zip (Soothia ${zipped.version}, verified)`);
