# Sprint 10 — traceable v1.0.3 balance change log

Baseline: stable v1.0.2 viewport candidate, frozen before edits at [sprint10-v1.0.2-baseline](sprint10-v1.0.2-baseline/). Supplied evidence is **interim 46,679 / 100,000**, not a final campaign. The report contains 46,402 decisive matches, 277 cutoffs and zero reported errors. No large post-patch campaign was run. Correctness fixtures do not establish competitive balance.

Final v1.0.3 candidate: [Windows installer](../../release/1.0.3/Frontlines-Setup-1.0.3.exe), [release guide](../RELEASE-1.0.3.md), [release manifest and exact hashes](../release-1.0.3-manifest.json). The tested package matches all 95 runtime source files; the release is local and uncommitted.

## R1 — one shared Rogue casualty dividend

- **BEFORE:** `destroy()` removed the unit, appended it to recyclable discard and released printed commitment. Nothing Wasted independently drew once per player/global initiative using `commander.passiveTurn`; surviving nearby Scavenge independently drew once using `scavengedTurn`. The same casualty could draw two cards, including the casualty itself through normal recycling.
- **AFTER:** under `RULES.salvageRecovery`, both use a single player/global-turn allowance. A surviving, unsuppressed nearby Scavenge source gets the one trigger; the Commander supplies fallback salvage. Both limits are consumed when applicable. Every new global offensive turn gives a fresh allowance to each player. Historical profiles retain their independent budgets.
- **WHY:** remove the verified double dividend without weakening every Rogue unit or deleting its salvage identity. More Scavenge sources do not increase the allowance.
- **DATA:** interim Rogue 95.4%, Scavenger list 97.6%, Scavenger foundation 88.1%; verified engine lifecycle and deterministic source/Commander ordering, repeated-casualty and simultaneous-death cases. These rates motivate the audit, not a causal estimate of this fix.
- **INTENDED BEHAVIOR:** losses offer a limited replacement option while destroying Rogue troops still removes an army and its active presence. A routed/dead source cannot manufacture cards before removal.

## R2 — Reclaim recovers the card and commitment, not health

- **BEFORE:** Pull Back and Ghost Extraction returned only `uid/cardId`; deployment created the unit with zero damage. Wounded units could repeatedly reclaim and redeploy at full health. Pull Back is 1 Capacity and zero Command Actions in the separated economy.
- **AFTER:** returned hand cards retain damage; redeployment consumes that wound value. The same card and full printed commitment return as before; ordinary Order spending and printed deployment costs remain. Temporary battlefield statuses do not follow the card. Fresh reserve draws and Recover the Fallen remain ordinary healthy cards.
- **WHY:** separate tactical withdrawal from actual healing while keeping Rogue's adaptable recovery fantasy and normal resource lifecycle.
- **DATA:** verified `resolveOrder(reclaim)` → hand → `dispatch(deploy)` zero-damage reset; interim dominance across several Rogue lists. No claim that reclaim alone explains the matrix.
- **INTENDED BEHAVIOR:** salvage an endangered investment or open a slot, then choose when/where to re-enter with its existing wounds. Heal through Medic/Reinforce/healing Orders rather than a free health reset. Same rule applies to Nightwalker extraction.

## Text and Commander changes

| Entry | BEFORE | AFTER | WHY / DATA / INTENDED BEHAVIOR |
| --- | --- | --- | --- |
| `rogue_reclaim` — Pull Back | Return to hand, removing wounds and freeing commitment | Return to hand, retain wounds through redeployment, free commitment | R2; communicate the actual transaction without changing printed costs/stats |
| `nightwalker_ghost_extraction` — Ghost Extraction | Return to hand, clearing wounds; redeploy at printed costs | Retain wounds; redeploy at printed costs | R2; generic reclaim remains consistent across factions |
| Scavenge glossary | Independent unit-only draw cap | One draw/player/global turn shared with Nothing Wasted; surviving local source first | R1; explain stacking and simultaneous-casualty restrictions |
| `commander_rogue_scavenger` — Nothing Wasted | First casualty may also trigger independent Scavenge draw | Shared budget, Commander fallback | R1; reward salvage without a double dividend |
| Scavenger synergy hint / historical catalog | Hint described an additional draw source; one catalog text | Shared coverage hint; `forRules()` supplies original historical passive text when flag is absent | R1; avoid implying stacking or rewriting old rule history |

**No gameplay card changes to Presence, Attack, Health, traits, effect amounts or Command Action costs. No change to Recover the Fallen or either Drifter mechanic. No changes to other Commander mechanics.** Seven Scavenge-bearing card definitions keep their existing once-per-player/global-turn wording; the shared glossary and Commander text clarify the newly shared allowance.

## D1 — Stonewall Fortified Advance

- **BEFORE:** included one more Plate Medic and one more Advance Marshal, both command-dependent pieces.
- **AFTER:** remove 1 `stonewall_plate_medic`, 1 `stonewall_advance_marshal`; add 2 `stonewall_escort`. Preserve 26 cards and the archetype/Commander.
- **WHY:** expensive defensive support must translate into forward occupation; more free-command Guard/Fortify bodies give the defense a movable line instead of spending the full command allowance establishing support.
- **DATA:** interim 25.6%; command-cost/composition audit plus tactical AI projection defects. Preset composition is one contributor, not proof of a card-power deficiency.
- **INTENDED BEHAVIOR:** establish a durable formation and advance it after stabilization without turning Stonewall into a raw aggression faction.

## D2 — Bruiser Rolling Breakthrough

- **BEFORE:** included one more Ram Team and one more deployable Assault Commander.
- **AFTER:** remove 1 `bruiser_ram_team`, 1 `bruiser_commander`; add 1 `bruiser_breacher`, 1 `bruiser_shock_runner`.
- **WHY:** reduce major-deployment command pressure; add Rush and Mobile occupation that can exploit a real follow-up attack window. A deployable Leader remains distinct from the off-lane Commander.
- **DATA:** interim 12.8%; command-curve/tempo audit and corrected AI sequencing. No raw attack/health buffs.
- **INTENDED BEHAVIOR:** commit a supported breakthrough and spend commands attacking/moving instead of repeatedly stranding an expensive setup hand. Failed attacks remain punishable.

## D3 — Syndicate Coordinated Removal

- **BEFORE:** included one more Target Designator and one more Cover Protocol.
- **AFTER:** remove 1 `syndicate_target_designator`, 1 `syndicate_cover_protocol`; add 1 `syndicate_precision_strike`, 1 `syndicate_eliminator`.
- **WHY:** retain Mark identity while supplying an independent removal action and payoff body; improve reliability when setup pieces arrive without a usable attack window.
- **DATA:** interim 21.5%; exact-cost/Mark-window AI defects and composition review.
- **INTENDED BEHAVIOR:** planned removal can operate without a perfect setup draw and can use the marked combat opportunity when it actually exists.

## D4 — Nightwalker Planned Exposure

