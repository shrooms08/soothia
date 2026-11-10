# Soothia security audit

**Date:** 10 Nov 2026. **Commit audited:** `main` at `1f76663` (extension 0.16.1). **Time box:** 90 minutes.
**Method:** code review of the three Move packages, the Worker, the extension, the site and the admin page, with tests written to prove each finding. No mainnet transaction was sent, no contract was changed, no key was rotated and nothing was deployed during the audit.

## Executive summary

No finding lets an outsider take staked SUI, claim twice, or sign as Soothia. The Move packages hold up: caps are enforced, the claim, refund, overturn and fee state machine has no double spend, and payouts never exceed the pot.

The serious problems were around the edges:

- **A hostile website could fake the wallet's answers** (X-1). The extension and the page's wallet talk through the page's own window, so any site could read the session nonce and reply first. It could then save its own address as "your wallet", so "Withdraw all" from the agent wallet, or a premium caller's earnings, would go to the attacker.
- **The agent wallet's daily budget did not hold against a lying Worker** (X-2). After signing a payment, it gave the budget back on any error answer.
- **Premium calls were not secret** (W-1). Every field in a call's hash was public or guessable, so anyone could read a hidden call's side for free by searching about 200 guesses against its Sui commit.
- **Anonymous callers could exhaust shared quotas** (W-2, W-3): KV's 1,000 writes a day, which would stop commits and sweeps, and Claude spend through `/detect`.

All Critical-free. The High findings are fixed or mitigated in this release (extension 0.16.2 and the Worker), with regression tests. What remains needs a decision, mainly about paying for Cloudflare's paid plan, a dedicated wallet page on soothia.fun, and the Move upgrade policy.

| Severity | Found | Fixed or mitigated now   | Open                        |
| -------- | ----- | ------------------------ | --------------------------- |
| Critical | 0     | 0                        | 0                           |
| High     | 5     | 5 (2 fully, 3 mitigated) | 3 need a decision to finish |
| Medium   | 11    | 7                        | 4                           |
| Low      | 9     | 2                        | 7                           |
| Info     | 14    | 2                        | 12                          |

## Threat model

1. **Any internet user** calling `api.soothia.fun` directly, with forged headers. Install and recall ids are self-declared UUIDs.
2. **A hostile website** the extension runs on: page scripts, crafted DOM text, `postMessage` spoofing, fake Wallet Standard wallets.
3. **A malicious Soothia user:** fake installs, sybil profiles, spam, gaming the Call Score, front-running premium calls, double claims.
4. **A stolen Worker secret:** `RESOLVER_KEY`, `MEMWAL_KEY` (also the gas wallet), `ADMIN_TOKEN`, `TATUM_API_KEY`.
5. **A malicious wallet or RPC response**, including a compromised Worker answering the extension.
6. **The supply chain.**

## Findings

Status: **Fixed** (fixed and tested in this release), **Mitigated** (the main risk is cut, a decision finishes it), **Open**, **Accepted**.

