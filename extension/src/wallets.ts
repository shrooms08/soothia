// The shared wallet layer: one module for the share page and the extension's
// MAIN-world bridge. Wallets are discovered through the Wallet Standard
// (getWallets: "wallet-standard:app-ready" / "wallet-standard:register-wallet"),
// filtered to those that support standard:connect and solana:signTransaction on
// solana:mainnet. Wallets that only inject a legacy provider
// (window.phantom.solana, window.solflare, window.backpack) are offered as a
// fallback when they did not register through the standard. Signing is always
// signTransaction, never signAndSendTransaction: Soothia's Worker sends.
import { getWallets } from "@wallet-standard/app";
import type { Wallet, WalletAccount } from "@wallet-standard/base";

export const SOLANA_MAINNET = "solana:mainnet";
const CONNECT = "standard:connect";
const DISCONNECT = "standard:disconnect";
const EVENTS = "standard:events";
const SIGN = "solana:signTransaction";

export interface WalletInfo {
  name: string;
  /** A data: URI from the wallet, or "" for a legacy provider (the UI shows the initial). */
  icon: string;
  /** True when the wallet only exposes a legacy window provider. */
  legacy?: boolean;
}

export interface ConnectedWallet extends WalletInfo {
  publicKey: string;
}

export type WalletFailure = "rejected" | "no_wallet" | "failed" | "legacy_needs_signer";

export class WalletError extends Error {
  constructor(
    readonly reason: WalletFailure,
    message: string = reason,
  ) {
    super(message);
  }
}

/** Legacy providers hand back a transaction object; this turns bytes into one and back. */
export interface LegacySigner {
  deserialize(bytes: Uint8Array): unknown;
  serialize(transaction: unknown): Uint8Array;
}

interface LegacyProvider {
  publicKey?: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signTransaction(transaction: unknown): Promise<unknown>;
}

interface ConnectFeature {
  connect(input?: { silent?: boolean }): Promise<{ accounts: readonly WalletAccount[] }>;
}
interface DisconnectFeature {
  disconnect(): Promise<void>;
}
interface EventsFeature {
  on(event: "change", listener: (properties: { accounts?: readonly WalletAccount[] }) => void): () => void;
}
interface SignFeature {
  signTransaction(
    ...inputs: { account: WalletAccount; transaction: Uint8Array; chain?: string }[]
  ): Promise<readonly { signedTransaction: Uint8Array }[]>;
}

type Selected =
  | { kind: "standard"; wallet: Wallet; account: WalletAccount; off?: () => void }
  | { kind: "legacy"; name: string; provider: LegacyProvider; publicKey: string };

const LEGACY_PROVIDERS: { name: string; find(): LegacyProvider | null }[] = [
  {
    name: "Phantom",
    find: () => {
      const w = window as unknown as {
        phantom?: { solana?: LegacyProvider & { isPhantom?: boolean } };
        solana?: LegacyProvider & { isPhantom?: boolean };
      };
      return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null);
    },
  },
  {
    name: "Solflare",
    find: () => (window as unknown as { solflare?: LegacyProvider & { isSolflare?: boolean } }).solflare ?? null,
  },
  {
    name: "Backpack",
    find: () => (window as unknown as { backpack?: LegacyProvider & { isBackpack?: boolean } }).backpack ?? null,
  },
];

let selected: Selected | null = null;
const listeners = new Set<() => void>();

function usable(wallet: Wallet): boolean {
  return wallet.chains.includes(SOLANA_MAINNET) && CONNECT in wallet.features && SIGN in wallet.features;
}

function standardWallets(): Wallet[] {
  if (typeof window === "undefined") return [];
  return getWallets().get().filter(usable);
}

/** Detected wallets: standard ones in registration order, then legacy providers not already listed. */
export function listWallets(): WalletInfo[] {
  const out: WalletInfo[] = standardWallets().map((wallet) => ({ name: wallet.name, icon: wallet.icon }));
  for (const legacy of LEGACY_PROVIDERS) {
    if (out.some((info) => info.name.toLowerCase() === legacy.name.toLowerCase())) continue;
    if (legacy.find()) out.push({ name: legacy.name, icon: "", legacy: true });
  }
  return out;
}

