# Sprint 12 legacy artwork audit

Reviewed build: **Frontlines v1.0.4**. Scope: all **115 legacy battlefield cards** plus **ten Commander benchmarks**. The separate Tactical Arsenal audit owns the other 40 cards. This is the before-state record; it does not claim the art gate is complete.

## Main finding

The five original painted atlases remain strong source art. Their 20 quadrants are native 512×512 pixels; 19 are used across 76 Unit/Leader mappings. The runtime Collection centers these square images vertically in a 31% artwork window, cutting every unit down to a torso/equipment fragment. All 76 receive **rendered grade D for severe cropping**, while their painted **source quality remains A**. Preserve the sources and repair framing.

The other **39 legacy cards**—31 Orders and eight Assets—use monochrome rule symbols rather than illustrated actions or equipment. They receive **D for placeholder composition** and need painted scene replacements. No missing or undecodable image was found.

All **ten Commanders are A** and must retain their high-resolution PNG sources and 768px runtime WebPs. Their detail, lighting and faction silhouettes establish the finish benchmark.

## Method and evidence

All 115 cards were rendered from the actual v1.0.4 `Art.html` output and runtime Collection CSS as 200×280 faces, preserving 5:7. Unowned dimming was removed only in the evidence sheets to separate artwork quality from ownership states. Every faction sheet, the five atlas sources and all ten Commander portraits were visually inspected. No gameplay, balance or runtime-art mutation occurred.

- [Full source atlas benchmark](sprint12-before/legacy-atlas-benchmarks.png)
- [Commander benchmark](sprint12-before/commander-benchmarks.png)
- [stonewall — all 23 legacy card faces](sprint12-before/legacy-stonewall-faces.png)
- [bruiser — all 23 legacy card faces](sprint12-before/legacy-bruiser-faces.png)
- [syndicate — all 23 legacy card faces](sprint12-before/legacy-syndicate-faces.png)
- [nightwalker — all 23 legacy card faces](sprint12-before/legacy-nightwalker-faces.png)
- [rogue — all 23 legacy card faces](sprint12-before/legacy-rogue-faces.png)
- [Per-card grades, exact duplicates, source hashes and crop coordinates](SPRINT12-ART-AUDIT-LEGACY.json)
- [39 exact Order/Asset scenes and spare-cell recommendations](SPRINT12-LEGACY-ART-PROMPTS.json)

## Crop and reuse policy

Extract original quadrants at **512×512**, without upscaling or destroying their original atlases. In short landscape art windows, top-anchor the uniformly scaled square (`50% 0%`). Do not center it vertically. Broad inspection windows can use cover cropping with the recorded face focal region; no independent X/Y scaling. Every runtime context still needs verification after implementation.

There are 19 exact compositions for 76 named painted cards; the biggest shared group serves eight Bruiser units. The audit records every duplicate, rather than pretending shared imagery is bespoke A identity. After crop repair, 64 cards can be accepted as **B shared-role paintings**. Twelve require a role-fit repair before acceptance. Common role reuse is explicitly an interim B decision, not permission to ignore missing equipment.

## Twelve role-fit repairs

| Card | Current mismatch | Recommended repair |
| --- | --- | --- |
| Shield Defender (`stonewall_defender`) | Shield Defender is mapped to the rifle portrait, which has no shield; it repeats Line Rifle Squad instead of reading as the named defensive role. | Remap to the existing strong Stonewall heavy/shield crop after extraction; preserve the rifle source. |
| Field Medic (`stonewall_medic`) | Field Medic uses the same tactical-slate specialist as scout/engineering roles; no medical kit or treatment equipment identifies its healing role. | Use a spare painted atlas cell for a Stonewall field medic with a compact stabilizer and medical case; related medical variants may share that approved composition at B grade. |
| Plate Medic (`stonewall_plate_medic`) | Plate Medic exactly repeats the ordinary tactical-slate specialist; neither medical equipment nor reinforced medical armor differentiates its healing role. | Reuse the approved Stonewall armored-medic scene with a distinct safe crop if readability remains good; do not recolor a flat vector. |
| Recovery Column (`stonewall_recovery_team`) | Recovery Column repeats the tactical-slate specialist; its central equipment does not indicate mobile recovery or treatment. | Use the approved field-medic crop or a spare scene showing practical recovery kit, preserving faction armor. |
| Scarred Brawler (`bruiser_brawler`) | Scarred Brawler repeats the standard rifleman; its main visible equipment is a rifle rather than the intimidating close-range physical role named by the card. | Use a spare Bruiser cell for a scarred close-range shock fighter with hydraulic gauntlets and reinforced bracing. |
| Surge Drummers (`bruiser_surge_drummers`) | Surge Drummers repeats the officer portrait and depicts no rhythm/signal equipment; the named coordinated assault support is absent. | Use a spare Bruiser cell for an armored signal drummer with practical mechanical percussion/signal equipment, avoiding novelty fantasy styling. |
| Tactical Recovery Team (`syndicate_tactical_medic`) | Tactical Recovery Team repeats the sensor-tablet observer; no medical equipment communicates its healing role. | Use the spare Syndicate cell for a professional armored recovery specialist with a medical case; the medical support cards may share this B-quality role art. |
| Tactical Patch Team (`syndicate_patch_team`) | Tactical Patch Team repeats the sensor-tablet observer; healing and protective field care are not visually differentiated from reconnaissance. | Share the approved professional medical-support scene with a distinct crop where practical. |
| Contract Eliminator (`syndicate_eliminator`) | Contract Eliminator repeats the tablet/drone observer; its selective lethal attack role has no primary rifle silhouette. | Remap to the existing Syndicate heavy crop containing a professional scoped rifle; the strong original source is sufficient. |
| Silent Blade (`nightwalker_blade`) | Silent Blade repeats the seated technology specialist with a pistol and hologram; no blade or active close-range assassination silhouette is visible. | Use the spare Nightwalker cell for a masked blade operative; centered readable weapon silhouette and low-light violet identity. |
| Ghost Marksman (`nightwalker_marksman`) | Ghost Marksman repeats the pistol/hologram specialist instead of a long-range weapon; the existing unused upper-right atlas tile already has a scoped rifle. | Remap to the strong unused Nightwalker heavy/scoped-rifle tile, without regenerating or discarding its source. |
| Improvised Lancer (`rogue_lancer`) | Improvised Lancer repeats the conventional riflewoman; its name suggests a custom penetrating weapon that the existing standard rifle does not distinguish. | Use a spare Rogue cell for an asymmetric custom long penetrating weapon and patched field gear; practical military improvisation rather than a fantasy knight. |

