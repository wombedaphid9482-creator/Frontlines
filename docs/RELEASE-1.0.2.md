# Frontlines v1.0.2 — illustrated Commanders

All ten named Commanders receive individual painted portraits with distinct faces, equipment and faction lighting. Larger Collection and inspection artwork, metallic card frames and clearer name/rules plates give the strategic leaders a premium card treatment. Arsenal choices and match portraits use the same local assets.

This is a presentation patch. Commander abilities, decks, saves, tutorials, economy, AI and combat rules retain the v1.0 behavior. Ordinary cards preserve the original atlas/symbol renderer restored in v1.0.1; all 345 comparisons across 115 cards match the v0.9 renderer, and the five faction atlas files remain unchanged.

[Windows installer](../release/1.0.2/Frontlines-Setup-1.0.2.exe) · [Installation-free app](../release/1.0.2/win-unpacked/Frontlines.exe). Keep the complete unpacked folder together. This candidate is local and unsigned; nothing is published or installed over the owner's copy.

Validation: **298/298 Node tests pass**. Browser presentation checks pass at 1920×1080, 1366×768, 1280×720, 900×600 and 390×844, including all ten loaded portraits, visible battlefield/HUD controls and zero browser errors. The complete 14-lesson tutorial passes at six viewports. Independent review covers all ten portraits at thumbnail size, 30 Commander briefs and all five factions' chooser cards at desktop/tablet/mobile sizes. Short-window chooser actions and nameplates remain visible; catalog/chooser crops retain heads and hoods.

All five packaged native modes pass: shell/tutorial/fullscreen, complete match, Arsenal, War Room and Collection. The War Room completes two smoke fixtures without errors. All **93 packaged runtime files match source**, all **31 frozen Sprint 5 source hashes remain unchanged**, and development/source-art material is excluded from the runtime. No balance changes or large simulation batch form part of this patch.

The installer is **114,609,514 bytes**, SHA-256 `35edc8df70f740badd82d54ab8f621bb9c70f87d3dafcfc85c7e468ac4d3c6ba`. Exact artifact hashes and verification evidence are recorded in the [release manifest](release-1.0.2-manifest.json). A [source checkpoint](checkpoints/sprint9-v1.0.2.zip) preserves the finished build and full-resolution artwork.

The ten runtime portraits total **1,546,886 bytes**, each compressed to 768×768 WebP. Full source PNGs, exact generation prompts and hashes are preserved separately. See the [Commander art pipeline](COMMANDER-ART.md). The [v1.0.1 release](RELEASE-1.0.1.md) and earlier installer/checkpoint files remain preserved.
