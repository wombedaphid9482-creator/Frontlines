# Frontlines War Room and Advanced Balance Lab

The **v0.6.0 War Room** keeps deck testing inside Frontlines. Its central landing offers **Quick Matchup**, **Tournament**, **Faction Overview** and **Advanced Lab**. Player results use clear cards and bounded tabs; the full Balance Lab remains accessible through Advanced. The simulation runs the shared authoritative engine without artwork, animation, sound or turn delays. Territory capture, Breakthrough, Presence commitment, responses and victory use the same rules as the live game.

Five original starter lists, ten archetype presets and saved legal custom decks are available. Open Arsenal to construct or import a list, then refresh saved decks in the Lab. Choose a duel or a selected-pool round robin, including same-faction variants. The exact total is distributed across paired opening seats; partial cycles can have unequal matchup exposures. See [deckbuilding guide](DECKBUILDING.md) for construction rules and CLI deck imports.

Reports preserve exact lists, profiles, versions and seeds. **Decks** adds a deck matrix, archetype rates, curves and played-pair correlations. **Advanced → Compare** supports earlier reports and named variants; AI/rule/deck-list differences remain explicit. HTML, JSON and CSV exports accompany rich replay, card outliers, economy, territory/comeback and match-length percentiles. Current validation status is in [Sprint 5](SPRINT-005.md); [Sprint 4](SPRINT-004.md) and the older benchmark sections remain historical context.

Normal entry uses the current game balance profile and deck-aware AI. **Advanced view** exposes balance profiles, both AI policies, reproducible seeds, rule overrides, safeguards, diagnostic thresholds, confidence intervals, match records and comparison. The dashboard labels advanced experiment settings when those results are viewed in player mode. Experiments never change live game rules or saved decks.

The [saved 1,000-match baseline](simulator-baseline-1000.json) and [verification report](SIMULATOR-VERIFICATION.md) preserve the initial benchmark and launch checks. The older [Sprint 2 balance checkpoint](BALANCE.md) remains a separate historical sample.

## Launch and run

Choose **War Room** in the game's command menu, **Test in War Room** in Arsenal, or the native **Frontlines → War Room / Balance Lab** menu. Dedicated `Launch Simulator.cmd` and direct `simulator.html` browser launch remain supported. This offline path needs no installation or internet connection and uses a cooperative runner that yields between simulation slices. Native menu commands navigate in the same window.

For the local HTTP Worker path, use Node 18 or newer:

```text
npm start
```

Open `http://127.0.0.1:4173/simulator.html`. The HTTP route uses a background Worker where available; file launch remains a supported fallback. **Advanced view** identifies the active runner. Native fullscreen works through Settings, F11 or Alt + Enter; browser launch uses browser fullscreen.

1. Choose **Quick Matchup**, pick both factions and actual starter/preset/saved decks. Or choose **Tournament** and check at least two decks; **Faction Overview** starts with the five original starter decks.
2. Enter 1–100,000 total simulations, or use the 1,000/10,000/50,000 presets. The count is the total experiment size, not a count per matchup. Both opening seats are included by default.
3. Use the fixed **Run simulations** command. Pause/Resume and Stop stay available while the batch runs. Setup controls and long statistics scroll inside bounded panels; small browser windows offer Setup/Results panel switches.
4. Explore **Overview**, **Decks**, **Cards**, **Economy** and **Territory**, and export an HTML report to review or share. Review unresolved matches and errors before interpreting approximate rates.
5. For a controlled experiment, enable **Advanced view**. Choose seed, exact profile, AI and rule parameters; change one factor at a time. JSON and match/card CSV preserve provenance; Matches opens an exact-seed trace, and Compare imports a previous report or named variant.
6. Escape closes a trace/Settings overlay or returns to the War Room landing. The main-menu command remains visible. Save/export completed results before leaving or reloading the simulator.

Pause/resume does not provide recovery after closing or reloading the page. Stop is a partial run: the requested total remains visible, unfinished scheduled matches are not fabricated, and an in-progress match is not included until finalized.

## Faction rates and the release gate

The player faction table uses **performance against other factions** whenever those observations exist. `summary.byFactionCross` counts only games between different factions; `summary.byFaction` retains all appearances for compatibility. Same-faction deck variants remain meaningful in deck/archetype and matchup results, but each contributes a forced 50% faction total. Including them in the formal faction gate would conceal part of the spread.

Sprint 5 requires every faction **45–55% against other factions** in the final representative-deck 50,000-match validation, with preferred highest-minus-lowest spread **at most 5 percentage points**. Extreme archetype and head-to-head gaps require separate review. The frozen v0.5.0 baseline failed: Nightwalker 66.138%, Rogue 32.472% against other factions (64.346% / 34.419% across all appearances). Final tuning is still being validated; no player interface or single winning-card correlation proves human competitive balance.

