# FRONTLINES — FORGE SPRINT 009
## v1.0.0 COMMANDER UPDATE
### Target Version: v1.0.0

Continue directly from the completed Sprint 8 / v0.9.0 build.

Do not rebuild working systems from scratch.

This sprint is the **v1.0.0 milestone**.

Its primary objective is to introduce the **Commander system** as a fully playable, deck-defining feature while also elevating Frontlines’ card presentation to a much stronger final-release standard.

Ryken intends to begin more serious/harder playtesting once Commanders are in the game. Therefore this sprint must not only add Commanders, but also improve the visual identity, card-frame quality, and gameplay presentation enough that the game feels like a real, cohesive base release rather than a prototype with one more mechanic attached.

This is the release where Frontlines should feel like the **complete base game**.

The major pillars are:

- Fully playable Commanders.
- Commander deckbuilding and match integration.
- Commander presentation and progression hooks.
- Greater per-card visual identity.
- Stronger and more premium card borders/frames.
- Slower, clearer, more satisfying deployment presentation.
- Better attack/effect readability and feel.
- Final-release polish suitable for harder playtesting.

---

# 1. SIMULATION POLICY

No large simulation is currently authorized by default.

Do not autonomously run:

- 10,000-match balance simulations.
- 50,000-match balance simulations.
- Large commander-vs-commander sweeps.
- High-volume economy simulations.
- Mass automated balance campaigns.

Ryken controls simulation runs.

Normal development validation is allowed and expected:

- Unit tests.
- Rules tests.
- Integration tests.
- Deck legality tests.
- Targeted AI checks.
- Browser/native presentation tests.
- Small deterministic development checks.

If a post-sprint validation simulation would be useful, provide Ryken an exact request after implementation is stable.

---

# 2. CORE GOAL OF v1.0.0

v1.0.0 should make Frontlines feel complete enough that serious playtesting becomes worthwhile.

That means:

- Every faction has meaningful commander choices.
- Commanders materially change how decks play.
- Commander selection is easy and exciting.
- Commander decks are ready to use immediately.
- Card presentation has improved noticeably.
- Cards are easier to distinguish from each other.
- Borders/frames look higher quality and more premium.
- Deployment and major card presentation finally feel impactful.

Do not treat this as merely:

**“Add commander cards.”**

This is a full **feature-and-presentation milestone**.

---

# 3. IMPLEMENT THE COMMANDER SYSTEM

Each playable deck should be able to select exactly one Commander.

Commanders should sit **outside the normal battlefield lanes**.

Do NOT make them ordinary deployable lane units in this sprint.

The goal is to avoid unnecessary complexity such as:

- Commander positioning rules.
- Commander death rules.
- Commander targeting.
- Commander retreat rules.
- Commander lane occupancy.
- Commander frontline collisions.

Instead, a Commander should function as a deck leader / strategic identity layer.

Each Commander should provide three major elements:

## PASSIVE ABILITY

A persistent rules modifier or strategic incentive.

This should shape how the deck wants to play.

## ACTIVE / COMMAND ABILITY

A once-per-match or otherwise tightly limited activated ability.

This should feel meaningful and signature-worthy.

It should not be trivial or forgettable.

## DECKBUILDING HOOK

A reason for the deckbuilder to care which Commander is chosen.

Examples:

- Rewards specific keywords.
- Encourages a subtype of unit.
- Alters a cost threshold.
- Improves synergy with a strategy.
- Unlocks or strengthens a deck archetype.

Do not make deckbuilding hooks so restrictive that they feel like hard locks unless the design explicitly calls for that.

---

# 4. INITIAL COMMANDER COUNT

Implement **2 Commanders per faction** for the base release.

That produces **10 total launch Commanders**.

This is enough to create meaningful replayability without exploding the balance space.

Required factions:

- Stonewall
- Bruiser
- Syndicate
- Nightwalker
- Rogue

Every faction should end v1.0.0 with two clearly differentiated commander identities.

These commanders should not feel like minor stat reskins.

They should change how the same faction feels in a noticeable way.

---

# 5. RECOMMENDED COMMANDER DIRECTION

Use this direction as the starting design target unless implementation discovers a clearly better version.

## STONEWALL

### The Warden
Focus:
- Holding territory.
- Reinforcement.
- Defensive staying power.
- Endurance.

### The Marshal
Focus:
- Counterattack.
- Punishing failed enemy aggression.
- Defensive conversion into pressure.
- Retaliatory warfare.

