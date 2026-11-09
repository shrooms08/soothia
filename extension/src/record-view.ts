// The My record tab: a header, what needs attention, and four sections. Terms like
// Brier stay inside expanders; the main views speak plainly.
import { RECALL_PACKAGE, STAKE_PACKAGE } from "./config";
import { button, el, externalLink, icon } from "./dom";
import { createGoPublicPanel } from "./go-public";
import type { ApiError, ApiPath, ApiResponse, RecallCalled, RecallProof, RecallRecord, RecallRecordPick } from "./messages";
import { pickLean, proofText, recordHeadline, shortId, skipReasonText } from "./recall-logic";
import {
  attentionItems,
  buildRecordHeader,
  calibrationRows,
  groupCalls,
  isRecordSection,
  lessonsForDisplay,
  lockedText,
  shortDate,
  stakeDetailText,
  stakeListLean,
  stakesForSummary,
  type AttentionItem,
  type RecordHeader,
  type RecordSection,
} from "./record-logic";
import { formatSui, isClaimable, signedSui, stakeErrorText, walletErrorText, walletSummary, type StakeErrorBody, type StakePositionView } from "./stake-logic";
import { createAgentSection, type AgentRequest } from "./agent-view";
import type { WalletAccess } from "./wallet-access";
import type { ConnectedWallet, WalletSummary } from "./wallet-protocol";

export interface RecordHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
  state(kind: "empty" | "error" | "watching", text: string, ...extra: HTMLElement[]): HTMLElement;
  quietSites(): string[];
  /** Asks Soothia to show calls on a site again. False when that failed. */
  unquiet(site: string): Promise<boolean>;
  /** Missing where the record is shown without a wallet. */
  wallet?: WalletAccess;
  /** The agent wallet's controls. */
  agent?: AgentRequest;
  /** The Link record field, for the Me section. */
  linkRecord?(): HTMLElement;
  loadSection?(): Promise<unknown>;
  saveSection?(section: RecordSection): void;
}

const when = (ms: number): string => new Date(ms).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });

const EMPTY_TEXT = "No calls yet. Open a match page and tap Call it.";
const SETTLED_PAGE = 10;
const SECTION_LABELS: [RecordSection, string][] = [
  ["calls", "Calls"],
  ["lessons", "Lessons"],
  ["wallet", "Wallet"],
  ["me", "Me"],
];

function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const node = el("section", "record-section");
  node.append(el("h3", "field-label", title), ...children);
  return node;
}

function expander(title: string, ...children: (HTMLElement | string)[]): HTMLElement {
  const node = el("details", "record-more");
  node.append(el("summary", "record-more-summary", title), ...children);
  return node;
}

function percentBar(name: string, percent: number, className: string): HTMLElement {
  const row = el("div", "cal-bar");
  const track = el("span", "cal-track");
  const fill = el("span", `cal-fill ${className}`);
  fill.style.width = `${Math.min(percent, 100)}%`;
  track.append(fill);
  row.append(el("span", "cal-name", name), track, el("span", "cal-value", `${percent}%`));
  return row;
}

function teamTable(entities: RecallRecord["summary"]["entities"]): HTMLElement {
  const table = el("table", "record-table");
  const head = el("tr", "");
  for (const title of ["Team", "Calls", "Right"]) head.append(el("th", "", title));
  const thead = el("thead", "");
  thead.append(head);
  const tbody = el("tbody", "");
  for (const line of entities) {
    const row = el("tr", "");
    row.append(el("td", "", line.entity), el("td", "mono", String(line.calls)), el("td", "mono", String(line.hits)));
    tbody.append(row);
  }
  table.append(thead, tbody);
  return table;
}

type ApiHost = Pick<RecordHost, "api" | "layout">;

function headerNode(view: RecordHeader, onGoPublic: () => void, refresh: HTMLElement): HTMLElement {
  const node = el("div", "record-header");
  const identity = el("div", "record-identity");
  identity.append(el("span", "record-who", view.identity));
  if (!view.isPublic) identity.append(button("Go public", "link record-go-public", onGoPublic));
  identity.append(refresh);
  node.append(identity, el("p", "record-score", view.score), el("p", "record-score-label", "CALL SCORE"));
  if (view.scoreNote) node.append(el("p", "note", view.scoreNote));
  if (view.summary) node.append(el("p", "record-tally", view.summary));
  return node;
}

