// The authoritative result source for a fixture claim.

// Official site per league or competition.
const LEAGUES: [RegExp, url: string][] = [
  [
    /\bpremier league\b|\b(arsenal|liverpool|chelsea|tottenham|spurs|manchester (united|city)|man (utd|city)|newcastle|aston villa|everton|west ham)\b/i,
    "https://www.premierleague.com",
  ],
  [/\b(champions league|europa league|uefa|euro 20\d\d)\b/i, "https://www.uefa.com"],
  [/\b(world cup|fifa)\b/i, "https://www.fifa.com"],
  [/\b(la ?liga|real madrid|barcelona|atl[eé]tico)\b/i, "https://www.laliga.com"],
  [/\b(nba|lakers|celtics|warriors|knicks)\b/i, "https://www.nba.com"],
  [/\b(nfl|super bowl|chiefs|eagles|cowboys|steelers|browns)\b/i, "https://www.nfl.com"],
  [/\b(mlb|world series|yankees|dodgers)\b/i, "https://www.mlb.com"],
  [/\b(nhl|stanley cup)\b/i, "https://www.nhl.com"],
  [/\b(formula ?1|f1|grand prix)\b/i, "https://www.formula1.com"],
  [/\bufc\b/i, "https://www.ufc.com"],
  [/\b(wimbledon|us open|french open|australian open|atp|wta)\b/i, "https://www.atptour.com"],
];

/** The league's official site for a sports question, or ESPN when none is recognised. */
export function sportsSourceFor(question: string): string {
  return LEAGUES.find(([pattern]) => pattern.test(question))?.[1] ?? "https://www.espn.com";
}
