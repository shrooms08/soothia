// The landing site Worker: HTML escaping, https-only URLs, and security headers.
// Run with `npm test` in scripts/.
import assert from "node:assert/strict";
import { test } from "node:test";
import { SECURITY_HEADERS, escape, httpsUrl, marketCard, renderPage, withSecurityHeaders } from "../site/worker.js";

const ID = "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL";

test("escape neutralises every HTML special character", () => {
  assert.equal(escape(`<img src=x onerror="alert('1')">&`), "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;");
  assert.equal(escape(null), "null");
});

test("httpsUrl keeps https and replaces everything else with the fallback", () => {
  assert.equal(httpsUrl("https://www.panta.market/market/x", "f"), "https://www.panta.market/market/x");
  assert.equal(httpsUrl("javascript:alert(1)", "f"), "f");
  assert.equal(httpsUrl("data:text/html,hi", "f"), "f");
  assert.equal(httpsUrl("http://example.com", "f"), "f");
  assert.equal(httpsUrl(undefined, "f"), "f");
  assert.equal(httpsUrl("not a url", "f"), "f");
});

test("marketCard escapes the question and category and refuses non-https image and Panta links", () => {
  const html = marketCard({
    id: ID,
    phase: "p2p",
    category: `sports"><script>alert(1)</script>`,
    question: `<script>alert("q")</script> Will X happen?`,
    imageUrl: "javascript:alert(1)",
    pantaUrl: "javascript:alert(2)",
    volumeUsdc: 3.5,
    yesPct: 50,
    noPct: 50,
    closesAt: `"><b>`,
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /&lt;script&gt;alert\(&quot;q&quot;\)/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /src="https:\/\/api\.soothia\.fun\/img\/other\.png"/);
  assert.match(html, new RegExp(`href="https://www\\.panta\\.market/market/${ID}"`));
  assert.doesNotMatch(html, /data-closes=""><b>/);
});

test("marketCard with a malformed id never links to /m/<junk>", () => {
  const html = marketCard({ id: "../evil", phase: "primary", category: "crypto", question: "Q", imageUrl: "", pantaUrl: "", volumeUsdc: 0 });
  assert.match(html, /href="\/markets"/);
  assert.doesNotMatch(html, /\/m\/\.\./);
});

test("renderPage escapes the market title in the head and body and validates the Panta link", () => {
  const html = renderPage(ID, {
    title: `</title><script>alert(1)</script>`,
    yesPrice: 0.5,
    noPrice: 0.5,
    phase: "primary",
    marketUrl: "javascript:alert(3)",
    primaryPhaseEnd: new Date(Date.now() + 86_400_000).toISOString(),
  });
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, new RegExp(`data-panta="https://www\\.panta\\.market/market/${ID}"`));
  assert.match(html, /&lt;\/title&gt;&lt;script&gt;/);
});

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
