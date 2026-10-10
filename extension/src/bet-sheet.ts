// The bet sheet: YES or NO on an open market during its buying window.
// quote -> build -> simulate -> Phantom signs -> send -> confirm -> Panta
// records it. Money moves only in the send step, and only with Dry run off.
import { button, el, externalLink, shortAddress } from "./dom";
import type {
  ApiError,
  ApiPath,
  ApiResponse,
  Balances,
  BuyBuild,
  BuyQuote,
  BuyStatus,
  BuyTarget,
  Simulation,
} from "./messages";
import { BET_CHIPS, MAX_BET_USDC, MIN_BET_USDC, MIN_SOL_FOR_BET } from "./rules";
import type { CreateDebug, Sheet } from "./sheet";
import { checkSignedTransaction } from "./tx-check";
import { wallet } from "./wallet-client";

export interface BetHost {
  target: BuyTarget;
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  settings(): { dryRun: boolean };
  debug(update: Partial<CreateDebug>): void;
  layout(): void;
  isVisible(): boolean;
  back(): void;
}

type Side = "yes" | "no";

const QUOTE_DEBOUNCE_MS = 700;
// Panta's buy quotes last about 90 seconds.
const QUOTE_REFRESH_BEFORE_MS = 15_000;
const QUOTE_MIN_TO_START_MS = 25_000;
const MAX_AUTO_REFRESHES = 5;
const CONFIRM_WAIT_MS = 90_000;
const STEPS = ["Signing", "Sending", "Confirming", "Recording"] as const;
type Step = (typeof STEPS)[number];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const usd = (value: number): string => `$${value.toFixed(2)}`;
const pct = (price: number | null): string => (price === null ? "–" : `${Math.round(price * 100)}%`);

function problem(response: ApiResponse<unknown>): string {
  const error = (response.body ?? {}) as ApiError;
  if (response.status === 0) return "I couldn't reach Soothia's server. Check your connection.";
  if (response.status === 429) return "Too many requests just now. Try again in a minute.";
  switch (error.error) {
    case "market_not_in_primary":
      return "This market's buying window has closed.";
    case "amount_too_small":
      return "That amount is below Panta's minimum.";
    case "bad_amount":
      return error.message ?? `Bets are between ${usd(MIN_BET_USDC)} and ${usd(MAX_BET_USDC)}.`;
    case "quote_stale":
      return "The price moved. Getting a fresh quote.";
    default:
      return error.message || "I couldn't get a price just now.";
  }
}

