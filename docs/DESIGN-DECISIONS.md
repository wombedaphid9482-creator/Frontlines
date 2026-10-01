# Sprint 001 rules decisions

The [original brief](SPRINT-BRIEF.md) defines the project. These decisions resolve open questions and problems observed during implementation.

## A capture physically advances the army

The first rules implementation moved the objective marker after capture but left every survivor where it stood. In a 50-match baseline AI batch, only 9 matches ended within 240 offensive turns; the suite recorded 8,899 defensive re-secures of already-owned ground.

The key failure was structural. Suppose player 1 has 34 Presence in Downtown and player 2 has 34 Presence in the adjacent Transit Exchange. Each army can secure its own ground immediately, moving the objective to the other army's zone just as the other player's turn starts. Movement cannot cross beyond the objective. The armies can therefore spend every turn moving the marker back without ever coming into contact. Better attack selection cannot solve a situation with no legal adjacent engagement.

**Breakthrough** fixes that failure: after nonwinning capture, surviving Units and Leaders from the captured zone advance one adjacent zone into the new objective. Wounds and readiness are preserved. Friendly capacity is respected, with earlier-deployed cards advancing first. Overflow and immobile Assets remain behind. There is no additional Presence reward or destruction. Capture now creates contact with the next defensive line.

Ordinary deployment and movement still matter: troops stage on controlled ground, march into the first objective, reinforce after casualties, retreat, and recover from being stranded by a shifted front. Only the force that completes a capture receives the adjacent breakthrough movement.

## Capturing owned ground means repelling the attack

When the defender completes the threshold on their own contested territory, ownership does not change, but they secure that ground and push the objective back one territory. This makes the advancing and retreating frontline symmetric. Both progress tracks reset for the new engagement. Capture can happen even with enemy survivors present; eliminating enemies helps but never substitutes for Presence.

## Readiness and actions are separate limits

All major actions cost one of the default three actions. New units may move immediately, but cannot attack on the deployment turn without Rush. A move normally exhausts the unit; Mobile preserves readiness for its first move each turn. An exhausted defender still retaliates in combat. Guard interception requires readiness and exhausts the intercepting Guard. Reactions and counters use Presence but no major action.

This permits combinations without unlimited turns. Rally spends both an Order and an action; using the readied unit requires another action. The deployment-turn attack restriction continues to apply after Rally.

## Orders and reserves

Action Orders may target any appropriate battlefield card; there is no additional range statistic in this sprint. Counter cancels a defensive Order only, never a Guard. There is at most one response and one counter. Both played Orders stay spent even when canceled.

When an empty deck must draw, the owner's discard/casualties are shuffled into reserves. If no reserves exist, the draw is skipped. This keeps conquest possible across a long seven-zone match without fatigue damage or a separate resource. Order recycling cannot create an infinite turn: it still pays temporary Presence and a major action.

## Capacity and Command

The default Command progression is 20, then +10 on subsequent own offensive turns, capped at 80. Slots default to five per side per territory, including Assets. Committed Presence is always recomputed from the actual field, never cached in the UI. Disrupt is capped at the opponent's currently available Presence, so it cannot create a negative support budget or remove existing units.

These are prototype values exposed in setup. No territory income, kill income, free losing-player bonus, or secondary currency has been added.

## Lore and scope

Starter card names are generic faction battlefield roles. The `unique` property supports future named characters; each player has a reserved `riftwalker` slot with no active ability. Riftwalkers, Instability, hidden units, Infiltrate, and a deck builder remain future work. The baseline AI is for solo testing and rule exercising, not a claim of competitive strength.
