// The auto-unlock agent wallet. Runs only in the background: its key is made here, kept
// in chrome.storage.local, and never sent to a page, a content script or the Worker.

import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import {
  AGENT_KEY,
  AGENT_RECEIPTS_KEY,
  AGENT_SETTINGS_KEY,
  AGENT_SPEND_KEY,
  SUI_WALLET_KEY,
  type ApiPath,
  type ApiResponse,
} from "./messages";
import {
  agentCandidates,
  cleanAgentSettings,
  runUnlock,
  spentToday,
  utcDay,
  type AgentReceipt,
  type AgentSettings,
  type AgentSpend,
  type AgentStatus,
  type PremiumCallResponse,
} from "./premium-logic";
import { matchLine, type FeedEntry } from "./social-logic";
import { checkTransaction, type ExpectedTx } from "./tx-check";

const MAX_RECEIPTS = 50;

export interface AgentDeps {
  relay(path: ApiPath, body: unknown): Promise<ApiResponse>;
  fetchCall(pickId: string, payment?: string): Promise<PremiumCallResponse>;
  now?: () => number;
}

export interface AgentRun {
  unlocked: AgentReceipt[];
  stopped: string | null;
}

const codeOf = (response: ApiResponse): string => (response.body as { error?: string } | null)?.error ?? "unavailable";

export function createAgent(deps: AgentDeps) {
  const nowMs = (): number => deps.now?.() ?? Date.now();
  const storage = chrome.storage.local;
  let queue: Promise<unknown> = Promise.resolve();

  /** One at a time, so two runs can't both spend the same budget. */
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = queue.then(work, work);
    queue = next.catch(() => undefined);
    return next;
  }

  async function keypair(): Promise<Ed25519Keypair | null> {
    const stored: unknown = (await storage.get(AGENT_KEY))[AGENT_KEY];
    return typeof stored === "string" ? Ed25519Keypair.fromSecretKey(stored) : null;
  }

  const readSettings = async (): Promise<AgentSettings> =>
    cleanAgentSettings((await storage.get(AGENT_SETTINGS_KEY))[AGENT_SETTINGS_KEY]);
  const readSpend = async (): Promise<AgentSpend | null> =>
    ((await storage.get(AGENT_SPEND_KEY))[AGENT_SPEND_KEY] as AgentSpend | undefined) ?? null;
  const readReceipts = async (): Promise<AgentReceipt[]> =>
    ((await storage.get(AGENT_RECEIPTS_KEY))[AGENT_RECEIPTS_KEY] as AgentReceipt[] | undefined) ?? [];

  async function changeSpend(change: bigint): Promise<void> {
    const now = nowMs();
    const spent = spentToday(await readSpend(), now) + change;
    await storage.set({
      [AGENT_SPEND_KEY]: { day: utcDay(now), spentMist: (spent < 0n ? 0n : spent).toString() } satisfies AgentSpend,
    });
  }

  async function signer(
    pair: Ed25519Keypair,
    txBytes: string,
    expected: ExpectedTx,
  ): Promise<{ bytes: string; signature: string }> {
    const verdict = checkTransaction(txBytes, expected, pair.toSuiAddress());
    if (!verdict.ok) throw new Error(verdict.reason);
    return pair.signTransaction(fromBase64(txBytes));
  }

  async function status(): Promise<AgentStatus> {
    const [pair, settings, spend, receipts] = await Promise.all([
      keypair(),
      readSettings(),
      readSpend(),
      readReceipts(),
    ]);
    const address = pair?.toSuiAddress() ?? null;
    let balanceMist: string | null = null;
    if (address) {
      const response = await deps.relay("/premium/balance", { address });
      if (response.ok) balanceMist = (response.body as { balanceMist: string }).balanceMist;
    }
    return { address, balanceMist, settings, spentTodayMist: spentToday(spend, nowMs()).toString(), receipts };
  }

  async function run(): Promise<AgentRun> {
    const pair = await keypair();
    const settings = await readSettings();
    if (!pair || !settings.enabled) return { unlocked: [], stopped: null };
    const feed = await deps.relay("/social/feed", {});
    if (!feed.ok || !feed.body) return { unlocked: [], stopped: "feed_unavailable" };
    const sender = pair.toSuiAddress();
    const candidates = agentCandidates(
      (feed.body as { items: FeedEntry[] }).items,
      settings,
      spentToday(await readSpend(), nowMs()),
      nowMs(),
    );

    const unlocked: AgentReceipt[] = [];
    for (const { handle, item } of candidates) {
      const price = BigInt(item.premium.priceMist);
      // Counted first, so a worker that dies mid-payment can't overspend the day.
      await changeSpend(price);
      const result = await runUnlock({
        expectedPriceMist: item.premium.priceMist,
        fetchCall: (payment) => deps.fetchCall(item.pickId, payment),
        build: async () => {
          const built = await deps.relay("/premium/build", { pickId: item.pickId, sender });
          if (!built.ok) throw new Error(codeOf(built));
          return (built.body as { transaction: string }).transaction;
        },
        sign: (txBytes, expected) => signer(pair, txBytes, expected),
      });
      if (!result.ok) {
        if (!result.maybePaid) await changeSpend(-price);
        if (result.code === "insufficient_balance") return { unlocked, stopped: result.code };
        continue;
      }
      if (!result.receipt) {
        // Nothing was charged for this one: it was already open.
        await changeSpend(-price);
        continue;
      }
      const receipt: AgentReceipt = {
        at: result.receipt.at,
        handle,
        match: matchLine(item.fixture),
        priceMist: result.receipt.priceMist,
        digest: result.receipt.digest,
      };
      unlocked.push(receipt);
      await storage.set({ [AGENT_RECEIPTS_KEY]: [receipt, ...(await readReceipts())].slice(0, MAX_RECEIPTS) });
    }
    return { unlocked, stopped: null };
  }

  async function withdraw(): Promise<{ digest?: string; error?: string }> {
    const pair = await keypair();
    if (!pair) return { error: "no_agent" };
    const saved = (await storage.get(SUI_WALLET_KEY))[SUI_WALLET_KEY] as { address?: unknown } | undefined;
    // From storage rather than the message, so only the connected wallet can receive it.
    const recipient = saved?.address;
    if (typeof recipient !== "string") return { error: "no_wallet" };
    const sender = pair.toSuiAddress();
    const built = await deps.relay("/premium/transfer/build", { sender, recipient });
    if (!built.ok) return { error: codeOf(built) };
    let signed: { bytes: string; signature: string };
    try {
      signed = await signer(pair, (built.body as { transaction: string }).transaction, { kind: "withdraw", recipient });
    } catch {
      return { error: "refused" };
    }
    const sent = await deps.relay("/premium/transfer/execute", {
      transaction: signed.bytes,
      signature: signed.signature,
    });
    return sent.ok ? { digest: (sent.body as { digest: string }).digest } : { error: codeOf(sent) };
  }

  return {
    status: () => serial(status),
    run: () => serial(run),
    withdraw: () => serial(withdraw),
    saveSettings: (raw: unknown) =>
      serial(async () => {
        const settings = cleanAgentSettings(raw);
        await storage.set({ [AGENT_SETTINGS_KEY]: settings });
        return settings;
      }),
    create: () =>
      serial(async () => {
        // Never replaced: there may be money in the wallet it would orphan.
        const existing = await keypair();
        if (existing) return { address: existing.toSuiAddress() };
        const pair = Ed25519Keypair.generate();
        await storage.set({ [AGENT_KEY]: pair.getSecretKey() });
        return { address: pair.toSuiAddress() };
      }),
  };
}
