# FRONTLINES — FORGE SPRINT 008
## ARSENAL ECONOMY, COLLECTION & PRESENTATION
### Target Version: v0.9.0

Continue directly from the completed Sprint 7 / v0.8.0 build.

Do not rebuild working systems from scratch.

The primary objective of Sprint 8 is to transform Frontlines from a game where the player simply has access to the complete card pool into a collectible progression game built around:

- Persistent card ownership.
- Starter collections.
- Match-earned currency.
- Card packs.
- Card rarity.
- Pack-opening presentation.
- Duplicate handling.
- Crafting.
- Cosmetic card variants.
- Card mastery.
- Rarity-based visual effects.
- Rarity-based sound effects.
- Background music.
- Collection progression.
- Improved card/UI readability.

This sprint should create the long-term progression loop:

**Learn the game → receive starter collection → build deck → play matches → earn currency → purchase packs → expand collection → discover new strategies → master favorite cards → unlock cosmetic treatments → repeat.**

The collectible system must remain gameplay-first.

Do not introduce:

- Real-money purchases.
- Premium currency.
- Microtransactions.
- Paid loot boxes.
- External payment infrastructure.
- Artificial monetization systems.

All progression in this sprint is earned entirely through gameplay.

---

# 1. SIMULATION POLICY

No large balance simulation is currently authorized.

Do not autonomously run:

- 10,000-match simulations.
- 50,000-match simulations.
- Large automated matchup sweeps.
- Repeated balance simulations.
- Large economy simulations.
- Any other high-volume balance test.

Ryken controls simulation runs.

Normal development testing is expected and allowed, including:

- Unit tests.
- Rules tests.
- Seeded pack tests.
- UI tests.
- Save/load tests.
- Card-effect regression tests.
- Small targeted AI tests.
- Deterministic economy tests.

If a larger simulation would be valuable after Sprint 8 is stable, provide Ryken with an exact request specifying:

- Match count.
- AI difficulty.
- AI profiles.
- Deck pool.
- Factions.
- Archetypes.
- Mirror inclusion.
- Seat swapping.
- Logging requirements.
- Any special rules/settings.

Do not run it unless explicitly authorized.

---

# 2. UI AND CARD READABILITY STABILIZATION

Before layering new rarity and cosmetic effects onto cards, fix the current visual bugs.

Current playtesting has revealed problems including card artwork overlapping or covering rules text.

Treat these as functional bugs.

Audit all card and UI surfaces:

- Cards in hand.
- Cards on battlefield.
- Arsenal.
- Collection.
- Deckbuilder.
- Card inspection.
- Starter deck screens.
- Match setup.
- Pack opening.
- Tooltips.
- Keyword displays.
- Fullscreen.
- Windowed mode.
- Different aspect ratios.
- Smaller supported resolutions.
- UI scaling.

Create consistent card layout rules.

Artwork must have a clearly defined region.

Rules text must have a clearly defined region.

Artwork must never cover rules text.

Rarity effects, cosmetic overlays, badges, frames, particles, or animations must never obscure gameplay information.

Implement robust:

- Text wrapping.
- Long-name handling.
- Long-description handling.
- Dynamic font scaling where necessary.
- Minimum font-size limits.
- Art cropping.
- Overflow protection.
- Layering rules.
- Responsive layouts.
- Consistent padding.
- Safe display zones.

Readability outranks spectacle.

---

# 3. PERSISTENT CARD OWNERSHIP

Players should no longer automatically own every card.

Create a persistent card collection system.

Track at minimum:

- Card ID.
- Faction.
- Rarity.
- Gameplay copies owned.
- Cosmetic variants owned.
- Preferred cosmetic variant.
- Mastery progress.
- Newly acquired status.
- Starter status.
- Pack availability.
- Relevant pack pools.
- Crafting data.

The Arsenal should visually distinguish:

- Owned.
- Unowned.
- Newly acquired.
- Craftable.
- Mastered.
- Cosmetic variants owned.
- Currently unobtainable/future cards.

Players should generally still be able to inspect unowned cards.

Where applicable, display how each card can be obtained.

