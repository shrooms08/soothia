// The Social tab: Feed, Leaderboard and Following. Also the line on a tile saying who
// you follow called this match.
import { button, el, externalLink, icon } from "./dom";
import { SITE_URL } from "./go-public";
import { createLeaderboardView } from "./leaderboard-view";
import type { ApiError, ApiPath, ApiResponse } from "./messages";
import { isLockedItem, premiumLine, unlockFailureText, type UnlockReceipt, type UnlockResult } from "./premium-logic";
import { shortId } from "./recall-logic";
import { callLine, canTail, followedLine, handleLine, initials, isLockedCall, matchLine, timeAgo, type ConsensusView, type FeedEntry, type FeedItem, type FollowedCall, type OpenFollowedCall, type TailSource } from "./social-logic";
import { formatSui, walletErrorText } from "./stake-logic";
import type { WalletSummary } from "./wallet-protocol";

type SocialSection = "feed" | "board" | "following";
const SECTIONS: [SocialSection, string][] = [
  ["feed", "Feed"],
  ["board", "Leaderboard"],
  ["following", "Following"],
];
const SEARCH_DELAY_MS = 300;

interface FollowingRow {
  address: string;
  handle: string | null;
  score: number | null;
  public: boolean;
}

interface SearchRow {
  handle: string;
  score: number | null;
  following: boolean;
}

/** Pays for a call and returns it. `choose` is asked when several wallets are installed. */
export type UnlockCall = (pickId: string, priceMist: string, choose: (wallets: WalletSummary[]) => Promise<WalletSummary | null>) => Promise<UnlockResult>;

export interface SocialHost {
  /** Missing where there is no wallet to pay with. */
  unlock?: UnlockCall;
  /** Lets the agent wallet buy what it may. Resolves to how many it unlocked. */
  runAgent?: () => Promise<number>;
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

function receiptLine(receipt: UnlockReceipt): HTMLElement {
  const line = el("p", "note premium-receipt");
  line.append(`Paid ${formatSui(receipt.priceMist, 4)} SUI · `, externalLink(shortId(receipt.digest), receipt.url, "link mono"));
  return line;
}

/** The Unlock button, with its status and wallet choice. Calls `done` once the call is open. */
function unlockControl(pickId: string, priceMist: string, unlock: UnlockCall, layout: () => void, done: (call: FeedItem, receipt: UnlockReceipt | null) => void): HTMLElement {
  const node = el("div", "premium-unlock");
  const note = el("p", "note");
  note.setAttribute("aria-live", "polite");
  const picker = el("div", "wallet-row wallet-picker");
  picker.hidden = true;
  const report = (text: string): void => {
    note.textContent = text;
    layout();
  };
  const choose = (wallets: WalletSummary[]): Promise<WalletSummary | null> =>
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
      report("Choose a wallet.");
    });
  const action: HTMLButtonElement = button("Unlock", "button small premium-button", () => {
    void (async () => {
      action.disabled = true;
      report("Waiting for your wallet…");
      const result = await unlock(pickId, priceMist, choose).catch((error: unknown) => ({ ok: false, code: "wallet", walletMessage: String((error as Error)?.message ?? error), maybePaid: false }) as UnlockResult);
      if (result.ok) return done(result.call, result.receipt);
      action.disabled = false;
      report(unlockFailureText(result, (text) => walletErrorText(text, "Nothing was paid.").text));
    })();
  });
  node.append(action, picker, note);
  return node;
}

