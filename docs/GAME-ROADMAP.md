# Game action roadmap

The next work starts from the playable Sprint 2 game. Territory remains the victory objective. Presence remains deployment cost, ongoing field commitment, and capture strength. The engine owns rules; the interface and effects describe its state.

This roadmap has acceptance gates rather than dates. Complete a gate before widening its scope. The separate [simulator roadmap](SIMULATOR-ROADMAP.md) supports these decisions; CPU results alone do not establish human balance.

The first [1,000-match baseline is saved](simulator-baseline-1000.json) and [verified across Node, CLI, and browser](SIMULATOR-VERIFICATION.md). It supplies the starting evidence for phase 1. Human matchup testing and subsequent tuning remain outstanding.

## 1. Establish a balance baseline and collect human evidence

**Depends on:** the current playable game and the separate simulator's reproducible exports.

Actions:

- Use the [saved 1,000-match baseline](simulator-baseline-1000.json), which covers 50 seed pairs for each of the ten non-mirror matchups. Preserve it and refresh a comparable report when rules, decks, or AI change. Run mirror matchups separately to investigate initiative and AI symmetry.
- Keep exports with the exact engine, card, deck, AI, rule, and simulator versions. Report unresolved matches and errors alongside resolved win rates and intervals. Inspect the longest matches and repeated territorial reversals.
- Prioritize Bruiser against the other factions, then Nightwalker and Rogue. The existing 100-match checkpoint recorded Bruiser winning 31 of 32 non-mirror appearances, but that is a baseline-AI result rather than proof of human imbalance.
- Use the [human playtest guide](PLAYTEST-GUIDE.md). Play suspect matchups from both seats, record Presence decisions and decisive turns, and note whether low-performing cards were understood and used.
- Record a short finding for each suspect matchup: likely card strength, likely AI misuse, unclear rules, excessive match length, or insufficient evidence.

**Gate:** the saved benchmark is reproducible, errors have been investigated, cutoffs remain visible, and human observations support or challenge each proposed balance change. Separate game balance findings from AI competence findings.

## 2. Tune a focused problem and preserve regression coverage

**Depends on:** a written finding from phase 1.

Actions:

- Change one explicit factor at a time: a card's Presence/stat value, a starter-deck count, capture threshold, action count, or capacity progression. Write the expected gameplay effect before testing.
- Rerun the same benchmark plan and examine seat results, matchup changes, capture pace, commitment, and unresolved matches. Keep the original report as the comparison baseline.
- Replay relevant human matchups. Confirm that the intended choice becomes more interesting and that losing battlefield forces still frees useful deployment capacity.
- Add a rules regression only when the change introduces a rule or corrects a failure. Cover the concrete trigger, response/counter resolution, commitment release, capture, and victory when affected.
- Keep ordinary combat, territory capture, and Breakthrough understandable together. Review prolonged reversals before changing several rules to shorten a match.

**Gate:** the targeted problem improves in human play; the saved comparisons explain the tradeoff; existing rules tests pass; full matches still complete; and no unexplained regression or hidden unresolved-result inflation is accepted.

## 3. Guide a first match and fill missing battlefield roles

**Depends on:** stable rules and a small set of established balance decisions.

Actions:

- Add an optional guided first match covering deployment, movement, readiness, a response window, Presence commitment, end-turn capture, and victory.
- Explain the current action at its target. Keep the field manual available, let experienced players skip guidance, and preserve hand privacy during hot-seat transfers.
- Check common desktop sizes, smaller windows, card inspection, affordability, target highlighting, and the final territory state with a new player.
- Add a card only to test a missing role or a documented decision: recovery, defensive occupation, support, breakthrough, or specialist interaction. Define its counterplay and its place in the Presence economy before adding duplicates to a deck.
- Extend art lookup and tooltips with each new role; avoid a collection of nearly identical stat cards.

**Gate:** an unfamiliar player can complete a match and explain why territory wins, why deployed forces reduce Available Presence, and why a card or unit is currently unavailable. Each added card has a distinct tested role and a legal-action regression where needed.

## 4. Add saved decks on top of a validated deck registry

**Depends on:** stable card IDs, versioned deck definitions, and useful role variety. Coordinate the registry with simulator phase 1.

Actions:

- Define deck construction rules explicitly: allowed factions, deck size, duplicate limits, leader rules, and any exclusions. Do not infer these from the current 26-card starter lists.
- Add a local deck editor, save/load, import/export, and a clear validation report. Keep starter decks available as a reliable fallback.
- Give saved decks stable IDs and revisions. Export card IDs and counts rather than artwork or presentation state.
- Pass validated deck contents to the existing game setup and simulator through the same registry. Preserve conservation checks, shuffling, reserves, and uniqueness during play.
- Test missing cards, invalid counts, incompatible versions, corrupt imports, and storage failures.

**Gate:** a valid saved deck produces the same initial inventory in the game and simulator; invalid decks cannot start a match; import/export round-trips; and starter matches still work without saved data.

## 5. Replace representative art and sound where identity benefits most

**Depends on:** stable card roles and the existing [asset pipeline](ART-DIRECTION.md).

Actions:

- Prioritize bespoke art for faction commanders and signature units; retain shared role art for cards that do not yet need a unique image.
- Keep faction silhouettes and frame motifs consistent. Verify portraits at hand-card, inspector, and battlefield sizes, including mirror matches where player allegiance must remain distinct.
- Replace synthesized sound hooks with small local assets for deployment, distinct attacks, casualties, capture, Presence, and victory.
- Retain Normal/Fast settings, reduced effects, reduced shake, and muted audio defaults. Bound effects and unload completed effects promptly.
- Measure runtime asset size and match responsiveness before increasing visual complexity.

**Gate:** signature cards are recognizable at small size; repeated play remains responsive; audio and animation never delay or mutate rules; reduced-motion settings remain usable; and offline launch still loads local assets.

## 6. Consider multiplayer only after the local rules are ready

**Depends on:** phases 1–4, deterministic action/replay coverage, version compatibility, and a decision about the intended multiplayer scope.

Actions:

- Specify who is authoritative, which commands are accepted, how actors and versions are validated, and how reconnects resume a match.
- Design separate public and player-private state views. The current local engine state contains both hands and decks and must not be sent wholesale to opposing players.
- Verify turn, response, and counter ownership; duplicate/replayed actions; disconnections; and victory locking across two clients.
- Reuse territory, Presence, the legal-action API, and the event presentation layer. Establish multiplayer correctness before adding matchmaking or account systems.

**Gate:** two clients agree on every public rules transition; neither receives the opponent's private cards; rejected or duplicate commands do not alter state; and reconnect and victory behavior pass repeatable tests.

Online services, monetization, packs, ranked play, campaigns, and large collections remain outside the current work. They require their own scope after the local game earns those dependencies.
