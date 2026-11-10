# Blog post: Total Recall

## Title options

1. I called 15 matches in a day. Walrus remembered every one, and Sui proved them.
2. Total Recall: an honest record of football calls, proven before kickoff
3. Building a prediction record that learns: Walrus Memory, Tatum and Sui

---

# I called 15 matches in a day. Walrus remembered every one, and Sui proved them.

_By Oghenekparobor, builder of Soothia_

Everybody has a friend who "called it". They knew Arsenal would drop points, they said Barcelona would win away, they always had a feeling. Ask them how many calls they got wrong and the memory goes quiet.

I'm that friend too. Nobody keeps an honest record of their calls. A tweet can be deleted, a screenshot can be made after the match, and even a careful list teaches you nothing. It just sits there.

So for the Total Recall hackathon I built Soothia: a Chrome extension that lets you call any match before kickoff, proves the call on Sui, remembers it on Walrus, and then uses that memory to make you better.

[SCREENSHOT: the Soothia orb glowing on an ESPN match page]

## What it does

Soothia puts a small orb on every web page. On an ESPN match page it reads the match. Press **Call it**, pick a side, and say how sure you are, from 51% to 99%.

When you lock it, three things happen:

1. The call is written to **Walrus Memory** as a plain sentence: _Call: YES at 70% on "Will Man City beat Fulham on November 21, 2026?" (sports). About Man City, Fulham. Read on espn.com._
2. A SHA-256 hash of the call is committed on **Sui mainnet** by a small Move package, `soothia_recall`. The commit's timestamp is set by Sui, so nobody, me included, can backdate it.
3. The tile shows a link to the proof on SuiVision.

After the match, a sweep reads the result from ESPN, scores the call, and writes the outcome back to Walrus.

[SCREENSHOT: the Call it sheet, and the "Locked on Sui · remembered on Walrus" confirmation]

## How Walrus Memory makes it learn

A record that only stores things is a spreadsheet. I wanted one that talks back.

Every call, outcome, lesson, preference, stake, profile, follow and unlock is a memory in my own namespace. Before Soothia shows me a tile, the Worker reads my whole record and runs a semantic search over my past calls for the question on the page. What comes back changes what I see.

Here is my real record. On Sunday 8 November I called 15 matches across the Premier League, LaLiga, Serie A, the Bundesliga and Ligue 1, all before kickoff. Fourteen carry a Sui proof. The first, Napoli v Lazio, was saved to Walrus but never committed, so it doesn't count on my public profile (it was also one of my three wrong calls). By 16:00 UTC six had finished and five were right. Soothia wrote its first lesson:

> "You land 83% of calls while claiming 69%: you are 14 points underconfident. Back yourself more."

And a second one:

> "Your strong calls (60%+) come in 83% of the time, better than you claim. Your conviction is earned."

From that moment, every tile on every match page carried a new line: _"You run 14 points underconfident overall."_ The memory changed the product.

By 22:00 all 15 had settled. I got 12 right, with a Brier score of 0.191 (0 is perfect, 0.25 is a coin flip). The calibration lesson had caught up with me:

> "Your confidence matches your hit rate (72% claimed, 80% landed). Keep calling it like this."

The underconfidence line disappeared from the tiles, and team lines took its place: _"Your record on Chelsea: 0 of 1 right."_ Ten lessons were written over the day. A new lesson is now saved only when its meaning changes or a figure moves by five points, so the record doesn't fill with near-copies.

[SCREENSHOT: the same tile before and after the first lesson]

My public profile today: a Call Score of 583, 14 calls settled and proven before ESPN's kickoff, 12 right, and a current streak of 6. My record holds 63 memories on Walrus.

## Tatum carries every Sui call

Every read and write to Sui goes through Tatum's Sui gRPC gateway: checkpoint anchors on each call, hash commits, proof checks, the memory account panel, staking pools, stakes, claims, balances, and the settlement of premium payments.

