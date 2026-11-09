# Soothia: standing rules

Soothia is a Chrome MV3 extension (a floating orb on every page) where people call matches and claims before they happen. Each call is remembered on Walrus Memory and its hash is committed on Sui. A Cloudflare Worker (`soothia-proxy`) holds the keys and serves the extension. The operator does not write code: write, run, and verify everything, and give exact numbered steps for anything only the operator can do.

## Rules

1. **Mainnet only.** Sui mainnet and Walrus Memory mainnet. There is no testnet or staging setup. Every Sui transaction spends real SUI.
2. **Never commit or print secrets.** No keys in git, logs, terminal output, chat, or error responses. `.dev.vars` and `.wrangler` stay gitignored. Never ask the operator to paste a key into chat; give them the file and line instead. Object ids, package ids and addresses are not secret.
3. **Keys live only in the Worker** (Wrangler secrets in production, `worker/.dev.vars` locally, which the scripts in `worker/scripts` also read). They never go into the extension, which ships to users' browsers.
4. **Check the source before writing Sui, Walrus Memory or Tatum code.** Read the docs or the installed SDK's types. Do not guess method names, parameters, or response fields.
5. **Extension UI stays inside the shadow root.** One host element, closed shadow root, max z-index. Site CSS must not affect Soothia and Soothia must not affect the site. All styles live in `extension/src/styles.ts`.
6. **One branch per phase.** Never merge to `main` until the operator has run the SMOKE checklist and said it passed.
7. **Keep mainnet tests small.** Test stakes stay at the minimum. Test calls use a throwaway recall id, never the operator's real record.
8. **Never deploy unless the operator says so.**

## Architecture

- **Extension** (`extension/`): MV3, TypeScript, Vite. Build output in `extension/dist`. `WORKER_URL` (https://api.soothia.fun) is in `extension/src/config.ts`. Tabs are This page and My record.
- **Worker** (`worker/`): Cloudflare Worker `soothia-proxy`, served at https://api.soothia.fun and https://soothia-proxy.heylana.workers.dev; both stay live. Routes: `POST /detect` (prose through Claude, or the page's fixture), `/recall/*`, `/stake/*`, `/social/*`, `GET /stats`, `GET /health`, and the static admin page at `/admin` (`worker/admin`, bundled into the gitignored `worker/public` by `worker/scripts/build-admin.mjs`, which needs `extension/node_modules`). Never rename the heylana workers.dev subdomain.
- **Walrus Memory** (`worker/src/recall/memory.ts`): the source of truth for picks, outcomes, lessons and preferences. Writes are asynchronous and the store is append-only.
- **Sui through Tatum** (`worker/src/recall/tatumGrpc.ts`, `sui.ts`): reads and commits go through Tatum's gRPC gateway with a fetch-only transport, so they also run in Workers. Do not add `@grpc/grpc-js`.
- **Move packages** (`move/`): `soothia_recall` commits a pick's hash; `soothia_stake` is the parimutuel SUI staking pool.
- **Results** (`worker/src/recall/espn.ts`): football results from ESPN for six leagues. A cron sweep settles open picks every 15 minutes, and a second sweep five minutes later advances staking pools (`worker/src/stake/sweep.ts`), and a third five minutes after that rebuilds public profiles and leaderboards (`worker/src/social/snapshots.ts`).
- **Site** (`site/`): the landing site Worker `soothia`, served at https://soothia.fun (www redirects there) and https://soothia.heylana.workers.dev.
- **Scripts**: `worker/scripts/recall` and `worker/scripts/stake` are operator CLIs run with `npx tsx`; `scripts/` holds packaging and asset scripts.

## Notes

- `canonicalPick` in `worker/src/recall/records.ts` defines the hash already committed on Sui. Never change its fields or their order, including the legacy `marketId` and `marketYes`, or existing proofs stop verifying.
- An updated pick keeps its original `at`, so use `mergePicks`, not `latestBy`, to pick a version.
- Tatum's Sui JSON-RPC URL returns 404. Its gRPC gateway labels replies `application/grpc`, which is why the custom transport exists. The current plan allows 3 requests a second.
- `/recall/pick` spends the commit wallet's SUI, so commits pass through `worker/src/recall/commitGuard.ts`. The CLI does not.
- Staking keys are split: see `docs/staking-trust.md`. `RESOLVER_KEY` holds the ResolverCap and creates, resolves and voids pools. `commitKeypair` only pays for pick commits. The AdminCap and both UpgradeCaps are in the operator's Slush wallet, so scripts cannot use them.
- KV allows 1,000 writes a day on the free tier. Every KV write goes through `kvPut`.
- `poolKey` in `worker/src/stake/identity.ts` names pools that are permanent on Sui. Never change its format.
- A pool's close time comes from ESPN, never from a pick, because a pick's kickoff comes from the page.
- A call is "proven before kickoff" against ESPN's kickoff, never the pick's, because a pick's kickoff comes from the page.
- An anchor shows a call was made after a checkpoint. Only a Sui commit shows it was made before kickoff.

## Commands

- Everything, from the root: `npm test`, `npm run typecheck`
- Extension: `cd extension && npm install && npm run build` (also `npm run typecheck`, `npm test`)
- Extension zip: `npm run package-extension --prefix scripts` (writes `site/soothia-extension.zip`)
- Worker: `cd worker && npm install && npm run dev` (local), `npm run deploy` (production), `npm run typecheck`, `npm test`, `npm run build` (dry-run bundle)
- Move: `cd move/<package> && sui move test`
- Recall CLI: `cd worker && npx tsx scripts/recall/<lock|list|resolve|commit-existing|verify>.ts`
- Stake CLI: `cd worker && npx tsx scripts/stake/<keygen|publish|smoke|handover>.ts`
- Site Worker tests (security headers, redirect): `cd scripts && npm test`
- `GET /debug/*` on soothia-proxy needs the `X-Soothia-Admin` header equal to the `ADMIN_TOKEN` secret; otherwise 404. `/detect` and `/recall/*` are limited per IP (`worker/src/ratelimit.ts`).
