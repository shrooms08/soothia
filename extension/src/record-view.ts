// The My record tab: what the user has called, how it went, and the proof on Sui.
import { button, el, externalLink, icon } from "./dom";
import type { ApiError, ApiPath, ApiResponse, RecallProof, RecallRecord, RecallRecordPick } from "./messages";
import { pickLean, proofText, recordHeadline, shortId, skipReasonText } from "./recall-logic";

export interface RecordHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
  state(kind: "empty" | "error" | "watching", text: string, ...extra: HTMLElement[]): HTMLElement;
  quietSites(): string[];
  /** Asks Soothia to show calls on a site again. False when that failed. */
  unquiet(site: string): Promise<boolean>;
}

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

export function createRecordView(pane: HTMLElement, host: RecordHost): { render(): Promise<void> } {
  let seq = 0;

  function proofControl(pick: RecallRecordPick): HTMLElement {
    const row = el("div", "record-proof");
    if (!pick.commit) {
      row.append(el("span", "note", pick.commitSkipped ? `No Sui proof (${skipReasonText(pick.commitSkipped)})` : "No Sui proof"));
      return row;
    }
    const result = el("span", "note proof-result");
    const link = button("Proof", "link", () => {
      void (async () => {
        link.disabled = true;
        result.textContent = "Checking on Sui…";
        host.layout();
        const response = await host.api<RecallProof>("/recall/proof", { pickId: pick.id });
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
    row.append(link, result, externalLink("Sui", pick.commit.explorerUrl, "link ext"));
    return row;
  }

  function callRow(pick: RecallRecordPick): HTMLElement {
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
    const record = response.body as RecallRecord;
    if (record.picks.length === 0) {
      pane.replaceChildren(host.state("empty", EMPTY_TEXT), ...quietSection(), ...accountFooter(record.account));
      host.layout();
      return;
    }
    const { summary } = record;
    pane.replaceChildren(
      refreshRow(),
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
      section("Calls", ...record.picks.map(callRow)),
      ...quietSection(),
      ...accountFooter(record.account),
    );
    host.layout();
  }

  return { render };
}
