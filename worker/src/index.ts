// soothia-proxy: keeps the Claude, Walrus Memory and Tatum keys server-side and
// exposes a small surface to the extension: /detect, the /recall/* and /stake/*
// routes and public stats.

import { handleDetect } from "./detect";
import { corsHeaders, isAdmin, json, type Env } from "./http";
import { LIMITS, rateLimited } from "./ratelimit";
import { recallRoute } from "./recall/routes";
import { sweepRecall } from "./recall/sweep";
import { socialRoute } from "./social/routes";
import { sweepSocial } from "./social/snapshots";
import { stakeRoute } from "./stake/routes";
import { sweepStake } from "./stake/sweep";
import { handleStats } from "./stats";
import { budgetDirty, kvBudgetReport, reportBudgetToEdge } from "./store";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const response = await route(request, env);
    // Fold this isolate's KV write count into the edge tally after any request that wrote.
    if (budgetDirty()) ctx.waitUntil(reportBudgetToEdge().catch(() => {}));
    return response;
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(reportBudgetToEdge().catch(() => {}));
    // Settle open Total Recall picks every 15 minutes.
    const slot = new Date().getUTCMinutes() % 15;
    if (slot < 5) ctx.waitUntil(sweepRecall(env).catch(() => {}));
    // Separate runs five minutes apart, because one invocation has a limited number of outbound calls.
    else if (slot < 10) ctx.waitUntil(sweepStake(env).catch(() => {}));
    else ctx.waitUntil(sweepSocial(env).catch(() => {}));
  },
} satisfies ExportedHandler<Env>;

/** A 429 when this IP has used up `limit` for `route`, otherwise null. */
async function limited(
  request: Request,
  route: string,
  limit: { limit: number; windowSec: number },
): Promise<Response | null> {
  const retryAfter = await rateLimited(request, route, limit);
  if (retryAfter === null) return null;
  return json(request, { error: "rate_limited" }, 429, { "Retry-After": String(retryAfter) });
}

// connect-src stays open because a wallet's injected code may call its own servers from this page.
const ADMIN_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https: wss:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const ADMIN_FILES: Record<string, string> = {
  "/admin": "/admin/index.html",
  "/admin/admin.js": "/admin/admin.js",
  "/admin/admin.css": "/admin/admin.css",
};

/** The static admin page. It holds no secrets: the token is typed in, and every action is checked by the routes. */
async function adminPage(request: Request, env: Env, path: string): Promise<Response> {
  const file = ADMIN_FILES[path];
  if (!file || !env.ASSETS) return json(request, { error: "not_found" }, 404);
  if (request.method !== "GET") return json(request, { error: "method_not_allowed" }, 405);
  const asset = await env.ASSETS.fetch(new URL(file, request.url).toString());
  const headers = new Headers(asset.headers);
  headers.set("Content-Security-Policy", ADMIN_CSP);
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  return new Response(asset.body, { status: asset.status, headers });
}

async function route(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path.startsWith("/recall/")) {
    return (await limited(request, "recall", LIMITS.recall)) ?? recallRoute(request, env, path);
  }

  if (path === "/admin" || path.startsWith("/admin/")) return adminPage(request, env, path);

  if (path.startsWith("/social/")) {
    const writes = request.method === "POST";
    return (await limited(request, writes ? "social-write" : "social", writes ? LIMITS.socialWrite : LIMITS.social)) ?? socialRoute(request, env, path);
  }

  if (path.startsWith("/stake/")) {
    return (await limited(request, "stake", LIMITS.stake)) ?? stakeRoute(request, env, path);
  }

  if (request.method === "POST") {
    if (path === "/detect") return (await limited(request, "detect", LIMITS.detect)) ?? handleDetect(request, env);
    return json(request, { error: "not_found" }, 404);
  }
  if (request.method !== "GET") {
    return json(request, { error: "method_not_allowed" }, 405);
  }

  // Operator-only diagnostics: without the admin header these paths do not exist.
  if (path.startsWith("/debug")) {
    if (!isAdmin(request, env)) return json(request, { error: "not_found" }, 404);
    if (path === "/debug/kv-budget") return json(request, await kvBudgetReport());
    return json(request, { error: "not_found" }, 404);
  }

  switch (path) {
    case "/health":
      return json(request, { ok: true, service: "soothia-proxy" });
    case "/stats":
      return handleStats(request, env);
    default:
      return json(request, { error: "not_found" }, 404);
  }
}
