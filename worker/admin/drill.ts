// The overturn drill on the admin page: seven buttons, run in order. Progress is kept
// in sessionStorage so a reload does not lose the pool.

import { api, digestLink, failureText, make, page, setStatus } from "./core";
import { DRILL_MESSAGES, DRILL_STEPS, drillStepEnabled, emptyDrill, formatLeft, suiAmount, type DrillState, type DrillStep } from "./logic";

const STATE_KEY = "soothia-admin-drill";
const COUNTDOWN_MS = 1_000;
const DRILL_DELAYS = { min_resolve_delay_ms: 0, challenge_ms: 900_000 };
const PRODUCTION_DELAYS = { min_resolve_delay_ms: 8_100_000, challenge_ms: 21_600_000 };

interface StepResult {
  digest: string;
  note?: string;
}

const LABELS: Record<DrillStep, string> = {
  shorten: "Shorten delays",
  create: "Create drill pool",
  stake: "Stake 0.1 SUI",
  resolve: "Resolve YES",
  overturn: "Overturn",
  refund: "Refund",
  restore: "Restore delays",
};

const WHO_SIGNS: Record<DrillStep, string> = {
  shorten: "You sign in your wallet.",
  create: "The Worker signs.",
  stake: "The Worker signs, from the gas wallet.",
  resolve: "The Worker signs, after the pool closes.",
  overturn: "You sign in your wallet, within 15 minutes of Resolve.",
  refund: "The Worker signs, and should get the full 0.1 SUI back.",
  restore: "You sign in your wallet. Always available.",
};

function load(): DrillState {
  try {
    const saved = sessionStorage.getItem(STATE_KEY);
    return saved ? { ...emptyDrill(), ...(JSON.parse(saved) as DrillState) } : emptyDrill();
  } catch {
    return emptyDrill();
  }
}

export function startDrill(root: HTMLElement): void {
  let state = load();
  const buttons = new Map<DrillStep, HTMLButtonElement>();
  const results = new Map<DrillStep, HTMLElement>();
  let busy = false;

  const section = make("section");
  const poolLine = make("p");
  poolLine.className = "status";
  const reset = make("button", "Start over");
  reset.type = "button";

  function save(): void {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      // The drill still works; a reload would lose the progress.
    }
  }

  const needPool = (): { poolId: string } => {
    if (!state.poolId) throw new Error("Create the drill pool first.");
    return { poolId: state.poolId };
  };

  async function signBuilt(path: string, body: unknown): Promise<StepResult> {
    const { txBytes } = await api<{ txBytes: string }>(path, body);
    return { digest: await page.sign(txBytes) };
  }

  async function workerStep(path: string): Promise<StepResult> {
    return { digest: (await api<{ digest: string }>(path, needPool())).digest };
  }

  const ACTIONS: Record<DrillStep, () => Promise<StepResult>> = {
    shorten: () => signBuilt("/stake/admin/config/build", DRILL_DELAYS),
    create: async () => {
      const created = await api<{ poolId: string; digest: string; closeMs: number }>("/stake/admin/drill/create", {});
      state.poolId = created.poolId;
      state.closeMs = created.closeMs;
      return { digest: created.digest };
    },
    stake: () => workerStep("/stake/admin/drill/stake"),
    resolve: () => workerStep("/stake/admin/drill/resolve"),
    overturn: () => signBuilt("/stake/admin/overturn/build", needPool()),
    refund: async () => {
      const refund = await api<{ digest: string; amountMist: string; fullRefund: boolean }>("/stake/admin/drill/refund", needPool());
      return { digest: refund.digest, note: `${suiAmount(refund.amountMist)} back${refund.fullRefund ? ", the full stake." : ", which is NOT the full stake."}` };
    },
    restore: () => signBuilt("/stake/admin/config/build", PRODUCTION_DELAYS),
  };

  function showResult(step: DrillStep, digest: string, note?: string): void {
    const result = results.get(step) as HTMLElement;
    setStatus(result, note ? `${note} ` : "", "good");
    result.append(digestLink(digest));
  }

  function render(): void {
    for (const step of DRILL_STEPS) {
      (buttons.get(step) as HTMLButtonElement).disabled = busy || !drillStepEnabled(step, state, page.isOwner());
    }
    reset.disabled = busy;
    tick();
  }

  function tick(): void {
    if (!state.poolId) {
      poolLine.textContent = page.isOwner() ? "" : "Connect the wallet that holds the AdminCap to run the drill.";
      return;
    }
    const left = (state.closeMs ?? 0) - Date.now();
    poolLine.textContent = `Drill pool ${state.poolId}. ${left > 0 ? `Closes in ${formatLeft(left)}: stake before then, resolve after.` : "Closed."}`;
  }

  async function run(step: DrillStep): Promise<void> {
    const result = results.get(step) as HTMLElement;
    busy = true;
    render();
    setStatus(result, "Working…");
    try {
      const { digest, note } = await ACTIONS[step]();
      state.done[step] = note ? `${digest}|${note}` : digest;
      save();
      showResult(step, digest, note);
      if (step === "shorten" || step === "restore") await page.refreshInfo().catch(() => undefined);
    } catch (error) {
      setStatus(result, failureText(error, DRILL_MESSAGES), "bad");
    }
    busy = false;
    render();
  }

  section.append(make("h2", "4. Overturn drill"));
  const hint = make("p", "Uses real SUI: 0.1 SUI staked and refunded, plus gas. New real pools are paused from Shorten delays until Restore delays.");
  hint.className = "hint";
  section.append(hint, poolLine);

  for (const step of DRILL_STEPS) {
    const row = make("div");
    row.className = "step";
    const button = make("button", LABELS[step]);
    button.type = "button";
    button.addEventListener("click", () => void run(step));
    const detail = make("div");
    const who = make("p", WHO_SIGNS[step]);
    who.className = "hint";
    const result = make("p");
    result.className = "status";
    detail.append(who, result);
    row.append(button, detail);
    section.append(row);
    buttons.set(step, button);
    results.set(step, result);
    const saved = state.done[step];
    if (saved) {
      const [digest, note] = saved.split("|");
      showResult(step, digest, note);
    }
  }

  reset.addEventListener("click", () => {
    if (!window.confirm("Forget this drill's progress? Nothing on chain changes. If the delays are still shortened, press Restore delays.")) return;
    state = emptyDrill();
    save();
    for (const result of results.values()) setStatus(result, "");
    render();
  });
  const resetRow = make("div");
  resetRow.className = "row reset-row";
  resetRow.append(reset);
  section.append(resetRow);
  root.append(section);

  page.listeners.push(render);
  window.setInterval(tick, COUNTDOWN_MS);
  render();
}
