// The review sheet: what the user sees between "Make it a market" and a live
// market. It owns the create flow: quote -> build -> simulate -> Phantom
// signs -> send -> confirm -> register. Money moves only in the send step,
// and only when Dry run is off.
import { betLink } from "./config";
import { button, copyButton, domainName, el, externalLink, icon, shortAddress, starSvg, withMono } from "./dom";
import type {
  ApiError,
  ApiPath,
  ApiResponse,
  Balances,
  Build,
  FinishResult,
  Quote,
  Simulation,
  Tile,
} from "./messages";
import {
  BREAKING_MAX_BUY_WINDOW_HOURS,
  BUY_WINDOW_CHOICES,
  CATEGORIES,
  DEFAULT_BUY_WINDOW_HOURS,
  DEFAULT_MARKET_TYPE,
  LIVE_NOW,
  MAX_END_HORIZON_MS,
  MIN_END_LEAD_MS,
  MIN_SOL_FOR_CREATE,
  QUESTION_MAX_LENGTH,
  type MarketType,
} from "./rules";
import { checkSignedTransaction } from "./tx-check";
import { wallet } from "./wallet-client";

/** Lines the debug footer shows about the create flow. */
export interface CreateDebug {
  wallet: string;
  quote: string;
  simulate: string;
  signature: string;
  register: string;
}

/** A sent transaction whose market is not yet confirmed as registered. */
export interface PendingCreate {
  quoteId: string;
  signature: string;
  question: string;
}

export interface SheetHost {
  tile: Tile;
  pageUrl: string;
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  image(category: string): Promise<string | null>;
  settings(): { dryRun: boolean; skipChecks: boolean };
  debug(update: Partial<CreateDebug>): void;
  /** The sheet changed height. */
  layout(): void;
  isVisible(): boolean;
  back(): void;
  created(market: { marketId: string; marketUrl: string }): void;
  /** Open the bet sheet for a market (the success screen's "Bet on it"). */
  bet(target: { marketId: string; title: string }): void;
  /** A sound cue: a real success, a dry-run completion, or a soft error. */
  sound?: (name: "marketLive" | "open" | "softError") => void;
  savePending(pending: PendingCreate | null): void;
}

export interface Sheet {
  node: HTMLElement;
  /** Re-read settings (the debug toggles changed) or wake after being hidden. */
  refresh(): void;
  dispose(): void;
  /** Presses the sheet's main button. Used by the localhost screenshot harness. */
  trigger?: () => void;
}

const QUOTE_DEBOUNCE_MS = 900;
// Ask for a new quote when the current one has less than this left.
const QUOTE_REFRESH_BEFORE_MS = 30_000;
// Start the create flow only with this much session left: build, simulate,
// and a person reading a Phantom popup all have to fit.
const QUOTE_MIN_TO_START_MS = 120_000;
// Never send a signed transaction with less than this left. Panta may refuse
// to register a market whose session ran out, after the fee was paid.
const QUOTE_MIN_TO_SEND_MS = 45_000;
const MAX_AUTO_REFRESHES = 5;
const CONFIRM_WAIT_MS = 90_000;
const MAX_SIGN_ROUNDS = 3;