## BRUISER

### The Breaker
Focus:
- Frontline advances.
- Breakthrough.
- Aggressive pressure.
- Lane domination.

### The Bloodhound
Focus:
- Hunting weakened units.
- Forced retreats.
- Elimination tempo.
- Finishing pressure.

## SYNDICATE

### The Coordinator
Focus:
- Command/Mark synergies.
- Efficient sequencing.
- Tactical setup and payoff.
- Unit coordination.

### The Quartermaster
Focus:
- Presence efficiency.
- Resource leverage.
- Smart deployment pacing.
- Sustained tactical value.

## NIGHTWALKER

### The Ghost
Focus:
- Concealed/Ambush play.
- Evasion.
- Timing windows.
- Precision setup.

### The Saboteur
Focus:
- Disruption.
- Enemy destabilization.
- Frontline interference.
- Punishing overextension.

## ROGUE

### The Scavenger
Focus:
- Salvage.
- Value from destruction/discard.
- Improvisation.
- Recovered advantage.

### The Drifter
Focus:
- Adaptation.
- Flexible tactics.
- Positioning and tempo shifts.
- Non-linear play patterns.

These names and themes may be refined, but the identity split should remain strong.

---

# 6. COMMANDER ACCESS FOR PLAYTESTING

Ryken wants Commanders in the game and usable **before harder playtests begin**.

Therefore, do not gate the initial launch Commanders behind pack RNG for base-release playtesting.

For v1.0.0, all players should have immediate practical access to the base Commander lineup.

Acceptable implementations include:

- All 10 launch Commanders are granted automatically.
- One or more starter commanders per faction are granted, with the full v1.0 testing set provided to development/playtest profiles.
- Commander acquisition exists structurally, but the launch/testing environment guarantees usability.

The important point is:

**Commanders must be available for serious testing immediately.**

Do not make Ryken grind or gamble to test the core v1.0 feature.

Future post-1.0 commanders can use the collection/pack ecosystem more aggressively.

---

# 7. COMMANDER DECKBUILDING INTEGRATION

Update the Deckbuilder so Commander selection is clean and central.

Required functionality:

- Choose a Commander per deck.
- Display Commander passive/active/deckbuilding hook clearly.
- Show which cards synergize with that Commander.
- Show starter/template decks associated with that Commander.
- Save/load Commander assignment as part of the deck.
- Validate deck legality with Commander data included.

Deck creation flow should become something close to:

**Faction → Commander → Starter Deck / Template → Customize**

This should feel much more guided and satisfying than dumping the player into a huge pool blindly.

---

# 8. COMMANDER STARTER DECKS

Every launch Commander should ship with at least one associated starter/template deck.

That means at least **10 Commander-linked starter/template decks** total.

These decks should:

- Be legal.
- Be coherent.
- Showcase the Commander.
- Be usable immediately.
- Teach the deck’s intended play pattern.

They do not all need to be perfectly optimized competitive lists.

They do need to be strong enough to teach the Commander’s identity.

The player should be able to:

- Play them as-is.
- Duplicate them.
- Edit them.
- Use them as a learning bridge into deckbuilding.

---

# 9. COMMANDER MATCH PRESENTATION

Commanders must feel important.

Add a visible Commander presence in the match UI.

This may include:

- A dedicated Commander panel.
- Commander portrait/bust.
- Passive reminder.
- Active ability button.
- Used/unused active-state indicator.
- Tooltip or inspect panel.
- Command-point or cooldown indicator if needed.

A player should never forget which Commander is leading each side.

The Commander should be a constant strategic presence in the match even though it is not a lane unit.

---

# 10. COMMANDER ABILITY UX

Commander abilities must be easy to understand and activate.

Required UX:

- Clear affordance when an active is available.
- Clear cost/conditions.
- Clear legal targets if targeting is required.
- Clear visual/audio confirmation when activated.
- Clear once-per-match spent state where applicable.
- Clear explanation when activation is unavailable.

Avoid hidden complexity.

Do not make Commander abilities feel like obscure admin tools buried in a submenu.

---

# 11. ENABLE COMMANDER PACK INFRASTRUCTURE PROPERLY

Sprint 8 established future Commander pack support.

Now integrate that infrastructure with live Commander content.

However, because launch testing access matters more than collection gating, do not rely on packs for basic usability.

For v1.0.0:

