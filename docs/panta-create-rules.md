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

**LIVE, and more important than the documented limits below:** `question`, `resolutionRule`, and every entry of `sourcesOfTruth` are written into the create transaction, and a Solana transaction cannot exceed 1232 bytes. Panta's quote and build do not check this. A draft with a 55-character question, a 612-character rule, and three sources quoted and built without error, but the transaction was 1539 bytes and could never be signed (`@solana/web3.js` fails with "encoding overruns Uint8Array") or sent.

Measured twice: transaction bytes = 737 + the UTF-8 bytes of the question and rule + (bytes + 4) for each source. The prediction matched the real build exactly both times.

Soothia's rules (in `worker/src/pantaRules.ts` and `worker/src/resolution.ts`):

- A built create transaction over **1150 bytes** is refused (`MAX_BUILT_TRANSACTION_BYTES`). The 82 bytes of headroom are for compute-budget or priority-fee instructions a wallet adds when signing. **LIVE:** Phantom added one compute-budget instruction, 12 bytes (938 built, 950 signed).
- That leaves 405 bytes of text (`ONCHAIN_TEXT_BUDGET_BYTES`). The question is capped at 200 characters.
- **Every market keeps one authoritative data source, listed first and never dropped:** crypto uses the asset's CoinGecko page (else `https://www.coingecko.com`); sports uses the league's official site (else `https://www.espn.com`); every other category uses `https://www.reuters.com`. The page the claim came from is the second source when there is room.
- The rule names that source: "YES if this happens by <deadline UTC>, per CoinGecko's BTC/USD price. Otherwise NO.", plus one fixed sentence per resolution type when there is room. The rule is never written from model-drafted wording, which can carry numbers that are not on the page.
- A draft that does not fit is shrunk in this order, stopping as soon as it fits: (a) drop the page link; (b) the minimal rule (the first sentence only); (c) the question trimmed to 150 characters on a word boundary. The quote response lists what was done in `adjustments` (`page_link_dropped`, `minimal_rule`, `question_trimmed`) and returns the final `question` and the `authority`.
- `/create/build` measures the real transaction. If it is over the cap it shrinks one more step, quotes again, rebuilds, and returns the new quote so the user can review the changed text before signing.
- **LIVE:** "Will Bitcoin reach a new all-time high by December 31, 2026?" with an X post as the page keeps both sources and builds to 1051 bytes. A 196-character question with a 119-character page URL drops the page link and builds to 1103 bytes. A 200-character question in mixed Latin and Cyrillic needs all three steps and builds to 1084 bytes.
- The extension checks the signed transaction before sending: it must be at most 1232 bytes, and identical to the built one except for added or changed compute-budget instructions (`extension/src/tx-check.ts`).

The documented limits, which the transaction size makes unreachable:

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

## Market types (from the Panta team and panta.market/how-it-works, 2026-10-10)

`marketType` is `standard` or `breaking`. The docs describe it only as a timing mode; the Panta team and the How it works page add:

| | Breaking | Standard |
| - | - | - |
| Creation fee (from the live quote) | **LIVE: 20 USDC** (5 liquidity, 15 platform) | **LIVE: 50 USDC** (10 liquidity, 40 platform) |
| `startTime` | Must be within 72 hours of creation, and at least `minimumStartDelay` (3600s) ahead unless `eventInProgress` is true | At least `minimumStartDelay` ahead; no documented maximum |
| `eventInProgress` | Allowed. Skips the start-delay check; `startTime` should be at or before now (the playground requires `startTime <= now`); `endTime` must be in the future | Not allowed |
| `endTime` | Any future time | After `startTime` |
| Phases | Buying (primary, buy-only) from creation until `startTime`, then peer-to-peer trading until resolution | Same |

