// My record > Wallet > Agent: a small wallet that unlocks premium calls by itself.
import { button, el, externalLink } from "./dom";
import type { AgentAction, ApiError, ApiPath, ApiResponse } from "./messages";
import { AGENT_HARD_CAP_MIST, type AgentSettings, type AgentStatus } from "./premium-logic";
import { shortId } from "./recall-logic";
import { formatSui, parseSuiAmount, walletErrorText } from "./stake-logic";
import type { WalletAccess } from "./wallet-access";
import type { ConnectedWallet } from "./wallet-protocol";

export type AgentRequest = <T>(action: AgentAction, settings?: AgentSettings) => Promise<T | null>;

export interface AgentHost {
  agent: AgentRequest;
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  wallet: WalletAccess;
  connected: ConnectedWallet;
  layout(): void;
}

const DEFAULT_FUNDING = "0.05";
const txUrl = (digest: string): string => `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`;
const whenText = (iso: string): string => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function suiInput(value: string, label: string): HTMLInputElement {
  const input = el("input", "input agent-input");
  input.type = "text";
  input.inputMode = "decimal";
  input.value = value;
  input.setAttribute("aria-label", label);
  return input;
}

export function createAgentSection(host: AgentHost): HTMLElement {
  const node = el("section", "record-section agent");
  const title = el("h3", "field-label", "Agent");
  const slot = el("div", "agent-body");
  node.append(title, slot);

  const refresh = async (): Promise<void> => {
    const status = await host.agent<AgentStatus>("status");
    slot.replaceChildren(...(status ? (status.address ? agentView(status, status.address) : createView()) : [el("p", "note", "Couldn't load the agent wallet.")]));
    host.layout();
  };

  function createView(): HTMLElement[] {
    const note = el("p", "note");
    const create = button("Create agent wallet", "button primary wide", () => {
      void (async () => {
        create.disabled = true;
        note.textContent = "Creating…";
        host.layout();
        if ((await host.agent<{ address: string }>("create")) === null) {
          note.textContent = "That didn't work. Please try again.";
          create.disabled = false;
          host.layout();
          return;
        }
        await refresh();
      })();
    });
    return [el("p", "note", "A separate wallet that unlocks premium calls from people you follow, without a popup."), el("p", "warn", "Keep small amounts here."), create, note];
  }

  function agentView(status: AgentStatus, address: string): HTMLElement[] {
    const note = el("p", "note");
    note.setAttribute("aria-live", "polite");
    const report = (text: string): void => {
      note.textContent = text;
      host.layout();
    };

    const info = el("div", "agent-info");
    info.append(el("p", "note mono", `Address ${shortId(address)}`), el("p", "note", `Balance ${status.balanceMist === null ? "unknown" : `${formatSui(status.balanceMist, 4)} SUI`}`), el("p", "warn", "Keep small amounts here. Uninstalling Soothia deletes this wallet's key."));

    const amount = suiInput(DEFAULT_FUNDING, "Amount to fund, in SUI");
    const fund: HTMLButtonElement = button("Fund from my wallet", "button small", () => void fundAgent());
    const fundRow = el("div", "wallet-row agent-row");
    fundRow.append(amount, fund);

    async function fundAgent(): Promise<void> {
      const mist = parseSuiAmount(amount.value);
      if (mist === null) return report("Enter an amount in SUI.");
      fund.disabled = true;
      report("Preparing…");
      const built = await host.api<{ transaction: string }>("/premium/transfer/build", { sender: host.connected.address, recipient: address, amountMist: mist.toString() });
      if (!built.ok || !built.body) {
        fund.disabled = false;
        return report((built.body as ApiError | null)?.error === "insufficient_balance" ? "Your wallet doesn't have enough SUI." : "Couldn't prepare that. Please try again.");
      }
      report("Waiting for your wallet…");
      try {
        await host.wallet.sign(host.connected, (built.body as { transaction: string }).transaction, { kind: "fund", recipient: address, amountMist: mist.toString() });
      } catch (error) {
        fund.disabled = false;
        return report(walletErrorText(String((error as Error)?.message ?? error), "Nothing was sent.").text);
      }
      await refresh();
    }

    const withdraw: HTMLButtonElement = button("Withdraw all", "button small", () => {
      void (async () => {
        withdraw.disabled = true;
        report("Sending it back to your wallet…");
        const result = await host.agent<{ digest?: string; error?: string }>("withdraw");
        if (!result?.digest) {
          withdraw.disabled = false;
          report(result?.error === "insufficient_balance" ? "There's too little here to send." : "That didn't work. Please try again.");
          return;
        }
        await refresh();
      })();
    });
    const withdrawRow = el("div", "wallet-row agent-row");
    withdrawRow.append(withdraw);

    const enabled = el("input", "agent-check");
    enabled.type = "checkbox";
    enabled.checked = status.settings.enabled;
    enabled.setAttribute("aria-label", "Auto-unlock on");
    const onLabel = el("label", "agent-switch");
    onLabel.append(enabled, el("span", "", "Auto-unlock"));

    const budget = suiInput(formatSui(status.settings.dailyBudgetMist), "Daily budget in SUI");
    const max = suiInput(formatSui(status.settings.maxPerCallMist), "Most to pay for one call, in SUI");
    const field = (label: string, input: HTMLElement): HTMLElement => {
      const row = el("div", "wallet-row agent-row");
      row.append(el("span", "field-label", label), input);
      return row;
    };
    const save: HTMLButtonElement = button("Save settings", "button small", () => {
      void (async () => {
        const budgetMist = parseSuiAmount(budget.value);
        const maxMist = parseSuiAmount(max.value);
        if (budgetMist === null || maxMist === null) return report("Enter amounts in SUI.");
        if (maxMist > AGENT_HARD_CAP_MIST) return report(`The most per call is ${formatSui(AGENT_HARD_CAP_MIST)} SUI.`);
        save.disabled = true;
        await host.agent<AgentSettings>("settings", { enabled: enabled.checked, dailyBudgetMist: budgetMist.toString(), maxPerCallMist: maxMist.toString() });
        await refresh();
      })();
    });

    const receipts = status.receipts.map((receipt) => {
      const row = el("div", "agent-receipt");
      row.append(el("span", "", `${whenText(receipt.at)} · @${receipt.handle} · ${receipt.match} · ${formatSui(receipt.priceMist, 4)} SUI`), externalLink(shortId(receipt.digest), txUrl(receipt.digest), "link mono"));
      return row;
    });

    return [
      info,
      fundRow,
      withdrawRow,
      note,
      onLabel,
      field("Daily budget (SUI)", budget),
      field("Max per call (SUI)", max),
      el("p", "note", "Only callers I follow: always on"),
      el("p", "note", `Spent today ${formatSui(status.spentTodayMist, 4)} of ${formatSui(status.settings.dailyBudgetMist, 4)} SUI`),
      save,
      ...(receipts.length > 0 ? [el("p", "field-label", "Receipts"), ...receipts] : []),
    ];
  }

  slot.append(el("p", "note", "Loading…"));
  void refresh();
  return node;
}
