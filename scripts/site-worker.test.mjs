// The landing site Worker: security headers and the www redirect.
// Run with `npm test` in scripts/.
import assert from "node:assert/strict";
import { test } from "node:test";
import site, { SECURITY_HEADERS, withSecurityHeaders } from "../site/worker.js";

test("withSecurityHeaders adds the policy headers and keeps the original status and body", async () => {
  const response = withSecurityHeaders(new Response("hi", { status: 201, headers: { "X-Custom": "1" } }));
  assert.equal(response.status, 201);
  assert.equal(await response.text(), "hi");
  assert.equal(response.headers.get("X-Custom"), "1");
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) assert.equal(response.headers.get(name), value);
  const csp = response.headers.get("Content-Security-Policy");
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' https:\/\/static\.cloudflareinsights\.com(;|$)/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /connect-src [^;]*https:\/\/api\.soothia\.fun/);
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
});

test("www redirects to the bare domain, keeping the path and query", async () => {
  const response = await site.fetch(new Request("https://www.soothia.fun/a?b=1"), {});
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("Location"), "https://soothia.fun/a?b=1");
  assert.ok(response.headers.get("Content-Security-Policy"));
});

test("everything else comes from static assets, with the headers added", async () => {
  const seen = [];
  const env = {
    ASSETS: {
      fetch: async (request) => {
        seen.push(new URL(request.url).pathname);
        return new Response("page");
      },
    },
  };
  const response = await site.fetch(new Request("https://soothia.fun/"), env);
  assert.equal(await response.text(), "page");
  assert.deepEqual(seen, ["/"]);
  assert.ok(response.headers.get("X-Frame-Options"));
});
