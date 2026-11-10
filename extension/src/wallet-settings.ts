// The Sui wallet section of the card's settings: connect, choose between wallets,
// disconnect, and a debug-only "Test wallet" that connects and shows the address.

import { button, el } from "./dom";
import { walletErrorText } from "./stake-logic";
import { SUI_WALLET_KEY } from "./messages";
import type { WalletBridge } from "./wallet-client";
import type { ConnectedWallet, WalletSummary } from "./wallet-protocol";
import { currentSite } from "./wallet-site";

export const shortAddress = (address: string): string => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function isConnectedWallet(value: unknown): value is ConnectedWallet {
  const wallet = value as Partial<ConnectedWallet> | null | undefined;
  return (
    typeof wallet?.address === "string" && typeof wallet.walletId === "string" && typeof wallet.walletName === "string"
  );
}

export interface WalletStorage {
  read(): Promise<unknown>;
  write(wallet: ConnectedWallet): Promise<void>;
  clear(): Promise<void>;
}

export const chromeWalletStorage: WalletStorage = {
  read: async () => (await chrome.storage.local.get(SUI_WALLET_KEY))[SUI_WALLET_KEY],
  write: (wallet) => chrome.storage.local.set({ [SUI_WALLET_KEY]: wallet }),
  clear: () => chrome.storage.local.remove(SUI_WALLET_KEY),
};

const problem = (error: unknown): string => String((error as Error)?.message ?? error).slice(0, 120);

export function createWalletSettings(bridge: WalletBridge, storage: WalletStorage, onLayout: () => void = () => {}) {
  const root = el("div", "field wallet-field");
  const status = el("p", "wallet-note");
  const actions = el("div", "wallet-row");
  const picker = el("div", "wallet-row wallet-picker");
  picker.hidden = true;
  let connected: ConnectedWallet | null = null;

  function show(text: string): void {
    status.textContent = text;
    onLayout();
  }

  function hidePicker(): void {
    picker.hidden = true;
    picker.replaceChildren();
  }

  /** Calls `use` with the only wallet, or asks which one when there are several. */
  async function chooseWallet(use: (wallet: WalletSummary) => Promise<void>): Promise<void> {
    hidePicker();
    let wallets: WalletSummary[];
    try {
      wallets = (await bridge.call("list")) as WalletSummary[];
    } catch (error) {
      show(walletErrorText(problem(error), "").text);
      return;
    }
    if (wallets.length === 0) {
      show("No Sui wallet found in this browser.");
      return;
    }
    if (wallets.length === 1) {
      await use(wallets[0]);
      return;
    }
    picker.replaceChildren(
      ...wallets.map((wallet) =>
        button(wallet.name, "button small", () => {
          hidePicker();
          void use(wallet);
        }),
      ),
    );
    picker.hidden = false;
    show("Choose a wallet.");
  }

  async function connectAndSave(wallet: WalletSummary): Promise<void> {
    show(`Approve in ${wallet.name}…`);
    try {
      const { address, walletName } = (await bridge.call("connect", { walletId: wallet.id })) as {
        address: string;
        walletName: string;
      };
      connected = { address, walletId: wallet.id, walletName, site: currentSite() };
      await storage.write(connected);
      render();
    } catch (error) {
      show(problem(error));
    }
  }

  async function testWallet(wallet: WalletSummary): Promise<void> {
    show(`Approve in ${wallet.name}…`);
    try {
      const { address } = (await bridge.call("connect", { walletId: wallet.id })) as { address: string };
      show(`Test wallet: ${address}`);
    } catch (error) {
      show(problem(error));
    }
  }

  async function disconnect(): Promise<void> {
    const leaving = connected;
    connected = null;
    await storage.clear();
    render();
    // Soothia has already forgotten the wallet; telling the wallet too is a courtesy.
    if (leaving) await bridge.call("disconnect", { walletId: leaving.walletId }).catch(() => undefined);
  }

  const connectButton = button("Connect Sui wallet", "button small", () => void chooseWallet(connectAndSave));
  const disconnectButton = button("Disconnect", "button small", () => void disconnect());
  const testButton = button("Test wallet", "button small", () => void chooseWallet(testWallet));
  testButton.hidden = true;
  actions.append(connectButton, disconnectButton, testButton);
  root.append(el("span", "field-label", "Sui wallet"), actions, picker, status);

  function render(): void {
    hidePicker();
    connectButton.hidden = connected !== null;
    disconnectButton.hidden = connected === null;
    show(connected ? `Connected to ${connected.walletName}: ${shortAddress(connected.address)}` : "");
  }

  return {
    root,
    async load(): Promise<void> {
      const saved = await storage.read().catch(() => null);
      connected = isConnectedWallet(saved) ? saved : null;
      render();
    },
    setDebugVisible(visible: boolean): void {
      testButton.hidden = !visible;
    },
  };
}
