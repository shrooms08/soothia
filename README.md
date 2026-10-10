# Soothia

See the odds on everything you read. Soothia is a Chrome extension: a small floating orb sits on every page, reads the article, tweet, or match preview you are on, and turns its claims into [Panta](https://docs.panta.market) prediction markets. It shows the matching market with live odds, lets you bet YES or NO from your own Solana wallet, or creates a new market straight from the page. Panta markets are binary YES/NO markets settled in USDC on Solana mainnet.

- Site and install: https://soothia.fun
- Markets made and found with Soothia: https://soothia.fun/markets
- API (Cloudflare Worker `soothia-proxy`): https://api.soothia.fun

Soothia never holds funds or keys. The extension asks your wallet to sign a transaction that Panta built; the Worker checks that the signed bytes match what was built (only a compute budget may be added) and relays only transactions that invoke the Panta program. Dry run is on by default: the extension signs but never sends until you turn it off in the card's settings. Bets are 1 to 100 USDC.

## Repo layout

| Path | What it is |
| - | - |
| `extension/` | Chrome MV3 extension (TypeScript, Vite). Build output goes to `extension/dist`. |
| `worker/` | Cloudflare Worker `soothia-proxy` (TypeScript, Wrangler). Holds the Panta, Claude, and RPC keys. |
| `site/` | The landing site Worker `soothia` (static files plus server-rendered `/m/<marketId>` and `/markets`). |
| `scripts/` | Node + TypeScript scripts: catalog check, extension packaging, site assets. |
| `docs/` | Notes and generated reports (`panta-create-rules.md`, `blinks.md`, `wallets.md`, `catalog-check.md`). |
| `design/` | Screenshots of applied designs and the headless check scripts in `design/tools`. |
| `CLAUDE.md` | Standing rules for anyone (human or AI) working in this repo. |

## Build the extension

```bash
cd extension
npm install
npm run build        # writes extension/dist
npm test             # unit tests
npm run typecheck
```

Load it in Chrome: open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and pick `extension/dist`. After each rebuild, click the reload arrow on the Soothia card on that page.

The Worker URL is the single constant `WORKER_URL` in `extension/src/config.ts`. All visual styles live in `extension/src/styles.ts`. The card's settings (bottom of the card) hold dry run, sound, and a **Show debug info** toggle that reveals the scan and transaction diagnostics; it is off by default.

Package the zip the site serves: `cd scripts && npm install && npm run package-extension` (writes `site/soothia-extension.zip` and checks the version).

## Run and deploy the Worker

Secrets (never in git): copy `worker/.dev.vars.example` to `worker/.dev.vars` for local runs; in production each is set once with `npx wrangler secret put <NAME>`.

| Secret | Used for |
| - | - |
| `PANTA_API_KEY` | Panta API (catalog, quotes, building transactions). |
| `ANTHROPIC_API_KEY` | `/detect` (claims from page text) and `/match` (claim to market). |
| `HELIUS_RPC_URL` | Solana mainnet RPC for balances, simulation, sending, and confirmation. |
| `ADMIN_TOKEN` | Gates `GET /debug/*`; sent as the `X-Soothia-Admin` header. Without it those routes return 404. |

```bash
cd worker
npm install
npm run dev          # http://localhost:8787
npm test
npm run typecheck
npm run deploy
```

Main routes: `GET /health`, `GET /markets` (normalized catalog), `GET /market?id=`, `GET /stats`, `POST /detect` and `POST /match` (per-IP limited), wallet and transaction routes under `/wallet`, `/create`, `/buy`, `/claim` (require an `X-Soothia-Install` id), and the Solana Actions routes `/actions.json`, `/api/actions/market/:id`, `/api/tx/send`, `/api/tx/status` used by bet links.

## Deploy the site

```bash
cd site && npx wrangler deploy
cd scripts && npm test      # escaping and security-header tests for site/worker.js
```

## Catalog check

```bash
cp .env.example .env          # repo root; paste the Panta key after PANTA_API_KEY=
cd scripts && npm install && npm run catalog-check
```

It pages through every Panta market and writes a summary to `docs/catalog-check.md`.

## Sounds and music

Sound effects are synthesized with the Web Audio API (`extension/src/sfx.ts`). The chosen style is stored in `chrome.storage.local` under `soothia:sfxStyle`, and mute under `soothia:muted`. Audition them at `chrome-extension://<extension id>/welcome.html?sfx=1`.

Music plays only on the welcome page, never on websites. Its license is tracked in `extension/public/music/LICENSE-music.txt`.

## License

MIT, see `LICENSE`. The onboarding music is licensed separately.
