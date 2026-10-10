// soothia-proxy: keeps the Panta and Claude API keys server-side and exposes
// a small surface to the extension: catalog reads, /detect, /match, wallet
// balances, and the market create flow. /img/* is served from static assets.

import { actionRoute } from "./actions";
import {
  handleBuyBuild,
  handleBuyQuote,
  handleBuySend,
  handleBuyStatus,
  handleClaimBuild,
  handleClaimSend,
  handleCreatorFeesBuild,
  handleMarket,
  handlePositions,
  handleTxStatus,
} from "./buy";
import {
  handleBuild,
  handleCreatorMarkets,
  handleQuote,
  handleRegisterRetry,
  handleSend,
  handleSimulate,
} from "./create";
import { handleDetect } from "./detect";
import { corsHeaders, installId, isAdmin, json, type Env } from "./http";
import { PANTA_BASE } from "./markets";
import { handleMatch } from "./match";
import { handleMarkets, warmCatalog } from "./catalog";
import { pendingCreatorCount } from "./creators";
import { reconcileDeps, reconcileOrders } from "./reconcile";
import { LIMITS, rateLimited } from "./ratelimit";
import { budgetDirty, kvBudgetReport, reportBudgetToEdge } from "./store";
import { handleStats } from "./stats";
import { handleBalances } from "./wallet";

// Wallet and create routes: POST, and only from a Soothia install.
const INSTALL_ROUTES: Record<
  string,
  (request: Request, env: Env, ctx: ExecutionContext) => Promise<Response>
> = {
  "/wallet/balances": handleBalances,
  "/create/quote": handleQuote,
  "/create/build": handleBuild,
  "/create/simulate": handleSimulate,
  "/create/send": handleSend,
  "/create/register-retry": handleRegisterRetry,
  "/tx/simulate": handleSimulate,
  "/tx/status": handleTxStatus,
  "/buy/quote": handleBuyQuote,
  "/buy/build": handleBuyBuild,
  "/buy/send": handleBuySend,
  "/buy/status": handleBuyStatus,
  "/claim/build": handleClaimBuild,
  "/claim/send": handleClaimSend,
  "/claim/creator-fees/build": handleCreatorFeesBuild,
};

// Query params documented for GET /markets/ (Panta names the phase filter `status`).
const MARKET_PARAMS = ["limit", "cursor", "category", "status"] as const;

async function proxyPanta(
  request: Request,
  env: Env,
  path: string,
  query?: URLSearchParams,
): Promise<Response> {
  // Trim so a stray space or newline pasted with the secret does not break auth.
  const apiKey = env.PANTA_API_KEY?.trim();
  if (!apiKey) return json(request, { error: "proxy_misconfigured" }, 500);

  const qs = query?.toString();
  const url = `${PANTA_BASE}${path}${qs ? `?${qs}` : ""}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await route(request, env, ctx);
    // Fold this isolate's KV write count into the edge tally after any request that wrote.
    if (budgetDirty()) ctx.waitUntil(reportBudgetToEdge().catch(() => {}));
    return response;
  },

  // Every five minutes (wrangler.toml): finish bets that were sent but never reported.
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(reconcileOrders(reconcileDeps(env)).catch(() => {}));
    // Keep the catalog warm and fill blank titles a few at a time.
    ctx.waitUntil(warmCatalog(env).catch(() => {}));
    ctx.waitUntil(reportBudgetToEdge().catch(() => {}));
  },
} satisfies ExportedHandler<Env>;

/** A 429 when this IP has used up `limit` for `route`, otherwise null. */
async function limited(request: Request, route: string, limit: { limit: number; windowSec: number }): Promise<Response | null> {
  const retryAfter = await rateLimited(request, route, limit);
  if (retryAfter === null) return null;
  return json(request, { error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
}

async function route(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  {
    // Solana Actions (bet links) have their own open CORS policy.
    const action = actionRoute(request, env, ctx);
    if (action) return action;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "POST") {
      const installRoute = INSTALL_ROUTES[path];
      if (installRoute) {
        if (!installId(request)) return json(request, { error: "missing_install" }, 400);
        return installRoute(request, env, ctx);
      }
      switch (path) {
        case "/detect":
          return (await limited(request, "detect", LIMITS.detect)) ?? handleDetect(request, env);
        case "/match":
          return (await limited(request, "match", LIMITS.match)) ?? handleMatch(request, env);
        default:
          return json(request, { error: "not_found" }, 404);
      }
    }
    if (request.method !== "GET") {
      return json(request, { error: "method_not_allowed" }, 405);
    }

    // Operator-only diagnostics: without the admin header these paths do not exist.
    if (path.startsWith("/debug")) {
      if (!isAdmin(request, env)) return json(request, { error: "not_found" }, 404);
      if (path === "/debug/kv-budget") {
        return json(request, { ...(await kvBudgetReport()), pendingCreatorWrites: pendingCreatorCount() });
      }
      return json(request, { error: "not_found" }, 404);
    }

    switch (path) {
      case "/health":
        return json(request, { ok: true, service: "soothia-proxy" });
      case "/panta/markets":
        return proxyPanta(request, env, "/markets/", marketsQuery(url));
      case "/panta/categories":
        return proxyPanta(request, env, "/categories/");
      case "/creator/markets":
        return handleCreatorMarkets(request, env);
      case "/positions":
        return handlePositions(request, env);
      case "/market":
        return handleMarket(request, env);
      case "/stats":
        return handleStats(request, env, ctx);
      case "/markets":
        return handleMarkets(request, env, ctx);
      default:
        return json(request, { error: "not_found" }, 404);
    }
  }
}
