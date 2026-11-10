// The admin page. It connects the operator's wallet in the page, and refuses to act
// unless that wallet owns the AdminCap. The token lives in sessionStorage only.

import { connectWallet, listWallets } from "../../extension/src/sui-wallet-core";
import { api, byId, digestLink, failureText, make, page, readToken, saveToken, setStatus } from "./core";
import { startDrill } from "./drill";
import { formatLeft, suiAmount } from "./logic";

const COUNTDOWN_MS = 1_000;

interface Pending {
  poolId: string;
  match: { home: string; away: string; startISO: string; subject: "home" | "away" } | null;
  evidence: string;
  outcome: string;
  yesTotal: string;
  noTotal: string;
  feeMist: string;
  claimOpensAtMs: number;
}

function renderWallet(): void {
  const status = byId("wallet-status");
  const { wallet, info } = page;
  if (wallet && info) {
    if (page.isOwner()) setStatus(status, `Connected: ${wallet.address}. This wallet holds the AdminCap.`, "good");
    else
      setStatus(status, `Refused. Connected: ${wallet.address}. The AdminCap is held by ${info.adminCapOwner}.`, "bad");
  } else if (wallet) {
    setStatus(status, `Connected: ${wallet.address}. Enter the token to check it.`);
  }
  if (info) {
    const text = `On chain now: resolve delay ${info.minResolveDelayMs} ms, challenge window ${info.challengeMs} ms.`;
    setStatus(
      byId("config-status"),
      info.productionDelays
        ? `${text} These are the production values.`
        : `${text} Not the production values, so new pools are paused.`,
      info.productionDelays ? "" : "bad",
    );
  }
  document.querySelectorAll<HTMLButtonElement>("button[data-overturn]").forEach((button) => {
    button.disabled = !page.isOwner();
  });
}

async function useToken(): Promise<void> {
  const value = byId<HTMLInputElement>("token").value.trim();
  if (!saveToken(value)) {
    setStatus(byId("token-status"), "This browser would not store the token.", "bad");
    return;
  }
  byId<HTMLInputElement>("token").value = "";
  await loadAll();
}

async function loadAll(): Promise<void> {
  const status = byId("token-status");
  if (!readToken()) {
    setStatus(status, "No token yet.");
    return;
  }
  try {
    await page.refreshInfo();
    setStatus(status, "Token accepted.", "good");
    await refreshPending();
  } catch (error) {
    setStatus(status, failureText(error), "bad");
  }
}

async function chooseWallet(): Promise<void> {
  const status = byId("wallet-status");
  const actions = byId("wallet-actions");
  const wallets = listWallets();
  if (wallets.length === 0) {
    setStatus(status, "No Sui wallet found. Install Slush, reload this page, and try again.", "bad");
    return;
  }
  if (wallets.length === 1) {
    await connect(wallets[0].id);
    return;
  }
  setStatus(status, "Choose a wallet.");
  actions.replaceChildren(
    ...wallets.map((wallet) => {
      const button = make("button", wallet.name);
      button.type = "button";
      button.addEventListener("click", () => void connect(wallet.id));
      return button;
    }),
  );
}

async function connect(id: string): Promise<void> {
  const status = byId("wallet-status");
  setStatus(status, "Approve the connection in your wallet.");
  try {
    const { address } = await connectWallet(id);
    page.wallet = { id, address };
    page.changed();
  } catch (error) {
    setStatus(status, failureText(error), "bad");
  }
}

let countdowns: { node: HTMLElement; endsAt: number }[] = [];

function teamsOf(item: Pending): string {
  if (!item.match) return item.poolId;
  const { home, away, subject } = item.match;
  return `${home} vs ${away}. YES means ${subject === "home" ? home : away} won.`;
}

function renderPending(items: Pending[]): void {
  const root = byId("pending");
  countdowns = [];
  root.replaceChildren(
    ...items.map((item) => {
      const box = make("div");
      box.className = "item";
      const left = make("p");
      countdowns.push({ node: left, endsAt: item.claimOpensAtMs });
      const result = make("p");
      result.className = "status";
      const button = make("button", "Overturn");
      button.type = "button";
      button.dataset.overturn = item.poolId;
      button.disabled = !page.isOwner();
      button.addEventListener("click", () => void overturn(item, result));
      box.append(
        make("p", teamsOf(item)),
        make("p", `Outcome: ${item.outcome}`),
        make("p", `Evidence: ${item.evidence}`),
        make("p", `YES ${suiAmount(item.yesTotal)}, NO ${suiAmount(item.noTotal)}, fee ${suiAmount(item.feeMist)}`),
        left,
        button,
        result,
      );
      return box;
    }),
  );
  tick();
}

function tick(): void {
  for (const { node, endsAt } of countdowns)
    node.textContent = `Time left to overturn: ${formatLeft(endsAt - Date.now())}`;
}

async function refreshPending(): Promise<void> {
  const status = byId("pending-status");
  try {
    const { pending } = await api<{ pending: Pending[] }>("/stake/admin/pending");
    setStatus(
      status,
      pending.length === 0 ? "No pools are in a challenge window." : `${pending.length} in a challenge window.`,
    );
    renderPending(pending);
  } catch (error) {
    setStatus(status, failureText(error), "bad");
  }
}

async function overturn(item: Pending, result: HTMLElement): Promise<void> {
  if (!window.confirm(`Overturn this result and refund everyone?\n\n${teamsOf(item)}`)) return;
  setStatus(result, "Approve in your wallet.");
  try {
    const { txBytes } = await api<{ txBytes: string }>("/stake/admin/overturn/build", { poolId: item.poolId });
    const digest = await page.sign(txBytes);
    setStatus(result, "Overturned: ", "good");
    result.append(digestLink(digest));
  } catch (error) {
    setStatus(result, failureText(error), "bad");
  }
}

page.listeners.push(renderWallet);
byId("save-token").addEventListener("click", () => void useToken());
byId("connect").addEventListener("click", () => void chooseWallet());
byId("refresh").addEventListener("click", () => void refreshPending());
window.setInterval(tick, COUNTDOWN_MS);
startDrill(byId("drill-root"));
void loadAll();
