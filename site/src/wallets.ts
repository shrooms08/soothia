// The share page's wallet bundle: the shared Wallet Standard layer plus the
// signed-transaction check, and a lazy loader for the Mobile Wallet Adapter
// (Android Chrome only). Legacy providers still need share-tx.js for web3.js.
export {
  connect,
  connected,
  disconnect,
  firstSignature,
  isRejection,
  listWallets,
  onWalletsChange,
  signTransaction,
  WalletError,
} from "../../extension/src/wallets";
export { checkSignedTransaction } from "../../extension/src/tx-check";

let mwa: Promise<void> | null = null;

/** Registers the Mobile Wallet Adapter as a Wallet Standard wallet, once, on Android Chrome. */
export function registerMobileWalletAdapter(appUrl: string): Promise<void> {
  if (mwa) return mwa;
  const ua = navigator.userAgent;
  if (!/Android/i.test(ua) || !/Chrome/i.test(ua)) return Promise.resolve();
  const version = document.querySelector("main")?.getAttribute("data-v") ?? "0";
  const url = `/mwa.js?v=${encodeURIComponent(version)}`; // a variable, so the bundler leaves this import alone
  mwa = import(/* @vite-ignore */ url)
    .then((module: { register(appUrl: string): void }) => module.register(appUrl))
    .catch(() => {});
  return mwa;
}
