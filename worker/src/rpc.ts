// Solana JSON-RPC through Helius. The RPC URL contains an API key, so it
// stays in the Worker and never appears in a response, an error, or a log.
import type { Env } from "./http";

export class RpcError extends Error {
  constructor(
    message: string,
    /** Program logs from a failed preflight, when the node returned them. */
    readonly logs: string[] = [],
  ) {
    super(message);
  }
}

export async function rpc<T>(env: Env, method: string, params: unknown[]): Promise<T> {
  const url = env.HELIUS_RPC_URL?.trim();
  if (!url) throw new RpcError("rpc_not_configured");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new RpcError("rpc_unreachable");
  }
  if (!response.ok) throw new RpcError(`rpc_http_${response.status}`);

  const body = (await response.json()) as {
    result?: T;
    error?: { message?: string; data?: { logs?: string[] } };
  };
  if (body.error) {
    throw new RpcError(String(body.error.message ?? "rpc_error").slice(0, 300), body.error.data?.logs ?? []);
  }
  return body.result as T;
}
