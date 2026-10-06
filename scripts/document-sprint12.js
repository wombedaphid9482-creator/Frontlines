'use strict';
// Documentation and a proposed configuration only. Never execute simulations.
const fs=require('node:fs'),B=require('../balance'),S=require('../sim-core'),R=B.createRuntime('sprint12'),D=R.data,L=require('../decks').forData(D);
const write=(file,text)=>fs.writeFileSync(file,text.trim()+'\n');
const options=S.normalizeOptions({balanceProfile:'sprint12',mode:'matrix',count:12250,deckPool:L.getDecks().map(d=>d.id),includeMirrors:true,swapSeats:true,seed:1209,aiProfiles:['deck','deck'],maxTurns:240,maxDecisions:10000,verify:true});
write('docs/balance/sprint12-validation-options.json',JSON.stringify(options,null,2));
let keywords='# Frontlines keyword rules — v1.0.5\n\nThese are the current `sprint12` definitions. Historical profiles retain their own rules. Printed legacy cards using “turn” refer to the offensive **action window** counted by the current engine. See [the timing audit](TURN-TERMINOLOGY.md) before interpreting paired-player turns.\n\n| Term | Exact current rule |\n| --- | --- |\n';
for(const [name,text]of Object.entries(D.GLOSSARY))keywords+='| '+name+' | '+text.replaceAll('|','\\|')+' |\n';
keywords+='\nMark is distinct from Exposed: Mark neither strips Cover nor adds an Exposed charge. Blast targets a capped number of enemy permanents, applies all wounds before casualties, and bypasses Cover/Dodge/Smoke without consuming charges. Coordinated Barrage applies its printed prepared-target bonus once.\n\nTemporary statuses serialize source, owner, target, amount, consumption and expiry. They refresh rather than stack. Removing the source does not erase already granted protection or Suppression. Overwatch needs its source alive; Smoke blocks its reaction without spending the charge. Expiry and consumption produce ordered engine events and log entries.\n\nSacrifice releases ordinary commitment but generates no Scavenge/Nothing Wasted draw, enemy kill or extra refund. Reclaim and redeployment retain wounds. A single shared casualty-draw budget prevents multiplying sources. [Tactical Arsenal](TACTICAL-ARSENAL.md) preserves the forty printed designs and five showcases; [Commanders](COMMANDERS.md) describes the ten off-lane choices.\n';
write('docs/KEYWORDS.md',keywords);
write('docs/TACTICAL-REFINEMENT-AUDIT.md',`# Tactical Arsenal refinement audit — v1.0.5

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

Evidence: unchanged Sprint 11 mechanic/Commander/provenance regression cases; [current replay tests](../tests/sprint12-replay.test.js) compare every step of all six exercises against the frozen-profile engine; [public AI cases](../tests/sprint12-refinement.test.js); actual browser targeting, cancellation, status stacks and expiry in \`test-results/sprint12-tactical-browser.json\`. Readability keeps named badges, target highlights, public previews, duration tooltips and consumed/expired log events. Color is supplementary.

Three policy repairs are isolated to \`arsenalRefinement\`: canonical public Mark/Exposed projections and legal paid follow-ups; rejection of unreachable rear Overwatch; repair survival credit only when a visible lethal exchange becomes survivable. Sacrifice still prices the lost piece. All forty tactical cards are evaluated with concealed enemy hand/deck/RNG getters that throw if read, at all four difficulties. Historical Sprint 11 decisions remain exact.

Balance remains provisional. No faction, Commander, deck or card win-rate claims are inferred from these correctness fixtures. Human review and the owner's proposed paired matrix are the next evidence gate.
`);
write('docs/TURN-TERMINOLOGY.md',`# Action windows and the future paired turn

The current \`state.turn\` counts **global offensive action windows**. P1 window 1 → P2 window 2 → P1 window 3. A combat Response or Counter belongs to the attacker's window and does not increment this counter. Capture and forced displacement resolve at each window end; readiness, Order refresh, draws, growth, Medic/Commander start triggers and most status expiry occur at the next owner's window start.

v1.0.5 safely labels the live HUD, capture forecast, End window control, victory counter, log prefixes, tutorial and advanced practice with action-window wording. Field Leaders are deployable cards; Commanders are the separate off-lane choice. Legacy printed “turn” text and serialized \`turn\`/\`endTurn\` intent IDs remain compatible. Exported historical \`turns\` metrics count windows.

Ryken's intended future model is Turn 6 → P1 action window → P2 action window → end-of-turn resolution. Moving capture or growth to a paired resolution would change initiative, capture race, displacement, status duration, salvage budgets, Commander passives and AI planning. Merely halving the display would misleadingly label first-window captures as end-of-turn events.

The next timing sprint must introduce separate turn/window counters and specify initiative order; migration for start/end expiries and deployed/moved/attacked/defended/passive fields; once-per-window versus once-per-paired-turn casualty budgets; simultaneous/ordered capture resolution; reserve/readiness/growth timing; tutorial fixtures; replay schema and explicit rules-version negotiation; simulator cutoffs and telemetry labels. Compare the frozen rules with paired timing using owner-authorized data before switching competitive defaults. This timing rewrite is deferred.
`);
write('docs/MULTIPLAYER-READINESS.md',`# Private multiplayer readiness — v1.0.5

The deterministic local rules core is a usable foundation, not a completed network authority. No transport, accounts, public matchmaking or online mode is implemented.

| Finding | Current evidence / next requirement |
| --- | --- |
| Deterministic resolution | Explicit seed plus serialized xorshift state; dispatch uses no ambient clock/random. Reserve recycling reproduces after reload. Require server-chosen seed and matching rules/catalog/AI versions. |
| Serializable state | Units, statuses/expiry/provenance, Commander one-use/passive state, territories/progress, pending Response/Counter, UID allocators and RNG survive JSON. Version the network state schema. |
| Intent → new state/events | Immutable validated dispatch, ordered per-action event array, deterministic six-exercise replay and historical rule parity. Persist an append-only action/event ledger; the bounded display log is not the authoritative replay store. |
| Invalid action | Engine legality rejects out-of-phase and illegal targets atomically. A server must additionally validate message shape/size and bind authenticated seat to \`getActor\`; dispatch does not authenticate callers. |
| Deduplication / ordering | Not implemented in rules state. Add match ID, sequence, rules/content hash, expected revision and unique intent ID to a server envelope; reject stale/replayed intent before applying once. |
| Private information | Local authoritative state includes both hands and reserve order. Never broadcast it. Build explicit per-seat projections and spectator policies; revealed public events only. AI tests cannot substitute for network secrecy validation. |
| Presentation independence | Engine and tactical resolver have no DOM/audio/animation dependencies. UI represents committed engine results; animation scheduling must never authorize gameplay. |
| Resync / reconnect | Future trusted snapshot plus action revision/hash and deterministic replay; include pending response owner, statuses and Commander flags. Test real two-client disconnect/race cases in v1.1.0. |

Current proof: \`tests/sprint12-replay.test.js\` exercises JSON roundtrip at each tactical transition, exact ordered events, unresolved Response, Commander state, invalid action atomicity and seeded recycled draws. Existing frontend/simulator use the same rules. AI consumes its own hand and public board without reading concealed opponent hand/deck/RNG. UI/reward timestamps are outside gameplay authority.

Next release gate: strict versioned intent envelope; authoritative host/server adapter; authenticated seat/action ownership; private projections; deduplicated append-only ledger; resync/reconnect; then two-client smoke tests. These remain required before claiming online readiness.
`);
write('docs/BALANCE-REFINEMENT-VALIDATION.md',`# Owner validation proposal — Sprint 12

**Not executed.** No large autonomous simulations ran. The S12 directive supersedes old historical campaign authorization. Correctness cases and individual UI/native matches establish runtime behavior, not statistical balance.

Use [the exact options JSON](balance/sprint12-validation-options.json) in War Room / Advanced Lab: \`sprint12\`, matrix, **12,250 matches**, all **35** built-in decks, mirrors enabled, both seats, deck-aware AI on both sides, seed **1209**, default configuration, **240 action-window** cutoff, **10,000 decisions**, invariant verification enabled. This is ten full 35×35 = 1,225-match schedule cycles, avoiding a partial matrix endpoint. Every ordered non-mirror cell receives ten samples; each mirror receives ten. Non-mirror paired seats reuse a seed. Ten samples per cell are a screening signal with broad uncertainty, not a balance verdict.

For a matched policy comparison, run the same configuration under \`sprint11\` as a separate owner-authorized baseline. Cards, decks, Commanders and timing are identical, so differences principally test AI policy. Save both full JSON reports and matched-seed comparison; preserve cutoffs/errors as unfinished.

Report faction, Commander, archetype, deck and matchup rates with exposure/uncertainty; first-seat effect; mean/median window length; cutoff/error frequency; Cover/Dodge/Smoke protection; Breach/Blast value; Suppression duration/use; Overwatch armed/fired/blocked/expired; Sacrifice costs and casualty-draw exclusion; Mark/Exposed setup/payoff; Pressure/Presence efficiency; territory progression and comeback signals. Separate twenty legacy lists, ten Commander foundations and five tactical showcases. Diagnose implementation, sequencing and policy before card-efficiency changes. Card-win correlation alone is not causal evidence.

No new numeric nerfs/buffs are justified yet. Watch cheap protection/setup, clustered Blast, stationary preparation, Rogue recursion and Commander/initiative interaction. Diagnostic bands remain faction 45–55%, decks around 40–60%; persistent below 35%/above 65% or extreme matchups merit investigation with meaningful sample sizes and human counterplay review.
`);
function prepend(file,marker,text){let original=fs.readFileSync(file,'utf8');if(original.includes(marker))return;const newline=original.indexOf('\n');write(file,original.slice(0,newline)+'\n\n'+text+'\n\n'+original.slice(newline+1));}
prepend('docs/BALANCE.md','## Current v1.0.5 Arsenal Refinement',`## Current v1.0.5 Arsenal Refinement

The default profile is \`sprint12 / sprint12-refinement-v1\`. All 155 printed designs, 35 decks, ten Commanders and numerical/capture rules are unchanged from completed v1.0.4. Three public-information AI defects are repaired before considering numeric tuning. [The mechanics/AI audit](TACTICAL-REFINEMENT-AUDIT.md) and [exact owner-run proposal](BALANCE-REFINEMENT-VALIDATION.md) distinguish verified correctness from unmeasured competitive balance. No large campaign ran; no v1.0.5 win rates are claimed.

The [accepted artwork checkpoint](art/SPRINT12-VISUAL-CHECKPOINT.json) preceded all policy changes. Normal completed matches now use completion-based progression (70 Credits win / 50 loss, one-time first match +50); training/developer/simulator exclusions, wallet values and duplicate-proof receipts remain. Historical analysis below is preserved and is not v1.0.5 evidence.
`);
prepend('docs/GAME-ROADMAP.md','## Current v1.0.5 Arsenal Refinement',`## Current v1.0.5 Arsenal Refinement

The illustrated card-quality gate is complete: all 155 battlefield cards reviewed, 91 mappings replaced/repaired, coherent faction subjects and preserved premium Commander art. Continue from the local v1.0.5 candidate with human tactical/credit/save/display playtests, then the owner's [exact paired validation](BALANCE-REFINEMENT-VALIDATION.md). Competitive balance remains provisional.

1. Play custom decks/showcases, read defensive status timing, try real counters and verify win/loss Credits.
2. Owner-run validation and matched Sprint 11 policy comparison; investigate root causes before numerical changes.
3. **HIGH PRIORITY — Legendary presentation.** Future treatments must visibly separate gameplay rarity, cosmetic variant and mastery/wear. Store/render these as independent layers: rarity frame/emblem; illustration/foil/full-art variant; wear patina/badges. Legendary + Veteran + Foil must complement each other without altering stats. Final redesign is deferred.
4. Paired-player turn terminology/timing migration follows the [action-window audit](TURN-TERMINOLOGY.md), not a casual display renumbering.
5. v1.1.0 private online multiplayer follows [the authority/private-state/replay gate](MULTIPLAYER-READINESS.md). No networking was added here.

The previous sprint roadmaps below remain historical context.
`);
let readme=fs.readFileSync('README.md','utf8');readme=readme.replace('**Frontlines v1.0.4 — Tactical Arsenal.**','**Frontlines v1.0.5 — Arsenal Refinement.**');const paragraph=readme.indexOf('\n\nForty new cards');if(paragraph>=0){const end=readme.indexOf('\n\nFight for territory',paragraph);readme=readme.slice(0,paragraph)+'\n\nAll 155 battlefield cards now use reviewed illustrated artwork, with the ten premium Commander portraits preserved. Tactical AI, timing explanations, save migration and normal win/loss Credits are verified. [Download and verification](docs/RELEASE-1.0.5.md) · [Sprint report](docs/SPRINT-012.md) · [Artwork audit and every replacement](docs/art/SPRINT12-ART-QUALITY.md).'+readme.slice(end);}readme=readme.replace('The [v1.0.3 release guide](docs/RELEASE-1.0.3.md) records packaging status and validation.','The [v1.0.5 release guide](docs/RELEASE-1.0.5.md) records current packaging status and validation.');write('README.md',readme);
console.log('Sprint 12 audits, glossary, roadmap and proposed 12,250-match settings written. No simulations executed.');
