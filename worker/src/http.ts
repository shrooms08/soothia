// Shared types and response helpers for soothia-proxy.

export interface Env {
  PANTA_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  SOOTHIA_CACHE: KVNamespace;
}

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (origin.startsWith("chrome-extension://")) return origin;
  if (origin === "http://localhost" || origin.startsWith("http://localhost:")) return origin;
  return null;
}

export function corsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  const origin = allowedOrigin(request);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type, X-Soothia-Install, X-Soothia-Refresh";
    headers["Access-Control-Expose-Headers"] = "X-Soothia-Cache";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

export function json(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request), ...extraHeaders },
  });
}

const MAX_BODY_CHARS = 32_000;

/** Parses a JSON object body, or returns null if it is missing, too large, or not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (!text || text.length > MAX_BODY_CHARS) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
