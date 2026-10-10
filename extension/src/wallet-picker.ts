// The wallet picker shown inside the card and sheets: detected wallets with
// their icons and names (last used first), or install links when none are
// found. Resolves with the chosen wallet's name, or null when dismissed.
import { button, el } from "./dom";
import type { WalletInfo } from "./messages";

export const INSTALL_LINKS: { name: string; url: string }[] = [
  { name: "Phantom", url: "https://phantom.com" },
  { name: "Solflare", url: "https://solflare.com" },
  { name: "Backpack", url: "https://backpack.app" },
  { name: "Jupiter", url: "https://jup.ag/mobile" },
];

/** A wallet's icon as an element: its image, or its initial when it has none. */
export function walletIcon(info: Pick<WalletInfo, "name" | "icon">, className = "wallet-icon"): HTMLElement {
  if (info.icon) {
    const img = document.createElement("img");
    img.className = className;
    img.src = info.icon;
    img.alt = "";
    img.width = 20;
    img.height = 20;
    return img;
  }
  return el("span", `${className} wallet-initial`, info.name.slice(0, 1).toUpperCase());
}

export function pickWallet(container: HTMLElement, wallets: WalletInfo[]): Promise<string | null> {
  return new Promise((resolve) => {
    const panel = el("div", "wallet-picker");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Choose a wallet");
    const finish = (name: string | null): void => {
      panel.remove();
      resolve(name);
    };
    if (wallets.length === 0) {
      panel.append(el("p", "wallet-picker-title", "No Solana wallet found"));
      panel.append(el("p", "note", "Install one, then reload this page."));
      const links = el("div", "wallet-picker-links");
      for (const { name, url } of INSTALL_LINKS) {
        const link = el("a", "link ext", name);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      }
      panel.append(links);
    } else {
      panel.append(el("p", "wallet-picker-title", "Choose a wallet"));
      const list = el("div", "wallet-picker-list");
      for (const info of wallets) {
        const row = button("", "wallet-option", () => finish(info.name));
        row.append(walletIcon(info), el("span", "wallet-option-name", info.name));
        list.append(row);
      }
      panel.append(list);
    }
    panel.append(button("Cancel", "ghost centered", () => finish(null)));
    container.append(panel);
    panel.scrollIntoView({ block: "nearest" });
    panel.querySelector<HTMLElement>(".wallet-option, .ghost")?.focus({ preventScroll: true });
  });
}