function attentionStrip(items: AttentionItem[], open: (section: RecordSection) => void): HTMLElement[] {
  if (items.length === 0) return [];
  const strip = el("div", "record-attention");
  strip.append(...items.map((item) => button(item.text, "record-attention-item", () => open(item.section))));
  return [strip];
}

function walletStats(positions: StakePositionView[]): HTMLElement {
  const summary = walletSummary(positions);
  const stat = (label: string, value: string): HTMLElement => {
    const node = el("span", "wallet-stat");
    node.append(el("b", "", value), label);
    return node;
  };
  const grid = el("div", "wallet-stats");
  grid.append(
    stat("staked", `${formatSui(summary.stakedMist, 4)} SUI`),
    stat("won", `${formatSui(summary.wonMist, 4)} SUI`),
    stat("lost", `${formatSui(summary.lostMist, 4)} SUI`),
    stat("profit or loss", summary.profitMist === null ? "—" : signedSui(summary.profitMist)),
    stat("ROI", summary.roiPercent === null ? "—" : `${summary.roiPercent.toFixed(1)}%`),
    stat("best multiplier", summary.bestMultiplier === null ? "—" : `${summary.bestMultiplier.toFixed(2)}x`),
  );
  return grid;
}

/** The Proof link and the line that shows its result. */
export function proofLink(pickId: string, host: ApiHost, label = "Proof"): { link: HTMLButtonElement; result: HTMLElement } {
  const result = el("span", "note proof-result");
  const link = button(label, "link", () => {
    void (async () => {
      link.disabled = true;
      result.textContent = "Checking on Sui…";
      host.layout();
      const response = await host.api<RecallProof>("/recall/proof", { pickId });
      link.disabled = false;
      if (!response.ok || !response.body) {
        result.textContent = "Couldn't check the proof just now.";
        host.layout();
        return;
      }
      const { text, good } = proofText(response.body as RecallProof);
      result.textContent = text;
      result.classList.toggle("good", good);
      host.layout();
    })();
  });
  return { link, result };
}

/** "Your call: Arsenal win · 60%" with its Proof link, for a tile. */
export function calledRow(called: RecallCalled, host: ApiHost): HTMLElement {
  const row = el("div", "called-row");
  row.append(el("span", "called-badge", `Your call: ${called.side} · ${called.confidence}%`));
  if (called.committed) {
    const { link, result } = proofLink(called.pickId, host);
    row.append(link, result);
  }
  return row;
}

interface RecordData {
  record: RecallRecord;
  wallet: ConnectedWallet | null;
  positions: StakePositionView[];
  publicInfo: { handle: string; score: number | null } | null;
}