const STEPS = ["Signing", "Sending", "Confirming", "Registering"] as const;
type Step = (typeof STEPS)[number];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function amount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function msLeft(quote: Quote): number {
  return Date.parse(quote.expiresAt) - Date.now();
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function quoteProblem(response: ApiResponse<Quote | ApiError>): string {
  const error = (response.body ?? {}) as ApiError;
  if (response.status === 0) return "I couldn't reach Soothia's server. Check your connection.";
  if (response.status === 429) return "Too many requests just now. Try again in a minute.";
  switch (error.error) {
    case "invalid_draft":
      return error.message ?? "Something in the market details needs fixing.";
    case "duplicate_market":
      return "This wallet has already made a market with this exact question. Change the wording to make a new one.";
    case "create_not_permitted":
      return "Market creation is switched off for Soothia right now.";
    case "invalid_market_params":
      return error.message && !error.message.includes("unexpected")
        ? error.message
        : "Panta is busy. Try again in a few seconds.";
    default:
      return "I couldn't get the fee just now.";
  }
}

export function openSheet(host: SheetHost): Sheet {
  const { claim } = host.tile;

  let question = claim.question;
  let category: string = claim.category;
  let endTime = claim.endTime;
  let marketType: MarketType = DEFAULT_MARKET_TYPE;
  // Hours until buying closes, or LIVE_NOW for an event already under way.
  let buyWindow: number | typeof LIVE_NOW = claim.eventLive ? LIVE_NOW : DEFAULT_BUY_WINDOW_HOURS;
  let address: string | null = null;
  let balances: Balances | null = null;
  let quote: Quote | null = null;
  let quoteError = "";
  let quoting = false;
  let quoteSeq = 0;
  let autoRefreshes = 0;
  let shownImage = "";
  let busy = false;
  let disposed = false;
  let quoteTimer: ReturnType<typeof setTimeout> | undefined;
  let expiryTimer: ReturnType<typeof setTimeout> | undefined;

  // ---- Review form ----

  const form = el("div", "form");
  const outcome = el("div", "outcome");
  outcome.hidden = true;

  const questionInput = el("textarea", "input");
  questionInput.rows = 3;
  questionInput.maxLength = QUESTION_MAX_LENGTH;
  questionInput.value = question;
  const counter = el("span", "counter");

  const categorySelect = el("select", "input");
  for (const name of CATEGORIES) {
    const option = el("option", "", name);
    option.value = name;
    categorySelect.append(option);
  }
  categorySelect.value = category;

  const dateInput = el("input", "input");
  dateInput.type = "date";
  dateInput.min = utcDay(Date.now() + MIN_END_LEAD_MS);
  dateInput.max = utcDay(Date.now() + MAX_END_HORIZON_MS);
  dateInput.value = endTime.slice(0, 10);

  // Market type: two radio cards. Fees shown here come from the live quote
  // once there is one; until then the labels carry the known prices.
  const typeGroup = el("div", "types");
  const typeInputs = new Map<MarketType, HTMLInputElement>();
  const typeFees = new Map<MarketType, HTMLElement>();
  const TYPE_COPY: Record<MarketType, { name: string; fee: string; blurb: string }> = {
    breaking: {
      name: "Breaking",
      fee: "20 USDC",
      blurb: "People can buy YES/NO until the buying window closes, then shares trade between people until it resolves.",
    },
    standard: {
      name: "Standard",
      fee: "50 USDC",
      blurb: "For events more than 3 days away that need a longer buying window.",
    },
  };
  for (const kind of ["breaking", "standard"] as const) {
    const card = el("label", "type");
    const input = el("input", "type-box");
    input.type = "radio";
    input.name = "soothia-market-type";
    input.value = kind;
    input.checked = kind === marketType;
    const feeLabel = el("span", "type-fee", TYPE_COPY[kind].fee);
    const head = el("span", "type-name", TYPE_COPY[kind].name);
    head.append(feeLabel);
    const text = el("span", "type-text");
    text.append(head, el("span", "type-blurb", TYPE_COPY[kind].blurb));
    card.append(input, text);
    typeGroup.append(card);
    typeInputs.set(kind, input);
    typeFees.set(kind, feeLabel);
  }

  const windowSelect = el("select", "input");
  function fillWindowChoices(): void {
    const current = String(buyWindow);
    windowSelect.replaceChildren();
    if (claim.eventLive && marketType === "breaking") {
      const live = el("option", "", "Live now (closes at once)");
      live.value = LIVE_NOW;
      windowSelect.append(live);
    }
    for (const choice of BUY_WINDOW_CHOICES) {
      if (marketType === "breaking" && choice.hours > BREAKING_MAX_BUY_WINDOW_HOURS) continue;
      const option = el("option", "", choice.label);
      option.value = String(choice.hours);
      windowSelect.append(option);
    }
    windowSelect.value = current;
    if (windowSelect.value !== current) {
      // The old choice is not offered for this type (a week on a breaking market).
      buyWindow = DEFAULT_BUY_WINDOW_HOURS;
      windowSelect.value = String(buyWindow);
    }
  }
  fillWindowChoices();

  const rule = el("details", "rule");
  const ruleText = el("p", "rule-text", "Connect Phantom to see the exact rule Panta will receive.");
  const sources = el("ul", "sources");
  const resolver = el("p", "note", "Panta's AI resolver settles it from these sources, with a 1-hour dispute window.");
  const ruleBody = el("div", "rule-body");
  ruleBody.append(sources, resolver, ruleText);
  rule.append(el("summary", "rule-summary", "How it resolves"), ruleBody);
  rule.addEventListener("toggle", () => host.layout());
  // The category image is still fetched; the sheet's design does not show it, so it stays hidden.
  const image = el("img", "thumb");
  image.alt = "";
  image.hidden = true;

  const walletRow = el("div", "wallet");
  // Says what was shortened so the text fits in one Solana transaction.
  const fitNote = el("p", "note fit-note");
  const missing = el("p", "warn");
  const fee = el("div", "fee");
  const createButton = button("Create market", "button primary wide", () => void create());
  const status = el("p", "line status-line");
  status.setAttribute("aria-live", "polite");
  const steps = el("ol", "steps");
  steps.hidden = true;

  function field(label: string, control: HTMLElement, extra?: HTMLElement): HTMLElement {
    const wrap = el("label", "field");
    const head = el("span", "field-label", label);
    if (extra) head.append(extra);
    wrap.append(head, control);
    return wrap;
  }

  const row = el("div", "field-row");
  row.append(field("Buying window closes", windowSelect), field("Ends (UTC date)", dateInput));
  const typeField = el("div", "field");
  typeField.append(el("span", "field-label", "Market type"), typeGroup);

  form.append(
    field("Question", questionInput, counter),
    typeField,
    row,
    field("Category", categorySelect),
    rule,
    walletRow,
    fee,
    fitNote,
    missing,
    image,
  );

  const header = el("div", "sheet-head");
  header.append(button("‹ Back", "back", () => host.back()), el("h3", "sheet-title", "Make it a market"));

  // The create button sits in a footer that stays put while the form scrolls.
  const foot = el("div", "sheet-foot");
  foot.append(status, createButton);
  const node = el("div", "sheet");
  node.append(header, form, outcome, steps, foot);

  // ---- Rendering ----

  function setStatus(text: string): void {
    status.textContent = text;
    host.layout();
  }

  /** Marks `active` as in progress and everything before it as done. */
  function showSteps(active: Step | "done" | null, failed = false): void {
    steps.hidden = active === null;
    const index = active === "done" ? STEPS.length : active === null ? -1 : STEPS.indexOf(active);
    steps.replaceChildren(
      ...STEPS.map((name, position) => {
        const state = position < index ? "done" : position === index ? (failed ? "error" : "active") : "todo";
        const item = el("li", "step");
        item.dataset.state = state;
        item.append(el("span", "step-icon"), el("span", "step-label", state === "active" ? `${name}…` : name));
        return item;
      }),
    );
    host.layout();
  }

  function renderWallet(): void {
    walletRow.classList.toggle("disconnected", !address);
    if (!address) {
      const connectButton = button("Connect Phantom", "button connect", () => void connect());
      connectButton.prepend(el("span", "phantom-badge", "P"));
      walletRow.replaceChildren(connectButton);
      return;
    }
    const holdings = balances
      ? `${balances.sol.toFixed(4)} SOL · ${balances.usdc.toFixed(2)} USDC`
      : "checking balances…";
    const who = el("span", "wallet-address", shortAddress(address));
    who.title = address;
    const text = el("span", "wallet-text");
    text.append(who, el("span", "wallet-holdings", holdings));
    walletRow.replaceChildren(el("span", "wallet-dot"), text, button("Disconnect", "ghost", () => void disconnect()));
  }

  function renderFee(): void {
    if (!address) fee.replaceChildren("Connect Phantom to see the live fee.");
    else if (quote) {
      const { paymentUsdc, breakdown } = quote;
      const row = (label: string, value: string, total = false): HTMLElement => {
        const line = el("div", total ? "fee-row total" : "fee-row", label);
        line.append(el("span", "mono", value));
        return line;
      };
      fee.replaceChildren(
        row("Total", `${amount(paymentUsdc)} USDC`, true),
        row("Seeds your market's liquidity", amount(breakdown.liquidityUsdc)),
        row("Panta's fee", amount(breakdown.platformFeeUsdc)),
      );
    } else if (quoting) fee.replaceChildren("Getting the live fee…");
    else if (quoteError) fee.replaceChildren(quoteError, " ", button("Try again", "link", () => requestQuote(0)));
    else fee.replaceChildren("");
  }

  /** What the wallet lacks for this quote, or "" when it has enough (or is unknown). */
  function shortfall(): string {
    if (!balances || !quote) return "";
    // The USDC needed is whatever Panta just quoted; the SOL covers rent and fees.
    const usdc = Math.max(0, quote.paymentUsdc - balances.usdc);
    const sol = Math.max(0, MIN_SOL_FOR_CREATE - balances.sol);
    const parts: string[] = [];
    if (usdc > 0) parts.push(`${(Math.ceil(usdc * 100) / 100).toFixed(2)} USDC`);
    if (sol > 0) parts.push(`${(Math.ceil(sol * 10000) / 10000).toFixed(4)} SOL`);
    return parts.join(" and ");
  }

  function renderGate(): void {
    const { dryRun, skipChecks } = host.settings();
    const short = shortfall();
    const overridden = short !== "" && dryRun && skipChecks;
    if (!short) missing.replaceChildren();
    else {
      const text = el("span", "");
      text.append(
        ...withMono(
          overridden
            ? `This wallet is missing ${short}. Dry run: balance check skipped.`
            : `This wallet is missing ${short}. Add it, then come back.`,
        ),
      );
      missing.replaceChildren(icon("warn"), text);
    }
    createButton.classList.toggle("dry", dryRun);
    createButton.classList.toggle("primary", !dryRun);
    createButton.replaceChildren(
      ...(dryRun
        ? ["Create (dry run, nothing is sent)"]
        : quote
          ? ["Create market · ", el("span", "mono", `${amount(quote.paymentUsdc)} USDC`)]
          : ["Create market"]),
    );
    const blocked = busy || !address || !quote || !balances || (short !== "" && !overridden);
    createButton.disabled = blocked;
  }

  function render(): void {
    counter.textContent = `${questionInput.value.length}/${QUESTION_MAX_LENGTH}`;
    counter.classList.toggle("over", questionInput.value.length >= QUESTION_MAX_LENGTH);
    renderWallet();
    renderFee();
    renderGate();
    host.layout();
  }

  function showQuoteDetails(next: Quote): void {
    // The Worker may have trimmed the question; show exactly what the market will say.
    if (next.question !== question) {
      question = next.question;
      questionInput.value = next.question;
    }
    const link = /(^|\.)(x|twitter)\.com$/.test(domainName(host.pageUrl)) ? "post" : "page";
    // The quoted fee for this type is the real one; show it on the card.
    typeFees.get(next.marketType)?.replaceChildren(`${amount(next.paymentUsdc)} USDC`);
    const changes = [
      next.adjustments.includes("page_link_dropped")
        ? `kept ${next.authority.name} as the source and left out the ${link} link`
        : "",
      next.adjustments.includes("minimal_rule") ? "shortened the rule" : "",
      next.adjustments.includes("question_trimmed") ? "trimmed the question" : "",
    ].filter(Boolean);
    const listed = changes.length > 1 ? `${changes.slice(0, -1).join(", ")} and ${changes[changes.length - 1]}` : changes[0];
    fitNote.textContent = changes.length ? `To fit in one Solana transaction, I ${listed}.` : "";
    ruleText.textContent = next.resolutionRule;
    sources.replaceChildren(
      ...next.sourcesOfTruth.map((url) => {
        // Shown as a domain chip ("coingecko.com"); the link and tooltip carry the full address.
        const item = el("li", /^https?:\/\//i.test(url) ? "source-item" : "source");
        if (/^https?:\/\//i.test(url)) {
          const link = externalLink(domainName(url), url, "");
          link.title = url;
          item.append(link);
        } else item.append(url);
        return item;
      }),
    );
    if (shownImage !== category) {
      const wanted = category;
      shownImage = wanted;
      void host.image(wanted).then((dataUrl) => {
        if (disposed || wanted !== category || !dataUrl) return;
        image.src = dataUrl;
        image.hidden = false;
        host.layout();
      });
    }
  }

  // ---- Quote ----

  function draft(): object {
    return {
      question,
      category,
      endTime,
      pageUrl: host.pageUrl,
      resolutionType: claim.resolution.type,
      marketType,
      buyWindowHours: buyWindow === LIVE_NOW ? 0 : buyWindow,
      eventInProgress: buyWindow === LIVE_NOW,
    };
  }

  async function fetchQuote(): Promise<Quote | null> {
    if (!address) return null;
    clearTimeout(quoteTimer);
    clearTimeout(expiryTimer);
    const seq = ++quoteSeq;
    quoting = true;
    render();
    const response = await host.api<Quote>("/create/quote", { wallet: address, draft: draft() });
    if (disposed || seq !== quoteSeq) return null;
    quoting = false;

    if (response.ok && response.body) {
      const next = response.body as Quote;
      quote = next;
      quoteError = "";
      showQuoteDetails(next);
      host.debug({
        quote: `${amount(next.paymentUsdc)} USDC, expires ${next.expiresAt.slice(11, 19)} UTC, about ${next.predictedBytes} bytes${next.adjustments.length ? ` (${next.adjustments.join(", ")})` : ""}`,
      });
      expiryTimer = setTimeout(onQuoteExpiring, Math.max(1000, msLeft(next) - QUOTE_REFRESH_BEFORE_MS));
    } else {
      quote = null;
      quoteError = quoteProblem(response);
      host.debug({ quote: `failed (${response.status}): ${(response.body as ApiError | null)?.error ?? "no response"}` });
    }
    render();
    return quote;
  }

  function onQuoteExpiring(): void {
    if (disposed || busy) return;
    // Each quote reserves a session at Panta, so stop refreshing a sheet nobody is looking at.
    if (host.isVisible() && autoRefreshes < MAX_AUTO_REFRESHES) {
      autoRefreshes++;
      void fetchQuote();
    } else {
      quote = null;
      quoteError = "The quote expired.";
      render();
    }
  }

  function requestQuote(delayMs = QUOTE_DEBOUNCE_MS): void {
    clearTimeout(quoteTimer);
    if (!address) return;
    autoRefreshes = 0;
    // The old number no longer matches what is on screen.
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
    host.debug({
      wallet: balances ? `${owner} (${balances.sol} SOL, ${balances.usdc} USDC)` : `${owner} (balances unavailable)`,
    });
    if (!balances) setStatus("I couldn't read this wallet's balances. Try again in a moment.");
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
    const outcome = await wallet.connect();
    if (disposed) return;
    if (outcome.ok && outcome.publicKey) {
      setStatus("");
      setAddress(outcome.publicKey);
    } else if (!outcome.ok && outcome.reason === "rejected") setStatus("Connection cancelled.");
    else if (!outcome.ok && outcome.reason === "no_wallet") setStatus("Phantom isn't installed in this browser.");
    else setStatus("Phantom didn't answer. Open Phantom and try again.");
  }

  async function disconnect(): Promise<void> {
    await wallet.disconnect();
    if (!disposed) setAddress(null);
  }

  // ---- Create ----

  async function create(): Promise<void> {
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
    const { dryRun, skipChecks } = host.settings();
    const lax = dryRun && skipChecks;
    // Carried into the next round's prompt when a signature has to be asked for again.
    let notice = "";

    for (let round = 1; round <= MAX_SIGN_ROUNDS; round++) {
      showSteps(null);
      let current = quote;
      if (!current || msLeft(current) < QUOTE_MIN_TO_START_MS) {
        setStatus(`${notice}Getting a fresh quote…`);
        current = await fetchQuote();
        if (disposed) return;
        if (!current) {
          setStatus(quoteError);
          return;
        }
      }

      setStatus(`${notice}Preparing your transaction…`);
      const built = await host.api<Build>("/create/build", { wallet: owner, quoteId: current.quoteId });
      if (disposed) return;
      if (!built.ok || !built.body) {
        if ((built.body as ApiError | null)?.error === "create_expired") {
          quote = null;
          continue;
        }
        setStatus("I couldn't prepare the transaction. Nothing was sent. Try again in a moment.");
        return;
      }
      const { txBase64, bytes: builtBytes, quote: requoted } = built.body as Build;
      if (requoted) {
        // The text was shrunk after the review. Show it and let the user decide again.
        clearTimeout(expiryTimer);
        quote = requoted;
        showQuoteDetails(requoted);
        render();
        setStatus("I had to shorten this to fit in one Solana transaction. Check it, then press Create again.");
        return;
      }

      const simulated = await host.api<Simulation>("/create/simulate", { txBase64 });
      if (disposed) return;
      const simulation = simulated.ok ? (simulated.body as Simulation) : null;
      host.debug({
        simulate: !simulation
          ? `could not simulate (${simulated.status})`
          : simulation.ok
            ? `built ${builtBytes} bytes; ok, ${simulation.unitsConsumed ?? "?"} compute units`
            : `built ${builtBytes} bytes; failed: ${simulation.logLine ?? JSON.stringify(simulation.err)}`,
      });
      if (!simulation?.ok && !lax) {
        host.sound?.("softError");
        setStatus(simulation?.reason ?? "I couldn't test this transaction, so nothing was sent. Try again in a moment.");
        return;
      }

      showSteps("Signing");
      setStatus(`${notice}Approve the transaction in Phantom.`);
      const signed = await wallet.signTransaction(txBase64);
      if (disposed) return;
      if (!signed.ok || !signed.signedTxBase64 || !signed.signature) {
        showSteps(null);
        host.sound?.("softError");
        setStatus(
          !signed.ok && signed.reason === "rejected"
            ? "Cancelled in Phantom. Nothing was sent."
            : !signed.ok && signed.reason === "timeout"
              ? "Phantom didn't answer in time. Nothing was sent."
              : "Phantom couldn't sign this. Nothing was sent.",
        );
        return;
      }

      // Before anything is sent: is this the transaction we built, and can Solana carry it?
      const checked = checkSignedTransaction(txBase64, signed.signedTxBase64);
      if (!checked.ok) {
        host.debug({ signature: `refused, not sent: ${checked.problem} (${checked.detail})` });
        showSteps(null);
        setStatus(
          checked.problem === "too_large"
            ? `Phantom's signed transaction is ${checked.bytes} bytes, over Solana's 1,232-byte limit. Nothing was sent.`
            : checked.problem === "not_signed"
              ? "Phantom returned the transaction without a signature. Nothing was sent."
              : "The transaction Phantom signed is not the one Soothia built. Nothing was sent.",
        );
        return;
      }

      if (dryRun) {
        // The signed transaction is dropped here and never leaves this function.
        host.debug({
          signature: `${signed.signature} (dry run, not sent; ${checked.bytes} bytes signed, ${checked.addedComputeBudget} compute-budget added)`,
          register: "not attempted (dry run)",
        });
        showSteps(null);
        host.sound?.("open");
        setStatus("Dry run complete: Phantom signed it, nothing was sent.");
        return;
      }

      if (msLeft(current) < QUOTE_MIN_TO_SEND_MS) {
        quote = null;
        notice = "That took a while and the quote ran out, so nothing was sent or charged. One more time: ";
        continue;
      }

      showSteps("Sending");
      setStatus("Sending to Solana…");
      host.debug({ signature: `${signed.signature} (${checked.bytes} bytes)`, register: "sending" });
      host.savePending({ quoteId: current.quoteId, signature: signed.signature, question });
      const sent = await host.api<FinishResult>("/create/send", {
        signedTxBase64: signed.signedTxBase64,
        quoteId: current.quoteId,
        confirm: false,
      });
      if (disposed) return;

      // A refusal from the Worker means the transaction did not go out. No
      // answer at all (status 0) means we cannot know, so fall through and
      // look the signature up rather than assume either way.
      if (!sent.ok && sent.status !== 0) {
        const error = (sent.body ?? {}) as ApiError;
        host.savePending(null);
        if (error.error === "blockhash_expired") {
          host.debug({ register: "not sent (transaction expired)" });
          notice = "The transaction expired before it reached Solana, so nothing was charged. One more time: ";
          continue;
        }
        host.debug({ simulate: `send refused: ${error.logLine ?? error.error ?? sent.status}`, register: "not sent" });
        showSteps("Sending", true);
        setStatus(error.reason ?? "Solana didn't accept the transaction. Nothing was charged.");
        return;
      }

      await confirmAndRegister(current.quoteId, signed.signature, sent.ok ? (sent.body as FinishResult) : null);
      return;
    }
    showSteps(null);
    setStatus("That didn't go through after a few tries. Nothing was charged. Try again when you're ready.");
  }

  /** Follows a sent transaction until its market is registered. Safe to repeat. */
  async function confirmAndRegister(quoteId: string, signature: string, first: FinishResult | null): Promise<void> {
    form.hidden = true;
    outcome.hidden = true;
    showSteps("Confirming");
    setStatus("Waiting for Solana to confirm…");
    host.debug({ register: "waiting for confirmation" });

    let result = first;
    const deadline = Date.now() + CONFIRM_WAIT_MS;
    while ((!result || result.status === "pending") && Date.now() < deadline) {
      const response = await host.api<FinishResult>("/create/register-retry", { signature, quoteId });
      if (disposed) return;
      if (response.ok && response.body) result = response.body as FinishResult;
      else await sleep(3000);
    }
    if (disposed) return;

    const again = (): void => {
      busy = true;
      void confirmAndRegister(quoteId, signature, null).finally(() => {
        busy = false;
      });
    };

    if (!result || result.status === "pending") {
      host.debug({ register: "still unconfirmed" });
      setStatus("");
      outcome.replaceChildren(
        el("p", "line", "Solana hasn't confirmed it yet. Don't create it again: your transaction is still on its way."),
        button("Check again", "button", again),
      );
    } else if (result.status === "failed") {
      host.savePending(null);
      host.debug({ register: "transaction failed on-chain" });
      host.sound?.("softError");
      showSteps("Confirming", true);
      setStatus("");
      outcome.replaceChildren(
        el("p", "line", "The transaction failed on Solana. Nothing was created and your USDC was not taken."),
        button("Back to review", "button", () => {
          outcome.hidden = true;
          form.hidden = false;
          showSteps(null);
          render();
        }),
      );
    } else if (!result.registered) {
      host.debug({ register: `on-chain, not registered yet (${result.registerError ?? "unknown"})` });
      showSteps("Registering");
      setStatus("");
      outcome.classList.remove("success");
      outcome.replaceChildren(
        el("p", "line", "Your market is on-chain, finishing registration..."),
        el("p", "note", "You have paid once and will not be charged again."),
        button("Retry", "button", again),
        externalLink("Transaction on Solscan", `https://solscan.io/tx/${signature}`, "link mono ext"),
      );
    } else {
      host.savePending(null);
      host.debug({ register: "registered" });
      host.sound?.("marketLive");
      host.created({ marketId: result.marketId, marketUrl: result.marketUrl });
      showSteps("done");
      setStatus("");
      // The bet link unfurls on X and lets anyone bet from their wallet, no extension needed.
      const link = betLink(result.marketId);
      const share =
        "https://x.com/intent/post?text=" +
        encodeURIComponent(`I turned this into a prediction market with Soothia. Bet YES or NO: ${question}`) +
        `&url=${encodeURIComponent(link)}`;
      const actions = el("div", "actions");
      const marketId = result.marketId;
      const flourish = el("div", "flourish");
      flourish.append(starSvg(), starSvg(), starSvg());
      const grid = el("div", "button-grid");
      grid.append(
        externalLink("Share on X", share, "button"),
        button("Bet on it", "button", () => host.bet({ marketId, title: question })),
      );
      actions.className = "button-stack";
      actions.append(
        externalLink("View on Panta", result.marketUrl, "button primary wide ext"),
        grid,
        copyButton("Copy bet link", link, "button wide", () => host.sound?.("open")),
      );
      outcome.classList.add("success");
      outcome.replaceChildren(
        flourish,
        el("h3", "success-title", "Your market is live"),
        el("p", "success-sub", question),
        actions,
        externalLink("Transaction on Solscan", `https://solscan.io/tx/${signature}`, "link mono ext centered"),
        button("Done", "ghost centered", () => host.back()),
      );
    }
    outcome.hidden = false;
    host.layout();
  }

  // ---- Inputs ----

  questionInput.addEventListener("input", () => {
    question = questionInput.value.trim().replace(/\s+/g, " ");
    requestQuote();
  });
  categorySelect.addEventListener("change", () => {
    category = categorySelect.value;
    requestQuote(0);
  });
  for (const [kind, input] of typeInputs) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      marketType = kind;
      fillWindowChoices();
      requestQuote(0);
    });
  }
  windowSelect.addEventListener("change", () => {
    buyWindow = windowSelect.value === LIVE_NOW ? LIVE_NOW : Number(windowSelect.value);
    requestQuote(0);
  });
  dateInput.addEventListener("change", () => {
    if (!dateInput.value) return;
    // Keep the drafted time of day (a kick-off, or 23:59:59) on the new date.
    endTime = `${dateInput.value}${claim.endTime.slice(10)}`;
    requestQuote(0);
  });

  host.debug({ wallet: "not connected", quote: "–", simulate: "–", signature: "–", register: "–" });
  render();
  // If Phantom already trusts this site, pick the wallet up without a popup.
  void wallet.publicKey().then((found) => {
    if (!disposed && found && !address) setAddress(found);
  });

  return {
    node,
    refresh(): void {
      if (disposed) return;
      if (address && !quote && !quoting && !busy && quoteError === "The quote expired.") requestQuote(0);
      else render();
    },
    dispose(): void {
      disposed = true;
      clearTimeout(quoteTimer);
      clearTimeout(expiryTimer);
    },
    trigger: () => void create(),
  };
}
