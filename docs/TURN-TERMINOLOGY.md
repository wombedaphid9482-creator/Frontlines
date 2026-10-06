# Action windows and the future paired turn

The current `state.turn` counts **global offensive action windows**. P1 window 1 → P2 window 2 → P1 window 3. A combat Response or Counter belongs to the attacker's window and does not increment this counter. Capture and forced displacement resolve at each window end; readiness, Order refresh, draws, growth, Medic/Commander start triggers and most status expiry occur at the next owner's window start.

v1.0.5 safely labels the live HUD, capture forecast, End window control, victory counter, log prefixes, tutorial and advanced practice with action-window wording. Field Leaders are deployable cards; Commanders are the separate off-lane choice. Legacy printed “turn” text and serialized `turn`/`endTurn` intent IDs remain compatible. Exported historical `turns` metrics count windows.

Ryken's intended future model is Turn 6 → P1 action window → P2 action window → end-of-turn resolution. Moving capture or growth to a paired resolution would change initiative, capture race, displacement, status duration, salvage budgets, Commander passives and AI planning. Merely halving the display would misleadingly label first-window captures as end-of-turn events.

The next timing sprint must introduce separate turn/window counters and specify initiative order; migration for start/end expiries and deployed/moved/attacked/defended/passive fields; once-per-window versus once-per-paired-turn casualty budgets; simultaneous/ordered capture resolution; reserve/readiness/growth timing; tutorial fixtures; replay schema and explicit rules-version negotiation; simulator cutoffs and telemetry labels. Compare the frozen rules with paired timing using owner-authorized data before switching competitive defaults. This timing rewrite is deferred.
