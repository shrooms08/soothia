// Finds and drives Sui wallets through the Wallet Standard. Wallets only register in
// the page's own world, so this runs in the page: from the extension's bridge, and on
// the admin page. Nothing here may touch chrome.* or Soothia's secrets.

import { Transaction } from "@mysten/sui/transactions";
import {
  getWallets,
  isWalletWithRequiredFeatureSet,
  signAndExecuteTransaction,
  signTransaction,
  StandardConnect,
  StandardDisconnect,
  SUI_MAINNET_CHAIN,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type SuiSignAndExecuteTransactionFeature,
  type SuiSignPersonalMessageFeature,
  type SuiSignTransactionFeature,
  type Wallet,
  type WalletAccount,
  type WalletWithFeatures,
} from "@mysten/wallet-standard";
import type { WalletSummary } from "./wallet-protocol";

const SIGN_FEATURE = "sui:signAndExecuteTransaction";

type SuiWallet = WalletWithFeatures<StandardConnectFeature & SuiSignAndExecuteTransactionFeature & Partial<StandardDisconnectFeature> & Partial<SuiSignPersonalMessageFeature> & Partial<SuiSignTransactionFeature>>;

const walletId = (wallet: Wallet): string => wallet.id ?? wallet.name;

function isSuiWallet(wallet: Wallet): wallet is SuiWallet {
  return isWalletWithRequiredFeatureSet(wallet, [SIGN_FEATURE]) && wallet.chains.includes(SUI_MAINNET_CHAIN);
}

function suiWallets(): SuiWallet[] {
  return getWallets().get().filter(isSuiWallet);
}

export function listWallets(): (WalletSummary & { icon: string })[] {
  return suiWallets().map((wallet) => ({ id: walletId(wallet), name: wallet.name, icon: wallet.icon }));
}

function findWallet(id: string): SuiWallet {
  const wallet = suiWallets().find((candidate) => walletId(candidate) === id);
  if (!wallet) throw new Error("That wallet is not available in this browser.");
  return wallet;
}

const onMainnet = (accounts: readonly WalletAccount[]): WalletAccount[] => accounts.filter((account) => account.chains.includes(SUI_MAINNET_CHAIN));

export async function connectWallet(id: string, silent = false): Promise<{ address: string; walletName: string }> {
  const wallet = findWallet(id);
  const { accounts } = await wallet.features[StandardConnect].connect({ silent });
  const [account] = onMainnet(accounts);
  if (!account) throw new Error("The wallet has no Sui mainnet account.");
  return { address: account.address, walletName: wallet.name };
}

export function walletAccounts(id: string): string[] {
  return onMainnet(findWallet(id).accounts).map((account) => account.address);
}

export async function disconnectWallet(id: string): Promise<void> {
  await findWallet(id).features[StandardDisconnect]?.disconnect();
}

async function accountFor(wallet: SuiWallet, address: string): Promise<WalletAccount> {
  let account = onMainnet(wallet.accounts).find((candidate) => candidate.address === address);
  if (!account) {
    const { accounts } = await wallet.features[StandardConnect].connect({ silent: true });
    account = onMainnet(accounts).find((candidate) => candidate.address === address);
  }
  if (!account) throw new Error("The wallet is not connected to that address.");
  return account;
}

/** Asks the wallet to sign a plain message, which can never move anything. */
export async function signPersonalMessage(id: string, address: string, message: string): Promise<{ signature: string }> {
  const wallet = findWallet(id);
  const feature = wallet.features["sui:signPersonalMessage"];
  if (!feature) throw new Error("This wallet can't sign messages.");
  const account = await accountFor(wallet, address);
  const { signature } = await feature.signPersonalMessage({ message: new TextEncoder().encode(message), account, chain: SUI_MAINNET_CHAIN });
  return { signature };
}

/** Asks the wallet to sign these bytes without sending them. The Worker broadcasts the result. */
export async function signOnly(id: string, address: string, txBytes: string): Promise<{ bytes: string; signature: string }> {
  const wallet = findWallet(id);
  const account = await accountFor(wallet, address);
  const transaction = Transaction.from(txBytes);
  const { bytes, signature } = await signTransaction(wallet, {
    transaction: { toJSON: () => transaction.toJSON() },
    account,
    chain: SUI_MAINNET_CHAIN,
  });
  return { bytes, signature };
}

/** Asks the wallet to sign and send these exact bytes from `address`. */
export async function signAndExecute(id: string, address: string, txBytes: string): Promise<{ digest: string }> {
  const wallet = findWallet(id);
  const account = await accountFor(wallet, address);
  const transaction = Transaction.from(txBytes);
  const { digest } = await signAndExecuteTransaction(wallet, {
    transaction: { toJSON: () => transaction.toJSON() },
    account,
    chain: SUI_MAINNET_CHAIN,
  });
  return { digest };
}
