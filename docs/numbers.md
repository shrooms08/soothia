# Soothia live numbers

Read at **2026-11-10T07:14:45.511Z** by `worker/scripts/numbers.ts` from Walrus Memory, Sui mainnet through Tatum, and the Worker's KV. Nothing here is estimated. Run `cd worker && npx tsx scripts/numbers.ts` to refresh it.

## @minos's record

|                                                           |                                           |
| --------------------------------------------------------- | ----------------------------------------- |
| Calls                                                     | 17                                        |
| Committed on Sui before kickoff                           | 16                                        |
| Settled                                                   | 15                                        |
| Right                                                     | 12 of 15 (80%)                            |
| Brier score                                               | 0.191 (0 is perfect, 0.25 is a coin flip) |
| Public Call Score                                         | 583                                       |
| Settled and proven before ESPN's kickoff (public profile) | 14                                        |
| Public profile: right / Brier                             | 12 of 14 (86%) / 0.1786                   |
| Current streak                                            | 6                                         |

The public profile counts only calls proven on Sui before ESPN's kickoff, so it can be smaller than the private record.

## Walrus Memory

63 memories in @minos's namespaces. Corrections and updates are new memories, because the store is append-only.

| Kind                             | Memories |
| -------------------------------- | -------- |
| `pick`                           | 31       |
| `outcome`                        | 15       |
| `lesson`                         | 10       |
| `pref`                           | 3        |
| `stake`                          | 1        |
| `profile`                        | 2        |
| `follow`                         | 1        |
| `unlock`                         | 0        |
| `wallet_link` (a kind of `pref`) | 1        |

### Lessons: 10 written, 2 current

Current:

- **calibration** (15 calls): "Your confidence matches your hit rate (72% claimed, 80% landed). Keep calling it like this."
- **favourites** (6 calls): "Your strong calls (60%+) come in 83% of the time, better than you claim. Your conviction is earned."

Every lesson, oldest first:

| Written              | Key         | Lesson                                                                                              |
| -------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| 2026-11-08 16:00 UTC | calibration | You land 83% of calls while claiming 69%: you are 14 points underconfident. Back yourself more.     |
| 2026-11-08 16:00 UTC | favourites  | Your strong calls (60%+) come in 83% of the time, better than you claim. Your conviction is earned. |
| 2026-11-08 16:15 UTC | calibration | Your confidence matches your hit rate (72% claimed, 71% landed). Keep calling it like this.         |
| 2026-11-08 16:30 UTC | calibration | Your confidence matches your hit rate (73% claimed, 75% landed). Keep calling it like this.         |
| 2026-11-08 18:15 UTC | calibration | Your confidence matches your hit rate (73% claimed, 67% landed). Keep calling it like this.         |
| 2026-11-08 18:45 UTC | calibration | Your confidence matches your hit rate (74% claimed, 70% landed). Keep calling it like this.         |
| 2026-11-08 19:00 UTC | calibration | Your confidence matches your hit rate (73% claimed, 73% landed). Keep calling it like this.         |
| 2026-11-08 19:30 UTC | calibration | Your confidence matches your hit rate (71% claimed, 77% landed). Keep calling it like this.         |
| 2026-11-08 21:45 UTC | calibration | Your confidence matches your hit rate (73% claimed, 79% landed). Keep calling it like this.         |
| 2026-11-08 22:00 UTC | calibration | Your confidence matches your hit rate (72% claimed, 80% landed). Keep calling it like this.         |

## Sui commits