- Commander Pack support may become active.
- Commander-related cosmetics or future rewards may use it.
- Future commanders may be designed with this pipeline in mind.

But the base commander set must remain readily testable.

---

# 12. DIVERSIFY CARD VISUAL IDENTITY

A major current weakness is that too many cards feel visually similar.

Address this directly.

Every card does not need entirely unique painted illustration quality, but cards should feel more distinct in:

- Silhouette.
- Pose.
- Composition.
- Equipment.
- Costume/armor language.
- Role readability.
- Background treatment.
- Faction visual coding.
- Character posture and attitude.

Two cards from the same faction should still be distinguishable at a glance.

A player should more often be able to think:

**“That’s the heavy one.”**  
**“That’s the stealth assassin.”**  
**“That’s the medic/support.”**  
**“That’s the scavenger unit.”**

rather than seeing multiple cards blur together.

Do not rely only on text to communicate identity.

---

# 13. ESTABLISH STRONGER FACTION VISUAL LANGUAGES

Push each faction’s visual language harder so the card pool becomes easier to parse.

## STONEWALL
Direction:
- Fortified armor.
- Shields.
- Heavy plating.
- Defensive stances.
- Structural confidence.

## BRUISER
- Raw aggression.
- Bulk.
- Forward motion.
- Heavy weapons.
- Offensive momentum.

## SYNDICATE
- Professional military precision.
- Tactical technology.
- Clean uniforms.
- Coordinated elite look.
- Measured discipline.

## NIGHTWALKER
- Stealth.
- Shadow.
- Sleek infiltration gear.
- Ambiguous silhouettes.
- Controlled menace.

## ROGUE
- Salvaged tech.
- Improvised gear.
- Uneven but clever equipment.
- Survivalist ingenuity.
- Adaptable battlefield scavenger energy.

This visual language should affect:

- Card art.
- Frame accents.
- Effects.
- Commander presentation.
- Icons and overlays where relevant.

---

# 14. REDESIGN CARD BORDERS / FRAMES

Current borders/frames feel lackluster.

Upgrade them substantially.

The new border system should feel more premium, readable, and faction-aware.

Improve:

- Overall frame shape language.
- Edge treatment.
- Material feel.
- Rarity prestige.
- Faction accents.
- Frame layering.
- Nameplate styling.
- Stat plate styling.
- Rules text panel separation.
- Art-window integration.

Frames should look more like a finished card game product and less like flat placeholders.

Do not overdesign them to the point that readability suffers.

Borders should help the card feel collectible and polished.

---

# 15. COMBINE RARITY WITH BETTER FRAME DESIGN

The rarity system from v0.9.0 should now benefit from improved art direction.

Required qualities:

## COMMON
- Clean and readable.
- Professional but restrained.

## UNCOMMON
- Slightly more prestige.
- Better accent treatment.

## RARE
- More ornate or visually satisfying.
- Obviously above baseline.

## EPIC
- Premium framing.
- Stronger motion/light treatment.

## LEGENDARY
- Signature-tier frame quality.
- Premium holographic treatment.
- Visibly special without becoming messy.

A Legendary should feel truly exciting to see on the battlefield and in the collection.

But a Common should still look good enough that the overall game feels polished.

---

# 16. SLOW DOWN AND IMPROVE DEPLOYMENT PRESENTATION

Current effects feel too quick and easy to miss.

Rework deployment presentation so card plays feel more satisfying.

Use the following motion philosophy:

## ANTICIPATION → EMPHASIS → IMPACT → SETTLE

A good deployment should feel like:

1. The card is selected/committed.
2. It grows or advances toward the viewer enough to feel emphasized.
3. It slams/lands onto the battlefield with clear impact.
4. It settles quickly into its board state.

Ryken specifically wants something closer to the feel of highly satisfying digital card deployment presentation, where the card visibly comes forward and then lands with impact.

Use that feeling as inspiration.

Do not directly copy another game’s proprietary assets, layouts, or exact animation signatures.

Do capture the satisfying qualities:

- readable anticipation,
- stronger scale-up toward the player,
- clearer landing,
- better impact timing,
- a more memorable card-entry moment.

Deployment should feel like the card actually **arrived**.

---

# 17. TARGET DEPLOYMENT TIMING

Effects should remain brisk enough for actual play, but not so fast that they disappear.

Suggested target direction:

