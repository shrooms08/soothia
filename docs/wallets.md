# Wallets

Read on 2026-10-10 from the Wallet Standard packages (`@wallet-standard/base` 1.1.1, `@wallet-standard/app` 1.1.1, `@wallet-standard/features` 1.1.0), `@solana/wallet-standard-features` 1.5.0, `@solana-mobile/wallet-standard-mobile` 0.7.0, and the wallets' own deep-link docs. The shared layer is `extension/src/wallets.ts`, used by the extension's MAIN-world bridge and bundled into `site/wallets.js` for the share page.

## Wallet Standard (what we use)

- **Discovery.** `getWallets()` from `@wallet-standard/app` dispatches `wallet-standard:app-ready` and listens for `wallet-standard:register-wallet`; wallets that load before or after the app both end up in `get()`. `on("register" | "unregister", listener)` fires for late registrations. Wallets that only inject a legacy provider (`window.phantom.solana`, `window.solflare`, `window.backpack`) are offered as a fallback when no standard wallet of that name is registered.
- **A usable wallet** has `chains` including `solana:mainnet` and `features` with `standard:connect` and `solana:signTransaction`. Fields: `version`, `name` (unique, static), `icon` (a `data:image/(svg+xml|webp|png|gif);base64,…` URI), `chains`, `features`, `accounts`.
- **`standard:connect`**: `connect({ silent?: boolean }) → { accounts: WalletAccount[] }`. With `silent: true` the wallet must not prompt; it returns the accounts it already trusts for this site or throws. Each `WalletAccount` has `address` (base58), `publicKey` (bytes), `chains`, `features`, optional `label` and `icon`. We pick the first account whose chains include `solana:mainnet`.
- **`standard:disconnect`**: `disconnect()`; optional for wallets, so we tolerate its absence.
- **`standard:events`**: `on("change", ({ accounts, chains, features }) => …) → off`. We follow account switches and clear the connection when the wallet drops all accounts.
- **`solana:signTransaction`**: `signTransaction({ account, transaction: Uint8Array, chain: "solana:mainnet" }) → [{ signedTransaction: Uint8Array }]`. Bytes in, bytes out, so standard wallets need no web3.js. `supportedTransactionVersions` lists `"legacy"` and `0`; our transactions are v0. We never use `solana:signAndSendTransaction`: Soothia's Worker sends.
- **Checks kept.** After signing we run the same check as before: at most 1,232 bytes, the message unchanged apart from an added compute-budget instruction, first signature present.
- **Remembering.** The last used wallet name is stored (`localStorage` `soothia:wallet` on the site, `chrome.storage.local` in the extension), listed first in the picker, and reconnected silently on the next visit when it is detected.

## Mobile Wallet Adapter

`@solana-mobile/wallet-standard-mobile` registers a Wallet Standard wallet named `"Mobile Wallet Adapter"` (and `"Remote Mobile Wallet Adapter"` when a remote host authority is given). `registerMwa({ appIdentity: { name, uri, icon }, chains, authorizationCache: createDefaultAuthorizationCache(), chainSelector: createDefaultChainSelector(), onWalletNotFound: createDefaultWalletNotFoundHandler() })`. It works on Android (Chrome and other browsers that can open an Android intent); on iOS there is no MWA, so the share page only registers it on Android Chrome. The bundle is `site/mwa.js`, loaded only there.

## In-app browser deep links (verified from official docs)

| Wallet | Open a page in the wallet's browser | Source |
| --- | --- | --- |
| Phantom | `https://phantom.com/ul/browse/<url-encoded page>?ref=<url-encoded app>` | docs.phantom.com › Deeplinks › Other methods › Browse |
| Solflare | `https://solflare.com/ul/v1/browse/<url-encoded page>?ref=<url-encoded app>` | docs.solflare.com › Deeplinks › Other methods › Browse |
| Backpack | `https://backpack.app/ul/v1/browse/<url-encoded page>?ref=<url-encoded app>` | docs.backpack.app › Deeplinks › Other methods › Browse |
| Jupiter Mobile | **none documented.** Jupiter's FAQ describes the in-app browser (globe icon, search for the dapp) but publishes no link scheme. We do not guess: the share page offers "Copy link" with the hint to paste it into the wallet's browser. | docs.jup.ag › Mobile › FAQ |

All three documented links take the target page and the referrer URL-encoded, work before any connect session, and "must either be handled by an app or clicked on by an end user" (not pasted into a mobile browser's address bar). The share page carries the chosen side in the page URL (`?side=yes|no`) so the wallet's browser opens with it preselected.

## Install links shown when no wallet is found (desktop)

Phantom https://phantom.com · Solflare https://solflare.com · Backpack https://backpack.app · Jupiter https://jup.ag/mobile · all wallets https://solana.com/wallets (the welcome page links https://solana.com/solana-wallets, which redirects there).
