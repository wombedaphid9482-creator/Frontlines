# Tactical Arsenal training — v1.0.4

Open **Tactical Training** from the command menu, or **Tactical Arsenal training** inside the Field Manual. The separate page is also available at `tactical-training.html`.

These are six optional exercises after the existing fourteen beginner lessons. Each exercise lets the player issue its clearly named **Action → Counter → Result** commands. The player controls both sides of a prepared situation; the displayed player label identifies who is acting. The engine handles any required initiative change and the scripted Response passes. The practice battlefield, health, readiness, resources, status badges and actual engine log update after every command.

The exercises use real faction cards arranged from legal 26-card inventories. They do not change printed stats, use a second rules implementation, award Credits, grant mastery, or create competitive match reports. Completion checkmarks save separately as `frontlines.tactical-training.v1`; the beginner tutorial's saved progress is unchanged.

| Exercise | Action | Counter | Result |
| --- | --- | --- | --- |
| Cover / Breach | Stonewall gives its Rifle Squad Cover with Dig In. | Bruiser attacks with Demolition Squad's Breach. | Cover is removed before the direct hit; the normal combat exchange resolves. |
| Blast / Disperse | Bruiser Grenadier pays for capped center-area damage. | Stonewall withdraws one wounded defender to friendly rear ground. | Frag Out can hit only the remaining enemy in the chosen territory. |
| Dodge / Mark / Exposed | Nightwalker gives its Stalker one Dodge charge with Vanish. | Syndicate plays Target Package. | Mark and Exposed prepare a direct attack; Dodge is removed and Exposed's extra vulnerability is consumed. |
| Overwatch / Suppression | Stonewall Bastion Gunner arms a watch. | Syndicate Suppression Team applies limited Suppression. | Security enters and triggers the watch once. Suppression did not cancel preparation or prevent ordinary play. |
| Sacrifice / Repair | Enemy bombardment wounds Rogue's Bulwark. | Rogue trades its Shield with Strip It for Parts, using an explicit confirmation. | The Bulwark heals, the lost Shield stays destroyed and no Scavenge or Nothing Wasted casualty draw is granted. |
| Smoke / Timing | Stonewall prepares Overwatch. | Nightwalker places Smoke Screen over a local ally. | A unit crosses without a reaction, then real action-window boundaries expire the Smoke and watch. |

**Restart this exercise** restores its prepared inventory and board. Each exercise can be replayed independently. **Keep this unit** or Escape cancels the Sacrifice confirmation without changing the engine state. Normal gameplay also requires selecting the voluntary cost, selecting its distinct payoff, and separately confirming before it dispatches the Sacrifice Order.

The Field Manual now includes Cover, Breach, Blast, Dodge, Suppression, Overwatch, Sacrifice, Exposed and Smoke. The first definition in each topic comes from the same canonical mechanics catalog used by card tooltips and simulator rules snapshots. Topics also explain timing, stacking, counters and faction examples.

Validation: all eight `tests/sprint11-training.test.js` checks pass; `tests/browser-sprint11-tactics.js` completes all six exercises, verifies cancellation without mutation, local completion persistence and no collection rewards. The existing `tests/browser-tutorial-sprint9.js` still completes all fourteen beginner lessons, including Commander passive, active and doctrine selection.