- Common deployment: short but visible.
- Rare/Epic/Legendary deployment: clearly noticeable.
- Commander-related plays: especially readable.

Do not create long unskippable cinematics.

But do increase timing enough that a human player can actually appreciate the presentation.

A useful guiding principle:

If the player cannot perceive the effect, it is too fast.

---

# 18. IMPROVE ATTACK / IMPACT PRESENTATION

Deployment is not the only place where clarity matters.

Rework attack and impact presentation so it is:

- More readable.
- More satisfying.
- More distinguishable by unit/card identity.
- Better paced.

Add clearer sense of:

- wind-up,
- delivery,
- impact,
- result.

Different unit classes and factions should not all feel identical when attacking.

A heavy Bruiser strike should not feel the same as a Nightwalker precision attack.

---

# 19. MAKE EFFECTS MORE LEGIBLE WITHOUT CLOGGING THE BOARD

While improving effects, preserve tactical readability.

The goal is not chaos.

The goal is clearer, more emotionally satisfying battlefield feedback.

Guidelines:

- Increase readability, not clutter.
- Effects should reinforce what happened.
- Major actions deserve better presence.
- Minor repeated actions should remain concise.
- Strong VFX should not hide stats, targets, or state information.

---

# 20. COMMANDER PRESENTATION SHOULD FEEL SPECIAL

Commander deployment/selection/activation needs extra identity.

When a Commander is chosen or introduced:

- Show a dedicated intro or reveal moment.
- Present the Commander portrait/name clearly.
- Surface the passive in a memorable way.
- Make activation feel distinct from ordinary card play.

A Commander should feel like a named leader, not just another metadata tag.

This can include:

- commander banner treatment,
- portrait reveal,
- stronger audio cue,
- brief faction-themed intro motion.

Keep it concise, but notable.

---

# 21. COLLECTION / ARSENAL / COMMANDER PRESENTATION

Update non-match interfaces to support the Commander release.

Required areas:

- Collection.
- Arsenal.
- Deckbuilder.
- Match setup.
- Commander selection screen.
- Pack/shop interface where relevant.
- Profile/progression summary if appropriate.

Players should be able to:

- Browse Commanders cleanly.
- Understand what each Commander does.
- See faction and role identity.
- See related cards or synergies.
- Choose Commander-specific decks easily.

---

# 22. COMMANDERS AND COLLECTION RULES

Integrate Commanders cleanly with the collection system.

For v1.0.0 base commanders:

- ensure availability for playtesting,
- preserve collection data architecture,
- allow future commander ownership expansion later.

Possible implementation approaches are acceptable so long as launch usability is not harmed.

If Commanders have rarity, do not let that interfere with immediate playtesting access.

Commanders can still participate in:

- future pack systems,
- cosmetics,
- future mastery,
- future unlocks.

But v1.0.0 should prioritize functionality and testing readiness.

---

# 23. OPTIONAL COMMANDER COSMETIC HOOKS

If practical, prepare the architecture for Commander cosmetics.

This can include support for:

- alternate portraits,
- commander frames,
- commander badges,
- mastery trim,
- commander-specific foil treatments.

Do not let this delay the main feature.

Foundation is enough if time is limited.

---

# 24. AUDIO / MUSIC EXTENSIONS

Extend the audio system to support Commander identity and improved presentation.

This may include:

- Commander intro stingers.
- Commander activation sounds.
- Stronger deploy impact sounds.
- Heavier slam/land audio.
- Better attack impacts.
- Slightly more dramatic rare-card presentation.
- Music transitions where appropriate.

The music/effect mix must remain readable.

Do not drown the game in noise.

---

# 25. CARD-BY-CARD POLISH PASS

Perform a targeted polish pass on the most visually weak or repetitive cards.

Prioritize cards that:

- look too similar to another card,
- lack strong identity,
- have weak silhouette,
- feel visually bland,
- fail to match faction identity,
- look inconsistent with the improved border/frame direction.

Do not spend all effort evenly if some cards already read well.

Focus on the cards that most improve the game when upgraded.

---

# 26. AI AND COMMANDERS

Update AI to handle Commander selection and Commander ability usage competently.

AI should understand:

- its own Commander plan,
- major synergies,
- when to hold/use its active,
- obvious timing windows,
- core deck identity.

Difficulty should continue to come from decision quality rather than hidden cheating.

At minimum the AI must not waste Commander abilities randomly.

---

# 27. BALANCE EXPECTATION

