// Extracts what the reader is looking at as { url, site, title, text }.
// Read-only: nothing here changes the page.
import type { PageContext } from "./messages";
import { findFocalTweet, readTweetArticle, statusIdFromPath } from "./x-reader";

const TEXT_MAX_CHARS = 4000;
// Below this there is not enough on the page to draft a market from.
const MIN_ARTICLE_CHARS = 200;
// A whole tweet is often under 200 characters, so tweets get their own floor.
const MIN_TWEET_CHARS = 30;
const MIN_PARAGRAPH_CHARS = 60;

/** What the reader saw, for the debug footer. Stays in the page; never sent anywhere. */
export interface ReadInfo {
  site: string;
  chars: number;
  preview: string;
}

export type ReadResult = { info: ReadInfo } & (
  | { kind: "page"; page: PageContext }
  // Not enough text yet. Dynamic pages may fill in, so the caller can retry.
  | { kind: "thin"; reason: string }
  // A page Soothia never reads.
  | { kind: "skip"; reason: string }
);

interface Found {
  title: string;
  text: string;
}

// Search engines and other pages with nothing to read. Whole hosts, so mail,
// docs and image search on the same domains are skipped too.
const SEARCH_HOSTS =
  /(^|\.)(google\.[a-z.]{2,8}|bing\.com|duckduckgo\.com|search\.yahoo\.com|yahoo\.com\/search|yandex\.(com|ru)|baidu\.com|ecosia\.org|search\.brave\.com|startpage\.com|qwant\.com|kagi\.com|ask\.com|perplexity\.ai)$/i;

