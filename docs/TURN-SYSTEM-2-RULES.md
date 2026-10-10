# Turn System 2.0 — authoritative v1.3.0 rules

Specification approved for implementation on 2026-10-09, before runtime migration. Baseline: released v1.2.0, commit `0622bec95175f2204a3eb1b54e6b7c95a9dab07e`. This changes timing, not printed card numbers, deck composition, economy or initiative balance. Historical profiles through `sprint12` retain their original action-window timing. The new default profile is `sprint15`.

## Canonical clock and state

`turnSystemVersion: 2` and `stateSchemaVersion: 2` identify paired timing. `turn` starts at 1 and counts full pairs. `window` is 0 (FIRST) or 1 (SECOND). `windowIndex` starts at 1, increases only when a normal Action Window begins, and is never inferred from old turn parity. `initiativePlayer` is seat 0, fixed throughout the match. `activePlayer` is the owner of the current normal window; `attacker` remains an explicitly synchronized compatibility alias. `phase` is one of `TURN_START`, `ACTION_WINDOW`, `RESPONSE`, `COUNTER`, `WINDOW_END`, `TURN_END`, `MATCH_END`.

`lastCompletedWindow` and `lastResolvedTurn` are serializable resolution markers. Personal `players[].actionWindows` counts that player's starts. Historical `players[].turns` remains an alias for this personal window count because growth and match-reward eligibility use it. It never means paired Turns.

The deterministic sequence is:

```
TURN_START → first WINDOW_START → ACTION_WINDOW
→ first WINDOW_END → second WINDOW_START → ACTION_WINDOW
→ second WINDOW_END → TURN_END → TURN_START of Turn N+1
```

Window Start is a structured event and runs inside the state machine's normal-window entry. A legal attack nests `RESPONSE → COUNTER → ACTION_WINDOW`. Nested reactions retain the initiating `turn`, `window`, `windowIndex` and `activePlayer`; they do not draw, grow, refresh or advance either clock. Passing is a normal response/counter action, not a normal-window end. The existing serialized action name `endTurn` is retained as an API alias for **End Action Window**; its wire spelling is not a rules definition.

Window End and Turn End execute atomically within one authoritative dispatch. Their phases and boundaries appear in structured events. A committed snapshot is before or after that transaction, never a partly applied Turn End. Resume/reconnect restores the exact committed snapshot and markers without calling window-start or turn-end hooks again. Sequence numbers and state hashes reject duplicate network transactions. Victory enters `MATCH_END`, resolves the completed Turn's required cleanup, and prevents another Turn, draw or refresh.

## Personal Action Window resources

At that player's Window Start, in existing order: expire owner-start statuses; grow that player's Capacity after their first personal window; increment their personal window count; reset their spent temporary Presence and Command Actions; refresh their units; resolve own Commander start hooks, Mark/Reinforce/Sabotage cleanup and Medic healing; draw that player's normal cards. The other player is untouched. Existing opening hands and first-window draw are preserved. A player does not receive two refreshes during a pair, and the second player does not draw or grow early.

Each normal window has the existing full Command Actions budget. No shared budget spans the pair. Deployment sickness, attacked/defended/ability/movement eligibility use explicit window stamps where tied to a personal opportunity. Paired `deployedTurn` is retained alongside `deployedWindow`; a first-window deployment does not become old merely because the second window starts. Rush, Mobile, Rally and Overwatch keep their existing numeric effects and owner-window readiness rules.

## Territory resolution and forecast

Capture occurs **only after both normal windows**, using the surviving authoritative battlefield. No progress or ownership changes merely because FIRST ends.

At Turn End, snapshot the current contested objective and each player's eligible pressure `P0` and `P1`: printed Presence of surviving units/assets on that objective, plus the existing valid Commander/tactical pressure bonuses. A tactical pressure bonus requires a surviving friendly permanent on the objective. Breaker's existing bonus still requires a surviving eligible Rush/Mobile unit.

The chosen smallest unambiguous simultaneous rule is **net surviving pressure**:

```
gain[0] = max(0, P0 - P1)
gain[1] = max(0, P1 - P0)
progress[p] += gain[p]  // once, at Turn End
```

Equal pressure adds zero. Existing stored progress persists when contested or outpressured; a capture resets both players' progress exactly as before. Only the positive-pressure leader can cross the threshold during this resolution. There is at most one capture of the snapshotted objective per Turn; no sequential first-seat evaluation or capture of the next objective in the same Turn. Threshold values are unchanged.

After threshold crossing, use the existing capture pipeline: change ownership; evacuate enemy permanents to legal adjacent rear slots or destroy them with forced-retreat provenance when no slot exists; preserve contiguous control; advance the objective; resolve legal Breakthrough movement; check home/territorial victory before starting another Turn. Assets cannot use unit-only voluntary Breakthrough. Turn-End pressure expires after it has participated in this one resolution.

