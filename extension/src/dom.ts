// Small DOM helpers shared by the card and the review sheet.

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function button(label: string, className: string, onClick?: () => void): HTMLButtonElement {
  const node = el("button", className, label);
  node.type = "button";
  if (onClick) node.addEventListener("click", onClick);
  return node;
}

/** A button that copies text and reads "Copied" for a moment. `onCopied` runs on success. */
export function copyButton(label: string, text: string, className: string, onCopied?: () => void): HTMLButtonElement {
  const node = button(label, className, () => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        node.textContent = "Copied";
        node.classList.add("copied");
        onCopied?.();
        setTimeout(() => {
          node.textContent = label;
          node.classList.remove("copied");
        }, 1500);
      })
      .catch(() => {
        node.textContent = "Couldn't copy";
        setTimeout(() => (node.textContent = label), 1500);
      });
  });
  return node;
}

/** A link that opens in a new tab and tells the destination nothing about this page. */
export function externalLink(label: string, href: string, className: string): HTMLAnchorElement {
  const node = el("a", className, label);
  node.href = href;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  return node;
}

// A market's end date is a UTC calendar date ("Dec 31, 2026"), the same for
// every reader. Local time would push a 23:59 UTC deadline into the next day.
const END_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function endDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : END_DATE.format(date);
}

/** "coingecko.com" for "https://www.coingecko.com/en/coins/bitcoin". */
export function domainName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "7xKX…3fPq" */
export function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

const SVG_NS = "http://www.w3.org/2000/svg";
let starCount = 0;

/** The chrome four-point star from the design sheet (sth-star), self-contained. */
export function starSvg(className = "star"): HTMLElement {
  const id = `sth-chrome-${++starCount}`;
  const wrap = el("span", className);
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "-50 -50 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML =
    `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".34" stop-color="#D3D1DE"/><stop offset=".5" stop-color="#6F6C82"/><stop offset=".64" stop-color="#F3F2F8"/><stop offset="1" stop-color="#8E8BA0"/></linearGradient></defs>` +
    `<path d="M0 -50 C3 -12 8 -4 32 0 C8 4 3 12 0 50 C-3 12 -8 4 -32 0 C-8 -4 -3 -12 0 -50Z" fill="url(#${id})"/>` +
    `<path d="M0 -50 C3 -12 8 -4 32 0 L0 0Z" fill="#FFFFFF" opacity=".38"/>` +
    `<path d="M0 0 L-32 0 C-8 4 -3 12 0 50Z" fill="#0E0D14" opacity=".28"/>`;
  wrap.append(svg);
  return wrap;
}

/** A small inline icon from the sheet: close, refresh, warning. */
export function icon(name: "close" | "refresh" | "warn" | "sound" | "muted"): SVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  const paths: Record<typeof name, [string, string]> = {
    close: ["14", `<path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`],
    refresh: [
      "12",
      `<path d="M10 6a4 4 0 1 1-1.2-2.85M10 1.5v2.5H7.5" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    ],
    sound: [
      "14",
      `<path d="M2 5.5v3h2.2L7.5 11V3L4.2 5.5H2z" fill="currentColor"/><path d="M9.5 4.8a2.6 2.6 0 0 1 0 4.4M11.2 3a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
    ],
    muted: [
      "14",
      `<path d="M2 5.5v3h2.2L7.5 11V3L4.2 5.5H2z" fill="currentColor"/><path d="M9.3 5.2l3.4 3.6M12.7 5.2l-3.4 3.6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>`,
    ],
    warn: [
      "16",
      `<path d="M8 1.8l6.6 11.6H1.4z" fill="none" stroke="#F2C069" stroke-width="1.4" stroke-linejoin="round"/><path d="M8 6.5v3.2M8 11.4v.2" stroke="#F2C069" stroke-width="1.5" stroke-linecap="round"/>`,
    ],
  };
  const [size, body] = paths[name];
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.innerHTML = body;
  return svg;
}

/** Text with numbers in mono: "missing 2.00 USDC and 0.0100 SOL" -> spans. */
export function withMono(text: string): (string | HTMLElement)[] {
  const out: (string | HTMLElement)[] = [];
  const pattern = /\$?\d[\d,]*(?:\.\d+)?(?: ?(?:USDC|SOL|%|bytes))?/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > last) out.push(text.slice(last, match.index));
    out.push(el("span", "mono", match[0]));
    last = match.index! + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
