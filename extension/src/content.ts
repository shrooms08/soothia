// Isolated-world content script: mounts the orb and card inside one closed
// shadow root. Nothing here touches the page's own DOM or styles.
import { betLink } from "./config";
import { button, copyButton, el, endDate, externalLink, icon, starSvg } from "./dom";
import { pickWallet } from "./wallet-picker";
import { loadFonts } from "./fonts";
import {
  armSounds,
  getAudioState,
  isMuted,
  onAudioState,
  playSound,
  setMuted,
  setStyle,
  SYNTH_STYLES,
  type SfxStyle,
  type SoundName,
} from "./sfx";
import {
  API_REQUEST,
  DETECT_REQUEST,
  IMAGE_REQUEST,
  HEALTH_REQUEST,
  OPEN_WELCOME,
  NAV_CHANGED,
  WALLET_REQUEST,
  WALLET_STATUS,
  type ApiError,
  type ApiPath,
  type BuyTarget,
  type CreatorMarket,
  type Position,
  type ApiRequestMessage,
  type ApiResponse,
  type DetectDebug,
  type DetectRequestMessage,
  type DetectResult,
  type FinishResult,
  type HealthResponse,
  type Tile,
  MarketInfo,
  type WalletInfo,
  type WalletRpcOutcome,
} from "./messages";
import { readPage, type ReadInfo } from "./reader";
import { openBetSheet } from "./bet-sheet";
import { openSheet, type CreateDebug, type PendingCreate, type Sheet } from "./sheet";
import { checkSignedTransaction } from "./tx-check";
import { guarded, installGuards, isContextDead, safe } from "./guard";
import { earningsView, money } from "./earnings";
import { wallet } from "./wallet-client";
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
// Debug toggles. Dry run starts ON: nothing is sent until it is turned off.
const DRY_RUN_KEY = "soothia:dryRun";
const SKIP_CHECKS_KEY = "soothia:skipChecks";
// A sent transaction whose market has not been seen registered yet.
const PENDING_KEY = "soothia:pendingCreate";
const MUTED_KEY = "soothia:muted";
const STYLE_KEY = "soothia:sfxStyle";
// Set once the first-run speech bubble has been dismissed.
const BUBBLE_KEY = "soothia:bubbleShown";
const BUBBLE_DELAY_MS = 1500;

// Detection starts this long after DOMContentLoaded (or a new URL).
const SETTLE_MS = 600;
// When the page has too little text yet (a consent wall, a late-rendering
// article, a tweet still loading), its DOM is watched for up to this long and
// the read is retried as it fills in.
const THIN_WATCH_MS = 8000;
const THIN_DEBOUNCE_MS = 400;
const THIN_RETRIES = 1;
// The thinking ring stays at least this long so it never just flickers.
const MIN_THINKING_MS = 600;

type OrbState = "idle" | "thinking" | "found";

type View =
  | { kind: "watching" }
  | { kind: "thinking" }
  | { kind: "tiles"; tiles: Tile[] }
  | { kind: "empty" }
  | { kind: "skipped" }
  | { kind: "error"; reason: "limit" | "unavailable" | "updated" };

// Everything the debug footer shows about the last scan of this URL.
interface ScanDebug {
  read: ReadInfo | null;
  state: string;
  detect: DetectDebug | null;
}

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

// A button that looks present but does nothing yet. aria-disabled (not
// disabled) keeps the hover tooltip working.
function comingNext(label: string, className: string, tip = "Coming next"): HTMLElement {
  const node = button(label, className);
  node.setAttribute("aria-disabled", "true");
  const wrap = el("span", "tip");
  wrap.dataset.tip = tip;
  wrap.append(node);
  return wrap;
}

/** A market the user created from a claim on this page. */
interface LiveMarket {
  marketId: string;
  marketUrl: string;
  title: string;
}

const STOPWORDS = new Set("will the and for with from that this than then have has had are was were been being its their there what when where which who into over under above below after before between against during not yes any all more most less out off per via about around by on at to of in is it as or an a be".split(" "));

function words(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((word) => word.length > 2 && !STOPWORDS.has(word)) ?? [],
  );
}

/** How many meaningful words two questions share. */
function overlap(a: string, b: string): number {
  const other = words(b);
  return [...words(a)].filter((word) => other.has(word)).length;
}

