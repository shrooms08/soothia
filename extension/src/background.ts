// Background service worker. Content-script fetches run with the page's
// origin and get blocked by CORS, so network calls to the Worker go through here.
import { WORKER_URL } from "./config";
import {
  DETECT_REQUEST,
  HEALTH_REQUEST,
  type Claim,
  type DetectResult,
  type HealthResponse,
  type MatchedMarket,
  type PageContext,
} from "./messages";

const INSTALL_KEY = "soothia:installId";
const RESULT_PREFIX = "soothia:detect:";
// A URL is detected at most once in this window; repeats get the stored result.
const RESULT_TTL_MS = 10 * 60 * 1000;
// A failed attempt cost nothing, so it only holds off retries briefly.
const ERROR_TTL_MS = 60 * 1000;

interface StoredResult {
  at: number;
  result: DetectResult;
}

async function checkHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { online: false };
    const body = (await res.json()) as { ok?: boolean };
    return { online: body.ok === true };
  } catch {
    return { online: false };
  }
}

// Random id made once per install. It only rate-limits; it identifies no one.
async function installId(): Promise<string> {
  const stored = (await chrome.storage.local.get(INSTALL_KEY))[INSTALL_KEY];
  if (typeof stored === "string" && stored) return stored;
  const created = crypto.randomUUID();
  await chrome.storage.local.set({ [INSTALL_KEY]: created });
  return created;
}

async function post(path: string, body: unknown): Promise<Response> {
  return fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Soothia-Install": await installId() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(40_000),
  });
}

async function detect(page: PageContext): Promise<DetectResult> {
  try {
    const detected = await post("/detect", page);
    if (detected.status === 429) return { status: "error", reason: "limit" };
    if (!detected.ok) return { status: "error", reason: "unavailable" };
    const { claims } = (await detected.json()) as { claims: Claim[] };
    if (claims.length === 0) return { status: "ok", tiles: [] };

    // A failed match is not an error: the claims still show, unmatched.
    const markets = new Map<string, MatchedMarket | null>();
    try {
      const matched = await post("/match", { claims });
      if (matched.ok) {
        const { matches } = (await matched.json()) as {
          matches: { claimId: string; market: MatchedMarket | null }[];
        };
        for (const match of matches) markets.set(match.claimId, match.market);
      }
    } catch {
      // Leave every claim unmatched.
    }
    return { status: "ok", tiles: claims.map((claim) => ({ claim, market: markets.get(claim.id) ?? null })) };
  } catch {
    return { status: "error", reason: "unavailable" };
  }
}

function isLive(stored: StoredResult | undefined, now: number): stored is StoredResult {
  if (!stored) return false;
  return now - stored.at < (stored.result.status === "ok" ? RESULT_TTL_MS : ERROR_TTL_MS);
}

async function pruneResults(now: number): Promise<void> {
  const all = (await chrome.storage.session.get(null)) as Record<string, StoredResult>;
  const dead = Object.keys(all).filter((key) => key.startsWith(RESULT_PREFIX) && !isLive(all[key], now));
  if (dead.length > 0) await chrome.storage.session.remove(dead);
}

// Two tabs on the same URL share one request.
const inFlight = new Map<string, Promise<DetectResult>>();

async function detectOnce(page: PageContext): Promise<DetectResult> {
  const key = RESULT_PREFIX + page.url;
  const now = Date.now();
  const stored = (await chrome.storage.session.get(key))[key] as StoredResult | undefined;
  if (isLive(stored, now)) return stored.result;

  const running = inFlight.get(key);
  if (running) return running;

  const request = detect(page)
    .then(async (result) => {
      await chrome.storage.session.set({ [key]: { at: Date.now(), result } satisfies StoredResult });
      await pruneResults(Date.now());
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message?.type) {
    case HEALTH_REQUEST:
      checkHealth().then(sendResponse);
      return true; // keep the channel open for the async response
    case DETECT_REQUEST:
      detectOnce(message.page as PageContext).then(sendResponse, () =>
        sendResponse({ status: "error", reason: "unavailable" } satisfies DetectResult),
      );
      return true;
  }
});
