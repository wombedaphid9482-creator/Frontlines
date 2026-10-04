# Simulator action roadmap

The **v1.0.0 War Room** remains inside Frontlines. It supports custom Commander decks, ten owned Commander foundations, the preserved fifteen archetype/hybrid templates, historical profiles and explicit AI policies. Simulator 4.0.0 and telemetry v6 snapshot the 115-card pool, exact inventories, Commander assignments/catalog, modes, rules and fingerprints. Commander outcomes, activation timing, passive triggers and typed effect value are recorded alongside existing card/territory/economy instrumentation. Node, Worker and offline fallback share the engine; incompatible archived replays are rejected.

## Next v1.0.0 simulator action plan

1. **Request the ten-leader foundation screen after the release gate.** Proposed: 10,000 verified games, `--pool commanders`, `sprint9`, deck AI both sides, default rules, seed 20261003, paired reversed seats, exact mirrors off, distinct same-faction leaders included, 240-turn/10,000-decision cutoffs and JSON/HTML/matches/cards/Commander CSV. The [exact request](SPRINT-009.md#exact-proposed-simulation-request--awaiting-owner-authorization) is not authorized or executed by the sprint.
2. **Inspect what the Commander actually did.** Read leader/deck/matchup/initiative rates with sample denominators; then inspect activation rate/timing, illegal-target failures, passive triggers, damage/healing/recovery/disruption and preserved resources. Presence saved, Command Actions saved, bonus capture pressure and card draws are separate quantities, not one efficiency sum.
3. **Use controlled same-list comparisons.** War Room can swap a Commander while preserving a deck's card list and saving a distinct experiment identity. Keep opponents, seeds, policies, rules and counts fixed for a narrow investigation. Foundation-vs-foundation rates include intentional card-list differences.
4. **Preserve historical meaning.** Earlier profiles disable Commander rules; older reports retain their catalogs and cannot silently become Commander replays. Comparing changed Commander assignments or opponent pools is an observational comparison with changed conditions.
5. **Let Ryken authorize follow-up volume.** A focused same-list matchup, a larger sweep or economy campaign requires explicit settings and authorization. No automatic optimizer, background balance job or mass tuning loop is installed.

## Completed baseline

Ryken authorized one Sprint 6 run: **10,000 decisive matches, zero errors or cutoffs**. Results/configuration and an independent audit are [archived](balance/SPRINT6-BASELINE.md). Cross-faction spread is 37.16 points and first-seat rate 57.05%. The Sprint 5 gate also failed. No following batch is authorized.

## Previous Commander-free simulator action plan

1. **Request original-pool comparison.** 10,000 games with the original ten presets, sprint7, deck AI on both sides, seed 20261003, paired reversed seats, exact mirrors off, same-faction variants included, default progression, 240-turn/10,000-decision limits, verification and JSON/HTML/CSV exports. This checks the narrow correction and preserves opponent weighting; it does not cover expansion cards.
2. **Request expansion coverage separately.** 10,000 games with all fifteen presets and identical settings. Each hybrid includes all seven faction additions. About 94–96 games per pair provides screening evidence. The changed opponent pool prevents a causal aggregate before/after claim.
3. **Review context.** Inspect faction/deck/archetype/seat rates, extreme pairings, duration, territory/retreat, commands, free plays, commitment and card access. Winning associations, comeback exposure and final-territory metrics have known limitations.
4. **Authorize larger work only after review.** Seeded investigations or 50k confirmation require explicit authorization. Use the frozen source checkpoint for original v0.7.0 replay. No background scheduler or batch loop is installed.
5. **Improve evidence quality.** Add preterminal comeback exposure, event-level territory measures, saved-deck comparisons and resumable jobs when useful. Preserve bounded traces and hidden-information independence.

[Exact requests/settings](SPRINT-007.md#simulation-request--after-the-stable-candidate) are ready for approval. Run/Pause/Resume/Stop remain central and visible. Small rule, deck, browser and native fixtures are correctness checks, separate from balance campaigns.

## Historical staged roadmap

## 0. Deliver a standalone fast baseline

**Depends on:** the existing engine, baseline AI, and five starter decks.

Scope:

- Separate launcher and page; offline file launch with a cooperative main-thread fallback, and a Worker path when served locally.
- Duel between two starter decks or an all-faction matchup matrix; exact requested match count from 1 to 100,000; deterministic seeds; optional mirrors; reversed seats by default in duels.
- Exposed game rules and safety turn/decision limits, with run, pause/resume, and stop controls.
- Faction, deck, seat, and matchup statistics; Wilson 95% intervals for resolved win rates; explicit cutoff/error counts; observational card use, death, and attack metrics.
- JSON and match/card CSV exports; inspection and rerun of an individual match's seed.
- Dependency-free CLI access for repeatable batches.

**Gate:** browser and CLI runs agree for the same versions and settings; the requested total is honored; pause/resume does not skip or duplicate matches; stopping produces an honest partial report; unresolved results cannot become wins or invented draws; and gameplay files remain runnable independently.

## 1. Make decks a shared versioned registry

**Depends on:** the delivered baseline and stable card IDs.

Actions:

- Move deck metadata into a shared registry with stable deck IDs, faction, revision, display name, card counts, and validation results. Preserve the five 26-card starter decks.
- Allow the simulator to select multiple registered decks from the same faction and report them separately. Distinguish faction totals from deck performance.
- Validate deck size, permitted cards, duplicate limits, and leader constraints using explicit rules shared with the game.
- Add custom deck import after the construction rules exist. A graphical builder and saved game decks can then use the same registry rather than creating a simulator-only deck format.

**Gate:** invalid deck definitions fail before a run; inventories match the registered counts; deck IDs/revisions survive export and reproduction; and starter-deck results are unchanged under the same seed plan.

## 2. Compare revisions with paired seeds and preserved provenance

**Depends on:** versioned deck definitions and trustworthy exports.

Actions:

- Store run provenance: engine/card/AI/simulator revisions, deck revisions, all rules, seed plan, seat plan, safety limits, requested total, and completion status.
- Add baseline-versus-candidate comparison using the same matchup and seed-pair plan. Change one factor at a time and make incompatible comparisons explicit.
- Compare resolved outcomes, unresolved/error rates, seat bias, match length, capture pace, and card use. Show sample sizes next to every change.
- Keep seed pairs as a grouping unit for paired comparisons. The existing Wilson intervals describe individual run proportions; they are not a test that a candidate is better than its baseline.
- Explain that the same seed does not guarantee identical opening cards when seats, decks, or shuffling inputs change.

**Gate:** a comparison can be recreated from two saved manifests; its only intended difference is visible; denominators and unresolved rates are retained; and paired results are never presented as independent evidence without accounting for their grouping.

## 3. Test multiple AI policies and strategic coverage

**Depends on:** a reproducible baseline and comparison tooling.

Actions:

- Add explicitly versioned policy profiles, such as current baseline, conservative deployment, territory pressure, and defensive response. Every profile must choose through the same legal-action API and respect hidden information.
- Benchmark profile-versus-profile as well as profile-versus-self. Keep policy selection separate from faction/deck selection.
- Record actionable coverage: deployment affordability, available responses, Guard and Precision opportunities, Mobile movement, Reclaim/Retreat use, commander support, and capture reversals.
- Add opportunity denominators where needed. A card that was never drawn or legally playable should not look equivalent to a card repeatedly declined by the AI.
- Use disagreements among policies to identify AI-sensitive faction results before adjusting human-facing cards.

**Gate:** policies produce legal deterministic decisions for fixed inputs; no profile uses concealed opposing cards; meaningful faction mechanics receive measured opportunities; and reports identify both policy and opportunity counts.

## 4. Run card ablation and controlled causality experiments

**Depends on:** phases 1–3 and a specific balance question.

Actions:

- Define a hypothesis before the batch: which card, count, trait, or cost changes, what remains fixed, and which outcomes would support the hypothesis.
- Register each variant as its own versioned deck/data experiment. For a removal experiment, specify its replacement so changes in deck size or card density do not silently become extra factors.
- Run baseline and variant under the same matchup, policy, rule, and seed-pair plan. Include both seats and record unresolved outcomes.
- Evaluate outcomes and strategic behavior together. Higher use or a high win rate in matches where a card was played is observational and does not prove that the card caused victory.
- Repeat with a second relevant AI policy and targeted human tests before claiming a game-balance conclusion.

**Gate:** the intervention is explicit, reproducible, and reversible; the analysis separates correlation from the controlled change; paired denominators are correct; and conclusions identify their tested decks and policies.

## 5. Scale jobs without losing reproducibility

**Depends on:** stable run manifests, aggregation, and comparison tests.

Actions:

- Partition a fixed match plan across Workers or processes while keeping match IDs and seeds independent of completion order.
- Merge records once by stable ID. Keep errors, cutoffs, and partial completion visible instead of silently rerunning or dropping unfavorable results.
- Add checkpoints and resume from saved jobs. Current pause/resume controls need not imply persistence across a closed page or process; durable recovery is a separate feature.
- Bound report memory, stream large exports where appropriate, and document throughput measured on the actual test machine.
- Optionally add a small deterministic CI regression batch and archive its reports. Larger balance runs remain deliberate experiments with a specified hypothesis and budget.

**Gate:** one-worker and multi-worker runs produce identical ordered result records; interrupted jobs resume without omissions or duplicates; merged aggregates equal a fresh complete run; and failure reporting survives checkpoint recovery.

This roadmap does not create scheduled runs, monitors, or recurring automations. Those would require a separate request and an explicit run policy.

## Sprint 8 ownership boundary

Collection progression applies to human Play. The AI, Node simulator, Worker and offline fallback use the complete legal pool without opening packs, charging Credits or awarding mastery. An incomplete owned collection never alters a simulation deck or result. No new large campaign is authorized. See [Sprint 8](SPRINT-008.md#exact-simulation-request-for-ryken--not-executed) for the exact separately authorized follow-up request.