export function createRecordView(pane: HTMLElement, host: RecordHost): { render(): Promise<void> } {
  let seq = 0;
  let current: RecordSection = "calls";
  let sectionLoaded = false;
  let data: RecordData | null = null;
  let settledShown = SETTLED_PAGE;
  const expanded = new Set<string>();
  const headerSlot = el("div", "record-header-slot");

  function open(next: RecordSection): void {
    current = next;
    host.saveSection?.(next);
    draw();
  }

  function refreshButton(): HTMLElement {
    const link = button("Refresh", "link", () => void render());
    link.prepend(icon("refresh"));
    const row = el("div", "refresh-row");
    row.append(link);
    return row;
  }

  function drawHeader(): void {
    if (!data) return;
    const view = buildRecordHeader({
      summary: data.record.summary,
      handle: data.publicInfo?.handle ?? null,
      publicScore: data.publicInfo?.score ?? null,
      stakes: stakesForSummary(data.positions, data.record.picks),
    });
    headerSlot.replaceChildren(headerNode(view, () => open("me"), refreshButton()));
  }

  // ---- Calls ----

  function positionFor(pickId: string): StakePositionView | undefined {
    return stakesForSummary(data?.positions ?? [], data?.record.picks ?? []).find((position) => position.pickId === pickId);
  }

  function callDetail(pick: RecallRecordPick): HTMLElement {
    const detail = el("div", "call-detail");
    detail.append(el("p", "call-detail-line", `${pickLean(pick)} confident`));
    if (pick.detail) detail.append(el("p", "call-detail-line", pick.detail));
    const proof = el("div", "record-proof");
    if (pick.commit) {
      const { link, result } = proofLink(pick.id, host, "Proof on Sui");
      proof.append(link, externalLink("View transaction", pick.commit.explorerUrl, "link ext"), result);
    } else {
      proof.append(el("span", "note", pick.commitSkipped ? `No Sui proof (${skipReasonText(pick.commitSkipped)})` : "No Sui proof"));
    }
    detail.append(proof);
    const position = positionFor(pick.id);
    if (position) detail.append(el("p", "call-detail-line", stakeDetailText(position, pick, when)));
    const locked = lockedText(pick);
    if (locked) detail.append(el("p", "call-detail-line", locked));
    return detail;
  }

  function callRow(pick: RecallRecordPick): HTMLElement {
    const row = el("div", "call-row");
    const head = button("", "call-row-head", () => {
      if (expanded.has(pick.id)) expanded.delete(pick.id);
      else expanded.add(pick.id);
      draw();
    });
    head.setAttribute("aria-expanded", String(expanded.has(pick.id)));
    const top = el("span", "call-row-top");
    if (pick.status !== "open") top.append(el("span", `call-icon ${pick.status}`, pick.status === "right" ? "✓" : "✗"));
    top.append(el("span", "call-match", pick.fixture ? `${pick.fixture.home} v ${pick.fixture.away}` : pick.question), el("span", "call-date", shortDate(pick)));
    const position = positionFor(pick.id);
    head.append(top, el("span", "call-lean", `${pickLean(pick)}${position ? ` · ${formatSui(position.amountMist, 4)} SUI` : ""}`));
    row.append(head);
    if (expanded.has(pick.id)) row.append(callDetail(pick));
    return row;
  }

  function callsSection(record: RecallRecord): HTMLElement[] {
    if (record.picks.length === 0) return [host.state("empty", EMPTY_TEXT)];
    const { upcoming, settled } = groupCalls(record.picks);
    const groups: HTMLElement[] = [];
    if (upcoming.length > 0) groups.push(section("Upcoming", ...upcoming.map(callRow)));
    if (settled.length > 0) {
      const shown = settled.slice(0, settledShown);
      const more = settled.length > shown.length ? [button("Show more", "link record-show-more", () => ((settledShown += SETTLED_PAGE), draw()))] : [];
      groups.push(section("Settled", ...shown.map(callRow), ...more));
    }
    return groups;
  }

  // ---- Lessons ----

  function lessonsSection(record: RecallRecord): HTMLElement[] {
    const lessons = lessonsForDisplay(record.lessons);
    const rows = calibrationRows(record.summary.calibration);
    const nodes: HTMLElement[] = [];
    nodes.push(
      lessons.length > 0
        ? section(
            "Lessons",
            ...lessons.map((lesson) => {
              const card = el("div", "tile");
              card.append(el("p", "lesson-text", lesson.text), el("p", "note", `From ${lesson.n} ${lesson.n === 1 ? "call" : "calls"}`));
              return card;
            }),
          )
        : host.state("empty", "Lessons appear after a few settled calls."),
    );
    if (rows.length > 0) {
      nodes.push(
        section(
          "Your confidence",
          ...rows.map((row) => {
            const item = el("div", "cal-bucket");
            item.append(el("p", "cal-label", row.text), percentBar("You said", row.saidPercent, "claimed"), percentBar("Right", row.rightPercent, "landed"));
            return item;
          }),
        ),
      );
    }
    nodes.push(expander("How Soothia learns", el("p", "note", "After each match, Soothia compares how sure you were with what happened. When a pattern changes, it writes a new lesson to your memory on Walrus.")));
    const { summary } = record;
    if (summary.resolved > 0 || summary.entities.length > 0) {
      nodes.push(expander("More numbers", el("p", "note record-headline", recordHeadline(summary)), ...(summary.entities.length > 0 ? [teamTable(summary.entities)] : [])));
    }
    return nodes;
  }

  // ---- Wallet ----

  function chooseWallet(picker: HTMLElement, note: HTMLElement): (wallets: WalletSummary[]) => Promise<WalletSummary | null> {
    return (wallets) =>
      new Promise((resolve) => {
        picker.replaceChildren(
          ...wallets.map((wallet) =>
            button(wallet.name, "button small", () => {
              picker.hidden = true;
              resolve(wallet);
            }),
          ),
        );
        picker.hidden = false;
        note.textContent = "Choose a wallet.";
        host.layout();
      });
  }

  function connectView(): HTMLElement[] {
    const note = el("p", "note");
    const picker = el("div", "wallet-row wallet-picker");
    picker.hidden = true;
    const connect = button("Connect Sui wallet", "button primary wide", () => {
      void (async () => {
        connect.disabled = true;
        try {
          if ((await host.wallet?.connect(chooseWallet(picker, note))) ?? null) {
            await render();
            return;
          }
        } catch (error) {
          note.textContent = walletErrorText(String((error as Error)?.message ?? error), "").text;
        }
        connect.disabled = false;
        host.layout();
      })();
    });
    return [el("p", "note", "Connect a wallet to see your stakes and claim what you've won."), connect, picker, note];
  }

  async function claim(position: StakePositionView, wallet: ConnectedWallet, control: HTMLButtonElement, note: HTMLElement): Promise<void> {
    const report = (text: string, bad = false): void => {
      note.textContent = text;
      note.classList.toggle("bad", bad);
      host.layout();
    };
    control.disabled = true;
    report("Preparing your claim…");
    const built = await host.api<{ txBytes: string }>("/stake/claim/build", { poolId: position.poolId, sender: wallet.address });
    if (!built.ok || !built.body) {
      const { text, retry } = stakeErrorText(built.status, built.body as StakeErrorBody | null);
      report(text, true);
      control.disabled = !retry;
      return;
    }
    report("Waiting for your wallet…");
    try {
      const { digest } = await (host.wallet as WalletAccess).sign(wallet, (built.body as { txBytes: string }).txBytes, { kind: "claim", poolId: position.poolId });
      control.hidden = true;
      position.status = "claimed";
      report(`Claimed ${formatSui(position.estimatedPayoutMist, 4)} SUI. Proof: `);
      note.append(externalLink(`${digest.slice(0, 8)}…`, `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`, "link ext"));
      drawHeader();
      host.layout();
    } catch (error) {
      const { text, retry } = walletErrorText(String((error as Error)?.message ?? error), "Nothing was claimed.");
      report(text, true);
      control.disabled = !retry;
    }
  }

  function claimRow(position: StakePositionView, wallet: ConnectedWallet): HTMLElement {
    const row = el("div", "stake-block");
    const note = el("p", "stake-claim-note");
    const control: HTMLButtonElement = button("Claim", "button primary small", () => void claim(position, wallet, control, note));
    row.append(el("span", "stake-text", `${position.match.home} v ${position.match.away} · ${formatSui(position.estimatedPayoutMist, 4)} SUI`), control, note);
    return row;
  }

  function walletSection(record: RecallRecord, wallet: ConnectedWallet | null, positions: StakePositionView[]): HTMLElement[] {
    if (!wallet) return connectView();
    const claims = positions.filter((position) => isClaimable(position.status));
    const nodes: HTMLElement[] = [];
    if (claims.length > 0) nodes.push(section("Ready to claim", ...claims.map((position) => claimRow(position, wallet))));
    nodes.push(section(`Wallet ${shortId(wallet.address)}`, walletStats(positions)));
    if (host.agent && host.wallet) nodes.push(createAgentSection({ agent: host.agent, api: host.api, wallet: host.wallet, connected: wallet, layout: host.layout }));
    if (positions.length === 0) {
      nodes.push(el("p", "note", "No stakes from this wallet yet."));
    } else {
      nodes.push(
        section(
          "Stakes",
          ...positions.map((position) => {
            const row = el("div", "stake-block");
            row.append(el("span", "stake-text", stakeListLean(position, record.picks, when)));
            return row;
          }),
        ),
      );
    }
    return nodes;
  }

  // ---- Me ----

  function quietSection(): HTMLElement[] {
    const sites = host.quietSites();
    if (sites.length === 0) return [];
    const list = el("div", "quiet-list");
    for (const site of sites) {
      const row = el("div", "quiet-row");
      const undo = button("Undo", "link", () => {
        void (async () => {
          undo.disabled = true;
          if (await host.unquiet(site)) {
            row.remove();
            if (list.childElementCount === 0) list.closest(".record-section")?.remove();
          } else {
            undo.disabled = false;
            undo.textContent = "Try again";
          }
          host.layout();
        })();
      });
      row.append(el("span", "quiet-site", site), undo);
      list.append(row);
    }
    return [section("Quiet sites", list)];
  }

  function storageFooter(account: RecallRecord["account"]): HTMLElement {
    const details: HTMLElement[] = [];
    if (account) {
      const line = el("p", "note");
      line.append("Memory account ", externalLink(shortId(account.accountId), account.explorerUrl, "link mono"));
      if (account.owner) line.append(" owned by ", externalLink(shortId(account.owner), `https://suivision.xyz/account/${encodeURIComponent(account.owner)}`, "link mono"));
      details.push(line);
    }
    const packages = el("p", "note");
    packages.append("Packages: ", externalLink("proofs", `https://suivision.xyz/package/${RECALL_PACKAGE}`, "link"), " · ", externalLink("staking", `https://suivision.xyz/package/${STAKE_PACKAGE}`, "link"));
    details.push(packages);
    return expander("Calls stored on Walrus · proofs on Sui", ...details);
  }

  function meSection(record: RecallRecord): HTMLElement[] {
    const nodes: HTMLElement[] = [];
    if (host.wallet) {
      const panel = createGoPublicPanel({
        api: host.api,
        wallet: host.wallet,
        layout: host.layout,
        onChange: (profile) => {
          if (!data) return;
          const score = data.publicInfo?.handle === profile?.handle ? (data.publicInfo?.score ?? null) : null;
          data.publicInfo = profile ? { handle: profile.handle, score } : null;
          drawHeader();
        },
      });
      void panel.load().catch(() => undefined);
      nodes.push(panel.node);
    }
    nodes.push(...quietSection());
    const link = host.linkRecord?.();
    if (link) nodes.push(link);
    nodes.push(storageFooter(record.account));
    return nodes;
  }

  // ---- The tab ----

  function segmented(): HTMLElement {
    const bar = el("div", "record-segments");
    bar.setAttribute("role", "tablist");
    for (const [value, label] of SECTION_LABELS) {
      const tab = button(label, `record-segment${value === current ? " selected" : ""}`, () => open(value));
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(value === current));
      bar.append(tab);
    }
    return bar;
  }

  function sectionNodes({ record, wallet, positions }: RecordData): HTMLElement[] {
    switch (current) {
      case "lessons":
        return lessonsSection(record);
      case "wallet":
        return walletSection(record, wallet, positions);
      case "me":
        return meSection(record);
      default:
        return callsSection(record);
    }
  }

  function draw(): void {
    if (!data) return;
    drawHeader();
    const items = attentionItems({
      stakes: stakesForSummary(data.positions, data.record.picks),
      picks: data.record.picks,
      lessons: data.record.lessons,
      nowMs: Date.now(),
    });
    pane.replaceChildren(headerSlot, ...attentionStrip(items, open), segmented(), ...sectionNodes(data));
    host.layout();
  }

  async function loadPositions(): Promise<{ wallet: ConnectedWallet | null; positions: StakePositionView[] }> {
    const wallet = (await host.wallet?.current().catch(() => null)) ?? null;
    if (!wallet) return { wallet: null, positions: [] };
    const response = await host.api<{ positions: StakePositionView[] }>("/stake/positions", { address: wallet.address });
    return { wallet, positions: response.ok && response.body ? (response.body as { positions: StakePositionView[] }).positions : [] };
  }

  async function loadPublic(wallet: ConnectedWallet | null): Promise<RecordData["publicInfo"]> {
    if (!wallet) return null;
    const response = await host.api<{ public: boolean; profile?: { handle: string }; score?: number | null }>("/social/profile/by-address", { address: wallet.address });
    const body = response.ok ? (response.body as { public: boolean; profile?: { handle: string }; score?: number | null } | null) : null;
    return body?.public && body.profile ? { handle: body.profile.handle, score: body.score ?? null } : null;
  }

  async function render(): Promise<void> {
    const mine = ++seq;
    if (!sectionLoaded) {
      sectionLoaded = true;
      const saved = await host.loadSection?.().catch(() => null);
      if (isRecordSection(saved)) current = saved;
    }
    pane.replaceChildren(host.state("watching", "Loading your record…"));
    host.layout();
    const response = await host.api<RecallRecord>("/recall/record", {});
    if (mine !== seq) return;
    if (!response.ok || !response.body) {
      pane.replaceChildren(
        host.state(
          "error",
          "Couldn't load your record.",
          button("Try again", "button", () => void render()),
        ),
        ...quietSection(),
      );
      host.layout();
      return;
    }
    const { wallet, positions } = await loadPositions();
    if (mine !== seq) return;
    const publicInfo = await loadPublic(wallet);
    if (mine !== seq) return;
    data = { record: response.body as RecallRecord, wallet, positions, publicInfo };
    draw();
  }

  return { render };
}
