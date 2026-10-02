# Shared rules audit

Live matches, headless runs, browser Workers and direct-file cooperative simulations use the same `engine.js`. `withData` closes over a validated balance profile. There is no second simulator interpretation of combat, territory or Presence. Animation observes authoritative transitions and cannot decide outcomes. Explicit custom lists enter `createGame` through the same deck validator used by the Arsenal.

| Concern | Authoritative behavior and verification |
| --- | --- |
| Draw and hand | Configured opening draw plus own-turn draw; no hand cap. Empty decks recycle actual discards/casualties; fully empty supply skips draws. Seeded shuffles and conservation checked. |
| Presence | Available = capacity − permanent commitment − temporary spending. Capped own-turn growth; Orders remain spent until their owner's next offensive turn. Death/Reclaim immediately release commitment, not extra currency. Affordability and constrained legal targets checked. |
| Deploy/move | Owned territory, friendly positions, unique Leader singleton and affordability. Ready adjacent movement, Mobile first free readiness move, stranded-unit fallback and Rush deployment-turn attack restrictions checked. |
| Combat | Same-territory target, one response and optional counter; Guard/Precision legality; simultaneous health damage, persistent wounds and lethal removal; Shield/Fortify, early Ambush, Retreat and Counter ordering checked. Effective health damage is separately capped; raw engine damage can include overkill. |
| Passives | Precombat Berserk/Command, owned-ground combat-only Fortify, start-turn Medic and new exact Retaliate/Scavenge/Sabotage rules covered. Suppression clears before owner passives. |
| Objective | Ending offensive player alone contributes printed surviving commitment, even amid enemies. At threshold, progress resets, objective shifts one adjacent, capacity-limited oldest-first non-asset Breakthrough preserves wounds/readiness. Ownership changes and owned-ground resecuring reported separately. |
| End round | No separate round phase exists. Analytics use offensive turns/end-turn samples and label them accordingly. No fabricated round trigger or fatigue damage. |
| Victory/ties | Enemy-home capture or configured territory count. Normal actions stop after conquest. No rule-based tie state. Turn/decision safeguards are unresolved cutoffs, never inferred wins, losses or ties. |
| AI | Legal-action enumeration and immutable dispatch shared with humans. Baseline action decisions reproduce the frozen heuristic; other policies remain deterministic and ignore hidden enemy hand/deck identities. Deck AI reads its own declared strategy, not future reserve order. |
| Reproduction | Seed, explicit lists, balance/rules/AI/telemetry versions and definitions recorded. Replays refuse incompatible current definitions. Local deck edits cannot change exported lists. |

Before expansion, instrumented 1,000-match seed 1009 outcomes matched every original canonical match record. Telemetry-on/off transitions are deeply equal and preserve seeded draws. Full legal-action, reaction, economy, immutability, conservation and randomized configuration tests remain in the suite. Browser tests compare Worker, Node and file runners with identical explicit deck lists.

There are no rules simplifications for fast simulation. Presentation delays, artwork, sound and private-human handoff screens are omitted from AI batches. Pair/card associations are descriptive; they cannot prove human card strength or when a human decided a match was inevitable.
