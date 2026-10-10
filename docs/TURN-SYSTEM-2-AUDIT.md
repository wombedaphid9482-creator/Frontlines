# Turn System 2.0 — pre-migration timing audit

Audited 2026-10-09 against v1.2.0 commit `0622bec95175f2204a3eb1b54e6b7c95a9dab07e`, before changing engine behavior. Entry suite: **590 passing, zero failed/skipped**. `scripts/start-sprint15-checkpoint.js` verified all 242 packaged runtime source hashes and released artifacts, then froze source/rules/economy/decks/art in `docs/balance/sprint15-v1.2.0-baseline/`. The released source ZIP and installer remain intact. The project-wide search is recorded in `test-results/sprint15-full-timing-audit.txt`; the UI inventory is `test-results/sprint15-ui-timing-audit.txt`.

Classification: **A** Turn Start, **B** Action Window Start, **C** nested Response/Counter, **D** Action Window End, **E** Turn End, **F** match/once per match, **G** historical/legacy serialization only. Combined classifications mean a consumer observes several explicit boundaries, not an unspecified trigger. Implementation decisions are in `TURN-SYSTEM-2-RULES.md`.

## Engine, rules and all card/Commander fields

| Field or trigger / current consumer | Class | Migration decision |
| --- | --- | --- |
| `state.turn`, `startTurn`, `endTurn` | A/B/D/E/G | Split actual paired clock from normal-window entry/end; old action spelling remains alias. Historical profiles keep old behavior. |
| `state.attacker`, `getActor`, `response.stage/attacker/responder` | B/C | Explicit normal `activePlayer`, nested actor separate; synchronize attacker alias. Response/Counter never advances clock. |
| New `window`, `windowIndex`, `initiativePlayer`, `phase`, boundary markers | A/B/C/D/E/F | Serializable canonical state, fixed initiative and once-only atomic boundaries. |
| Opening hand, RNG, `nextUid`, `seed`, starting decks | F | Match setup once. Retain deterministic RNG and all 35 presets. |
| `players.turns`, `stats.turns` | B/G | Personal window counts for growth/eligibility; retain alias with explicit `actionWindows`. Do not reinterpret as paired Turns. |
| Capacity growth, `spent=0`, temporary Presence cleanup, `actionsLeft` reset | B | Only the entering normal-window player. No global resource pool or advance-time redraw. |
| Normal draw / reserve exhaustion / reshuffle | B/F | Own-window draw only; opening draw remains once at match setup. |
| Readiness, Mark/Reinforce expiry, Sabotage cleanup, Medic healing, Warden hook | B | Existing own-window cadence, explicit duration owner and stamps. |
| `deployedTurn` | B/G | Paired stamp plus `deployedWindow`; deployment sickness must not disappear at SECOND. |
| `movedTurn`, `attackedTurn`, `defendedTurn`, `abilityTurn` | B/C/D/G | Add explicit window stamps for Mobile, Rally, abilities, defense and Clean Exit. Hold Fast refers to previous enemy window, not paired Turn minus one. |
| Commander `passiveTurn` first Order/move/deploy/Sabotage gates | B/F/G | Use own `passiveWindow`; retain paired stamp for event diagnostics. |
| Marshal defensive reaction bonus and active Rally; Breaker Breach | C/D | Separate expiry of next owner window (passive) and current owner window (active). |
| Commander `used`, active cost/action spend | F/B | Once per match and personal normal action budget. No stat/cost change. |
| Breaker pressure passive | E | Surviving eligible frontline force at true Turn End, never immediate first-window capture. |
| `players.scavengedTurn`, Scavenge, Nothing Wasted | C/E/F | Shared eligible draw once per paired Turn; provenance and Sacrifice exclusions remain. |
| `capturePressure`, `territory.progress`, `stats.presenceGenerated`, `capture` | E | Snapshot both surviving pressures, add only positive net once, at most one objective capture. |
| Forced retreat/destruction, no-slot fallback, Breakthrough, `contested`, winner | E/F | Existing post-capture pipeline once before next Turn; preserve contiguous control and no stranded forces. |
| Tactical `startedTurn`, `expires.afterTurn/player/timing` | B/C/D/E/G | Explicit applied window/owner duration; no comparing paired Turn to legacy expiry threshold. |
| Cover/Dodge/Exposed/Smoke/Overwatch | B/C | Owner's next Window Start or consume-on-trigger; retain entry-trigger rules and asset/source ordering. |
| Suppression | D | Owner's next Window End, including SECOND of same pair when applicable. |
| Hold Fast pressure | E | True Turn-End expiry; extend FIRST bonus across SECOND so it can affect capture. |
| Attack boosts | D | Current owner-window expiry. |
| Concealed, Ambush, Momentum-related readiness / tactical Assets | B/C/F | Explicit event/window stamps or persistent until removed; no generic pair-wide refresh. |
| `assertInvariants`, legal action validation, serialization/clone | A–F | Require consistent clock/phase/stamp bounds; invalid dispatch cannot mutate any counter. |
| Numeric card/cost/health/attack/Commander definitions | F | Frozen: no competitive numeric tuning. |
| All 155 card rules text and ten Commander rules | B/C/D/E/F/G | Full BEFORE/AFTER and exact timing reason in `TURN-SYSTEM-2-CARD-MIGRATION.md`; current profile only. |

## AI, simulator, analytics and telemetry