/** Why a URL is never read, or null when it may be an article. Pure, so it is unit-tested. */
export function skipReason(url: { protocol: string; hostname: string; pathname: string }, contentType = "text/html"): string | null {
  if (url.protocol !== "http:" && url.protocol !== "https:") return "local or non-web page";
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "0.0.0.0" || host === "[::1]" || /^127\./.test(host)) {
    return "local or non-web page";
  }
  if (SEARCH_HOSTS.test(host) || (host.endsWith("yahoo.com") && /^\/search/.test(url.pathname))) return "search results";
  if (/\.pdf($|[?#])/i.test(url.pathname) || /pdf/i.test(contentType)) return "PDF";
  if (!/html|xhtml/i.test(contentType)) return `not a web page (${contentType})`;
  return null;
}

function isSkippedLocation(): string | null {
  return skipReason(location, document.contentType || "text/html");
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

function mainTweet(): { article: Element; statusId?: string } | null {
  const statusId = statusIdFromPath(location.pathname);
  if (statusId) {
    const article = findFocalTweet(document, statusId);
    return article && { article, statusId };
  }

  // Timelines: the tweet nearest the middle of the viewport.
  const articles = [...document.querySelectorAll<HTMLElement>('article[data-testid="tweet"]')].filter(isVisible);
  if (articles.length === 0) return null;
  const middle = window.innerHeight / 2;
  const distance = (article: HTMLElement): number => {
    const rect = article.getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - middle);
  };
  return { article: articles.reduce((best, article) => (distance(article) < distance(best) ? article : best)) };
}

function readTweet(): Found | string {
  const main = mainTweet();
  if (!main) return "no tweet on the page yet";
  const tweet = readTweetArticle(main.article, main.statusId);
  if (!tweet) return "tweet has no text";
  if (tweet.text.length < MIN_TWEET_CHARS) return `tweet text is ${tweet.text.length} chars, need ${MIN_TWEET_CHARS}`;

  const who = tweet.handle ?? "unknown author";
  const posted = tweet.postedAt ? ` (posted ${tweet.postedAt.slice(0, 10)})` : "";
  return {
    title: tweet.handle ? `Post by ${tweet.handle} on X` : "Post on X",
    text: `${who}${posted}: ${tweet.text}`,
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
  // Known story containers first (the one holding the most text wins), then <article>, then main.
  let best: { text: string }[] = [];
  for (const selector of BODY_SELECTORS) {
    for (const container of document.querySelectorAll(selector)) {
      const found = paragraphsIn(container);
      if (totalLength(found) > totalLength(best)) best = found;
    }
    if (totalLength(best) >= MIN_ARTICLE_CHARS) return best.map((paragraph) => paragraph.text);
  }

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

const CONSENT_SELECTOR = [
  "#onetrust-banner-sdk", "#onetrust-consent-sdk", ".sp_message_container", '[id^="sp_message"]', "#CybotCookiebotDialog",
  "#didomi-host", ".fc-consent-root", ".qc-cmp2-container", "#usercentrics-root", '[id*="consent" i]', '[class*="consent" i]',
  '[id*="cookie-banner" i]', '[class*="cookie-banner" i]', '[class*="cookie-wall" i]', '[aria-label*="consent" i]',
].join(",");

/** A consent or cookie wall covering much of the viewport, which usually means the article is not on screen yet. */
export function consentWallVisible(): boolean {
  const viewport = Math.max(1, window.innerWidth * window.innerHeight);
  for (const element of document.querySelectorAll<HTMLElement>(CONSENT_SELECTOR)) {
    if (!isVisible(element)) continue;
    const rect = element.getBoundingClientRect();
    const position = getComputedStyle(element).position;
    if ((rect.width * rect.height) / viewport >= 0.3 || (position === "fixed" && rect.height >= 120)) return true;
  }
  return false;
}

// Where major news and sports sites keep the story. Tried in order; the first with enough text wins.
const BODY_SELECTORS = [
  '[itemprop="articleBody"]', ".sdc-article-body", ".article__body", ".article-body", ".story-body", "#article-body",
  ".article__content", ".ArticleBody", ".entry-content", ".post-content", '[data-testid="article-body"]', "article", 'main, [role="main"]',
];

const STANDFIRST_SELECTORS = [
  '[data-component="standfirst"]', ".standfirst", ".article__intro", ".sdc-article-header__sub-title", ".article-subtitle",
  ".subheadline", ".dek", ".summary", 'meta[name="description"]', 'meta[property="og:description"]',
];

function standfirst(): string {
  for (const selector of STANDFIRST_SELECTORS) {
    const node = document.querySelector(selector);
    if (!node) continue;
    const text = clean(node instanceof HTMLMetaElement ? node.content : node.textContent);
    if (text.length >= 40) return text.slice(0, 400);
  }
  return "";
}

function headline(): string {
  for (const h1 of document.querySelectorAll("h1")) {
    const text = clean(h1.textContent);
    if (text && isVisible(h1)) return text;
  }
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  return clean(og) || clean(document.title);
}

function readArticle(): Found | string {
  const paragraphs = articleParagraphs();
  const intro = standfirst();
  // Headline, standfirst, then the paragraphs (the standfirst once, even if it is also the first paragraph).
  const body = [intro, ...paragraphs.filter((text) => text !== intro)].filter(Boolean).join("\n");
  if (body.length < MIN_ARTICLE_CHARS) {
    if (consentWallVisible()) return `consent wall is up; article text is ${body.length} chars`;
    return `article text is ${body.length} chars, need ${MIN_ARTICLE_CHARS}`;
  }
  const title = headline();
  return { title, text: title ? `${title}\n\n${body}` : body };
}

export function readPage(): ReadResult {
  const site = location.hostname.replace(/^www\./, "");
  const skipped = isSkippedLocation();
  if (skipped) return { kind: "skip", reason: skipped, info: { site, chars: 0, preview: "" } };
  const found = isX() ? readTweet() : readArticle();
  if (typeof found === "string") return { kind: "thin", reason: found, info: { site, chars: 0, preview: "" } };

  const text = found.text.slice(0, TEXT_MAX_CHARS);
  return {
    kind: "page",
    info: { site, chars: text.length, preview: text.slice(0, 80) },
    page: { url: location.href.split("#")[0], site, title: found.title.slice(0, 300), text },
  };
}