The Commander Update will naturally increase balance complexity.

Do not attempt to achieve perfect competitive balance in the same sprint at the cost of finishing the feature well.

Instead:

- make commanders function correctly,
- make them strategically distinct,
- avoid obvious broken interactions,
- avoid obviously dead/useless commanders,
- preserve faction identity.

The goal is a strong, testable launch state for hard playtesting.

---

# 28. TESTING REQUIREMENTS

Before declaring v1.0.0 complete, validate at minimum:

- Commander selection.
- Commander persistence in deck saves.
- Commander starter decks.
- All ten launch commanders.
- Commander passive behavior.
- Commander active behavior.
- Commander deckbuilding hooks.
- Commander UI visibility.
- Commander ability availability/usage/exhaustion.
- AI commander usage.
- Match setup integration.
- Collection/Arsenal commander browsing.
- Ownership/access behavior.
- Existing deckbuilder functionality.
- Existing collection economy stability.
- Existing pack behavior.
- Existing mastery behavior.
- Existing music/effects settings.
- Full/Reduced/Minimal presentation settings.
- Presentation timing changes.
- Card frame/border readability.
- Card art distinctiveness regressions.
- No art/text overlap.
- Small supported resolutions.
- Fullscreen/windowed.
- Browser/native smoke tests.
- Save/load and migration from v0.9.0.

Do not run large simulations without explicit authorization.

---

# 29. v1.0.0 QUALITY BAR

This release should feel like the first true “complete” version of Frontlines.

Players should feel:

- commanders matter,
- decks have identity,
- cards look more distinct,
- the borders look better,
- the battlefield presentation is more satisfying,
- major plays have weight,
- the game is ready for serious testing.

If a card hits the board, the player should actually feel that it hit the board.

If a commander is chosen, the player should feel that a leader is defining the match.

If two cards are different, they should look meaningfully different.

---

# 30. DEFINITION OF DONE

Sprint 9 / v1.0.0 is complete when:

- The Commander system exists and is fully playable.
- Each deck can select one Commander.
- Two Commanders exist for each faction.
- Ten total launch Commanders exist.
- Commanders materially change deck play patterns.
- Commanders have passive abilities.
- Commanders have active abilities.
- Commanders have deckbuilding hooks.
- Commander starter/template decks exist.
- Commander UI exists in deckbuilder and match flow.
- Commanders are available for immediate serious playtesting.
- AI can use commanders sensibly.
- Cards have stronger visual differentiation.
- Faction visual identity has been pushed further.
- Card borders/frames are noticeably improved.
- Rarity frames feel more premium.
- Deployment presentation is slower, clearer, and more satisfying.
- Card deployment has a more impactful grow-forward / slam-down feel.
- Attack/impact presentation is improved.
- Effects remain readable.
- Audio supports the improved presentation.
- Existing v0.9.0 systems remain stable.
- Save migration from v0.9.0 works.
- v1.0.0 is stable enough for Ryken to begin harder playtesting.

---

# SPRINT 9 / v1.0.0 DESIGN PHILOSOPHY

This release is where Frontlines becomes the version that Ryken can meaningfully stress-test.

Commanders should create identity.

Card frames should create pride.

Card art should create recognition.

Deployment should create impact.

The player should not simply see a card appear.

They should feel it enter the battle.

The player should not merely assign a commander in the deckbuilder.

They should feel like they chose the leader of the operation.

The goal is not maximal spectacle for its own sake.

The goal is readable, satisfying, faction-rich presentation that makes the strategy game feel more alive and more premium.

Build the version of Frontlines that Ryken can now play hard, critique honestly, and refine more slowly after Commanders arrive.

Once the required work is stable, use remaining sprint capacity for:

- Commander tuning,
- additional frame polish,
- additional card differentiation,
- effect timing refinement,
- stronger commander UX,
- attack feedback improvements,
- better deck templates,
- additional presentation cleanup,
- and other stable improvements that strengthen v1.0.0 as a base-game milestone.

Do not stop at a bare implementation if additional stable polish can meaningfully improve the first true full release.
# Additional owner requirement — Tutorial Integration

Commanders must be explicitly taught before the player completes the full tutorial. The player must select or be assigned a Commander, see the Commander panel, understand the passive ability, activate the Commander active in a guided/scripted situation, and receive an explanation of Commander choice in deckbuilding and playstyle. Tooltips alone are insufficient.
