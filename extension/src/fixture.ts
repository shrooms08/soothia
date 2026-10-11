// Event mode: when a page is a sports fixture rather than prose (LiveScore,
// BBC Sport, ESPN, Flashscore, league sites), the match itself is the claim.
// This finds one upcoming fixture, two sides plus a kickoff, from the page's
// structured data, its titles and the visible header, and keeps the exact
// strings it used as evidence so the claim stays grounded in the page.
// The parsers are pure so they can be unit-tested; findFixture() wraps the DOM.

export interface FixtureSignal {
  home: string;
  away: string;
  competition?: string;
  /** Kickoff, ISO-8601 (UTC). */
  startISO: string;
  /** The kickoff's calendar date as the viewer sees it, "October 12, 2026". */
  dateLabel: string;
  sourceUrl: string;
  /** Exact strings from the page the signal rests on. */
  evidence: string[];
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_RE =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const TEAM = "[\\p{L}\\p{N}][\\p{L}\\p{N} .'&-]{0,38}?[\\p{L}\\p{N}.]";
// Title forms: "A vs B", "A v B", "A - B"; the away side ends at a site suffix (" | ", ":", " - ")
// or at a page word such as "live", "preview" or "H2H".
const STOP =
  "live|h2h|preview|prediction|predictions|team news|match|score|scores|odds|table|line-?ups?|stats|highlights|tickets";
const TITLE_RE = new RegExp(
  `^(${TEAM})\\s+(?:vs?\\.?|versus|[-–—])\\s+(${TEAM})(?=\\s*(?:$|[|:–—,(]|\\s-\\s|\\s(?:${STOP})\\b))`,
  "iu",
);
const STARTED_RE =
  /\b(FT|HT|AET|Pens?|Full[- ]Time|Half[- ]Time|Postponed|Abandoned|Cancelled|Live now|LIVE)\b|\b\d{1,3}'\s*(?:\+\d+)?\b/;
// A score between the sides ("1 - 0", "2–1", "1:0"); a clock like 20:00 is not a score.
const SCORE_RE = /(?:^|\s)\d{1,2}\s*[-–]\s*\d{1,2}(?=\s|$)|(?:^|\s)\d{1,2}:\d(?!\d)/;

const KNOWN_COMPETITIONS = [
  "Premier League",
  "LaLiga",
  "La Liga",
  "Bundesliga",
  "Serie A",
  "Ligue 1",
  "Champions League",
  "Europa League",
  "Conference League",
  "Eredivisie",
  "Primeira Liga",
  "Scottish Premiership",
  "Championship",
  "FA Cup",
  "Copa del Rey",
  "DFB-Pokal",
  "Coppa Italia",
  "MLS",
  "World Cup",
  "Euro 2028",
  "Nations League",
  "Copa America",
  "NBA",
  "NFL",
  "NHL",
  "MLB",
  "ATP",
  "WTA",
  "Wimbledon",
  "US Open",
  "UFC",
];

export function monthFromName(name: string): number {
  const key = name.toLowerCase().slice(0, 3);
  return MONTHS.findIndex((month) => month.startsWith(key));
}

export function dateLabelFor(date: Date): string {
  const month = MONTHS[date.getMonth()];
  return `${month[0].toUpperCase()}${month.slice(1)} ${date.getDate()}, ${date.getFullYear()}`;
}

function cleanTeam(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, "")
    .trim();
}

/** Two sides from a title such as "Levante vs Sevilla Live Scores | LiveScore". */
export function sidesFromTitle(title: string): { home: string; away: string; evidence: string } | null {
  const text = title.replace(/\s+/g, " ").trim();
  const match = TITLE_RE.exec(text);
  if (!match) return null;
  const home = cleanTeam(match[1]);
  const away = cleanTeam(match[2]);
  if (!home || !away || home.toLowerCase() === away.toLowerCase()) return null;
  if (home.split(" ").length > 5 || away.split(" ").length > 5) return null;
  return { home, away, evidence: text.slice(0, 160) };
}