export function createSocialView(pane: HTMLElement, host: SocialHost): { render(): Promise<void> } {
  let current: SocialSection = "feed";
  let seq = 0;
  const nowMs = (): number => host.now?.() ?? Date.now();

  function lockedRow(entry: FeedEntry, row: HTMLElement): HTMLElement {
    const { item } = entry;
    if (!isLockedItem(item)) return row;
    row.append(el("p", "feed-call feed-premium", premiumLine(item.premium.priceMist)));
    if (item.proof) row.append(externalLink("Proof on Sui", item.proof.url, "link ext"));
    if (host.unlock && item.proof && canTail(item.fixture, nowMs())) {
      row.append(
        unlockControl(item.pickId, item.premium.priceMist, host.unlock, host.layout, (call, receipt) => {
          row.replaceWith(feedRow({ ...entry, item: call }, receipt));
          host.layout();
        }),
      );
    } else if (!item.proof) {
      row.append(el("p", "note", "Waiting for its proof on Sui."));
    }
    return row;
  }

  function feedRow(entry: FeedEntry, receipt: UnlockReceipt | null = null): HTMLElement {
    const { handle, score, item, myCall } = entry;
    const row = el("div", "feed-row");
    const top = el("div", "feed-top");
    top.append(profileLink(handleLine(handle, score), handle), el("span", "feed-time", timeAgo(Date.parse(item.at), nowMs())));
    row.append(top, el("p", "feed-match", matchLine(item.fixture)));
    if (isLockedItem(item)) return lockedRow(entry, row);
    row.append(el("p", "feed-call", callLine(item.lean, item.confidence, item.stakeMist)));
    if (item.premium) row.append(el("p", "note feed-premium", "Premium call"));
    if (receipt) row.append(receiptLine(receipt));
    if (item.tailOf) row.append(el("p", "note", `Tail of @${item.tailOf}`));
    if (myCall) row.append(el("p", "feed-mine", `You: ${callLine(myCall.side, myCall.confidence)}`));
    else if (canTail(item.fixture, nowMs())) row.append(button("Tail", "button small feed-tail", () => host.onTail(handle, item)));
    return row;
  }

  async function renderFeed(slot: HTMLElement, mine: number, agentNote = ""): Promise<void> {
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
        slot.replaceChildren(tools, ...(agentNote ? [el("p", "note agent-note", agentNote)] : []), ...items.map((entry) => feedRow(entry)));
      }
    }
    host.layout();
    if (agentNote || !response.ok || !host.runAgent) return;
    // Once per load, so the redraw below can't start another run.
    const bought = await host.runAgent();
    if (bought > 0 && mine === seq) await renderFeed(slot, mine, `Your agent unlocked ${bought} call${bought === 1 ? "" : "s"}.`);
  }

  function followingRow(row: FollowingRow, reload: () => void): HTMLElement {
    const node = el("div", "follow-row");
    const name = row.handle ? profileLink(handleLine(row.handle, row.score), row.handle) : el("span", "feed-handle mono", shortId(row.address));
    const note = el("span", "note", row.public ? "" : "No longer public");
    const unfollow = button("Unfollow", "button small", () => {
      void (async () => {
        unfollow.disabled = true;
        const response = await host.api<unknown>("/social/unfollow", { address: row.address });
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
export function followedRow(calls: FollowedCall[], consensus: ConsensusView | null, onTail: ((call: OpenFollowedCall) => void) | null, layout: () => void, unlock?: UnlockCall): HTMLElement {
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
    if (isLockedCall(call)) {
      const lean = el("span", "followed-lean", premiumLine(call.premium.priceMist));
      row.append(el("span", "followed-who", `@${call.handle}`), lean);
      if (unlock && call.proof) {
        const control = unlockControl(call.pickId, call.premium.priceMist, unlock, layout, (open, receipt) => {
          lean.textContent = callLine(open.lean, open.confidence, open.stakeMist);
          control.replaceChildren(...(receipt ? [receiptLine(receipt)] : []));
          layout();
        });
        row.append(control);
      }
    } else {
      row.append(el("span", "followed-who", `@${call.handle}`), el("span", "followed-lean", callLine(call.lean, call.confidence, call.stakeMist)));
      if (onTail) row.append(button("Tail", "button small", () => onTail(call)));
    }
    list.append(row);
  }
  node.append(head, list);
  return node;
}
