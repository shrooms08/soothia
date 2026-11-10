# Submission checklist: Total Recall hackathon

Deadline: **10 Nov 2026, 17:00 UTC**. Fill the form from this page. Anything in [brackets] is yours to add.

## Fields

| Field                 | Value                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| Project name          | Soothia                                                                                                 |
| One-line pitch        | Call any match before kickoff. Proven on Sui, remembered on Walrus. Get better, get followed, get paid. |
| Track                 | Markets & Sports Prediction                                                                             |
| Bonus awards targeted | Best Walrus Memory; Best Use of Agent Payments                                                          |
| Repo URL              | https://github.com/shrooms08/soothia                                                                    |
| Release tag           | `v1.0.0-total-recall` (https://github.com/shrooms08/soothia/releases/tag/v1.0.0-total-recall)           |
| Live link             | https://soothia.fun                                                                                     |
| Extension download    | https://soothia.fun/soothia-extension.zip                                                               |
| Leaderboard           | https://soothia.fun/leaderboard                                                                         |
| Example profile       | https://soothia.fun/u/minos                                                                             |
| API                   | https://api.soothia.fun/health                                                                          |
| MEMWAL_AGENT_ID       | `090dc2f6a52b4742b96151c54ae0acc53fa848e3581933201862eaaadad99152`                                      |
| Tatum account ID      | [your Tatum account ID, from the Tatum dashboard]                                                       |
| Demo video URL        | [video URL]                                                                                             |
| Blog post URL         | [blog URL]                                                                                              |
| X post URL            | [X post URL]                                                                                            |
| Builder               | Oghenekparobor                                                                                          |

`MEMWAL_AGENT_ID` is the Ed25519 public key (hex) of the Walrus Memory delegate key in `MEMWAL_KEY`. Its Sui address is `0xfd02abfcead4ef62622041d5cc7b6f065485b74d82fed779028bbff719e84b34`, which is also the gas wallet that pays for commits. Only the public key is here; the private key never leaves `worker/.dev.vars` and the Worker's secrets.

## Short description (for a description field)

Soothia is a Chrome extension for calling football matches before kickoff. Each call is written to Walrus Memory and its hash is committed on Sui mainnet through Tatum's gRPC gateway, so the record is honest: the proof is older than ESPN's kickoff. Results from ESPN score each call, and Walrus Memory turns the record into lessons that change what Soothia shows next: tile notes, slider nudges, ordering and lesson cards. On top of the record: SUI staking in parimutuel pools, public profiles with a Call Score, following and tailing, and premium calls sold over x402 and settled on Sui, which an agent wallet can unlock on its own within a daily budget.

## How it uses Walrus Memory (for a sponsor field)

Nine memory kinds per user (pick, outcome, lesson, pref, wallet_link, stake, profile, follow, unlock), each in its own namespace inside one Soothia memory account. The record is read in full, and searched semantically, before every tile is shown, and it drives tile notes, nudges, ordering, lesson cards and quiet sites. Details: README, "How it uses Walrus Memory", and `docs/total-recall.md`.

## How it uses Tatum (for a sponsor field)

Every Sui read and write goes through Tatum's Sui gRPC gateway, from a Cloudflare Worker, with a custom fetch-only transport: checkpoint anchors, hash commits, proofs, the memory account, staking pools, stakes, claims, x402 settlement and balances. Finding: Tatum's Data API has no Sui support. Details: README, "How it uses Tatum".

## Agent payments (for the bonus)

Premium calls use x402 v2 (`PAYMENT-REQUIRED`, `PAYMENT-SIGNATURE`, `PAYMENT-RESPONSE`), settled in SUI on mainnet by the `soothia_pay` package. The buyer's wallet signs without sending; the Worker checks the exact transaction and broadcasts it. An agent wallet in the extension pays the same way with its own key, within a daily budget and a 0.1 SUI cap per call. Details: `docs/x402.md`.

## Before you press submit

1. [ ] Make at least one real x402 unlock by hand and one by the agent. Shot 7 of `docs/demo-script.md` does both, so recording it (or a dry run of it) is enough. Then ask Claude to refresh `docs/numbers.md`, which reads 0 unlocks today.
2. [ ] Record the video with `docs/demo-script.md` and upload it (YouTube unlisted or Loom). Paste the URL above.
3. [ ] Publish the blog post from `docs/blog-total-recall.md`, adding the screenshots. Paste the URL above.
4. [ ] Post the thread from `docs/x-post.md`. Paste the URL above.
5. [ ] Add your Tatum account ID.
6. [ ] Open the repo URL, the live link and the leaderboard in a private window to check they load.
