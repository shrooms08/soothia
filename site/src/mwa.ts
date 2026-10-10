// Mobile Wallet Adapter as a Wallet Standard wallet ("Mobile Wallet Adapter"):
// on Android Chrome it lets a native wallet app sign for the share page.
// Loaded only there; the package is large.
import {
  createDefaultAuthorizationCache,
  createDefaultChainSelector,
  createDefaultWalletNotFoundHandler,
  registerMwa,
} from "@solana-mobile/wallet-standard-mobile";

let registered = false;

export function register(appUrl: string): void {
  if (registered) return;
  registered = true;
  registerMwa({
    appIdentity: { name: "Soothia", uri: appUrl, icon: "img/icon-128.png" },
    authorizationCache: createDefaultAuthorizationCache(),
    chains: ["solana:mainnet"],
    chainSelector: createDefaultChainSelector(),
    onWalletNotFound: createDefaultWalletNotFoundHandler(),
  });
}
