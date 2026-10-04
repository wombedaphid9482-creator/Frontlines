# Arsenal and deckbuilding

Frontlines v0.9.0 retains all 115 cards, 15 archetype templates and five starters under the current sprint7 rules. Fresh players own each legal starter. Normal Play requires owned quantities; AI and War Room retain unrestricted access to legal lists. Rarity and cosmetics do not add deckbuilding restrictions.

## Construction rules

- Exactly **26 cards** from **one faction**.
- At most **four copies** of each regular card and **two copies** of each Leader.
- Unique still means one deployed copy per player; it does not mean one deck copy.
- No neutral or cross-faction cards and no additional type quotas.

These limits preserve all five original starter lists, including four infantry and two Commanders. Deck legality is shared by the Arsenal, live engine and Balance Lab. Composition warnings inform choices; they do not secretly impose extra restrictions.

## Build, save and exchange

Open **Arsenal** from the command menu, `Launch Arsenal.cmd`, or the native **Frontlines → Arsenal** menu. **Deck faction** selects the deck library you are working in. Original starters and presets are read-only; choose **Make editable copy** to save a customizable version without altering the template.

**Browse collection** is independent of deck faction. Explore one faction or all factions without replacing an unsaved deck. Cards from another faction can be inspected but cannot be added. Search matches names, rules, keywords, battlefield roles and strategic metadata; multiple search words must all match. Type and Presence filters are always available. **More filters** adds keyword/effect, role, strategy/design tags, set, Command Action cost and cards already in the deck. Sort by name, cost or type. Active filter chips show why the result set is reduced and can be cleared individually.

Select a card to inspect its artwork, exact rules, keyword definitions, battlefield role and deckbuilding design choice. Flavor text is separated from rules. The **Forge VII** set filter isolates the 35 additions. Larger windows show library, collection and briefing together; compact windows use panel tabs and open a full briefing when a card is selected. Collections and long contents scroll internally while the composition summary and main actions remain visible.

Use the card's **+ / −** buttons or enter a whole-number copy quantity under **Deck contents**. The same shared rules enforce copy and deck-size limits. **Undo cards / Redo cards** reverses card-list edits until the next save or deck switch; it does not change names or strategy declarations. **Ctrl + S** saves an editable deck or draft. Unsaved changes prompt before leaving, and deletion requires confirmation. Search the library by deck name or strategy and filter it to saved decks, original templates or drafts needing repair.

The persistent summary shows total size, legality, average Presence, card types, Heavy/Specialist/Commander counts, five Presence curve buckets and free/paid command distribution. **Card tendencies** counts overlapping strategy tags; one card can contribute to more than one approach. **AI strategy intent** is a separate optional instruction for deck-aware AI. Tag counts never silently choose intent, restrict legal cards or grant bonuses. Hybrid intent uses centralized parent strategies rather than stacking both parents' preference bonuses.

**Export deck** writes lightweight `frontlines-deck-v1` JSON. Import a file or paste JSON to save a separate copy. Malformed structures, unknown factions and files above 100 KB are rejected with a message. A structurally valid list containing unavailable cards, cross-faction cards, too many copies or an illegal size remains an editable saved draft. Play and War Room testing stay disabled until the list is legal; unavailable or cross-faction entries offer **Remove all copies** for repair.

The existing local storage format/key is preserved. Recovery keeps readable drafts, repairs missing names or colliding IDs where possible, and explains unreadable records. **Download recovery data** exports the original stored text. Unreadable library JSON is protected from ordinary saves, and unrelated saves do not erase rejected records. Local storage holds up to 200 decks. Browser/file/Electron libraries are separate origins, so exchange deck JSON when moving between them.

## Starter and hybrid approaches

The original starter and two archetype presets for each faction remain valid starting points. New hybrid templates demonstrate additions without requiring immediate deckbuilding:

| Faction | Hybrid template | Parent strategies |
| --- | --- | --- |
| Stonewall | Fortified Advance | Bastion / Counteroffensive |
| Bruiser | Rolling Breakthrough | Shock Assault / Heavy Breakthrough |
| The Syndicate | Coordinated Removal | Combined Arms / Precision Operations |
| Nightwalker | Planned Exposure | Sabotage / Assassination |
| Rogue | Field Improvisation | Scavenger / Wildcard |

These are candidate strategies for testing. The expansion does not certify their balance or force custom lists into a fixed category. See [Sprint 7](SPRINT-007.md) for card additions, precise Armor/Mark/Reinforce/Adapt rules and design tradeoffs.

## Play and measure

Choose a deck for each faction on match setup. The engine validates and shuffles those exact lists. Rematch uses the same lists even if a saved deck is edited elsewhere. Match reports include the actual list and declared strategy.

Use **Test in War Room** from Arsenal or open **War Room → Quick Matchup**, refresh saved decks and choose both competitors. Illegal drafts cannot run. Player runs use the current `sprint7` game profile and deck-aware AI; **Advanced view** exposes historical profiles and baseline/faction/random policies. Changing profile refreshes its actual cards and template catalog. A saved expansion deck can remain stored while being illegal under an older pool; switching profiles does not erase it. **Tournament** supports selected pools, including same-faction variants, with paired opening seats. The requested count is the total across the complete schedule. Reports retain exact lists for replay even after the local library changes.

The **Decks** result tab shows a deck matchup matrix, archetype rates, composition and frequently played pairs. **Advanced → Compare** imports an older report and can compare two named variants. Pair win associations and final territory change are diagnostic correlations, not evidence that a combination caused victory. Different opponent pools, policies or rules must be considered before drawing balance conclusions.

CLI examples for owner-operated custom-deck experiments:

```text
node scripts/simulate.js --deck-file-a bastion.json --deck-file-b assault.json --count 1000 --balance sprint7 --ai deck --out test-results/custom-duel.json --csv
node scripts/simulate.js --mode matrix --pool stonewall-bastion,stonewall-counteroffensive,bruiser-shock-assault --count 1000 --balance sprint7 --ai deck
```

JSON, standalone HTML and optional CSV exports preserve seed, profiles, cutoffs, rules, deck lists and card metrics. Existing output files are never overwritten. Codex does not run balance batches without explicit authorization. The exact proposed original-pool and expanded-pool 10,000-game requests are in [Sprint 7](SPRINT-007.md#simulation-request--after-the-stable-candidate); each is a separate owner decision.

## Collection integration

Owned/required copies, rarity, mastery, newly acquired status and available treatments appear in Arsenal. Quantity controls cannot add more copies than owned. Existing incomplete templates/imports remain editable and savable; Play explains missing copies, while War Room remains available for any legal list. Open Collection to purchase packs, craft an exact card with Supply or choose an owned cosmetic. The five starters are always included in a fresh grant. Corrupt collection data is preserved with a read-only starter preview and recovery export.