## Modes, seeds, and seats

In a duel, Side A takes the first seat in match 1. With seat swapping enabled, match 2 uses the same seed and reverses the decks. Each later pair receives another deterministic seed. An odd requested total leaves one additional original-seat match. Disabling seat swapping fixes the original seats and gives each match a distinct seed.

Matrix mode cycles through every non-mirror pairing in both seat orders, using the same seed for the opposing orders. With five starter decks, that is 20 matches per full cycle. Including mirrors adds five same-deck matches, making a 25-match cycle. Matrix mode always includes opposing seat orders; the duel seat checkbox does not alter it. A partial final cycle still honors the exact requested total and may leave unequal matchup or seat samples.

The same seed and seat order reproduce decisions only with the same build, deck contents, AI, rules, and safety limits. A same-seed seat swap is a controlled comparison; it does not guarantee that each faction receives identical opening cards. Changes to deck contents or shuffling inputs can also change draws.

## Rules and safeguards

The nine editable game settings are saved in the report and apply only to the experiment. The table records the original authoring/Arsenal defaults; use the selected profile's displayed values and exported options for a current experiment:

| Setting | Authoring baseline | Meaning |
| --- | ---: | --- |
| Starting Command | 20 | Initial supported Presence capacity. |
| Command growth | 10 | Capacity added on each later offensive turn for that player. |
| Command cap | 80 | Maximum supported capacity. Must be at least Starting Command. |
| Capture threshold | 25 | Accumulated objective Presence needed to capture. |
| Starting hand | 5 | Opening cards before ordinary turn-start drawing. |
| Cards per turn | 1 | Cards drawn at the start of an offensive turn. |
| Slots per side / territory | 5 | Permanent-card capacity for each player in each zone. |
| Major actions per turn | 3 | Deploy, move, attack, or action Order allowance. |
| Territories to win | 7 | Conquest requirement; capturing the opposing home also wins. |

Default safeguards are 240 offensive turns and 10,000 AI decisions per match. They prevent an experiment from running indefinitely; reaching a safeguard does not create a game-rule draw. The optional verification setting checks state invariants and card conservation after every decision and reduces throughput.

A turn is one player's offensive turn, not a full round containing both players. The engine initializes the next turn after an end-turn action. A turn-limited record caps its reported turn count at the safeguard; a replay's final engine state can therefore show the next initialized turn. The simulator takes no AI action on that extra turn.

## Read the results

| Result | Denominator or interpretation |
| --- | --- |
| Resolved / decisive | Matches that reached the engine's territory victory. |
| Unresolved | `turnLimit` and `decisionLimit` records. These have no winner. |
| Errors | `error` records, with their failure message. These have no winner. |
| Faction/deck win rate | Wins divided by resolved player appearances for that faction/deck. Cutoffs and errors are reported separately. |
| Cross-faction win rate | Faction wins divided by resolved appearances against a different faction. Same-faction deck variants are excluded. This is the formal Sprint 5 faction gate. |
| Seat win rate | Wins divided by resolved appearances in that seat. The overall first-player rate uses resolved matches. |
| Head-to-head win rate | The selected deck's wins divided by resolved games in that pairing. |
| Wilson 95% interval | A descriptive interval around the resolved proportion. An absent resolved sample produces `null`/—, not 0%. |
| Turn minimum / mean / median / maximum | Resolved matches only. |
| Total actions, captures, kills, damage | Accumulated across finalized records, including activity before an unresolved result or error. |

Mirror games count **two player appearances** in faction/deck totals: one winner and one loser per resolved mirror. The matchup itself remains **one game**. A mirror matchup rate describes the first seat; the same faction's aggregate mirror contribution is 50%. Including mirrors can pull aggregate faction rates toward 50%, so inspect non-mirror head-to-head results when comparing factions.

Always show the unresolved/error counts and sample sizes with a rate. A 70% resolved win rate in 10 resolved games and 90 cutoffs is a different result from 70% in 100 resolved games. Stopped runs and partial matrix cycles also need their completion and seat distribution retained.

Wilson intervals here describe the observed AI run. Same-seed pairs are related trials, and deterministic CPU matches are not independent samples of human play. An interval is not proof of competitive balance or a significance test for a difference between two builds.

### Card metrics

Card rows are grouped by deck and card ID. Multiple copies and recycled cards can contribute repeatedly.

