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

/** "7xKX…3fPq" */
export function shortAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}
