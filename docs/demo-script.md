# Soothia demo video: script and shot list

Length: about 2:50. Two Chrome profiles: **Main** (your Slush wallet, @minos) and **Demo** (Phantom, @juju). Every match below is upcoming on ESPN, and none of them has been called by Main yet.

| Use                                        | Match                                      | ESPN page                                            |
| ------------------------------------------ | ------------------------------------------ | ---------------------------------------------------- |
| Shot 2 and 5: Call it, then Back it        | Villarreal at Barcelona, Sun 22 Nov        | https://www.espn.com/soccer/match/_/gameId/401882804 |
| Shot 4: tile before and after              | Manchester United at Liverpool, Sun 22 Nov | https://www.espn.com/soccer/match/_/gameId/401878755 |
| Shot 7: premium call unlocked by hand      | Cagliari at Como, Sat 21 Nov               | https://www.espn.com/soccer/match/_/gameId/401875056 |
| Shot 7: premium call unlocked by the agent | Frosinone at AC Milan, Sun 22 Nov          | https://www.espn.com/soccer/match/_/gameId/401874989 |

## Pre-recording checklist

**A day or an hour before**

1. Deploy is done and both profiles run Soothia 0.16.2 (`chrome://extensions`, press reload on Soothia in each profile).
2. Main's Slush wallet holds at least 0.2 SUI (0.1 to stake, plus gas).
3. Demo's Phantom holds at least 0.1 SUI. It was sent 0.15 SUI on 9 Nov.
4. Wallet actions now work only on soothia.fun and ESPN pages, so do steps 5 and 7 with an ESPN tab open. If "Withdraw all" ever says to reconnect, open Settings on an ESPN tab, press **Disconnect**, then **Connect Sui wallet**.
5. In **Demo**, set up the agent: orb > **My record** > **Wallet** > **Agent** > **Create agent wallet** > enter `0.05` > **Fund from my wallet** > approve in Phantom > tick **Auto-unlock** > set **Daily budget** to `0.05` > **Save settings**.
6. Demo follows @minos (Social > Following shows @minos). Main follows @juju.
7. Do a dry run of shot 7 once on another match if you want to see it work before recording. Each premium unlock costs 0.01 SUI.

**Just before**

1. Close every app except Chrome and QuickTime. Hide the desktop icons (Finder > Settings > General, untick everything under "Show these items on the desktop"). Turn on Do Not Disturb.
2. Set Chrome's zoom to 110% so the orb reads clearly. Use a window about 1440 × 900.
3. In **Main**, open these tabs in order:
   1. The ESPN Villarreal at Barcelona page
   2. The ESPN Manchester United at Liverpool page
   3. The ESPN Cagliari at Como page
   4. The ESPN Frosinone at AC Milan page
   5. https://soothia.fun/leaderboard
   6. https://suivision.xyz/txblock/CRCetxBTXGz9GsMX7toXYW2biYLEwB1BPGsWDXUtWujN (the proof of a real call)