## Raster replacement strategy

Generate twelve coherent **2×2 legacy scene batches** for the 39 symbol cards (two Stonewall, two Bruiser, three Syndicate, three Nightwalker and two Rogue), alongside ten Tactical Arsenal batches. The reviewed 1,254px pilot supplies native 627×627 cells, a clear improvement over crowded 3×3 cells. Preserve the complete generated masters, extract each square cell once and encode optimized WebP runtime files at genuine source resolution. Audit actual cell dimensions before selecting a runtime size; do not inflate a low-resolution cell and call it sharp. Store explicit stable card-ID mappings and per-cell source provenance.

Orders show their **action or event**. Assets show their **physical equipment, fortification or infrastructure**. Units retain readable combatants. Commanders retain premium portraits. The common style and per-card scenes in the prompt manifest enforce these differences without adding UI text or glyphs to the artwork.

Use spare atlas cells for medical-support specialists, a Nightwalker blade operative and a Rogue custom lancer. Give the Bruiser brawler and signal drummer their own separate cells, using an additional role batch if needed rather than dividing one cell between two unrelated subjects. Three mismatches already have strong compatible source tiles: Shield Defender → Stonewall shield-heavy; Contract Eliminator → Syndicate scoped-rifle heavy; Ghost Marksman → the unused Nightwalker scoped-rifle heavy. These repairs need no extra generation call.

Keep original painting sources, original Commander files, stable card IDs, original faction palettes and the canonical 5:7 frame. The audit has run **zero full matches and zero large simulations**. After replacement/framing, record actual after grades and contact sheets before marking the art gate complete.

## Framing-only checkpoint

The first safe repair has now been visually reviewed on all five newly captured faction sheets. **All 76 painted unit/leader heads are restored**, and all original atlas and Commander runtime hashes remain unchanged. Current legacy grades at this intermediate checkpoint are **64 B, 12 C, 39 D**. The 39 symbol cards still require scene replacements, and the 12 role mismatches still require the recommended compatible crop or new-role imagery. The complete art quality gate remains open.

- [stonewall — framing repaired, original paintings preserved](sprint12-framing/legacy-stonewall-faces.png)
- [bruiser — framing repaired, original paintings preserved](sprint12-framing/legacy-bruiser-faces.png)
- [syndicate — framing repaired, original paintings preserved](sprint12-framing/legacy-syndicate-faces.png)
- [nightwalker — framing repaired, original paintings preserved](sprint12-framing/legacy-nightwalker-faces.png)
- [rogue — framing repaired, original paintings preserved](sprint12-framing/legacy-rogue-faces.png)

## Completed legacy after review

All **115 actual legacy card faces** have now been reviewed after artwork replacement and framing repair: **115 B, zero C/D**. The original before grades and the framing-only checkpoint remain above and in the JSON; they have not been rewritten.

The review accepts **64 preserved shared-role paintings** and **51 refined legacy mappings**: 39 real painted Order/Asset scenes plus twelve equipment-role repairs. Three compatible repairs reuse exact strong original atlas quadrants. Three Stonewall medical-support cards share a coherent new armored-medic illustration. Shared artwork remains documented as B rather than being described as bespoke A art.

The first after pass caught faces cropping too low on Scarred Brawler, Surge Drummers and Improvised Lancer. Their safe cover focal points are now **10%, 20% and 10% vertically**, respectively. The final Bruiser and Rogue sheets were recaptured and manually reviewed, retaining faces and identifying equipment without stretching or changing source pixels.

All five original atlases, ten Commander runtime portraits and ten preserved Commander PNG masters remain byte-for-byte unchanged. Commander quality remains **A**. The optimized replacements are genuine **512×512 WebPs**, downsampled uniformly from native627px atlas cells or the1254px standalone drummer master; no source was enlarged.

- [legacy-stonewall — reviewed final faces](sprint12-after/legacy-stonewall-faces.png)
- [legacy-bruiser — reviewed final faces](sprint12-after/legacy-bruiser-faces.png)
- [legacy-syndicate — reviewed final faces](sprint12-after/legacy-syndicate-faces.png)
- [legacy-nightwalker — reviewed final faces](sprint12-after/legacy-nightwalker-faces.png)
- [legacy-rogue — reviewed final faces](sprint12-after/legacy-rogue-faces.png)

Root has now independently accepted the complete **155-card visual gate** after the separate40-card Tactical and all-context reviews. No complete match or large simulation was run during this art-only work.