---

# 4. STARTER COLLECTION

Every fresh profile must begin with enough cards to immediately play Frontlines.

Create a curated starter collection.

Every faction should have enough starting cards to construct at least one legal beginner deck.

Starter cards should:

- Demonstrate faction identity.
- Reinforce tutorial concepts.
- Include useful foundational cards.
- Introduce important keywords.
- Remain viable in normal play.
- Avoid overwhelming beginners.
- Leave meaningful room for collection growth.

Starter decks do not need to be optimized competitive decks.

They must simply be coherent, legal, and enjoyable.

Store the starter collection in centralized data.

Future card changes must not silently break new-player starter decks.

---

# 5. GAMEPLAY CURRENCY

Introduce a gameplay-earned primary currency.

Use a fitting Frontlines term if one exists.

Otherwise use:

**Credits**

Players earn currency through matches.

Rewards may consider:

- Match completion.
- Victory.
- Defeat.
- Tutorial completion.
- First-time progression milestones.
- Achievements.
- Future challenges.

Victories should reward more than defeats, but losing must still provide meaningful progression.

Do not create a system where inexperienced players barely progress.

Prevent obvious exploits such as instantly conceding repeatedly for rewards.

At match end clearly display:

- Currency earned.
- Reward sources.
- New balance.
- Any mastery gains.
- Any other progression earned.

---

# 6. PACK SHOP

Create a dedicated pack shop.

Initial pack ecosystem:

## STANDARD PACK

Cheapest normal pack.

Contains cards across all factions.

Designed for general collection growth.

## FACTION PACKS

Create one for each faction:

- Stonewall Pack.
- Bruiser Pack.
- Syndicate Pack.
- Nightwalker Pack.
- Rogue Pack.

These packs should strongly favor or exclusively contain their selected faction.

They may cost more than Standard Packs due to their targeted nature.

## VETERAN PACK

Higher-cost pack.

Improved odds for Rare+ cards.

## ELITE PACK

Premium gameplay-earned pack.

Higher cost.

Should guarantee at least one elevated-rarity card and provide improved Epic/Legendary odds.

## COMMANDER PACK

Build support for this pack now.

Commanders themselves will arrive in a future sprint.

Eventually it should favor:

- Commander cards.
- Commander-linked cards.
- Commander cosmetics.

Until Commander content exists, keep this pack disabled or clearly marked as future content.

Do not fill it with meaningless placeholder cards.

## RECRUIT PACK

Optional beginner-focused pack.

May favor:

- Useful staples.
- Missing foundational cards.
- Low-rarity deck-building pieces.

Prevent abuse if its pricing is especially generous.

---

# 7. DATA-DRIVEN PACK SYSTEM

All pack behavior should come from centralized pack definitions.

Each pack may define:

- Price.
- Cards per pack.
- Allowed factions.
- Rarity probabilities.
- Guaranteed rarity slots.
- Duplicate behavior.
- Cosmetic variant chances.
- Commander weighting.
- Pity behavior.
- Reveal presentation.

Do not hardcode pack logic across multiple unrelated systems.

Create deterministic seeded testing.

Validate:

- Correct card count.
- Valid cards only.
- Correct faction restrictions.
- Guaranteed rarity behavior.
- Pity behavior.
- Duplicate handling.
- Cosmetic variant generation.

---

# 8. CARD RARITY

Introduce:

**Common  
Uncommon  
Rare  
Epic  
Legendary**

Rarity affects:

- Frames.
- Borders.
- Collection presentation.
- Pack reveals.
- Deployment VFX.
- Attack VFX.
- Audio treatment.
- Cosmetic prestige.
- Mechanical uniqueness where appropriate.

Rarity must NOT simply mean raw power.

Legendary cards should generally be:

- Mechanically interesting.
- Specialized.
- Build-defining.
- Highly flavorful.
- Visually memorable.

Do not make them simply better-stat versions of Common cards.

Commons must remain strategically relevant.

Strong decks should not automatically consist entirely of high-rarity cards.

---

# 9. CENTRALIZED RARITY PRESENTATION PROFILES