- **BEFORE:** included one more Decoy Patrol, Shadow Handler and Night Reconnaissance.
- **AFTER:** remove 1 `nightwalker_decoy_patrol`, 1 `nightwalker_shadow_handler`, 1 `nightwalker_recon`; add 1 `nightwalker_marksman`, 1 `nightwalker_strike`, 1 `nightwalker_ambush`.
- **WHY:** reduce setup-only dependencies; support independent Precision/direct removal and a genuine response window. Improve AI timing before considering larger card buffs.
- **DATA:** interim 19.6%; sequencing and unsupported fragile-advance analysis.
- **INTENDED BEHAVIOR:** create and exploit an opening with selective attacks/responses while preserving Nightwalker's fragility and timing requirements.

## A1–A7 — verified tactical AI defects

All tactical-policy repairs below are gated by `RULES.balanceRecovery`; retained-wound forecasts follow `salvageRecovery`. Current AI version is `frontlines-ai-sprint10-v1`. Historical Sprint 9, Sprint 7 and Sprint 6 AI versions/decisions remain preserved. Shared basic scoring uses corrected pressure/wounds; faction and deck policies use the setup/occupation/recovery repairs, and Hard/Expert bounded planning uses corrected public Commander/cost projections. Easy, Normal and Learning remain legal, with their existing variation/teaching rules. The seeded random legal policy keeps its selection rule. The AI still scores engine-legal actions using visible board, own hand and public discard; it does not inspect opposing hand or reserve order.

| Change | BEFORE | AFTER | WHY | DATA | INTENDED BEHAVIOR |
| --- | --- | --- | --- | --- | --- |
| A1: Breaker / Marshal command sequencing | Could spend a once-per-match ready/burst active on the final command, leaving no attack | Requires a usable follow-up command for the non-damage signature; with two commands can sequence burst → attack | Readying/buffing should create an executable tactical action | Deterministic last-command versus two-command fixtures, `tests/sprint10-ai.test.js` | Preserve the active when it cannot change this turn's action |
| A2: Coordinator setup/payoff | Could value nonlethal Mark + direct damage with no command left to exploit it | Projects Mark and 2 direct damage into a legal same-turn hit; avoids nonlethal last-command setup; direct lethal active still allowed | Match the short Mark window and actual removal opportunity | Siege Heavy / Security Detail fixture with one versus two commands | Choose usable planned removal rather than expire the setup at enemy initiative |
| A3: exact capture forecasts | Some preservation/capture tests summed printed Presence and ignored Breaker's +2 | Uses engine `capturePressure()` consistently | Authoritative territorial pressure includes Commander bonus | Sole Rush unit completing capture through the +2 bonus | Do not reclaim/move away a force already guaranteeing capture |
| A4: effective Order costs | Setup follow-up checks assumed two remaining commands for a tactical Order, even when Quartermaster makes it free | Uses actual action cost; free Sabotage can leave the final command for an improved lethal attack; consumed discount removes that opportunity | Printed and effective costs differ under Commanders | Quartermaster free-window and already-consumed-window fixtures | Let setup-before-payoff work with the real command economy |
| A5: unsupported forward occupation | Fragile support could advance into visible lethal incoming pressure without useful payoff | Avoids unsupported lethal exposure, with exceptions for own capture, imminent enemy capture, worthwhile lethal follow-up or a supported friendly front | A faction's support should survive to perform its role | Field Medic versus Siege Heavy + visible Command aura fixture | Stonewall can establish and then advance a formation; Bruiser can exploit a real window; Nightwalker avoids needless frontal losses |
| A6: reclaim valuation | Wound count contributed free-healing value; idle rear recall could look productive | Retained wounds never count as healing; idle recall is unattractive, endangered withdrawal and a stranded asset still have resource/position value | AI must obey the repaired transaction and avoid meaningless loops | Wounded rear and endangered-field recall fixtures | Rogue pulls back for tactical reasons instead of manufacturing healthy troops |
| A7: public planning fidelity | Planning snapshots dropped Commander runtime and some temporary modifier/cost effects | Preserves public Commander/passive-turn/discard, exact spending, Ghost Armor, Drifter free move, Quartermaster free Order, Saboteur lock and Marshal surviving-defense counter; unknown draws/recoveries are not fabricated | Forecasts must represent actual rules without using hidden information | Engine/projection comparisons, hidden-information getter traps, immutable-state and bounded-planning checks | Improve all archetypes' sequencing and resource conservation without making AI omniscient |

The missing Commander runtime did **not** grant a second free Drifter move; it removed Commander effects from forecasts. This distinction prevents documenting an exploit that was not present. Correcting shared policies may change strong decks as well as weak decks. No post-patch win-rate improvement is asserted.

Eleven new AI tests plus prior focused suites passed **33/33** after the final metadata correction (`test-results/sprint10-ai-test.log`). Coverage includes 115 cards × five difficulties, ten Commanders × five difficulties, hidden-hand/reserve-order traps, deterministic public planning bounded to 35 decisions, input immutability and historical frozen-AI decision comparisons over eight steps for all five factions. These are correctness checks, not a balance campaign.

**A8 — truthful basic-policy metadata. BEFORE:** the live basic policy still claimed unchanged original Sprint 2 scoring after the recovery-aware changes. **AFTER:** under the new flag, it is labeled Basic recovery policy and describes updated capture pressure, retained wounds and Commander sequencing; explanatory decision text identifies balance-recovery rules. **WHY:** experiment labels must describe actual conditions. **DATA:** profile metadata/historical equality regression. **INTENDED BEHAVIOR:** current and historical reports identify their policy correctly. No decision score/selection changes in this metadata edit; historical labels and `BASELINE_VERSION` provenance remain preserved.

## U1–U5 — local playtest readability and opponent selection

These changes communicate existing legality and choose existing legal test lists; they do not alter action costs or targeting rules. `app.js` supplies semantic states/reasons from engine legal actions, while `presentation.css` and a small `commander-ui.css` addition represent them.

| Change | BEFORE | AFTER | WHY | DATA | INTENDED BEHAVIOR |
| --- | --- | --- | --- | --- | --- |
| U1: playable/unplayable hand cards | Affordability dimming did not represent every actual blocking rule | `data-card-state`, unavailable reason, title and `aria-disabled`; bright/elevated playable faces, readable subdued/desaturated unavailable faces; retained wounds get explicit damaged health/wound treatment | Capacity is only one legality condition; reclaim state must remain visible | Action browser fixtures and presentation assertions | Identify a usable card immediately and inspect the concrete reason another card cannot act |
| U2: legal/invalid targets | Selection relied too heavily on colored highlights | `data-target-state`; double borders/check marker/crosshair for legal territories, dashed border/diamond for legal units; invalid targets recede and click guards reject them | Shape, brightness and cursor supplement color; UI selection follows the engine | Actual legal deployment/combat/Commander targeting interactions | Know where an action can resolve without trial-and-error clicks |
| U3: Commander availability | Conditions were mostly in tooltip/reason text | Visible Ready / Spent / No Valid Target / Unaffordable, plus Wait Turn / No Command Action; semantic `data-commander-state` and accessible reason | Testers should see the active state immediately | Real Warden no-target → ready → spent and unaffordable fixtures | Understand whether to use, preserve or set up the signature command |
| U4: canonical card proportions | Enemy Inspect Deck lacked a proper bounded grid; hand/detail/art fill could distort proportions | Canonical outer 5:7 via `--card-aspect-ratio`, uniform sizing for hand/deck/detail/Arsenal; enemy tiles max 200px; atlas rendering remains square and cropped within its established window | Full card faces must retain proportions independently of container height/width | Ten browser contexts plus CSS assertions; protected art/mapping hashes | Inspect readable, consistently shaped cards without rebuilding or remapping artwork |
| U5: random legal opponents | Manual faction/Commander/deck setup for each test | `playtest-opponents.js` chooses only valid deck/faction/Commander combinations; Random Deck restricts faction and Commander; Avoid Last Opponent excludes the prior full configuration when alternatives exist and safely falls back when only one remains | Reduce setup friction for local testing without weighted matchmaking | Three seeded/legal/malformed-save/fallback unit fixtures | Quickly test decks against varied supported local AI opponents |

