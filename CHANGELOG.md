# Changelog

All notable changes to Soothia. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are the Chrome extension's manifest version; the Workers deploy continuously alongside it.

## Total Recall (in progress)

Branch `total-recall`. A local CLI that locks football predictions as memories on Walrus Memory mainnet, then scores them after the matches. No Worker deploy and no extension changes.

### Added

- Scaffold: record shapes, scoring and lessons, Walrus Memory client, Tatum Sui RPC, and the `soothia_recall` Move package (`worker/src/recall`, `move/soothia_recall`).
- ESPN fixtures and results for six leagues (`worker/src/recall/espn.ts`).
- Optional Sui checkpoint anchor on each pick, read through Tatum's gRPC gateway and covered by the pick's hash. An anchor shows a call was made after checkpoint N.
- CLI: `lock.ts`, `list.ts`, `resolve.ts` in `worker/scripts/recall`, with a gitignored local backup in `worker/.recall-local`.
- On-chain commits through Tatum gRPC: `publish.ts`, `commit-existing.ts`, `verify.ts`, and `lock.ts` commits each new pick.
- Worker routes under `/recall/*` (status, record, proof, insights, pick, pref, resolve) and a cron sweep that settles open picks every 15 minutes.
- Spending guard on `/recall/pick` commits: daily caps per user (5, or 30 for `RECALL_OWNER_KEYS`) and overall (50), a 0.05 SUI balance floor, and no commit when KV fails. A skipped pick is still saved, with `commitSkipped` saying why.
- Extension 0.10.0: insights on tiles, a Call it sheet with a calibration nudge, a My record tab with on-chain proof, Quiet here per site, and a Link record field in settings. The betting flow is unchanged.
- `soothia_stake`: a parimutuel YES/NO staking pool in SUI, as a new Move package with 27 tests. Published on Sui mainnet as `0xc4cb03db53c14b936ece4ba2234d791ea3067a9d6e472f96b41c4861f0c33259` and smoke-tested with a 0.1 SUI pool.
- `soothia_stake` hardened: the fee and delays are locked per pool, a resolve waits out a delay, and a challenge window lets the admin overturn and refund before anyone can claim. Fees are collected once, by anyone, after the window. Published on Sui mainnet as `0xf9507a1cb35b01c191614a67bf5ca3f22c7c3a7745fdc7ddea67369686a6720f`, replacing the unused first package.
- Staking keys split: the ResolverCap is held by a dedicated `RESOLVER_KEY`, and the AdminCap and both UpgradeCaps are in the operator's Slush wallet. See `docs/staking-trust.md`.
- Staking helpers in `worker/src/stake` (payout and claim-window math, readers, transaction builders) and `keygen`, `publish`, `smoke` and `handover` scripts.
- Staking pool identity (`worker/src/stake/identity.ts`): one pool per question, whichever way round a page lists the match.
- Stakes are remembered on Walrus Memory as a `stake` record, and `/recall/record` shows each staked pick's amount, status and payout.
- Staking routes under `/stake/*`: pool, build, confirm, positions, claim/build and admin/pending. A pool closes at ESPN's kickoff, never the page's, and pool creation is capped at 30 a day and stops when `RESOLVER_KEY` falls below 0.05 SUI.
- Staking sweep in the scheduled handler: resolves finished matches from ESPN, voids matches that are missing or not played a day after kickoff, and collects the fee after the challenge window. Each action is logged for `/stake/admin/pending`.
- `STAKE_PACKAGE`, `STAKE_CONFIG` and `STAKE_RESOLVER_CAP` are set in `wrangler.toml`. `RESOLVER_KEY` is a Worker secret.
- The staking sweep voids a pool whose match ESPN has not marked final 72 hours after kickoff.
- Sui wallet connection in the extension (0.12.0): a page-world bridge finds wallets through the Wallet Standard, with Connect and Disconnect in settings. Every transaction is decoded and checked in the background worker before a wallet can be asked to sign, and only an exact stake or claim is allowed.
- Admin page at `/admin`, served by the Worker and not indexed: connect the AdminCap wallet, see every challenge window with its time left, and overturn. New admin routes `GET /stake/admin/info`, `POST /stake/admin/overturn/build` and `POST /stake/admin/config/build` return unsigned bytes for the AdminCap holder. New real pools are refused while the delays are not the production values.
- Extension 0.13.0 with the staking screens.
- `soothia_pay`: a Move package for premium call payments, splitting each one between the caller and the treasury, with one-time nonces. x402 decision and wire format in `docs/x402.md`.
- Premium calls: `POST /recall/pick` takes `premium: {priceMist}` (0.01 to 0.5 SUI) from a public caller with a Call Score of 550 and 10 settled calls, with the kickoff taken from ESPN. Before kickoff every public surface shows the match, price and proof, and no side, confidence or stake; a locked call doesn't count towards consensus and can't be tailed.
- Follows are stored by wallet address and the handle is looked up when read, so a handle someone else takes doesn't inherit followers. Existing lists move over the first time they are read.
- Extension 0.15.0 with Social. The sweep fills a public user's feed from earlier public calls once, so followers have something to see.
- New lessons: staked vs free calls, bigger vs smaller stakes, how tailing each person went, and going against the people you follow. They follow the same rule as other lessons, and My record orders them after team lessons.
- Social tab in the extension: a feed with Tail, the leaderboard, and search and follow. Tiles say who you follow called the match, and the orb shows a count. The web profile shows followers and following.
- Tailing: `POST /recall/pick` accepts `tailOf`. The call must match the source call, keeps its side unless flipped on purpose, and takes its kickoff from ESPN, so it can be made from the feed. Public profiles show "Tail of @x".
- Feed: a public user's calls and stakes go into `recent:<handle>`. `GET /social/feed` merges the people you follow, and `/recall/insights` now says who you follow called the match and what most of them said.
- Following: `POST /social/follow` and `/social/unfollow`, `GET /social/following` and `GET /social/search`. Follows are memories on Walrus with a KV index, and following doesn't need a public profile.
- Extension 0.14.1 with the reorganised My record.
- Lessons are written only when their meaning changes or a figure moves by 5 points or more, instead of on every small change.
- My record has four sections, Calls, Lessons, Wallet and Me, and remembers the last one. Calls are one tappable row each. Link record is also in Me, and the terms Brier and memory account now live only in expanders.
- My record has an attention strip for stakes ready to claim, calls settling today and new lessons.
- My record has a header: public or private, Call Score, and how many calls were right.
- Extension 0.14.0: a Go public panel on My record, signed with the wallet, and a Leaderboard tab.
- Public web pages on soothia.fun: `/leaderboard` with five boards, a period switch and league and team filters, and `/u/<handle>` with stats, breakdowns and recent calls with proof links.
- Public leaderboards and profile pages' data: a sweep every 15 minutes snapshots each public profile into KV and ranks five boards over a week, a month and all time. New public routes `GET /social/profile/:handle` and `GET /social/leaderboard`, which never read Walrus.
- Call Score and profile stats (`worker/src/social/stats.ts`): only calls proven on Sui before kickoff count, once settled.
- Public profiles: a Sui address can go public under a unique handle, proven by a wallet signature over a one-time message. New routes under `/social/profile/*`, and a `profile` memory on Walrus. One record gets one profile.
- Extension 0.13.2: fixture detection reads a match's status from its own header, so full-time results in a site's scores bar no longer hide an upcoming match.
- Extension 0.13.1: the Back it button uses the primary style in every state, is never disabled without a reason shown directly above it, offers to connect a wallet when none is connected, and lets you try when the balance can't be read.
- A user's first confirmed stake writes a `wallet_link` memory on Walrus, recording which Sui address is theirs.
- My record shows each staked call's amount, side and status, a Claim button when there is something to claim, and a wallet summary (staked, won, lost, profit or loss, ROI, best multiplier) when a wallet is connected.
- Back it sheet (`extension/src/back-sheet.ts`): choose an amount, see the live multiplier, and stake from a Sui wallet on your own side of the call. Every transaction goes through the checker first. New route `GET /stake/balance`.
- Staked calls on tiles: a committed fixture call shows its pool line and a Back it button, refreshed when the card opens, or what you already backed.
- Overturn drill on the admin page: seven steps that rehearse an overturn on mainnet with 0.1 SUI. Drill pools are marked in KV, are never swept, and the drill routes refuse any pool without a marker.
- Called matches: `/recall/insights` returns `called` from the full pick list. Both tiles of a called match show "Your call" with a Proof link instead of Call it.
- Sui-only: removed Solana, Panta, betting, market creation, wallet connection and the markets and share pages. Tag `v0.9-solana-final` marks the last commit with them. `/stats` now reports Total Recall numbers. Extension 0.11.0.
- Calling is now the primary action: Call it leads each tile, betting and market creation become text links, the wallet row shows only for betting, and the first-run copy leads with calling.

