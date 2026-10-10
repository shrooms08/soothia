// Background service worker. Content-script fetches run with the page's
// origin and get blocked by CORS, so network calls to the Worker go through here.
import { WORKER_URL } from "./config";
import {
  API_REQUEST,
  API_ROUTES,
  DETECT_REQUEST,
  HEALTH_REQUEST,
  IMAGE_REQUEST,
  INJECT_SIGNER,
  MUSIC_CONTROL,
  OPEN_WELCOME,
  type MusicStatus,
  type ApiRequestMessage,
  type ApiResponse,
  type Claim,
  type DetectDebug,
  type DetectRequestMessage,
  type DetectResult,
  type DroppedClaim,
  type HealthResponse,
  type MatchedMarket,
  type PageContext,
} from "./messages";

const INSTALL_KEY = "soothia:installId";
// v2: results now carry a debug block.
const RESULT_PREFIX = "soothia:detect:v2:";
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

async function post(path: string, body: unknown, refresh = false): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Soothia-Install": await installId(),
  };
  if (refresh) headers["X-Soothia-Refresh"] = "1";
  return fetch(`${WORKER_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    // Chrome stops a service worker whose fetch takes over 30 seconds.
    signal: AbortSignal.timeout(28_000),
  });
}

async function detect(page: PageContext, refresh: boolean): Promise<DetectResult> {
  const debug: DetectDebug = {
    httpStatus: null,
    cache: null,
    fromClientCache: false,
    claimsReturned: 0,
    dropped: [],
  };
  try {
    const detected = await post("/detect", page, refresh);
    debug.httpStatus = detected.status;
    const cache = detected.headers.get("X-Soothia-Cache");
    debug.cache = cache === "HIT" || cache === "MISS" ? cache : null;
    if (detected.status === 429) return { status: "error", reason: "limit", debug };
    if (!detected.ok) return { status: "error", reason: "unavailable", debug };
    const body = (await detected.json()) as { claims: Claim[]; dropped?: DroppedClaim[] };
    const claims = body.claims;
    debug.claimsReturned = claims.length;
    debug.dropped = body.dropped ?? [];
    if (claims.length === 0) return { status: "ok", tiles: [], debug };

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
    const tiles = claims.map((claim) => ({ claim, market: markets.get(claim.id) ?? null }));
    return { status: "ok", tiles, debug };
  } catch {
    return { status: "error", reason: "unavailable", debug };
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

async function detectOnce(page: PageContext, refresh: boolean): Promise<DetectResult> {
  const key = RESULT_PREFIX + page.url;
  const now = Date.now();
  if (!refresh) {
    const stored = (await chrome.storage.session.get(key))[key] as StoredResult | undefined;
    if (isLive(stored, now)) {
      return { ...stored.result, debug: { ...stored.result.debug, fromClientCache: true } };
    }
  }

  const running = inFlight.get(key);
  if (running) return running;

  const request = detect(page, refresh)
    .then(async (result) => {
      await chrome.storage.session.set({ [key]: { at: Date.now(), result } satisfies StoredResult });
      await pruneResults(Date.now());
      return result;
    })
    .finally(() => inFlight.delete(key));
  inFlight.set(key, request);
  return request;
}

const FAILED: DetectResult = {
  status: "error",
  reason: "unavailable",
  debug: { httpStatus: null, cache: null, fromClientCache: false, claimsReturned: 0, dropped: [] },
};

// Relays one wallet or create call to the Worker. Bodies (which can hold a
// signed transaction) pass straight through and are never logged or stored.
async function relay(message: ApiRequestMessage): Promise<ApiResponse> {
  if (!Object.hasOwn(API_ROUTES, message.path)) return { ok: false, status: 0, body: null };
  try {
    const response =
      API_ROUTES[message.path] === "GET"
        ? await fetch(`${WORKER_URL}${message.path}?${new URLSearchParams(message.body as Record<string, string>)}`, {
            headers: { "X-Soothia-Install": await installId() },
            signal: AbortSignal.timeout(28_000),
          })
        : await post(message.path, message.body);
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => null) };
  } catch {
    return { ok: false, status: 0, body: null };
  }
}

// Pages with a strict CSP (X, for one) block images from other hosts, so the
// category image is fetched here and handed over as a data: URL.
async function categoryImage(category: unknown): Promise<string | null> {
  if (typeof category !== "string" || !/^[a-z-]{1,30}$/.test(category)) return null;
  try {
    const response = await fetch(`${WORKER_URL}/img/${category}.png`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function injectSigner(tabId: number | undefined): Promise<boolean> {
  if (tabId === undefined) return false;
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["wallet-sign.js"], world: "MAIN" });
    return true;
  } catch {
    return false;
  }
}

const MUTED_KEY = "soothia:muted";
const WELCOME_URL = chrome.runtime.getURL("welcome.html");
// Tabs showing the welcome page; the music stops when the last one goes.
const welcomeTabs = new Set<number>();

async function hasOffscreen(): Promise<boolean> {
  try {
    const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT" as chrome.runtime.ContextType] });
    return contexts.length > 0;
  } catch {
    return false;
  }
}

// One creation at a time: the install path and the page's "ensure" overlap.
let musicStarting: Promise<MusicStatus> | null = null;

/** Creates the offscreen music player and starts the loop. Resolves to its status. */
function startMusic(): Promise<MusicStatus> {
  if (!musicStarting) {
    musicStarting = startMusicNow().finally(() => {
      musicStarting = null;
    });
  }
  return musicStarting;
}

async function startMusicNow(): Promise<MusicStatus> {
  try {
    if (!chrome.offscreen) return { playing: false, muted: false, error: "offscreen API unavailable" };
    if (!(await hasOffscreen())) {
      await chrome.offscreen.createDocument({
        url: "offscreen.html",
        reasons: ["AUDIO_PLAYBACK" as chrome.offscreen.Reason],
        justification: "Plays onboarding music while the welcome page is open",
      });
    }
    const muted = (await chrome.storage.local.get(MUTED_KEY))[MUTED_KEY] === true;
    const status = (await chrome.runtime.sendMessage({ type: MUSIC_CONTROL, action: "start", muted })) as MusicStatus | undefined;
    return status ?? { playing: false, muted, error: "no answer from the player" };
  } catch (error) {
    return { playing: false, muted: false, error: String((error as Error)?.message ?? error) };
  }
}

/** Fades the music out; the offscreen document closes itself afterwards. */
async function stopMusic(): Promise<void> {
  if (!(await hasOffscreen())) return;
  await chrome.runtime.sendMessage({ type: MUSIC_CONTROL, action: "stop" }).catch(() => {});
}

async function openWelcome(): Promise<void> {
  const tab = await chrome.tabs.create({ url: WELCOME_URL });
  if (tab.id !== undefined) welcomeTabs.add(tab.id);
  void startMusic();
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (!welcomeTabs.delete(tabId)) return;
  if (welcomeTabs.size === 0) void stopMusic();
});
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (!change.url) return;
  if (change.url.startsWith(WELCOME_URL)) welcomeTabs.add(tabId);
  else if (welcomeTabs.delete(tabId) && welcomeTabs.size === 0) void stopMusic();
});

// First install only: updates do not reopen the welcome page.
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") openWelcome().catch(() => {});
});

// Nothing in the service worker may surface in chrome://extensions: every
// handler answers with a failure value instead of throwing, and stray
// rejections (a closed tab, a reloaded extension, a lost message port) are
// swallowed here.
self.addEventListener("unhandledrejection", (event) => event.preventDefault());
self.addEventListener("error", (event) => event.preventDefault());

const respondSafely = (work: Promise<unknown>, sendResponse: (value: unknown) => void, fallback: unknown): void => {
  work.then(
    (value) => { try { sendResponse(value); } catch { /* port closed */ } },
    () => { try { sendResponse(fallback); } catch { /* port closed */ } },
  );
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    return handleMessage(message, sender, sendResponse);
  } catch {
    try { sendResponse(undefined); } catch { /* port closed */ }
    return false;
  }
});

function handleMessage(message: { type?: string; category?: string; action?: string } | undefined, sender: chrome.runtime.MessageSender, sendResponse: (value: unknown) => void): boolean | undefined {
  switch (message?.type) {
    case HEALTH_REQUEST:
      respondSafely(checkHealth(), sendResponse, { online: false });
      return true; // keep the channel open for the async response
    case DETECT_REQUEST:
      respondSafely(detectOnce((message as DetectRequestMessage).page, (message as DetectRequestMessage).refresh === true), sendResponse, FAILED);
      return true;
    case API_REQUEST:
      respondSafely(relay(message as ApiRequestMessage), sendResponse, { ok: false, status: 0, body: null });
      return true;
    case IMAGE_REQUEST:
      respondSafely(categoryImage(message.category ?? ""), sendResponse, null);
      return true;
    case INJECT_SIGNER:
      respondSafely(injectSigner(sender.tab?.id), sendResponse, false);
      return true;
    case OPEN_WELCOME:
      respondSafely(openWelcome().then(() => true), sendResponse, false);
      return true;
    case MUSIC_CONTROL:
      // The welcome page asks the background to make sure the player exists.
      if (message.action === "ensure") {
        if (sender.tab?.id !== undefined) welcomeTabs.add(sender.tab.id);
        respondSafely(startMusic(), sendResponse, { playing: false, muted: false, error: "background failed" });
        return true;
      }
      return undefined; // Other actions are answered by the offscreen document itself.
  }
  return undefined;
}