| Metric | What it counts |
| --- | --- |
| `copiesPerDeck` | Copies in the registered starter deck. |
| `drawn` | Opening and subsequent draws, including recycled reserves. A Reclaim return to hand is not a draw. |
| `plays` | Deployments and Orders, including responses, counters, and redeployment after Reclaim. |
| `deployments` / `orders` | The corresponding components of plays. |
| `attacksInitiated` | Attack declarations by that card, even if a later response prevents combat damage. |
| `deaths` | Deployed permanents removed without being returned to hand. Orders are not casualties. |
| `unitTurnObservations` | One observation per deployed copy present before its owner's offensive end-turn, including Assets. |
| `handEndTurnObservations` | One observation per copy held before its owner's offensive end-turn; the same held card can appear repeatedly. |
| `affordableHandEndTurnObservations` | Held copies whose printed Presence fits the owner's Available Presence at that observation. This does not mean they have a legal target, timing window, or unique-card permission. |
| `playRate` | Plays divided by draws. This can exceed 1 after Reclaim and redeployment; it is a usage ratio, not a probability or card win rate. |

These counters include finalized unresolved/error records up to their stopping point. They describe exposure and AI behavior. High use, long field presence, or a card's appearance in winning games cannot establish causal card strength. Use controlled variants and human playtests before tuning from those observations.

## CLI batches

The CLI uses Node's built-in modules and needs no package installation:

```text
node scripts/simulate.js --count 1000 --a stonewall --b bruiser --seed 1009 --out test-results/sim-report.json --csv
```

`--a` and `--b` accept faction IDs or registered deck IDs, such as `stonewall-starter`. The default mode is a seat-swapped duel. Without `--out`, the JSON path is `test-results/simulator-report.json`.

```text
node scripts/simulate.js --mode matrix --count 1000 --seed 1009 --out test-results/matrix-report.json --csv --verify
node scripts/simulate.js --mode matrix --count 1000 --mirrors --seed 1009 --out test-results/mirrors-report.json
node scripts/simulate.js --count 100 --a rogue --b nightwalker --fixed-seats --max-turns 240 --max-decisions 10000
```

Supported batch controls include `--count`, `--mode duel|matrix`, `--a`, `--b`, `--seed`, `--out`, `--csv`, `--max-turns`, `--max-decisions`, `--verify`, `--fixed-seats`, and `--mirrors`. The browser exposes the nine rule parameters.

The CLI preserves the historical `baseline` profile/basic policy defaults. Specify **`--balance` and `--ai` explicitly** when comparing a current War Room experiment. Advanced view displays the profile ID and exported options retain it. `--pool archetypes` selects all ten presets; `--pool starters` selects the five originals. `--deck-file-a` / `--deck-file-b` accept validated exported deck JSON, and `--compare` accepts a previous report. For example, this is an explicit Arsenal-profile screen, not an automatic claim about the current selected live profile:

```text
node scripts/simulate.js --mode matrix --pool archetypes --count 1000 --balance arsenal --ai deck --seed 20261007 --out test-results/arsenal-screen.json --csv --verify
```

Use `node scripts/simulate.js --help` for flag help. Ctrl+C saves finalized CLI records as a partial report and excludes the active incomplete match. Rule/AI errors produce a nonzero exit status; reaching a safety cutoff is reported as unresolved.

`--csv` writes files beside the JSON using its basename: `sim-report.matches.csv` and `sim-report.cards.csv` for the first example. JSON rates and interval endpoints use 0–1 values; CSV winner seats use 1 and 2, while JSON winner indices use 0 and 1. Unresolved/error winners are empty or `null`.

## Export and reproduce

JSON includes normalized options, requested/finalized totals, completion status, individual records, aggregate metrics, simulator and AI versions, and a rules snapshot containing factions, cards, decks, configuration, and fingerprints.

Browser exports also add optional `execution` metadata: completion/stop/error status, runner type, active elapsed time, wall elapsed time, measured matches per second, and finish timestamp. Active time excludes pauses; wall time includes them. CLI exports record their reason and elapsed time separately. These fields describe execution and do not change deterministic match results.

Keep the original build with important reports. Fingerprints cover exported engine functions, the exported AI chooser, and data; they do not automatically cover every helper inside module closures. Rules and AI version identifiers must be bumped when their behavior changes. The snapshot records card/deck data but does not embed an executable old engine.

Match inspection uses the current build and rejects detected version/fingerprint incompatibility. Its trace is limited to 5,000 decisions; a `replayLimit` result means the inspection is truncated, not that the original batch became unresolved. Batch reports can still contain more decisions under their configured safeguard. Analysis intentionally exposes both AI hands.

For a useful experiment, retain its JSON, the matching code revision, its hypothesis, and the comparison report. Use [the simulator roadmap](SIMULATOR-ROADMAP.md) for versioned comparisons, additional decks and AI policies, causality experiments, and future resumable jobs; use [the game roadmap](GAME-ROADMAP.md) for human testing and game development gates.
