# Panta market creation rules

Compiled 2026-10-05 from the Panta docs (Create market overview, Quote a market, Build create transaction, Register market, Upload market image, Categories, Errors, Authentication, How it works), the `Kaito-HQ/panta-api-playground` repo (`src/components/CreateMarketFlow.tsx`), and quote-only probes against the live API with our key. A quote reserves a 5-minute session and moves no funds; no transaction was built or signed.

Lines marked **LIVE** were confirmed against the live API. Lines marked **UNCLEAR** are not answered by the docs.

`worker/src/pantaRules.ts` encodes these rules. Change this file and that one together.

## Can we create markets?

Yes. Creation is self-serve.

- Create routes require `canCreateMarkets: true` on the account. It "defaults to `true` on signup". Operators may disable it, and then create routes return `{ "code": "CREATE_NOT_PERMITTED" }`.
- **LIVE:** `GET /account/` for our key returns `"status": "active"` and `"canCreateMarkets": true`.
- There are no other permission flags in the docs.

## Flow

1. Optional: `POST /markets/create/image-upload/` returns signed Cloudinary fields. Upload the file to Cloudinary yourself and use its `secure_url` as `imageUrl`.
2. `POST /markets/create/quote/` validates the parameters, reserves a session, and returns `createId` and the fee.
3. `POST /markets/create/build/` with `createId` (and optionally `wallet`) returns `transaction`, a base64 unsigned `VersionedTransaction`.
4. The user's wallet signs. We broadcast on our own RPC. Panta does not broadcast.
5. `POST /markets/register/` with `createId` and `signature` returns `marketId` and `"status": "registered"`.

The create session (`createId`) lasts about 5 minutes. The blockhash lasts about 60 seconds; call build again if it expires. Register is idempotent for the same `createId` + `signature`.

## Quote fields

`POST /markets/create/quote/`

Required:

| Field | Type | Rule |
| - | - | - |
| `wallet` | string | Fee payer and signer, base58. |
| `question` | string | Max 512 characters. Combined with `wallet` to derive the event address, so the same wallet cannot reuse a question (`DUPLICATE_MARKET`). |
| `resolutionRule` | string | Resolution criteria, max 2048 characters. |
| `sourcesOfTruth` | string[] | Non-empty, max 20 entries. |
| `category` | string | One of the allowed categories below. |
| `startTime` | integer | Unix seconds. See time rules. |
| `endTime` | integer | Unix seconds. |
| `resolutionTime` | integer | Unix seconds. |
| `imageUrl` | string | Exactly one public `http`/`https` URL, max 2048 characters. |

Optional:

| Field | Type | Rule |
| - | - | - |
| `marketType` | string | `standard` (default) or `breaking`. |
| `eventInProgress` | boolean | Only with `marketType: "breaking"`. Skips the start-delay check. |
| `title` | string | Defaults to `question`. Length limit **UNCLEAR**. |
| `description` | string | Catalog description. Length limit **UNCLEAR**. |
| `region` | string | Defaults to `Global`. |
| `oracle` | string | Defaults to `sourcesOfTruth` joined by `,`. |

`paymentUsdc` in the request is ignored; the fee comes from on-chain config.

## Allowed categories

`sports`, `crypto`, `politics`, `entertainment`, `finance`, `science`, `world`, `other`

- **LIVE:** `GET /categories/` returns exactly this list.
- **LIVE:** quoting with `category: "stocks"` fails with `category must be one of: crypto, entertainment, finance, other, politics, science, sports, world`.
- The live catalog also holds markets in `stocks`, `commodities`, `pop-culture`, `macroeconomics`, `business`, `space-universe`, and `gaming`. Those were not created through this API and cannot be used for create. They still matter for matching in `/match`.

## Length limits

- `question`: max 512.
- `resolutionRule`: max 2048.
- `sourcesOfTruth`: 1 to 20 entries. Per-entry length **UNCLEAR**.
- `imageUrl`: max 2048.
- Minimum question length: **UNCLEAR** (none documented).

## Time rules

- `startTime < endTime ≤ resolutionTime`.
- For `standard` markets, `startTime` must be at least the on-chain `minimumStartDelay` ahead of now, "typically **3600** seconds".
  - **LIVE:** a start 600 seconds ahead fails with `startTime must be at least 3600s ahead of now (minimumStartDelay from MarketConfig)`.
- `breaking` markets with `eventInProgress: true` skip the start delay, but `endTime` must still be in the future. The playground also requires `startTime ≤ now` in that case.
- **LIVE:** a market only 60 seconds long (`endTime = startTime + 60`) quotes successfully, so there is no practical minimum duration.
- **LIVE:** `resolutionTime` equal to `endTime` quotes successfully.
- **LIVE:** a 30-day market quotes successfully.
- Maximum time to `endTime`: **UNCLEAR**. Soothia caps drafts at 365 days as its own product limit.

