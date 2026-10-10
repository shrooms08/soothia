// POST /match: pairs drafted claims with open Panta markets about the same
// event. A keyword prefilter picks candidates; one Haiku call confirms them.
import { callTool, type ToolSpec } from "./anthropic";
import { json, readJsonObject, type Env } from "./http";
import { getCatalog, type CatalogItem } from "./catalog";
import type { OpenMarket } from "./markets";

/** A market the matcher can offer: open for buying (primary) or trading between people (p2p). Never resolved. */
export interface MatchableMarket extends OpenMarket {
  phase: "primary" | "p2p";
  pantaUrl: string;
}

export function matchable(items: CatalogItem[], nowMs: number): MatchableMarket[] {
  return items
    .filter((item) => item.phase !== "resolved" && item.question && (!item.endsAt || Date.parse(item.endsAt) > nowMs))
    .map((item) => ({
      id: item.id,
      title: item.question,
      category: item.category,
      yesPrice: item.yesPct === null ? null : item.yesPct / 100,
      noPrice: item.noPct === null ? null : item.noPct / 100,
      endTime: item.endsAt ?? "",
      phase: item.phase as "primary" | "p2p",
      pantaUrl: item.pantaUrl,
    }));
}

const MAX_CLAIMS_PER_CALL = 10;
const MAX_CANDIDATES_PER_CLAIM = 5;

interface ClaimInput {
  id: string;
  question: string;
  endTime: string;
}

interface Match {
  claimId: string;
  market: MatchableMarket | null;
}

// Words too common in market questions to signal a shared subject.
const STOPWORDS = new Set(
  `will the and for with from that this than then have has had are was were been being its their there
  what when where which who whom into onto over under above below after before between against during
  not yes any all more most less least out off per via about around least than
  win wins beat beats close closes reach reaches hit hits break breaks exceed exceeds price prices end ends
  first last next new day days week month year today tomorrow least
  january february march april may june july august september october november december
  monday tuesday wednesday thursday friday saturday sunday utc bst gmt`.split(/\s+/),
);

const ALIASES: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  utd: "united",
  spurs: "tottenham",
};

function tokens(text: string): Set<string> {
  const out = new Set<string>();
  const cleaned = text.toLowerCase().replace(/(\d),(?=\d{3})/g, "$1");
  for (const raw of cleaned.match(/[\p{L}\p{N}.]+/gu) ?? []) {
    let word = raw.replace(/^\.+|\.+$/g, "");
    // 85k -> 85000, 1.5m -> 1500000, so thresholds written differently still meet.
    const scaled = /^(\d+(?:\.\d+)?)([km])$/.exec(word);
    if (scaled) word = String(Math.round(Number(scaled[1]) * (scaled[2] === "k" ? 1e3 : 1e6)));
    word = ALIASES[word] ?? word;
    if (/^(19|20)\d\d$/.test(word)) continue; // Years match everything.
    if (word.length < 3 && !/^\d+$/.test(word)) continue;
    if (STOPWORDS.has(word)) continue;
    out.add(word);
  }
  return out;
}

function candidatesFor(claim: ClaimInput, markets: { market: MatchableMarket; words: Set<string> }[]): MatchableMarket[] {
  const wanted = tokens(claim.question);
  return markets
    .map(({ market, words }) => ({
      market,
      // A shared number alone (a date, a score) says nothing about the subject.
      shared: [...wanted].filter((word) => words.has(word) && !/^[\d.]+$/.test(word)).length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, MAX_CANDIDATES_PER_CLAIM)
    .map((entry) => entry.market);
}

const MATCH_TOOL: ToolSpec = {
  name: "report_matches",
  description: "Report, for every claim, the id of the market about the same event, or null.",
  input_schema: {
    type: "object",
    properties: {
      matches: {
        type: "array",
        items: {
          type: "object",
          properties: {
            claimId: { type: "string" },
            marketId: { type: ["string", "null"] },
          },
          required: ["claimId", "marketId"],
        },
      },
    },
    required: ["matches"],
  },
};

const MATCH_SYSTEM = `You decide whether a drafted prediction-market question and an existing market are about the same event, so a reader can bet on the existing market instead of creating a duplicate.

A market matches a claim only when all three hold:
- Same subject: the same asset, team, person, or event.
- Same outcome: YES means the same thing in both, including the same threshold or result. "Above $300" and "above $250" are different outcomes. "Team A wins" and "Team A wins by 2 or more goals" are different outcomes.
- Compatible date: both close at about the same time, so the same real-world result settles both.

A shared topic is not enough. When in doubt, answer null; a wrong match sends someone's money to the wrong bet. Choose only from the candidates listed under each claim, and give at most one market per claim.`;

function parseClaims(body: Record<string, unknown>): ClaimInput[] | null {
  if (!Array.isArray(body.claims) || body.claims.length > MAX_CLAIMS_PER_CALL) return null;
  const claims: ClaimInput[] = [];
  for (const item of body.claims) {
    const { id, question, endTime } = (item ?? {}) as Record<string, unknown>;
    if (typeof id !== "string" || typeof question !== "string" || typeof endTime !== "string") return null;
    if (!id || id.length > 64 || !question || question.length > 512 || endTime.length > 40) return null;
    claims.push({ id, question, endTime });
  }
  return claims;
}

export async function handleMatch(request: Request, env: Env): Promise<Response> {
  const body = await readJsonObject(request);
  const claims = body && parseClaims(body);
  if (!claims) return json(request, { error: "bad_request" }, 400);

  const none = (): Match[] => claims.map((claim) => ({ claimId: claim.id, market: null }));
  if (claims.length === 0) return json(request, { matches: [] });

  const origin = new URL(request.url).origin;
  const indexed = matchable(await getCatalog(env, origin), Date.now()).map((market) => ({ market, words: tokens(market.title) }));
  const candidates = new Map(claims.map((claim) => [claim.id, candidatesFor(claim, indexed)]));
  const withCandidates = claims.filter((claim) => candidates.get(claim.id)!.length > 0);
  if (withCandidates.length === 0) return json(request, { matches: none() });

  const user = withCandidates
    .map((claim) => {
      const options = candidates
        .get(claim.id)!
        .map((market) => `  - marketId ${market.id}: "${market.title}" (closes ${market.endTime}${market.phase === "p2p" ? ", trading between people" : ""})`)
        .join("\n");
      return `Claim ${claim.id}: "${claim.question}" (closes ${claim.endTime})\nCandidates:\n${options}`;
    })
    .join("\n\n");

  let output: Record<string, unknown>;
  try {
    output = await callTool(env, { system: MATCH_SYSTEM, user, tool: MATCH_TOOL, maxTokens: 500 });
  } catch {
    // No confirmation means no match: the tile falls back to "Make it a market".
    return json(request, { matches: none() });
  }

  const chosen = new Map<string, string>();
  for (const item of Array.isArray(output.matches) ? output.matches : []) {
    const { claimId, marketId } = (item ?? {}) as Record<string, unknown>;
    if (typeof claimId === "string" && typeof marketId === "string") chosen.set(claimId, marketId);
  }

  const matches: Match[] = claims.map((claim) => ({
    claimId: claim.id,
    // Only a market that was offered for this claim counts.
    market: candidates.get(claim.id)!.find((market) => market.id === chosen.get(claim.id)) ?? null,
  }));
  return json(request, { matches });
}