/** Fires when a wallet registers or unregisters. Legacy injection is not observable; poll listWallets() for that. */
export function onWalletsChange(listener: () => void): () => void {
  listeners.add(listener);
  const registry = getWallets();
  const offs = [registry.on("register", listener), registry.on("unregister", listener)];
  return () => {
    listeners.delete(listener);
    for (const off of offs) off();
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

export function isRejection(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 4001) return true;
  return /reject|cancel|denied|declined/i.test(String((error as Error | null)?.message ?? ""));
}

function toFailure(error: unknown): WalletError {
  if (error instanceof WalletError) return error;
  if (isRejection(error)) return new WalletError("rejected");
  return new WalletError("failed", String((error as Error | null)?.message ?? "").slice(0, 200));
}

function mainnetAccount(accounts: readonly WalletAccount[]): WalletAccount | null {
  return accounts.find((account) => account.chains.includes(SOLANA_MAINNET)) ?? accounts[0] ?? null;
}

export function connected(): ConnectedWallet | null {
  if (!selected) return null;
  if (selected.kind === "legacy") return { name: selected.name, icon: "", legacy: true, publicKey: selected.publicKey };
  return { name: selected.wallet.name, icon: selected.wallet.icon, publicKey: selected.account.address };
}

/**
 * Connects the named wallet. With `silent`, never shows a prompt: returns null
 * unless the wallet already trusts this site.
 */
export async function connect(name: string, options: { silent?: boolean } = {}): Promise<ConnectedWallet | null> {
  const wallet = standardWallets().find((candidate) => candidate.name === name);
  if (wallet) {
    try {
      let account = options.silent ? mainnetAccount(wallet.accounts) : null;
      if (!account) {
        const feature = wallet.features[CONNECT] as ConnectFeature;
        const result = await feature.connect(options.silent ? { silent: true } : undefined);
        account = mainnetAccount(result.accounts);
      }
      if (!account) {
        if (options.silent) return null;
        throw new WalletError("failed", "The wallet returned no account.");
      }
      selected?.kind === "standard" && selected.off?.();
      const events = wallet.features[EVENTS] as EventsFeature | undefined;
      const off = events?.on("change", (properties) => {
        if (!properties.accounts || selected?.kind !== "standard" || selected.wallet !== wallet) return;
        const next = mainnetAccount(properties.accounts);
        if (next) selected.account = next;
        else selected = null;
        notify();
      });
      selected = { kind: "standard", wallet, account, off };
      notify();
      return connected();
    } catch (error) {
      if (options.silent) return null;
      throw toFailure(error);
    }
  }
  const legacy = LEGACY_PROVIDERS.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
  const provider = legacy?.find();
  if (!legacy || !provider) throw new WalletError("no_wallet");
  try {
    let publicKey = provider.publicKey?.toString() ?? null;
    if (!publicKey) {
      const result = await provider.connect(options.silent ? { onlyIfTrusted: true } : undefined);
      publicKey = result.publicKey.toString();
    }
    selected = { kind: "legacy", name: legacy.name, provider, publicKey };
    notify();
    return connected();
  } catch (error) {
    if (options.silent) return null;
    throw toFailure(error);
  }
}

export async function disconnect(): Promise<void> {
  const current = selected;
  selected = null;
  notify();
  if (!current) return;
  try {
    if (current.kind === "standard") {
      current.off?.();
      const feature = current.wallet.features[DISCONNECT] as DisconnectFeature | undefined;
      await feature?.disconnect();
    } else await current.provider.disconnect();
  } catch {
    // Already disconnected on our side.
  }
}

function fromBase64(text: string): Uint8Array {
  return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = (value << 8n) | BigInt(byte);
  let out = "";
  for (; value > 0n; value /= 58n) out = BASE58[Number(value % 58n)] + out;
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = "1" + out;
  }
  return out;
}

/** The first signature of a serialized transaction (one byte of count, then 64-byte signatures). */
export function firstSignature(bytes: Uint8Array): string {
  return base58(bytes.subarray(1, 65));
}

/**
 * Asks the connected wallet to sign the unsigned transaction. Standard wallets
 * sign raw bytes; a legacy provider needs `legacy` to build its transaction
 * object (the caller loads web3.js for that only when needed).
 */
export async function signTransaction(
  txBase64: string,
  legacy?: LegacySigner,
): Promise<{ signedTxBase64: string; signature: string }> {
  if (!selected) throw new WalletError("no_wallet");
  const bytes = fromBase64(txBase64);
  try {
    let signed: Uint8Array;
    if (selected.kind === "standard") {
      const feature = selected.wallet.features[SIGN] as SignFeature;
      const [output] = await feature.signTransaction({
        account: selected.account,
        transaction: bytes,
        chain: SOLANA_MAINNET,
      });
      signed = output.signedTransaction;
    } else {
      if (!legacy) throw new WalletError("legacy_needs_signer");
      signed = legacy.serialize(await selected.provider.signTransaction(legacy.deserialize(bytes)));
    }
    return { signedTxBase64: toBase64(signed), signature: firstSignature(signed) };
  } catch (error) {
    throw toFailure(error);
  }
}