/**
 * Resolves a kickoff written the way fixture pages write it: "20:00 12 Oct",
 * "Sun 12 Oct 20:00", "12 October 2026, 20:00", "Oct 12, 2026 8:00 PM", or
 * "Today 20:00" / "Tomorrow 20:00". Times are read in the viewer's timezone
 * (sites show local time); a missing year means the next occurrence.
 */
export function resolveKickoff(text: string, nowMs: number): { date: Date; evidence: string } | null {
  const now = new Date(nowMs);
  const source = text.replace(/\s+/g, " ");
  const time = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm|AM|PM)?\b/.exec(source);
  if (!time) return null;
  let hours = Number(time[1]);
  const minutes = Number(time[2]);
  if (time[3]) {
    const pm = time[3].toLowerCase() === "pm";
    if (pm && hours < 12) hours += 12;
    if (!pm && hours === 12) hours = 0;
  }
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  let dateText = "";
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_RE})\\.?(?:\\s+(\\d{4}))?\\b`, "i").exec(
    source,
  );
  const monthFirst = new RegExp(`\\b(${MONTH_RE})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i").exec(
    source,
  );
  const iso = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(source);
  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]) - 1;
    day = Number(iso[3]);
    dateText = iso[0];
  } else if (dayFirst) {
    day = Number(dayFirst[1]);
    month = monthFromName(dayFirst[2]);
    year = dayFirst[3] ? Number(dayFirst[3]) : null;
    dateText = dayFirst[0];
  } else if (monthFirst) {
    month = monthFromName(monthFirst[1]);
    day = Number(monthFirst[2]);
    year = monthFirst[3] ? Number(monthFirst[3]) : null;
    dateText = monthFirst[0];
  } else if (/\btomorrow\b/i.test(source)) {
    const t = new Date(nowMs + 86_400_000);
    day = t.getDate();
    month = t.getMonth();
    year = t.getFullYear();
    dateText = "Tomorrow";
  } else if (/\btoday\b/i.test(source)) {
    day = now.getDate();
    month = now.getMonth();
    year = now.getFullYear();
    dateText = "Today";
  }
  if (day === null || month === null || month < 0) return null;
  let date = new Date(year ?? now.getFullYear(), month, day, hours, minutes, 0, 0);
  // No year given and the date already passed by more than a day: it means next year.
  if (year === null && date.getTime() < nowMs - 86_400_000)
    date = new Date(now.getFullYear() + 1, month, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return { date, evidence: `${dateText} ${time[0]}`.trim() };
}

/** True when the header shows a live minute, a final/half-time marker or a score. */
export function looksStartedOrFinished(headerText: string): boolean {
  const text = headerText.replace(/\s+/g, " ");
  return STARTED_RE.test(text) || SCORE_RE.test(text);
}

