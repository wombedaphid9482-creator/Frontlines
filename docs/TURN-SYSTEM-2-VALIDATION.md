# Turn System 2.0 — proposed owner-run comparison

This is a proposed validation configuration, not an authorization to execute it. Sprint 15 runs deterministic fixtures and bounded correctness matches only. Publication and large balance campaigns require Ryken's authorization.

Compare the preserved `sprint12` v1.2.0 action-window rules with `sprint15` v1.3.0 paired-turn rules. Both contain the same 155 cards, ten Commanders, 35 decks and printed numeric values. The migrated AI understands the new capture timing; record its version as a changed experimental condition. Do not attribute all differences to card strength.

## Initial screen

For each profile, use the five original faction starter decks, matrix mode, no mirrors, 1,000 total matches, seed `1209`, deck-aware AI in both seats, invariant verification, a 240-normal-Action-Window budget and 10,000 decisions per match. Use 240 historical turns for `sprint12`, 120 paired Turns for `sprint15`. The 20 directed starter matchups each receive 50 games; every unordered pair receives 50 games in each opening seat.

Keep JSON, HTML, matches/card/Commander CSV and original source build. Review errors, unresolved matches, both opening seats, net pressure, first capture, match length in normal Action Windows, Commander activation and shared casualty-draw use. Do not subtract historical and paired `turns`: their units differ.

## Arsenal follow-up

If the initial screen has no implementation errors, propose a second owner-approved run with all 35 preserved decks, matrix mode, no mirrors, **11,900 matches per profile**, the same seed, AI, verification and safeguards. There are 1,190 directed matchup records in a complete cycle; ten cycles give exactly ten games per directed pair, or twenty across both seats per unordered pair. This is a diagnostic coverage screen, not a precise matchup estimate.

Human playtests should independently cover same-Turn defensive response before capture, temporary status lifetimes, first/second-window resource cadence, all ten Commanders, multiplayer reconnect and rematch. AI correlation alone does not authorize numeric balancing. Collect owner-reviewed evidence before proposing any competitive tuning.

## Required provenance

Record originating game version and commit, `balanceProfile`, rules/AI/simulator/telemetry versions, schema and timing model, exact deck lists and Commander assignments, seed schedule, both cutoffs, first-seat distribution, requested/finalized totals and completion status. Inspect cutoff/error records separately from decisive win rates. Archived reports retain their original timing units and replay only in a compatible build.
