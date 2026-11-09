// The messages between the content script and the page-world wallet bridge. Both
// sides drop anything that is not exactly this shape, from this window, with this
// session's nonce.

export const WALLET_CHANNEL = "soothia:v1:wallet";
export const BRIDGE_READY_ID = "ready";

export type WalletMethod = "list" | "connect" | "disconnect" | "getAccounts" | "signAndExecute" | "signPersonalMessage" | "signTransaction";
const METHODS: readonly string[] = ["list", "connect", "disconnect", "getAccounts", "signAndExecute", "signPersonalMessage", "signTransaction"];

export interface WalletRequest {
  channel: typeof WALLET_CHANNEL;
  direction: "request";
  nonce: string;
  id: string;
  method: WalletMethod;
  params: Record<string, unknown>;
}

export interface WalletResponse {
  channel: typeof WALLET_CHANNEL;
  direction: "response";
  nonce: string;
  id: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface WalletSummary {
  id: string;
  name: string;
}

export interface ConnectedWallet {
  address: string;
  walletId: string;
  walletName: string;
}

export interface MessageLike {
  source: unknown;
  origin: string;
  data: unknown;
}

interface WindowLike {
  location: { origin: string };
}

function envelope(event: MessageLike, win: WindowLike, nonce: string, direction: string): Record<string, unknown> | null {
  if (event.source !== win || event.origin !== win.location.origin) return null;
  const data = event.data as Record<string, unknown> | null;
  if (typeof data !== "object" || data === null) return null;
  if (data.channel !== WALLET_CHANNEL || data.direction !== direction || data.nonce !== nonce || typeof data.id !== "string") return null;
  return data;
}

export function acceptRequest(event: MessageLike, win: WindowLike, nonce: string): WalletRequest | null {
  const data = envelope(event, win, nonce, "request");
  if (!data || typeof data.method !== "string" || !METHODS.includes(data.method)) return null;
  if (typeof data.params !== "object" || data.params === null) return null;
  return data as unknown as WalletRequest;
}

export function acceptResponse(event: MessageLike, win: WindowLike, nonce: string): WalletResponse | null {
  const data = envelope(event, win, nonce, "response");
  if (!data || typeof data.ok !== "boolean") return null;
  return data as unknown as WalletResponse;
}
