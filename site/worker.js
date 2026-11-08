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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === "www.soothia.fun") {
      return withSecurityHeaders(Response.redirect(`${SITE}${url.pathname}${url.search}`, 301));
    }
    return withSecurityHeaders(await env.ASSETS.fetch(request));
  },
};
