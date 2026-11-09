// The Go public panel on My record: choose a handle, prove the wallet with a signature
// (never a transaction), and later change or leave.
import { button, el, externalLink } from "./dom";
import type { ApiError, ApiPath, ApiResponse } from "./messages";
import type { WalletAccess } from "./wallet-access";
import type { ConnectedWallet, WalletSummary } from "./wallet-protocol";

export const SITE_URL = "https://soothia.fun";
const HANDLE = /^[a-z0-9_]{3,20}$/;

export interface GoPublicHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  wallet: WalletAccess;
  layout(): void;
  /** Told whenever the profile is loaded or changes. */
  onChange?(profile: PublicProfile | null): void;
}

export interface PublicProfile {
  handle: string;
  address: string;
  publicSince: string;
  shareHistory: boolean;
}

type Action = "publish" | "update" | "unpublish";

/** Why a handle can't be used, or null. */
export function handleProblem(text: string): string | null {
  return HANDLE.test(text.trim().toLowerCase()) ? null : "Use 3 to 20 letters, numbers or underscores.";
}

/** A Worker or wallet failure in plain words. */
export function socialErrorText(code: string | undefined, message?: string): string {
  switch (code) {
    case "handle_taken":
      return "That handle is taken. Try another.";
    case "invalid_handle":
      return "Use 3 to 20 letters, numbers or underscores.";
    case "already_public":
      return "This wallet is already public.";
    case "record_already_public":
      return "This record is already public under another wallet.";
    case "challenge_expired":
      return "That took too long. Please try again.";
    case "invalid_signature":
      return "The wallet's signature didn't match. Please try again.";
    case "rate_limited":
      return "Too many tries just now. Wait a minute.";
  }
  if (message && /reject|denied|declined|cancel/i.test(message)) return "You cancelled in your wallet. Nothing changed.";
  return message ? message.slice(0, 140) : "That didn't work. Please try again.";
}

