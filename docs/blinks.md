# Bet links (Solana Actions / Blinks)

Read on 2026-10-10 from solana.com/docs/advanced/actions, the `@solana/actions` package constants, docs.dialect.to (Blinks provider: build your first Blink, action chaining, error handling, fallbacks, register your Blink), and the live Jupiter action at jupiter.dial.to. Everything below is what we implement; the rules are the spec's.

## What a bet link is

`https://soothia.heylana.workers.dev/m/<marketId>` is a share page for one Panta market. For a person it shows the question, the live odds, "Bet YES" and "Bet NO" (which open dial.to with the action URL), "View on Panta" and "Get Soothia". For X and other crawlers it carries per-market Open Graph and Twitter card tags, so the link unfurls as a card even where Blinks are not rendered. For a Blink client (a wallet extension, dial.to, or a site with Dialect's client) the site's `/actions.json` maps `/m/*` to the Action API on the proxy, which turns the page into an interactive bet card.

## The Action API (proxy, `worker/src/actions.ts`)

Base: `https://soothia-proxy.heylana.workers.dev/api/actions/market/<marketId>`.

### Headers on every response (and on `OPTIONS` and `actions.json`)

From `ACTIONS_CORS_HEADERS` in `@solana/actions`, plus the two version headers Dialect's clients read:

| Header | Value |
| --- | --- |
| `Access-Control-Allow-Origin` | `*` |
| `Access-Control-Allow-Methods` | `GET,POST,PUT,OPTIONS` |
| `Access-Control-Allow-Headers` | `Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Accept-Action-Version, X-Accept-Blockchain-Ids` |
| `Access-Control-Expose-Headers` | `X-Action-Version, X-Blockchain-Ids` |
| `Content-Type` | `application/json` |
| `X-Action-Version` | `2.4` (Dialect's guide; Jupiter serves `2.4.2`) |
| `X-Blockchain-Ids` | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` (CAIP-2, Solana mainnet) |

`OPTIONS` answers 204 with the same headers.

### `GET` → action metadata

```json
{
  "type": "action",
  "icon": "https://soothia-proxy.heylana.workers.dev/img/<category>.png",
  "title": "<market question>",
  "description": "YES 50% · NO 50% · Breaking market on Panta. Made with Soothia.",
  "label": "Bet",
  "links": { "actions": [
    { "type": "transaction", "label": "YES $1", "href": ".../market/<id>?side=yes&amount=1" },
    { "type": "transaction", "label": "YES $5", "href": "...&amount=5" },
    { "type": "transaction", "label": "NO $1",  "href": "...?side=no&amount=1" },
    { "type": "transaction", "label": "NO $5",  "href": "...&amount=5" },
    { "type": "transaction", "label": "Bet YES", "href": ".../market/<id>?side=yes&amount={amount}",
      "parameters": [{ "name": "amount", "label": "USDC amount (1–100)", "type": "number", "min": 1, "max": 100, "required": true }] },
    { "type": "transaction", "label": "Bet NO", "href": ".../market/<id>?side=no&amount={amount}", "parameters": [ ...same ] }
  ] }
}
```

Rules we follow: `icon` is an absolute HTTPS URL to a PNG, `label` starts with a verb, `links.actions[].href` is same-origin, a `{amount}` placeholder in `href` is filled from the parameter of that name, `type: "number"` with `min`/`max` is a spec parameter type. The odds are omitted from the description when Panta returns no prices. "Breaking market" is used only when Panta says `marketType: "breaking"`; otherwise "Market on Panta". `?side=yes|no` on the GET narrows the buttons to one side; the share page's two buttons use it.

When the market is not in its primary (buying) phase, or `primaryPhaseEndTime` has passed:

```json
{ "type": "action", "icon": "...", "title": "...", "description": "...", "label": "Bet",
  "disabled": true, "error": { "message": "Betting is closed for this market." } }
```

(`error` on a GET is non-fatal: the client shows the card, greyed out, with the message.)

Unknown market: HTTP 404 `{"message":"Market not found."}`.

### `POST ?side=yes|no&amount=N` with body `{"account":"<base58 pubkey>"}` → transaction

The body's `account` is validated as a base58 32-byte key. `side` and `amount` (1.00 to 100.00 USDC, two decimals) come from the query. Flow: Panta primary buy quote → build → assemble a v0 transaction with a fresh blockhash and `account` as fee payer (the extension's buy code) → refuse over 1,150 bytes. Response:

```json
{ "type": "transaction", "transaction": "<base64>",
  "message": "Buying ~1.99 YES shares for $1.02 (incl. 2% fee)",
  "links": { "next": { "type": "post", "href": "/api/actions/market/<id>/confirm?orderId=<orderId>" } } }
```

The order record `{wallet, marketId, side, amountUsdc, quoteId, orderId, source: "blink"}` is stored in KV under `buy:<orderId>` and `buy:<quoteId>`, the same records the extension uses, so `/buy/status` could also finish it.

Errors are spec `ActionError` bodies, `{"message": "..."}`, with 400 for validation and closed markets and 502 when Panta or the RPC fails. Panta codes are mapped: `MARKET_NOT_FOUND` → "This market does not exist."; closed/phase codes → "Betting is closed for this market."; insufficient balance → "Not enough USDC in this wallet for that bet."; validation codes pass Panta's message through; anything else → "Panta could not price this bet right now. Please try again in a moment."

### `POST /confirm?orderId=<orderId>` with `{"account", "signature"}` → completed action (chaining)

`links.next` of type `post` is the spec's action chaining: after the wallet signs and the client sends the transaction, the client POSTs `NextActionPostRequest` (`account`, `signature`, optional `state`) to that same-origin `href` and renders the `NextAction` it gets back. We check the order belongs to `account`, store the signature, and run the idempotent finish from the extension's buy flow: wait for confirmation (up to 20 s) → Panta `/primaryordersubmit/` → `/primaryorderverify/` → `/trades/` (attribution). Response is a `CompletedAction` (no `links`):

```json
{ "type": "completed", "icon": "...", "title": "Bet placed. Good luck.",
  "description": "$1.00 on YES: <question>.", "label": "Done" }
```

Still pending after 20 s → "Bet sent" and the finish continues in the background. Failed on chain → "Bet failed" with an `error`. Calling the callback again with the same signature repeats the finish (every Panta step is idempotent) and answers the same. A different wallet is 403, a different signature for the same order 409, an unknown order 404.

If a client does not support chaining it stops after sending: the bet is on-chain and real, Panta sees it on its own, but it is not attributed to Soothia and will not show in the landing stats. Nothing else is lost.

### `actions.json`

At the site root, `https://soothia.heylana.workers.dev/actions.json`, with the CORS headers above:

```json
{ "rules": [ { "pathPattern": "/m/*", "apiPath": "https://soothia-proxy.heylana.workers.dev/api/actions/market/*" } ] }
```

A cross-host `apiPath` is what Jupiter does (`jup.ag/actions.json` → `worker.jup.ag`). The proxy also serves its own `/actions.json` mapping `/api/actions/**` to itself.

## Interstitial and fallbacks

A link that works everywhere today: `https://dial.to/?action=solana-action:<url-encoded action URL>`. Dialect says to URL-encode everything after `solana-action:`. The share page's buttons are exactly this, with `?side=yes` or `?side=no` on the action URL. Dialect's public API renders any action: `https://api.dial.to/v1/blink?apiUrl=<action URL>` (full blink JSON) and `https://api.dial.to/v1/blink-preview?apiUrl=<action URL>` (title, description, image, cta). We use these as the validator.

## Registry (X unfurling)

Only actions registered with Dialect's registry (`trusted`) unfurl as Blinks on X; Phantom and Backpack do not render `none` or `blocked`. Registration is a manual review: Dialect's docs say to email hello@dialect.to; Solana's guide points to `dial.to/register` (a Cloudflare challenge page from curl, so the browser is needed). The registry is public at `https://actions-registry.dial.to/all` (`{"actions":[{"host":..., "state":"trusted"}]}`), keyed by host. Until we are listed, the `/m/` link still unfurls on X as an ordinary card from the Open Graph tags.

## Spec differences from the brief

- The brief asked for the description "YES p% · NO p% · Breaking market on Panta." We say "Market on Panta" for non-breaking markets so the card never lies.
- The spec's chaining callback does not carry the order; we put `orderId` in the `href` query, which the spec allows (any same-origin URL).
- `PUT` is in the spec's allowed methods header but is not used.
