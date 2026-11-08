// The My record tab: what the user has called, how it went, and the proof on Sui.
import { button, el, externalLink, icon } from "./dom";
import type { ApiError, ApiPath, ApiResponse, RecallCalled, RecallProof, RecallRecord, RecallRecordPick } from "./messages";
import { leanSide, pickLean, proofText, recordHeadline, shortId, skipReasonText } from "./recall-logic";
import {
  formatSui,
  isClaimable,
  positionStatusText,
  signedSui,
  stakeErrorText,
  walletErrorText,
  walletSummary,
  type StakeErrorBody,
  type StakePositionView,
} from "./stake-logic";
import type { WalletAccess } from "./wallet-access";
import type { ConnectedWallet } from "./wallet-protocol";

export interface RecordHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
  state(kind: "empty" | "error" | "watching", text: string, ...extra: HTMLElement[]): HTMLElement;
  quietSites(): string[];
  /** Asks Soothia to show calls on a site again. False when that failed. */
  unquiet(site: string): Promise<boolean>;
  /** Missing where the record is shown without a wallet. */
  wallet?: WalletAccess;
}

const when = (ms: number): string => new Date(ms).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" });

const EMPTY_TEXT = "No calls yet. Open a match page and tap Call it.";

function section(title: string, ...children: HTMLElement[]): HTMLElement {
  const node = el("section", "record-section");
  node.append(el("h3", "field-label", title), ...children);
  return node;
}

function percentBar(name: string, share: number, className: string): HTMLElement {
  const percent = Math.round(share * 100);
  const row = el("div", "cal-bar");
  const track = el("span", "cal-track");
  const fill = el("span", `cal-fill ${className}`);
  fill.style.width = `${Math.min(percent, 100)}%`;
  track.append(fill);
  row.append(el("span", "cal-name", name), track, el("span", "cal-value", `${percent}%`));
  return row;
}

function calibration(buckets: RecallRecord["summary"]["calibration"]): HTMLElement {
  const list = el("div", "cal-list");
  for (const bucket of buckets) {
    const item = el("div", "cal-bucket");
    item.append(
      el("p", "cal-label", `${bucket.label} · ${bucket.calls} ${bucket.calls === 1 ? "call" : "calls"}`),
      percentBar("Claimed", bucket.claimed, "claimed"),
      percentBar("Landed", bucket.hitRate, "landed"),
    );
    list.append(item);
  }
  return list;
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

function walletStats(wallet: ConnectedWallet, positions: StakePositionView[]): HTMLElement {
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
    stat("profit or loss", summary.profitMist === null ? "\u2014" : signedSui(summary.profitMist)),
    stat("ROI", summary.roiPercent === null ? "\u2014" : `${summary.roiPercent.toFixed(1)}%`),
    stat("best multiplier", summary.bestMultiplier === null ? "\u2014" : `${summary.bestMultiplier.toFixed(2)}x`),
  );
  return section(`Wallet ${shortId(wallet.address)}`, grid);
}

