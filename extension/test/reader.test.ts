// Pages Soothia never reads. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { skipReason } from "../src/reader";

const at = (href: string) => {
  const u = new URL(href);
  return { protocol: u.protocol, hostname: u.hostname, pathname: u.pathname };
};

test("search engines, local, extension and PDF pages are skipped with a reason", () => {
  assert.equal(skipReason(at("https://www.google.com/search?q=futbol24")), "search results");
  assert.equal(skipReason(at("https://www.google.co.uk/search?q=x")), "search results");
  assert.equal(skipReason(at("https://www.bing.com/search?q=futbol24")), "search results");
  assert.equal(skipReason(at("https://duckduckgo.com/?q=futbol24")), "search results");
  assert.equal(skipReason(at("https://search.yahoo.com/search?p=x")), "search results");
  assert.equal(skipReason(at("https://search.brave.com/search?q=x")), "search results");
  assert.equal(skipReason(at("https://mail.google.com/mail/u/0/")), "search results");
  assert.equal(skipReason(at("chrome://extensions/")), "local or non-web page");
  assert.equal(skipReason(at("chrome-extension://abc/welcome.html")), "local or non-web page");
  assert.equal(skipReason(at("http://localhost:5173/")), "local or non-web page");
  assert.equal(skipReason(at("https://example.com/report.pdf")), "PDF");
  assert.equal(skipReason(at("https://example.com/report"), "application/pdf"), "PDF");
  assert.equal(skipReason(at("https://example.com/data"), "application/json"), "not a web page (application/json)");
});

test("articles on news, sport and X pages are read", () => {
  for (const href of [
    "https://www.bbc.com/sport/football/articles/c1234",
    "https://www.skysports.com/football/news/13591795/premier-league-predictions",
    "https://www.espn.com/soccer/story/_/id/50126359/x",
    "https://x.com/intangiblecoins/status/2002741524950344005",
    "https://www.google.com.au.example.org/news",
  ])
    assert.equal(skipReason(at(href)), null, href);
});
