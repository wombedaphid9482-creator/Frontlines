# Arsenal and deckbuilding

All 80 gameplay cards are available immediately. There are no unlocks, packs, accounts or rarity limits.

## Construction rules

- Exactly **26 cards** from **one faction**.
- At most **four copies** of each regular card and **two copies** of each Leader.
- Unique still means one deployed copy per player; it does not mean one deck copy.
- No neutral or cross-faction cards and no additional type quotas.

These limits preserve all five original starter lists, including four infantry and two Commanders. Deck legality is shared by the Arsenal, live engine and Balance Lab. Composition warnings inform choices; they do not secretly impose extra restrictions.

## Build, save and exchange

Open `Launch Arsenal.cmd`, the Arsenal link in game setup, or the desktop application's Frontlines → Open Arsenal menu. Pick a faction and inspect its original starter or either archetype preset. Builtins remain available unchanged; make an editable copy to customize one. Search, filter by type, Presence, role or keyword, and sort by name, cost or type. Select a card to inspect the portrait, full rules, keyword explanations and separate flavor text.

The editor shows copies, total size, average Presence, card types, Heavy/Specialist counts and five Presence curve buckets. Save multiple named decks, duplicate variants, rename them and confirm deletions. Strategy intent is an optional declaration for deck-aware AI; it never changes legality or grants bonuses.

Export Deck writes lightweight `frontlines-deck-v1` JSON. Import from a file or paste JSON. Malformed structures, unknown factions, excessive files and invalid IDs are rejected with messages. A structurally valid deck with missing cards or an illegal size can remain a saved draft. Updates never silently remove an illegal deck; repair its explained errors before play. Local storage holds up to 200 decks; storage failures offer export as a recovery path. Browser/file/Electron libraries are separate origins, so use export/import when moving between them.

## Play and measure

Choose a deck for each faction on match setup. The engine validates and shuffles those exact lists. Rematch uses the same lists even if a saved deck is edited elsewhere. Match reports include the actual list and declared strategy.

In Balance Lab, refresh saved decks and choose both competitors. Illegal drafts are excluded. Use Deck-aware AI to evaluate the declared strategy, or compare against baseline/faction/random policies. Matrix mode supports a selected deck pool, including same-faction variants, with paired opening seats. The total match count is across the complete schedule. Reports retain explicit lists and can reproduce a match after a local library changes.

Decks & pairs shows a deck matchup matrix, archetype rates, composition and frequently played pairs. Compare imports an older report and can compare two named variants. Pair win associations and final territory change are diagnostic correlations, not evidence that a combination caused victory. Different opponent pools, policies or rules must be considered before drawing balance conclusions.

CLI examples:

```text
node scripts/simulate.js --mode matrix --pool archetypes --count 1000 --balance arsenal --ai deck --seed 20261004 --out test-results/arsenal.json --csv
node scripts/simulate.js --deck-file-a bastion.json --deck-file-b assault.json --count 1000 --balance arsenal --ai deck --out test-results/custom-duel.json
node scripts/simulate.js --mode matrix --pool stonewall-bastion,stonewall-counteroffensive,bruiser-shock-assault --count 1000 --balance arsenal --ai deck
```

JSON, standalone HTML and optional CSV exports preserve seed, profiles, cutoffs, rules, deck lists and card metrics. Existing output files are never overwritten.