function tileNode(
  { claim, market }: Tile,
  live: LiveMarket | undefined,
  onMake: () => void,
  onBet: (target: BuyTarget) => void,
): HTMLElement {
  const tile = el("div", "tile");

  const meta = el("div", "meta");
  const ends = endDate(claim.endTime);
  meta.append(el("span", "chip", claim.category), el("span", "ends", ends ? `Ends ${ends}` : ""));

  const actions = el("div", "actions");
  if (live) {
    const target: BuyTarget = { marketId: live.marketId, title: live.title, yesPrice: null, noPrice: null };
    const link = externalLink("Live on Panta", live.marketUrl, "link ext");
    link.prepend(el("span", "live-dot"));
    actions.append(link, button("Bet", "button", () => onBet(target)));
  } else if (market && market.phase === "p2p") {
    // The buying window has closed; shares trade between people on Panta.
    const odds = market.yesPrice === null ? "YES \u2013 on Panta" : `YES ${(market.yesPrice * 100).toFixed(1)}% on Panta`;
    const oddsNode = el("span", "odds p2p", odds);
    oddsNode.title = `${market.title} (trading between people on Panta)`;
    actions.append(oddsNode, externalLink("Trade on Panta", market.pantaUrl ?? `https://www.panta.market/market/${market.id}`, "button ext"));
  } else if (market) {
    const odds = market.yesPrice === null ? "YES \u2013" : `YES ${(market.yesPrice * 100).toFixed(1)}%`;
    const oddsNode = el("span", "odds", odds);
    oddsNode.title = market.title;
    const target: BuyTarget = { marketId: market.id, title: market.title, yesPrice: market.yesPrice, noPrice: market.noPrice };
    actions.append(oddsNode, button("Bet", "button", () => onBet(target)));
  } else {
    actions.classList.add("end");
    actions.append(button("Make it a market", "button primary", onMake));
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
  const orbBody = el("span", "orb-body");
  orbBody.append(el("span", "orb-shimmer"));
  const orbStars = el("span", "orb-stars");
  orb.append(orbBody, starSvg("orb-glint"), el("span", "orb-arc"), orbStars, el("span", "orb-pulse"));

  // Light pages (Wikipedia, BBC) get the orb's edge shadow and star drop shadows.
  function pageIsLight(): boolean {
    for (const node of [document.body, document.documentElement]) {
      const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(getComputedStyle(node).backgroundColor);
      if (!match || (match[4] !== undefined && Number(match[4]) === 0)) continue;
      const [r, g, b] = [Number(match[1]), Number(match[2]), Number(match[3])];
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
    }
    return true; // No background set: the page is white.
  }
  function applyTheme(): void {
    host.dataset.theme = pageIsLight() ? "light" : "dark";
  }

  const card = el("div", "card");
  card.hidden = true;
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Soothia");
  // A few tiny chrome stars in the card's empty corners, behind everything.
  const cardStars = el("div", "card-stars");
  cardStars.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 6; i++) cardStars.append(starSvg("card-star"));
  card.append(cardStars);
  const walletRow = statusRow();
  const proxyRow = statusRow();
  const body = el("div", "body");
  // Two views: the claims on this page, and the wallet's bets.
  const betsPane = el("div", "body");
  betsPane.hidden = true;
  const tabs = el("div", "tabs");
  tabs.setAttribute("role", "tablist");
  const claimsTab = button("This page", "tab selected", () => showTab("claims"));
  const betsTab = button("My bets", "tab", () => showTab("bets"));
  for (const tab of [claimsTab, betsTab]) tab.setAttribute("role", "tab");
  tabs.append(claimsTab, betsTab);
  function showTab(which: "claims" | "bets"): void {
    body.hidden = which !== "claims";
    betsPane.hidden = which !== "bets";
    claimsTab.classList.toggle("selected", which === "claims");
    betsTab.classList.toggle("selected", which === "bets");
    claimsTab.setAttribute("aria-selected", String(which === "claims"));
    betsTab.setAttribute("aria-selected", String(which === "bets"));
    if (which === "bets") void renderBets();
    layout();
  }
  const debug = el("details", "debug");
  const scanInfo = el("dl", "scan");
  const scanAgain = el("button", "button small", "Scan again");
  scanAgain.type = "button";

  function toggle(label: string): { row: HTMLElement; box: HTMLInputElement } {
    const row = el("label", "toggle");
    const box = el("input", "toggle-box");
    box.type = "checkbox";
    row.append(box, el("span", "toggle-label", label));
    return { row, box };
  }
  const dryRunToggle = toggle("Dry run (sign only, never send)");
  const skipChecksToggle = toggle("In dry run, skip balance and simulation checks");
  const createInfo = el("dl", "scan");
  // Replays for demos.
  const replayRow = el("div", "replay");
  replayRow.append(
    button("Show welcome again", "link mono", () => {
      chrome.runtime.sendMessage({ type: OPEN_WELCOME }).catch(() => {});
    }),
    button("Reset first-run bubble", "link mono", () => {
      chrome.storage.local.remove(BUBBLE_KEY).catch(() => {});
    }),
  );

  debug.append(
    el("summary", "debug-summary", "debug"),
    scanInfo,
    scanAgain,
    dryRunToggle.row,
    skipChecksToggle.row,
    createInfo,
    replayRow,
    walletRow.row,
    proxyRow.row,
  );
  const head = el("div", "card-head");
  const brand = el("div", "brand");
  const mark = el("span", "mark");
  mark.append(el("span", "mark-body"), starSvg("star"));
  brand.append(mark, el("h2", "wordmark", "Soothia"));
  const close = button("", "close", () => setOpen(false));
  close.setAttribute("aria-label", "Close");
  close.append(icon("close"));
  // Mute toggle, next to the close button. Default is sound on.
  const muteButton = button("", "close mute", () => void toggleMute());
  function renderMute(): void {
    const label = isMuted() ? "Unmute sounds" : "Mute sounds";
    muteButton.setAttribute("aria-label", label);
    muteButton.title = label;
    muteButton.replaceChildren(icon(isMuted() ? "muted" : "sound"));
  }
  async function toggleMute(): Promise<void> {
    setMuted(!isMuted());
    renderMute();
    chrome.storage.local.set({ [MUTED_KEY]: isMuted() }).catch(() => {});
  }
  const headActions = el("div", "head-actions");
  headActions.append(muteButton, close);
  head.append(brand, headActions);

  function sound(name: SoundName): void {
    playSound(name);
  }
  armSounds(shadow);
  armSounds(window);
  card.append(head, tabs, body, betsPane, debug);

  // Typing in the sheet must not trigger the page's keyboard shortcuts (X
  // has many). Escape still closes the card: that listener runs in capture.
  for (const type of ["keydown", "keypress", "keyup"] as const) {
    card.addEventListener(type, (event) => event.stopPropagation());
  }

  // First-run speech bubble, attached to the orb.
  const bubble = el("div", "bubble");
  bubble.setAttribute("role", "status");
  bubble.hidden = true;
  const bubbleClose = button("", "bubble-close", () => dismissBubble());
  bubbleClose.setAttribute("aria-label", "Dismiss");
  bubbleClose.append(icon("close"));
  bubble.append(el("p", "bubble-text", "I'll glow when I spot something you can bet on. Click me anytime."), bubbleClose);
  let bubbleTimer: ReturnType<typeof setTimeout> | undefined;

  function dismissBubble(): void {
    clearTimeout(bubbleTimer);
    if (bubble.hidden) return;
    bubble.hidden = true;
    chrome.storage.local.set({ [BUBBLE_KEY]: true }).catch(() => {});
  }

  async function maybeShowBubble(): Promise<void> {
    try {
      if ((await chrome.storage.local.get(BUBBLE_KEY))[BUBBLE_KEY] === true) return;
    } catch {
      return;
    }
    bubbleTimer = setTimeout(() => {
      if (!card.hidden) return;
      bubble.hidden = false;
      layout();
    }, BUBBLE_DELAY_MS);
  }

  shadow.append(style, orb, card, bubble);

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

    if (!bubble.hidden) {
      // Left of the orb, level with its middle; above it when there is no room.
      const bubbleWidth = Math.min(240, width - EDGE_PADDING * 2);
      bubble.style.width = `${bubbleWidth}px`;
      const bubbleHeight = bubble.offsetHeight;
      let bubbleLeft = orbLeft - CARD_GAP - bubbleWidth;
      let bubbleTop = orbTop + ORB_SIZE / 2 - bubbleHeight / 2;
      bubble.dataset.side = "left";
      if (bubbleLeft < EDGE_PADDING) {
        bubbleLeft = clamp(orbLeft + ORB_SIZE - bubbleWidth, EDGE_PADDING, width - bubbleWidth - EDGE_PADDING);
        bubbleTop = orbTop - CARD_GAP - bubbleHeight;
        bubble.dataset.side = "above";
        if (bubbleTop < EDGE_PADDING) {
          bubbleTop = orbTop + ORB_SIZE + CARD_GAP;
          bubble.dataset.side = "below";
        }
      }
      bubble.style.left = `${bubbleLeft}px`;
      bubble.style.top = `${clamp(bubbleTop, EDGE_PADDING, height - bubbleHeight - EDGE_PADDING)}px`;
    }

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

  let detectedWallets: WalletInfo[] = [];

  function renderWalletRow(): void {
    walletRow.set(
      detectedWallets.length ? `Wallet: ${detectedWallets.map((info) => info.name).join(", ")} detected` : "Wallet: none found",
      detectedWallets.length ? "good" : "bad",
    );
  }

  window.addEventListener("message", guarded("wallet status", (event: MessageEvent) => {
    // Only accept messages this same window posted to itself, with our type.
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data: unknown = event.data;
    if (typeof data !== "object" || data === null) return;
    const { type, wallets } = data as { type?: unknown; wallets?: unknown };
    if (type !== WALLET_STATUS || !Array.isArray(wallets)) return;
    detectedWallets = wallets as WalletInfo[];
    renderWalletRow();
  }));

  // Picker, then connect. Resolves with the outcome, or null when dismissed.
  async function chooseAndConnect(container: HTMLElement): Promise<WalletRpcOutcome | null> {
    const choice = pickWallet(container, await wallet.list());
    layout();
    const name = await choice;
    layout();
    if (!name) return null;
    return wallet.connect(name);
  }

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

  let foundSoundUrl = "";

  function setOrb(state: OrbState, count = 0): void {
    const was = orb.dataset.state;
    orb.dataset.state = state;
    if (state === "found" && was !== "found" && foundSoundUrl !== watchedUrl) {
      foundSoundUrl = watchedUrl;
      sound("found");
    }
    // One to three chrome stars up-left of the orb, one per claim; they
    // twinkle in once when they first appear.
    if (state !== "found") orbStars.replaceChildren();
    else if (was !== "found" || orbStars.childElementCount !== Math.min(count, 3)) {
      orbStars.replaceChildren(...Array.from({ length: Math.min(Math.max(count, 1), 3) }, () => starSvg("star")));
    }
    orb.setAttribute("aria-label", state === "found" ? `Soothia, ${count} found` : "Soothia");
  }

  // One-shot pulse when a market is created or a bet lands.
  function pulseOrb(): void {
    orb.classList.remove("success");
    void orb.offsetWidth; // restart the animation
    orb.classList.add("success");
    setTimeout(() => orb.classList.remove("success"), 1300);
  }

  function line(text: string): HTMLElement {
    return el("p", "line", text);
  }

  /** The centered empty / skipped / error block from the sheet. */
  function stateBlock(kind: "empty" | "skipped" | "error" | "watching", text: string, ...extra: HTMLElement[]): HTMLElement {
    const block = el("div", `state ${kind}`);
    block.append(el("span", "state-orb"), el("p", "state-text", text), ...extra);
    return block;
  }

  function rescanButton(): HTMLButtonElement {
    return button("Scan again", "button", rescan);
  }

  // ---- Review sheet ----

  let tiles: Tile[] = [];
  let sheet: Sheet | null = null;
  const liveMarkets = new Map<string, LiveMarket>();

  function closeSheet(): void {
    sheet?.dispose();
    sheet = null;
    body.classList.remove("has-sheet");
  }

  function showTiles(): void {
    closeSheet();
    setOrb("found", tiles.length);
    body.replaceChildren(
      ...tiles.map((tile) => tileNode(tile, liveMarkets.get(tile.claim.id), () => review(tile), openBet)),
    );
    layout();
  }

  function openBet(target: BuyTarget): void {
    closeSheet();
    showTab("claims");
    sheet = openBetSheet({
      target,
      api,
      settings: () => ({ dryRun: dryRunToggle.box.checked }),
      debug: setCreateDebug,
      layout,
      isVisible: () => !card.hidden && document.visibilityState === "visible",
      back: showTiles,
      celebrate: pulseOrb,
      sound,
    });
    body.classList.add("has-sheet");
    body.replaceChildren(sheet.node);
    layout();
  }

  // Markets this wallet created from this very page show "Live on Panta" on
  // the tile whose question they came from.
  let creatorMarkets: CreatorMarket[] = [];

  async function loadCreatorMarkets(): Promise<void> {
    const owner = await wallet.publicKey();
    if (!owner) return;
    const response = await api<{ markets: CreatorMarket[] }>("/creator/markets", { wallet: owner });
    if (!response.ok || !response.body) return;
    creatorMarkets = (response.body as { markets: CreatorMarket[] }).markets;
    attachCreatorMarkets();
  }

  function attachCreatorMarkets(): void {
    const here = creatorMarkets.filter((market) => market.registered && market.pageUrl?.split("#")[0] === watchedUrl);
    let changed = false;
    for (const market of here) {
      if ([...liveMarkets.values()].some((live) => live.marketId === market.marketId)) continue;
      // The tile this market was drafted from: the one sharing the most words.
      const best = tiles
        .filter((tile) => !liveMarkets.has(tile.claim.id))
        .map((tile) => ({ tile, score: overlap(tile.claim.question, market.question) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!best || best.score === 0) continue;
      liveMarkets.set(best.tile.claim.id, { marketId: market.marketId, marketUrl: market.marketUrl, title: market.question });
      changed = true;
    }
    if (changed && !sheet && tiles.length > 0) showTiles();
  }

  // ---- My bets ----

  async function renderBets(): Promise<void> {
    const owner = await wallet.publicKey();
    if (!owner) {
      const connect = button("Connect wallet", "button connect", async () => {
        const result = await chooseAndConnect(betsPane);
        if (result?.ok) void renderBets();
      });
      betsPane.replaceChildren(stateBlock("empty", "Connect a wallet to see your bets."), connect);
      layout();
      return;
    }
    betsPane.replaceChildren(stateBlock("watching", "Loading your bets\u2026"));
    layout();
    const response = await api<{ positions: Position[] }>("/positions", { wallet: owner });
    if (!response.ok || !response.body) {
      betsPane.replaceChildren(stateBlock("error", "Couldn't load your bets.", button("Try again", "button", () => void renderBets())));
      layout();
      return;
    }
    const positions = (response.body as { positions: Position[] }).positions;
    if (creatorMarkets.length === 0) await loadCreatorMarkets();
    if (positions.length === 0) {
      betsPane.replaceChildren(refreshRow(), stateBlock("empty", "No bets yet."));
      layout();
      return;
    }
    // One block per market, with a line per side held.
    const byMarket = new Map<string, Position[]>();
    for (const position of positions) byMarket.set(position.marketId, [...(byMarket.get(position.marketId) ?? []), position]);
    betsPane.replaceChildren(
      refreshRow(),
      ...[...byMarket.values()].map((held) => {
        const first = held[0];
        const block = el("div", "tile market");
        block.append(el("p", "question", first.title || shortAddressLike(first.marketId)));
        const rows = el("div", "positions");
        for (const position of held) {
          const row = el("div", "position");
          row.append(
            el("span", `side-chip side-chip-${position.side}`, position.side.toUpperCase()),
            el(
              "span",
              "position-text",
              `${position.shares.toFixed(2)} shares \u00b7 ${position.phase}${position.outcome ? ` \u00b7 ${position.outcome.toUpperCase()} won` : ""}`,
            ),
          );
          rows.append(row);
        }
        block.append(rows);
        if (first.creatorSeedShares) {
          const seed = first.creatorSeedShares.toFixed(first.creatorSeedShares % 1 ? 2 : 0);
          block.append(el("p", "note", `Includes ${seed} YES + ${seed} NO from your creation seed.`));
        }
        if (creatorMarkets.some((market) => market.registered && market.marketId === first.marketId)) {
          block.append(earningsRow(first.marketId, block));
        }
        // One claim control per market: for the side that can be claimed.
        const claimable = held.find((position) => position.claimable && !position.claimed);
        const claimed = held.some((position) => position.claimed);
        const actions = el("div", "actions");
        actions.append(
          externalLink("View on Panta", first.marketUrl, "link ext"),
          copyButton("Copy bet link", betLink(first.marketId), "link", () => sound("open")),
        );
        if (claimed && !claimable) actions.append(el("span", "note", "Claimed"));
        else if (claimable) actions.append(button("Claim", "button primary small", () => void claim(claimable, block)));
        else actions.append(comingNext("Claim", "button small", "Available after the market resolves"));
        block.append(actions);
        return block;
      }),
    );
    layout();
  }

  function refreshRow(): HTMLElement {
    const row = el("div", "refresh-row");
    const link = button("Refresh", "link", () => void renderBets());
    link.prepend(icon("refresh"));
    row.append(link);
    return row;
  }

  // Creator earnings for a market this wallet created: an estimate while the
  // buying window is open, a claim control once it has closed. Numbers come
  // from Panta's market detail; without them, only the share and the date.
  function earningsRow(marketId: string, block: HTMLElement): HTMLElement {
    const row = el("div", "earnings");
    const text = el("p", "note earnings-text", "Checking the pool\u2026");
    row.append(el("p", "earnings-label", "Creator earnings"), text);
    void (async () => {
      const response = await api<MarketInfo>("/market", { id: marketId });
      if (!response.ok || !response.body) {
        text.textContent = "Up to 20% of the pool, claimable after the buying window closes.";
        layout();
        return;
      }
      const info = response.body as MarketInfo;
      const view = earningsView(info.primaryPhaseEnd, info.liquidity, Date.now());
      text.textContent = view.text;
      if (view.phase === "claimable") {
        row.append(button("Claim creator fees", "button primary small", () => void claimCreatorFees(marketId, block)));
      }
      layout();
    })();
    return row;
  }

  // Creator-fee claim: build -> sign -> check -> send -> confirm. Panta does
  // not take these on /trades/, so there is no recording step. Dry run applies.
  async function claimCreatorFees(marketId: string, row: HTMLElement): Promise<void> {
    const owner = await wallet.publicKey();
    if (!owner) return;
    const note = el("p", "line status-line", "Preparing your claim\u2026");
    row.append(note);
    layout();
    const built = await api<{ txBase64: string; claimableFeesUsdc: number }>("/claim/creator-fees/build", { wallet: owner, marketId });
    if (!built.ok || !built.body) {
      const error = (built.body as ApiError | null)?.error ?? "";
      note.textContent =
        error === "market_not_graduated" || error === "no_creator_fees" ? "Nothing to claim yet." : (built.body as ApiError | null)?.message ?? "I couldn't prepare the claim just now.";
      layout();
      return;
    }
    const { txBase64, claimableFeesUsdc } = built.body as { txBase64: string; claimableFeesUsdc: number };
    const amount = money(claimableFeesUsdc);
    note.textContent = `Signing: approve the claim in your wallet (${amount}).`;
    layout();
    const signed = await wallet.signTransaction(txBase64);
    if (!signed.ok || !signed.signedTxBase64 || !signed.signature) {
      note.textContent = !signed.ok && signed.reason === "rejected" ? "Cancelled in your wallet. Nothing was sent." : "Your wallet couldn't sign this.";
      return;
    }
    if (!checkSignedTransaction(txBase64, signed.signedTxBase64).ok) {
      note.textContent = "The transaction your wallet signed is not the one Soothia built. Nothing was sent.";
      return;
    }
    if (dryRunToggle.box.checked) {
      setCreateDebug({ signature: `${signed.signature} (dry run creator-fee claim, not sent)` });
      note.textContent = `Dry run complete: your wallet signed the claim for ${amount}, nothing was sent.`;
      return;
    }
    note.textContent = "Sending your claim\u2026";
    const sent = await api<{ signature: string }>("/claim/send", { signedTxBase64: signed.signedTxBase64, wallet: owner, marketId });
    if (!sent.ok) {
      note.textContent = (sent.body as ApiError | null)?.reason ?? "Solana didn't accept the claim. Nothing was taken.";
      return;
    }
    setCreateDebug({ signature: signed.signature, register: "creator-fee claim sent" });
    note.textContent = "Confirming on Solana\u2026";
    for (let attempt = 0; attempt < 5; attempt++) {
      const status = await api<{ status: string }>("/tx/status", { signature: signed.signature });
      const state = status.ok ? (status.body as { status: string }).status : "pending";
      if (state === "confirmed") {
        note.replaceChildren(
          el("strong", "", `Creator fees claimed: ${amount}.`),
          el("span", "", " Panta does not record creator-fee claims, so nothing to report. "),
          externalLink("Transaction on Solscan", `https://solscan.io/tx/${signed.signature}`, "link mono ext"),
        );
        setCreateDebug({ register: "creator-fee claim confirmed" });
        sound("betPlaced");
        pulseOrb();
        layout();
        return;
      }
      if (state === "failed") {
        note.textContent = "The claim failed on Solana. Nothing was taken.";
        return;
      }
    }
    note.textContent = "Still waiting for Solana. Refresh in a minute; do not claim again.";
  }

  function shortAddressLike(id: string): string {
    return `Market ${id.slice(0, 4)}\u2026${id.slice(-4)}`;
  }

  // Win claim: build -> sign -> check -> send -> confirm. Dry run applies.
  async function claim(position: Position, row: HTMLElement): Promise<void> {
    const owner = await wallet.publicKey();
    if (!owner) return;
    const note = el("p", "line status-line", "Preparing your claim\u2026");
    row.append(note);
    layout();
    const built = await api<{ txBase64: string; bytes: number; winningShares: number }>("/claim/build", {
      wallet: owner,
      marketId: position.marketId,
    });
    if (!built.ok || !built.body) {
      note.textContent = (built.body as ApiError | null)?.message ?? "I couldn't prepare the claim just now.";
      return;
    }
    const { txBase64, winningShares } = built.body as { txBase64: string; winningShares: number };
    note.textContent = `Approve the claim in your wallet (${winningShares.toFixed(2)} winning shares).`;
    layout();
    const signed = await wallet.signTransaction(txBase64);
    if (!signed.ok || !signed.signedTxBase64 || !signed.signature) {
      note.textContent = !signed.ok && signed.reason === "rejected" ? "Cancelled in your wallet. Nothing was sent." : "Your wallet couldn't sign this.";
      return;
    }
    const checked = checkSignedTransaction(txBase64, signed.signedTxBase64);
    if (!checked.ok) {
      note.textContent = "The transaction your wallet signed is not the one Soothia built. Nothing was sent.";
      return;
    }
    if (dryRunToggle.box.checked) {
      setCreateDebug({ signature: `${signed.signature} (dry run claim, not sent)` });
      note.textContent = "Dry run complete: your wallet signed the claim, nothing was sent.";
      return;
    }
    note.textContent = "Sending your claim\u2026";
    const sent = await api<{ signature: string }>("/claim/send", {
      signedTxBase64: signed.signedTxBase64,
      wallet: owner,
      marketId: position.marketId,
    });
    if (!sent.ok) {
      note.textContent = (sent.body as ApiError | null)?.reason ?? "Solana didn't accept the claim. Nothing was taken.";
      return;
    }
    setCreateDebug({ signature: signed.signature, register: "claim sent" });
    note.textContent = "Waiting for Solana to confirm\u2026";
    for (let attempt = 0; attempt < 5; attempt++) {
      const status = await api<{ status: string }>("/tx/status", { signature: signed.signature });
      const state = status.ok ? (status.body as { status: string }).status : "pending";
      if (state === "confirmed") {
        note.textContent = "Claimed. Your winnings are in your wallet.";
        setCreateDebug({ register: "claim confirmed" });
        return;
      }
      if (state === "failed") {
        note.textContent = "The claim failed on Solana. Nothing was taken.";
        return;
      }
    }
    note.textContent = "Still waiting for Solana. Refresh in a minute; do not claim again.";
  }

  // Canned Worker answers for the localhost screenshot harness (design/tools).
  let mockApi: Record<string, unknown> | null = null;

  async function api<T>(path: ApiPath, payload: unknown): Promise<ApiResponse<T | ApiError>> {
    if (mockApi && path in mockApi) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      return { ok: true, status: 200, body: mockApi[path] as T };
    }
    try {
      const message: ApiRequestMessage = { type: API_REQUEST, path, body: payload };
      const response = (await chrome.runtime.sendMessage(message)) as ApiResponse<T | ApiError> | undefined;
      return response ?? { ok: false, status: 0, body: null };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  }

  function review(tile: Tile): void {
    closeSheet();
    sheet = openSheet({
      tile,
      pageUrl: watchedUrl,
      api,
      image: async (category) => {
        try {
          return ((await chrome.runtime.sendMessage({ type: IMAGE_REQUEST, category })) as string | null) ?? null;
        } catch {
          return null;
        }
      },
      settings: () => ({ dryRun: dryRunToggle.box.checked, skipChecks: skipChecksToggle.box.checked }),
      debug: setCreateDebug,
      layout,
      isVisible: () => !card.hidden && document.visibilityState === "visible",
      back: showTiles,
      created: (market) => {
        liveMarkets.set(tile.claim.id, { marketId: market.marketId, marketUrl: market.marketUrl, title: tile.claim.question });
        pulseOrb();
      },
      sound,
      bet: (target) => openBet({ ...target, yesPrice: null, noPrice: null }),
      savePending,
    });
    body.classList.add("has-sheet");
    body.replaceChildren(sheet.node);
    layout();
  }

  function render(view: View): void {
    closeSheet();
    switch (view.kind) {
      case "watching":
        setOrb("idle");
        body.replaceChildren(stateBlock("watching", "I'm watching this page."));
        break;
      case "thinking":
        setOrb("thinking");
        body.replaceChildren(stateBlock("watching", "Reading this page\u2026"));
        break;
      case "tiles":
        tiles = view.tiles;
        showTiles();
        attachCreatorMarkets();
        break;
      case "empty":
        setOrb("idle");
        body.replaceChildren(stateBlock("empty", "Nothing to call here."));
        break;
      case "skipped":
        setOrb("idle");
        body.replaceChildren(stateBlock("skipped", "Not enough to read on this page."));
        break;
      case "error":
        setOrb("idle");
        sound("softError");
        if (view.reason === "limit") {
          body.replaceChildren(stateBlock("error", "That's all my calls for today. I'll be back tomorrow."));
        } else if (view.reason === "updated") {
          body.replaceChildren(stateBlock("error", "Soothia was updated. Reload this tab to keep going."));
        } else {
          body.replaceChildren(stateBlock("error", "I couldn't read this one just now.", rescanButton()));
        }
        break;
    }
    layout();
  }

  // ---- Debug footer ----

  let scan: ScanDebug = { read: null, state: "waiting for the page to settle", detect: null };

  function renderDebug(): void {
    const rows: [string, string][] = [
      ["version", extensionVersion()],
      ["site", scan.read?.site ?? location.hostname.replace(/^www\./, "")],
      ["extracted", scan.read ? `${scan.read.chars} chars` : "\u2013"],
      ["text", scan.read?.preview || "\u2013"],
      ["detect", scan.state],
    ];
    const audio = getAudioState();
    rows.push(["audio", `${audio.muted ? "muted" : audio.context} \u00b7 ${audio.last}`]);
    for (const issue of issues) rows.push(["issue", issue]);
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
    emitScanEvent();
  }

  // Caught problems go here, never to the console or chrome://extensions.
  const issues: string[] = [];
  function logIssue(text: string): void {
    issues.push(`${new Date().toISOString().slice(11, 19)} ${text}`);
    if (issues.length > 3) issues.shift();
    renderDebug();
  }
  installGuards(logIssue);

  function extensionVersion(): string {
    try {
      return chrome.runtime.getManifest().version;
    } catch {
      return "unknown";
    }
  }

  // Harness only: when chrome.storage.local has soothia:devEvents, scan progress is posted to
  // the page so a headless test can time it. Off for everyone else.
  let devEvents = false;
  const scanStarted = Date.now();
  function emitScanEvent(extra: Record<string, unknown> = {}): void {
    if (!devEvents) return;
    try {
      window.postMessage(
        { type: "soothia:v1:scan", state: scan.state, chars: scan.read?.chars ?? 0, site: scan.read?.site ?? "", elapsedMs: Date.now() - scanStarted, issues: [...issues], ...extra },
        "*",
      );
    } catch {
      // Not important.
    }
  }
  onAudioState(() => renderDebug());

  let createDebug: CreateDebug = { wallet: "\u2013", quote: "\u2013", simulate: "\u2013", signature: "\u2013", register: "\u2013" };

  function setCreateDebug(update: Partial<CreateDebug>): void {
    createDebug = { ...createDebug, ...update };
    const rows: [string, string][] = [
      ["wallet", createDebug.wallet],
      ["quote", createDebug.quote],
      ["simulate", createDebug.simulate],
      ["signature", createDebug.signature],
      ["register", createDebug.register],
    ];
    createInfo.replaceChildren(
      ...rows.flatMap(([name, value]) => [el("dt", "scan-name", name), el("dd", "scan-value", value)]),
    );
    if (!card.hidden) layout();
  }

  function savePending(pending: PendingCreate | null): void {
    const done = pending
      ? chrome.storage.local.set({ [PENDING_KEY]: pending })
      : chrome.storage.local.remove(PENDING_KEY);
    done.catch(() => {});
  }

  // If the tab closed after a transaction was sent, finish registering it now.
  async function resumePending(): Promise<void> {
    let pending: PendingCreate | undefined;
    try {
      pending = (await chrome.storage.local.get(PENDING_KEY))[PENDING_KEY] as PendingCreate | undefined;
    } catch {
      return;
    }
    if (!pending?.signature || !pending.quoteId) return;
    setCreateDebug({ signature: pending.signature, register: "resuming an unfinished market\u2026" });
    const response = await api<FinishResult>("/create/register-retry", {
      signature: pending.signature,
      quoteId: pending.quoteId,
    });
    const result = response.ok ? (response.body as FinishResult) : null;
    if (result?.registered) {
      savePending(null);
      setCreateDebug({ register: `registered (resumed): ${result.marketUrl}` });
    } else if (result?.status === "failed") {
      savePending(null);
      setCreateDebug({ register: "transaction failed on-chain (resumed)" });
    } else {
      setCreateDebug({ register: `unfinished: ${result?.registerError ?? result?.status ?? "no answer"}` });
    }
  }

  async function loadSettings(): Promise<void> {
    dryRunToggle.box.checked = true;
    try {
      const stored = await chrome.storage.local.get([DRY_RUN_KEY, SKIP_CHECKS_KEY, MUTED_KEY, STYLE_KEY, "soothia:devEvents"]);
      devEvents = stored["soothia:devEvents"] === true;
      dryRunToggle.box.checked = stored[DRY_RUN_KEY] !== false;
      skipChecksToggle.box.checked = stored[SKIP_CHECKS_KEY] === true;
      // Sound is on unless it was muted; the fresh-install default is on.
      setMuted(stored[MUTED_KEY] === true);
      const saved = stored[STYLE_KEY];
      if (typeof saved === "string" && [...SYNTH_STYLES, "files"].includes(saved)) setStyle(saved as SfxStyle);
    } catch {
      // Storage unavailable: stay in dry run.
    }
    skipChecksToggle.box.disabled = !dryRunToggle.box.checked;
    renderMute();
  }

  dryRunToggle.box.addEventListener("change", () => {
    skipChecksToggle.box.disabled = !dryRunToggle.box.checked;
    chrome.storage.local.set({ [DRY_RUN_KEY]: dryRunToggle.box.checked }).catch(() => {});
    sheet?.refresh();
  });
  skipChecksToggle.box.addEventListener("change", () => {
    chrome.storage.local.set({ [SKIP_CHECKS_KEY]: skipChecksToggle.box.checked }).catch(() => {});
    sheet?.refresh();
  });

  // ---- Detection ----

  let watchedUrl = currentUrl();
  let detectTimer: ReturnType<typeof setTimeout> | undefined;

  let thinObserver: MutationObserver | null = null;
  let thinTimer: ReturnType<typeof setTimeout> | undefined;
  let thinDeadline: ReturnType<typeof setTimeout> | undefined;

  function stopWatchingForText(): void {
    thinObserver?.disconnect();
    thinObserver = null;
    clearTimeout(thinTimer);
    clearTimeout(thinDeadline);
  }

  // Too little text yet: watch the page fill in (consent wall gone, article rendered) for up to
  // THIN_WATCH_MS and read again as soon as it changes; then give up with "Not enough to read".
  function watchForText(url: string, reason: string, refresh: boolean): void {
    stopWatchingForText();
    setScan({ state: `waiting for text (${reason})` });
    render({ kind: "thinking" });
    const finish = (): void => {
      stopWatchingForText();
      void safe("detect", () => runDetect(url, 0, refresh, true));
    };
    // On each burst of DOM changes, peek: enough text (or a page we never read) ends the wait early.
    const peek = (): void => {
      if (url !== watchedUrl) return stopWatchingForText();
      const look = safe("read page", readPage);
      if (!look || look.kind === "thin") {
        if (look) setScan({ state: `waiting for text (${look.reason})` });
        return;
      }
      finish();
    };
    try {
      thinObserver = new MutationObserver(
        guarded("observer", () => {
          clearTimeout(thinTimer);
          thinTimer = setTimeout(peek, THIN_DEBOUNCE_MS);
        }),
      );
      thinObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    } catch {
      thinObserver = null;
    }
    thinDeadline = setTimeout(finish, THIN_WATCH_MS);
  }

  async function runDetect(url: string, retriesLeft: number, refresh: boolean, lastLook = false): Promise<void> {
    // The reader left for another URL while this one was waiting.
    if (url !== watchedUrl) return;
    if (isContextDead()) {
      render({ kind: "error", reason: "updated" });
      return;
    }
    render({ kind: "thinking" });

    const read = safe("read page", readPage);
    if (!read) {
      setScan({ state: "error (could not read the page)", detect: null });
      render({ kind: "error", reason: "unavailable" });
      return;
    }
    if (read.kind === "thin" && !lastLook && retriesLeft > 0) {
      // A quick second look after a moment is usually enough for X; otherwise watch the DOM.
      setScan({ read: read.info });
      watchForText(url, read.reason, refresh);
      return;
    }
    if (read.kind === "thin" && !lastLook) {
      // Still thin on a scan-again: watch once more, briefly.
      watchForText(url, read.reason, refresh);
      return;
    }
    if (read.kind !== "page") {
      setScan({ read: read.info, state: `skipped (${read.reason})`, detect: null });
      render({ kind: "skipped" });
      emitScanEvent({ done: "skipped" });
      return;
    }

    setScan({ read: read.info, state: refresh ? "running (scan again)" : "running", detect: null });
    const started = Date.now();
    let result: DetectResult | undefined;
    let relayError = "";
    try {
      const message: DetectRequestMessage = { type: DETECT_REQUEST, page: read.page, refresh };
      result = (await chrome.runtime.sendMessage(message)) as DetectResult | undefined;
      if (!result) relayError = "background gave no answer";
    } catch (error) {
      relayError = /context invalidated/i.test(String((error as Error)?.message)) ? "extension updated; reload this tab" : "background unreachable; reload this tab";
    }
    const remaining = MIN_THINKING_MS - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (url !== watchedUrl) return;

    if (!result) {
      setScan({ state: `error (${relayError})`, detect: null });
      render({ kind: "error", reason: isContextDead() ? "updated" : "unavailable" });
      emitScanEvent({ done: "error" });
    } else if (result.status === "error") {
      setScan({ state: `error (${result.reason})`, detect: result.debug });
      render({ kind: "error", reason: result.reason });
      emitScanEvent({ done: "error" });
    } else {
      setScan({ state: "done", detect: result.debug });
      if (result.tiles.length === 0) render({ kind: "empty" });
      else render({ kind: "tiles", tiles: result.tiles.slice(0, 3) });
      emitScanEvent({ done: "ok", tiles: result.tiles.slice(0, 3).map((tile) => tile.claim.question), cached: result.debug.fromClientCache });
    }
  }

  // "Scan again": runs now, past the 10-minute rule and the Worker's URL cache.
  function rescan(): void {
    clearTimeout(detectTimer);
    stopWatchingForText();
    void safe("detect", () => runDetect(watchedUrl, THIN_RETRIES, true));
  }
  scanAgain.addEventListener("click", rescan);

  // Debounced: a burst of URL changes ends in one detection for the last URL.
  function scheduleDetect(): void {
    clearTimeout(detectTimer);
    stopWatchingForText();
    const url = watchedUrl;
    detectTimer = setTimeout(() => void safe("detect", () => runDetect(url, THIN_RETRIES, false)), SETTLE_MS);
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
    sound("open");
    dismissBubble();
    renderWalletRow();
    window.postMessage({ type: WALLET_REQUEST }, window.location.origin);
    void refreshProxy();
    sheet?.refresh();
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

  renderWalletRow();
  proxyRow.set("Proxy: checking…", "idle");
  // Dev-only: on localhost, a page may post scenes to screenshot. Nothing
  // here reaches the network: every Worker call is answered from `mockApi`.
  if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    window.addEventListener("message", (event) => {
      if (event.source !== window) return;
      const data = event.data as { type?: string; scene?: string; mocks?: Record<string, unknown>; tiles?: Tile[]; dryRun?: boolean; selector?: string } | null;
      if (data?.type !== "soothia:v1:dev-scene" || !data.scene) return;
      // Harness probes: press something inside the closed shadow root, or read its text.
      if (data.scene === "press" && data.selector) {
        card.querySelector<HTMLElement>(data.selector)?.click();
        return;
      }
      if (data.scene === "rect") {
        const orbRect = orb.getBoundingClientRect();
        window.postMessage({ type: "soothia:v1:dev-rect", card: card.getBoundingClientRect().toJSON(), orb: orbRect ? orbRect.toJSON() : null }, "*");
        return;
      }
      if (data.scene === "dump") {
        const node = data.selector ? card.querySelector<HTMLElement>(data.selector) : null;
        window.postMessage({ type: "soothia:v1:dev-dump", text: card.innerText, node: node ? node.outerHTML.slice(0, 300) : null }, "*");
        return;
      }
      if (data.mocks) mockApi = data.mocks;
      if (typeof data.dryRun === "boolean") dryRunToggle.box.checked = data.dryRun;
      clearTimeout(detectTimer);
      const mockTiles = data.tiles ?? [];
      const show = (): void => {
        tiles = mockTiles;
        if (mockTiles[2]) {
          liveMarkets.set(mockTiles[2].claim.id, {
            marketId: "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL",
            marketUrl: "https://www.panta.market/market/CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL",
            title: mockTiles[2].claim.question,
          });
        }
        showTiles();
      };
      switch (data.scene) {
        case "orb-idle": render({ kind: "watching" }); break;
        case "orb-thinking": render({ kind: "thinking" }); break;
        case "orb-found": show(); break;
        case "orb-success": show(); pulseOrb(); break;
        case "tiles": show(); setOpen(true); break;
        case "empty": render({ kind: "empty" }); setOpen(true); break;
        case "skipped": render({ kind: "skipped" }); setOpen(true); break;
        case "error": render({ kind: "error", reason: "unavailable" }); setOpen(true); break;
        case "review": show(); setOpen(true); review(mockTiles[0]); break;
        case "bet": show(); setOpen(true); openBet({ marketId: "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL", title: mockTiles[1].claim.question, yesPrice: 0.5, noPrice: 0.5 }); break;
        case "success-create": show(); setOpen(true); review(mockTiles[0]); setTimeout(() => sheet?.trigger?.(), 1200); break;
        case "success-bet": show(); setOpen(true); openBet({ marketId: "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL", title: mockTiles[1].claim.question, yesPrice: 0.5, noPrice: 0.5 }); setTimeout(() => sheet?.trigger?.(), 1200); break;
        case "mybets": show(); setOpen(true); showTab("bets"); break;
        case "debug": show(); setOpen(true); debug.open = true; break;
      }
    });
  }

  loadFonts();
  applyTheme();
  // Sites can set their background after load (themes, dark mode toggles).
  setTimeout(applyTheme, 1500);
  renderDebug();
  setCreateDebug({});
  await safe("settings", loadSettings);
  void safe("resume", resumePending);
  void safe("creator markets", loadCreatorMarkets);
  void safe("bubble", maybeShowBubble);
  render({ kind: "watching" });
  document.documentElement.append(host);

  // Read as soon as the DOM is there (plus a short settle), not after every image has loaded.
  if (document.readyState !== "loading") scheduleDetect();
  else document.addEventListener("DOMContentLoaded", guarded("start", scheduleDetect), { once: true });
}

// Top-level pages only: no orb inside iframes. Nothing here may throw out to the page.
if (window.top === window) {
  mount().catch(() => {
    // Could not mount at all (very unusual page); stay silent rather than surface an error.
  });
}