Because of the start delay, the earliest possible `endTime` for a standard market is a little over one hour from now. Soothia requires `endTime` to be at least 2 hours ahead when drafting.

## How resolution works

- A market is a binary YES/NO question. There is no price-threshold, sports, or other structured market type in the API. `marketType` only distinguishes `standard` from `breaking` (a timing mode, not a resolution mode).
- Resolution is described in free text: `resolutionRule` (the criteria) plus `sourcesOfTruth` (where the answer is read from). These two fields are the "resolution metadata".
- The docs example uses a URL (`"sourcesOfTruth": ["https://www.coingecko.com"]`). **LIVE:** a plain name (`["CoinGecko"]`) is also accepted.
- `oracle` is an optional string that defaults to the joined sources. The Authentication page says not to send "Oracle feed identifiers" because they are "Derived server-side from resolution metadata".
- Register is described as writing "catalog / oracle metadata".
- **UNCLEAR:** who or what actually resolves a market (an automated oracle, Panta staff, or the creator), how disputes work, and what happens when a rule cannot be evaluated. There is no resolve endpoint in the public API.
- **UNCLEAR:** whether any `resolutionRule` wording is rejected or left unresolved. The API accepts any text.

Since any free-form binary question is creatable, Soothia limits drafts to three resolution types it can describe precisely. This is a Soothia rule, not a Panta rule:

| Soothia type | Meaning | Categories |
| - | - | - |
| `price_threshold` | An asset price or index level compared with a number at a set time, read from a named public price source. | `crypto`, `finance` |
| `sports_result` | The result of a scheduled match or competition, read from the official league or competition result. | `sports` |
| `official_outcome` | A dated outcome confirmed by an official or authoritative public source (election result, release, announcement, published figure). | any |

## Creation fee

- Quote returns `paymentUsdc` (total), `liquidityInjectionUsdc`, and `platformRevenueUsdc`, as integer strings in USDC base units (6 decimals).
- **LIVE:** every successful quote returned `"paymentUsdc": "50000000"`, `"liquidityInjectionUsdc": "10000000"`, `"platformRevenueUsdc": "40000000"`. That is **50 USDC per market**: 10 USDC goes into the market's liquidity and 40 USDC is platform revenue.
- The fee comes from on-chain config and can change. Always show the fee from the quote, never a hardcoded number.
- Register checks the on-chain payment against the quote (`TX_FEE_MISMATCH`).
- The wallet also pays normal Solana network fees. Amount **UNCLEAR**.

This fee is far above the $1 to $2 test-bet limit in `CLAUDE.md`. Creating even one test market costs 50 USDC of real money.

## Image

- `imageUrl` is required and catalog-only (not written on-chain).
- Exactly one URL, a string, publicly reachable over `http` or `https`, max 2048 characters.
- Not localhost or a private network. No data URLs, short-lived signed URLs, or private buckets.
- 1024×1024 square is recommended. It is "not a hard API check", and "there is no hard format/size gate".
- The upload helper returns `uploadUrl`, `publicId`, `expiresAt` (about 5 minutes), and `fields`. Post `fields` plus `file` as `multipart/form-data` to `uploadUrl`. The playground accepts PNG, JPEG, WebP, and GIF.
- The helper can return `UPLOAD_NOT_CONFIGURED` (503).

## Errors and limits

Errors are JSON: `{ "code", "message", "field" }` or `{ "code", "message", "fields" }`. Switch on `code`.

| Code | When |
| - | - |
| `INVALID_MARKET_PARAMS` | Bad fields, illegal times, bad `imageUrl`. |
| `DUPLICATE_MARKET` | This wallet already has a market with this question. |
| `CREATE_NOT_PERMITTED` | Create permission disabled. |
| `CREATE_EXPIRED` | `createId` missing, expired, or consumed. |
| `TX_NOT_FOUND`, `TX_FAILED`, `TX_MISMATCH`, `TX_FEE_MISMATCH` | Register could not verify the transaction. |
| `UNAUTHORIZED`, `RATE_LIMITED`, `INTERNAL_ERROR` | General. |

Rate limits per account: quote 30 per 60s, build 20 per 60s, register 40 per 60s, upload 10 per 60s, catalog reads 120 per 60s. Honor `Retry-After` on 429.

**UNCLEAR:** in the first probe batch, four valid-looking quotes failed with `INVALID_MARKET_PARAMS` and the message `unexpected create quote failure — check server logs`. The same parameters succeeded a minute later. Treat that message as a transient upstream failure and retry once.
