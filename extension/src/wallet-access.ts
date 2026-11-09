// What the staking screens need from the wallet: who is connected, connecting with a
// choice between wallets, and signing only through the transaction check.

import type { ExpectedTx } from "./tx-check";
import { isOwnershipMessage, signChecked, signOnlyChecked, type TxChecker, type WalletBridge } from "./wallet-client";
import type { ConnectedWallet, WalletSummary } from "./wallet-protocol";
import { isConnectedWallet, type WalletStorage } from "./wallet-settings";

export interface WalletAccess {
  current(): Promise<ConnectedWallet | null>;
  /** Connects and saves a wallet. `choose` is asked when several are installed; null means cancelled. */
  connect(choose: (wallets: WalletSummary[]) => Promise<WalletSummary | null>): Promise<ConnectedWallet | null>;
  sign(wallet: ConnectedWallet, txBytes: string, expected: ExpectedTx): Promise<{ digest: string }>;
  /** Signs without sending, for a payment the Worker broadcasts. */
  signOnly(wallet: ConnectedWallet, txBytes: string, expected: ExpectedTx): Promise<{ bytes: string; signature: string }>;
  /** Signs a profile ownership message. Anything else is refused. */
  signMessage(wallet: ConnectedWallet, message: string): Promise<{ signature: string }>;
}

export function createWalletAccess(bridge: WalletBridge, storage: WalletStorage, check: TxChecker): WalletAccess {
  return {
    async current() {
      const saved = await storage.read().catch(() => null);
      return isConnectedWallet(saved) ? saved : null;
    },
    async connect(choose) {
      const wallets = (await bridge.call("list")) as WalletSummary[];
      if (wallets.length === 0) throw new Error("No Sui wallet found in this browser. Install Slush and reload this page.");
      const wallet = wallets.length === 1 ? wallets[0] : await choose(wallets);
      if (!wallet) return null;
      const { address, walletName } = (await bridge.call("connect", { walletId: wallet.id })) as { address: string; walletName: string };
      const connected: ConnectedWallet = { address, walletId: wallet.id, walletName };
      await storage.write(connected);
      return connected;
    },
    sign: (wallet, txBytes, expected) => signChecked(bridge, check, wallet, txBytes, expected),
    signOnly: (wallet, txBytes, expected) => signOnlyChecked(bridge, check, wallet, txBytes, expected),
    async signMessage(wallet, message) {
      if (!isOwnershipMessage(message, wallet.address)) throw new Error("Soothia refused to sign an unexpected message.");
      return (await bridge.call("signPersonalMessage", { walletId: wallet.walletId, address: wallet.address, message })) as { signature: string };
    },
  };
}
