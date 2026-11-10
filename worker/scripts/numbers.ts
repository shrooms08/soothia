// Reads Soothia's live numbers and writes docs/numbers.md. Reads only, spends nothing:
// Walrus Memory (the @minos record), Sui mainnet through Tatum, and KV through Wrangler.
// Run: cd worker && npx tsx scripts/numbers.ts

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { bcs } from "@mysten/sui/bcs";
import { memwalBackend, RecallStore } from "../src/recall/memory";
import { mergePicks } from "../src/recall/picks";
import {
  RECORD_KINDS,
  type LessonRecord,
  type OutcomeRecord,
  type PickRecord,
  type PrefRecord,
  type RecordKind,
} from "../src/recall/records";
import { latestBy } from "../src/recall/scoring";
import { commitKeypair, resolverKeypair } from "../src/recall/sui";
import { tatumSuiClient } from "../src/recall/tatumGrpc";
import { poolTotals } from "../src/stake/math";
import { readConfig, readPool } from "../src/stake/readers";
import { loadEnvOrExit, safeError, WORKER_ROOT } from "./recall/shared";

const HANDLE = "minos";
const OUT = join(WORKER_ROOT, "..", "docs", "numbers.md");
const RECALL_PACKAGE = "0xc7bb1087170732a31d392f20974ba5f3dac8c4081b39f7a8677ff7d28ada84c4";
const LIST_LIMIT = 100;
// Tatum's plan allows 3 requests a second.
const pause = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 400));

// The cap ids are in .dev.vars for the scripts; the Worker itself never needs them.
const env = loadEnvOrExit() as ReturnType<typeof loadEnvOrExit> & {
  STAKE_UPGRADE_CAP?: string;
  PAY_ADMIN_CAP?: string;
  PAY_UPGRADE_CAP?: string;
};