export function createGoPublicPanel(host: GoPublicHost): { node: HTMLElement; load(): Promise<void> } {
  const node = el("section", "record-section go-public");
  node.hidden = true;
  let wallet: ConnectedWallet | null = null;
  let profile: PublicProfile | null = null;
  let busy = false;

  const status = el("p", "note go-public-status");
  status.setAttribute("aria-live", "polite");
  const picker = el("div", "wallet-row wallet-picker");
  picker.hidden = true;

  function say(text: string): void {
    status.textContent = text;
    host.layout();
  }

  function chooseWallet(wallets: WalletSummary[]): Promise<WalletSummary | null> {
    return new Promise((resolve) => {
      picker.replaceChildren(
        ...wallets.map((item) =>
          button(item.name, "button small", () => {
            picker.hidden = true;
            picker.replaceChildren();
            resolve(item);
          }),
        ),
      );
      picker.hidden = false;
      say("Choose a wallet.");
    });
  }

  /** Runs one signed step. True when the Worker accepted it. */
  async function signedStep(action: Action, path: ApiPath, extra: Record<string, unknown>): Promise<ApiResponse<unknown> | null> {
    const current = wallet as ConnectedWallet;
    const challenge = await host.api<{ message: string }>("/social/profile/challenge", { address: current.address, action });
    if (!challenge.ok || !challenge.body) {
      say(socialErrorText((challenge.body as ApiError | null)?.error));
      return null;
    }
    say("Approve the message in your wallet. It isn't a transaction and costs nothing.");
    let signature: string;
    try {
      ({ signature } = await host.wallet.signMessage(current, (challenge.body as { message: string }).message));
    } catch (error) {
      say(socialErrorText(undefined, String((error as Error)?.message ?? error)));
      return null;
    }
    const response = await host.api<unknown>(path, { address: current.address, signature, ...extra });
    if (!response.ok) {
      say(socialErrorText((response.body as ApiError | null)?.error));
      return null;
    }
    return response;
  }

  async function act(run: () => Promise<void>): Promise<void> {
    if (busy) return;
    busy = true;
    for (const control of node.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")) control.disabled = true;
    try {
      await run();
    } catch (error) {
      say(socialErrorText(undefined, String((error as Error)?.message ?? error)));
    }
    busy = false;
    for (const control of node.querySelectorAll<HTMLButtonElement | HTMLInputElement>("button, input")) control.disabled = false;
    host.layout();
  }

  async function ensureWallet(): Promise<boolean> {
    if (wallet) return true;
    wallet = await host.wallet.connect(chooseWallet);
    if (!wallet) return false;
    const found = await lookUp(wallet);
    if (found) {
      profile = found;
      render();
      return false;
    }
    return true;
  }

  function renderPrivate(suggestion: string | null): void {
    const handle = el("input", "input go-public-handle");
    handle.type = "text";
    handle.placeholder = "your_handle";
    handle.maxLength = 20;
    handle.spellcheck = false;
    handle.autocomplete = "off";
    handle.setAttribute("aria-label", "Handle");
    handle.value = suggestion ?? "";
    const toggleRow = el("label", "toggle");
    const share = el("input", "toggle-box");
    share.type = "checkbox";
    toggleRow.append(share, el("span", "toggle-label", "Also show the calls I made before today"));
    const publish = button(wallet ? "Go public" : "Connect wallet to go public", "button small go-public-action", () => {
      void act(async () => {
        const problem = handleProblem(handle.value);
        if (problem) return say(problem);
        if (!(await ensureWallet())) return;
        const done = await signedStep("publish", "/social/profile/publish", { handle: handle.value.trim().toLowerCase() });
        if (!done) return;
        profile = (done.body as { profile: PublicProfile }).profile;
        if (share.checked) {
          say("Approve once more to share your earlier calls.");
          const updated = await signedStep("update", "/social/profile/update", { shareHistory: true });
          if (updated) profile = (updated.body as { profile: PublicProfile }).profile;
        }
        render();
      });
    });
    node.replaceChildren(
      el("h3", "field-label", "Go public"),
      el("p", "note", "Your Call Score and new calls appear on the leaderboard and a public page. Private until you do this."),
      handle,
      toggleRow,
      publish,
      picker,
      status,
    );
  }

  function renderPublic(current: PublicProfile): void {
    const share = el("input", "toggle-box");
    share.type = "checkbox";
    share.checked = current.shareHistory;
    const toggleRow = el("label", "toggle");
    toggleRow.append(share, el("span", "toggle-label", "Also show the calls I made before going public"));
    share.addEventListener("change", () => {
      const wanted = share.checked;
      void act(async () => {
        const updated = await signedStep("update", "/social/profile/update", { shareHistory: wanted });
        if (updated) {
          profile = (updated.body as { profile: PublicProfile }).profile;
          render();
        } else {
          share.checked = !wanted;
        }
      });
    });
    const leave = button("Unpublish", "button small", () => {
      void act(async () => {
        const left = await signedStep("unpublish", "/social/profile/unpublish", {});
        if (left) {
          profile = null;
          render();
          say("You're private again.");
        }
      });
    });
    node.replaceChildren(
      el("h3", "field-label", "Public profile"),
      el("p", "go-public-title", `You're public as @${current.handle}`),
      externalLink("See your page", `${SITE_URL}/u/${encodeURIComponent(current.handle)}`, "link ext"),
      toggleRow,
      leave,
      status,
    );
  }

  let suggestion: string | null = null;
  function render(): void {
    if (profile) renderPublic(profile);
    else renderPrivate(suggestion);
    node.hidden = false;
    host.onChange?.(profile);
    host.layout();
  }

  async function lookUp(current: ConnectedWallet): Promise<PublicProfile | null> {
    const response = await host.api<{ public: boolean; profile?: PublicProfile }>("/social/profile/by-address", { address: current.address });
    const body = response.ok ? (response.body as { public: boolean; profile?: PublicProfile } | null) : null;
    return body?.public && body.profile ? body.profile : null;
  }

  return {
    node,
    async load() {
      wallet = await host.wallet.current().catch(() => null);
      if (wallet) {
        profile = await lookUp(wallet);
        if (!profile) {
          const names = await host.api<{ suggestion: string | null }>("/social/suins", { address: wallet.address });
          suggestion = names.ok ? ((names.body as { suggestion: string | null } | null)?.suggestion ?? null) : null;
        }
      }
      render();
    },
  };
}
