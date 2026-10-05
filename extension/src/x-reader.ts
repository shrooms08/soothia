// Finds and reads the focal tweet on X. Pure DOM queries with no layout or
// viewport access, so it runs the same in Chrome, Brave, and unit tests.
// Read-only: it never clicks "Show more" or anything else.

export interface TweetRead {
  handle: string | null;
  /** ISO timestamp from the tweet's <time>, when shown. */
  postedAt: string | null;
  text: string;
}

const TWEET = 'article[data-testid="tweet"]';
// tweetText holds normal and long posts; the others are X's long-form article bodies.
const TEXT = [
  '[data-testid="tweetText"]',
  '[data-testid="twitterArticleRichTextView"]',
  '[data-testid="longformRichTextComponent"]',
].join(",");

export function statusIdFromPath(pathname: string): string | null {
  return /\/status(?:es)?\/(\d+)/.exec(pathname)?.[1] ?? null;
}

function permalinkId(href: string | null): string | null {
  // Whole id only: /status/123 must not match a URL for /status/1234.
  return /\/status\/(\d+)(?:[/?#]|$)/.exec(href ?? "")?.[1] ?? null;
}

function permalinkTime(article: Element, statusId?: string): HTMLTimeElement | null {
  for (const link of article.querySelectorAll("a[href]")) {
    const time = link.querySelector("time");
    if (!time) continue;
    if (!statusId || permalinkId(link.getAttribute("href")) === statusId) return time;
  }
  return null;
}

/**
 * The tweet a /status/ page is about: the first tweet whose timestamp link
 * points at the id in the URL. Parent tweets above it and replies below it
 * link to their own ids. Falls back to the first tweet in the primary column.
 */
export function findFocalTweet(root: ParentNode, statusId: string): Element | null {
  for (const article of root.querySelectorAll(TWEET)) {
    if (permalinkTime(article, statusId)) return article;
  }
  return root.querySelector(`[data-testid="primaryColumn"] ${TWEET}`);
}

// What is rendered, in order: text, plus emoji (X draws those as <img alt>).
function renderedText(node: Node): string {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === 3) out += child.nodeValue ?? "";
    else if (child.nodeType !== 1) continue;
    else if ((child as Element).tagName === "IMG") out += (child as Element).getAttribute("alt") ?? "";
    else if ((child as Element).tagName === "BR") out += "\n";
    else out += renderedText(child);
  }
  return out;
}

export function readTweetArticle(article: Element, statusId?: string): TweetRead | null {
  // The first text block is the tweet's own; a quoted tweet's comes later.
  const body = article.querySelector(TEXT);
  if (!body) return null;
  const text = renderedText(body).replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
  if (!text) return null;

  const handle = /@\w{1,15}/.exec(article.querySelector('[data-testid="User-Name"]')?.textContent ?? "")?.[0] ?? null;
  const time = (statusId && permalinkTime(article, statusId)) || permalinkTime(article) || article.querySelector("time");
  return { handle, postedAt: time?.getAttribute("datetime") ?? null, text };
}