Create reusable rarity presentation definitions.

Each rarity profile should support settings for:

- Border.
- Frame.
- Glow.
- Foil intensity.
- Idle animation.
- Pack reveal.
- Deployment VFX.
- Attack VFX.
- Impact effects.
- Audio layers.
- Particle limits.
- Performance tier.

Do not scatter hardcoded rarity checks throughout the project.

Future cards should automatically inherit appropriate presentation from their rarity metadata.

---

# 10. RARITY-BASED DEPLOYMENT AND ATTACK PRESENTATION

Cards should become increasingly expressive as rarity rises.

Effects must remain fast and tactically readable.

## COMMON

Minimal.

- Clean placement.
- Small deployment snap.
- Basic attack motion.
- Simple hit sound.
- Minimal particles.

## UNCOMMON

Slightly enhanced.

- Small entrance accent.
- Better hit feedback.
- Light faction effect.
- More distinct sound.

## RARE

Noticeably premium.

- Short faction-based deployment effect.
- Improved attack presentation.
- More defined impact.
- Subtle animated frame accent.

## EPIC

Strong but controlled.

- Layered particles.
- Animated sheen.
- More distinctive entrance.
- Stronger attack feedback.
- Richer sound design.

## LEGENDARY

Signature treatment.

- Unique or semi-unique deployment animation.
- Premium holographic/frame effect.
- High-quality faction-specific VFX.
- Strong attack impact.
- Signature audio accent.
- Optional subtle battlefield reaction.

Legendary animations should typically remain around fractions of a second to roughly one second.

Do not stop gameplay for long cinematic animations.

---

# 11. FACTION-SPECIFIC PRESENTATION

Rarity should combine with faction identity.

Do not make every Legendary use the same gold explosion.

## STONEWALL

Visual/audio language:

- Heavy armor.
- Shield flashes.
- Locking mechanisms.
- Metallic impact.
- Defensive barriers.
- Deep mechanical audio.

## BRUISER

- Heavy physical impacts.
- Shockwaves.
- Dust.
- Aggressive weapon feedback.
- Violent forward motion.

## SYNDICATE

- Precision.
- Tactical interfaces.
- Target markers.
- Controlled mechanical sounds.
- Coordinated technology.

## NIGHTWALKER

- Distortion.
- Cloaking.
- Glitches.
- Shadows.
- Electronic stealth audio.
- Rapid flicker effects.

## ROGUE

- Sparks.
- Salvaged technology.
- Improvised equipment.
- Rough mechanical effects.
- Unstable but readable presentation.

A Legendary card should still immediately feel like its faction.

---

# 12. AUDIO SYSTEM

Implement reusable layered audio.

Possible layers:

- Base deployment.
- Base attack.
- Base impact.
- Rarity accent.
- Faction accent.
- Signature card sound.
- Interface sound.

Higher-rarity cards should sound richer rather than merely louder.

Do not create excessive repetitive noise.

Add independent volume controls for:

- Master Volume.
- Music.
- UI.
- Card Effects.
- Battlefield Audio.

Add presentation settings:

**Full  
Reduced  
Minimal**

Minimal mode should retain gameplay-relevant feedback while stripping unnecessary spectacle.

---

# 13. BACKGROUND MUSIC SYSTEM

Introduce background music throughout Frontlines.

Music should support the atmosphere without overwhelming card sounds or tactical decision-making.

At minimum support different music states for:

## MAIN MENU

A recognizable Frontlines theme.

Should establish the military/territorial tone of the game.

## ARSENAL / COLLECTION / DECKBUILDER

More restrained background music suitable for longer periods of browsing and building decks.

## PACK SHOP / PACK OPENING

Subtle collectible/progression-oriented music.

Pack opening sounds and rarity reveals must remain audible over the music.

## ACTIVE MATCH

Battlefield music should be atmospheric and energetic without becoming distracting.

Structure the system so future adaptive layers can respond to:

- Frontline position.
- Territory advantage.
- Late-match tension.
- Presence nearing victory thresholds.
- Major card deployments.
- Faction-specific themes.

