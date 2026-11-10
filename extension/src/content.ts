// Isolated-world content script: mounts the orb and card inside one closed
// shadow root. Nothing here touches the page's own DOM or styles.
import { button, el, endDate, icon, starSvg } from "./dom";
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
  AGENT_REQUEST,
  PREMIUM_CALL,
  type AgentAction,
  API_REQUEST,
  DETECT_REQUEST,
  HEALTH_REQUEST,
  OPEN_WELCOME,
  NAV_CHANGED,
  RECALL_ID_KEY,
  FEED_CHECK_KEY,
  RECORD_SECTION_KEY,
  SOCIAL_SEEN_KEY,
  SUI_WALLET_KEY,
  type ApiError,
  type ApiPath,
  type ApiRequestMessage,
  type ApiResponse,
  type DetectDebug,
  type DetectRequestMessage,
  type DetectResult,
  type HealthResponse,
  type Tile,
  type PageContext,
  type FixtureSignal,
  type RecallInsight,
  type RecallCalled,
  type RecallInsights,
  type RecallRecord,
} from "./messages";
import { readPage, type ReadInfo } from "./reader";
import {
  badgeText,
  cachedFeedCount,
  FEED_CHECK_MS,
  pageFollowedCount,
  tailSheetFor,
  type FeedCheck,
  type OpenFollowedCall,
  type TailSource,
} from "./social-logic";
import type { TailPrefill } from "./social-logic";
import { createSocialView, followedRow } from "./social-view";
import { calledRow, createRecordView } from "./record-view";
import {
  isQuietableSite,
  calledFromPick,
  isRecallId,
  mergeQuietSites,
  sortByRelevance,
  visibleNotes,
  type QuietPending,
} from "./recall-logic";
import { openBackSheet } from "./back-sheet";
import { openCallSheet, type Sheet } from "./call-sheet";
import { describeFixture, findFixture } from "./fixture";
import { guarded, installGuards, isContextDead, safe } from "./guard";
import { createStakeRow, type StakeRow } from "./stake-row";
import { stakeTileIds } from "./stake-logic";
import { createWalletAccess } from "./wallet-access";
import type { AgentRun } from "./agent";
import { runUnlock, type AgentSettings, type PremiumCallResponse, type UnlockResult } from "./premium-logic";
import type { WalletSummary } from "./wallet-protocol";
import { checkInBackground, createWalletBridge } from "./wallet-client";
import { chromeWalletStorage, createWalletSettings } from "./wallet-settings";
import { CARD_GAP, CARD_WIDTH, EDGE_PADDING, HOST_STYLES, ORB_MARGIN, ORB_SIZE, STYLES } from "./styles";

const HOST_ID = "soothia-host";
const POSITION_KEY = "soothia:orbPosition";
const DRAG_THRESHOLD = 4;
// Diagnostics (scan rows, create steps, caught issues) are hidden unless this is on.
const SHOW_DEBUG_KEY = "soothia:showDebug";
const MUTED_KEY = "soothia:muted";
const STYLE_KEY = "soothia:sfxStyle";
const QUIET_SITES_KEY = "soothia.quietSites";
const QUIET_PENDING_KEY = "soothia.quietPending";
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
  | { kind: "quiet" }
  | { kind: "error"; reason: "limit" | "unavailable" | "updated" };

