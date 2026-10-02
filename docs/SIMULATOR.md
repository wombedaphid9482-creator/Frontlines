# Frontlines Balance Lab

The Balance Lab runs the shared authoritative engine with selected baseline, faction-aware, deck-aware or random policies, without artwork, animation, sound or turn delays. Territory capture, Breakthrough, Presence commitment, responses and victory use the same rules as the live game.

Five original starter lists, ten archetype presets and saved legal custom decks are available. Open Arsenal to construct or import a list, then refresh saved decks in the Lab. Choose a duel or a selected-pool round robin, including same-faction variants. The exact total is distributed across paired opening seats; partial cycles can have unequal matchup exposures. See [deckbuilding guide](DECKBUILDING.md) for construction rules and CLI deck imports.

Reports preserve exact lists, profiles, versions and seeds. Decks & pairs adds a deck matrix, archetype rates, curves and played-pair correlations. Compare supports earlier reports and named variants; AI/rule/deck-list differences remain explicit. HTML, JSON and CSV exports accompany rich replay, card outliers, economy, territory/comeback and match-length percentiles. Current validation is in [Sprint 4](SPRINT-004.md); older benchmark sections below remain useful historical context.

The [saved 1,000-match baseline](simulator-baseline-1000.json) and [verification report](SIMULATOR-VERIFICATION.md) preserve the initial benchmark and launch checks. The older [Sprint 2 balance checkpoint](BALANCE.md) remains a separate historical sample.

## Launch and run

Double-click `Launch Simulator.cmd` or open `simulator.html` in a desktop browser. This offline path needs no installation or internet connection. It uses a cooperative main-thread runner so the page can yield between simulation slices.

For the local HTTP Worker path, use Node 18 or newer:

```text
npm start
```

Open `http://127.0.0.1:4173/simulator.html`. The dashboard identifies the active runner. The HTTP route moves the simulation work into a Worker where available; file launch remains a supported fallback.

1. Choose **Selected matchup** and two faction starter decks, or **All factions** for a matchup matrix.
2. Enter the total number of matches, from 1 to 100,000, and a base seed. The count is the total experiment size, not a count per matchup.
3. Keep alternate seats enabled for a duel. Use an even total to complete every original/swapped seed pair.
4. Leave default rules and safeguards for an initial benchmark. Change one parameter at a time in later comparisons.
5. Run the batch. Pause/resume continues the current in-memory job; Stop ends the batch with the records finalized so far.
6. Review unresolved results and errors before interpreting win rates. Export JSON for provenance and match/card CSVs for analysis. Inspect an individual match to rerun its seed and view a decision trace.

Pause/resume does not provide recovery after closing or reloading the page. Stop is a partial run: the requested total remains visible, unfinished scheduled matches are not fabricated, and an in-progress match is not included until finalized.

## Modes, seeds, and seats

In a duel, Side A takes the first seat in match 1. With seat swapping enabled, match 2 uses the same seed and reverses the decks. Each later pair receives another deterministic seed. An odd requested total leaves one additional original-seat match. Disabling seat swapping fixes the original seats and gives each match a distinct seed.

Matrix mode cycles through every non-mirror pairing in both seat orders, using the same seed for the opposing orders. With five starter decks, that is 20 matches per full cycle. Including mirrors adds five same-deck matches, making a 25-match cycle. Matrix mode always includes opposing seat orders; the duel seat checkbox does not alter it. A partial final cycle still honors the exact requested total and may leave unequal matchup or seat samples.

The same seed and seat order reproduce decisions only with the same build, deck contents, AI, rules, and safety limits. A same-seed seat swap is a controlled comparison; it does not guarantee that each faction receives identical opening cards. Changes to deck contents or shuffling inputs can also change draws.

## Rules and safeguards

The nine editable game settings are saved in the report and apply only to the experiment:

| Setting | Default | Meaning |
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

Use `node scripts/simulate.js --help` for flag help. Ctrl+C saves finalized CLI records as a partial report and excludes the active incomplete match. Rule/AI errors produce a nonzero exit status; reaching a safety cutoff is reported as unresolved.

`--csv` writes files beside the JSON using its basename: `sim-report.matches.csv` and `sim-report.cards.csv` for the first example. JSON rates and interval endpoints use 0–1 values; CSV winner seats use 1 and 2, while JSON winner indices use 0 and 1. Unresolved/error winners are empty or `null`.

## Export and reproduce

JSON includes normalized options, requested/finalized totals, completion status, individual records, aggregate metrics, simulator and AI versions, and a rules snapshot containing factions, cards, decks, configuration, and fingerprints.

Browser exports also add optional `execution` metadata: completion/stop/error status, runner type, active elapsed time, wall elapsed time, measured matches per second, and finish timestamp. Active time excludes pauses; wall time includes them. CLI exports record their reason and elapsed time separately. These fields describe execution and do not change deterministic match results.

Keep the original build with important reports. Fingerprints cover exported engine functions, the exported AI chooser, and data; they do not automatically cover every helper inside module closures. Rules and AI version identifiers must be bumped when their behavior changes. The snapshot records card/deck data but does not embed an executable old engine.

Match inspection uses the current build and rejects detected version/fingerprint incompatibility. Its trace is limited to 5,000 decisions; a `replayLimit` result means the inspection is truncated, not that the original batch became unresolved. Batch reports can still contain more decisions under their configured safeguard. Analysis intentionally exposes both AI hands.

For a useful experiment, retain its JSON, the matching code revision, its hypothesis, and the comparison report. Use [the simulator roadmap](SIMULATOR-ROADMAP.md) for versioned comparisons, additional decks and AI policies, causality experiments, and future resumable jobs; use [the game roadmap](GAME-ROADMAP.md) for human testing and game development gates.
