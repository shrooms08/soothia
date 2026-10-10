// Screenshots for the onboarding: welcome.html steps 1-4 and the first-run
// speech bubble on light and dark pages. Fresh profile each run, so the
// bubble flag is unset. `node design/tools/delight-shots.mjs`.
import { createServer } from "node:http";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "../../scripts/node_modules/playwright/index.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));
const tools = `${root}design/tools/`;
const out = `${root}design/applied/`;
const extension = `${root}extension/dist`;

const server = createServer(async (request, response) => {
  const file = request.url.slice(1).split("?")[0] || "light.html";
  try {
    const body = await readFile(tools + file);
    response.writeHead(200, { "Content-Type": file.endsWith(".js") ? "text/javascript" : "text/html" });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://localhost:${server.address().port}`;

const userDataDir = `${root}design/tools/.chromium-profile`;
await rm(userDataDir, { recursive: true, force: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless: true,
  viewport: { width: 980, height: 760 },
  deviceScaleFactor: 2,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
});
let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent("serviceworker", { timeout: 15000 });
const id = new URL(worker.url()).host;

// The install event opens welcome.html by itself; close whatever opened.
await new Promise((resolve) => setTimeout(resolve, 1500));
for (const page of context.pages()) if (page.url().includes("welcome.html")) await page.close();

const welcome = await context.newPage();
await welcome.goto(`chrome-extension://${id}/welcome.html?sfx=1`);
await welcome.waitForTimeout(1200);
for (let step = 1; step <= 4; step++) {
  if (step > 1) {
    await welcome.click("#next");
    await welcome.waitForTimeout(900);
  }
  await welcome.screenshot({ path: `${out}welcome-${step}.png` });
  console.log(`welcome-${step}`);
}
await welcome.close();

for (const theme of ["dark", "light"]) {
  const page = await context.newPage();
  await page.goto(`${base}/${theme}.html`);
  await page.waitForTimeout(3200);
  await page.screenshot({ path: `${out}bubble-${theme}.png` });
  console.log(`bubble-${theme}`);
  await page.close();
}
await context.close();
server.close();
await rm(userDataDir, { recursive: true, force: true });