| ID   | Severity | Component       | Title                                                                         | Status    |
| ---- | -------- | --------------- | ----------------------------------------------------------------------------- | --------- |
| X-1  | High     | Extension       | A hostile page can forge every wallet-bridge answer                           | Mitigated |
| X-2  | High     | Extension       | The agent refunds its budget after it has already signed                      | Fixed     |
| W-1  | High     | Worker          | A premium call's side can be recovered from its unsalted hash                 | Fixed     |
| W-2  | High     | Worker          | Anonymous callers can exhaust KV's daily write and list quotas                | Mitigated |
| W-3  | High     | Worker          | No overall cap on Claude spend through `/detect`                              | Mitigated |
| X-3  | Medium   | Extension       | No gas cap on stake and claim transactions                                    | Fixed     |
| X-4  | Medium   | Extension       | The Recall ID is typed into the card on whatever page is open                 | Open      |
| W-1b | Medium   | Worker          | Ordinary private calls can be searched for at GPU scale                       | Open      |
| W-4  | Medium   | Worker          | Staking a premium call shows its side                                         | Fixed     |
| W-5  | Medium   | Worker          | Several calls per match get past the duplicate check                          | Fixed     |
| W-6  | Medium   | Worker          | `/detect` cache poisoning                                                     | Fixed     |
| W-7  | Medium   | Worker          | Shared commit and pool caps can be used up by fake installs                   | Open      |
| W-8  | Medium   | Worker          | The resolver lock is not a real mutex (unverified)                            | Open      |
| W-9  | Medium   | Worker          | Unauthenticated routes can use up Tatum's 3 requests a second                 | Mitigated |
| W-10 | Medium   | Worker          | Sweep entries for calls that can't settle are never removed                   | Mitigated |
| M-1  | Medium   | soothia_stake   | Winners pay the fee when nobody lost, or when the fee exceeds the losing side | Mitigated |
| X-5  | Low      | Extension       | Content scripts can read the agent key; the `sender.id` checks gate nothing   | Open      |
| X-6  | Low      | Extension       | The page can hide the card and steer clicks onto one-click actions            | Open      |
| X-7  | Low      | Extension, site | Links whose URL comes from the API get no scheme or host check                | Fixed     |
| S-1  | Low      | Admin page, API | The admin page signs Worker-built transactions unchecked; no `nosniff`        | Mitigated |
| W-11 | Low      | Worker          | Anyone can overwrite a profile's challenge                                    | Open      |
| W-12 | Low      | Worker          | Premium settlement edge cases (expired quote, postponement, earnings)         | Open      |
| W-13 | Low      | Worker          | Calls after kickoff count as "proven" on `/stats`                             | Open      |
| M-2  | Low      | soothia_stake   | `refund_after_ms` has no bounds and changes open pools                        | Open      |
| M-3  | Low      | All packages    | Old package versions stay callable; the UpgradeCap has full control           | Open      |
| X-8  | Info     | Extension       | Any site can detect that Soothia is installed                                 | Open      |
| X-9  | Info     | Extension       | The agent trusted malformed feed items                                        | Fixed     |
| S-2  | Info     | Site            | `.DS_Store` may be served                                                     | Fixed     |
| S-3  | Info     | Site            | Profile page rewrite: sound                                                   | Accepted  |
| W-14 | Info     | Worker          | CORS, `/debug`, Tatum trust, key blast radius                                 | Accepted  |
| M-4  | Info     | soothia_stake   | No upper bound on `close_ms`                                                  | Open      |
| M-5  | Info     | soothia_stake   | The per-user cap is per address                                               | Accepted  |
| M-6  | Info     | soothia_stake   | Unclaimed stakes and dust stay in the pool forever                            | Accepted  |
| M-7  | Info     | soothia_stake   | A stolen resolver key can take a losing side unless overturned in 6 hours     | Accepted  |
| P-1  | Info     | soothia_pay     | Anyone who learns a nonce can burn it first                                   | Open      |
| P-2  | Info     | soothia_pay     | The contract doesn't enforce price or fee                                     | Accepted  |
| P-3  | Info     | soothia_pay     | Pay settings change take effect at once                                       | Accepted  |
| R-1  | Info     | soothia_recall  | Anyone can emit `PickCommitted` for any pick id                               | Accepted  |
| O-1  | Info     | Worker          | One package id can't serve both calls and type checks after an upgrade        | Open      |

---

### X-1 (High, Mitigated): a hostile page can forge every wallet-bridge answer

**Location:** `extension/src/wallet-client.ts:38,70,96`, `extension/src/wallet-protocol.ts:66-76`, `extension/src/wallet-access.ts:36-42`, `extension/src/wallet-settings.ts:83-88`, used by `agent.ts` (withdraw recipient) and `go-public.ts`.

**Impact:** the content script and the page share one `window`. Every request the content script posts, nonce included, reaches the page's own `message` listeners. A page can read the nonce, answer before the real bridge, register a fake "Slush" wallet, or hook the primitives the bridge uses. Nothing returned from the page world can be trusted.

**Exploit:** on a sports site with a compromised ad script, the user presses Connect. The script answers `connect` with its own address. Later, on any site, "Withdraw all" sends the agent wallet's balance there without a popup. The same trick on Go public signs Soothia's challenge with the attacker's key, so the victim's premium earnings go to the attacker.

**Fix now (0.16.2):**

- The wallet bridge exists only on `https://` pages of soothia.fun and espn.com (`extension/src/wallet-site.ts`). Elsewhere every wallet action stops with "Wallets connect only on soothia.fun and ESPN pages…".
- A saved wallet records the site it was connected on, and "Withdraw all" refuses a wallet that wasn't connected on one of those sites.

**Residual risk, and the decision:** scripts on espn.com or soothia.fun could still do this. The full fix is to do every wallet action on one page Soothia controls, `https://soothia.fun/wallet`, with a strict CSP and no third-party scripts, and to open it from the extension.