## [Unreleased]

### Changed

- Repo tooling: shared ESLint and Prettier configs, EditorConfig, root scripts, GitHub Actions CI. No runtime changes.
- Docs: README rewrite, architecture and security notes, this changelog.

## [0.9.4] - 2026-10-10

Pre-submission polish and security audit.

### Added

- `GET /debug/*` on the proxy requires the `X-Soothia-Admin` header matching the `ADMIN_TOKEN` secret; otherwise 404.
- Per-IP limits (edge cache and memory, no KV) on `/detect`, `/match`, bet-link builds, `/api/tx/send` and `/quote`.
- Relayed transactions must name the Panta program; the proxy is not a general Solana relay.
- Security headers on every site response (CSP, nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy, HSTS).
- Root MIT LICENSE. Security tests for the admin gate, limits, validation, escaping and headers.

### Changed

- Card footer is "settings" with the version; diagnostics sit behind a "Show debug info" toggle, off by default.
- Market image and Panta links on the site are accepted only as https URLs.

### Removed

- Console logging from the welcome page, dead store and catalog exports, two unused packages.

## [0.9.3] - 2026-10-10

### Added

- Event mode: sports fixture pages (LiveScore and similar) become match-winner markets without a model call.
- Fixture claims default to a buying window that closes before kickoff.

