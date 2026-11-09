// The Social tab: Feed, Leaderboard and Following. Also the line on a tile saying who
// you follow called this match.
import { button, el, externalLink, icon } from "./dom";
import { SITE_URL } from "./go-public";
import { createLeaderboardView } from "./leaderboard-view";
import type { ApiError, ApiPath, ApiResponse } from "./messages";
import { callLine, canTail, followedLine, handleLine, initials, matchLine, timeAgo, type ConsensusView, type FeedEntry, type FollowedCall, type TailSource } from "./social-logic";

type SocialSection = "feed" | "board" | "following";
const SECTIONS: [SocialSection, string][] = [
  ["feed", "Feed"],
  ["board", "Leaderboard"],
  ["following", "Following"],
];
const SEARCH_DELAY_MS = 300;

interface FollowingRow {
  handle: string;
  score: number | null;
  public: boolean;
}

interface SearchRow {
  handle: string;
  score: number | null;
  following: boolean;
}

export interface SocialHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
  state(kind: "empty" | "error" | "watching", text: string, ...extra: HTMLElement[]): HTMLElement;
  onTail(handle: string, source: TailSource): void;
  now?: () => number;
}

const profileLink = (text: string, handle: string): HTMLElement => externalLink(text, `${SITE_URL}/u/${encodeURIComponent(handle)}`, "link feed-handle");

function followError(code: string | undefined): string {
  switch (code) {
    case "cannot_follow_self":
      return "That's you.";
    case "follow_limit":
      return "You're following as many people as you can.";
    case "not_found":
      return "That profile has gone.";
    case "rate_limited":
      return "Too many tries just now. Wait a minute.";
    default:
      return "That didn't work. Please try again.";
  }
}