export function openBetSheet(host: BetHost): Sheet {
  let target = host.target;
  let side: Side = "yes";
  let amount = "1.00";
  let address: string | null = null;
  let balances: Balances | null = null;
  let quote: BuyQuote | null = null;
  let quoteError = "";
  let quoting = false;
  let quoteSeq = 0;
  let autoRefreshes = 0;
  let busy = false;
  let disposed = false;
  let quoteTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  const form = el("div", "form");
  const outcome = el("div", "outcome");
  outcome.hidden = true;

  const title = el("p", "question", target.title);
  const sides = el("div", "sides");
  const sideButtons = new Map<Side, HTMLButtonElement>();
  for (const kind of ["yes", "no"] as const) {
    const node = button("", `side side-${kind}`, () => {
      side = kind;
      renderSides();
      requestQuote(0);
    });
    sideButtons.set(kind, node);
    sides.append(node);
  }

  const chips = el("div", "chips");
  const customInput = el("input", "input amount");
  customInput.type = "number";
  customInput.min = String(MIN_BET_USDC);
  customInput.max = String(MAX_BET_USDC);
  customInput.step = "0.01";
  customInput.placeholder = "Custom";
  for (const value of BET_CHIPS) {
    chips.append(
      button(`$${value}`, "chip-button", () => {
        amount = value.toFixed(2);
        customInput.value = "";
        renderChips();
        requestQuote(0);
      }),
    );
  }
  chips.append(customInput);

  const quoteBox = el("div", "fee");
  const payout = el("p", "muted");
  const walletRow = el("div", "wallet");
  const missing = el("p", "warn");
  const buyButton = button("Buy", "button primary wide", () => void buy());
  const status = el("p", "line status-line");
  status.setAttribute("aria-live", "polite");
  const steps = el("ol", "steps");
  steps.hidden = true;

  form.append(title, sides, el("span", "field-label", "Amount"), chips, quoteBox, payout, walletRow, missing, buyButton);
  const header = el("div", "sheet-head");
  header.append(button("‹ Back", "link", () => host.back()), el("h3", "sheet-title", "Place a bet"));
  const node = el("div", "sheet");
  node.append(header, form, outcome, steps, status);

  // ---- Rendering ----

  function setStatus(text: string): void {
    status.textContent = text;
    host.layout();
  }

  function showSteps(active: Step | "done" | null, failed = false): void {
    steps.hidden = active === null;
    const index = active === "done" ? STEPS.length : active === null ? -1 : STEPS.indexOf(active);
    steps.replaceChildren(
      ...STEPS.map((name, position) => {
        const item = el("li", "step", name);
        item.dataset.state = position < index ? "done" : position === index ? (failed ? "error" : "active") : "todo";
        return item;
      }),
    );
    host.layout();
  }

  function renderSides(): void {
    for (const [kind, node] of sideButtons) {
      const price = kind === "yes" ? target.yesPrice : target.noPrice;
      node.textContent = `${kind.toUpperCase()} ${pct(price)}`;
      node.title = price === null ? "No price yet" : `${usd(price)} per share`;
      node.classList.toggle("selected", kind === side);
      node.setAttribute("aria-pressed", String(kind === side));
    }
  }

  function renderChips(): void {
    for (const chip of chips.querySelectorAll<HTMLButtonElement>(".chip-button")) {
      chip.classList.toggle("selected", Number(chip.textContent!.slice(1)).toFixed(2) === amount && !customInput.value);
    }
  }

  function renderWallet(): void {
    if (!address) {
      walletRow.replaceChildren(button("Connect Phantom", "button", () => void connect()));
      return;
    }
    const holdings = balances
      ? `${balances.sol.toFixed(3)} SOL · ${balances.usdc.toFixed(2)} USDC`
      : "checking balances…";
    const who = el("span", "wallet-address", shortAddress(address));
    who.title = address;
    walletRow.replaceChildren(who, el("span", "wallet-holdings", holdings), button("Disconnect", "link", () => void disconnect()));
  }

  function renderQuote(): void {
    if (!address) quoteBox.replaceChildren("Connect Phantom to see the price.");
    else if (quote) {
      quoteBox.replaceChildren(
        `You get ~${quote.shares.toFixed(2)} ${quote.side.toUpperCase()} shares at ~${usd(quote.avgPrice)} each. Fee ${usd(quote.feeUsdc)}. `,
        el("strong", "fee-total", `Total ${usd(quote.totalUsdc)}.`),
      );
      const win = quote.shares * quote.payoutPerShareUsdc;
      payout.textContent = `If ${quote.side.toUpperCase()} wins, each share pays ~${usd(quote.payoutPerShareUsdc)}: about ${usd(win)} back on ${usd(quote.totalUsdc)} spent.`;
    } else if (quoting) quoteBox.replaceChildren("Getting the price…");
    else if (quoteError) quoteBox.replaceChildren(quoteError, " ", button("Try again", "link", () => requestQuote(0)));
    else quoteBox.replaceChildren("");
    if (!quote) payout.textContent = "";
  }

  function shortfall(): string {
    if (!balances || !quote) return "";
    const usdc = Math.max(0, quote.totalUsdc - balances.usdc);
    const sol = Math.max(0, MIN_SOL_FOR_BET - balances.sol);
    const parts: string[] = [];
    if (usdc > 0) parts.push(`${(Math.ceil(usdc * 100) / 100).toFixed(2)} USDC`);
    if (sol > 0) parts.push(`${(Math.ceil(sol * 10000) / 10000).toFixed(4)} SOL`);
    return parts.join(" and ");
  }

  function renderGate(): void {
    const { dryRun } = host.settings();
    const short = shortfall();
    missing.textContent = short ? `This wallet is missing ${short}. Add it, then come back.` : "";
    buyButton.textContent = dryRun
      ? `Buy ${side.toUpperCase()} (dry run, nothing is sent)`
      : quote
        ? `Buy ${side.toUpperCase()} · ${usd(quote.totalUsdc)}`
        : `Buy ${side.toUpperCase()}`;
    buyButton.disabled = busy || !address || !quote || !balances || short !== "";
  }

  function render(): void {
    renderSides();
    renderChips();
    renderWallet();
    renderQuote();
    renderGate();
    host.layout();
  }

  // ---- Quote ----

  async function fetchQuote(): Promise<BuyQuote | null> {
    if (!address) return null;
    clearTimeout(quoteTimer);
    clearTimeout(expiryTimer);
    const seq = ++quoteSeq;
    quoting = true;
    render();
    const response = await host.api<BuyQuote>("/buy/quote", {
      wallet: address,
      marketId: target.marketId,
      side,
      amountUsdc: amount,
    });
    if (disposed || seq !== quoteSeq) return null;
    quoting = false;
    if (response.ok && response.body) {
      quote = response.body as BuyQuote;
      quoteError = "";
      host.debug({
        quote: `${quote.side} ${usd(quote.totalUsdc)} -> ${quote.shares.toFixed(4)} shares at ${quote.avgPrice.toFixed(4)}, fee ${usd(quote.feeUsdc)}, expires ${quote.expiresAt.slice(11, 19)} UTC`,
      });
      expiryTimer = setTimeout(onQuoteExpiring, Math.max(1000, Date.parse(quote.expiresAt) - Date.now() - QUOTE_REFRESH_BEFORE_MS));
    } else {
      quote = null;
      quoteError = problem(response);
      host.debug({ quote: `failed (${response.status}): ${(response.body as ApiError | null)?.error ?? "no response"}` });
    }
    render();
    return quote;
  }

  function onQuoteExpiring(): void {
    if (disposed || busy) return;
    if (host.isVisible() && autoRefreshes < MAX_AUTO_REFRESHES) {
      autoRefreshes++;
      void fetchQuote();
    } else {
      quote = null;
      quoteError = "The price quote expired.";
      render();
    }
  }

  function requestQuote(delayMs = QUOTE_DEBOUNCE_MS): void {
    clearTimeout(quoteTimer);
    if (!address) return;
    autoRefreshes = 0;
    quote = null;
    quoteError = "";
    quoteSeq++;
    quoting = true;
    render();
    quoteTimer = setTimeout(() => void fetchQuote(), delayMs);
  }

  // ---- Wallet ----

  async function loadBalances(): Promise<void> {
    if (!address) return;
    const owner = address;
    const response = await host.api<Balances>("/wallet/balances", { wallet: owner });
    if (disposed || owner !== address) return;
    balances = response.ok ? (response.body as Balances) : null;
    host.debug({ wallet: balances ? `${owner} (${balances.sol} SOL, ${balances.usdc} USDC)` : `${owner} (balances unavailable)` });
    render();
  }

  function setAddress(next: string | null): void {
    address = next;
    balances = null;
    quote = null;
    quoteError = "";
    host.debug({ wallet: next ?? "not connected" });
    render();
    if (next) {
      void loadBalances();
      requestQuote(0);
    }
  }

  async function connect(): Promise<void> {
    setStatus("Approve the connection in Phantom.");
    const result = await wallet.connect();
    if (disposed) return;
    if (result.ok && result.publicKey) {
      setStatus("");
      setAddress(result.publicKey);
    } else if (!result.ok && result.reason === "rejected") setStatus("Connection cancelled.");
    else if (!result.ok && result.reason === "no_wallet") setStatus("Phantom isn't installed in this browser.");
    else setStatus("Phantom didn't answer. Open Phantom and try again.");
  }

  async function disconnect(): Promise<void> {
    await wallet.disconnect();
    if (!disposed) setAddress(null);
  }

  // ---- Buy ----

  async function buy(): Promise<void> {
    if (busy || !address) return;
    busy = true;
    render();
    try {
      await run(address);
    } finally {
      busy = false;
      if (!disposed) render();
    }
  }

  async function run(owner: string): Promise<void> {
    const { dryRun } = host.settings();
    for (let round = 1; round <= 2; round++) {
      showSteps(null);
      let current = quote;
      if (!current || Date.parse(current.expiresAt) - Date.now() < QUOTE_MIN_TO_START_MS) {
        setStatus("Getting a fresh price…");
        current = await fetchQuote();
        if (disposed) return;
        if (!current) return setStatus(quoteError);
      }

      setStatus("Preparing your transaction…");
      const built = await host.api<BuyBuild>("/buy/build", { wallet: owner, quoteId: current.quoteId });
      if (disposed) return;
      if (!built.ok || !built.body) {
        const code = (built.body as ApiError | null)?.error;
        if ((code === "quote_stale" || code === "quote_expired") && round === 1) {
          quote = null;
          continue;
        }
        return setStatus(problem(built));
      }
      const { txBase64, orderId, bytes } = built.body as BuyBuild;

      const simulated = await host.api<Simulation>("/tx/simulate", { txBase64 });
      if (disposed) return;
      const simulation = simulated.ok ? (simulated.body as Simulation) : null;
      host.debug({
        simulate: !simulation
          ? `could not simulate (${simulated.status})`
          : simulation.ok
            ? `built ${bytes} bytes; ok, ${simulation.unitsConsumed ?? "?"} compute units`
            : `built ${bytes} bytes; failed: ${simulation.logLine ?? JSON.stringify(simulation.err)}`,
      });
      if (!simulation?.ok) {
        return setStatus(simulation?.reason ?? "I couldn't test this transaction, so nothing was sent. Try again in a moment.");
      }

      showSteps("Signing");
      setStatus("Approve the purchase in Phantom.");
      const signed = await wallet.signTransaction(txBase64);
      if (disposed) return;
      if (!signed.ok || !signed.signedTxBase64 || !signed.signature) {
        showSteps(null);
        return setStatus(
          !signed.ok && signed.reason === "rejected" ? "Cancelled in Phantom. Nothing was sent." : "Phantom couldn't sign this. Nothing was sent.",
        );
      }
      const checked = checkSignedTransaction(txBase64, signed.signedTxBase64);
      if (!checked.ok) {
        host.debug({ signature: `refused, not sent: ${checked.problem} (${checked.detail})` });
        showSteps(null);
        return setStatus("The transaction Phantom signed is not the one Soothia built. Nothing was sent.");
      }
      if (dryRun) {
        host.debug({ signature: `${signed.signature} (dry run, not sent; ${checked.bytes} bytes)`, register: "not attempted (dry run)" });
        showSteps(null);
        return setStatus("Dry run complete: Phantom signed it, nothing was sent.");
      }

      showSteps("Sending");
      setStatus("Sending to Solana…");
      host.debug({ signature: signed.signature, register: "sending" });
      const sent = await host.api<BuyStatus>("/buy/send", { signedTxBase64: signed.signedTxBase64, orderId });
      if (disposed) return;
      if (!sent.ok && sent.status !== 0) {
        const error = (sent.body ?? {}) as ApiError;
        if (error.error === "blockhash_expired" && round === 1) {
          quote = null;
          setStatus("That took a while and the transaction expired before it was sent. Nothing was charged. One more time.");
          continue;
        }
        showSteps("Sending", true);
        return setStatus(error.reason ?? "Solana didn't accept the transaction. Nothing was charged.");
      }
      await follow(orderId, signed.signature, sent.ok ? (sent.body as BuyStatus) : null);
      return;
    }
    showSteps(null);
    setStatus("That didn't go through. Nothing was charged. Try again when you're ready.");
  }

  async function follow(orderId: string, signature: string, first: BuyStatus | null): Promise<void> {
    form.hidden = true;
    showSteps("Confirming");
    setStatus("Waiting for Solana to confirm…");
    let result = first;
    const deadline = Date.now() + CONFIRM_WAIT_MS;
    while ((!result || result.status === "pending") && Date.now() < deadline) {
      const response = await host.api<BuyStatus>("/buy/status", { signature, orderId });
      if (disposed) return;
      if (response.ok && response.body) result = response.body as BuyStatus;
      else await sleep(3000);
    }
    if (disposed) return;
    const solscan = externalLink("Transaction on Solscan", `https://solscan.io/tx/${signature}`, "link block");

    if (!result || result.status === "pending") {
      host.debug({ register: "still unconfirmed" });
      setStatus("");
      outcome.replaceChildren(
        el("p", "line", "Solana hasn't confirmed it yet. Don't buy again: your transaction is still on its way."),
        button("Check again", "button", () => {
          busy = true;
          void follow(orderId, signature, null).finally(() => (busy = false));
        }),
        solscan,
      );
    } else if (result.status === "failed") {
      host.debug({ register: "transaction failed on-chain" });
      showSteps("Confirming", true);
      setStatus("");
      outcome.replaceChildren(el("p", "line", "The transaction failed on Solana. No USDC was taken."), solscan, button("Back", "link", () => host.back()));
    } else {
      const recorded = result.submitted || result.attributed;
      const issues = Object.entries(result.errors).map(([step, code]) => `${step}: ${code}`).join(", ");
      host.debug({ register: recorded ? `recorded (${result.verified ?? "verified"}, attributed ${result.attributed})${issues ? `; ${issues}` : ""}` : `on-chain, not recorded (${issues})` });
      showSteps(recorded ? "done" : "Recording", !recorded);
      setStatus("");
      const actions = el("div", "actions");
      actions.append(externalLink("View on Panta", result.marketUrl, "button primary"), button("Done", "button", () => host.back()));
      outcome.replaceChildren(
        el("h3", "sheet-title", "Bet placed"),
        el("p", "question", target.title),
        el(
          "p",
          "line",
          `${quote ? `~${quote.shares.toFixed(2)} ` : ""}${side.toUpperCase()} shares are yours${quote ? ` for ${usd(quote.totalUsdc)} (${usd(quote.amountUsdc)} stake + ${usd(quote.feeUsdc)} fee)` : ""}.${recorded ? "" : " Panta's records are catching up; the shares are on-chain."}`,
        ),
        actions,
        solscan,
      );
    }
    outcome.hidden = false;
    host.layout();
  }

  // ---- Inputs ----

  customInput.addEventListener("input", () => {
    const value = Number(customInput.value);
    if (!Number.isFinite(value) || value < MIN_BET_USDC || value > MAX_BET_USDC) {
      renderChips();
      return;
    }
    amount = value.toFixed(2);
    renderChips();
    requestQuote();
  });

  host.debug({ wallet: "not connected", quote: "–", simulate: "–", signature: "–", register: "–" });
  render();
  // Fresh title and prices for the side buttons.
  void host.api<BuyTarget>("/market", { id: target.marketId }).then((response) => {
    if (disposed || !response.ok || !response.body) return;
    const fresh = response.body as BuyTarget;
    target = { ...target, title: fresh.title || target.title, yesPrice: fresh.yesPrice, noPrice: fresh.noPrice };
    title.textContent = target.title;
    renderSides();
  });
  void wallet.publicKey().then((found) => {
    if (!disposed && found && !address) setAddress(found);
  });

  return {
    node,
    refresh(): void {
      if (disposed) return;
      if (address && !quote && !quoting && !busy && quoteError === "The price quote expired.") requestQuote(0);
      else render();
    },
    dispose(): void {
      disposed = true;
      clearTimeout(quoteTimer);
      clearTimeout(expiryTimer);
    },
  };
}