// Everything the debug footer shows about the last scan of this URL.
interface ScanDebug {
  read: ReadInfo | null;
  state: string;
  detect: DetectDebug | null;
  /** Which path ran: prose, fixture (match info), or none. */
  path?: "prose" | "fixture" | "none";
  /** The fixture evidence line, when event mode found a match. */
  fixture?: string;
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
    const stored = (await chrome.storage.local.get(POSITION_KEY))[POSITION_KEY] as Partial<OrbPosition> | undefined;
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

function tileNode(
  { claim }: Tile,
  insight: RecallInsight | undefined,
  onCall: () => void,
  proofHost: Parameters<typeof calledRow>[1],
  stakeRow?: HTMLElement,
  followed?: HTMLElement,
): HTMLElement {
  const tile = el("div", "tile");

  const meta = el("div", "meta");
  const ends = endDate(claim.endTime);
  meta.append(el("span", "chip", claim.category), el("span", "ends", ends ? `Ends ${ends}` : ""));

  const source = claim.fromFixture
    ? (() => {
        const line = el("p", "quote from-match");
        line.append(el("span", "from-match-label", "From match info"), ` \u00b7 ${claim.sourceQuote}`);
        return line;
      })()
    : el("p", "quote", `\u201C${claim.sourceQuote}\u201D`);
  tile.append(el("p", "question", claim.question), meta, source);

  if (insight?.called) {
    tile.append(calledRow(insight.called, proofHost));
    if (stakeRow) tile.append(stakeRow);
  } else {
    const recall = el("div", "tile-recall");
    recall.append(button("Call it", "button primary call-it", onCall));
    tile.append(recall);
  }
  if (followed) tile.append(followed);
  const notes = visibleNotes(insight);
  if (notes.length > 0) {
    const list = el("div", "tile-notes");
    list.append(...notes.map((note) => el("p", "tile-note", note)));
    tile.append(list);
  }
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
  const orbBadge = el("span", "orb-badge");
  orbBadge.hidden = true;
  orb.append(orbBody, starSvg("orb-glint"), el("span", "orb-arc"), orbStars, el("span", "orb-pulse"), orbBadge);

  // Light pages (Wikipedia, BBC) get the orb's edge shadow and star drop shadows.
  function pageIsLight(): boolean {
    for (const node of [document.body, document.documentElement]) {
      const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?/.exec(
        getComputedStyle(node).backgroundColor,
      );
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
  const proxyRow = statusRow();
  const body = el("div", "body");
  // Two views: the claims on this page, and the user's record.
  const recordPane = el("div", "body");
  recordPane.hidden = true;
  const socialPane = el("div", "body");
  socialPane.hidden = true;
  const socialView = createSocialView(socialPane, {
    api,
    layout,
    state: stateBlock,
    onTail: (handle, source) => openSocialTail(handle, source),
    unlock: unlockCall,
    runAgent,
  });
  const recordView = createRecordView(recordPane, {
    api,
    layout,
    get wallet() {
      return walletAccess;
    },
    agent: agentRequest,
    linkRecord: () => recallFieldNode(),
    loadSection: async () => (await chrome.storage.local.get(RECORD_SECTION_KEY))[RECORD_SECTION_KEY],
    saveSection: (section) => {
      chrome.storage.local.set({ [RECORD_SECTION_KEY]: section }).catch(() => {});
    },
    state: stateBlock,
    quietSites: () => quietSites,
    unquiet: async (site) => {
      const done = await setSiteQuiet(site, false);
      if (done && site === hereSite()) resumeAfterQuiet();
      return done;
    },
  });
  const tabs = el("div", "tabs");
  tabs.setAttribute("role", "tablist");
  const claimsTab = button("This page", "tab selected", () => showTab("claims"));
  const recordTab = button("My record", "tab", () => showTab("record"));
  const socialTab = button("Social", "tab", () => showTab("social"));
  for (const tab of [claimsTab, recordTab, socialTab]) tab.setAttribute("role", "tab");
  tabs.append(claimsTab, recordTab, socialTab);
  function showTab(which: "claims" | "record" | "social"): void {
    closeSocialSheet();
    body.hidden = which !== "claims";
    recordPane.hidden = which !== "record";
    socialPane.hidden = which !== "social";
    for (const [name, tab] of [
      ["claims", claimsTab],
      ["record", recordTab],
      ["social", socialTab],
    ] as const) {
      tab.classList.toggle("selected", which === name);
      tab.setAttribute("aria-selected", String(which === name));
    }
    if (which === "record") void safe("record", recordView.render);
    if (which === "social") {
      markSocialSeen();
      void safe("social", socialView.render);
    }
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

  const showDebugToggle = toggle("Show debug info");

  // Link record: view and add to a record made elsewhere, such as with the CLI.
  // The same field appears in settings and in My record's Me section.
  let linkedRecallId = "";
  const linkedInputs = new Set<HTMLInputElement>();
  function recallFieldNode(): HTMLElement {
    const input = el("input", "input recall-input");
    input.type = "text";
    input.placeholder = "Recall ID";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.value = linkedRecallId;
    linkedInputs.add(input);
    const note = el("p", "note");
    async function save(value: string): Promise<void> {
      if (value && !isRecallId(value)) {
        note.textContent = "That isn't a valid Recall ID.";
        layout();
        return;
      }
      try {
        if (value) await chrome.storage.local.set({ [RECALL_ID_KEY]: value });
        else await chrome.storage.local.remove(RECALL_ID_KEY);
      } catch {
        note.textContent = "Couldn't save that. Reload this tab and try again.";
        layout();
        return;
      }
      setLinkedRecallId(value);
      note.textContent = value ? "Record linked." : "Record unlinked.";
      onRecallIdentityChanged();
      layout();
    }
    const row = el("div", "recall-row");
    row.append(
      input,
      button("Save", "button small", () => void save(input.value.trim())),
      button("Clear", "button small", () => void save("")),
    );
    const field = el("div", "field recall-field");
    field.append(el("span", "field-label", "Link record"), row, note);
    return field;
  }
  function setLinkedRecallId(value: string): void {
    linkedRecallId = value;
    for (const input of linkedInputs) {
      if (input.isConnected) input.value = value;
      else linkedInputs.delete(input);
    }
  }
  const recallField = recallFieldNode();

  const walletBridge = createWalletBridge(() => chrome.runtime.getURL("wallet-bridge.js"));
  const walletAccess = createWalletAccess(walletBridge, chromeWalletStorage, checkInBackground);
  const walletSettings = createWalletSettings(walletBridge, chromeWalletStorage, () => {
    if (!card.hidden) layout();
  });

  const summary = el("summary", "debug-summary", "settings");
  summary.append(el("span", "debug-version", extensionVersion()));
  debug.append(
    summary,
    scanInfo,
    scanAgain,
    showDebugToggle.row,
    recallField,
    walletSettings.root,
    replayRow,
    proxyRow.row,
  );
  function applyDebugVisibility(): void {
    const show = showDebugToggle.box.checked;
    scanInfo.hidden = !show;
    walletSettings.setDebugVisible(show);
    if (!card.hidden) layout();
  }
  applyDebugVisibility();
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
  const quietButton = button("", "close quiet", () => void quietHere());
  quietButton.setAttribute("aria-label", "Quiet here");
  quietButton.title = "Quiet here";
  quietButton.append(icon("quiet"));
  headActions.append(quietButton, muteButton, close);
  head.append(brand, headActions);

  function sound(name: SoundName): void {
    playSound(name);
  }
  armSounds(shadow);
  armSounds(window);
  card.append(head, tabs, body, recordPane, socialPane, debug);

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
  bubble.append(el("p", "bubble-text", "I'll glow when I spot something you can call. Click me anytime."), bubbleClose);
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

  async function refreshProxy(): Promise<void> {
    proxyRow.set("Proxy: checking…", "idle");
    let online = false;
    try {
      const response = (await chrome.runtime.sendMessage({ type: HEALTH_REQUEST })) as HealthResponse | undefined;
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

  // One-shot pulse when a call is locked.
  function pulseOrb(): void {
    orb.classList.remove("success");
    void orb.offsetWidth; // restart the animation
    orb.classList.add("success");
    setTimeout(() => orb.classList.remove("success"), 1300);
  }

  /** The centered empty / skipped / error block from the sheet. */
  function stateBlock(
    kind: "empty" | "skipped" | "error" | "watching",
    text: string,
    ...extra: HTMLElement[]
  ): HTMLElement {
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
  let stakeRows: StakeRow[] = [];

  function closeSheet(): void {
    sheet?.dispose();
    sheet = null;
    body.classList.remove("has-sheet");
  }

  function showTiles(): void {
    closeSheet();
    setOrb("found", tiles.length);
    const staking = stakeTileIds(tiles, (claimId) => insightsByClaim.get(claimId)?.called, Date.now());
    stakeRows = [];
    let followedShown = false;
    body.replaceChildren(
      ...tiles.map((tile) => {
        const insight = insightsByClaim.get(tile.claim.id);
        let row: HTMLElement | undefined;
        if (insight?.called && staking.has(tile.claim.id)) {
          const stakeRow = createStakeRow(
            { api, wallet: walletAccess, layout, onBack: (called) => openBack(called) },
            insight.called,
          );
          stakeRows.push(stakeRow);
          row = stakeRow.node;
        }
        let followed: HTMLElement | undefined;
        // Both questions on a match share one crowd, so the line appears once.
        if (!followedShown && insight?.followedCalls?.length) {
          followedShown = true;
          followed = followedRow(
            insight.followedCalls,
            insight.consensus ?? null,
            insight.called ? null : (call: OpenFollowedCall) => openPageTail(call),
            layout,
            unlockCall,
          );
        }
        return tileNode(tile, insight, () => openCall(tile), { api, layout }, row, followed);
      }),
    );
    if (!card.hidden) refreshStakeRows();
    layout();
  }

  function refreshStakeRows(): void {
    for (const row of stakeRows) void safe("stake row", row.refresh);
  }

  function openBack(called: RecallCalled): void {
    closeSheet();
    showTab("claims");
    sheet = openBackSheet({ called, api, wallet: walletAccess, layout, back: showTiles, celebrate: pulseOrb, sound });
    body.classList.add("has-sheet");
    body.replaceChildren(sheet.node);
    layout();
  }

  /** Pays for a premium call from the connected wallet, connecting one if needed. */
  async function unlockCall(
    pickId: string,
    priceMist: string,
    choose: (wallets: WalletSummary[]) => Promise<WalletSummary | null>,
  ): Promise<UnlockResult> {
    const wallet = (await walletAccess.current()) ?? (await walletAccess.connect(choose));
    if (!wallet) return { ok: false, code: "wallet", walletMessage: "No wallet was connected.", maybePaid: false };
    return runUnlock({
      expectedPriceMist: priceMist,
      fetchCall: (payment) =>
        chrome.runtime.sendMessage({ type: PREMIUM_CALL, pickId, payment }) as Promise<PremiumCallResponse>,
      build: async () => {
        const built = await api<{ transaction: string }>("/premium/build", { pickId, sender: wallet.address });
        if (!built.ok || !built.body) throw new Error((built.body as ApiError | null)?.error ?? "unavailable");
        return (built.body as { transaction: string }).transaction;
      },
      sign: (txBytes, expected) => walletAccess.signOnly(wallet, txBytes, expected),
    });
  }

  function agentRequest<T>(action: AgentAction, settings?: AgentSettings): Promise<T | null> {
    return (chrome.runtime.sendMessage({ type: AGENT_REQUEST, action, settings }) as Promise<T | null>).catch(
      () => null,
    );
  }

  async function runAgent(): Promise<number> {
    return (await agentRequest<AgentRun>("run"))?.unlocked.length ?? 0;
  }

  function openPageTail(call: OpenFollowedCall): void {
    const { tile, prefill } = tailSheetFor(call.handle, call);
    openCall(tile, { prefill, offerBack: (called) => openBack(called) });
  }

  // A tail from Social opens over Social, so backing out returns to the feed.
  let socialSheet: Sheet | null = null;

  function closeSocialSheet(): void {
    socialSheet?.dispose();
    socialSheet = null;
    socialPane.classList.remove("has-sheet");
  }

  function showInSocial(next: Sheet): void {
    closeSocialSheet();
    socialSheet = next;
    socialPane.classList.add("has-sheet");
    socialPane.replaceChildren(next.node);
    layout();
  }

  function backToSocial(): void {
    closeSocialSheet();
    void safe("social", socialView.render);
  }

  function openSocialTail(handle: string, source: TailSource): void {
    const { tile, fixture, prefill } = tailSheetFor(handle, source);
    showInSocial(
      openCallSheet({
        tile,
        page: { site: "soothia.fun", url: fixture.sourceUrl },
        fixture,
        shrink: recallShrink,
        calibrationBias,
        api,
        layout,
        back: backToSocial,
        locked: () => undefined,
        celebrate: pulseOrb,
        sound,
        prefill,
        offerBack: (called) =>
          showInSocial(
            openBackSheet({
              called,
              api,
              wallet: walletAccess,
              layout,
              back: backToSocial,
              celebrate: pulseOrb,
              sound,
            }),
          ),
      }),
    );
  }

  function openCall(tile: Tile, tail?: { prefill: TailPrefill; offerBack: (called: RecallCalled) => void }): void {
    closeSheet();
    showTab("claims");
    sheet = openCallSheet({
      tile,
      page: { site: hereSite(), url: watchedUrl },
      fixture: pageFixture,
      shrink: recallShrink,
      calibrationBias,
      api,
      layout,
      back: showTiles,
      locked: (pick) => {
        // One call per match, so a fixture call settles every tile from that match.
        const called = calledFromPick(pick);
        const settled = tile.claim.fromFixture ? tiles.filter((item) => item.claim.fromFixture) : [tile];
        for (const { claim } of settled) {
          const known = insightsByClaim.get(claim.id);
          insightsByClaim.set(claim.id, {
            claimId: claim.id,
            relevance: known?.relevance ?? 0,
            notes: known?.notes ?? [],
            nudge: known?.nudge ?? 0,
            called,
          });
        }
      },
      celebrate: pulseOrb,
      sound,
      ...(tail ?? {}),
    });
    body.classList.add("has-sheet");
    body.replaceChildren(sheet.node);
    layout();
  }

  // The match on this page, from the last scan.
  let pageFixture: FixtureSignal | null = null;
  let calibrationBiasCache: number | null | undefined;

  function hereSite(): string {
    return location.hostname.replace(/^www\./, "").toLowerCase();
  }

  async function calibrationBias(): Promise<number | null> {
    if (calibrationBiasCache !== undefined) return calibrationBiasCache;
    const response = await api<RecallRecord>("/recall/record", {});
    if (!response.ok || !response.body) return null;
    const lesson = (response.body as RecallRecord).lessons.find((item) => item.key === "calibration");
    calibrationBiasCache = lesson?.bias ?? null;
    return calibrationBiasCache;
  }

  // ---- Total Recall insights ----

  let insightsByClaim = new Map<string, RecallInsight>();
  let recallShrink = 1;
  let insightSeq = 0;

  // Extra information only: any failure leaves the tiles exactly as they were.
  async function loadInsights(): Promise<void> {
    const seq = ++insightSeq;
    const claims = tiles.slice(0, 3).map(({ claim }) => ({
      id: claim.id,
      question: claim.question,
      category: claim.category,
      ...(claim.fromFixture && pageFixture
        ? { fixture: { home: pageFixture.home, away: pageFixture.away, startISO: pageFixture.startISO } }
        : {}),
    }));
    if (claims.length === 0) return;
    const response = await api<RecallInsights>("/recall/insights", { claims });
    if (seq !== insightSeq || !response.ok || !response.body) return;
    const result = response.body as RecallInsights;
    if (!Array.isArray(result.insights)) return;
    insightsByClaim = new Map(result.insights.map((insight) => [insight.claimId, insight]));
    pageFollowed = pageFollowedCount(result.insights.map((insight) => insight.followedCalls));
    renderBadge();
    recallShrink = typeof result.shrink === "number" ? result.shrink : 1;
    if (Array.isArray(result.quietSites)) applyQuietSites(result.quietSites);
    tiles = sortByRelevance(tiles, insightsByClaim);
    if (!sheet) showTiles();
  }

  // ---- Quiet sites ----

  let quietSites: string[] = [];
  let quietPending: QuietPending = {};

  function isQuietHere(): boolean {
    return quietSites.includes(hereSite());
  }

  function renderQuietButton(): void {
    quietButton.hidden = !isQuietableSite(hereSite()) || isQuietHere();
  }

  function applyQuietSites(list: string[]): void {
    const merged = mergeQuietSites(list, quietPending, Date.now());
    quietSites = merged.sites;
    quietPending = merged.pending;
    chrome.storage.local.set({ [QUIET_SITES_KEY]: quietSites, [QUIET_PENDING_KEY]: quietPending }).catch(() => {});
    renderQuietButton();
  }

  /** Saves a site's quiet setting. False when the Worker did not take it. */
  async function setSiteQuiet(site: string, quiet: boolean): Promise<boolean> {
    const response = await api("/recall/pref", { kind: quiet ? "quiet_site" : "unquiet_site", site });
    if (!response.ok) return false;
    quietPending = { ...quietPending, [site]: { quiet, at: Date.now() } };
    applyQuietSites(quietSites);
    return true;
  }

  async function quietHere(): Promise<void> {
    quietButton.disabled = true;
    const done = await setSiteQuiet(hereSite(), true);
    quietButton.disabled = false;
    if (!done) {
      sound("softError");
      if (!sheet) body.prepend(el("p", "warn", "Couldn't quiet this site just now."));
      layout();
      return;
    }
    clearTimeout(detectTimer);
    stopWatchingForText();
    insightSeq++;
    tiles = [];
    render({ kind: "quiet" });
    showTab("claims");
  }

  function resumeAfterQuiet(): void {
    render({ kind: "watching" });
    scheduleDetect();
  }

  async function showCallsHere(): Promise<void> {
    if (await setSiteQuiet(hereSite(), false)) {
      resumeAfterQuiet();
      return;
    }
    sound("softError");
    body.replaceChildren(
      stateBlock(
        "error",
        "Couldn't change that just now.",
        button("Try again", "button", () => void showCallsHere()),
      ),
    );
    layout();
  }

  async function api<T>(path: ApiPath, payload: unknown): Promise<ApiResponse<T | ApiError>> {
    try {
      const message: ApiRequestMessage = { type: API_REQUEST, path, body: payload };
      const response = (await chrome.runtime.sendMessage(message)) as ApiResponse<T | ApiError> | undefined;
      return response ?? { ok: false, status: 0, body: null };
    } catch {
      return { ok: false, status: 0, body: null };
    }
  }

  // ---- The orb's badge ----

  let pageFollowed = 0;
  let newFeedItems = 0;

  function renderBadge(): void {
    const text = badgeText(pageFollowed + newFeedItems);
    orbBadge.hidden = text === null;
    orbBadge.textContent = text ?? "";
  }

  function markSocialSeen(): void {
    const now = Date.now();
    newFeedItems = 0;
    renderBadge();
    chrome.storage.local
      .set({ [SOCIAL_SEEN_KEY]: now, [FEED_CHECK_KEY]: { at: now, seen: now, count: 0 } satisfies FeedCheck })
      .catch(() => {});
  }

  /** Counts feed items since Social was last opened, asking the Worker every few minutes at most. */
  async function refreshFeedBadge(): Promise<void> {
    const stored = await chrome.storage.local.get([SOCIAL_SEEN_KEY, FEED_CHECK_KEY]);
    const now = Date.now();
    const savedSeen: unknown = stored[SOCIAL_SEEN_KEY];
    if (typeof savedSeen !== "number") {
      // A first run starts from now, not from everything anyone ever called.
      await chrome.storage.local.set({ [SOCIAL_SEEN_KEY]: now });
      return;
    }
    const cached = cachedFeedCount(stored[FEED_CHECK_KEY] as FeedCheck | undefined, savedSeen, now);
    let count = cached;
    if (count === null) {
      const response = await api<{ count: number }>("/social/feed/new", { since: savedSeen });
      if (!response.ok || !response.body) return;
      count = (response.body as { count: number }).count;
      await chrome.storage.local.set({ [FEED_CHECK_KEY]: { at: now, seen: savedSeen, count } satisfies FeedCheck });
    }
    newFeedItems = count;
    renderBadge();
  }

  function render(view: View): void {
    closeSheet();
    if (view.kind !== "tiles") {
      pageFollowed = 0;
      renderBadge();
    }
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
        insightsByClaim = new Map();
        showTiles();
        void safe("insights", loadInsights);
        break;
      case "empty":
        setOrb("idle");
        body.replaceChildren(stateBlock("empty", "Nothing to call here."));
        break;
      case "quiet":
        setOrb("idle");
        body.replaceChildren(
          stateBlock(
            "skipped",
            `Soothia is quiet on ${hereSite()}.`,
            button("Show calls here again", "button", () => void showCallsHere()),
          ),
        );
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
      ["path", scan.path ?? "\u2013"],
      ...(scan.fixture ? ([["fixture", scan.fixture]] as [string, string][]) : []),
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
        {
          type: "soothia:v1:scan",
          state: scan.state,
          chars: scan.read?.chars ?? 0,
          site: scan.read?.site ?? "",
          elapsedMs: Date.now() - scanStarted,
          issues: [...issues],
          ...extra,
        },
        "*",
      );
    } catch {
      // Not important.
    }
  }
  onAudioState(() => renderDebug());

  // The linked record changed, so anything read from the old one is out of date.
  function onRecallIdentityChanged(): void {
    insightsByClaim = new Map();
    recallShrink = 1;
    calibrationBiasCache = undefined;
    if (!recordPane.hidden) void safe("record", recordView.render);
    if (tiles.length > 0) {
      if (!sheet) showTiles();
      void safe("insights", loadInsights);
    }
  }

  async function loadSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get([
        MUTED_KEY,
        STYLE_KEY,
        SHOW_DEBUG_KEY,
        RECALL_ID_KEY,
        QUIET_SITES_KEY,
        QUIET_PENDING_KEY,
        "soothia:devEvents",
      ]);
      setLinkedRecallId(isRecallId(stored[RECALL_ID_KEY]) ? stored[RECALL_ID_KEY] : "");
      const savedQuiet: unknown = stored[QUIET_SITES_KEY];
      quietSites = Array.isArray(savedQuiet)
        ? savedQuiet.filter((site): site is string => typeof site === "string")
        : [];
      const savedPending: unknown = stored[QUIET_PENDING_KEY];
      quietPending = typeof savedPending === "object" && savedPending !== null ? (savedPending as QuietPending) : {};
      devEvents = stored["soothia:devEvents"] === true;
      showDebugToggle.box.checked = stored[SHOW_DEBUG_KEY] === true;
      // Sound is on unless it was muted; the fresh-install default is on.
      setMuted(stored[MUTED_KEY] === true);
      const saved = stored[STYLE_KEY];
      if (typeof saved === "string" && [...SYNTH_STYLES, "files"].includes(saved)) setStyle(saved as SfxStyle);
    } catch {
      // Storage unavailable: keep the defaults.
    }
    applyDebugVisibility();
    renderMute();
    renderQuietButton();
  }

  showDebugToggle.box.addEventListener("change", () => {
    chrome.storage.local.set({ [SHOW_DEBUG_KEY]: showDebugToggle.box.checked }).catch(() => {});
    applyDebugVisibility();
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
    // Event mode: a sports fixture page has match info instead of prose.
    const fixture = read.kind === "skip" ? null : (safe("fixture", () => findFixture(document, Date.now())) ?? null);
    pageFixture = fixture;
    if (read.kind !== "page" && !fixture) {
      setScan({ read: read.info, state: `skipped (${read.reason})`, detect: null, path: "none" });
      render({ kind: "skipped" });
      emitScanEvent({ done: "skipped", path: "none" });
      return;
    }
    const page: PageContext =
      read.kind === "page"
        ? read.page
        : {
            url: watchedUrl.split("#")[0],
            site: location.hostname.replace(/^www\./, ""),
            title: document.title.slice(0, 300),
            text: fixture ? fixture.evidence.join("\n") : "",
          };
    const fixtureNote = fixture ? describeFixture(fixture) : "";
    setScan({
      read:
        read.kind === "page"
          ? read.info
          : { site: page.site, chars: page.text.length, preview: fixtureNote.slice(0, 80) },
      state: refresh ? "running (scan again)" : "running",
      detect: null,
      path: fixture && read.kind !== "page" ? "fixture" : "prose",
      fixture: fixtureNote,
    });
    const started = Date.now();
    let result: DetectResult | undefined;
    let relayError = "";
    try {
      const message: DetectRequestMessage = { type: DETECT_REQUEST, page, refresh, ...(fixture ? { fixture } : {}) };
      result = (await chrome.runtime.sendMessage(message)) as DetectResult | undefined;
      if (!result) relayError = "background gave no answer";
    } catch (error) {
      relayError = /context invalidated/i.test(String((error as Error)?.message))
        ? "extension updated; reload this tab"
        : "background unreachable; reload this tab";
    }
    const remaining = MIN_THINKING_MS - (Date.now() - started);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (url !== watchedUrl) return;
    // "Quiet here" was pressed while this scan was running.
    if (!refresh && isQuietHere()) return;

    if (!result) {
      setScan({ state: `error (${relayError})`, detect: null });
      render({ kind: "error", reason: isContextDead() ? "updated" : "unavailable" });
      emitScanEvent({ done: "error" });
    } else if (result.status === "error") {
      setScan({ state: `error (${result.reason})`, detect: result.debug });
      render({ kind: "error", reason: result.reason });
      emitScanEvent({ done: "error" });
    } else {
      const path = result.debug.path ?? (fixture && read.kind !== "page" ? "fixture" : "prose");
      setScan({ state: "done", detect: result.debug, path: result.tiles.length === 0 ? "none" : path });
      if (result.tiles.length === 0) render({ kind: "empty" });
      else render({ kind: "tiles", tiles: result.tiles.slice(0, 3) });
      emitScanEvent({
        done: "ok",
        path,
        tiles: result.tiles.slice(0, 3).map((tile) => tile.claim.question),
        cached: result.debug.fromClientCache,
      });
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
    if (isQuietHere()) {
      render({ kind: "quiet" });
      return;
    }
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
    void refreshProxy();
    sheet?.refresh();
    if (!sheet) refreshStakeRows();
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

  let drag: { pointerId: number; startX: number; startY: number; origin: OrbPosition; moved: boolean } | null = null;
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

  proxyRow.set("Proxy: checking…", "idle");
  loadFonts();
  applyTheme();
  // Sites can set their background after load (themes, dark mode toggles).
  setTimeout(applyTheme, 1500);
  renderDebug();
  await safe("settings", loadSettings);
  await safe("wallet", walletSettings.load);
  void safe("feed badge", refreshFeedBadge);
  setInterval(
    guarded("feed badge", () => void safe("feed badge", refreshFeedBadge)),
    FEED_CHECK_MS,
  );
  // A wallet connected from the Back it sheet shows in settings too.
  chrome.storage.onChanged.addListener(
    guarded("wallet change", (changes: Record<string, chrome.storage.StorageChange>) => {
      if (SUI_WALLET_KEY in changes) void safe("wallet", walletSettings.load);
    }),
  );
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