/** The Proof link and the line that shows its result. */
export function proofLink(pickId: string, host: ApiHost): { link: HTMLButtonElement; result: HTMLElement } {
  const result = el("span", "note proof-result");
  const link = button("Proof", "link", () => {
    void (async () => {
      link.disabled = true;
      result.textContent = "Checking on Sui\u2026";
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
  row.append(el("span", "called-badge", `Your call: ${called.side} \u00b7 ${called.confidence}%`));
  if (called.committed) {
    const { link, result } = proofLink(called.pickId, host);
    row.append(link, result);
  }
  return row;
}

function stakeFromRecord(pick: RecallRecordPick): Pick<StakePositionView, "amountMist" | "estimatedPayoutMist" | "claimOpensAtMs"> & { status: StakePositionView["status"] | null } {
  const stake = pick.stake as NonNullable<RecallRecordPick["stake"]>;
  return { amountMist: stake.amountMist, status: stake.status, estimatedPayoutMist: stake.payoutMist ?? "0", claimOpensAtMs: stake.claimOpensAtMs };
}

export function createRecordView(pane: HTMLElement, host: RecordHost): { render(): Promise<void> } {
  let seq = 0;

  function proofControl(pick: RecallRecordPick): HTMLElement {
    const row = el("div", "record-proof");
    if (!pick.commit) {
      row.append(el("span", "note", pick.commitSkipped ? `No Sui proof (${skipReasonText(pick.commitSkipped)})` : "No Sui proof"));
      return row;
    }
    const { link, result } = proofLink(pick.id, host);
    row.append(link, result, externalLink("Sui", pick.commit.explorerUrl, "link ext"));
    return row;
  }

  /** Claims from the connected wallet. The checker sees the bytes before the wallet does. */
  async function claim(position: StakePositionView, wallet: ConnectedWallet, control: HTMLButtonElement, note: HTMLElement): Promise<void> {
    const report = (text: string, bad = false): void => {
      note.textContent = text;
      note.classList.toggle("bad", bad);
      host.layout();
    };
    control.disabled = true;
    report("Preparing your claim\u2026");
    const built = await host.api<{ txBytes: string }>("/stake/claim/build", { poolId: position.poolId, sender: wallet.address });
    if (!built.ok || !built.body) {
      const { text, retry } = stakeErrorText(built.status, built.body as StakeErrorBody | null);
      report(text, true);
      control.disabled = !retry;
      return;
    }
    report("Waiting for your wallet\u2026");
    try {
      const { digest } = await host.wallet!.sign(wallet, (built.body as { txBytes: string }).txBytes, { kind: "claim", poolId: position.poolId });
      control.hidden = true;
      report(`Claimed ${formatSui(position.estimatedPayoutMist, 4)} SUI. Proof: `);
      note.append(externalLink(`${digest.slice(0, 8)}\u2026`, `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`, "link ext"));
      host.layout();
    } catch (error) {
      const { text, retry } = walletErrorText(String((error as Error)?.message ?? error), "Nothing was claimed.");
      report(text, true);
      control.disabled = !retry;
    }
  }

  function stakeControl(pick: RecallRecordPick, position: StakePositionView | undefined, wallet: ConnectedWallet | null): HTMLElement | null {
    const known = position ?? (pick.stake ? stakeFromRecord(pick) : null);
    if (!known) return null;
    const block = el("div", "stake-block");
    const summaryText = `Staked ${formatSui(known.amountMist, 4)} SUI on ${leanSide(pick)}`;
    const status = known.status ? ` \u00b7 ${positionStatusText({ ...known, status: known.status }, when)}` : "";
    block.append(el("span", "stake-text", `${summaryText}${status}`));
    const note = el("p", "stake-claim-note");
    if (isClaimable(known.status)) {
      if (position && wallet && host.wallet) {
        const control: HTMLButtonElement = button("Claim", "button small", () => void claim(position, wallet, control, note));
        block.append(control);
      } else {
        note.textContent = "Connect your wallet in settings to claim.";
      }
    }
    block.append(note);
    return block;
  }

  function callRow(pick: RecallRecordPick, positions: Map<string, StakePositionView>, wallet: ConnectedWallet | null): HTMLElement {
    const row = el("div", "tile record-call");
    const title = pick.fixture ? `${pick.fixture.home} vs ${pick.fixture.away}` : pick.question;
    const status = el(
      "span",
      `side-chip${pick.status === "right" ? " side-chip-yes" : pick.status === "wrong" ? " side-chip-no" : ""}`,
      pick.status,
    );
    const line = el("div", "position");
    line.append(status, el("span", "position-text", pickLean(pick)));
    row.append(el("p", "record-match", title), line);
    if (pick.detail) row.append(el("p", "note", pick.detail));
    const stake = stakeControl(pick, positions.get(pick.id), wallet);
    if (stake) row.append(stake);
    row.append(proofControl(pick));
    return row;
  }

  function accountFooter(account: RecallRecord["account"]): HTMLElement[] {
    if (!account) return [];
    const footer = el("p", "note record-footer");
    footer.append("Memory on Walrus mainnet · account ", externalLink(shortId(account.accountId), account.explorerUrl, "link mono"));
    if (account.owner) {
      footer.append(" owned by ", externalLink(shortId(account.owner), `https://suivision.xyz/account/${encodeURIComponent(account.owner)}`, "link mono"));
    }
    return [footer];
  }

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

  function refreshRow(): HTMLElement {
    const row = el("div", "refresh-row");
    const link = button("Refresh", "link", () => void render());
    link.prepend(icon("refresh"));
    row.append(link);
    return row;
  }

  async function loadPositions(): Promise<{ wallet: ConnectedWallet | null; positions: StakePositionView[] }> {
    const wallet = (await host.wallet?.current().catch(() => null)) ?? null;
    if (!wallet) return { wallet: null, positions: [] };
    const response = await host.api<{ positions: StakePositionView[] }>("/stake/positions", { address: wallet.address });
    return { wallet, positions: response.ok && response.body ? (response.body as { positions: StakePositionView[] }).positions : [] };
  }

  async function render(): Promise<void> {
    const current = ++seq;
    pane.replaceChildren(host.state("watching", "Loading your record…"));
    host.layout();
    const response = await host.api<RecallRecord>("/recall/record", {});
    if (current !== seq) return;
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
    if (current !== seq) return;
    const byPick = new Map(positions.map((position) => [position.pickId, position]));
    const record = response.body as RecallRecord;
    if (record.picks.length === 0) {
      pane.replaceChildren(host.state("empty", EMPTY_TEXT), ...quietSection(), ...accountFooter(record.account));
      host.layout();
      return;
    }
    const { summary } = record;
    pane.replaceChildren(
      refreshRow(),
      ...(wallet ? [walletStats(wallet, positions)] : []),
      el("p", "record-headline", recordHeadline(summary)),
      ...(summary.calibration.length > 0 ? [section("Calibration", calibration(summary.calibration))] : []),
      ...(summary.entities.length > 0 ? [section("Teams", teamTable(summary.entities))] : []),
      ...(record.lessons.length > 0
        ? [
            section(
              "Lessons",
              ...record.lessons.map((lesson) => {
                const card = el("div", "tile");
                card.append(el("p", "lesson-text", lesson.text), el("p", "note", `From ${lesson.n} ${lesson.n === 1 ? "call" : "calls"}`));
                return card;
              }),
            ),
          ]
        : []),
      section("Calls", ...record.picks.map((pick) => callRow(pick, byPick, wallet))),
      ...quietSection(),
      ...accountFooter(record.account),
    );
    host.layout();
  }

  return { render };
}