Initial implementation does not need an extremely complex adaptive soundtrack, but the architecture should support it later.

Use smooth transitions/crossfades between game states.

Tracks must loop cleanly.

Do not use unlicensed copyrighted music.

Use:

- Original music.
- Properly licensed music.
- Royalty-free assets permitted for the project.
- Temporary development music that is clearly replaceable later.

Make track assignment data-driven so music can be replaced without rewriting game logic.

---

# 14. PACK-OPENING EXPERIENCE

Create a dedicated pack-opening presentation.

Suggested flow:

1. Pack appears.
2. Player opens/activates it.
3. Cards appear face-down.
4. Rarity may be subtly foreshadowed.
5. Player reveals individually.
6. High rarity receives stronger presentation.
7. Reveal All is always available.
8. Results summarize all acquisitions.

Suggested rarity reveal escalation:

**Common:** minimal.  
**Uncommon:** small colored accent.  
**Rare:** noticeable glow.  
**Epic:** animated shimmer.  
**Legendary:** holographic/refraction treatment plus signature sound.

Never make long animations mandatory.

Players opening their 500th pack should still be able to move quickly.

---

# 15. DUPLICATES AND CRAFTING

Extra copies need value.

Introduce a crafting resource.

Recommended name:

**Supply**

If a player receives more gameplay copies of a card than can legally be used, excess copies convert into Supply.

Do not destroy usable copies.

Add first-pass crafting if practical.

Example relative crafting tiers:

- Common: cheap.
- Uncommon: low cost.
- Rare: moderate.
- Epic: expensive.
- Legendary: very expensive.

Do not make direct crafting uselessly expensive.

Crafting costs must be data-driven.

---

# 16. RARITY AND COSMETIC VARIANTS ARE SEPARATE

Card rarity describes the gameplay card's collectible rarity.

Cosmetic variant describes the visual copy the player chooses to display.

Example:

A gameplay card may be:

**Rare**

while its cosmetic appearance may be:

- Standard.
- Field-Worn.
- Battle-Hardened.
- Veteran.
- Foil.
- Full-Art.

Cosmetic variants must NEVER alter:

- Stats.
- Presence cost.
- Keywords.
- Abilities.
- Deck legality.

---

# 17. COSMETIC VARIANT SYSTEM

Implement scalable support for:

## STANDARD

Clean default card.

## FIELD-WORN

Light battlefield wear:

- Scratches.
- Dust.
- Fading.
- Light edge wear.
- Minor paint damage.

## BATTLE-HARDENED

Heavy combat history:

- Scorch marks.
- Dents.
- Patched armor.
- Chipped paint.
- Dirt.
- Damage markings.
- Rougher frame treatment.

## VETERAN

Prestige treatment representing extensive use:

- Tally marks.
- Campaign stripes.
- Unit markings.
- Medals.
- Personalized equipment.
- Veteran insignia.
- Subtle unique presentation.

## FOIL / HOLOGRAPHIC

Collectible premium treatment:

- Animated reflective surface.
- Refraction.
- Premium accents.
- Subtle motion.

Keep text readable.

## FULL-ART

Expanded artwork presentation where supported.

Future architecture should support:

- Relic.
- Campaign.
- Event.
- Commander.
- Anniversary.
- Faction Champion.

Do not require every card to immediately have every variant.

Implement representative examples and reusable systems.

---

# 18. CARD MASTERY

Favorite cards should develop a visible history.

Track mastery per gameplay card.

Potential tracked statistics:

- Deployments.
- Matches included.
- Victories.
- Attacks.
- Eliminations.
- Territories influenced.
- Faction-specific actions.

Use mastery milestones to unlock cosmetic variants.

Recommended progression concept:

**Early mastery → Field-Worn**  
**Mid mastery → Battle-Hardened**  
**High mastery → Veteran**

Thresholds must be centralized and tunable.

The fantasy should be:

**The card looks like it survived battles because the player actually used it in battles.**

Mastery should not modify card strength.

---

# 19. COSMETIC SELECTION

Players should be able to choose which owned cosmetic treatment appears.