export function competitionIn(text: string, url: string): string | undefined {
  const haystack = `${text} ${decodeURIComponent(url).replace(/[-_/]/g, " ")}`;
  for (const name of KNOWN_COMPETITIONS) {
    if (new RegExp(`\\b${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "i").test(haystack)) return name;
  }
  return undefined;
}

interface LdEvent {
  "@type"?: string | string[];
  name?: string;
  startDate?: string;
  eventStatus?: string;
  homeTeam?: { name?: string } | string;
  awayTeam?: { name?: string } | string;
  competitor?: ({ name?: string } | string)[];
  location?: { name?: string } | string;
  superEvent?: { name?: string } | string;
}

const nameOf = (value: { name?: string } | string | undefined): string =>
  (typeof value === "string" ? value : (value?.name ?? "")).trim();

/** A fixture from JSON-LD SportsEvent/Event blocks, when one is scheduled in the future. */
export function fixtureFromJsonLd(blocks: string[], nowMs: number, url: string): FixtureSignal | null {
  const events: LdEvent[] = [];
  const collect = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(collect);
    const item = node as LdEvent & { "@graph"?: unknown };
    const type = Array.isArray(item["@type"]) ? item["@type"].join(" ") : (item["@type"] ?? "");
    if (/SportsEvent|\bEvent\b/.test(type)) events.push(item);
    if (item["@graph"]) collect(item["@graph"]);
  };
  for (const block of blocks) {
    try {
      collect(JSON.parse(block));
    } catch {
      // Not JSON; skip.
    }
  }
  for (const event of events) {
    if (event.eventStatus && !/Scheduled/i.test(event.eventStatus)) continue;
    let home = nameOf(event.homeTeam);
    let away = nameOf(event.awayTeam);
    if ((!home || !away) && event.competitor?.length === 2) {
      home = nameOf(event.competitor[0]);
      away = nameOf(event.competitor[1]);
    }
    if ((!home || !away) && event.name) {
      const sides = sidesFromTitle(event.name);
      if (sides) ({ home, away } = sides);
    }
    if (!home || !away || !event.startDate) continue;
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime()) || start.getTime() <= nowMs) continue;
    const evidence = [event.name ?? `${home} vs ${away}`, `startDate ${event.startDate}`];
    const competition = nameOf(event.superEvent) || competitionIn(`${event.name ?? ""}`, url);
    if (competition) evidence.push(competition);
    return {
      home,
      away,
      competition,
      startISO: start.toISOString(),
      dateLabel: dateLabelFor(start),
      sourceUrl: url,
      evidence,
    };
  }
  return null;
}

export interface PageSignals {
  jsonLd: string[];
  titles: string[];
  /** The visible text around the team names (the fixture header), short. */
  headerText: string;
  url: string;
}

/** The fixture from the strongest signal available; null when there is none or the match is not upcoming. */
export function fixtureFromSignals(signals: PageSignals, nowMs: number): FixtureSignal | null {
  const fromLd = fixtureFromJsonLd(signals.jsonLd, nowMs, signals.url);
  if (fromLd) return fromLd;
  for (const title of signals.titles) {
    const sides = sidesFromTitle(title);
    if (!sides) continue;
    const header = signals.headerText;
    if (looksStartedOrFinished(header)) return null;
    const kickoff = resolveKickoff(header, nowMs);
    if (!kickoff || kickoff.date.getTime() <= nowMs) return null;
    const competition = competitionIn(`${title} ${header}`, signals.url);
    const evidence = [sides.evidence, kickoff.evidence];
    if (competition) evidence.push(competition);
    return {
      home: sides.home,
      away: sides.away,
      competition,
      startISO: kickoff.date.toISOString(),
      dateLabel: dateLabelFor(kickoff.date),
      sourceUrl: signals.url,
      evidence,
    };
  }
  return null;
}

/** Collects the signals from the live document (browser only). */
export function findFixture(doc: Document, nowMs: number): FixtureSignal | null {
  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')].map((node) => node.textContent ?? "");
  const titles = [
    doc.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content ?? "",
    ...[...doc.querySelectorAll("h1")].map((h) => h.textContent ?? ""),
    doc.title,
  ].filter(Boolean);
  // The fixture header: the text window that holds both team names.
  const sides = titles.map(sidesFromTitle).find(Boolean) ?? null;
  const body = (doc.body?.innerText ?? "").replace(/\s+/g, " ");
  let headerText = "";
  if (sides) {
    const lower = body.toLowerCase();
    const at = lower.indexOf(sides.home.toLowerCase());
    const other = lower.indexOf(sides.away.toLowerCase(), at >= 0 ? at : 0);
    if (at >= 0 && other >= 0 && other - at < 400)
      headerText = body.slice(Math.max(0, at - 60), other + sides.away.length + 120);
    else if (at >= 0) headerText = body.slice(Math.max(0, at - 60), at + 260);
  }
  // Explicit <time datetime> near the top of the page beats parsed text.
  const timeNode = doc.querySelector<HTMLTimeElement>("time[datetime]");
  if (timeNode?.dateTime && !/\d{4}-\d{2}-\d{2}/.test(headerText)) headerText = `${timeNode.dateTime} ${headerText}`;
  return fixtureFromSignals({ jsonLd, titles, headerText, url: doc.location.href.split("#")[0] }, nowMs);
}

/** "Levante vs Sevilla · 12 Oct 20:00 · LaLiga", for the tile and the debug footer. */
export function describeFixture(fixture: FixtureSignal): string {
  return [`${fixture.home} vs ${fixture.away}`, fixture.evidence[1] ?? fixture.dateLabel, fixture.competition]
    .filter(Boolean)
    .join(" · ");
}