| Field or trigger / consumer | Class | Migration decision |
| --- | --- | --- |
| AI active actor, response/counter planning | B/C | Carry complete normal-window context; nested actor never becomes a normal-window start. |
| AI end-window/capture/reachesCapture/lethal scoring | D/E | FIRST forecast provisional; use shared engine net-pressure outlook. SECOND estimates current surviving board. |
| AI public-position/shadow-action copies and deterministic tie-breaking | B/C/F | Include canonical fields/window stamps. Preserve hidden-card privacy and bounded planning without unknown draws. |
| AI personal `players.turns` early-window discount | B/G | Keep personal window cadence. |
| AI Overwatch/Mark/Reinforce/Sabotage/Commander timing value | B/C/D/E | Owner-window expiry and paired casualty budget; no stat cheats. |
| Simulator `opportunityTurn`, telemetry opportunity key | B/G | Window identity plus actor, not paired Turn alone. |
| Draw/play turn sums, survival/exposure fields | B/E/G | Paired values in new schema plus explicit window sums; old reports stay old units. |
| `endTurn` economy/unused-command/hand/unit observations | D/G | Continue per-window; truthful explicit aliases for legacy field names. |
| Four deployment-window and six-window early-game observations | B/D/G | Keep windowIndex thresholds, not doubled paired-Turn horizons. |
| Territory samples, capture timing, comeback/lead/hold metrics | E | Authoritative Turn-End sample only. Include paired and window event context. |
| `maxTurns`, cutoffReason, distributions/average/median/P95 | F/G | Version model/units; paired Turns and Action Windows separately, explicit equal-work cutoff. |
| Simulator/telemetry versions, report schema, match summary | F/G | New paired schema 2; legacy schema 1 not relabeled. |
| `analytics.compare`, report tables / War Room labels | F/G | Warn on timing mismatch; suppress incompatible Turn deltas, compare known window counts. |
| Replay exports / `replayMatch` guards and ledger | F/G | Schema 2 canonical action context, fingerprints; legacy reconstruction only with compatible build/rules. |

## UI, tutorial, manual and network

The detailed source locations, preservation notes and affected UI tests are in `TURN-SYSTEM-2-UI-AUDIT.md`. Its full mapping is part of this pre-migration audit. The canonical decisions are:

| Field or trigger / consumer | Class | Migration decision |
| --- | --- | --- |
| HUD, main action control, actor/guidance/privacy handover | B/C/D/E | TURN + FIRST/SECOND + owner Action Window; **End Action Window**; nested Response/Counter distinct. |
| Pressure/objective preview and tooltip | E | Shared capture outlook; FIRST explicitly says opponent still acts; no early captured claim. |
| Unit/status/Commander hints and Field Manual | B/C/D/E/F | Truthful per-owner windows vs paired Turns, including casualty budget. |
| Log/activity history/actions/text exports | A–F/G | Explicit turn/window/phase context; preserve legacy saved summaries with legacy labels. |
| Deferred FX `pending.seed/pending.turn`, transition detection | B/C/D/E | Include windowIndex to distinguish handover inside same Turn; Turn-End cue from structured events. |
| Tutorial lessons 5/6/9/10 and tactical training | B/C/D/E | Demonstrate both windows on one Turn before capture; preserve 14 lessons, Commander education and inventory. |
| Tutorial/save progress and reward `ownTurns` gate | F/G/B | Additive progress; no duplicate rewards; ownTurns remains personal window count. |
| Recent human/private summaries and playtest report schema | F/G | New timing model/window count; old reports retain action-window interpretation. |
| Public state projection, status/Commander/unit whitelists | A–F | Serialize complete canonical timing, not hidden opponent cards/deck order/capabilities. |
| Public event/log whitelists | A–F | Include boundary events and exact normal/reaction context with existing privacy rules. |
| Gameplay compatibility vs relay transport | F/G | Explicit timing/schema/gameplay fingerprints reject v1.2 peers; preserve public relay protocol1/backend. |
| Host session action/intent/response/result sequence/hash | B/C/D/E/F | Only host advances; atomic boundary snapshots; duplicate sequence rejected; results show Turns + windows. |
| Reconnect/resync snapshots, controller diagnostics | A–F | Restore exact state/budgets/phase; never replay start/end hooks. Diagnostics remain secret-free. |
| Rematch starting-seat switch | F | Existing between-match seat alternation only; no per-Turn initiative redesign. |
| Collection/deck/mastery/cosmetic/economy saves | F/G | Schemas, grants and numbers unchanged; preservation tests cover bytes and numeric values. |
| Runtime artwork, 5:7 frames, viewport/native fullscreen | F | Frozen assets; HUD adaptation must preserve no-routine-page-scroll and scaling. |

## Migration gate and validation

This audit and the rules specification exist before the implementation go-ahead. Work is divided into engine/cards/Commanders, AI/reporting, UI/tutorial and host protocol/release verification. Every runtime consumer above must use the new profile's explicit context; historical fixtures are retained under their historical profile rather than rewriting historical evidence.

Required verification: deterministic state/resource/status/casualty/ten-Commander/card fixtures, invalid-action immutability, territory/forced-retreat/Breakthrough/victory, replay equality, privacy/compatibility/reconnect/duplicate handling, bounded correctness AI matches, offline modes, tutorial, native two-client public relay, and viewport/art/prestige checks. No autonomous large balance run or publication. Owner-run comparative validation will be prepared after the candidate is stable.
