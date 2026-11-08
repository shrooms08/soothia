// The pool line and Back it button under "Your call" on a tile.

import { button, el } from "./dom";
import type { ApiError, ApiPath, ApiResponse, RecallCalled } from "./messages";
import { backedLine, backsYes, canTopUp, poolIsOpenForStakes, poolLine, type PoolView, type StakePositionView } from "./stake-logic";
import type { WalletAccess } from "./wallet-access";

export interface StakeRowHost {
  api<T>(path: ApiPath, body: unknown): Promise<ApiResponse<T | ApiError>>;
  wallet: WalletAccess;
  layout(): void;
  onBack(called: RecallCalled): void;
  now?: () => number;
}

export interface StakeRow {
  node: HTMLElement;
  refresh(): Promise<void>;
}

export function createStakeRow(host: StakeRowHost, called: RecallCalled): StakeRow {
  const node = el("div", "stake-row");
  node.hidden = true;
  const line = el("p", "stake-line");
  const action = button("Back it", "button small stake-back", () => host.onBack(called));
  node.append(line, action);
  let seq = 0;

  async function heldMist(): Promise<bigint> {
    const wallet = await host.wallet.current();
    if (!wallet) return 0n;
    const response = await host.api<{ positions: StakePositionView[] }>("/stake/positions", { address: wallet.address });
    if (!response.ok || !response.body) return 0n;
    const found = (response.body as { positions: StakePositionView[] }).positions.find((position) => position.pickId === called.pickId);
    return found ? BigInt(found.amountMist) : 0n;
  }

  async function refresh(): Promise<void> {
    const current = ++seq;
    const { fixture } = called;
    if (!fixture) return;
    const [response, held] = await Promise.all([
      host.api<PoolView>("/stake/pool", { fixture: { home: fixture.home, away: fixture.away, startISO: fixture.startISO }, subject: fixture.subject }),
      heldMist().catch(() => 0n),
    ]);
    if (current !== seq) return;
    const pool = response.ok ? (response.body as PoolView | null) : null;
    if (!pool || !poolIsOpenForStakes(pool, host.now?.() ?? Date.now())) {
      node.hidden = true;
      host.layout();
      return;
    }
    const side = backsYes(called);
    line.textContent = held > 0n ? backedLine(pool, side, held) : poolLine(pool, side, called.side);
    action.textContent = held > 0n ? "Top up" : "Back it";
    action.hidden = held > 0n && !canTopUp(pool.limits, held);
    node.hidden = false;
    host.layout();
  }

  return { node, refresh };
}
