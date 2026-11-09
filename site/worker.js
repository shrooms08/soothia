// The landing site Worker. Static assets serve everything; this adds the
// security headers to every response and sends www to the bare domain.
const SITE = "https://soothia.fun";

// Sent on every response, static files included (wrangler.toml runs this Worker first for
// every path). Scripts come only from this origin; connections go to the API; nothing may frame the site.
const CSP = [
  "default-src 'self'",
  // Cloudflare injects its Web Analytics beacon at the edge; it must be allowed or every page logs a violation.
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self'",
  "connect-src 'self' https://api.soothia.fun https://soothia-proxy.heylana.workers.dev https://cloudflareinsights.com",
  "frame-src https://www.youtube.com https://www.loom.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");
export const SECURITY_HEADERS = {
  "Content-Security-Policy": CSP,
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

export function withSecurityHeaders(response) {
  const out = new Response(response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) out.headers.set(name, value);
  return out;
}

const HANDLE = /^[a-z0-9_]{3,20}$/;

function handleFromPath(pathname) {
  const raw = /^\/u\/([^/]+)\/?$/.exec(pathname)?.[1];
  if (!raw) return null;
  try {
    const handle = decodeURIComponent(raw).toLowerCase();
    return HANDLE.test(handle) ? handle : null;
  } catch {
    return null;
  }
}

/** /u/<handle>: the one profile page, with the handle written in so link previews name it. */
async function profilePage(handle, url, env) {
  const asset = await env.ASSETS.fetch(new Request(new URL("/profile", url)));
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  // The asset's ETag describes the template, not this person's page.
  headers.delete("ETag");
  headers.set("Cache-Control", "public, max-age=300");
  return new Response((await asset.text()).replaceAll("__HANDLE__", handle), { status: 200, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.soothia.fun") {
      return withSecurityHeaders(Response.redirect(`${SITE}${url.pathname}${url.search}`, 301));
    }
    if (url.pathname === "/profile" || url.pathname === "/profile.html") {
      return withSecurityHeaders(Response.redirect(`${url.origin}/leaderboard`, 302));
    }
    const handle = handleFromPath(url.pathname);
    if (handle) return withSecurityHeaders(await profilePage(handle, url, env));
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
