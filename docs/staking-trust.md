# Soothia staking: who can do what

Soothia's staking pools run on Sui mainnet in SUI. This page explains who holds which key, what each key can and cannot do, and what protects people who stake.

**This is an unaudited beta.**

Notice for the UI:

> Staking may be restricted where you live. Unaudited beta: stake only what you can lose.

## How a pool works

1. Soothia creates a pool for one question. Each question can only ever have one pool.
2. People stake SUI on YES or NO until the pool closes at kickoff. A person can add to their side but cannot switch sides.
3. After the match, the resolver records the result and a short piece of evidence, such as "Arsenal 2-1 Newcastle (ESPN, full time)".
4. A challenge window starts. Nobody can claim during it.
5. After the window, each winner claims their share of the pot, less the fee. If nobody can win, or the pool is voided, everyone gets their stake back.

## Who holds which key

| Key | Held by | What it is for |
|---|---|---|
| AdminCap | Your Slush wallet | Changes settings for future pools. Overturns a wrong result. |
| Staking UpgradeCap | Your Slush wallet | Can upgrade the staking contract. |
| soothia_recall UpgradeCap | Your Slush wallet | Can upgrade the call-commit contract. |
| ResolverCap | `RESOLVER_KEY` | Creates pools, resolves them, voids open ones. |
| Gas wallet (`MEMWAL_KEY`) | The Worker | Pays for commits of people's calls. Holds no staking power. |

`RESOLVER_KEY` and the gas wallet will both be stored on the Worker. The AdminCap and the UpgradeCaps are not, so a leak of the Worker's keys cannot reach them.

The treasury, which receives the fees, is your Slush wallet.

## What the resolver can and cannot do

The resolver **can**:

- Create a pool.
- Resolve a pool as YES or NO, once it is allowed to.
- Void a pool that is still open, which refunds everyone.

The resolver **cannot**:

- Take anyone's stake. It has no way to withdraw from a pool.
- Change the fee, the limits or the delays.
- Resolve a pool early. It must wait until 2 hours 15 minutes after the pool closes.
- Change a result once it is recorded.

The contract does not check the real result. It trusts the resolver's answer, which is why the challenge window exists. A resolver that was hacked or wrong could record the wrong winner, and only an overturn would stop that.

## The challenge window, and how you overturn

Every resolved pool waits **6 hours** before anyone can claim. During those 6 hours you can overturn the result from Slush. An overturn cancels the result, and everyone gets their full stake back with no fee.

An overturn is all or nothing: it refunds the pool. It cannot change the winner to the other side.

To overturn:

1. Open your Slush wallet, on the account that holds the AdminCap.
2. Go to https://api.soothia.fun/admin, enter the admin token and connect that wallet.
3. Find the pool under Challenge windows and press Overturn.
4. Approve it in Slush. You need a little SUI in that wallet for gas.

Do this before the window ends. After it ends an overturn is refused, and winners can claim.

`GET /stake/admin/pending` on the Worker lists every pool in its window, with the evidence and the time left, but nothing alerts you. If nobody checks during the 6 hours, a wrong result stands.

## The 7-day refund

If a pool is still open 7 days after it closed, because nobody resolved it, **anyone** can void it. Everyone can then take their stake back. This means a lost or broken resolver cannot trap stakes.

The AdminCap can change this waiting period, and the change applies to existing pools too.

Before that, Soothia's own sweep voids a pool if the match is missing or was not played a day after kickoff, or if ESPN has still not marked it final after 72 hours.

## The fee lock

The fee starts at 1%. It is copied into each pool when the pool is created, so changing it later does not affect pools that already exist. The two delays are locked the same way. The fee can never be set above 5%.

The fee stays in the pool during the challenge window. After the window, anyone can send it to the treasury with `collect_fee`, and it can only be collected once. An overturned or voided pool pays no fee.

If you change the treasury address, the fee goes to whichever address is set when it is collected.

## The caps

| Limit | Value |
|---|---|
| Smallest stake | 0.1 SUI |
| Most one person can stake in a pool | 5 SUI |
| Most a pool can hold | 50 SUI |
| Fee | 1% (maximum 5%) |
| Wait before a result can be recorded | 2 hours 15 minutes after close |
| Challenge window | 6 hours |
| Refund if never resolved | 7 days after close |

Whoever holds the AdminCap can change these limits within the maximums above. Pools keep the fee and the two delays they started with, but the stake limits and the refund period always use the current settings.

## What you still have to trust

- **The UpgradeCap can change the contract.** Whoever holds it can publish new code, including code that moves stakes. It is in your Slush wallet, so keep that wallet safe.
- **The result comes from the resolver and from ESPN.** Neither is checked by the contract.
- **Nobody independent has reviewed this code.** The tests pass, but an audit has not happened.
- **Rounding.** Payouts round down, so a tiny amount of dust can stay in a pool forever.