Soothia's rules (`worker/src/pantaRules.ts`): new drafts are breaking; "Buying window closes" is 1 to 72 hours after creation for breaking (default 48 hours), up to 365 days for standard; "Event is live now" sets `eventInProgress: true` with `startTime` one minute in the past and is offered only when `/detect` flagged the claim as `eventLive`; `endTime` must come after `startTime`, be at least 10 minutes out (2 hours for standard), and within 365 days. The fee always comes from the live quote.

**LIVE:** a breaking quote with `eventInProgress: true` succeeded (20 USDC) and built to 1046 bytes on the second try. The first build failed with `unexpected create build failure — check server logs`: build has the same transient failure as quote, and the Worker now retries both the same way.

### Resolution and payouts (from the Panta team, not in the docs)

- Panta's AI Resolution Agent resolves the market from the question and the sources of truth, then there is a 1-hour dispute window. Disputes need a bond and are reviewed by the Panta team.
- Creator royalties are up to 20% of the pool, reduced if the market is very one-sided, claimable after the primary phase ends (`POST /claim/creator-fees/build/`).
- Primary trades pay a 2% fee.

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

## Create flow

Re-read 2026-10-05 for the P2 build: Quote a market, Build create transaction, Register market, Upload market image, How it works, Errors, Trade status, List creates, and the playground's `CreateMarketFlow.tsx` and `src/lib/solana.ts`. The order is quote, build, sign, broadcast, register. Panta never signs and never broadcasts.

### 1. Quote: `POST /markets/create/quote/`

Request: the fields in "Quote fields" above.

Response:

| Field | Type | Meaning |
| - | - | - |
| `createId` | string | Session id (`cr_…`) for build and register. |
| `expectedEventPda` | string | The market's on-chain address. Becomes `marketId`. |
| `paymentUsdc` | string | Total fee, USDC base units (6 decimals). |
| `liquidityInjectionUsdc` | string | Liquidity part of the fee, base units. |
| `platformRevenueUsdc` | string | Platform part of the fee, base units. |
| `marketType` | string | `standard` or `breaking`. |
| `expiresAt` | string | Session expiry, ISO-8601. |
| `blockhashExpiryHintSec` | integer | `60`. |

**LIVE:** the response also carries `userId` and `apiKeyId`. Soothia does not pass these on.

### 2. Build: `POST /markets/create/build/`