Tatum's Sui JSON-RPC URL returned 404, so gRPC was the only path, and the gateway labels its replies `application/grpc`, which the standard gRPC-web transport refuses. My backend is a Cloudflare Worker, so I wrote a small fetch-only transport that runs there. After that, everything followed.

One finding worth sharing: Tatum's Data API has no Sui support yet. Its balance and history endpoints reject `sui` and `sui-mainnet`, so balances also go through gRPC.

## Proof before kickoff

The idea that holds Soothia together is simple: a call only counts if it was on chain before the match started. I take the kickoff time from ESPN, never from the page, because a page can be wrong or edited. If the Sui commit is older than ESPN's kickoff, the call is proven. The public leaderboard counts only proven calls.

[SCREENSHOT: a commit on SuiVision next to the match's kickoff time]

## Staking, social and premium calls

Once calls were proven, three things became possible.

**Back it.** Stake SUI on your call in a parimutuel pool, a second Move package called `soothia_stake`. It closes at ESPN's kickoff, and a six-hour challenge window after the result lets me refund a pool if the result is wrong.

**Social.** Go public with a Sui wallet to get a profile, a Call Score and a place on the [leaderboard](https://soothia.fun/leaderboard). Follow people, see their calls in a feed, and tail one in a tap.

**Premium calls over x402.** A caller with a Call Score of 550 and 10 settled calls can make a call premium, priced from 0.01 to 0.5 SUI. It stays hidden until kickoff. A buyer unlocks it with the x402 protocol: the server answers 402 with the price, the wallet signs a Sui payment without sending it, and the Worker checks the exact bytes, broadcasts them and reveals the call. A third package, `soothia_pay`, sends 90% to the caller and 10% to the treasury. An optional agent wallet unlocks calls from people you follow by itself, within a daily budget.

[SCREENSHOT: a locked premium call in the feed, and the receipt after Unlock]

## What went wrong

**The pivot.** The first version of Soothia ran on Solana and linked bets to prediction markets. Total Recall needed Walrus Memory, which lives on Sui, so I moved the whole product to Sui and rebuilt the backend around it.

**The ESPN scores bar.** ESPN match pages carry a strip of other matches at the top. My reader sometimes took a score from that strip, so an upcoming match looked started and the orb said there was nothing to call. The fix: read only the page's own match header, climbing up from the home team's name. Real saved ESPN pages are now test fixtures.

**The key split.** At first one key did everything: it paid for commits and would have controlled the staking pools. That's fine on a test network and bad on mainnet. I split it in three: a gas wallet that only pays for commits, a resolver key that can create and resolve pools but can't move anyone's stake, and an admin key in my own wallet, away from the server, that can overturn a wrong result. Then I ran a full overturn drill on mainnet to prove it worked.

## What I learned

Memory is only useful when it changes behaviour. The best moment of the day wasn't a right call. It was a tile telling me I was underconfident, from my own record.

And proofs only matter if the clock is honest. Taking kickoff from ESPN, and timestamps from Sui, is what makes the record worth following.

## What's next

- Stakes on any event, not just football, settled by an on-chain oracle instead of a resolver key.
- A Walrus Memory account per user, so each person owns their record outright.
- A mobile app.

## Links

- Code: https://github.com/shrooms08/soothia
- Leaderboard: https://soothia.fun/leaderboard
- My profile: https://soothia.fun/u/minos
- A proof on SuiVision (Atlético Madrid v Barcelona, called before kickoff): https://suivision.xyz/txblock/CRCetxBTXGz9GsMX7toXYW2biYLEwB1BPGsWDXUtWujN
- The staking package: https://suivision.xyz/package/0xf9507a1cb35b01c191614a67bf5ca3f22c7c3a7745fdc7ddea67369686a6720f
- Live numbers: https://github.com/shrooms08/soothia/blob/main/docs/numbers.md
