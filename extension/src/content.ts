// Isolated-world content script: mounts the orb and card inside one closed
// shadow root. Nothing here touches the page's own DOM or styles.
import {
  DETECT_REQUEST,
  HEALTH_REQUEST,
  NAV_CHANGED,
  WALLET_REQUEST,
  WALLET_STATUS,
  type DetectDebug,
  type DetectRequestMessage,
  type DetectResult,
  type HealthResponse,
  type Tile,
} from "./messages";
import { readPage, type ReadInfo } from "./reader";
import {
  CARD_GAP,
  CARD_WIDTH,
  EDGE_PADDING,
  HOST_STYLES,
  ORB_MARGIN,
  ORB_SIZE,
  STYLES,
} from "./styles";

const HOST_ID = "soothia-host";
const POSITION_KEY = "soothia:orbPosition";
const DRAG_THRESHOLD = 4;

// Detection runs this long after the page (or a new URL) settles.
const SETTLE_MS = 2000;
// X and other dynamic pages render after load: look again up to five times
// over about four seconds before deciding there is nothing to read.
const THIN_RETRY_MS = 800;
const THIN_RETRIES = 5;
// The thinking ring stays at least this long so it never just flickers.
const MIN_THINKING_MS = 600;

type OrbState = "idle" | "thinking" | "found";

type View =
  | { kind: "watching" }
  | { kind: "thinking" }
  | { kind: "tiles"; tiles: Tile[] }
  | { kind: "empty" }
  | { kind: "skipped" }
  | { kind: "error"; reason: "limit" | "unavailable" };

// Everything the debug footer shows about the last scan of this URL.
interface ScanDebug {
  read: ReadInfo | null;
  state: string;
  detect: DetectDebug | null;
}

const END_DATE = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function currentUrl(): string {
  return location.href.split("#")[0];
}

// Orb position, stored as the gap to the right and bottom viewport edges so
// the orb stays put relative to its corner when the window resizes.
interface OrbPosition {
  right: number;
  bottom: number;
}

