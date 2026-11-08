// The Back it sheet: stake SUI behind a call. The side comes from the call and cannot
// be changed. The Worker builds the transaction, the background checks it, the wallet
// signs it, and the Worker confirms it from the chain.
import { button, el, externalLink } from "./dom";
import type { ApiError, ApiPath, ApiResponse, RecallCalled } from "./messages";
import type { Sheet } from "./call-sheet";
import {
  amountProblem,
  backsYes,
  feePercent,
  formatSui,
  parseSuiAmount,
  stakeErrorText,
  stakeEstimate,
  walletErrorText,
  type PoolView,
  type StakeErrorBody,
  type StakePositionView,
} from "./stake-logic";
import type { WalletAccess } from "./wallet-access";
import type { ConnectedWallet, WalletSummary } from "./wallet-protocol";

export const TRUST_DOC_URL = "https://github.com/shrooms08/soothia/blob/main/docs/staking-trust.md";

const CHIPS = ["0.1", "0.5", "1", "5"];
const POOL_REFRESH_MS = 15_000;
const CONFIRM_ATTEMPTS = 6;
const CONFIRM_WAIT_MS = 2_000;

export interface BackHost {
  called: RecallCalled;
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  wallet: WalletAccess;
  layout(): void;
  back(): void;
  celebrate?: () => void;
  sound?: (name: "betPlaced" | "softError") => void;
  /** For tests: how a pause between confirm attempts is spent. */
  wait?: (ms: number) => Promise<void>;
}

interface Built {
  txBytes: string;
  summary: { poolId: string; side: string; amountMist: string; multiplierNow: number | null };
}

const pause = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const explorerUrl = (digest: string): string => `https://suivision.xyz/txblock/${encodeURIComponent(digest)}`;

