# Soothia

Soothia is an AI buddy that lives in your browser as a Chrome extension. A small floating orb sits on every webpage. In later phases it reads what you are reading (tweets, news, sports), spots claims you could bet on, shows the matching [Panta](https://docs.panta.market) prediction market with live odds, and lets you buy YES or NO with your Phantom wallet, or create a new market straight from the page. Panta markets are binary YES/NO markets settled in USDC on Solana mainnet. This repo is at P0: the orb, a status card, a proxy Worker that keeps the Panta API key off users' machines, and a script that takes stock of the Panta catalog.

## Repo layout

| Path | What it is |
| - | - |
| `extension/` | Chrome MV3 extension (TypeScript, Vite). Build output goes to `extension/dist`. |
| `worker/` | Cloudflare Worker `soothia-proxy` (TypeScript, Wrangler). Holds the Panta API key. |
| `scripts/` | Node + TypeScript scripts, run with `tsx`. |
| `docs/` | Generated reports, such as `catalog-check.md`. |
| `CLAUDE.md` | Standing rules for anyone (human or AI) working in this repo. |

## Build the extension

```bash
cd extension
npm install
npm run build
```

Then load it in Chrome: open `chrome://extensions`, turn on **Developer mode** (top right), click **Load unpacked**, and pick the `extension/dist` folder. After each rebuild, click the reload arrow on the Soothia card on that page.

The Worker URL the extension talks to is the single constant `WORKER_URL` in `extension/src/config.ts`. All visual styles are in `extension/src/styles.ts`.

## Run and deploy the Worker

The Worker needs one secret, `PANTA_API_KEY`.

Run locally:

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars   # then paste your key after PANTA_API_KEY=
npm run dev                      # serves http://localhost:8787
```

Deploy:

```bash
cd worker
npx wrangler login                     # once per machine
npx wrangler secret put PANTA_API_KEY  # once; paste the key when prompted
npm run deploy
```

Routes:

| Route | Returns |
| - | - |
| `GET /health` | `{"ok":true,"service":"soothia-proxy"}` |
| `GET /panta/markets` | Panta's market list. Passes through `limit`, `cursor`, `category`, and `status` (`phase` is accepted as an alias for `status`). |
| `GET /panta/categories` | Panta's category list. |

Panta responses are returned as-is with their status code. If Panta cannot be reached the Worker returns `502 {"error":"upstream_unavailable"}`. CORS allows `chrome-extension://` origins and `http://localhost`.

## Run the catalog check

```bash
cp .env.example .env   # in the repo root; then paste your key after PANTA_API_KEY=
cd scripts
npm install
npm run catalog-check
```

It pages through every Panta market, prints a summary (totals, counts by phase and category, how many are tradable, 15 sample markets with YES prices), and writes it to `docs/catalog-check.md`.