Request: `createId` (required), `wallet` (optional; if set it must equal the quote's wallet).

Response:

| Field | Type | Meaning |
| - | - | - |
| `transaction` | string | Base64 unsigned `VersionedTransaction`. Create build returns a whole transaction, not an instruction list. (Primary buy and claim builds return `instructions`; create does not.) |
| `recentBlockhash` | string | Blockhash inside the transaction. |
| `lastValidBlockHeight` | integer | Last block height at which that blockhash is valid. |
| `buildFingerprint` | string | Integrity fingerprint, "checked at register". |
| `derived` | object | Addresses the transaction uses: `event`, `vaultAuthority`, `marketConfig`, … |
| `createId`, `expectedEventPda`, `paymentUsdc`, `liquidityInjectionUsdc`, `platformRevenueUsdc`, `marketType`, `expiresAt`, `blockhashExpiryHintSec` | | Echoed from the quote. |

"Do not change instruction accounts or fee amounts." If the blockhash expires, call build again with the same `createId`; if the session expired, quote again.

**LIVE:** build's `expiresAt` is not the session expiry. A quote with `expiresAt` 15:19:06 produced a build with `expiresAt` 15:15:47, about a minute after the build call. It tracks the blockhash. Use the quote's `expiresAt` for the session.

**LIVE:** the built transaction has one signature slot (the wallet) and three instructions: compute budget, associated token account, and Panta's program `6gM5afTQBq5VZCfgpGqcsqzfWd5maLSCKWtGjbEobZMp`.

### 3. Sign and broadcast

The playground deserializes with `VersionedTransaction.deserialize(Buffer.from(base64, "base64"))`, calls the wallet's `signTransaction`, and sends with `connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, preflightCommitment: "confirmed" })` on its own RPC.

### 4. Register: `POST /markets/register/`

Request: `createId` and `signature` (base58), both required. Nothing else.

Response:

| Field | Type | Meaning |
| - | - | - |
| `marketId` | string | "Event address used as the market id in later APIs." |
| `status` | string | `registered` on success. |
| `images` | string[] | One entry: the quoted `imageUrl`. |
| `createId`, `signature`, `category`, `title` | | Echoed. |

Verification is "fail-closed (transaction presence and success, program, accounts, fee match)". Repeating the same `createId` + `signature` is idempotent. After success, a `createId` cannot register a different signature.

### Session lifetimes

| Thing | Lifetime |
| - | - |
| Create session (`createId`) | about 5 minutes (`expiresAt`) |
| Build blockhash | about 60 seconds (`blockhashExpiryHintSec`) |
| Image upload signature | about 5 minutes |

### Failure modes

| Where | Code | Meaning | What Soothia does |
| - | - | - | - |
| Quote | `INVALID_MARKET_PARAMS` with `field` or `fields` | A field failed validation. | Show the message. |
| Quote | `INVALID_MARKET_PARAMS`, message `unexpected create quote failure — check server logs` | Transient (seen live). | Retry once. |
| Quote | `DUPLICATE_MARKET` | This wallet already made a market with this question. | Tell the user; nothing is charged. |
| Quote, upload | `CREATE_NOT_PERMITTED` | Permission disabled on the account. | Show an error. |
| Build, register | `CREATE_EXPIRED` | "`createId` missing, expired, or consumed". | Before signing: quote again. After a confirmed transaction: see the risk below. |
| Register | `TX_NOT_FOUND` | "Signature not observed at required commitment". | Wait and retry register. |
| Register | `TX_FAILED` | The transaction failed on-chain. | Nothing was created; report it. |
| Register | `TX_MISMATCH`, `TX_FEE_MISMATCH` | The transaction is not the one that was built. | Report it. |
| Any | `RATE_LIMITED` | Quote 30 per 60s, build 20 per 60s, register 40 per 60s, per account. | Honor `Retry-After`. |

**UNCLEAR, and the main risk in this flow:** whether register still succeeds when the transaction confirmed but the 5-minute session ran out before register was called. The docs list `CREATE_EXPIRED` for register. If so, a slow signer could pay 50 USDC for a market that is on-chain but not in the catalog. Soothia refuses to send a signed transaction when the session has under 45 seconds left, and asks for a fresh signature on a new quote instead.

**LIVE:** the transient quote failure (`unexpected create quote failure — check server logs`) showed up on roughly one quote in three during the P2 build and cleared within a few seconds each time. Soothia's Worker retries twice (after 1.5s and 4s).

**LIVE:** Panta's quote accepted an `imageUrl` hosted on the Soothia Worker (`https://soothia-proxy.heylana.workers.dev/img/crypto.png`). The Cloudinary upload flow was not needed.

**UNCLEAR:** the required commitment for register (`confirmed` or `finalized`).

### After creation

- `GET /account/creates/` lists this API account's create sessions with `status` `pending` (quote reserved), `built`, or `registered`, plus `eventPda` and `signature`. It is the fallback record if Soothia loses track of a paid market.
- `GET /markets/?createdBy=me` lists catalog rows for markets this account created.
- `GET /trades/{signature}/` reports attribution for primary buys and win claims. It does not cover create transactions.

### Market page URL

`https://www.panta.market/market/<marketId>`

**LIVE:** `https://www.panta.market/market/4J6WxFGuCw9deMJ6pQ7gwpVXCvLorMrz28icSnCYWeGB` returns HTTP 200 with the page title "Manchester United will win against Spurs with 2 or more goals | Panta Market". The same id under `/markets/`, `/event/`, `/events/`, and `/m/` returns 404. The pattern is not in the docs or the playground; it was found by testing the site.