The opponent pool is `Decks.getDecks()` filtered by actual legality, including available built-in and legal saved test lists; normal opponent ownership restrictions are not introduced. Random Enemy switches setup to AI mode and chooses faction/deck/Commander together. Random Deck preserves the selected faction/Commander. The last opponent key records faction/deck/Commander when an AI match launches, so avoiding it refers to the previously played configuration rather than every unplayed preview.

Presentation evidence: three new Node tests passed, including byte-for-byte checks of artwork mappings, all five atlases and ten approved Commander portraits; those plus prior presentation tests passed 10/10. `tests/browser-sprint10-action-presentation.js` passed ten contexts: five hand desktop/scaled contexts, enemy deck inspection, full inspection and three Arsenal sizes. It performed real deployment/combat/Commander actions, four Commander availability states and an invalid-target immutability check, with zero completed campaign matches or runtime errors.

The final populated battlefield regression passed **13 viewport/scaling cases**, including 1920×1080, 1600×900, 1366×768 and 1280×720, with five units per side, twenty Commander variants and four conquest-warning states. All seven territories and essential controls remained accessible together; page and map required no vertical scrolling. Full hand faces retained 5:7 in every case; unusually short windows may use local hand/roster scrolling. Enemy Inspect Deck faces stay at most 200×280 and preserve the same ratio. Evidence: `test-results/viewport-hotfix-browser.json`, `test-results/sprint10-action-presentation.json`, populated 1366×768 and deck/detail screenshots. Artwork URLs, atlas quadrants, Commander portraits and mapping hashes remain unchanged.

## L1 — Balance Lab profile and experiment provenance

- **BEFORE:** live/default rules were `sprint9`; simulator metadata described the older mechanics, and saved v1.0.2 Lab settings retained that default.
- **AFTER:** live/default is `sprint10`, with separate `salvageRecovery` and `balanceRecovery` flags. Simulator snapshots record `sprint10-recovery-v1`, engine v6, AI Sprint 10 and exact shared-salvage/reclaim-wound descriptions. Saved v1.0.2 `sprint9` settings migrate to the new default; other specifically selected historical profiles remain selected.
- **WHY:** an experiment must identify its actual rules/AI/decks, and normal users should launch the new candidate rather than silently continue testing the old default.
- **DATA:** deterministic profile comparisons and two paired-seat integration matches in `tests/sprint10-profile.test.js`; frozen historical versions/text are separately verified.
- **INTENDED BEHAVIOR:** owner-run exports distinguish v1.0.2 from v1.0.3 and remain useful for comparison. Historical mechanics/deck lists are not silently patched.

Three new profile tests verify all 115 printed combat values/costs and opening defaults remain unchanged, only the two reclaim texts differ, exactly four legal 26-card presets change, all thirty pool IDs remain, and two deterministic verified integration matches complete from both seats with zero errors/cutoffs and correct provenance. These two integration cases are allowed correctness fixtures, not a numerical balance dataset.

## Final automated/browser evidence

