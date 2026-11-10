// The Leaderboard tab: the Call Score board with a period switch.
import { button, el, externalLink } from "./dom";
import type { ApiError, ApiPath, ApiResponse } from "./messages";
import { SITE_URL } from "./go-public";

const PERIODS = [
  ["week", "Week"],
  ["month", "Month"],
  ["all", "All time"],
] as const;
type Period = (typeof PERIODS)[number][0];
const MAX_ROWS = 20;

export interface LeaderboardRow {
  rank: number;
  handle: string;
  score: number;
  calls: number;
  hitRate: number | null;
}

export interface LeaderboardHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
}

export function createLeaderboardView(pane: HTMLElement, host: LeaderboardHost): { render(): Promise<void> } {
  let period: Period = "all";
  let seq = 0;

  function row(item: LeaderboardRow): HTMLElement {
    const node = el("div", "board-row");
    const percent = item.hitRate === null ? "–" : `${Math.round(item.hitRate * 100)}%`;
    node.append(
      el("span", "board-rank", String(item.rank)),
      externalLink(`@${item.handle}`, `${SITE_URL}/u/${encodeURIComponent(item.handle)}`, "link board-handle"),
      el("span", "board-score", String(item.score)),
      el("span", "note board-meta", `${item.calls} calls · ${percent} right`),
    );
    return node;
  }

  async function render(): Promise<void> {
    const current = ++seq;
    const switcher = el("div", "board-periods");
    for (const [value, label] of PERIODS) {
      const tab = button(label, `button small board-period${value === period ? " selected" : ""}`, () => {
        period = value;
        void render();
      });
      switcher.append(tab);
    }
    const list = el("div", "board-list");
    const status = el("p", "note", "Loading…");
    pane.replaceChildren(
      switcher,
      status,
      list,
      externalLink("See all", `${SITE_URL}/leaderboard`, "link ext board-all"),
    );
    host.layout();
    const response = await host.api<{ rows: LeaderboardRow[] }>("/social/leaderboard", { board: "score", period });
    if (current !== seq) return;
    if (!response.ok || !response.body) {
      status.textContent = "Couldn't load the leaderboard.";
      host.layout();
      return;
    }
    const { rows } = response.body as { rows: LeaderboardRow[] };
    status.textContent = rows.length === 0 ? "Nobody qualifies yet. It takes 10 settled calls." : "";
    list.replaceChildren(...rows.slice(0, MAX_ROWS).map(row));
    host.layout();
  }

  return { render };
}