This replaces old gross pressure from one player's end-window with one fair simultaneous net-pressure event. It is an intentional timing-rule change, not a numeric balance patch. Its competitive effect requires owner-reviewed evidence later.

`captureOutlook(state)` is the shared engine forecast for UI and AI: current pressure for both seats, net gains, accumulated projected progress, current leader, potential threshold crossing and whether the opponent's normal window is pending. FIRST always says **Opponent still has an Action Window before resolution**; it cannot promise capture. SECOND shows **Final-current projection**, still dependent on surviving forces when ended. AI must not treat first-window forecast as a guaranteed capture or win.

## Durations and budgets

Durations explicitly record the owning player and a window or paired-Turn expiry basis. They never compare a paired Turn to a legacy window threshold.

| Effect | v1.3.0 lifetime |
| --- | --- |
| Cover, Dodge, Exposed, Smoke, Overwatch | Until the owner's next Window Start, or earlier when consumed/removed. A recipient's next window can be SECOND in the same Turn. |
| Suppression | Through the owner's next normal window, expiring at its Window End; preserves one affected opportunity. |
| Mark, Reinforce, Sabotage | Existing owner-specific Window Start cleanup; Mark charges may be consumed earlier. |
| Hold Fast pressure | Until the current true Turn End, after pressure resolution. Extending FIRST's pressure across SECOND is necessary for its existing purpose. |
| Window-bound Attack boosts, Commander active Rally/Breach bonuses | End of the activating owner's current normal window. |
| Marshal successful-defense passive bonus | End of that owner's next normal window; active Rally has its separate current-window expiry. |
| Concealed | Persistent until its defined attack/reveal/removal trigger. |
| Ambush/readiness/deployment state | Existing event triggers and explicit normal-window stamps; never a global pair refresh. |
| Tactical Assets | Persistent until destroyed/removed, with any attached status following its explicit duration. |
| Commander active use | Once per match, unchanged. |
| First Order/deploy/Sabotage/move Commander passive gates | Once per own Action Window, using `passiveWindow`. |
| Scavenge + Nothing Wasted | **One shared eligible casualty draw per player per paired Turn**, using `scavengedTurn`. |

Sacrifice and allied-effect destruction remain ineligible for casualty draws. Destruction provenance, reclaim wounds, reserve exhaustion and no-infinite-value-loop restrictions survive. Shared casualty budget naturally becomes available on a new paired Turn; reconnect never resets it. Reactive abilities and Commander passives are event-triggered inside the current normal window and inherit its clock.

Every printed-card migration and all ten Commander classifications are enumerated in `TURN-SYSTEM-2-CARD-MIGRATION.md`. Historical source definitions remain frozen; the new profile supplies truthful current text.

## Events, online compatibility and replay

New event/log context includes paired `turn`, `window`, `windowIndex`, `activePlayer`, `initiativePlayer`, `phase`, and response participants/stage when present. Explicit boundary events include `turnStarted`, `windowStarted`, `windowEnded`, `turnEndBegin`, `turnEndComplete`, pressure/capture/retreat/Breakthrough and duration-expiry events. Presentation text is not the authoritative ledger.

Online peers compare app/rules/card fingerprints plus timing model and state schema. v1.2.0 and v1.3.0 cannot start a compatible match. The generic Cloudflare transport protocol stays version 1 and the existing endpoint/relay implementation is preserved; gameplay compatibility is separately versioned. The host alone dispatches and advances the clock. Public projections serialize every timing field and status/budget stamp while preserving hidden hands, reserve order and transport capabilities. Rematches retain the existing between-match starting-seat swap, with canonical seat 0 first each Turn.

Paired replays use schema 2 and explicit timing context. Legacy schema 1 remains labeled action-window timing and is only replayed with a compatible rules/build fingerprint. No divide-by-two migration of old active matches or reports is permitted. Local collection, prestige, reward and deck schemas are unchanged; old local match-history entries are labeled Action Windows.

## War Room and validation policy

New reports version their telemetry/simulator schema and name both `turns` (paired) and `actionWindows` (normal starts), plus completed boundary counters. Per-window economic samples and personal eligibility stay per window. Territory/comeback samples occur at true Turn End. Historical report `turns` stays action-window length. Comparisons across timing models warn and omit meaningless Turn deltas, while explicit window counts can be compared.

Correctness cutoffs are explicit: paired default 120 Turns with a 240-Action-Window budget; historical default 240 old windows. The eventual owner comparative configuration must equalize work using Action Windows and paired starting seats, retaining rules/build identity. This sprint executes only deterministic fixtures and bounded correctness matches. **No 1,000+ simulation, tuning campaign or publication is authorized by this brief.**