**Tests:** `extension/test/security.test.ts`: "wallets work only on soothia.fun and ESPN…", "on other sites the bridge never runs…", "a connected wallet remembers the site…", "Withdraw all refuses a wallet that wasn't connected on a trusted site".

### X-2 (High, Fixed): the agent refunds its budget after it has already signed

**Location:** `extension/src/premium-logic.ts` (`runUnlock`), `extension/src/agent.ts:132-141`.

**Impact:** once the agent hands a signed payment to the Worker, the Worker can broadcast it whatever it answers. The agent gave the price back to the day's budget on most error answers, and on a 200 with no receipt. A compromised Worker could empty the agent wallet, up to 0.3 SUI per Social open.

**Fix:** after signing, every outcome counts as spent (`maybePaid: true`, `signed: true`). Only failures before signing are refunded.

**Test:** `extension/test/security.test.ts`, "a Worker that keeps signed payments and answers with errors can't get past the daily budget". It runs the agent three times against a hostile Worker for each of a 500, `nonce_used` and a receipt-less 200, and checks that it signs exactly budget ÷ price times.

### W-1 (High, Fixed): a premium call's side can be recovered from its unsalted hash

**Location:** `worker/src/recall/records.ts:278-300` (`canonicalPick`), `worker/src/social/feed.ts` (`lockItem` shows `pickId`, `at` and the proof digest), `worker/src/recall/sui.ts:64-85` (hash and pick id on chain).

**Impact:** every input to the hash is public (id, time, teams, kickoff, the anchor checkpoint near the commit) or one of a few values (subject: 2, confidence: 99, date label: 3). The auditor's offline script recovered side and confidence in 8,779 tries, 0.5 s on one CPU. Anyone could read every premium call for free and tail or front-run it.

**Fix:** premium calls hash `canonicalPickV2`, the v1 fields plus a 32-byte random salt, stored only in the caller's own record (`salt` on the pick). `canonicalPick` is unchanged, so every existing proof still verifies. `scripts/recall/verify.ts` uses `pickHashInput`, which picks the version.

**Tests:** `worker/test/security-audit.test.ts`: the hash matches `canonicalPickV2`, a full search over both subjects and 99 confidences finds nothing, ordinary calls keep v1, and the salt never appears in a feed item or locked view.

### W-2 (High, Mitigated): anonymous callers can exhaust KV's quotas

**Location:** `worker/src/social/follow.ts` (a GET wrote KV per new install), `worker/src/social/identity.ts:36-57`, `worker/src/recall/routes.ts:341-347`, `worker/src/stats.ts:55-66`, `worker/src/recall/commitGuard.ts`, and the `kv.list` calls in `/social/search`, `/stake/positions` and the sweeps.

**Impact:** the free tier allows 1,000 KV writes and 1,000 lists a day, and install ids are free UUIDs. A loop of fresh installs can use them up in minutes. Commits then fail closed (`kv_unavailable`), sweeps stop settling and resolving, and a buyer who just paid for a premium call could be asked to pay again because the unlock wasn't stored.

**Fix now:**

- `/social/following` no longer writes KV for an empty list.
- Calls that can't settle (no match) no longer get a sweep entry.
- A paid unlock now also opens from the buyer's Walrus `unlock` memory if KV lost it.

**Decision:** move to Cloudflare's Workers Paid plan ($5 a month raises KV to 1,000,000 writes a day), or move counters and short-lived state into a Durable Object.

**Tests:** `worker/test/security-audit.test.ts`, "reading an empty following list writes nothing to KV"; `worker/test/premium-x402.test.ts`, "a paid unlock still opens when KV lost it…".

### W-3 (High, Mitigated): no overall cap on Claude spend through `/detect`

