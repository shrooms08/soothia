// soothia-proxy: keeps the Panta API key server-side and exposes a small
// read-only surface to the extension.

export interface Env {
  PANTA_API_KEY: string;
}

// Trailing slashes are required on every Panta path.
const PANTA_BASE = "https://live-api.panta.market/api/v1";

// Query params documented for GET /markets/ (Panta names the phase filter `status`).
const MARKET_PARAMS = ["limit", "cursor", "category", "status"] as const;

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (origin.startsWith("chrome-extension://")) return origin;
  if (origin === "http://localhost" || origin.startsWith("http://localhost:")) return origin;
  return null;
}

function corsHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  const origin = allowedOrigin(request);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "GET, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "86400";
  }
  return headers;
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request) },
  });
}

async function proxyPanta(
  request: Request,
  env: Env,
  path: string,
  query?: URLSearchParams,
): Promise<Response> {
  if (!env.PANTA_API_KEY) return json(request, { error: "proxy_misconfigured" }, 500);

  const qs = query?.toString();
  const url = `${PANTA_BASE}${path}${qs ? `?${qs}` : ""}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { "X-Api-Key": env.PANTA_API_KEY, Accept: "application/json" },
    });
  } catch {
    return json(request, { error: "upstream_unavailable" }, 502);
  }

  // Pass Panta's body and status through untouched; only our own headers go out.
  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    ...corsHeaders(request),
  };
  const retryAfter = upstream.headers.get("Retry-After");
  if (retryAfter) headers["Retry-After"] = retryAfter;

  return new Response(upstream.body, { status: upstream.status, headers });
}

function marketsQuery(url: URL): URLSearchParams {
  const out = new URLSearchParams();
  for (const name of MARKET_PARAMS) {
    const value = url.searchParams.get(name);
    if (value) out.set(name, value);
  }
  // Convenience alias: ?phase=primary is sent to Panta as ?status=primary.
  const phase = url.searchParams.get("phase");
  if (phase && !out.has("status")) out.set("status", phase);
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }
    if (request.method !== "GET") {
      return json(request, { error: "method_not_allowed" }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    switch (path) {
      case "/health":
        return json(request, { ok: true, service: "soothia-proxy" });
      case "/panta/markets":
        return proxyPanta(request, env, "/markets/", marketsQuery(url));
      case "/panta/categories":
        return proxyPanta(request, env, "/categories/");
      default:
        return json(request, { error: "not_found" }, 404);
    }
  },
} satisfies ExportedHandler<Env>;
