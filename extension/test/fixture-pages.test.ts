// findFixture on real saved pages. Run with `npm test`.
//
// The .html files are ESPN match pages saved from Chrome. jsdom has no layout, so each
// .visible.txt holds what Chrome's body.innerText returned for that page, with the top
// scores bar showing other matches' full-time results.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { findFixture } from "../src/fixture";

const FIXTURES = join(import.meta.dirname, "fixtures");
const NOW = Date.parse("2026-11-08T20:00:00.000Z");
const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/;

function spacedText(node: Node): string {
  if (node.nodeType === 3) return node.nodeValue ?? "";
  if (node.nodeType !== 1 || SKIP.test((node as Element).tagName) || (node as Element).hasAttribute("data-hidden"))
    return "";
  return [...node.childNodes].map(spacedText).join(" ");
}

/** A document with innerText, which jsdom lacks: `bodyText` for the body, spaced text elsewhere. */
function documentFrom(html: string, bodyText?: string, url = "https://example.com/match"): Document {
  const { window } = new JSDOM(html, { url });
  Object.defineProperty(window.HTMLElement.prototype, "innerText", {
    get(this: HTMLElement) {
      return this === window.document.body && bodyText !== undefined ? bodyText : spacedText(this);
    },
  });
  // data-hidden stands in for display: none, which jsdom cannot compute from ESPN's CSS.
  window.Element.prototype.checkVisibility = function (this: Element) {
    return !this.closest("[data-hidden]");
  };
  return window.document;
}

function saved(name: string, url: string): Document {
  return documentFrom(
    readFileSync(join(FIXTURES, `${name}.html`), "utf8"),
    readFileSync(join(FIXTURES, `${name}.visible.txt`), "utf8"),
    url,
  );
}

// The pages show kickoff in the viewer's time zone; the parser reads it the same way.
const KICKOFF = new Date(2026, 10, 21, 18, 30).toISOString();

for (const [name, url] of [
  ["espn-africa", "https://africa.espn.com/football/match/_/gameId/401879232/arsenal-newcastle-united"],
  ["espn-www", "https://www.espn.com/soccer/match/_/gameId/401879232"],
] as const) {
  test(`${name}: other matches' full-time results do not end this fixture`, () => {
    const page = saved(name, url);
    assert.match(page.body.innerText, /\bFT\b/);
    const fixture = findFixture(page, NOW);
    assert.ok(fixture, "expected the upcoming fixture");
    assert.equal(fixture.home, "Newcastle");
    assert.equal(fixture.away, "Arsenal");
    assert.equal(fixture.startISO, KICKOFF);
    assert.equal(fixture.sourceUrl, url);
  });
}

const page = (body: string, title = "Newcastle vs. Arsenal (21 Nov, 2026) Live Score - ESPN"): Document =>
  documentFrom(`<!doctype html><title>${title}</title><body>${body}</body>`);
const BAR = `<section><div>BHA 2 BRE 0 FT</div><div>MAN 4 AVL 4 FT Full Scoreboard</div></section>`;
const UPCOMING = `<div><span>Newcastle United</span> <span>21 Nov 6:30 PM</span> <span>Arsenal</span></div>`;

test("a scores bar right before the match header does not count", () => {
  assert.ok(findFixture(page(`${BAR}${UPCOMING}<h1>Newcastle v Arsenal</h1>`), NOW));
});

test("the match's own full-time marker still counts", () => {
  assert.equal(
    findFixture(
      page(
        `${BAR}<div><span>Newcastle United</span> <span>FT</span> <span>21 Nov 6:30 PM</span> <span>Arsenal</span></div>`,
      ),
      NOW,
    ),
    null,
  );
});

test("the match's own live score still counts", () => {
  assert.equal(
    findFixture(
      page(
        `<div><span>LIVE</span> <span>Newcastle United</span> <span>21 Nov 6:30 PM</span> <span>Arsenal</span></div>`,
      ),
      NOW,
    ),
    null,
  );
  assert.equal(
    findFixture(page(`<div><span>Newcastle United 2 - 1 Arsenal</span> <span>21 Nov 6:30 PM</span></div>`), NOW),
    null,
  );
});

test("an old meeting further down the page does not count", () => {
  assert.ok(findFixture(page(`${UPCOMING}<ul><li>Newcastle United 1-2 Arsenal FT 3 May 12:00 PM</li></ul>`), NOW));
});

test("a heading with both teams and no date does not hide the header below it", () => {
  assert.ok(findFixture(page(`<h1>Newcastle v Arsenal</h1>${UPCOMING}`), NOW));
});

test("when the teams sit in separate blocks, text before the home team is not read for status", () => {
  const padding = "x".repeat(800);
  assert.ok(findFixture(page(`${BAR}<p>Newcastle United 21 Nov 6:30 PM</p><p>${padding}</p><p>Arsenal</p>`), NOW));
});

test("a league table holding both teams does not stand in for the header", () => {
  const table = `<table><tr><td>Arsenal 10 9 0 1 +10 27</td></tr><tr><td>Newcastle United 10 3 3 4 -3 12</td></tr></table>`;
  assert.ok(findFixture(page(`${UPCOMING}${table}`), NOW));
});

test("a team's record next to the date is not read as the day", () => {
  const fixture = findFixture(
    page(`<div><span>Newcastle United 3-3-4</span> <span>Nov 21 6:30 PM</span> <span>Arsenal 9-0-1</span></div>`),
    NOW,
  );
  assert.equal(fixture?.startISO, new Date(2026, 10, 21, 18, 30).toISOString());
});

test("a narrow layout that hides the full names still finds the header", () => {
  const strip = `<div><span data-hidden>Newcastle United</span><span>NEW 3-3-4</span> <span>21 Nov 6:30 PM</span> <span data-hidden>Arsenal</span><span>ARS 9-0-1</span></div>`;
  const table = `<table><tr><td>Arsenal 10 9 0 1 +10 27</td></tr><tr><td>Newcastle United 10 3 3 4 -3 12</td></tr></table>`;
  const fixture = findFixture(page(`${BAR}${strip}<h1>Newcastle v Arsenal</h1>${table}`), NOW);
  assert.equal(fixture?.startISO, KICKOFF);
});

test("a date that is itself hidden is not used", () => {
  assert.equal(
    findFixture(
      page(`<div><span>Newcastle United</span> <span data-hidden>21 Nov 6:30 PM</span> <span>Arsenal</span></div>`),
      NOW,
    ),
    null,
  );
});

test("a page with no fixture finds none", () => {
  assert.equal(findFixture(page(`${BAR}<p>Some article about football.</p>`, "Football news - ESPN"), NOW), null);
});
