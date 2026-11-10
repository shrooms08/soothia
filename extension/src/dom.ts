// Small DOM helpers shared by the card and its sheets. Text always goes through
// textContent; innerHTML is used only for the constant SVG icons here, so page
// titles and AI output can never become markup.

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
const LINK_HOSTS = new Set(["suivision.xyz", "soothia.fun", "github.com"]);

/** Only https links to known hosts, because some hrefs come from the API. */
export function isSafeLink(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === "https:" && LINK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function externalLink(label: string, href: string, className: string): HTMLAnchorElement {
  const node = el("a", className, label);
  if (!isSafeLink(href)) return node;
  node.href = href;
  node.target = "_blank";
  node.rel = "noopener noreferrer";
  return node;
}

// A claim's end date is a UTC calendar date ("Dec 31, 2026"), the same for
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
export function icon(name: "close" | "refresh" | "warn" | "sound" | "muted" | "quiet"): SVGElement {
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
    quiet: [
      "14",
      `<path d="M11.8 8.9A5.2 5.2 0 0 1 5.1 2.2a5.2 5.2 0 1 0 6.7 6.7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>`,
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
