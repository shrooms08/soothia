// Event mode parsers. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  fixtureFromJsonLd,
  fixtureFromSignals,
  looksStartedOrFinished,
  resolveKickoff,
  sidesFromTitle,
} from "../src/fixture";

// Saturday 10 October 2026, 15:00 local.
const NOW = new Date(2026, 9, 10, 15, 0).getTime();
const URL_ = "https://www.livescore.com/en/football/spain/laliga/levante-vs-sevilla/1810711/table/";

test("titles: A vs B, A v B, A - B, with site suffixes stripped", () => {
  assert.deepEqual(sidesFromTitle("Levante vs Sevilla Live Scores | LiveScore"), {
    home: "Levante",
    away: "Sevilla",
    evidence: "Levante vs Sevilla Live Scores | LiveScore",
  });
  assert.equal(sidesFromTitle("Levante vs Sevilla Live Scores and Match Information")?.away, "Sevilla");
  assert.equal(sidesFromTitle("Liverpool v Manchester City - BBC Sport")!.away, "Manchester City");
  assert.equal(sidesFromTitle("Real Madrid - Barcelona: preview")!.home, "Real Madrid");
  assert.equal(sidesFromTitle("Bayern Munich vs. Borussia Dortmund | ESPN")?.away, "Borussia Dortmund");
  assert.equal(sidesFromTitle("LaLiga table and standings"), null);
  assert.equal(sidesFromTitle("Levante vs Levante"), null);
});

test("kickoff: time with day-first, month-first, ISO, today/tomorrow, and year rollover in the viewer's timezone", () => {
  const a = resolveKickoff("Levante 20:00 12 Oct Sevilla", NOW)!;
  assert.deepEqual(
    [a.date.getFullYear(), a.date.getMonth(), a.date.getDate(), a.date.getHours(), a.date.getMinutes()],
    [2026, 9, 12, 20, 0],
  );
  assert.equal(a.evidence, "12 Oct 20:00");
  const b = resolveKickoff("Sun, October 12 · 8:00 PM", NOW)!;
  assert.deepEqual([b.date.getDate(), b.date.getHours()], [12, 20]);
  const c = resolveKickoff("Kick-off 2026-10-12 19:30", NOW)!;
  assert.deepEqual([c.date.getMonth(), c.date.getDate(), c.date.getHours(), c.date.getMinutes()], [9, 12, 19, 30]);
  const d = resolveKickoff("Tomorrow 15:00", NOW)!;
  assert.equal(d.date.getDate(), 11);
  // A January date read in October has no year on the page: it is next January.
  const e = resolveKickoff("3 Jan 17:30", NOW)!;
  assert.equal(e.date.getFullYear(), 2027);
  // The same written with the year stays put.
  assert.equal(resolveKickoff("3 Jan 2026 17:30", NOW)!.date.getFullYear(), 2026);
  assert.equal(resolveKickoff("Levante Sevilla table", NOW), null);
});

test("started or finished matches are rejected", () => {
  assert.equal(looksStartedOrFinished("Levante 20:00 12 Oct Sevilla"), false);
  assert.equal(looksStartedOrFinished("Levante 1 - 0 Sevilla FT"), true);
  assert.equal(looksStartedOrFinished("Levante 0 - 0 Sevilla 23'"), true);
  assert.equal(looksStartedOrFinished("Levante HT Sevilla"), true);
  assert.equal(looksStartedOrFinished("Postponed"), true);
  assert.equal(
    fixtureFromSignals(
      {
        jsonLd: [],
        titles: ["Levante vs Sevilla Live Scores | LiveScore"],
        headerText: "Levante 2 - 1 Sevilla FT",
        url: URL_,
      },
      NOW,
    ),
    null,
  );
  // A kickoff in the past is not upcoming either.
  assert.equal(
    fixtureFromSignals(
      {
        jsonLd: [],
        titles: ["Levante vs Sevilla | LiveScore"],
        headerText: "Levante 20:00 9 Oct 2026 Sevilla",
        url: URL_,
      },
      NOW,
    ),
    null,
  );
});

test("the LiveScore page yields a grounded fixture with LaLiga from the URL and header", () => {
  const fixture = fixtureFromSignals(
    {
      jsonLd: [],
      titles: ["Levante vs Sevilla Live Scores | LiveScore", "Levante vs Sevilla Live Scores and Match Information"],
      headerText: "LaLiga Spain Favourites Levante 20:00 12 Oct Sevilla Info Line-ups Table H2H",
      url: URL_,
    },
    NOW,
  )!;
  assert.equal(fixture.home, "Levante");
  assert.equal(fixture.away, "Sevilla");
  assert.equal(fixture.competition, "LaLiga");
  assert.equal(fixture.dateLabel, "October 12, 2026");
  assert.equal(new Date(fixture.startISO).getTime(), new Date(2026, 9, 12, 20, 0).getTime());
  assert.deepEqual(fixture.evidence, ["Levante vs Sevilla Live Scores | LiveScore", "12 Oct 20:00", "LaLiga"]);
});

test("JSON-LD SportsEvent wins over titles and keeps its own strings as evidence", () => {
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "Liverpool v Manchester City",
    startDate: "2026-10-12T15:30:00Z",
    homeTeam: { "@type": "SportsTeam", name: "Liverpool" },
    awayTeam: { "@type": "SportsTeam", name: "Manchester City" },
    eventStatus: "https://schema.org/EventScheduled",
  });
  const fixture = fixtureFromJsonLd([ld], NOW, "https://www.bbc.com/sport/football/live/x")!;
  assert.equal(fixture.home, "Liverpool");
  assert.equal(fixture.away, "Manchester City");
  assert.equal(fixture.startISO, "2026-10-12T15:30:00.000Z");
  assert.deepEqual(fixture.evidence.slice(0, 2), ["Liverpool v Manchester City", "startDate 2026-10-12T15:30:00Z"]);
  // A past or cancelled event is skipped; a @graph is searched.
  assert.equal(
    fixtureFromJsonLd(
      [
        JSON.stringify({
          "@type": "SportsEvent",
          name: "A vs B",
          startDate: "2026-10-01T15:00:00Z",
          homeTeam: "A",
          awayTeam: "B",
        }),
      ],
      NOW,
      "",
    ),
    null,
  );
  assert.equal(
    fixtureFromJsonLd(
      [
        JSON.stringify({
          "@type": "SportsEvent",
          name: "A vs B",
          startDate: "2026-10-20T15:00:00Z",
          homeTeam: "A",
          awayTeam: "B",
          eventStatus: "https://schema.org/EventCancelled",
        }),
      ],
      NOW,
      "",
    ),
    null,
  );
  const graph = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage" },
      {
        "@type": "SportsEvent",
        name: "Ajax vs PSV",
        startDate: "2026-10-18T13:30:00Z",
        competitor: [{ name: "Ajax" }, { name: "PSV" }],
      },
    ],
  });
  assert.equal(fixtureFromJsonLd([graph], NOW, "")?.away, "PSV");
});
