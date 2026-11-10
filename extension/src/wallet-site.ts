// Where a wallet may be used. Messages between the extension and the page's wallet
// pass through the page's own window, so a hostile page can read and forge them. Wallet
// actions therefore run only on sites Soothia is built for, never on any page at all.

import type { WalletBridge } from "./wallet-client";

export const WALLET_SITES = ["soothia.fun", "espn.com"];
export const UNTRUSTED_SITE = "wallet_untrusted_site";

export function isWalletSite(hostname: string | null | undefined): boolean {
  const host = (hostname ?? "").toLowerCase();
  return WALLET_SITES.some((site) => host === site || host.endsWith(`.${site}`));
}

/** The page this script runs on, or "" outside a browser. */
export const currentSite = (): string => (typeof location === "undefined" ? "" : location.hostname);

/** Stands in for the wallet bridge on other sites: it never touches the page. */
export const untrustedSiteBridge: WalletBridge = {
  call: async () => {
    throw new Error(UNTRUSTED_SITE);
  },
};
