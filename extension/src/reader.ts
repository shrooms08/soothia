// Extracts what the reader is looking at as { url, site, title, text }.
// Read-only: nothing here changes the page.
import type { PageContext } from "./messages";

const TEXT_MAX_CHARS = 4000;
// Below this there is not enough on the page to draft a market from.
const MIN_ARTICLE_CHARS = 200;
// A whole tweet is often under 200 characters, so tweets get their own floor.
const MIN_TWEET_CHARS = 30;
const MIN_PARAGRAPH_CHARS = 60;

export type ReadResult =
  | { kind: "page"; page: PageContext }
  // Not enough text yet. Dynamic pages may fill in, so the caller can retry.
  | { kind: "thin" }
  // A page Soothia never reads.
  | { kind: "skip" };

function isSkippedLocation(): boolean {
  if (location.protocol !== "http:" && location.protocol !== "https:") return true;
  const host = location.hostname;
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host === "[::1]" ||
    /^127\./.test(host)
  );
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

// ---- X / Twitter ----

function isX(): boolean {
  return /(^|\.)(x|twitter)\.com$/.test(location.hostname);
}

function mainTweet(): HTMLElement | null {
  const articles = [...document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')].filter(isVisible);
  if (articles.length === 0) return null;

  // On a status page the main tweet links to its own id (timestamp, analytics).
  const statusId = /\/status\/(\d+)/.exec(location.pathname)?.[1];
  if (statusId) {
    const own = articles.find((article) => article.querySelector(`a[href*="/status/${statusId}"]`));
    if (own) return own;
  }

  const middle = window.innerHeight / 2;
  const distance = (article: HTMLElement): number => {
    const rect = article.getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - middle);
  };
  return articles.reduce((best, article) => (distance(article) < distance(best) ? article : best));
}

function readTweet(): { title: string; text: string } | null {
  const article = mainTweet();
  if (!article) return null;
  // The first tweetText is the tweet's own; a quoted tweet's comes later.
  const body = clean(article.querySelector('[data-testid="tweetText"]')?.textContent);
  if (body.length < MIN_TWEET_CHARS) return null;
  const handle = /@\w{1,15}/.exec(article.querySelector('[data-testid="User-Name"]')?.textContent ?? "")?.[0];
  return {
    title: handle ? `Post by ${handle} on X` : "Post on X",
    text: handle ? `${handle}: ${body}` : body,
  };
}

// ---- Articles and everything else ----

const CHROME_SELECTOR = [
  "nav",
  "footer",
  "aside",
  "form",
  "dialog",
  "figure",
  '[role="navigation"]',
  '[role="banner"]',
  '[role="contentinfo"]',
  '[role="complementary"]',
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-hidden="true"]',
].join(",");

const NOISE_NAME =
  /cookie|consent|gdpr|advert|sponsor|promo|newsletter|subscribe|paywall|sidebar|comment|related|share|social|breadcrumb|(^|[\s_-])ads?($|[\s_-])/i;

function isNoise(paragraph: Element): boolean {
  if (paragraph.closest(CHROME_SELECTOR)) return true;
  let node: Element | null = paragraph;
  for (let depth = 0; node && depth < 5; depth++, node = node.parentElement) {
    if (NOISE_NAME.test(`${node.id} ${node.getAttribute("class") ?? ""}`)) return true;
  }
  return false;
}

function paragraphsIn(root: ParentNode): { element: Element; text: string }[] {
  const out: { element: Element; text: string }[] = [];
  for (const element of root.querySelectorAll("p")) {
    const text = clean(element.textContent);
    if (text.length < MIN_PARAGRAPH_CHARS || !isVisible(element) || isNoise(element)) continue;
    out.push({ element, text });
  }
  return out;
}

function totalLength(paragraphs: { text: string }[]): number {
  return paragraphs.reduce((sum, paragraph) => sum + paragraph.text.length, 0);
}

function articleParagraphs(): string[] {
  // Prefer <article>; with several, the one holding the most text is the story.
  let best: { text: string }[] = [];
  for (const article of document.querySelectorAll("article")) {
    const found = paragraphsIn(article);
    if (totalLength(found) > totalLength(best)) best = found;
  }
  if (totalLength(best) >= MIN_ARTICLE_CHARS) return best.map((paragraph) => paragraph.text);

  // Otherwise the largest text block: the parent whose paragraphs hold the most text.
  const all = paragraphsIn(document.querySelector('main, [role="main"]') ?? document.body);
  const byParent = new Map<Element | null, { text: string }[]>();
  for (const paragraph of all) {
    const parent = paragraph.element.parentElement;
    byParent.set(parent, [...(byParent.get(parent) ?? []), paragraph]);
  }
  let largest: { text: string }[] = [];
  for (const group of byParent.values()) {
    if (totalLength(group) > totalLength(largest)) largest = group;
  }
  // Pages that split a story across many small containers still read in order.
  const chosen = totalLength(largest) >= MIN_ARTICLE_CHARS ? largest : all;
  return chosen.map((paragraph) => paragraph.text);
}

function headline(): string {
  for (const h1 of document.querySelectorAll("h1")) {
    const text = clean(h1.textContent);
    if (text && isVisible(h1)) return text;
  }
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  return clean(og) || clean(document.title);
}

function readArticle(): { title: string; text: string } | null {
  const body = articleParagraphs().join("\n");
  if (body.length < MIN_ARTICLE_CHARS) return null;
  const title = headline();
  return { title, text: title ? `${title}\n\n${body}` : body };
}

export function readPage(): ReadResult {
  if (isSkippedLocation()) return { kind: "skip" };
  const found = isX() ? readTweet() : readArticle();
  if (!found) return { kind: "thin" };
  return {
    kind: "page",
    page: {
      url: location.href.split("#")[0],
      site: location.hostname.replace(/^www\./, ""),
      title: found.title.slice(0, 300),
      text: found.text.slice(0, TEXT_MAX_CHARS),
    },
  };
}