Support:

- Preferred Variant.
- Standard fallback.
- Optional Random Owned Variant.

Deck legality must ignore cosmetic appearance.

---

# 20. SAVE MIGRATION

Sprint 7 profiles may have unrestricted access to cards.

Handle migration intentionally.

Preserve:

- Custom decks.
- Profile data.
- Preferences.
- Existing progression where possible.

Possible development migration solution:

- Grant starter collection.
- Provide reasonable test currency.
- Preserve deck definitions.
- Mark decks containing unowned cards as incomplete rather than deleting them.

Do not permanently give every future player every card simply because earlier test builds did.

---

# 21. DECKBUILDER COLLECTION INTEGRATION

Update the Deckbuilder.

Show:

- Owned quantity.
- Required quantity.
- Rarity.
- Mastery.
- Cosmetic selection.
- Crafting option.
- Newly acquired status.
- Unowned status.

Prevent players from adding more gameplay copies than they own.

Built-in starter decks must remain usable.

If a template uses cards the player does not own, show acquisition information rather than silently failing.

---

# 22. AI AND SIMULATION COLLECTION BYPASS

Player card ownership must remain separate from card legality.

AI and future balance simulations need unrestricted access to legal cards.

Maintain separate concepts:

**Player Ownership**

**Deck Legality**

**Simulation/Test Access**

Do not require AI to open packs.

Do not allow collection progression to corrupt future balance data.

---

# 23. DATA-DRIVEN ECONOMY

Centralize:

- Match rewards.
- Win rewards.
- Loss rewards.
- Pack prices.
- Pack rarity odds.
- Pity thresholds.
- Duplicate conversion rates.
- Crafting prices.
- Starter collection.
- Mastery thresholds.
- Cosmetic drop rates.
- First-time rewards.

These values should be easy to tune later.

---

# 24. BAD-LUCK PROTECTION

Implement configurable pity protection.

Repeated packs without meaningful rarity upgrades should gradually improve odds or eventually guarantee an elevated rarity.

Exact values should remain tunable.

Track separate pity counters where different pack families require them.

Add deterministic test coverage.

---

# 25. COLLECTION OVERVIEW

Add a polished collection summary.

Possible information:

- Unique cards owned.
- Overall completion.
- Completion by faction.
- Cards by rarity.
- Packs opened.
- Credit balance.
- Supply balance.
- Mastery progress.
- Recently acquired cards.

Keep it visually appealing and simple.

Do not turn it into a spreadsheet.

---

# 26. GAMEPLAY-FIRST RULES

The collectible layer exists to enhance Frontlines.

Avoid:

- Excessive grind.
- Mandatory slow animations.
- Pay-to-win-style rarity design.
- Massive raw-power gaps.
- Overwhelming visual clutter.
- Repetitive loud sound effects.
- Progression that punishes new players.
- Pack opening overshadowing actual matches.

Packs should unlock options.

Mastery should create attachment.

Rarity should create excitement.

Matches must remain the heart of the game.

---

# 27. TESTING REQUIREMENTS

Before Sprint 8 is complete, validate:

- Fresh profiles.
- Starter collections.
- Starter decks.
- Match rewards.
- Win/loss rewards.
- Currency persistence.
- Pack purchases.
- Insufficient funds behavior.
- Pack generation.
- Rarity odds.
- Guaranteed rarity slots.
- Faction restrictions.
- Pity.
- Duplicate conversion.
- Crafting.
- Ownership.
- Deck legality.
- Deckbuilder integration.
- Cosmetic selection.
- Card mastery.
- Cosmetic mastery unlocks.
- Save/load.
- Sprint 7 migration.
- Pack-opening UI.
- Pack-opening skipping.
- Sound settings.
- Music settings.
- Background music state changes.
- Music looping.
- Music crossfades.
- Full effects.
- Reduced effects.
- Minimal effects.
- Fullscreen.
- Windowed mode.
- Supported resolution ranges.
- Long card names.
- Long rules text.
- Artwork overlap.
- Frame overlap.
- Rarity VFX.
- Rarity audio.
- Cosmetic variants.
- Simulator ownership bypass.
- AI deck legality.
- Regression of existing gameplay systems.