## [0.9.2] - 2026-10-10

### Changed

- Soothia serves at soothia.fun (www redirects) and api.soothia.fun; the extension points at the new API. The original workers.dev URLs keep working.
- Hero copy: "Turn any take into a market."
- Stats keep the last good numbers when Panta does not answer.

## [0.9.1] - 2026-10-10

### Changed

- Error guards around every content-script entry point; search and PDF pages are skipped; faster first read with DOM watching for thin pages.
- Ephemeral caches moved from KV to the Cache API and memory. KV keeps only durable records and every write is guarded and budgeted.

## [0.9.0] - 2026-10-10

### Added

- Normalized catalog (`GET /markets`) with paced detail refresh and a cron warm-up.
- Site `/markets` page with Live now, Trading on Panta and Resolved sections, filters and sort.
- P2P matches in the extension show odds on Panta with a Trade on Panta link.
- The CSS orb floats on the landing and share pages.

## [0.8.1] - 2026-10-10

### Changed

- Quote policy: 15 s display cache, in-flight coalescing, 400 ms per-market spacing, backoff retries. Quote lines keep the last good price while retrying.

## [0.8.0] - 2026-10-10

### Added

- Wallet Standard support with a wallet picker in the card, sheets and share page; legacy providers as fallback; last wallet remembered.
- Verified in-app browser deep links for Phantom, Solflare and Backpack; Mobile Wallet Adapter on Android.

## [0.7.2] - 2026-10-10

### Fixed

- Card stars twinkle for real. The share page retries the confirm callback and never reports a bet it could not record.
- Reconcile sweep (cron every 5 minutes) finishes and reports bets whose client never called back.

## [0.7.1] - 2026-10-10

### Added

- Native bet flow on the share page with public quote, send and status routes; one-decimal odds; local closing time.

## [0.7.0] - 2026-10-10

### Added

- Bet links: Solana Actions (Blinks) for betting on a market without the extension, `actions.json`, and a server-rendered `/m/<marketId>` share page with Open Graph tags.
- Share the bet link on X; Copy bet link on success and in My bets.

## [0.6.0] - 2026-10-10

### Added

- Creator earnings row and creator-fee claim in My bets. Public `/stats`. Landing page live stats strip and tilt cards.

## [0.5.3] - 2026-10-10

### Added

- Sound effects synthesized with the Web Audio API in three styles, a welcome page with onboarding music, first-run bubble, mute toggle.

## [0.3.1] - 2026-10-10

### Added

- Primary buys, positions, win claims and the bet sheet. The buy fee is charged on top of the stake; My bets groups by market.
- The v1 design: tokens, fonts, orb states, card, sheets, icons, market images. Landing page with the extension zip.

## [0.2.2] - 2026-10-10

### Changed

- Breaking markets by default with a buying window; Reuters as the authority for non-price crypto claims; a small SOL balance is required before creating.
- Panta's transient build failures are retried like quote failures.

## [0.2.1] - 2026-10-05

### Changed

- Create transactions are capped at 1,150 bytes server-side with an ordered text shrink that always keeps one authoritative source. The signed transaction is verified against the built one before sending.

## [0.2.0] - 2026-10-05

### Added

- Market creation from the page: wallet bridge, on-demand signer, review sheet, quote, build, simulate, send and register routes, category images.

## [0.1.1] - 2026-10-05

### Added

- `/detect` and `/match` on the proxy with a daily cap. Page reader, detection flow, orb states, claim tiles, debug footer, Scan again, and a tested X focal-tweet reader.
- Panta create rules documented and encoded in `pantaRules.ts`.

## [0.1.0] - 2026-10-05

### Added

- MV3 extension skeleton: orb, status card, Phantom detection, proxy health check.
- `soothia-proxy` Worker with health, markets and categories routes. Catalog check script.
