// Bundles the admin page into worker/public/admin. Wrangler runs this before every
// dev, deploy and dry-run. It shares its wallet code with the extension, so
// extension/node_modules must be installed.
import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "admin");

await rm(join(root, "public"), { recursive: true, force: true });
await mkdir(out, { recursive: true });
await build({
  entryPoints: [join(root, "admin", "app.ts")],
  bundle: true,
  format: "iife",
  target: "chrome110",
  minify: true,
  outfile: join(out, "admin.js"),
  logLevel: "warning",
});
await cp(join(root, "admin", "index.html"), join(out, "index.html"));
await cp(join(root, "admin", "admin.css"), join(out, "admin.css"));