4. In **Demo**, open the ESPN Manchester United at Liverpool page and one blank tab.
5. Put both Chrome windows side by side, or switch with Cmd+` during the cuts.
6. Start the recording: open QuickTime Player > **File** > **New Screen Recording**. In the bar that appears, press **Options**, choose your microphone under **Microphone**, tick **Show Mouse Clicks**, then choose **Record Entire Screen** and press **Record**. Stop with the stop button in the menu bar, then **File** > **Save**.

## Shot list

| #   | Time      | On screen                                                                    | Clicks                                                                                                                                                                           | Voiceover                                                                                                                                                                                                                |
| --- | --------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 0:00–0:10 | A plain ESPN match page, no orb open                                         | None. Scroll slowly.                                                                                                                                                             | "Everybody's called a match. Nobody keeps an honest record of the calls they got wrong. Soothia does."                                                                                                                   |
| 2a  | 0:10–0:22 | Main, Villarreal at Barcelona. The orb glows in the corner.                  | Click the orb. The tile for the match appears. Press **Call it**.                                                                                                                | "On any ESPN match page, the orb finds the match. I press Call it."                                                                                                                                                      |
| 2b  | 0:22–0:35 | The Call it sheet, then "Locked on Sui · remembered on Walrus"               | Choose **YES**, drag the slider to 65%, press **Lock my call**. Hover over **See the proof on Sui**.                                                                             | "Barcelona, 65%. The call is written to Walrus Memory, and its hash is committed on Sui before kickoff. That link is the proof."                                                                                         |
| 3   | 0:35–0:55 | Main, My record tab: the header with Call Score, then Lessons                | Click **My record**. Pause on the header. Click **Lessons**.                                                                                                                     | "This is my record from one Sunday: 15 calls settled, 12 right, Brier 0.19. Soothia wrote lessons from it: first that I was 14 points underconfident, then that my confidence matches my hit rate."                      |
| 4   | 0:55–1:15 | Demo and Main side by side, both on Manchester United at Liverpool, orb open | In Demo, click the orb. In Main, click the orb. Point at Main's tile notes.                                                                                                      | "Same page, two records. With no history, the tile is bare. With mine, Walrus recalls that I've called Liverpool and Manchester United before, and how it went. When my record said I held back, every tile told me so." |
| 5   | 1:15–1:35 | Main, Villarreal at Barcelona, the Back it sheet                             | Go back to tab 1. On the called tile press **Back it**. Leave 0.1 SUI. Point at the multiplier. Press **Back it** and approve in Slush.                                          | "I can back the call with SUI. The pool closes at ESPN's kickoff, and this is what each SUI would pay if I'm right. A six-hour challenge window guards the result."                                                      |
| 6a  | 1:35–1:50 | Demo, Social > Feed                                                          | In Demo, open the orb > **Social**. Point at @minos's Barcelona call. Press **Tail** > **Lock my call**.                                                                         | "Go public and people can follow you. My demo account sees my call in its feed, and tails it in one tap."                                                                                                                |
| 6b  | 1:50–2:00 | Main, tab 5: the leaderboard on soothia.fun                                  | Switch to the leaderboard tab. Click **@minos**.                                                                                                                                 | "Only calls proven on Sui before kickoff count on the public leaderboard."                                                                                                                                               |
| 7a  | 2:00–2:15 | Main, Cagliari at Como, then Demo's feed                                     | In Main: orb > **Call it** > tick **Make it premium** > **0.01** > **Lock my call**. In Demo: **Social** > **Feed** > **Refresh** > **Unlock** > approve in Phantom (sign only). | "A proven caller can sell a call. It stays hidden until kickoff. Unlock is x402: the server asks for 0.01 SUI, the wallet signs, and the Worker settles it on Sui and reveals the call."                                 |
| 7b  | 2:15–2:30 | Main, Frosinone at AC Milan, then Demo's feed                                | In Main: lock a premium call at **0.01**. In Demo: **Refresh** the feed. Point at "Your agent unlocked 1 call." Open **My record** > **Wallet** > **Agent** to show the receipt. | "And an agent wallet can buy calls from people I follow, on its own, inside a daily budget. No popup."                                                                                                                   |
| 8   | 2:30–2:45 | Tab 6: the SuiVision transaction                                             | Switch to the SuiVision tab. Scroll to the event and the timestamp.                                                                                                              | "Every call is on Sui with a timestamp nobody can fake. Every memory is on Walrus. And every Sui call, from commits to x402 payments, goes through Tatum."                                                               |
| 9   | 2:45–2:55 | soothia.fun home page                                                        | Switch to soothia.fun.                                                                                                                                                           | "Soothia. Call any match before kickoff. Proven on Sui, remembered on Walrus. Get better, get followed, get paid."                                                                                                       |

## If something goes wrong while recording

- **"You already called this."** That match is already in Main's record. Use another upcoming match from the list above.
- **The feed doesn't show a new call.** KV can take up to a minute. Wait and press **Refresh**.
- **The agent doesn't unlock.** Check **Auto-unlock** is ticked, the agent has at least 0.02 SUI, and today's spend is under the budget.
- **Phantom says it can't sign without sending.** Stop and tell Claude the exact message.