Do not run a large balance simulation without explicit authorization.

---

# 28. PRESENTATION QUALITY BAR

Frontlines should remain readable no matter how rare or cosmetically elaborate a card becomes.

At all times the player should be able to identify:

- Card.
- Faction.
- Stats.
- Rules.
- Current state.
- Legal targets.
- Territory.
- Frontline.
- Relevant status effects.

A Legendary should feel prestigious.

A Common should still look professional.

A Foil should shimmer, not blind the player.

A Battle-Hardened card should look damaged, not illegible.

A Veteran should look experienced, not cluttered.

Music should create atmosphere, not compete with gameplay.

---

# 29. DEFINITION OF DONE

Sprint 8 is complete when:

- Card artwork no longer overlaps rules text.
- Card layouts remain stable across supported resolutions.
- Persistent card ownership exists.
- Fresh players receive a curated starter collection.
- Every faction has a legal starter deck.
- Matches award currency.
- Match rewards persist.
- Pack purchasing works.
- Standard Packs work.
- Faction Packs work.
- Veteran Packs work.
- Elite Packs work.
- Commander Pack infrastructure exists.
- Pack odds are data-driven.
- Card rarity exists.
- Commons through Legendaries have distinct presentation.
- Higher rarity produces progressively richer deployment VFX.
- Higher rarity produces progressively richer attack VFX.
- Higher rarity produces progressively richer audio.
- Faction identity affects VFX/SFX.
- Pack opening is satisfying and skippable.
- Duplicate copies have value.
- Supply exists.
- Crafting infrastructure works.
- Rarity and cosmetic variants are separate.
- Standard variants exist.
- Field-Worn exists.
- Battle-Hardened exists.
- Veteran exists.
- Foil/Holographic infrastructure exists.
- Full-Art infrastructure exists.
- Cosmetic variants never modify gameplay.
- Card mastery exists.
- Mastery unlocks cosmetic progression.
- Players can choose cosmetic variants.
- Deckbuilder respects ownership.
- Save migration is stable.
- AI bypasses collection restrictions.
- Simulators bypass collection restrictions.
- Economy values are centralized.
- Pity protection works.
- Collection overview works.
- Background music exists.
- Menu music exists.
- Collection/deckbuilding music exists.
- Match music exists.
- Music loops cleanly.
- Music transitions correctly.
- Music has independent volume control.
- Full/Reduced/Minimal effect settings work.
- Existing gameplay remains stable.
- No unauthorized large simulation has been run.
- v0.9.0 is stable enough for Ryken to playtest.

---

# SPRINT 8 DESIGN PHILOSOPHY

This sprint should make Frontlines feel like the player is building an actual military collection with history.

New players should have enough equipment to fight immediately.

Long-term players should accumulate an Arsenal that reflects what they have played, collected, mastered, and survived with.

A newly opened Legendary should feel exciting.

A Common Rifleman that has fought in one hundred battles should feel meaningful for an entirely different reason.

Cards should become possessions.

Favorite cards should become veterans.

Veterans should visibly carry their history.

Rare cards should sound and feel more impressive when they enter battle.

Music should make the battlefield feel alive.

Pack opening should make new acquisitions exciting without becoming the point of the entire game.

Progression should continuously lead the player back toward another match.

Do not treat this sprint as merely:

**"Add a shop."**

Build the foundation for Frontlines' long-term:

- Collection system.
- Progression.
- Card sets.
- Cosmetic ecosystem.
- Audio identity.
- Content releases.
- Commander system.
- Player attachment.

Once the required implementation is stable, continue using remaining sprint capacity for useful polish including:

- Additional cosmetic examples.
- Better pack presentation.
- Cleaner card layouts.
- Improved rarity animations.
- Better audio layering.
- Background music refinement.
- Collection UX.
- Economy test coverage.
- Accessibility.
- Performance optimization.
- Additional regression testing.

Do not stop at a bare implementation if additional stable improvements can still meaningfully strengthen the sprint.