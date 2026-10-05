// Run with `npm test`. Checks focal-tweet selection against a saved copy of
// the structure X renders on a /status/ page.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { findFocalTweet, readTweetArticle, statusIdFromPath } from "../src/x-reader";

const html = readFileSync(new URL("./fixtures/x-status.html", import.meta.url), "utf8");
const page = (): Document => new JSDOM(html).window.document;
const STATUS_ID = "2002741524950344005";

test("reads the status id from the URL path", () => {
  assert.equal(statusIdFromPath("/intangiblecoins/status/2002741524950344005"), STATUS_ID);
  assert.equal(statusIdFromPath("/intangiblecoins/status/2002741524950344005/photo/1"), STATUS_ID);
  assert.equal(statusIdFromPath("/home"), null);
});

test("picks the tweet whose timestamp link matches the URL, not the parent above it", () => {
  const focal = findFocalTweet(page(), STATUS_ID);
  const read = focal && readTweetArticle(focal, STATUS_ID);
  assert.equal(read?.handle, "@intangiblecoins");
  assert.equal(read?.postedAt, "2025-12-21T14:02:43.000Z");
});

test("reads the rendered text in order, with emoji, and leaves out the quoted tweet", () => {
  const read = readTweetArticle(findFocalTweet(page(), STATUS_ID)!, STATUS_ID)!;
  assert.match(read.text, /^BTC will hit \$250k by year-end 2027\./);
  assert.match(read.text, /still possible\. 📈 Until BTC firmly/);
  assert.match(read.text, /downside in the near term\.$/);
  assert.doesNotMatch(read.text, /Quoted: 26 predictions/);
  assert.doesNotMatch(read.text, /Show more/);
});

test("a reply that links to the focal tweet in its text is not chosen", () => {
  const document = page();
  // Remove the real focal tweet: only the reply still mentions the id.
  findFocalTweet(document, STATUS_ID)!.remove();
  const fallback = readTweetArticle(findFocalTweet(document, STATUS_ID)!);
  assert.equal(fallback?.handle, "@galaxyhq");
});

test("an id that only shares a prefix does not match", () => {
  const focal = findFocalTweet(page(), "200274152495034400");
  // No tweet has that id, so this is the fallback, not @replyguy's longer id.
  assert.equal(readTweetArticle(focal!)?.handle, "@galaxyhq");
});

test("falls back to the first tweet in the primary column, never the sidebar", () => {
  const document = page();
  const read = readTweetArticle(findFocalTweet(document, "1")!);
  assert.equal(read?.handle, "@galaxyhq");

  document.querySelector('[data-testid="primaryColumn"]')!.remove();
  assert.equal(findFocalTweet(document, "1"), null);
});