export function openBackSheet(host: BackHost): Sheet {
  const { called } = host;
  const side = backsYes(called);
  const wait = host.wait ?? pause;

  let pool: PoolView | null = null;
  let held = 0n;
  let balance: bigint | null = null;
  let chosen = CHIPS[0];
  let busy = false;
  let disposed = false;
  let finished = false;
  /** Set once the wallet has sent the stake. From here a retry must never sign again. */
  let digest: string | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;

  const form = el("div", "form");
  const outcome = el("div", "outcome");
  outcome.hidden = true;

  const sideRow = el("div", "back-side");
  sideRow.append(el("span", "field-label", "Your call"), el("span", "called-badge", called.side));

  const chipRow = el("div", "back-chips");
  const chipButtons = new Map<string, HTMLButtonElement>();
  for (const value of CHIPS) {
    const chip = button(`${value} SUI`, "button small back-chip", () => {
      chosen = value;
      custom.value = "";
      render();
    });
    chipButtons.set(value, chip);
    chipRow.append(chip);
  }
  const custom = el("input", "input back-custom");
  custom.type = "text";
  custom.inputMode = "decimal";
  custom.placeholder = "Other amount in SUI";
  custom.setAttribute("aria-label", "Other amount in SUI");
  custom.addEventListener("input", () => {
    chosen = custom.value;
    render();
  });
  const amountField = el("div", "field");
  amountField.append(el("span", "field-label", "How much?"), chipRow, custom);

  const problem = el("p", "note back-problem");
  const estimate = el("p", "back-estimate");
  const fee = el("p", "note");
  const schedule = el("p", "note", "Results from ESPN, settled 2h15m after kickoff, 6h challenge window, then claim");
  const notice = el("p", "note back-notice", "Staking may be restricted where you live. Unaudited beta: stake only what you can lose.");
  const trust = externalLink("Who can do what", TRUST_DOC_URL, "link ext");
  form.append(sideRow, amountField, problem, estimate, fee, schedule, notice, trust);

  const picker = el("div", "wallet-row wallet-picker");
  picker.hidden = true;
  const status = el("p", "line status-line");
  status.setAttribute("aria-live", "polite");
  const check = el("p", "note", "Check the amount in your wallet popup before approving.");
  const backButton = button("Back it", "button buy wide", () => void submit());
  const foot = el("div", "sheet-foot");
  foot.append(picker, status, check, backButton);

  const header = el("div", "sheet-head");
  header.append(
    button("‹ Back", "back", () => host.back()),
    el("h3", "sheet-title", "Back it"),
  );
  const node = el("div", "sheet");
  node.append(header, form, outcome, foot);

  function setStatus(text: string, bad = false): void {
    status.textContent = text;
    status.classList.toggle("bad", bad);
    host.layout();
  }

  const amount = (): bigint | null => parseSuiAmount(chosen);

  function currentProblem(): string | null {
    if (!pool) return "Loading the pool…";
    return amountProblem({
      amountMist: amount(),
      limits: pool.limits,
      heldMist: held,
      poolTotalMist: BigInt(pool.yesTotal) + BigInt(pool.noTotal),
      balanceMist: balance,
    });
  }

  function render(): void {
    for (const [value, chip] of chipButtons) chip.classList.toggle("selected", value === chosen);
    const trouble = currentProblem();
    problem.textContent = pool ? (trouble ?? "") : "";
    const stake = amount();
    if (pool && stake !== null && !trouble) {
      const { multiplier, payoutMist } = stakeEstimate(pool, side, stake, held);
      estimate.textContent = `Pays about ${multiplier.toFixed(2)}x right now. About ${formatSui(payoutMist, 4)} SUI back if your side wins. It moves as others stake.`;
    } else {
      estimate.textContent = "";
    }
    if (pool) fee.textContent = `Soothia takes a ${feePercent(pool.feeBps)} fee from the pot.`;
    if (!busy && digest === null) backButton.disabled = trouble !== null;
    host.layout();
  }

  async function loadPool(): Promise<void> {
    const { fixture } = called;
    if (!fixture) return;
    const response = await host.api<PoolView>("/stake/pool", {
      fixture: { home: fixture.home, away: fixture.away, startISO: fixture.startISO },
      subject: fixture.subject,
    });
    if (disposed) return;
    if (response.ok && response.body) pool = response.body as PoolView;
    else if (!pool) setStatus("Couldn't load this pool. Go back and try again.", true);
    render();
  }

  async function loadAccount(wallet: ConnectedWallet): Promise<void> {
    const [balanceResponse, positionsResponse] = await Promise.all([
      host.api<{ balanceMist: string }>("/stake/balance", { address: wallet.address }),
      host.api<{ positions: StakePositionView[] }>("/stake/positions", { address: wallet.address }),
    ]);
    if (disposed) return;
    if (balanceResponse.ok && balanceResponse.body) balance = BigInt((balanceResponse.body as { balanceMist: string }).balanceMist);
    if (positionsResponse.ok && positionsResponse.body) {
      const found = (positionsResponse.body as { positions: StakePositionView[] }).positions.find((position) => position.pickId === called.pickId);
      held = found ? BigInt(found.amountMist) : 0n;
    }
    render();
  }

  function chooseWallet(wallets: WalletSummary[]): Promise<WalletSummary | null> {
    return new Promise((resolve) => {
      picker.replaceChildren(
        ...wallets.map((wallet) =>
          button(wallet.name, "button small", () => {
            picker.hidden = true;
            picker.replaceChildren();
            resolve(wallet);
          }),
        ),
      );
      picker.hidden = false;
      setStatus("Choose a wallet.");
    });
  }

  function fail(text: string, retry: boolean): void {
    busy = false;
    setStatus(text, true);
    backButton.textContent = retry ? "Try again" : "Back it";
    backButton.disabled = !retry;
    custom.disabled = false;
    host.sound?.("softError");
    host.layout();
  }

  function setBusy(text: string): void {
    busy = true;
    backButton.disabled = true;
    custom.disabled = true;
    setStatus(text);
  }

  function showDone(sent: string, stake: bigint): void {
    finished = true;
    form.hidden = true;
    foot.hidden = true;
    outcome.hidden = false;
    outcome.classList.add("success");
    const line = el("p", "question", `Backed ${formatSui(stake)} SUI on ${called.side}. Proof: `);
    line.append(externalLink(`${sent.slice(0, 8)}…`, explorerUrl(sent), "link ext"));
    outcome.append(line, button("Done", "button wide", () => host.back()));
    host.layout();
    host.celebrate?.();
    host.sound?.("betPlaced");
  }

  /** Records a stake the wallet has already sent. Safe to repeat: the Worker ignores a digest it has seen. */
  async function confirm(sent: string, stake: bigint): Promise<void> {
    setBusy("Confirming on Sui…");
    for (let attempt = 1; ; attempt++) {
      const response = await host.api<unknown>("/stake/confirm", { pickId: called.pickId, digest: sent });
      if (disposed) return;
      if (response.ok) {
        busy = false;
        setStatus("");
        showDone(sent, stake);
        return;
      }
      const notSeenYet = response.status === 404 && (response.body as ApiError | null)?.error === "transaction_not_found";
      if (!notSeenYet || attempt >= CONFIRM_ATTEMPTS) break;
      await wait(CONFIRM_WAIT_MS);
      if (disposed) return;
    }
    fail("Your stake went through on Sui, but Soothia couldn't record it yet. Press Try again. You won't be charged twice.", true);
    const proof = externalLink("See it on Sui", explorerUrl(sent), "link ext");
    status.append(" ", proof);
    host.layout();
  }

  async function ensureWallet(): Promise<ConnectedWallet | null> {
    const existing = await host.wallet.current();
    if (existing) return existing;
    setBusy("Connect your wallet…");
    const connected = await host.wallet.connect(chooseWallet);
    if (connected) await loadAccount(connected);
    return connected;
  }

  async function submit(): Promise<void> {
    if (busy || finished) return;
    const stake = amount();
    if (digest !== null && stake !== null) {
      await confirm(digest, stake);
      return;
    }
    if (currentProblem() !== null || stake === null) return;

    let wallet: ConnectedWallet | null;
    try {
      wallet = await ensureWallet();
    } catch (error) {
      const { text, retry } = walletErrorText(String((error as Error)?.message ?? error));
      fail(text, retry);
      return;
    }
    if (disposed) return;
    if (!wallet) {
      fail("No wallet was connected.", true);
      return;
    }
    busy = false;
    const trouble = currentProblem();
    if (trouble !== null) {
      fail(trouble, false);
      backButton.disabled = true;
      render();
      return;
    }

    setBusy("Preparing your stake…");
    const response = await host.api<Built>("/stake/build", { pickId: called.pickId, amountMist: stake.toString(), sender: wallet.address });
    if (disposed) return;
    if (!response.ok || !response.body) {
      const { text, retry } = stakeErrorText(response.status, response.body as StakeErrorBody | null);
      fail(text, retry);
      return;
    }
    const built = response.body as Built;

    setBusy("Waiting for your wallet…");
    try {
      const signed = await host.wallet.sign(wallet, built.txBytes, {
        kind: "stake",
        // The pool we were shown, when there was one, so the Worker can't swap it.
        poolId: pool?.poolId ?? built.summary.poolId,
        side,
        amountMist: stake.toString(),
      });
      digest = signed.digest;
    } catch (error) {
      if (disposed) return;
      const { text, retry } = walletErrorText(String((error as Error)?.message ?? error));
      fail(text, retry);
      return;
    }
    await confirm(digest, stake);
  }

  async function refresh(): Promise<void> {
    if (busy || finished || digest !== null) return;
    await loadPool();
  }

  void (async () => {
    await loadPool();
    const wallet = await host.wallet.current();
    if (wallet && !disposed) await loadAccount(wallet);
  })().catch(() => undefined);
  refreshTimer = setInterval(() => void refresh(), POOL_REFRESH_MS);
  render();

  return {
    node,
    refresh() {
      void refresh();
    },
    dispose() {
      disposed = true;
      if (refreshTimer !== null) clearInterval(refreshTimer);
    },
    trigger: () => void submit(),
  };
}