export function createSocialView(pane: HTMLElement, host: SocialHost): { render(): Promise<void> } {
  let current: SocialSection = "feed";
  let seq = 0;
  const nowMs = (): number => host.now?.() ?? Date.now();

  function feedRow(entry: FeedEntry): HTMLElement {
    const { handle, score, item, myCall } = entry;
    const row = el("div", "feed-row");
    const top = el("div", "feed-top");
    top.append(profileLink(handleLine(handle, score), handle), el("span", "feed-time", timeAgo(Date.parse(item.at), nowMs())));
    row.append(top, el("p", "feed-match", matchLine(item.fixture)), el("p", "feed-call", callLine(item.lean, item.confidence, item.stakeMist)));
    if (item.tailOf) row.append(el("p", "note", `Tail of @${item.tailOf}`));
    if (myCall) row.append(el("p", "feed-mine", `You: ${callLine(myCall.side, myCall.confidence)}`));
    else if (canTail(item.fixture, nowMs())) row.append(button("Tail", "button small feed-tail", () => host.onTail(handle, item)));
    return row;
  }

  async function renderFeed(slot: HTMLElement, mine: number): Promise<void> {
    slot.replaceChildren(host.state("watching", "Loading your feed…"));
    host.layout();
    const response = await host.api<{ items: FeedEntry[] }>("/social/feed", {});
    if (mine !== seq) return;
    if (!response.ok || !response.body) {
      slot.replaceChildren(host.state("error", "Couldn't load your feed.", button("Try again", "button", () => void render())));
    } else {
      const { items } = response.body as { items: FeedEntry[] };
      if (items.length === 0) {
        slot.replaceChildren(host.state("empty", "Follow people to see their calls here.", button("Find people", "button", () => void select("following"))));
      } else {
        const refresh = button("Refresh", "link", () => void render());
        refresh.prepend(icon("refresh"));
        const tools = el("div", "refresh-row");
        tools.append(refresh);
        slot.replaceChildren(tools, ...items.map(feedRow));
      }
    }
    host.layout();
  }

  function followingRow(row: FollowingRow, reload: () => void): HTMLElement {
    const node = el("div", "follow-row");
    const name = profileLink(handleLine(row.handle, row.score), row.handle);
    const note = el("span", "note", row.public ? "" : "No longer public");
    const unfollow = button("Unfollow", "button small", () => {
      void (async () => {
        unfollow.disabled = true;
        const response = await host.api<unknown>("/social/unfollow", { handle: row.handle });
        if (response.ok) reload();
        else {
          unfollow.disabled = false;
          note.textContent = followError((response.body as ApiError | null)?.error);
          host.layout();
        }
      })();
    });
    node.append(name, note, unfollow);
    return node;
  }

  function searchRow(row: SearchRow, reload: () => void): HTMLElement {
    const node = el("div", "follow-row");
    const name = profileLink(handleLine(row.handle, row.score), row.handle);
    const note = el("span", "note", "");
    node.append(name, note);
    if (row.following) node.append(el("span", "note", "Following"));
    else {
      const follow = button("Follow", "button small", () => {
        void (async () => {
          follow.disabled = true;
          const response = await host.api<unknown>("/social/follow", { handle: row.handle });
          if (response.ok) reload();
          else {
            follow.disabled = false;
            note.textContent = followError((response.body as ApiError | null)?.error);
            host.layout();
          }
        })();
      });
      node.append(follow);
    }
    return node;
  }

  async function renderFollowing(slot: HTMLElement, mine: number): Promise<void> {
    const input = el("input", "input follow-search");
    input.type = "text";
    input.placeholder = "Search handles";
    input.spellcheck = false;
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Search handles");
    const results = el("div", "follow-results");
    const list = el("div", "follow-list");
    let timer: ReturnType<typeof setTimeout> | undefined;
    let searchSeq = 0;

    const reload = (): void => void render();

    async function search(): Promise<void> {
      const mineSearch = ++searchSeq;
      const query = input.value.trim().toLowerCase();
      if (!query) {
        results.replaceChildren();
        host.layout();
        return;
      }
      const response = await host.api<{ results: SearchRow[] }>("/social/search", { q: query });
      if (mineSearch !== searchSeq) return;
      const found = response.ok && response.body ? (response.body as { results: SearchRow[] }).results : [];
      results.replaceChildren(...(found.length > 0 ? found.map((row) => searchRow(row, reload)) : [el("p", "note", response.ok ? "No one by that name." : "Couldn't search just now.")]));
      host.layout();
    }

    input.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => void search(), SEARCH_DELAY_MS);
    });
    list.append(host.state("watching", "Loading…"));
    slot.replaceChildren(input, results, list);
    host.layout();
    const response = await host.api<{ following: FollowingRow[] }>("/social/following", {});
    if (mine !== seq) return;
    if (!response.ok || !response.body) {
      list.replaceChildren(el("p", "note", "Couldn't load who you follow."));
    } else {
      const { following } = response.body as { following: FollowingRow[] };
      list.replaceChildren(...(following.length > 0 ? following.map((row) => followingRow(row, reload)) : [el("p", "note", "You aren't following anyone yet.")]));
    }
    host.layout();
  }

  function segmented(): HTMLElement {
    const bar = el("div", "record-segments social-segments");
    bar.setAttribute("role", "tablist");
    for (const [value, label] of SECTIONS) {
      const tab = button(label, `record-segment${value === current ? " selected" : ""}`, () => void select(value));
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(value === current));
      bar.append(tab);
    }
    return bar;
  }

  function select(section: SocialSection): Promise<void> {
    current = section;
    return render();
  }

  async function render(): Promise<void> {
    const mine = ++seq;
    const slot = el("div", "social-slot");
    pane.replaceChildren(segmented(), slot);
    if (current === "feed") await renderFeed(slot, mine);
    else if (current === "following") await renderFollowing(slot, mine);
    else await createLeaderboardView(slot, host).render();
  }

  return { render };
}

/** "@ada and @tunde called this · 2 say Arsenal win", opening to a list with Tail. */
export function followedRow(calls: FollowedCall[], consensus: ConsensusView | null, onTail: ((call: FollowedCall) => void) | null, layout: () => void): HTMLElement {
  const node = el("div", "followed");
  const head = button("", "followed-head", () => {
    list.hidden = !list.hidden;
    head.setAttribute("aria-expanded", String(!list.hidden));
    layout();
  });
  head.setAttribute("aria-expanded", "false");
  const avatars = el("span", "followed-avatars");
  avatars.append(...calls.slice(0, 3).map((call) => el("span", "followed-avatar", initials(call.handle))));
  head.append(avatars, el("span", "followed-text", followedLine(calls, consensus)));
  const list = el("div", "followed-list");
  list.hidden = true;
  for (const call of calls) {
    const row = el("div", "followed-call");
    row.append(el("span", "followed-who", `@${call.handle}`), el("span", "followed-lean", callLine(call.lean, call.confidence, call.stakeMist)));
    if (onTail) row.append(button("Tail", "button small", () => onTail(call)));
    list.append(row);
  }
  node.append(head, list);
  return node;
}