function viewport(): { width: number; height: number } {
  return {
    width: document.documentElement.clientWidth || window.innerWidth,
    height: window.innerHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

async function loadPosition(): Promise<OrbPosition> {
  const fallback = { right: ORB_MARGIN, bottom: ORB_MARGIN };
  try {
    const stored = (await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY] as
      | Partial<OrbPosition>
      | undefined;
    if (typeof stored?.right === "number" && typeof stored?.bottom === "number") {
      return { right: stored.right, bottom: stored.bottom };
    }
  } catch {
    // Storage is unavailable (for example the extension was just reloaded).
  }
  return fallback;
}

function savePosition(position: OrbPosition): void {
  chrome.storage.local.set({ [POSITION_KEY]: position }).catch(() => {});
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

// A button that looks present but does nothing yet. aria-disabled (not
// disabled) keeps the hover tooltip working.
function comingNext(label: string, className: string): HTMLButtonElement {
  const button = el("button", className, label);
  button.type = "button";
  button.title = "Coming next";
  button.setAttribute("aria-disabled", "true");
  return button;
}

function tileNode({ claim, market }: Tile): HTMLElement {
  const tile = el("div", "tile");

  const meta = el("div", "meta");
  const end = new Date(claim.endTime);
  meta.append(
    el("span", "chip", claim.category),
    el("span", "ends", Number.isNaN(end.getTime()) ? "" : `Ends ${END_DATE.format(end)}`),
  );

  const actions = el("div", "actions");
  if (market) {
    const odds = market.yesPrice === null ? "YES \u2013" : `YES ${Math.round(market.yesPrice * 100)}%`;
    const oddsNode = el("span", "odds", odds);
    oddsNode.title = market.title;
    actions.append(oddsNode, comingNext("Bet", "button primary"));
  } else {
    actions.append(comingNext("Make it a market", "button"));
  }

  tile.append(
    el("p", "question", claim.question),
    meta,
    el("p", "quote", `\u201C${claim.sourceQuote}\u201D`),
    actions,
  );
  return tile;
}

function statusRow(): { row: HTMLElement; set: (text: string, state: "good" | "bad" | "idle") => void } {
  const row = el("div", "status");
  const label = el("span", "label");
  row.append(el("span", "dot"), label);
  return {
    row,
    set(text, state) {
      label.textContent = text;
      row.dataset.state = state;
    },
  };
}

async function mount(): Promise<void> {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  for (const [property, value] of Object.entries(HOST_STYLES)) {
    host.style.setProperty(property, value, "important");
  }
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;

  const orb = el("button", "orb");
  orb.type = "button";
  orb.setAttribute("aria-label", "Soothia");
  orb.setAttribute("aria-expanded", "false");
  orb.dataset.state = "idle";
  const badge = el("span", "badge");
  badge.hidden = true;
  orb.append(el("span", "ring"), badge);

  const card = el("div", "card");
  card.hidden = true;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Soothia");
  const phantomRow = statusRow();
  const proxyRow = statusRow();
  const body = el("div", "body");
  const debug = el("details", "debug");
  const scanInfo = el("dl", "scan");
  const scanAgain = el("button", "button small", "Scan again");
  scanAgain.type = "button";
  debug.append(el("summary", "debug-summary", "debug"), scanInfo, scanAgain, phantomRow.row, proxyRow.row);
  card.append(el("h2", "title", "Soothia"), body, debug);

  shadow.append(style, orb, card);

  // ---- Layout ----

  let position = await loadPosition();

  function layout(): void {
    const { width, height } = viewport();
    position = {
      right: clamp(position.right, 0, width - ORB_SIZE),
      bottom: clamp(position.bottom, 0, height - ORB_SIZE),
    };
    const orbLeft = width - position.right - ORB_SIZE;
    const orbTop = height - position.bottom - ORB_SIZE;
    orb.style.left = `${orbLeft}px`;
    orb.style.top = `${orbTop}px`;

    if (card.hidden) return;
    const cardWidth = Math.min(CARD_WIDTH, width - EDGE_PADDING * 2);
    const cardHeight = card.offsetHeight;

    // Sit to the left of the orb; flip to the right when there is no room.
    let left = orbLeft - CARD_GAP - cardWidth;
    if (left < EDGE_PADDING) left = orbLeft + ORB_SIZE + CARD_GAP;
    left = clamp(left, EDGE_PADDING, width - cardWidth - EDGE_PADDING);

    // Grow upward from the orb's bottom edge; flip downward near the top.
    let top = orbTop + ORB_SIZE - cardHeight;
    if (top < EDGE_PADDING) top = orbTop;
    top = clamp(top, EDGE_PADDING, height - cardHeight - EDGE_PADDING);

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  // ---- Status rows ----

  let phantomDetected = false;

  function renderPhantom(): void {
    phantomRow.set(
      phantomDetected ? "Phantom: detected" : "Phantom: not found",
      phantomDetected ? "good" : "bad",
    );
  }

  window.addEventListener("message", (event) => {
    // Only accept messages this same window posted to itself, with our type.
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data: unknown = event.data;
    if (typeof data !== "object" || data === null) return;
    const { type, phantom } = data as { type?: unknown; phantom?: unknown };
    if (type !== WALLET_STATUS || typeof phantom !== "boolean") return;
    phantomDetected = phantom;
    renderPhantom();
  });

  async function refreshProxy(): Promise<void> {
    proxyRow.set("Proxy: checking…", "idle");
    let online = false;
    try {
      const response = (await chrome.runtime.sendMessage({ type: HEALTH_REQUEST })) as
        | HealthResponse
        | undefined;
      online = response?.online === true;
    } catch {
      online = false;
    }
    proxyRow.set(online ? "Proxy: online" : "Proxy: offline", online ? "good" : "bad");
  }

  // ---- Claims ----

  function setOrb(state: OrbState, count = 0): void {
    orb.dataset.state = state;
    badge.hidden = state !== "found";
    badge.textContent = String(count);
    orb.setAttribute("aria-label", state === "found" ? `Soothia, ${count} found` : "Soothia");
  }

  function line(text: string): HTMLElement {
    return el("p", "line", text);
  }

  function rescanButton(): HTMLButtonElement {
    const button = el("button", "button", "Scan again");
    button.type = "button";
    button.addEventListener("click", rescan);
    return button;
  }

  function render(view: View): void {
    switch (view.kind) {
      case "watching":
        setOrb("idle");
        body.replaceChildren(line("I'm watching this page."));
        break;
      case "thinking":
        setOrb("thinking");
        body.replaceChildren(line("Reading this page\u2026"));
        break;
      case "tiles":
        setOrb("found", view.tiles.length);
        body.replaceChildren(...view.tiles.map(tileNode));
        break;
      case "empty":
        setOrb("idle");
        body.replaceChildren(line("Nothing to call here."));
        break;
      case "skipped":
        setOrb("idle");
        body.replaceChildren(line("Not enough to read on this page."));
        break;
      case "error":
        setOrb("idle");
        if (view.reason === "limit") {
          body.replaceChildren(line("That's all my calls for today. I'll be back tomorrow."));
        } else {
          body.replaceChildren(line("I couldn't read this one just now."), rescanButton());
        }
        break;
    }
    layout();
  }

  // ---- Debug footer ----

  let scan: ScanDebug = { read: null, state: "waiting for the page to settle", detect: null };

  function renderDebug(): void {
    const rows: [string, string][] = [
      ["site", scan.read?.site ?? location.hostname.replace(/^www\./, "")],
      ["extracted", scan.read ? `${scan.read.chars} chars` : "\u2013"],
      ["text", scan.read?.preview || "\u2013"],
      ["detect", scan.state],
    ];
    const detect = scan.detect;
    if (detect) {
      const worker = detect.cache ?? "\u2013";
      rows.push(
        ["http", detect.httpStatus === null ? "no response" : String(detect.httpStatus)],
        ["cache", detect.fromClientCache ? `client 10-min rule (worker said ${worker})` : worker],
        ["claims", `${detect.claimsReturned} returned, ${detect.dropped.length} dropped`],
      );
      for (const dropped of detect.dropped) {
        rows.push(["dropped", `${dropped.reason}: ${dropped.question || "(no question)"}`]);
      }
    }
    scanInfo.replaceChildren(
      ...rows.flatMap(([name, value]) => [el("dt", "scan-name", name), el("dd", "scan-value", value)]),
    );
    if (!card.hidden) layout();
  }

  function setScan(update: Partial<ScanDebug>): void {
    scan = { ...scan, ...update };
    renderDebug();
  }

  // ---- Detection ----

  let watchedUrl = currentUrl();
  let detectTimer: ReturnType<typeof setTimeout> | undefined;

  async function runDetect(url: string, retriesLeft: number, refresh: boolean): Promise<void> {
    // The reader left for another URL while this one was waiting.
    if (url !== watchedUrl) return;

    const read = readPage();
    if (read.kind === "thin" && retriesLeft > 0) {
      const attempt = THIN_RETRIES - retriesLeft + 1;
      setScan({ read: read.info, state: `waiting for text, try ${attempt} of ${THIN_RETRIES} (${read.reason})` });
      detectTimer = setTimeout(() => void runDetect(url, retriesLeft - 1, refresh), THIN_RETRY_MS);
      return;
    }
    if (read.kind !== "page") {
      setScan({ read: read.info, state: `skipped (${read.reason})`, detect: null });
      render({ kind: "skipped" });
      return;
    }

    setScan({ read: read.info, state: refresh ? "running (scan again)" : "running", detect: null });
    render({ kind: "thinking" });
    const started = Date.now();
    let result: DetectResult | undefined;
    let relayError = "";
    try {
      const message: DetectRequestMessage = { type: DETECT_REQUEST, page: read.page, refresh };
      result = (await chrome.runtime.sendMessage(message)) as DetectResult | undefined;
      if (!result) relayError = "background gave no answer";
    } catch {
      relayError = "background unreachable; reload this tab";
    }
    const remaining = MIN_THINKING_MS - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (url !== watchedUrl) return;

    if (!result) {
      setScan({ state: `error (${relayError})`, detect: null });
      render({ kind: "error", reason: "unavailable" });
    } else if (result.status === "error") {
      setScan({ state: `error (${result.reason})`, detect: result.debug });
      render({ kind: "error", reason: result.reason });
    } else {
      setScan({ state: "done", detect: result.debug });
      if (result.tiles.length === 0) render({ kind: "empty" });
      else render({ kind: "tiles", tiles: result.tiles.slice(0, 3) });
    }
  }

  // "Scan again": runs now, past the 10-minute rule and the Worker's URL cache.
  function rescan(): void {
    clearTimeout(detectTimer);
    void runDetect(watchedUrl, THIN_RETRIES, true);
  }
  scanAgain.addEventListener("click", rescan);

  // Debounced: a burst of URL changes ends in one detection for the last URL.
  function scheduleDetect(): void {
    clearTimeout(detectTimer);
    const url = watchedUrl;
    detectTimer = setTimeout(() => void runDetect(url, THIN_RETRIES, false), SETTLE_MS);
  }

  function onUrlMaybeChanged(): void {
    const url = currentUrl();
    if (url === watchedUrl) return;
    watchedUrl = url;
    setScan({ read: null, state: "waiting for the page to settle", detect: null });
    render({ kind: "watching" });
    scheduleDetect();
  }

  window.addEventListener("popstate", onUrlMaybeChanged);
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    if ((event.data as { type?: unknown } | null)?.type === NAV_CHANGED) onUrlMaybeChanged();
  });

  // The debug rows change the card's height when they open or close.
  debug.addEventListener("toggle", layout);

  // ---- Card open / close ----

  function setOpen(open: boolean): void {
    card.hidden = !open;
    orb.setAttribute("aria-expanded", String(open));
    if (!open) return;
    renderPhantom();
    window.postMessage({ type: WALLET_REQUEST }, window.location.origin);
    void refreshProxy();
    layout();
  }

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && !card.hidden) setOpen(false);
    },
    true,
  );

  // Events from inside a closed shadow root are retargeted to the host, so
  // any other target means the press landed outside Soothia.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!card.hidden && event.target !== host) setOpen(false);
    },
    true,
  );

  // ---- Drag ----

  let drag: { pointerId: number; startX: number; startY: number; origin: OrbPosition; moved: boolean } | null =
    null;
  let suppressClick = false;

  orb.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: position,
      moved: false,
    };
    orb.setPointerCapture(event.pointerId);
  });

  orb.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    orb.classList.add("dragging");
    position = { right: drag.origin.right - dx, bottom: drag.origin.bottom - dy };
    layout();
  });

  function endDrag(event: PointerEvent): void {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved) {
      // The click that follows this release belongs to the drag, not a tap.
      suppressClick = true;
      setTimeout(() => (suppressClick = false), 0);
      savePosition(position);
    }
    orb.classList.remove("dragging");
    drag = null;
  }

  orb.addEventListener("pointerup", endDrag);
  orb.addEventListener("pointercancel", endDrag);

  orb.addEventListener("click", () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    setOpen(card.hidden);
  });

  window.addEventListener("resize", layout);

  renderPhantom();
  proxyRow.set("Proxy: checking…", "idle");
  renderDebug();
  render({ kind: "watching" });
  document.documentElement.append(host);

  if (document.readyState === "complete") scheduleDetect();
  else window.addEventListener("load", scheduleDetect, { once: true });
}

// Top-level pages only: no orb inside iframes.
if (window.top === window) void mount();
