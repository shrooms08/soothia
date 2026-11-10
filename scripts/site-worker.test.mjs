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

function assetsWith(html) {
  const seen = [];
  return {
    seen,
    env: {
      ASSETS: {
        fetch: async (request) => {
          seen.push(new URL(request.url).pathname);
          return new Response(html, { headers: { ETag: "template", "Content-Type": "text/html" } });
        },
      },
    },
  };
}

test("/u/<handle> serves the profile page with the handle written in", async () => {
  const { env, seen } = assetsWith('<title>@__HANDLE__</title><body data-handle="__HANDLE__">');
  const response = await site.fetch(new Request("https://soothia.fun/u/Arsenal_Fan"), env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '<title>@arsenal_fan</title><body data-handle="arsenal_fan">');
  assert.deepEqual(seen, ["/profile"]);
  assert.equal(response.headers.get("ETag"), null);
  assert.ok(response.headers.get("Content-Security-Policy"));
});

test("a malformed handle never reaches the page", async () => {
  for (const path of [
    "/u/a",
    "/u/%3Cscript%3E",
    "/u/has%20space",
    "/u/" + "a".repeat(21),
    "/u/%E0%A4%A",
    "/u/ok_name/more",
  ]) {
    const { env, seen } = assetsWith("__HANDLE__");
    await site.fetch(new Request(`https://soothia.fun${path}`), env);
    assert.equal(seen.includes("/profile"), false, path);
  }
});

test("the bare template redirects to the leaderboard", async () => {
  const { env } = assetsWith("x");
  const response = await site.fetch(new Request("https://soothia.fun/profile"), env);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "https://soothia.fun/leaderboard");
});

test("/leaderboard is an ordinary page", async () => {
  const { env, seen } = assetsWith("board");
  assert.equal(await (await site.fetch(new Request("https://soothia.fun/leaderboard"), env)).text(), "board");
  assert.deepEqual(seen, ["/leaderboard"]);
});
