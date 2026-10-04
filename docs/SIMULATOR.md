# Frontlines War Room and Advanced Balance Lab

The **v1.0.0 War Room** keeps deck and Commander testing inside Frontlines. Its central landing offers **Quick Matchup**, **Tournament**, **Faction Overview** and **Advanced Lab**. Player results use clear cards and bounded tabs; the full Balance Lab remains accessible through Advanced. Simulator **4.0.0** runs the shared authoritative engine without artwork, animation, sound or turn delays. Off-lane Commander passives/actives, Capacity/Command Actions, mandatory capture retreat, Breakthrough, Presence commitment, responses, Armor, Mark, Reinforce, Adapt and victory use the same rules as the live game.

**Ryken operates balance simulations unless explicitly authorizing Codex to run them.** The authorized v0.7.0 run completed 10,000 decisive games with no errors/cutoffs and is archived in the [Sprint 6 baseline report](balance/SPRINT6-BASELINE.md). No follow-up balance campaign has run under the expanded Commander profile. [Sprint 9](SPRINT-009.md#exact-proposed-simulation-request--awaiting-owner-authorization) proposes an exact 10,000-game ten-Commander-foundation screen after the stable release gate. It is not authorized or executed by the sprint. Earlier [Commander-free requests](SPRINT-007.md#simulation-request--after-the-stable-candidate) remain separate historical proposals. No automatic tuning loop or 50,000-game confirmation is implied. Ordinary deterministic, tutorial and small stability fixtures remain expected development checks.

The current `sprint9` / `sprint9-commanders-v1` profile includes **115 gameplay cards**, **ten separate named Commanders**, five original starters, **15 preserved presets** and **ten Commander foundations**. Saved custom decks use the canonical 26-card, single-faction, four-ordinary/two-Leader limits plus exactly one same-faction Commander outside the card list. Open Arsenal to construct or import a list, then refresh saved decks in the Lab. Choose a duel or selected-pool round robin, including same-faction leaders/variants. Both duel sides expose Commander choice and complete doctrine. Selecting a different leader tests the same card list with a distinct named experiment ID; it does not rewrite the saved original. The exact total is distributed across paired opening seats; partial cycles can have unequal matchup exposures. See the [deckbuilding guide](DECKBUILDING.md) and [Commander reference](COMMANDERS.md).

Reports preserve exact lists, Commander assignments/catalog, profiles, versions and seeds. **Decks** adds a deck matrix, Commander performance, archetype rates, curves and played-pair correlations. **Advanced → Compare** supports earlier reports and named variants; AI/rule/deck-list/Commander differences remain explicit. HTML, JSON and matches/cards/Commander CSV exports identify originating game version and include economy, territory/comeback, match-length, card use and interaction metrics. Telemetry **`frontlines-telemetry-v6-commanders`** adds Commander activation, timing, passive triggers and typed effect value while preserving Mark/Reinforce/Adapt and nominal/effective Armor protection. Current implementation and known limits are recorded in [Sprint 9](SPRINT-009.md); prior release records retain their original evidence.

Normal entry uses the current game balance profile and Commander-aware deck AI. **Advanced view** exposes balance profiles, both AI policies, reproducible seeds, rule overrides, safeguards, diagnostic thresholds, confidence intervals, match records and comparison. Changing the profile rebuilds its deck catalog: Sprint 9 includes Commander foundations and controls; Sprint 7 has fifteen presets with no Commander effects; preserved Sprint 6 has ten and receives neither expansion nor Commanders. Saved decks remain stored when an older profile cannot model their cards. The dashboard labels advanced experiment settings when those results are viewed in player mode. Experiments never change live rules or saved decks. Local ownership never restricts a legal War Room list, and experiments grant no Credits/mastery.

The [saved 1,000-match baseline](simulator-baseline-1000.json) and [verification report](SIMULATOR-VERIFICATION.md) preserve the initial benchmark and launch checks. The older [Sprint 2 balance checkpoint](BALANCE.md) remains a separate historical sample.

## Launch and run

Choose **War Room** in the game's command menu, **Test in War Room** in Arsenal, or the native **Frontlines → War Room / Balance Lab** menu. Dedicated `Launch Simulator.cmd` and direct `simulator.html` browser launch remain supported. This offline path needs no installation or internet connection and uses a cooperative runner that yields between simulation slices. Native menu commands navigate in the same window.

For the local HTTP Worker path, use Node 18 or newer:

```text
npm start
```

Open `http://127.0.0.1:4173/simulator.html`. The HTTP route uses a background Worker where available; file launch remains a supported fallback. **Advanced view** identifies the active runner. Native fullscreen works through Settings, F11 or Alt + Enter; browser launch uses browser fullscreen.

1. Choose **Quick Matchup**, pick both factions, actual starter/preset/foundation/saved decks and same-faction Commanders. Expand doctrine to read passive/active/hook. Or choose **Tournament** and check at least two decks; the Commander-foundation shortcut selects all ten. **Faction Overview** starts with the five original starter decks.
2. Enter 1–100,000 total simulations, or use the 1,000/10,000/50,000 presets. The count is the total experiment size, not a count per matchup. Both opening seats are included by default.
3. Use the fixed **Run simulations** command. Pause/Resume and Stop stay available while the batch runs. Setup controls and long statistics scroll inside bounded panels; small browser windows offer Setup/Results panel switches.
4. Explore **Overview**, **Decks** (including Commander performance), **Cards**, **Economy** and **Territory**, and export an HTML report to review or share. Review unresolved matches and errors before interpreting approximate rates.
5. For a controlled experiment, enable **Advanced view**. Choose seed, exact profile, AI and rule parameters; change one factor at a time. JSON and matches/cards/Commander CSV preserve provenance; Matches opens an exact-seed trace, and Compare imports a previous report or named variant.
6. Escape closes a trace/Settings overlay or returns to the War Room landing. The main-menu command remains visible. Save/export completed results before leaving or reloading the simulator.

Pause/resume does not provide recovery after closing or reloading the page. Stop is a partial run: the requested total remains visible, unfinished scheduled matches are not fabricated, and an in-progress match is not included until finalized.

## Faction rates and the release gate

The player faction table uses **performance against other factions** whenever those observations exist. `summary.byFactionCross` counts only games between different factions; `summary.byFaction` retains all appearances for compatibility. Same-faction deck variants remain meaningful in deck/archetype and matchup results, but each contributes a forced 50% faction total. Including them in the formal faction gate would conceal part of the spread.

The standing target is every faction approximately **45–55% against other factions**, with preferred highest-minus-lowest spread **at most 5 percentage points**. Extreme archetype and head-to-head gaps require separate review. Sprint 5's gate was not completed: the frozen v0.5.0 baseline failed at Nightwalker 66.138% / Rogue 32.472% cross-faction (64.346% / 34.419% across all appearances). The separately authorized v0.7.0 baseline also failed, with Nightwalker 69.93% and Rogue 32.77% cross-faction; the first seat won 57.05%. Keep each result with its originating rules and pool. Neither establishes the expanded v0.9.0 candidate's balance; new owner-reviewed data and human observations are needed.

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
| Command Actions per turn | 3 | Tactical command allowance. Current rules retain free ordinary deployment/support; moves/attacks and explicitly marked major cards cost commands. Sprint 7 adds a one-command Silencer deployment and one-command cost for every Field Options mode. Historical profiles keep their own costs. |
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

### Commander metrics

`summary.byCommander` groups player appearances by the actual assigned leader, separately from faction and deck rates. It records decisive wins/appearances and seats, active uses, activation rate/mean activation turn, passive triggers, active costs, direct/effective damage, healing, card/temporary-Capacity recovery and disruption. Passive value additionally records `presenceSaved`, `commandActionsSaved`, `bonusPressure` and `passiveCardsDrawn`. These values use different units and must remain separate; an aggregate trigger amount is not one economic efficiency score.

Commander summaries can combine different decks/opponents, so use deck/matchup rows and exact lists before attributing a rate to one ability. An unused active can indicate bad AI timing, no useful legal target, deliberate conservation, or a match that ended before its opportunity. Inspect samples rather than assuming the leader was useless. Changing a Commander assignment is a changed experimental condition. Foundation comparisons also change their deliberately different card quantities.

The normal **Commander CSV** export uses `Simulator.commandersCSV(report)`. The CLI `--csv` option writes a sibling `.commanders.csv` for Commander-enabled reports along with existing match/card files. Earlier profiles expose no invented Commander usage.

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
| `markApplications` / `reinforceApplications` | Successful status applications credited to the source Order. |
| `adaptPlays` | Adapt Order plays; the chosen mode is also retained in the Order event/replay. |
| `armorAbsorbed` | Nominal regular-combat damage prevented by printed or temporary Armor, after shield and Fortify. |
| `armorEffectiveHealthProtected` | Armor protection limited to the receiver's remaining Health; avoids counting irrelevant overkill as saved Health. |
| `markedCombatWindows` | Positive regular attack/counterfire damage events where the receiver's Mark added its bonus. This is not a count of unique engagements or a causal win measure. |

These counters include finalized unresolved/error records up to their stopping point. They describe exposure and AI behavior. High use, long field presence, or a card's appearance in winning games cannot establish causal card strength. Use controlled variants and human playtests before tuning from those observations.

## CLI batches

The CLI uses Node's built-in modules and needs no package installation:

```text
node scripts/simulate.js --count 1000 --a stonewall --b bruiser --balance sprint7 --ai deck --seed 1009 --out test-results/sim-report.json --csv
```

`--a` and `--b` accept faction IDs or registered deck IDs, such as `stonewall-starter`. The default mode is a seat-swapped duel. Without `--out`, the JSON path is `test-results/simulator-report.json`.

```text
node scripts/simulate.js --mode matrix --count 1000 --balance sprint7 --ai deck --seed 1009 --out test-results/matrix-report.json --csv --verify
node scripts/simulate.js --mode matrix --count 1000 --mirrors --balance sprint7 --ai deck --seed 1009 --out test-results/mirrors-report.json
node scripts/simulate.js --count 100 --a rogue --b nightwalker --balance sprint7 --ai deck --fixed-seats --max-turns 240 --max-decisions 10000
```

Supported batch controls include `--count`, `--mode duel|matrix`, `--a`, `--b`, `--seed`, `--out`, `--csv`, `--max-turns`, `--max-decisions`, `--verify`, `--fixed-seats`, and `--mirrors`. The browser exposes the nine rule parameters.

The CLI preserves the historical `baseline` rules/basic-policy defaults. Specify **`--balance` and `--ai` explicitly** for a current experiment. Advanced view displays the profile ID and exported options retain it. `--pool archetypes` selects all presets available under the selected profile: fifteen under `sprint7`, ten under `sprint6` or `arsenal`. `--pool starters` selects the five originals. `--deck-file-a` / `--deck-file-b` accept validated exported deck JSON, and `--compare` accepts a previous report. For example:

```text
node scripts/simulate.js --mode matrix --pool archetypes --count 1000 --balance sprint7 --ai deck --seed 20261007 --out test-results/arsenal-screen.json --csv --verify
```

These examples explain owner-operated tool syntax; they do not authorize Codex to launch a batch. The exact proposed validation jobs, seed **20261003**, paired seats, mirror exclusions, safeguards and required exports are in the [Sprint 7 simulation request](SPRINT-007.md#simulation-request--after-the-stable-candidate). Job A retains 45 original-deck pairs with 222–224 games per pair; Job B has 105 pairs with 94–96 games per pair. Compare their different pools separately. The CLI's deck policy has no live difficulty override and is not an Expert-difficulty benchmark.

Use `node scripts/simulate.js --help` for flag help. Ctrl+C saves finalized CLI records as a partial report and excludes the active incomplete match. Rule/AI errors produce a nonzero exit status; reaching a safety cutoff is reported as unresolved. There is no `--rich` or difficulty CLI flag; individual rich traces are generated by match inspection.

`--csv` writes files beside the JSON using its basename: `sim-report.matches.csv` and `sim-report.cards.csv` for the first example. JSON rates and interval endpoints use 0–1 values; CSV winner seats use 1 and 2, while JSON winner indices use 0 and 1. Unresolved/error winners are empty or `null`.

## Export and reproduce

JSON includes normalized options, requested/finalized totals, completion status, individual records, aggregate metrics, simulator and AI versions, and a rules snapshot containing factions, cards, decks, configuration and fingerprints. The current registry is `frontlines-balance-registry-v4-arsenal`; Sprint 7 uses engine `frontlines-territory-v4-arsenal-mechanics`, AI `frontlines-ai-sprint7-v1`, simulator `3.3.0` and telemetry `frontlines-telemetry-v5-arsenal`. Preserved historical profiles retain their own engine/AI behavior identifiers.

Browser exports also add optional `execution` metadata: completion/stop/error status, runner type, active elapsed time, wall elapsed time, measured matches per second, and finish timestamp. Active time excludes pauses; wall time includes them. CLI exports record their reason and elapsed time separately. These fields describe execution and do not change deterministic match results.

Keep the original build with important reports. Fingerprints cover exported engine functions, the exported AI chooser, and data; they do not automatically cover every helper inside module closures. Rules and AI version identifiers must be bumped when their behavior changes. The snapshot records card/deck data but does not embed an executable old engine.

Match inspection uses the current build and rejects detected version/fingerprint incompatibility. Its trace is limited to 5,000 decisions; a `replayLimit` result means the inspection is truncated, not that the original batch became unresolved. Batch reports can still contain more decisions under their configured safeguard. Analysis intentionally exposes both AI hands.

For a useful experiment, retain its JSON, the matching code revision, its hypothesis, and the comparison report. Use [the simulator roadmap](SIMULATOR-ROADMAP.md) for versioned comparisons, additional decks and AI policies, causality experiments, and future resumable jobs; use [the game roadmap](GAME-ROADMAP.md) for human testing and game development gates.

## Sprint 8 ownership boundary

Collection progression applies to human Play. The AI, Node simulator, Worker and offline fallback use the complete legal pool without opening packs, charging Credits or awarding mastery. An incomplete owned collection never alters a simulation deck or result. No new large campaign is authorized. See [Sprint 8](SPRINT-008.md#exact-simulation-request-for-ryken--not-executed) for the exact separately authorized follow-up request.