- **334 / 334 normal automated tests passed**, zero failed/skipped/cancelled, including the final metadata-only AI regression: `test-results/sprint10-final-node.log`. Existing save/load, collection and historical-rules coverage remains. Three old expected-default/snapshot contracts were corrected to identify the intentional live `sprint10` default and profile-specific Commander text; gameplay expectations were not weakened.
- **Ten action/card presentation contexts passed:** real legal deployments/combat/Commander availability, invalid-target immutability, hand/enemy deck/detail/Arsenal proportions, protected artwork/mapping hashes.
- **Thirteen populated battlefield viewport/scaling cases passed:** all four requested desktop sizes, smaller/scaled windows, five units per side, twenty Commander variants and conquest-warning states; no routine vertical page/map scrolling. Root visual review of the 1366×768 battlefield and 1280×720 enemy deck inspection found no overlaps.
- **Random playtest setup browser passed:** actual Enemy/Deck selection, preserved faction/Commander, last-played opponent, avoidance/persistence and old Lab-default migration. `test-results/sprint10-playtest-browser.json` reports no runtime errors, complete matches or large campaigns.
- **Existing presentation browser regression passed five sizes**, including 390×844, sixteen atlas/seven symbol cards, ten distinct Commander portraits, 960ms normal deployment and authoritative immediate/clear/cancel behavior. The test-only atlas contract was updated to verify proportional square paint/cropping in its aligned window; exact assets/quadrants/SVG and symbol containment checks remain. Evidence: `test-results/sprint10-legacy-presentation-test.log` and `test-results/v102-browser-presentation.json`.
- **Full fourteen-lesson tutorial passed six sizes**, including 2560×1440 and 390×844: actual Commander passive/active/doctrine instruction, Learning victory and loss retry, progress persistence, Skip/Replay, no runtime errors. Evidence: `test-results/browser-tutorial-sprint9.json` and `test-results/sprint10-existing-tutorial.log`. Guided training is a correctness check, not a statistical balance run.
- **Two paired Node integration matches and one packaged ordinary-match smoke** were used for correctness, not competitive tuning. The native Planned Exposure versus Field Improvisation match completed in 18 turns / 108 decisions with both Commander actives used (`test-results/sprint10-native-match.log`); no balance inference is made from its winner. Guided tutorial training also passed. No large post-patch campaign was run. The exact owner-only recommendation remains in [Sprint 10](../SPRINT-010.md#exact-recommended-owner-run-validation--not-executed).
- **Final rebuilt v1.0.3 shell smoke passed again** Home/Play/Settings, tutorial deployment and Commander activation, version display, F11 fullscreen and Alt+Enter windowed return (`test-results/sprint10-native-shell.log`). All 95 runtime package files match tested source; all 31 frozen Sprint 5 files, all 39 protected art/mapping files and all 93 baseline v1.0.2 snapshot files were checked. Exact final installer/source hashes and evidence are in the [release manifest](../release-1.0.3-manifest.json).
- Source remains uncommitted at existing HEAD `f394c18b09862c064711a5581640bcb922ad8d5a`; that hash is the base checkout, not a new v1.0.3 commit.

## Scope and unresolved balance claims

The strong Assassination (72.0%), Combined Arms (68.5%) and Ghost foundation (64.9%) results remain explicit watch-list items. Changes to shared AI and the opponent environment may alter them; no stat/Commander nerf was made from aggregate correlation alone. Drifter's 60.9% foundation outcome is separate from Rogue's shared rule issue, and its free normal move/global relocation retain their exact limits and consequences.

Each player's first and second own offensive initiatives have equal Capacity, action allowance and draw count. P1 can reach capture progress first, and terminal capture ends the game before a reply. No measured causal experiment separated this structural risk from AI/deck interactions, so no arbitrary opening compensation or turn rewrite was introduced. Paired-seat post-patch validation must report this unresolved issue.

Artwork, artwork mappings, card pool size, economy, progression, online systems and tactical expansion remain outside this patch. Final populated viewport/card-ratio, native and exact package validation passed; the [release manifest](../release-1.0.3-manifest.json) records the evidence.

## Frozen v1.0.2 rules inventory

The baseline engine is `frontlines-territory-v5-commanders`, profile `sprint9-commanders-v1`, AI `frontlines-ai-sprint9-v1`, simulator 4.0.0. The new engine is `frontlines-territory-v6-salvage-recovery` only under the Sprint 10 flag. Original historical profiles keep their original versions and behavior.

| Rule boundary | Frozen v1.0.2 behavior |
| --- | --- |
| Opening/Capacity | 20 starting, +10 on later own offensive initiatives, cap 80; available = total − printed deployed commitment − temporary spending |
| Spending/release | Orders/responses/Commanders add temporary spending; own next initiative clears it. Destruction/reclaim release whole printed commitment immediately. Movement/healing do not change commitment. |
| Command Actions | 3 per offensive initiative. Exact card metadata supplies zero/one command cost. Moves/attacks usually cost 1; Drifter's first normal move costs 0; Quartermaster's first cheap paid tactical Order costs 0. Responses/counters cost 0. |
| Draw/reserves | Starting hand 5; draw 1 each own initiative. Empty deck recycles discard, with seeded shuffle and no fatigue. Both-empty supply skips draw. |
| Deployment | Controlled friendly territory, sufficient Capacity, max 5 allied slots, unique Leader restriction. Non-Rush units cannot attack during deployment initiative. |
| Normal movement | Adjacent only, friendly ground/current objective, readiness/slots enforced, no advance beyond frontline. First Mobile move preserves ready; later normal move exhausts. Drifter's free command does not bypass adjacency/readiness. |
| Drifter active | Once/match, 2 Capacity + 1 command; relocate any allied unit to friendly/current-front territory and ready it. Assets, destination slots and deployment-turn attack restrictions remain. Damage remains. |
| Combat | Same territory, attack spends 1 command/exhausts, response/counter then simultaneous damage; surviving effects use authoritative traits/temporary statuses. Destruction releases commitment and enters discard. |
| Scavenge | Surviving unsuppressed same-territory source draws once/player/global initiative; sources do not stack; dead simultaneous sources cannot trigger. Independent Nothing Wasted could draw another card. |
| Reclaim | Return same card to hand; all wounds disappear; commitment frees; Order spending remains; printed costs apply on redeployment. |
| Recover the Fallen | Once/match, 2 Capacity + 1 command; latest non-Order in discard returns to hand; removed from discard; future deployment pays printed costs and begins healthy. |
| Capture | End of offensive turn sums printed Presence of own surviving objective cards even with enemies present; Breaker adds 2 for Rush/Mobile. Threshold 25 captures, resets both progress tracks, routes defenders or destroys immobile/no-room forces, advances objective and surviving attacking units. |
| Victory | Opponent's command territory or all 7 territories; immediately locks future play, before next opposing initiative. |

Frozen AI scores only authoritative legal actions, visible board/own hand, not enemy hand or reserve order. Baseline/faction/deck/random policy choices and Easy/Normal/Hard/Expert layers remain explicit. Deck parents choose the strongest useful parent preference instead of stacking both hybrid bonuses. Intended faction priorities were already present: Stonewall defensive setup then advance; Bruiser supported breakthrough and avoiding costly failed trades; Syndicate setup then removal; Nightwalker selective timing and fragile-trade avoidance; Rogue worthwhile recovery, protected salvage sources and Mobile positioning. The Sprint 10 audit checks whether implementation actually honored these priorities.

The complete frozen card statistics/costs and thirty deck labels/lists follow. The ten original Commander passive/active definitions remain in frozen `source/commanders.js` and the baseline report profile. These tables are copied from the frozen runtime, not regenerated from the patched default.

### Frozen card values and action costs

Presence is printed Capacity cost, field commitment and capture contribution. Command is the printed Command Action cost; passives can change an effective cost.

| Card ID / name | Presence | Attack | Health | Command | Traits / Order effect |
| --- | ---: | ---: | ---: | ---: | --- |
| bruiser_ambush — Violent Reprisal | 3 | 0 | 0 | 0 | ambush 2 (response) |
| bruiser_assault — Assault Squad | 5 | 3 | 4 | 0 | rush |
| bruiser_banner — Assault Standard | 5 | 0 | 7 | 1 | command |
| bruiser_bombard — Demolition Charge | 5 | 0 | 0 | 1 | damage 5 (action) |
| bruiser_brawler — Scarred Brawler | 4 | 3 | 4 | 0 | berserk |
| bruiser_breach_caller — Breach Caller | 5 | 2 | 4 | 0 | command, rush |
| bruiser_breacher — Breach Team | 7 | 5 | 4 | 0 | rush |
| bruiser_breakthrough_gunner — Breakthrough Gunner | 8 | 4 | 4 | 1 | rush, armor |
| bruiser_collision_crew — Collision Crew | 5 | 2 | 4 | 0 | rush, retaliate |
| bruiser_commander — Assault Commander | 7 | 4 | 5 | 1 | command, berserk |
| bruiser_counterpuncher — Counterpuncher | 4 | 2 | 4 | 0 | berserk, retaliate |
| bruiser_gunner — Rage Gunner | 6 | 5 | 4 | 0 | berserk |
| bruiser_heavy — Siege Heavy | 7 | 4 | 5 | 1 | none |
| bruiser_overrun_charge — Overrun Charge | 6 | 0 | 0 | 1 | damage 6 (action) |
| bruiser_pavise_breaker — Pavise Breaker | 6 | 3 | 5 | 1 | guard, berserk |
| bruiser_rally — Second Wind | 2 | 0 | 0 | 1 | rally 0 (action) |
| bruiser_ram_team — Armored Ram Team | 7 | 3 | 7 | 1 | armor, berserk |
| bruiser_resupply — Combat Resupply | 3 | 0 | 0 | 0 | draw 2 (action) |
| bruiser_rupture_heavy — Rupture Heavy | 10 | 6 | 5 | 1 | berserk |
| bruiser_shock_runner — Shock Runner | 4 | 3 | 3 | 0 | rush, mobile |
| bruiser_surge_drummers — Surge Drummers | 4 | 1 | 4 | 1 | command, mobile |
| bruiser_triage_rig — Combat Triage Rig | 3 | 0 | 0 | 0 | heal 3 (action) |
| bruiser_vanguard — Iron Vanguard | 6 | 3 | 5 | 0 | none |
| nightwalker_ambush — From the Dark | 3 | 0 | 0 | 0 | ambush 4 (response) |
| nightwalker_assault — Dusk Assault Team | 5 | 4 | 4 | 0 | rush |
| nightwalker_beacon — Targeting Beacon | 4 | 0 | 6 | 1 | command |
| nightwalker_blackout — Blackout Protocol | 2 | 0 | 0 | 1 | sabotage 0 (action) |
| nightwalker_blade — Silent Blade | 4 | 4 | 4 | 0 | precision |
| nightwalker_commander — Veil Commander | 7 | 4 | 6 | 1 | command, precision |
| nightwalker_crossfire_cell — Crossfire Cell | 6 | 3 | 4 | 0 | precision, mobile, retaliate |
| nightwalker_decoy_patrol — Decoy Patrol | 3 | 1 | 3 | 0 | guard, mobile |
| nightwalker_exposure_window — Exposure Window | 3 | 0 | 0 | 1 | mark 1 (action) |
| nightwalker_false_route — False Route | 2 | 0 | 0 | 1 | disrupt 3 (action) |
| nightwalker_ghost_extraction — Ghost Extraction | 2 | 0 | 0 | 0 | reclaim 0 (action) |
| nightwalker_handler — Deep-cover Handler | 5 | 2 | 5 | 0 | command, mobile |
| nightwalker_marksman — Ghost Marksman | 6 | 6 | 3 | 0 | precision |
| nightwalker_misfire_team — Misfire Team | 4 | 3 | 4 | 0 | precision, retaliate |
| nightwalker_recon — Night Reconnaissance | 3 | 0 | 0 | 0 | draw 2 (action) |
| nightwalker_route_keeper — Route Keeper | 5 | 2 | 5 | 0 | guard, precision |
| nightwalker_saboteur — Cornered Saboteur | 5 | 4 | 3 | 0 | berserk |
| nightwalker_scout — Shadow Scout | 6 | 3 | 6 | 0 | mobile, precision |
| nightwalker_shadow_handler — Shadow Handler | 4 | 1 | 4 | 0 | command, precision |
| nightwalker_silencer — Silencer Team | 6 | 5 | 4 | 1 | precision, rush |
| nightwalker_stalker — Veil Stalker | 5 | 4 | 4 | 0 | mobile |
| nightwalker_strike — Surgical Strike | 4 | 0 | 0 | 1 | damage 5 (action) |
| nightwalker_withdraw — Fade Away | 1 | 0 | 0 | 0 | retreat 0 (response) |
| rogue_broker — Salvage Broker | 5 | 2 | 5 | 0 | scavenge, mobile |
| rogue_bulwark — Patchwork Bulwark | 6 | 3 | 6 | 0 | guard, scavenge |
| rogue_commander — Route Commander | 7 | 3 | 6 | 1 | command, mobile, medic |
| rogue_field_negotiator — Field Negotiator | 5 | 1 | 5 | 1 | command, scavenge |
| rogue_field_options — Field Options | 3 | 0 | 0 | 1 | repair: heal 3; resupply: draw 2; reposition: rally 0 |
| rogue_lancer — Improvised Lancer | 5 | 4 | 4 | 0 | precision, mobile |
| rogue_outrider — Dust Outrider | 4 | 3 | 5 | 0 | mobile |
| rogue_patchguard — Patchguard | 5 | 2 | 5 | 0 | guard, armor |
| rogue_raid — Hit and Run | 3 | 0 | 0 | 1 | damage 3 (action) |
| rogue_raider — Road Raider | 7 | 5 | 6 | 0 | rush, mobile |
| rogue_rally — Keep Moving | 2 | 0 | 0 | 1 | rally 0 (action) |
| rogue_reclaim — Pull Back | 1 | 0 | 0 | 0 | reclaim 0 (action) |
| rogue_repair_courier — Repair Courier | 4 | 2 | 5 | 0 | medic, mobile |
| rogue_retreat — Break Contact | 1 | 0 | 0 | 0 | retreat 0 (response) |
| rogue_rolling_cache — Salvage Cache | 4 | 0 | 6 | 0 | medic, scavenge |
| rogue_route_scout — Route Scout | 3 | 1 | 3 | 0 | mobile, scavenge |
| rogue_salvage — Salvage Crew | 5 | 2 | 6 | 0 | medic |
| rogue_scrap_hauler — Scrap Hauler | 6 | 2 | 6 | 0 | armor, scavenge |
| rogue_scrapper — Scrap Fighter | 5 | 4 | 5 | 0 | berserk |
| rogue_skirmisher — Frontier Skirmisher | 5 | 4 | 5 | 0 | mobile |
| rogue_trailguard — Trail Guard | 6 | 3 | 7 | 0 | guard, mobile |
| rogue_wandering_medic — Salvage Medic | 5 | 2 | 4 | 0 | medic, scavenge |
| rogue_workshop — Field Workshop | 5 | 0 | 8 | 0 | medic |
| stonewall_advance_marshal — Advance Marshal | 6 | 2 | 5 | 1 | command, retaliate |
| stonewall_aid_station — Forward Aid Station | 5 | 0 | 8 | 0 | medic |
| stonewall_brace — Brace for Impact | 2 | 0 | 0 | 0 | shield 3 (response) |
| stonewall_breach_shield — Breach Shield Column | 7 | 2 | 6 | 1 | armor, guard, mobile |
| stonewall_bulwark_warden — Bulwark Warden | 6 | 2 | 6 | 0 | armor, guard |
| stonewall_commander — Defense Commander | 7 | 3 | 7 | 1 | command, fortify |
| stonewall_counterbattery — Counterbattery Section | 6 | 3 | 7 | 0 | fortify, retaliate |
| stonewall_countermarch — Countermarch Section | 5 | 3 | 5 | 0 | mobile, retaliate |
| stonewall_defender — Shield Defender | 5 | 2 | 7 | 0 | guard |
| stonewall_escort — Armored Escort | 6 | 3 | 6 | 0 | guard, fortify |
| stonewall_fire_support — Defensive Fire | 4 | 0 | 0 | 1 | damage 3 (action) |
| stonewall_heavy — Bastion Heavy | 8 | 4 | 9 | 1 | fortify |
| stonewall_line_reinforcement — Line Reinforcement | 3 | 0 | 0 | 0 | reinforce 2 (action) |
| stonewall_medic — Field Medic | 5 | 2 | 5 | 0 | medic |
| stonewall_pathfinder — Route Pathfinder | 4 | 3 | 4 | 0 | mobile |
| stonewall_plate_medic — Plate Medic | 4 | 1 | 4 | 0 | armor, medic |
| stonewall_rally — Hold the Line | 2 | 0 | 0 | 1 | rally 0 (action) |
| stonewall_recovery_team — Recovery Column | 5 | 2 | 4 | 0 | medic, mobile |
| stonewall_redoubt — Field Redoubt | 6 | 0 | 9 | 1 | fortify, command |
| stonewall_reserve_watch — Reserve Watch | 3 | 1 | 4 | 0 | retaliate |
| stonewall_rifles — Line Rifle Squad | 4 | 3 | 5 | 0 | fortify |
| stonewall_triage — Emergency Triage | 3 | 0 | 0 | 0 | heal 4 (action) |
| stonewall_watchguard — Watchguard Detachment | 5 | 2 | 6 | 0 | guard, retaliate |
| syndicate_breach_monitor — Breach Monitor | 6 | 3 | 6 | 1 | armor, precision |
| syndicate_commander — Operations Director | 7 | 3 | 7 | 1 | command |
| syndicate_contractor — Armored Contractor | 7 | 4 | 8 | 0 | guard |
| syndicate_coordinator — Operations Coordinator | 5 | 3 | 5 | 0 | command |
| syndicate_counter — Override Protocol | 2 | 0 | 0 | 0 | counter 0 (counter) |
| syndicate_courier — Blackline Courier | 4 | 2 | 4 | 0 | mobile |
| syndicate_cover_protocol — Cover Protocol | 2 | 0 | 0 | 0 | reinforce 1 (action) |
| syndicate_disrupt — Supply Interference | 3 | 0 | 0 | 1 | disrupt 4 (action) |
| syndicate_eliminator — Contract Eliminator | 7 | 5 | 4 | 0 | precision, mobile |
| syndicate_enforcer — Contract Enforcer | 6 | 4 | 6 | 0 | none |
| syndicate_field_link — Field Link | 3 | 0 | 5 | 1 | command, medic |
| syndicate_fire_coordinator — Fire Coordinator | 5 | 2 | 4 | 0 | command, precision |
| syndicate_intel — Intelligence Network | 3 | 0 | 0 | 0 | draw 2 (action) |
| syndicate_observer — Target Observer | 3 | 2 | 4 | 0 | precision |
| syndicate_patch_team — Tactical Patch Team | 4 | 1 | 4 | 0 | medic, guard |
| syndicate_precision_strike — Contract Strike | 4 | 0 | 0 | 1 | damage 3 (action) |
| syndicate_rapid_detail — Rapid Security Detail | 5 | 3 | 5 | 0 | guard, mobile |
| syndicate_relay — Coordination Relay | 5 | 0 | 8 | 1 | command |
| syndicate_screen_operator — Screen Operator | 5 | 2 | 5 | 0 | armor, guard |
| syndicate_security — Security Detail | 4 | 3 | 4 | 0 | guard |
| syndicate_signal_lock — Signal Lock | 3 | 0 | 0 | 1 | sabotage 0 (action) |
| syndicate_tactical_medic — Tactical Recovery Team | 5 | 2 | 5 | 0 | medic, precision |
| syndicate_target_designator — Target Designator | 2 | 0 | 0 | 1 | mark 1 (action) |

### Frozen off-lane Commanders

| Commander | Passive | Active / cost |
| --- | --- | --- |
| commander_stonewall_warden — The Warden | Hold Fast: At the start of your offensive turn, heal 1 damage from each allied battlefield card in territory you control. | Lasting Resolve: Once per match: heal 3 damage from a damaged allied battlefield card and give it temporary Armor 1 until your next offensive turn. Armor does not stack with printed Armor. (2 Capacity / 1 command) |
| commander_stonewall_marshal — The Marshal | Return Fire: An allied unit that survives as the defender in regular combat gains +1 Attack until the end of your next offensive turn. This bonus does not stack. | Countermand: Once per match: ready an exhausted allied unit and give it +1 Attack until the end of this offensive turn. This bonus does not stack with Return Fire. Deployment-turn attack restrictions still apply. (2 Capacity / 1 command) |
| commander_bruiser_breaker — The Breaker | Drive Forward: At your offensive turn end, add 2 extra capture progress if a Rush or Mobile allied unit occupies the contested territory. This is territorial pressure, not spendable Capacity. | Breach Order: Once per match: ready an allied unit in the contested territory and give it +2 Attack until this offensive turn ends. Deployment-turn attack restrictions still apply. (2 Capacity / 1 command) |
| commander_bruiser_bloodhound — The Bloodhound | Scent of Weakness: Your initiated regular combat attacks gain +1 Attack against a wounded enemy. The bonus does not apply to retaliation, direct damage or a target that was fully healed before combat resolves. | Finish the Hunt: Once per match: deal 3 direct damage to a wounded enemy battlefield card. Direct damage ignores Armor and Fortify. (2 Capacity / 1 command) |
| commander_syndicate_coordinator — The Coordinator | Target Network: Your action Orders whose selected effect is Mark cost 1 less Capacity, to a minimum of 1. Printed Presence and all other effects are unchanged. | Priority Target: Once per match: Mark an enemy battlefield card and deal 2 direct damage to it. Mark lasts until its owner’s next offensive turn. (2 Capacity / 1 command) |
| commander_syndicate_quartermaster — The Quartermaster | Rapid Logistics: The first action Order each offensive turn with printed Presence 3 or less and printed Command Action cost above 0 costs 0 Command Actions. Its Capacity cost is unchanged. | Reserve Release: Once per match: clear up to 4 temporary spent Capacity and draw 2 cards. Does not release deployed commitment or exceed total Capacity. (0 Capacity / 1 command) |
| commander_nightwalker_ghost — The Ghost | Veiled Entry: The first Precision unit you deploy each offensive turn gains temporary Armor 1 until your next offensive turn. This does not stack with printed Armor. | Fade to Shadow: Once per match: withdraw an allied unit one territory toward home into adjacent friendly ground, heal up to 3 damage and ready it. Destination slots and deployment-turn attack restrictions still apply. (2 Capacity / 1 command) |
| commander_nightwalker_saboteur — The Saboteur | Supply Interference: The first Sabotage action Order you resolve each offensive turn also locks 1 enemy available Capacity until their next offensive turn. It cannot lock committed Capacity. | Blackout: Once per match: suppress the printed traits of every enemy battlefield card in the contested territory until its owner’s next offensive turn, and lock up to 2 enemy available Capacity for that window. (2 Capacity / 1 command) |
| commander_rogue_scavenger — The Scavenger | Nothing Wasted: The first allied battlefield card destroyed in each offensive initiative draws you 1 card. This may also trigger alongside a surviving unit’s Scavenge ability; each has its own limit. | Recover the Fallen: Once per match: return the most recent non-Order card in your discard to your hand. Redeployment pays its printed costs and starts without wounds. (2 Capacity / 1 command) |
| commander_rogue_drifter — The Drifter | Open Route: Your first normal unit movement each offensive turn costs 0 Command Actions. Normal adjacency, readiness, slots and movement exhaustion rules still apply. | Change the Plan: Once per match: relocate an allied unit to any territory you control or the contested territory, and ready it. Destination slots and deployment-turn attack restrictions still apply. (2 Capacity / 1 command) |

### Frozen thirty-deck test pool

Saved/custom deck data is not rewritten by the four preset repairs. Named Commander IDs are outside the 26-card list.

| Deck ID / label | Archetype | Commander | Exact frozen card quantities |
| --- | --- | --- | --- |
| stonewall-starter — Stonewall — Bastion | bastion | commander_stonewall_warden | 4× stonewall_rifles; 3× stonewall_defender; 2× stonewall_medic; 2× stonewall_heavy; 2× stonewall_escort; 2× stonewall_pathfinder; 2× stonewall_commander; 1× stonewall_aid_station; 2× stonewall_triage; 2× stonewall_brace; 2× stonewall_rally; 2× stonewall_fire_support |
| bruiser-starter — Bruiser — Breakthrough | shock-assault | commander_bruiser_breaker | 4× bruiser_assault; 3× bruiser_heavy; 2× bruiser_brawler; 2× bruiser_breacher; 2× bruiser_vanguard; 2× bruiser_gunner; 2× bruiser_commander; 1× bruiser_banner; 2× bruiser_bombard; 2× bruiser_rally; 2× bruiser_ambush; 2× bruiser_resupply |
| syndicate-starter — Syndicate — Tactical Command | combined-arms | commander_syndicate_coordinator | 4× syndicate_security; 3× syndicate_enforcer; 2× syndicate_observer; 2× syndicate_courier; 2× syndicate_coordinator; 2× syndicate_contractor; 2× syndicate_commander; 1× syndicate_relay; 2× syndicate_intel; 2× syndicate_disrupt; 2× syndicate_counter; 2× syndicate_precision_strike |
| nightwalker-starter — Nightwalker — Shadow Operations | assassination | commander_nightwalker_ghost | 4× nightwalker_blade; 3× nightwalker_stalker; 2× nightwalker_marksman; 2× nightwalker_assault; 2× nightwalker_saboteur; 2× nightwalker_scout; 2× nightwalker_commander; 1× nightwalker_beacon; 2× nightwalker_ambush; 2× nightwalker_strike; 2× nightwalker_withdraw; 2× nightwalker_recon |
| rogue-starter — Rogue — Improvised Warfare | wildcard | commander_rogue_scavenger | 4× rogue_outrider; 3× rogue_skirmisher; 2× rogue_scrapper; 2× rogue_salvage; 2× rogue_trailguard; 2× rogue_raider; 2× rogue_commander; 1× rogue_workshop; 2× rogue_reclaim; 2× rogue_rally; 2× rogue_retreat; 2× rogue_raid |
| stonewall-bastion — Stonewall — Bastion | bastion | commander_stonewall_warden | 3× stonewall_rifles; 3× stonewall_defender; 2× stonewall_medic; 2× stonewall_heavy; 2× stonewall_escort; 2× stonewall_commander; 1× stonewall_aid_station; 3× stonewall_watchguard; 2× stonewall_redoubt; 2× stonewall_triage; 2× stonewall_brace; 2× stonewall_fire_support |
| stonewall-counteroffensive — Stonewall — Counteroffensive | counteroffensive | commander_stonewall_warden | 3× stonewall_rifles; 1× stonewall_pathfinder; 2× stonewall_escort; 2× stonewall_commander; 3× stonewall_counterbattery; 2× stonewall_recovery_team; 2× stonewall_watchguard; 3× stonewall_medic; 2× stonewall_heavy; 2× stonewall_rally; 2× stonewall_fire_support; 2× stonewall_triage |
| bruiser-shock-assault — Bruiser — Shock Assault | shock-assault | commander_bruiser_breaker | 4× bruiser_assault; 2× bruiser_brawler; 3× bruiser_breacher; 2× bruiser_gunner; 2× bruiser_commander; 3× bruiser_shock_runner; 2× bruiser_breach_caller; 2× bruiser_heavy; 2× bruiser_rally; 2× bruiser_bombard; 2× bruiser_ambush |
| bruiser-heavy-breakthrough — Bruiser — Heavy Breakthrough | heavy-breakthrough | commander_bruiser_breaker | 4× bruiser_heavy; 2× bruiser_brawler; 2× bruiser_vanguard; 2× bruiser_commander; 1× bruiser_banner; 3× bruiser_rupture_heavy; 2× bruiser_breach_caller; 3× bruiser_rally; 2× bruiser_bombard; 3× bruiser_overrun_charge; 2× bruiser_resupply |
| syndicate-combined-arms — Syndicate — Combined Arms | combined-arms | commander_syndicate_coordinator | 3× syndicate_security; 3× syndicate_enforcer; 2× syndicate_courier; 2× syndicate_coordinator; 2× syndicate_contractor; 2× syndicate_commander; 3× syndicate_tactical_medic; 3× syndicate_rapid_detail; 2× syndicate_intel; 2× syndicate_counter; 2× syndicate_precision_strike |
| syndicate-precision-operations — Syndicate — Precision Operations | precision-operations | commander_syndicate_coordinator | 2× syndicate_security; 2× syndicate_observer; 2× syndicate_courier; 2× syndicate_coordinator; 2× syndicate_commander; 3× syndicate_eliminator; 2× syndicate_signal_lock; 3× syndicate_precision_strike; 2× syndicate_intel; 2× syndicate_counter; 2× syndicate_contractor; 2× syndicate_rapid_detail |
| nightwalker-sabotage — Nightwalker — Sabotage | sabotage | commander_nightwalker_ghost | 3× nightwalker_stalker; 1× nightwalker_saboteur; 4× nightwalker_scout; 2× nightwalker_commander; 4× nightwalker_handler; 2× nightwalker_blackout; 1× nightwalker_beacon; 2× nightwalker_ambush; 2× nightwalker_strike; 2× nightwalker_recon; 1× nightwalker_withdraw; 2× nightwalker_silencer |
| nightwalker-assassination — Nightwalker — Assassination | assassination | commander_nightwalker_ghost | 3× nightwalker_blade; 4× nightwalker_marksman; 2× nightwalker_assault; 2× nightwalker_scout; 2× nightwalker_commander; 3× nightwalker_silencer; 3× nightwalker_ghost_extraction; 3× nightwalker_strike; 2× nightwalker_ambush; 2× nightwalker_recon |
| rogue-scavenger — Rogue — Scavenger | scavenger | commander_rogue_scavenger | 3× rogue_outrider; 2× rogue_salvage; 2× rogue_trailguard; 2× rogue_commander; 3× rogue_broker; 3× rogue_bulwark; 1× rogue_workshop; 3× rogue_reclaim; 2× rogue_rally; 3× rogue_raid; 2× rogue_retreat |
| rogue-wildcard — Rogue — Wildcard | wildcard | commander_rogue_scavenger | 3× rogue_outrider; 2× rogue_skirmisher; 3× rogue_raider; 2× rogue_commander; 3× rogue_lancer; 3× rogue_repair_courier; 2× rogue_trailguard; 2× rogue_reclaim; 3× rogue_rally; 3× rogue_raid |
| stonewall-fortified-advance — Stonewall — Fortified Advance | fortified-advance | commander_stonewall_warden | 3× stonewall_rifles; 2× stonewall_defender; 2× stonewall_medic; 2× stonewall_commander; 3× stonewall_bulwark_warden; 3× stonewall_countermarch; 2× stonewall_plate_medic; 3× stonewall_line_reinforcement; 2× stonewall_advance_marshal; 2× stonewall_fire_support; 2× stonewall_brace |
| bruiser-rolling-breakthrough — Bruiser — Rolling Breakthrough | rolling-breakthrough | commander_bruiser_breaker | 3× bruiser_assault; 3× bruiser_shock_runner; 2× bruiser_heavy; 2× bruiser_commander; 3× bruiser_ram_team; 3× bruiser_collision_crew; 2× bruiser_counterpuncher; 2× bruiser_surge_drummers; 2× bruiser_triage_rig; 2× bruiser_rally; 2× bruiser_bombard |
| syndicate-coordinated-removal — The Syndicate — Coordinated Removal | coordinated-removal | commander_syndicate_coordinator | 3× syndicate_security; 2× syndicate_coordinator; 2× syndicate_commander; 2× syndicate_eliminator; 3× syndicate_screen_operator; 2× syndicate_fire_coordinator; 2× syndicate_patch_team; 3× syndicate_target_designator; 2× syndicate_cover_protocol; 3× syndicate_intel; 2× syndicate_counter |
| nightwalker-planned-exposure — Nightwalker — Planned Exposure | planned-exposure | commander_nightwalker_ghost | 3× nightwalker_blade; 2× nightwalker_scout; 2× nightwalker_commander; 2× nightwalker_silencer; 2× nightwalker_shadow_handler; 3× nightwalker_decoy_patrol; 3× nightwalker_crossfire_cell; 2× nightwalker_exposure_window; 2× nightwalker_false_route; 2× nightwalker_ghost_extraction; 3× nightwalker_recon |
| rogue-field-improvisation — Rogue — Field Improvisation | field-improvisation | commander_rogue_scavenger | 3× rogue_outrider; 2× rogue_commander; 2× rogue_lancer; 2× rogue_broker; 3× rogue_route_scout; 3× rogue_scrap_hauler; 2× rogue_patchguard; 2× rogue_wandering_medic; 3× rogue_field_options; 2× rogue_reclaim; 2× rogue_rally |
| commander_stonewall_warden-foundation — Stonewall — The Warden / Frontline doctrine | bastion | commander_stonewall_warden | 3× stonewall_rifles; 4× stonewall_defender; 3× stonewall_medic; 2× stonewall_heavy; 3× stonewall_escort; 1× stonewall_pathfinder; 2× stonewall_commander; 1× stonewall_aid_station; 3× stonewall_triage; 2× stonewall_brace; 1× stonewall_rally; 1× stonewall_fire_support |
| commander_stonewall_marshal-foundation — Stonewall — The Marshal / Tactical doctrine | counteroffensive | commander_stonewall_marshal | 4× stonewall_rifles; 2× stonewall_defender; 1× stonewall_medic; 3× stonewall_heavy; 2× stonewall_escort; 3× stonewall_pathfinder; 2× stonewall_commander; 1× stonewall_aid_station; 1× stonewall_triage; 1× stonewall_brace; 3× stonewall_rally; 3× stonewall_fire_support |
| commander_bruiser_breaker-foundation — Bruiser — The Breaker / Frontline doctrine | shock-assault | commander_bruiser_breaker | 4× bruiser_assault; 4× bruiser_heavy; 2× bruiser_brawler; 4× bruiser_breacher; 1× bruiser_vanguard; 1× bruiser_gunner; 2× bruiser_commander; 1× bruiser_banner; 2× bruiser_bombard; 2× bruiser_rally; 2× bruiser_ambush; 1× bruiser_resupply |
| commander_bruiser_bloodhound-foundation — Bruiser — The Bloodhound / Tactical doctrine | shock-assault | commander_bruiser_bloodhound | 3× bruiser_assault; 2× bruiser_heavy; 3× bruiser_brawler; 2× bruiser_breacher; 2× bruiser_vanguard; 3× bruiser_gunner; 2× bruiser_commander; 1× bruiser_banner; 3× bruiser_bombard; 1× bruiser_rally; 3× bruiser_ambush; 1× bruiser_resupply |
| commander_syndicate_coordinator-foundation — Syndicate — The Coordinator / Frontline doctrine | combined-arms | commander_syndicate_coordinator | 3× syndicate_security; 2× syndicate_enforcer; 1× syndicate_observer; 2× syndicate_target_designator; 1× syndicate_courier; 4× syndicate_coordinator; 2× syndicate_contractor; 2× syndicate_commander; 1× syndicate_relay; 2× syndicate_intel; 1× syndicate_disrupt; 2× syndicate_counter; 3× syndicate_precision_strike |
| commander_syndicate_quartermaster-foundation — Syndicate — The Quartermaster / Tactical doctrine | combined-arms | commander_syndicate_quartermaster | 4× syndicate_security; 3× syndicate_enforcer; 2× syndicate_observer; 4× syndicate_courier; 1× syndicate_coordinator; 1× syndicate_contractor; 2× syndicate_commander; 1× syndicate_relay; 3× syndicate_intel; 2× syndicate_disrupt; 2× syndicate_counter; 1× syndicate_precision_strike |
| commander_nightwalker_ghost-foundation — Nightwalker — The Ghost / Frontline doctrine | assassination | commander_nightwalker_ghost | 4× nightwalker_blade; 3× nightwalker_stalker; 3× nightwalker_marksman; 1× nightwalker_assault; 1× nightwalker_saboteur; 3× nightwalker_scout; 2× nightwalker_commander; 1× nightwalker_beacon; 3× nightwalker_ambush; 2× nightwalker_strike; 1× nightwalker_withdraw; 2× nightwalker_recon |
| commander_nightwalker_saboteur-foundation — Nightwalker — The Saboteur / Tactical doctrine | sabotage | commander_nightwalker_saboteur | 2× nightwalker_blade; 2× nightwalker_stalker; 1× nightwalker_marksman; 2× nightwalker_blackout; 4× nightwalker_saboteur; 2× nightwalker_scout; 2× nightwalker_commander; 1× nightwalker_beacon; 2× nightwalker_ambush; 3× nightwalker_strike; 2× nightwalker_withdraw; 3× nightwalker_recon |
| commander_rogue_scavenger-foundation — Rogue — The Scavenger / Frontline doctrine | scavenger | commander_rogue_scavenger | 3× rogue_outrider; 2× rogue_skirmisher; 3× rogue_scrapper; 4× rogue_salvage; 2× rogue_trailguard; 1× rogue_raider; 2× rogue_commander; 1× rogue_workshop; 3× rogue_reclaim; 1× rogue_rally; 2× rogue_retreat; 2× rogue_raid |
| commander_rogue_drifter-foundation — Rogue — The Drifter / Tactical doctrine | wildcard | commander_rogue_drifter | 4× rogue_outrider; 4× rogue_skirmisher; 1× rogue_scrapper; 1× rogue_salvage; 3× rogue_trailguard; 3× rogue_raider; 2× rogue_commander; 1× rogue_workshop; 1× rogue_reclaim; 2× rogue_field_options; 2× rogue_retreat; 2× rogue_raid |
