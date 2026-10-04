# Commander portraits — v1.0.2

Ten individual portraits replace the procedural figures for named, off-lane Commanders. Each uses painted military science-fiction concept art, textured materials, a readable head-and-shoulders silhouette and restrained faction lighting. Card names, rarity, rules and frames remain editable interface elements outside the illustration.

The ordinary 115-card atlas/symbol rendering restored in v1.0.1 is preserved. These named leaders are distinct from deployable Leader cards, which continue to use their existing faction atlas crops.

| Faction | Commander | Visual identity |
| --- | --- | --- |
| Stonewall | The Warden | Silver-haired fortress veteran, broad shield and cyan-lit plate armor |
| Stonewall | The Marshal | Hardened officer, reinforced collar and tactical counterattack display |
| Bruiser | The Breaker | Imposing shock commander, battered armor and hydraulic breaching weapon |
| Bruiser | The Bloodhound | Agile hunter, tracking optic and ember-lit segmented armor |
| Syndicate | The Coordinator | Precision officer, sleek brass-accented armor and targeting lattice |
| Syndicate | The Quartermaster | Logistics officer, modular equipment and gold-lit resource console |
| Nightwalker | The Ghost | Hooded precision operative, narrow silhouette and violet stealth equipment |
| Nightwalker | The Saboteur | Covert engineer, asymmetric electronic warfare kit and interference device |
| Rogue | The Scavenger | Salvage veteran, patched armor and emerald-lit recovery tools |
| Rogue | The Drifter | Mobile wanderer, weathered cloak and route-navigation equipment |

## Source and runtime assets

```text
assets/source/commanders/<commander_id>-portrait-v2.png
assets/source/commanders/portraits-v2.json
assets/cards/commanders/<commander_id>-portrait-v2.webp
scripts/optimize-commander-art.py
```

The built-in **image_gen.imagegen** tool created each portrait separately. The manifest records all ten full prompts, source/runtime paths, SHA-256 hashes, dimensions and encoded byte sizes. Original PNGs are 1254×1254. Runtime WebP files are 768×768, quality 84, encoder method 6, totaling **1,546,886 bytes**. Each stays below 200,000 bytes, and the set stays below 1,600,000 bytes. Preserved PNGs are excluded from the packaged runtime.

The optimization script requires Python with Pillow. Run it from the checkout:

```text
python scripts/optimize-commander-art.py
```

It verifies every source hash before resizing with Lanczos and encoding WebP, checks the asset budgets, then refreshes runtime sizes and hashes. It performs no painting, compositing or procedural replacement of details. Byte-for-byte reproduction depends on using the same Pillow/WebP encoder version.

`FrontlinesArt.commanderGet()` maps each named Commander to its runtime portrait; `commanderHtml()` provides the shared accessible image wrapper. Collection cards, Arsenal choices, detailed briefing and both match panels therefore show the same illustration. Square portraits preserve a central face/torso crop; CSS handles the individual display window without stretching artwork.

## Presentation and checks

Commander-only frames use subdued metallic borders, faction color accents and separate name/rules plates. Collection and inspection display larger portraits. Match controls retain their existing layout, and reduced-motion preferences remain supported. No continuously animated art or new particle system is required.

Tests verify all ten assets, dimensions, unique portrait hashes and byte budgets, the shared renderer, and unchanged ordinary card rendering. The optimization script separately verifies source hashes against the manifest. Browser checks cover portrait loading, bounded art windows, responsive controls and five viewports from 1920×1080 to 390×844. Existing Commander/tutorial mechanics remain the authoritative gameplay; artwork does not alter a Commander’s passive, active or deck legality.

The [general faction art direction](ART-DIRECTION.md) describes the original role atlases and reusable faction palettes. Keep future Commander portraits consistent with those motifs and the full prompts in `portraits-v2.json`. Archive original artwork, optimize a runtime sibling, update the shared lookup and check the portrait at both inspection and match size before release.