**Location:** `worker/src/detect.ts:255-264` (daily cap keyed on the caller's chosen install id), `:289-292`, `worker/src/ratelimit.ts`.

**Impact:** at 60 requests a minute per IP, with fresh install ids and `X-Soothia-Refresh`, one IP could cause about 86,000 model calls a day, roughly $250 to $850.

**Fix now:** at most 300 model calls per IP per day (counted per Cloudflare location, so this is a brake, not a bill limit).

**Decision:** set a monthly spend limit in the Anthropic console, which is the only hard ceiling. A global counter needs a Durable Object.

**Test:** the cap uses the existing per-IP limiter, which is covered in `worker/test/security.test.ts`.

### X-3 (Medium, Fixed): no gas cap on stake and claim

**Location:** `extension/src/tx-check.ts` (`checkStake`, `checkClaim`). The checker accepted a stake with a 50 SUI gas budget. Fix: the same 0.02 SUI cap as payments. Not done: a gas price cap, because the budget cap already bounds the loss. **Test:** "stakes and claims with a huge gas budget are refused".

### X-4 (Medium, Open): the Recall ID is typed on the open page

**Location:** `extension/src/content.ts:359-397`. Key and paste events cross a closed shadow root, so a page listening on `window` in the capture phase can read a pasted Recall ID, which works as the record's password. **Recommendation:** move "Link record" to an extension page such as `welcome.html`.

### W-1b (Medium, Open): ordinary private calls can be searched at GPU scale

The v1 hash of a private call can also be recovered by widening the W-1 search to ESPN's fixtures and a few seconds of `at` (about 10¹⁰ hashes). **Recommendation:** use `canonicalPickV2` for every new call, and reveal the salt in the proof after kickoff. Existing commits stay v1.

### W-4 (Medium, Fixed): staking a premium call shows its side

`/stake/build` and `/stake/positions` would show a premium call's side, and so would the `Staked` event on chain. Fix: `/stake/build` refuses a hidden premium call with `premium_stake_locked` (`worker/src/stake/routes.ts`). **Test:** "a premium call can't be staked before kickoff…" in `worker/test/stake-routes.test.ts`.

### W-5 (Medium, Fixed): several calls per match

`isDuplicatePick` compared raw `home|away|startISO` strings, so `…15:00:00Z`, `+00:00`, "Chelsea FC" or a different question all counted as new calls. Five calls on one favourite meant five settled calls and a streak of five, which made premium eligibility cheap. Fix: kickoff times are normalised in `validatePickBody`, and duplicates use `sameMatch` (team aliases, either order, UTC day). **Test:** "the same match spelled differently is a duplicate".

### W-6 (Medium, Fixed): `/detect` cache poisoning

The cache key was the URL alone, so a caller with `X-Soothia-Refresh` could choose the claims, and about 100 characters of question text, that everyone on that URL got for 30 minutes. Fix: the key covers the page text and every fixture field (`detectKeys`). Claim ids stay tied to the URL. **Test:** "the detect cache key covers the page text and every fixture field".

### W-7 (Medium, Open): shared caps can be used up by fake installs

`worker/src/recall/commitGuard.ts:61-99`, `worker/src/stake/context.ts:52-72`, `worker/src/stake/routes.ts:248-270`. About ten fake installs use the whole day's 50 commits. `/stake/build` with any well-funded `sender` makes the resolver pay to create a pool, up to 30 a day. **Recommendation:** atomic counters in a Durable Object, proof of control of `sender` before creating a pool, a per-IP pool cap, and part of the commit budget kept back for public profiles.

### W-8 (Medium, Open, unverified): the resolver lock is not a real mutex

`worker/src/stake/sweep.ts:62-69` checks KV and then writes it. Two resolver transactions at once could conflict over the ResolverCap. If Sui then locks the object until the epoch ends, pool work stops for up to a day. **Recommendation:** send every resolver transaction through one Durable Object.

### W-9 (Medium, Mitigated): Tatum's rate limit can be used up

`/recall/status` needed no install and called Tatum every time, and it echoed upstream error text. Fix: cached for 30 seconds, with a short error code only. Still open: `/recall/record`'s memory account panel, `/stake/positions` (up to 40 calls) and a token bucket in the transport that keeps room for commits and sweeps.

### W-10 (Medium, Mitigated): sweep entries that never settle

Every call got an `rp:` sweep entry, including ones with no match, which can never settle and so slow the sweep down over time. Fix: only calls on a match get one. Still open: a call whose page lists the teams the other way round from ESPN isn't matched by `resolveFixture` (pools handle this already). Old entries should also be cleaned up after their end time.

### M-1 (Medium, Mitigated): winners pay the fee when nobody lost

**Location:** `move/soothia_stake/sources/pool.move:300-306`. The fee is taken from the whole pot, and only an empty winning side voids.

**Impact:**

- If everyone backed the winning side, the pool resolves and each winner gets back 1% less than they staked.
- If the losing side is smaller than the fee, the winning side as a whole loses money by winning.

**Fix now:** the Worker's sweep voids, and so refunds, a pool whose losing side is empty instead of resolving it (`worker/src/stake/sweep.ts`). The lopsided case remains.

**Contract fix (an upgrade is enough, since `resolve` needs the ResolverCap):** void when either side is 0, and cap the fee at the losing side: `let fee = min(fee_on(total, fee_bps), losing_total)`. Then point the Worker's calls at the new package id (see O-1).

**Tests:**

- `move/soothia_stake/tests/security_tests.move`: `finding_one_sided_pool_charges_winners_a_fee` and `finding_fee_can_exceed_the_losing_side_so_winners_lose`, both proving the bug.
- `worker/test/stake-sweep.test.ts`: "a pool where nobody backed the losing side is voided…".

### Lower findings, briefly

- **X-5 (Low, Open):** the agent key sits in `chrome.storage.local`, which content scripts can read. The `sender.id` checks in `background.ts` let every content script through. Only a compromised renderer could use this. Move the key to the service worker's IndexedDB as a non-extractable key, and allow withdraw, settings and create only from an extension page.
- **X-6 (Low, Open):** the page can set the host element's opacity and steer clicks onto "Save settings" or "Withdraw all". Moving the agent controls to an extension page fixes this together with X-4 and X-5.
- **X-7 (Low, Fixed):** links whose URL comes from the API (proofs, receipts, explorer links) now open only `https://` on suivision.xyz, soothia.fun or github.com, in the extension (`dom.ts`) and on the site (`social.js`). Test: "links open only https pages on known hosts".
- **S-1 (Low, Mitigated):** every API answer now sends `X-Content-Type-Options: nosniff` (test: "every JSON answer says nosniff"). Still open: the admin page is served by the same Worker that builds the transactions it signs. Serve it from a separate static origin, and check the overturn transaction's shape before signing.
- **W-11 (Low, Open):** anyone can replace a profile's challenge and block publish or unpublish. Use stateless HMAC challenges.
- **W-12 (Low, Open):**
  - A payment that executed after its quote expired can't be recovered.
  - Reveal uses the kickoff stored at lock time, even if the match is postponed.
  - Earnings aren't deduped by digest.
  - A seller's second install can buy their own call.
- **W-13 (Low, Open):** a call sent after the final whistle with a late `startISO` counts on `/stats` and in the private record. Public boards check ESPN. Run `checkUpcomingFixture` for every match call.
- **M-2 (Low, Open):** `set_limits` accepts any `refund_after_ms`, and `void_expired` reads the live Config. A value of 0 would let anyone void open pools before the resolver can resolve them. Bound it to 3 to 30 days. That is an upgrade, since `set_limits` needs the AdminCap. Copying the value into each pool needs a fresh publish. Tests prove both extremes.
- **M-3 (Low, Open):** old package versions stay callable, so an upgrade can't fix a public function. The default upgrade policy also lets the UpgradeCap holder add code that moves pool funds. Decision: add version checks on the next fresh publish, and consider `only_additive_upgrades` or `make_immutable` on the current caps (irreversible).
- **Info:**
  - X-8: `use_dynamic_url` would stop a site detecting Soothia.
  - X-9 (fixed): the agent now skips a feed item with a bad kickoff or price instead of failing the run.
  - S-2 (fixed): `.DS_Store` added to `site/.assetsignore`.
  - M-4: cap `close_ms` at about 60 days ahead, or `resolve` can overflow.
  - M-5: the 5 SUI cap is per address; the docs should say so.
  - M-6: unclaimed stakes and dust stay in a pool forever.
  - M-7: alert on every `Resolved` event, so a stolen resolver key is caught inside the 6-hour window.
  - P-1: key `pay`'s used-nonce table by sender plus nonce.
  - P-2: the contract doesn't enforce the price or fee; the Worker does, by requiring the exact `Paid` event.
  - P-3: `set_treasury` accepts `@0x0`.
  - R-1: anyone can emit `PickCommitted`; the Worker filters by `SOOTHIA_RECALL_PACKAGE`, which production sets, and checks only digests from its own records.
  - O-1: keep separate "original" (types) and "latest" (calls) package ids before any upgrade.
  - W-14: blast radius, below.

## Blast radius of a stolen secret

| Secret                                        | What an attacker could do                                                                               | What limits it                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `RESOLVER_KEY`                                | Mis-resolve open pools after close plus the resolve delay; void pools; create up to 30 junk pools a day | The 6-hour challenge window and the AdminCap overturn (M-7). It can't touch the AdminCap, the caps or anyone's stake directly. |
| `MEMWAL_KEY` (Walrus delegate and gas wallet) | Read and forge every user's memories, because one account holds them all; spend the commit wallet's SUI | Forged picks fail `verifyCommit`. Set a separate `SUI_COMMIT_KEY` so the two roles split.                                      |
| `ADMIN_TOKEN`                                 | `/recall/resolve`, drill create and stake (0.1 SUI each, refundable), pending lists                     | Drills can't act on real pools. No fund theft.                                                                                 |
| `TATUM_API_KEY`                               | Use up Tatum credits and the rate limit                                                                 | No signing power.                                                                                                              |

## Secrets and operations

- **Git history and tracked files:** scanned every commit on every branch. None of the real values in `worker/.dev.vars` or `.env` appears. No private keys, API keys or tokens match common patterns.
- **Ignored files:** `.dev.vars`, `.env`, `.wrangler`, `dist`, `.recall-local` and the Move `build` folders are all gitignored. `worker/.dev.vars.example` has names only.
- **`wrangler.toml` `[vars]`** holds only object ids and `RECALL_OWNER_KEYS`, a user key. A user key is not a credential, because every route derives it from a UUID the caller must send.
- **Key separation:** each key can do only its own job (see the blast radius table). The AdminCap and all UpgradeCaps are in the operator's Slush wallet, never on the Worker.

## Dependencies

| Package   | Advisories                                    | Reachable at runtime?                                          |
| --------- | --------------------------------------------- | -------------------------------------------------------------- |
| root      | 7 moderate (typescript-eslint, minimatch)     | No: lint only                                                  |
| extension | 2 high (vite 7.0–7.3.6, undici through jsdom) | No: build and test only; the shipped bundle contains neither   |
| worker    | 4 high (wrangler, miniflare, sharp, undici)   | No: local dev and deploy tooling; none is in the Worker bundle |
| scripts   | none                                          |                                                                |

**Runtime dependencies:**

- Extension: `@mysten/sui` 2.39.1 and `@mysten/wallet-standard` 0.21.38, both pinned exactly.
- Worker: `@mysten/sui`, `@mysten-incubation/memwal`, `@mysten/seal` (a peer dependency of memwal) and `@protobuf-ts/runtime-rpc`. All are used, all have no advisories, all are locked by `package-lock.json` but declared with `^` ranges.

**Recommendation:** update vite and wrangler, and pin the Worker's runtime packages exactly. Packages read during the x402 research (`@t2000/x402`, `@suimpp/mpp`) were never installed.

## Known accepted risks

- **Unaudited beta.** This is an internal review, not an independent audit. Stake only what you can lose.
- **ESPN and the resolver are trusted.** The contract doesn't check results, and the 6-hour challenge window is the safeguard.
- **KV caps aren't atomic.** Commit, pool and rate caps can be overshot across Cloudflare locations; the SUI balance floors bound the cost.
- **The agent wallet's key lives in the browser,** in the extension's storage, at the operator's request. Keep small amounts there.
- **Pool totals can hint at a premium call's side** when other people stake on the same match.
- **Tatum is trusted** for chain answers. A compromised gateway could fake events.

## Out of scope

- Behaviour in a real Chrome. X-4's paste capture and X-7's `javascript:` links were reasoned from DOM rules, not run in a real browser.
- The wallets themselves (Slush, Phantom).
- Cloudflare, Tatum and the Walrus Memory relayer.
- The Move bytecode on chain. The local sources compile to the same bytecode as the local `publish.json` records, but this wasn't compared against the chain.
- Load testing and the real per-location behaviour of the rate limits.

## Tests added

| File                                                                              | Tests                                                                         |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `move/soothia_recall/tests/security_tests.move`                                   | 1 (`finding_anyone_can_commit_any_hash_under_any_pick_id`)                    |
| `move/soothia_stake/tests/security_tests.move`                                    | 13 (5 `finding_*` proving M-1, M-2 and M-4; 8 `sound_*` at exact time limits) |
| `move/soothia_pay/tests/security_tests.move`                                      | 2 (P-1, P-2)                                                                  |
| `worker/test/security-audit.test.ts`                                              | 7                                                                             |
| `worker/test/stake-routes.test.ts`, `stake-sweep.test.ts`, `premium-x402.test.ts` | 4 added                                                                       |
| `extension/test/security.test.ts`                                                 | 8                                                                             |
| `extension/test/premium.test.ts`                                                  | the post-signing rules                                                        |

Tests named `finding_*` pass while the bug exists, so they document it until the contract changes.
