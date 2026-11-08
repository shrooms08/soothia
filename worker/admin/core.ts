// What every part of the admin page shares: the API call, the connected wallet and
// small DOM helpers. The token lives in sessionStorage only and is never logged.

import { signAndExecute } from "../../extension/src/sui-wallet-core";
import { errorText, explorerLink, sameAddress } from "./logic";

const TOKEN_KEY = "soothia-admin-token";

export interface Info {
  adminCapOwner: string;
  minResolveDelayMs: number;
  challengeMs: number;
  productionDelays: boolean;
}

export interface ApiFailure extends Error {
  code: string;
}

export const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

export function setStatus(node: HTMLElement, text: string, tone: "" | "good" | "bad" = ""): void {
  node.textContent = text;
  node.className = `status ${tone}`.trim();
}

export function make<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}

export function digestLink(digest: string): HTMLAnchorElement {
  const link = make("a", digest);
  link.href = explorerLink(digest);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

export function saveToken(value: string): boolean {
  try {
    sessionStorage.setItem(TOKEN_KEY, value);
    return true;
  } catch {
    return false;
  }
}

export const readToken = (): string => {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
};

export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "X-Soothia-Admin": readToken(), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const failure = new Error(String(payload.error ?? `http_${response.status}`)) as ApiFailure;
    failure.code = failure.message;
    throw failure;
  }
  return payload as T;
}

export const page = {
  info: null as Info | null,
  wallet: null as { id: string; address: string } | null,
  /** Called whenever the wallet or the on-chain settings change. */
  listeners: [] as (() => void)[],
  changed(): void {
    for (const listener of this.listeners) listener();
  },
  isOwner(): boolean {
    return Boolean(this.wallet && this.info && sameAddress(this.wallet.address, this.info.adminCapOwner));
  },
  /** Signs bytes from the Worker with the connected wallet, if it holds the AdminCap. */
  async sign(txBytes: string): Promise<string> {
    if (!this.isOwner() || !this.wallet) throw new Error("The connected wallet does not hold the AdminCap.");
    return (await signAndExecute(this.wallet.id, this.wallet.address, txBytes)).digest;
  },
  async refreshInfo(): Promise<void> {
    this.info = await api<Info>("/stake/admin/info");
    this.changed();
  },
};

export const failureText = (error: unknown, messages?: Record<string, string>): string => {
  const code = (error as ApiFailure).code;
  return code ? errorText(code, messages) : String((error as Error)?.message ?? error).slice(0, 200);
};