function wrangler(args: string[]): string | null {
  try {
    return execFileSync("npx", ["wrangler", "kv", ...args, "--binding", "SOOTHIA_CACHE", "--remote"], {
      cwd: WORKER_ROOT,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
  } catch {
    return null;
  }
}

function kvGet<T>(key: string): T | null {
  const text = wrangler(["key", "get", key]);
  try {
    return text ? (JSON.parse(text) as T) : null;
  } catch {
    return null;
  }
}

const kvKeys = (prefix: string): string[] => {
  const text = wrangler(["key", "list", "--prefix", prefix]);
  return text ? (JSON.parse(text) as { name: string }[]).map((key) => key.name) : [];
};

const sui = (mist: bigint | string): string =>
  `${(Number(BigInt(mist)) / 1e9).toLocaleString("en-GB", { maximumFractionDigits: 4 })} SUI`;
const tx = (digest: string): string => `[${digest.slice(0, 8)}…](https://suivision.xyz/txblock/${digest})`;
const object = (id: string): string => `[\`${id.slice(0, 10)}…${id.slice(-6)}\`](https://suivision.xyz/object/${id})`;
const pkg = (id: string): string => `[\`${id.slice(0, 10)}…${id.slice(-6)}\`](https://suivision.xyz/package/${id})`;
const account = (id: string): string => `[\`${id.slice(0, 10)}…${id.slice(-6)}\`](https://suivision.xyz/account/${id})`;
const percent = (part: number, whole: number): string => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

const PaidBcs = bcs.struct("Paid", {
  nonce: bcs.vector(bcs.u8()),
  payer: bcs.Address,
  recipient: bcs.Address,
  amount: bcs.u64(),
  fee: bcs.u64(),
});

async function main(): Promise<void> {
  const readAt = new Date().toISOString();
  const client = tatumSuiClient(env.TATUM_API_KEY.trim());

  // ---- KV ----
  const profile = kvGet<{ handle: string; address: string; userKey: string; publicSince: string }>(`profile:${HANDLE}`);
  if (!profile) throw new Error(`No public profile @${HANDLE} in KV.`);
  const snapshot = kvGet<{
    builtAt: string;
    periods: { all: { stats: Record<string, number | string | null> } };
    proofs: Record<string, { proven: boolean }>;
  }>(`socialstats:${HANDLE}`);
  const handles = kvKeys("profile:").map((name) => name.slice("profile:".length));
  const profiles = handles
    .map((handle) => kvGet<{ handle: string; address: string }>(`profile:${handle}`))
    .filter((value) => value !== null);
  const premiumKeys = kvKeys("premium:");
  const unlockKeys = kvKeys("unlock:");
  const unlocks = unlockKeys
    .map((key) => kvGet<{ digest: string; priceMist: string; at: string }>(key))
    .filter((value) => value !== null);
  const earnings = profiles.map((entry) => ({
    handle: entry.handle,
    earnings: kvGet<{ totalMist: string; unlocks: number }>(`earnings:${entry.address}`),
  }));

  // ---- Walrus Memory ----
  const store = new RecallStore(memwalBackend(env), profile.userKey, false);
  const raw = {} as Record<RecordKind, unknown[]>;
  for (const kind of RECORD_KINDS) raw[kind] = await store.list(kind, true).catch(() => []);
  const picks = mergePicks(raw.pick as PickRecord[]);
  const committed = picks.filter((pick) => pick.commit);
  const outcomes = [...latestBy(raw.outcome as OutcomeRecord[], (outcome) => outcome.pickId).values()];
  const hits = outcomes.filter((outcome) => outcome.hit).length;
  const brier = outcomes.length ? outcomes.reduce((sum, outcome) => sum + outcome.brier, 0) / outcomes.length : null;
  const lessons = [...(raw.lesson as LessonRecord[])].sort((a, b) => a.at.localeCompare(b.at));
  const current = [...latestBy(lessons, (lesson) => lesson.key).values()];
  const walletLinks = (raw.pref as PrefRecord[]).filter((pref) => pref.kind === "wallet_link").length;
  const memoryTotal = Object.values(raw).reduce((sum, list) => sum + list.length, 0);

  // ---- Sui through Tatum ----
  const config = await readConfig(client, env.STAKE_CONFIG!.trim());
  const fields = [];
  let cursor: string | null = null;
  do {
    await pause();
    const page: Awaited<ReturnType<typeof client.core.listDynamicFields>> = await client.core.listDynamicFields({
      parentId: config.registryTableId,
      cursor,
      limit: 50,
    });
    fields.push(...page.dynamicFields);
    cursor = page.hasNextPage ? page.cursor : null;
  } while (cursor);
  const pools = [];
  for (const field of fields) {
    await pause();
    const { dynamicField } = await client.core.getDynamicField({ parentId: config.registryTableId, name: field.name });
    const poolId = bcs.Address.parse(dynamicField.value.bcs);
    await pause();
    const pool = await readPool(client, poolId, env.STAKE_PACKAGE!.trim());
    const { yes, no } = poolTotals(pool);
    pools.push({ poolId, status: pool.status, yes, no, stakers: Number(pool.stakers), evidence: pool.evidence });
  }
  const staked = pools.reduce((sum, pool) => sum + pool.yes + pool.no, 0n);

  // Who paid for each unlock: a public profile's wallet signed it, or an agent wallet did.
  const profileAddresses = new Set(profiles.map((entry) => entry.address.toLowerCase()));
  const paid = [];
  for (const unlock of unlocks) {
    await pause();
    const result = await client.core
      .getTransaction({ digest: unlock.digest, include: { events: true } })
      .catch(() => null);
    const events = (result?.Transaction ?? result?.FailedTransaction)?.events ?? [];
    const event = events.find((candidate) => candidate.eventType === `${env.PAY_PACKAGE!.trim()}::pay::Paid`);
    if (!event) continue;
    const parsed = PaidBcs.parse(event.bcs);
    paid.push({
      digest: unlock.digest,
      at: unlock.at,
      amount: BigInt(parsed.amount),
      fee: BigInt(parsed.fee),
      human: profileAddresses.has(parsed.payer.toLowerCase()),
    });
  }

  const ids: [string, string, string][] = [
    ["soothia_recall package", RECALL_PACKAGE, "Package"],
    ["soothia_stake package", env.STAKE_PACKAGE!.trim(), "Package"],
    ["soothia_stake Config", env.STAKE_CONFIG!.trim(), "Shared"],
    ["soothia_pay package", env.PAY_PACKAGE!.trim(), "Package"],
    ["soothia_pay PayConfig", env.PAY_CONFIG!.trim(), "Shared"],
    ["Walrus Memory account", env.MEMWAL_ACCOUNT_ID.trim(), "Walrus Memory"],
  ];
  const caps: [string, string][] = [
    ["soothia_stake AdminCap", env.STAKE_ADMIN_CAP!.trim()],
    ["soothia_stake ResolverCap", env.STAKE_RESOLVER_CAP!.trim()],
    ["soothia_stake UpgradeCap", env.STAKE_UPGRADE_CAP!.trim()],
    ["soothia_pay AdminCap", env.PAY_ADMIN_CAP!.trim()],
    ["soothia_pay UpgradeCap", env.PAY_UPGRADE_CAP!.trim()],
  ];
  const holders = new Map<string, string>([
    [profile.address.toLowerCase(), "operator's Slush wallet"],
    [resolverKeypair(env)?.toSuiAddress().toLowerCase() ?? "", "`RESOLVER_KEY` (Worker)"],
    [commitKeypair(env)?.toSuiAddress().toLowerCase() ?? "", "gas wallet (Worker)"],
  ]);
  const capRows = [];
  for (const [name, id] of caps) {
    await pause();
    const { object: found } = await client.core.getObject({ objectId: id });
    const owner = found.owner.$kind === "AddressOwner" ? found.owner.AddressOwner : found.owner.$kind;
    capRows.push(`| ${name} | ${object(id)} | ${holders.get(owner.toLowerCase()) ?? owner} |`);
  }
  await pause();
  const recallCaps = await client.core.listOwnedObjects({
    owner: profile.address,
    type: "0x2::package::UpgradeCap",
    include: { json: true },
  });
  const recallCap = recallCaps.objects.find(
    (entry) => (entry.json as { package?: string } | null)?.package === RECALL_PACKAGE,
  );
  if (recallCap)
    capRows.push(`| soothia_recall UpgradeCap | ${object(recallCap.objectId)} | operator's Slush wallet |`);

  const stats = snapshot?.periods.all.stats;
  const proven = snapshot ? Object.values(snapshot.proofs).filter((proof) => proof.proven).length : 0;
  const humanUnlocks = paid.filter((entry) => entry.human);
  const agentUnlocks = paid.filter((entry) => !entry.human);
  const lines = [
    "# Soothia live numbers",
    "",
    `Read at **${readAt}** by \`worker/scripts/numbers.ts\` from Walrus Memory, Sui mainnet through Tatum, and the Worker's KV. Nothing here is estimated. Run \`cd worker && npx tsx scripts/numbers.ts\` to refresh it.`,
    "",
    `## @${HANDLE}'s record`,
    "",
    "| | |",
    "|---|---|",
    `| Calls | ${picks.length} |`,
    `| Committed on Sui before kickoff | ${committed.length} |`,
    `| Settled | ${outcomes.length} |`,
    `| Right | ${hits} of ${outcomes.length} (${percent(hits, outcomes.length)}) |`,
    `| Brier score | ${brier === null ? "–" : brier.toFixed(3)} (0 is perfect, 0.25 is a coin flip) |`,
    ...(stats
      ? [
          `| Public Call Score | ${stats.score} |`,
          `| Settled and proven before ESPN's kickoff (public profile) | ${proven} |`,
          `| Public profile: right / Brier | ${stats.hits} of ${stats.settled} (${percent(Number(stats.hits), Number(stats.settled))}) / ${stats.brier} |`,
          `| Current streak | ${stats.currentStreak} |`,
        ]
      : []),
    "",
    "The public profile counts only calls proven on Sui before ESPN's kickoff, so it can be smaller than the private record.",
    "",
    "## Walrus Memory",
    "",
    `${memoryTotal} memories in @${HANDLE}'s namespaces. Corrections and updates are new memories, because the store is append-only.`,
    "",
    "| Kind | Memories |",
    "|---|---|",
    ...RECORD_KINDS.map((kind) => `| \`${kind}\` | ${raw[kind].length}${raw[kind].length >= LIST_LIMIT ? "+" : ""} |`),
    `| \`wallet_link\` (a kind of \`pref\`) | ${walletLinks} |`,
    "",
    `### Lessons: ${lessons.length} written, ${current.length} current`,
    "",
    "Current:",
    "",
    ...current.map((lesson) => `- **${lesson.key}** (${lesson.n} calls): "${lesson.text}"`),
    "",
    "Every lesson, oldest first:",
    "",
    "| Written | Key | Lesson |",
    "|---|---|---|",
    ...lessons.map((lesson) => `| ${lesson.at.slice(0, 16).replace("T", " ")} UTC | ${lesson.key} | ${lesson.text} |`),
    "",
    "## Sui commits",
    "",
    "| Called | Question | Commit |",
    "|---|---|---|",
    ...[...committed]
      .sort((a, b) => a.at.localeCompare(b.at))
      .map(
        (pick) => `| ${pick.at.slice(0, 16).replace("T", " ")} UTC | ${pick.question} | ${tx(pick.commit!.digest)} |`,
      ),
    "",
    "## Staking",
    "",
    `- Pools created: **${fields.length}**`,
    `- Total staked: **${sui(staked)}** across **${pools.reduce((sum, pool) => sum + pool.stakers, 0)}** positions`,
    "",
    "| Pool | Status | YES | NO | Stakers | Evidence |",
    "|---|---|---|---|---|---|",
    ...pools.map(
      (pool) =>
        `| ${object(pool.poolId)} | ${pool.status} | ${sui(pool.yes)} | ${sui(pool.no)} | ${pool.stakers} | ${pool.evidence || "–"} |`,
    ),
    "",
    "## Social and premium calls",
    "",
    `- Public profiles: **${profiles.length}** (${profiles.map((entry) => `@${entry.handle}`).join(", ")})`,
    `- Premium calls made: **${premiumKeys.length}**`,
    `- x402 unlocks: **${paid.length}** (${humanUnlocks.length} signed in a person's wallet, ${agentUnlocks.length} by an agent wallet)`,
    `- Paid for unlocks: **${sui(paid.reduce((sum, entry) => sum + entry.amount, 0n))}**, of which ${sui(paid.reduce((sum, entry) => sum + entry.fee, 0n))} went to the treasury`,
    ...earnings
      .filter((entry) => entry.earnings)
      .map(
        (entry) =>
          `- @${entry.handle}'s premium earnings: ${sui(entry.earnings!.totalMist)} from ${entry.earnings!.unlocks} unlocks`,
      ),
    ...paid.map(
      (entry) =>
        `- ${entry.at.slice(0, 16).replace("T", " ")} UTC: ${entry.human ? "person" : "agent"}, ${sui(entry.amount)}, ${tx(entry.digest)}`,
    ),
    "",
    "An unlock counts as a person's when the payer is a public profile's wallet, and as an agent's otherwise.",
    "",
    "## Contracts and objects on Sui mainnet",
    "",
    "| What | Id | Kind |",
    "|---|---|---|",
    ...ids.map(([name, id, kind]) => `| ${name} | ${kind === "Package" ? pkg(id) : object(id)} | ${kind} |`),
    "",
    "| Capability | Id | Held by (read from chain) |",
    "|---|---|---|",
    ...capRows,
    "",
    "| Wallet | Address |",
    "|---|---|",
    `| Operator (Slush, treasury) | ${account(profile.address)} |`,
    `| Gas wallet (pays for commits) | ${account(commitKeypair(env)!.toSuiAddress())} |`,
    `| Resolver | ${account(resolverKeypair(env)!.toSuiAddress())} |`,
    "",
  ];
  writeFileSync(OUT, lines.join("\n"));
  console.log(`Wrote ${OUT}`);
  console.log(
    JSON.stringify({
      calls: picks.length,
      committed: committed.length,
      settled: outcomes.length,
      hits,
      brier,
      memories: memoryTotal,
      lessons: lessons.length,
      pools: fields.length,
      staked: staked.toString(),
      premium: premiumKeys.length,
      unlocks: paid.length,
      human: humanUnlocks.length,
      agent: agentUnlocks.length,
    }),
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
