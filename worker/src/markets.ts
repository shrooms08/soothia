// Panta catalog helpers: the base URL, an authenticated GET, and the price
// parser. (The open-market list lives in catalog.ts now.)
import type { Env } from "./http";

// Trailing slashes are required on every Panta path.
export const PANTA_BASE = "https://live-api.panta.market/api/v1";


export interface OpenMarket {
  id: string;
  title: string;
  category: string;
  yesPrice: number | null;
  noPrice: number | null;
  /** ISO-8601 UTC. */
  endTime: string;
}


export async function pantaGet<T>(env: Env, path: string, query?: URLSearchParams): Promise<T | null> {
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return null;
  const qs = query?.toString();
  try {
    const response = await fetch(`${PANTA_BASE}${path}${qs ? `?${qs}` : ""}`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export function price(value: string | null | undefined): number | null {
  if (value == null) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