| Called               | Question                                                                           | Commit                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 2026-11-08 10:51 UTC | Will Elche beat Real Betis in Spanish LALIGA on Sun 8 Nov?                         | [3YzAdAi3…](https://suivision.xyz/txblock/3YzAdAi3N2ynGsW3KSmghGahfztsq6jd2uLrncxqQvHk) |
| 2026-11-08 10:52 UTC | Will Brighton & Hove Albion beat Brentford in English Premier League on Sun 8 Nov? | [8jFGm9hm…](https://suivision.xyz/txblock/8jFGm9hmre5KwieQzSeYSWVZuTfZAx5GKRUUEbExJ75f) |
| 2026-11-08 10:52 UTC | Will Crystal Palace beat Liverpool in English Premier League on Sun 8 Nov?         | [CQFYy8N8…](https://suivision.xyz/txblock/CQFYy8N8C6JePFZesHkhW3YY8KEpFzew4mX7JXKtnYMa) |
| 2026-11-08 10:52 UTC | Will Ipswich Town beat AFC Bournemouth in English Premier League on Sun 8 Nov?     | [6DBAbnQD…](https://suivision.xyz/txblock/6DBAbnQDqRw32UUzEBzy1TryQnvPEooBkmWz46EZPKcg) |
| 2026-11-08 10:53 UTC | Will Sunderland beat Chelsea in English Premier League on Sun 8 Nov?               | [CEGjaSWQ…](https://suivision.xyz/txblock/CEGjaSWQfnYekkUW1BCPagAeWPG3Zm3yhPhySVBwYKtx) |
| 2026-11-08 10:53 UTC | Will Genoa beat AC Milan in Italian Serie A on Sun 8 Nov?                          | [82ji5X1s…](https://suivision.xyz/txblock/82ji5X1s3RxLH4zksuakuPbUzR9J1osdyneYR7JT6Suj) |
| 2026-11-08 10:53 UTC | Will FC Cologne beat Bayer Leverkusen in German Bundesliga on Sun 8 Nov?           | [EoFZt2XV…](https://suivision.xyz/txblock/EoFZt2XVfqQ5ptnjno7y3oXACVvRfLbLHLToYYUNC7mo) |
| 2026-11-08 10:53 UTC | Will Brest beat Lyon in French Ligue 1 on Sun 8 Nov?                               | [FXBkoYrd…](https://suivision.xyz/txblock/FXBkoYrdhQcDPGvsoojBYaFghDVfS9nzvsiVgGaDmiMm) |
| 2026-11-08 10:54 UTC | Will Manchester United beat Aston Villa in English Premier League on Sun 8 Nov?    | [F1H52JTq…](https://suivision.xyz/txblock/F1H52JTq8T76VmgEUAGdFyQqcMwBZKnpoxaBgkx2WZr9) |
| 2026-11-08 10:54 UTC | Will Internazionale beat Como in Italian Serie A on Sun 8 Nov?                     | [38Jompux…](https://suivision.xyz/txblock/38JompuxNp5ixz3ZFKTjFiuk4b2F3Yotb1aNee9mCd4U) |
| 2026-11-08 10:54 UTC | Will Celta Vigo beat Levante in Spanish LALIGA on Sun 8 Nov?                       | [BuYM79WP…](https://suivision.xyz/txblock/BuYM79WP1uVDjSwXobessBGdLHWMEkuv8drkjiFfpC51) |
| 2026-11-08 10:54 UTC | Will Villarreal beat Getafe in Spanish LALIGA on Sun 8 Nov?                        | [AjwjykBP…](https://suivision.xyz/txblock/AjwjykBPJwihfSVHmu587mwzBdvwWwv6ZJp22pzijBCP) |
| 2026-11-08 10:54 UTC | Will Fiorentina beat Juventus in Italian Serie A on Sun 8 Nov?                     | [4y1BrYsZ…](https://suivision.xyz/txblock/4y1BrYsZ9amVrR3KTRocmCNz2uji5nYK7ZPRGNHzmj5k) |
| 2026-11-08 10:55 UTC | Will Atlético Madrid beat Barcelona in Spanish LALIGA on Sun 8 Nov?                | [CRCetxBT…](https://suivision.xyz/txblock/CRCetxBTXGz9GsMX7toXYW2biYLEwB1BPGsWDXUtWujN) |
| 2026-11-08 19:23 UTC | Will Arsenal beat Newcastle in Premier League on November 21, 2026?                | [BxJ5CTGX…](https://suivision.xyz/txblock/BxJ5CTGXxo1rRhMUmUp4PPhQj45WuvZ4MVYDRHYyEwm1) |
| 2026-11-09 16:11 UTC | Will Man City beat Fulham on November 21, 2026?                                    | [3vfxHZEP…](https://suivision.xyz/txblock/3vfxHZEPSdpP1erH4hnHuaVQjA6voTyUarmzr1BtKdLp) |

## Staking

- Pools created: **3**
- Total staked: **0.3 SUI** across **3** positions

| Pool                                                                                                                   | Status   | YES     | NO    | Stakers | Evidence   |
| ---------------------------------------------------------------------------------------------------------------------- | -------- | ------- | ----- | ------- | ---------- |
| [`0x2792a3e0…b6a5e8`](https://suivision.xyz/object/0x2792a3e0235b800112b08afddf63414233eb1121589795747549f156f1b6a5e8) | open     | 0.1 SUI | 0 SUI | 1       | –          |
| [`0xdcbb7211…6bbd76`](https://suivision.xyz/object/0xdcbb7211028157967a92dbe9b9e4dc14f3b27d66d79ef318d38eed74796bbd76) | resolved | 0.1 SUI | 0 SUI | 1       | smoke test |
| [`0x9182e844…97d19d`](https://suivision.xyz/object/0x9182e8448f00e2bdc55805bc7b2b91fe582fc346ba7e08077e55d7a0d797d19d) | void     | 0.1 SUI | 0 SUI | 1       | drill      |

## Social and premium calls

- Public profiles: **2** (@juju, @minos)
- Premium calls made: **0**
- x402 unlocks: **0** (0 signed in a person's wallet, 0 by an agent wallet)
- Paid for unlocks: **0 SUI**, of which 0 SUI went to the treasury

An unlock counts as a person's when the payer is a public profile's wallet, and as an agent's otherwise.

## Contracts and objects on Sui mainnet

| What                   | Id                                                                                                                      | Kind          |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------- |
| soothia_recall package | [`0xc7bb1087…da84c4`](https://suivision.xyz/package/0xc7bb1087170732a31d392f20974ba5f3dac8c4081b39f7a8677ff7d28ada84c4) | Package       |
| soothia_stake package  | [`0xf9507a1c…a6720f`](https://suivision.xyz/package/0xf9507a1cb35b01c191614a67bf5ca3f22c7c3a7745fdc7ddea67369686a6720f) | Package       |
| soothia_stake Config   | [`0x7ba41f41…d2b3be`](https://suivision.xyz/object/0x7ba41f413b54f1f04b592694ad3304caa87df7cf9f1afda98b42c45362d2b3be)  | Shared        |
| soothia_pay package    | [`0x69093f4b…d52a92`](https://suivision.xyz/package/0x69093f4bd2ec5d00c5780d8fd2e09adde6a4399146fed2bafc94071311d52a92) | Package       |
| soothia_pay PayConfig  | [`0x7b14fd24…807f1e`](https://suivision.xyz/object/0x7b14fd24baed71d4062f88c22d06c61f4785fc040c3e692ae335b1cde7807f1e)  | Shared        |
| Walrus Memory account  | [`0x02dd2445…cb3e14`](https://suivision.xyz/object/0x02dd24458fe1d0ba0906d69f8330cd49f3fdea44e392836b7c49102431cb3e14)  | Walrus Memory |

| Capability                | Id                                                                                                                     | Held by (read from chain) |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| soothia_stake AdminCap    | [`0x6bb33f67…db2cbf`](https://suivision.xyz/object/0x6bb33f67cec908f6d38c53de4b6fe3e047392e08d6e7b2ec670462b22edb2cbf) | operator's Slush wallet   |
| soothia_stake ResolverCap | [`0x8a8bc9de…1bae4e`](https://suivision.xyz/object/0x8a8bc9de0047bd4d99fabb7e5c655c3f1d407c743ad1711f2a638861b81bae4e) | `RESOLVER_KEY` (Worker)   |
| soothia_stake UpgradeCap  | [`0x2fc53d0f…129401`](https://suivision.xyz/object/0x2fc53d0ff346ccfc3a8047ce7ea25b29ab088dca545ba6fab6391a7eeb129401) | operator's Slush wallet   |
| soothia_pay AdminCap      | [`0x40ca62c5…8eb8da`](https://suivision.xyz/object/0x40ca62c5d8a527d33ec668069ab78df4521754b2c440180cb1c23bd9ff8eb8da) | operator's Slush wallet   |
| soothia_pay UpgradeCap    | [`0xec02eceb…887504`](https://suivision.xyz/object/0xec02ecebaf45fa9df9ee9f0ef1d8e11f3e5c64bbdd945d8a4ec00b6704887504) | operator's Slush wallet   |
| soothia_recall UpgradeCap | [`0xb94f49c4…ecae22`](https://suivision.xyz/object/0xb94f49c43e6ec33c1d0ea77dd6b145186d0a2b7cab782b92a7ac558028ecae22) | operator's Slush wallet   |

| Wallet                        | Address                                                                                                                 |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Operator (Slush, treasury)    | [`0x8e0e9fec…9abb6a`](https://suivision.xyz/account/0x8e0e9fecb8141cc2635effcb1a0d25c96331eecae8eb998329c47241259abb6a) |
| Gas wallet (pays for commits) | [`0xfd02abfc…e84b34`](https://suivision.xyz/account/0xfd02abfcead4ef62622041d5cc7b6f065485b74d82fed779028bbff719e84b34) |
| Resolver                      | [`0x42e423cd…dea9a6`](https://suivision.xyz/account/0x42e423cd3b473e6fa45c4dfdb03e257d6d71617799ce7c567243de8e78dea9a6) |
