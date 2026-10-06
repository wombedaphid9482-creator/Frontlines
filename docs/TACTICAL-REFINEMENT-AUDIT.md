# Tactical Arsenal refinement audit — v1.0.5

The 155 card definitions, 35 built-in decks, ten Commander definitions, numerical costs/stats and capture configuration are unchanged from the frozen completed v1.0.4 build. No new cards or keywords were needed. The rules audit found documentation and AI forecast defects; it did not justify a gameplay timing rewrite or speculative numeric rebalance.

| System | Verified behavior / practical counterplay |
| --- | --- |
| Cover / Breach | One direct-hit reduction charge, owner-start expiry, nonstacking refresh. Initiated Breach strips it; return fire does not inherit Breach. Asset bonus requires printed permission. |
| Blast | Stable numeric UID targets, printed cap, simultaneous wounds before casualties. Bypasses defenses without spending their charges. Spreading troops answers it. |
| Dodge / Exposed / Mark | Dodge deterministically avoids a qualifying hit. Mark/Precision bypass and consume it. Exposed removes Cover/Dodge and adds one direct-hit bonus. Mark alone leaves Cover intact. |
| Suppression | −1 Attack, no voluntary movement through target's next window end. Traits, fighting in place and legal abilities remain. Forced retreat still works. Killing the source does not cancel an applied status. |
| Overwatch / traps | Paid readiness/command preparation, one voluntary-entry shot, source UID ordering, stops on entrant death. Newly deployed sources need Rush. Mine self-destruction is rules resolution. |
| Smoke | Local direct-hit protection and blocked Overwatch; blocked shots keep their charges. Owner-start expiry; Blast bypasses. No hidden untargetability. |
| Sacrifice / destruction | All cost/target checks precede mutation; confirmation can cancel. Real source loss, explicit provenance, no enemy kill/casualty draw/refund beyond freed commitment. |
| Rogue recovery | Scavenge/Nothing Wasted share one draw budget per player/window. Reclaim and redeployment retain wounds. No multiplication across simultaneous deaths or salvage sources. |
| Commanders | Direct damage observes defenses, voluntary relocation observes Suppression/entry reactions, healing resolves in printed order. One-use flags and passive timing survive JSON. No Commander numbers changed. |
| Territorial flow | Capture maintains contiguous ownership, stable displacement into friendly slots, elimination when no retreat is possible, then legal Breakthrough. Forced motion is distinct from voluntary Overwatch entry. |
| Setup/payoff tools | Hold Fast needs a real prior defense; Break the Position and Expose the Opening require their printed board conditions. Clean Exit retains wounds and attack lock. No extra attacks manufactured by ready effects. |

Evidence: unchanged Sprint 11 mechanic/Commander/provenance regression cases; [current replay tests](../tests/sprint12-replay.test.js) compare every step of all six exercises against the frozen-profile engine; [public AI cases](../tests/sprint12-refinement.test.js); actual browser targeting, cancellation, status stacks and expiry in `test-results/sprint12-tactical-browser.json`. Readability keeps named badges, target highlights, public previews, duration tooltips and consumed/expired log events. Color is supplementary.

Three policy repairs are isolated to `arsenalRefinement`: canonical public Mark/Exposed projections and legal paid follow-ups; rejection of unreachable rear Overwatch; repair survival credit only when a visible lethal exchange becomes survivable. Sacrifice still prices the lost piece. All forty tactical cards are evaluated with concealed enemy hand/deck/RNG getters that throw if read, at all four difficulties. Historical Sprint 11 decisions remain exact.

Balance remains provisional. No faction, Commander, deck or card win-rate claims are inferred from these correctness fixtures. Human review and the owner's proposed paired matrix are the next evidence gate.
