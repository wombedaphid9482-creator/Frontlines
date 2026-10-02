# Simulator action roadmap

The **v0.6.0 War Room** is the player-facing AI-versus-AI screen inside Frontlines. Its **Advanced Lab** retains the full developer Balance Lab. Dedicated launchers remain supported. Delivered: prominent Quick Matchup/Tournament/Faction Overview/Advanced commands, bounded result tabs, persistent Run/Pause/Stop, deterministic policies, exact saved-deck snapshots, round robin, faction/deck/archetype/seat statistics, curves, pair associations, diagnostics, comparison and HTML/JSON/CSV export. The shared authoritative engine remains unchanged by presentation.

## Owner access and UI requirements — implemented

Owner feedback recorded October 1, 2026, with Balance Lab access corrected October 2, 2026, is reflected in Sprint 5.

- War Room is accessible through the central game menu and Arsenal's Test command. Players can test their own decks without admin access; the earlier removal request is canceled.
- Large landing commands and the fixed simulation command bar make primary actions easy to find. Setup and result content scroll inside bounded panels; smaller browser windows offer Setup/Results panel switches.
- Engineering profiles, AI choices, seeds, safeguards, diagnostic thresholds, confidence intervals, traces and comparison stay available through Advanced rather than dominating the initial player view.

## Next simulator action plan

1. **Validate competitive stabilization.** Start from the preserved current-Arsenal 50,000-match baseline, not older starter percentages. Targeted 10,000-match hypotheses precede the final 50,000-match gate: every faction 45–55% against other factions, preferred spread at most 5 percentage points, and viable archetypes with reviewed extreme pairings. Use `byFactionCross` for this gate; `byFaction` preserves all appearances and same-faction deck tests separately. Baseline Nightwalker 66.138% / Rogue 32.472% cross-faction rates fail (all appearances: 64.346% / 34.419%). Final current-profile results remain pending until recorded.
2. **Diagnose before tuning.** Investigate rule bugs, AI sequencing, single-card outliers and combinations before broad faction changes. Use Silent Blade's actual draws, repeated plays, efficiency, kills, deployment timing, tactical priority and matchup context. Gate: control-versus-variant outcomes and censored observations are explicit; raw winning-card associations are not causal conclusions.
3. **Human deck experiments and controlled campaigns.** Use identical versions/seeds/opponent pools for one revision, keep reports immutable, and compare both deck rates and gameplay behavior. Gate: humans confirm useful choices and counterplay; the War Room remains understandable while Advanced retains full provenance.
4. **Scenario fixtures and bounded AI refinement.** Add public-position tests for pressure, salvage, defense conversion and responses; improve the relevant policy only with evidence. Gate: legal deterministic actions and hidden-information independence hold, and live/Worker/Node/offline results agree.
5. **Pair/usage exploration and durable jobs.** Add exposure-aware heatmaps or persistent resumable batches after competitive/human validation. Gate: biases, sample sizes and partial completion remain visible; correlation never automatically nerfs a card, and a reloaded job cannot omit or duplicate records.

The previous staged plan below is retained as historical context. Shared registry/deck support, report comparison and the integrated player interface are implemented; deeper resumable-job and causal-analysis work remains future scope.

Each phase below has a concrete acceptance gate and no calendar commitment. See [simulator usage](SIMULATOR.md) for the delivered interface and metric definitions.

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
