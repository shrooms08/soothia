// Pages through the whole Panta market catalog and summarizes it.
// Usage: npm run catalog-check (from /scripts). Reads PANTA_API_KEY from the root .env.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Trailing slashes are required on every Panta path.
const PANTA_BASE = "https://live-api.panta.market/api/v1";
const PAGE_SIZE = 50; // documented maximum
const SAMPLE_COUNT = 15;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "docs", "catalog-check.md");

// Fields used here, from the List markets reference page.
interface Market {
  marketId: string;
  category: string;
  title: string;
  phase: string;
  status: string;
  resolved: boolean;
  endTime: number;
  yesPrice: string | null;
}

interface MarketPage {
  items: Market[];
  nextCursor?: string | null;
}

function loadApiKey(): string {
  try {
    process.loadEnvFile(path.join(ROOT, ".env"));
  } catch {
    // No .env file; fall through to the check below.
  }
  const key = process.env.PANTA_API_KEY?.trim();
  if (!key) {
    console.error("PANTA_API_KEY is missing. Add it to the .env file in the repo root (see .env.example).");
    process.exit(1);
  }
  return key;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pantaGet<T>(apiKey: string, pathAndQuery: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${PANTA_BASE}${pathAndQuery}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    });
    if (res.status === 429 && attempt <= 5) {
      const wait = Number(res.headers.get("Retry-After")) || 5;
      await sleep((wait + Math.random()) * 1000);
      continue;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      throw new Error(`Panta ${pathAndQuery.split("?")[0]} returned ${res.status} ${body.code ?? ""}`.trim());
    }
    return (await res.json()) as T;
  }
}

async function fetchAllMarkets(apiKey: string): Promise<Market[]> {
  const markets: Market[] = [];
  let cursor: string | null | undefined;
  do {
    const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (cursor) query.set("cursor", cursor);
    const page = await pantaGet<MarketPage>(apiKey, `/markets/?${query}`);
    markets.push(...page.items);
    cursor = page.nextCursor;
    process.stdout.write(`\rFetched ${markets.length} markets`);
  } while (cursor);
  process.stdout.write("\n");
  return markets;
}

function countBy(markets: Market[], key: (m: Market) => string): [string, number][] {
  const counts = new Map<string, number>();
  for (const m of markets) {
    const k = key(m) || "(none)";
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

// A market can be traded while it is in the primary or secondary phase and unresolved.
function isTradable(m: Market): boolean {
  return (m.phase === "primary" || m.phase === "secondary") && !m.resolved;
}

function table(headers: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => String(v).replace(/\|/g, "\\|").replace(/\s+/g, " ");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "-").join(" | ")} |`,
    ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`),
  ].join("\n");
}

async function main(): Promise<void> {
  const apiKey = loadApiKey();
  const markets = await fetchAllMarkets(apiKey);

  const now = Math.floor(Date.now() / 1000);
  const tradable = markets.filter(isTradable);
  const tradableNotEnded = tradable.filter((m) => m.endTime > now);
  const byPhase = countBy(markets, (m) => m.phase);
  const byStatus = countBy(markets, (m) => m.status);
  const byCategory = countBy(markets, (m) => m.category);

  // The docs say list rows carry no prices and the detail endpoint fills them,
  // but in practice either side can come back with blank titles or null prices.
  // Look up each sample and keep whichever side has the value.
  // Prefer tradable markets; fall back to the rest if there are few.
  const pool = [...tradableNotEnded, ...markets.filter((m) => !tradableNotEnded.includes(m))];
  const samples: Market[] = [];
  for (const m of pool.slice(0, SAMPLE_COUNT)) {
    let detail: Partial<Market> = {};
    try {
      detail = await pantaGet<Market>(apiKey, `/markets/${encodeURIComponent(m.marketId)}/`);
    } catch {
      // Keep the list row as-is.
    }
    samples.push({
      ...m,
      title: m.title?.trim() || detail.title?.trim() || "(untitled)",
      yesPrice: detail.yesPrice ?? m.yesPrice,
    });
    await sleep(300);
  }
  const untitled = markets.filter((m) => !m.title?.trim()).length;

  const report = [
    "# Panta catalog check",
    "",
    `Generated ${new Date().toISOString()} by \`scripts/catalog-check.ts\` from \`GET /markets/\` (Solana mainnet).`,
    "",
    "## Summary",
    "",
    `- Total markets: **${markets.length}**`,
    `- Tradable now (phase primary or secondary, not resolved): **${tradable.length}**`,
    `- Tradable and not past end time: **${tradableNotEnded.length}**`,
    `- List rows with a blank title: **${untitled}**`,
    "",
    "## By phase",
    "",
    table(["Phase", "Markets"], byPhase),
    "",
    "## By status label",
    "",
    table(["Status", "Markets"], byStatus),
    "",
    "## By category",
    "",
    table(["Category", "Markets"], byCategory),
    "",
    `## ${samples.length} sample markets`,
    "",
    table(
      ["Title", "Category", "Phase", "YES price"],
      samples.map((m) => [m.title, m.category, m.phase, m.yesPrice ?? "n/a"]),
    ),
    "",
  ].join("\n");

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, report);
  console.log(`\n${report}`);
  console.log(`Wrote ${path.relative(ROOT, OUTPUT)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Catalog check failed.");
  process.exit(1);
});
