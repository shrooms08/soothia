# Changelog

All notable changes to Soothia. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions are the Chrome extension's manifest version; the Workers deploy continuously alongside it.

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
