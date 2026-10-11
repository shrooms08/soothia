# Security model

Soothia moves real USDC on Solana mainnet, so the design keeps every secret and every signature out of Soothia's hands.

## Non-custodial

- Soothia never holds funds, private keys or seed phrases. The extension and the share page ask the user's wallet to sign a transaction and hand the signed bytes back. Nothing in the codebase calls `signAndSendTransaction`; the Worker relays the bytes so it can confirm and report the trade.
- Panta builds every transaction (create, buy, claim). Soothia does not assemble instructions of its own except the documented fallback that reproduces Panta's build from Panta's instructions.

## Signed-transaction verification

Before anything is sent, `extension/src/tx-check.ts` parses the signed transaction and compares it with the one Soothia built. Only compute-budget instructions (priority fees a wallet may add) may differ; any other added, removed or altered instruction, any raised account privilege, and any new blockhash is refused. The check is pure byte parsing in the content script, outside the page's reach, and is unit-tested against a real Panta create transaction.

## Relay restricted to Panta

`POST /api/tx/send`, `/buy/send`, `/create/send` and `/claim/send` decode the signed transaction's static account keys and refuse it unless the Panta program (`6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp`) is among them. Program ids are always static keys, so this cannot be bypassed with an address lookup table. The proxy is not a general Solana relay for the Helius RPC it pays for.

## Dry run by default

The extension starts in dry run: quote, build, sign and simulate run, nothing is sent. The user turns it off in the card's settings. Bets are 1 to 100 USDC (server-enforced), the fee is shown on top of the stake, and create transactions are capped at 1,150 bytes server-side so they fit Solana's 1,232-byte limit.

## Rate limits and caps

Per-IP limits on the routes that cost money upstream (Claude, Panta quotes, RPC sends) and a per-install daily cap on `/detect`. Request bodies are capped at 32,000 characters and page text at 4,000 before it reaches the model. Every upstream call (Panta, Helius, Anthropic) has a timeout.

## Admin gate

`GET /debug/*` requires the `X-Soothia-Admin` header to equal the `ADMIN_TOKEN` Wrangler secret, compared in constant time. Without the header, with a wrong value, or when the secret is unset, those routes answer 404 like any unknown path.

## Content escaping

- Server-rendered pages (`site/worker.js`) escape every interpolated value; market image and Panta links are accepted only as https URLs, market ids are validated against the base58 shape before being linked.
- The extension renders titles, AI output and wallet names with `textContent`. `innerHTML` is used only with constant SVG strings.
- Every site response carries a Content Security Policy (scripts from the site and Cloudflare's analytics beacon only, no eval, nothing may frame the site), `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and HSTS.
- Page text sent to Claude is wrapped in a prompt that marks it as untrusted and asks for a single tool call; the result is validated field by field before anything is cached or shown.

## Secrets

- `PANTA_API_KEY`, `ANTHROPIC_API_KEY`, `HELIUS_RPC_URL` and `ADMIN_TOKEN` exist only as Wrangler secrets in production and in the gitignored `worker/.dev.vars` locally. They never reach the extension or the site.
- Logs never carry keys, full transactions or wallet addresses beyond short prefixes. Errors to clients are short codes or plain sentences without stack traces.
- The git history was scanned with gitleaks across every branch before the repo went public; `.gitignore` covers `.env*`, `.dev.vars*`, key, keypair and wallet files.

## Known limitations

- Rate limits live in the edge cache per colo, so a distributed caller can exceed them. The Workers Rate Limiting binding would make them global.
- The relay checks that a transaction names Panta, not that it matches the specific order it was built for. Diffing the stored built transaction server-side would close that gap.
- Install ids are self-declared; the per-install cap is a convenience, not an authentication boundary.
- Chain confirmation uses one RPC provider. An RPC outage pauses sends and confirmations; the reconcile sweep catches up when it returns.
- The content script runs on every page by design (the orb). It reads page text locally and sends at most 4,000 characters of it to the Worker, never stores it, and skips search engines, PDFs and pages behind consent walls.
