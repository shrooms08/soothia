# Soothia: standing rules

Soothia is a Chrome MV3 extension (floating orb on every page) backed by a Cloudflare Worker proxy (`soothia-proxy`) in front of the Panta prediction-market API. The operator does not write code: write, run, and verify everything, and give exact numbered steps for anything only the operator can do.

## Rules

1. **Mainnet only.** Panta runs on Solana mainnet. There is no devnet. Every transaction moves real USDC.
2. **Never commit or print secrets.** No keys in git, logs, terminal output, chat, or error responses. `.env`, `.dev.vars`, and `.wrangler` stay gitignored. Never ask the operator to paste a key into chat; give them the file and line instead.
3. **The Panta key and the Claude key live only in the Worker** (Wrangler secrets in production, `worker/.dev.vars` locally). They never go into the extension, which ships to users' browsers. The one exception is the root `.env`, which local scripts in `/scripts` read; it is gitignored.
4. **Read the Panta docs before writing Panta code.** Start at https://docs.panta.market/llms.txt and open the relevant reference pages. Do not guess endpoint paths, parameter names, or response fields.
5. **Trailing slashes on every Panta path.** Base URL is `https://live-api.panta.market/api/v1`; paths look like `/markets/` and `/categories/`.
6. **Extension UI stays inside the shadow root.** One host element, closed shadow root, max z-index. Site CSS must not affect Soothia and Soothia must not affect the site. All styles live in `extension/src/styles.ts`.
7. **One branch per phase** (`p0-skeleton`, `p1-...`). Never merge to `main` until the operator has run the SMOKE checklist and said it passed.
8. **Keep test bets between $1 and $2.**

## Layout

- `extension/`: MV3 extension, TypeScript, Vite. Build output in `extension/dist`. `WORKER_URL` is the single constant in `extension/src/config.ts`.
- `worker/`: Cloudflare Worker `soothia-proxy`, TypeScript, Wrangler.
- `scripts/`: Node + TypeScript scripts run with `tsx`.
- `docs/`: generated reports such as `catalog-check.md`.

## Panta notes (from the docs)

- Auth header is `X-Api-Key`. Keys in query strings are rejected.
- `GET /markets/` takes `category`, `status` (the market phase: `primary`, `secondary`, `resolved`, `cancelled`), `cursor`, and `limit` (max 50). It returns `{ items, nextCursor }`.
- The docs say list rows have null prices and `GET /markets/{marketId}/` fills `yesPrice` and `noPrice`. Observed on 2026-10-05: list rows did carry prices, some list rows had a blank `title` that the detail endpoint filled, and detail calls made in a quick burst sometimes came back with blank titles and null prices. Merge list and detail data instead of trusting either alone.
- `GET /categories/` returned 8 slugs, but live markets use others too (`stocks`, `commodities`, `pop-culture`, `macroeconomics`, `business`, `gaming`, `space-universe`). Do not treat the categories list as complete.
- Creating a market costs 50 USDC (from the live quote). Full rules are in `docs/panta-create-rules.md`.
- The question, resolution rule, and sources are stored in the create transaction, which must fit in 1232 bytes. Panta does not check this. The Worker refuses built create transactions over 1150 bytes and shrinks the text to fit, always keeping one authoritative source (CoinGecko, the league site or ESPN, or Reuters) (`worker/src/pantaRules.ts`, `worker/src/resolution.ts`).
- Market page: `https://www.panta.market/market/<marketId>`.
- Catalog reads are rate limited to about 120 requests per 60 seconds. Honor `Retry-After` on 429.

## Commands

- Extension: `cd extension && npm install && npm run build` (also `npm run typecheck`)
- Worker: `cd worker && npm install && npm run dev` (local), `npm run deploy` (production), `npm run typecheck`, `npm test`
- Extension tests: `cd extension && npm test`
- Category images: `cd scripts && npm run make-category-images` (writes `worker/public/img`)
- Catalog check: `cd scripts && npm install && npm run catalog-check`
