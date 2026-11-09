// The Call it sheet: the user's own probability on a claim, saved as a memory on
// Walrus and, when the Worker's spending guard allows, committed on Sui. No wallet
// and no money from the user.
import { button, el, externalLink } from "./dom";
import type { ApiError, ApiPath, ApiResponse, FixtureSignal, RecallCalled, RecallSavedPick, Tile } from "./messages";
import type { TailPrefill } from "./social-logic";
import {
  calledFromPick,
  callBody,
  callErrorMessage,
  overconfidencePoints,
  skipReasonText,
  suggestedPercent,
  type CallSide,
} from "./recall-logic";

/** A panel that replaces the card body. */
export interface Sheet {
  node: HTMLElement;
  /** Wake after being hidden. */
  refresh(): void;
  dispose(): void;
  /** Presses the sheet's main button. */
  trigger?: () => void;
}

export interface CallHost {
  tile: Tile;
  page: { site: string; url: string };
  /** The match on this page, when event mode found one. */
  fixture: FixtureSignal | null;
  /** From the last insights answer. Below 1 means the user runs overconfident. */
  shrink: number;
  /** The calibration lesson's bias, when one exists. */
  calibrationBias(): Promise<number | null>;
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  layout(): void;
  back(): void;
  locked(pick: RecallSavedPick): void;
  celebrate?: () => void;
  sound?: (name: "betPlaced" | "softError") => void;
  /** Starts the sheet from someone else's call. Their side and confidence stay editable. */
  prefill?: TailPrefill;
  /** Offers Back it once the call is locked on Sui. */
  offerBack?: (called: RecallCalled) => void;
}

const MIN_PERCENT = 51;
const MAX_PERCENT = 99;
const DEFAULT_PERCENT = 60;

export function openCallSheet(host: CallHost): Sheet {
  const { claim } = host.tile;
  // A fixture claim whose match is no longer upcoming would save as an unscorable call.
  const closed = claim.fromFixture === true && host.fixture === null;
  const { prefill } = host;
  let side: CallSide = prefill?.side ?? "yes";
  let percent = prefill?.percent ?? DEFAULT_PERCENT;
  let bias: number | null = null;
  let busy = false;
  let disposed = false;

  const form = el("div", "form");
  const outcome = el("div", "outcome");
  outcome.hidden = true;

  const sides = el("div", "sides");
  sides.setAttribute("role", "radiogroup");
  const sideButtons = new Map<CallSide, HTMLButtonElement>();
  for (const kind of ["yes", "no"] as const) {
    const node = button("", `side side-${kind}`, () => {
      side = kind;
      render();
    });
    node.setAttribute("role", "radio");
    node.append(el("span", "side-label", kind.toUpperCase()));
    sideButtons.set(kind, node);
    sides.append(node);
  }

  const value = el("span", "call-value");
  const sliderHead = el("div", "call-slider-head");
  sliderHead.append(el("span", "field-label", "How sure are you?"), value);
  const slider = el("input", "call-slider");
  slider.type = "range";
  slider.min = String(MIN_PERCENT);
  slider.max = String(MAX_PERCENT);
  slider.step = "1";
  slider.value = String(percent);
  slider.setAttribute("aria-label", "How sure are you, in percent");
  slider.addEventListener("input", () => {
    percent = Number(slider.value);
    render();
  });
  const sliderField = el("div", "field");
  sliderField.append(sliderHead, slider);

  const nudgeText = el("p", "note");
  const useButton = button("", "link", () => {
    percent = suggestedPercent(percent, host.shrink);
    slider.value = String(percent);
    render();
  });
  const nudge = el("div", "call-nudge");
  nudge.append(nudgeText, useButton);
  nudge.hidden = host.shrink >= 1;

  if (prefill) form.append(el("p", "tail-label", `Tail of @${prefill.tailOf}`));
  form.append(el("p", "question", claim.question), sides);
  form.append(sliderField, nudge);

  const status = el("p", "line status-line");
  status.setAttribute("aria-live", "polite");
  const lockButton = button("Lock my call", "button buy wide", () => void lock());
  const foot = el("div", "sheet-foot");
  foot.append(status, lockButton);

  const header = el("div", "sheet-head");
  header.append(
    button("‹ Back", "back", () => host.back()),
    el("h3", "sheet-title", "Call it"),
  );
  const node = el("div", "sheet");
  node.append(header, form, outcome, foot);

  function setStatus(text: string): void {
    status.textContent = text;
    host.layout();
  }

  function render(): void {
    for (const [kind, sideNode] of sideButtons) {
      sideNode.classList.toggle("selected", kind === side);
      sideNode.setAttribute("aria-checked", String(kind === side));
    }
    lockButton.dataset.side = side;
    value.textContent = `${side.toUpperCase()} ${percent}%`;
    if (host.shrink < 1) {
      const suggested = suggestedPercent(percent, host.shrink);
      nudgeText.textContent = `You run ${overconfidencePoints(host.shrink, bias)} points overconfident. Soothia suggests ${suggested}%.`;
      useButton.textContent = `Use ${suggested}%`;
      useButton.hidden = suggested === percent;
    }
    host.layout();
  }

  function showSaved(pick: RecallSavedPick): void {
    form.hidden = true;
    outcome.hidden = false;
    outcome.classList.add("success");
    if (pick.commit) {
      outcome.append(
        el("p", "question", "Locked on Sui · remembered on Walrus"),
        externalLink("See the proof on Sui", `https://suivision.xyz/txblock/${encodeURIComponent(pick.commit.digest)}`, "link ext"),
      );
    } else if (pick.commitSkipped) {
      outcome.append(el("p", "question", `Saved to Walrus. Sui proof skipped (${skipReasonText(pick.commitSkipped)}).`));
    } else {
      outcome.append(el("p", "question", "Saved to Walrus. The Sui proof didn't go through this time."));
    }
    if (host.offerBack && pick.commit) {
      const called = calledFromPick(pick);
      outcome.append(button("Back it", "button primary wide", () => host.offerBack?.(called)));
    }
    outcome.append(button("Done", "button wide", () => host.back()));
    host.layout();
  }

  async function lock(): Promise<void> {
    if (busy || closed) return;
    busy = true;
    lockButton.disabled = true;
    setStatus("Locking your call…");
    const response = await host.api<RecallSavedPick>("/recall/pick", callBody(host.tile, side, percent, host.page, host.fixture, prefill ? { tailOf: prefill.tailOf, flip: side !== prefill.side } : undefined));
    busy = false;
    if (response.ok && response.body) {
      const pick = response.body as RecallSavedPick;
      host.locked(pick);
      if (disposed) return;
      status.textContent = "";
      showSaved(pick);
      if (pick.commit) host.celebrate?.();
      host.sound?.("betPlaced");
      return;
    }
    if (disposed) return;
    const { text, retry } = callErrorMessage(response.status, response.body as ApiError | null);
    setStatus(text);
    lockButton.textContent = retry ? "Try again" : "Lock my call";
    lockButton.disabled = !retry;
    host.sound?.("softError");
  }

  if (closed) {
    lockButton.disabled = true;
    status.textContent = "This match has started, so calls are closed.";
  }
  if (host.shrink < 1) {
    void host
      .calibrationBias()
      .then((found) => {
        if (disposed) return;
        bias = found;
        render();
      })
      .catch(() => undefined);
  }
  render();

  return {
    node,
    refresh() {},
    dispose() {
      disposed = true;
    },
    trigger: () => void lock(),
  };
}
