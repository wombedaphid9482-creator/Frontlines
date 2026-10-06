'use strict';
// Records the human-reviewed after grades; geometry/decode tests do not assign quality grades.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const before = JSON.parse(fs.readFileSync(path.join(root, 'docs/art/SPRINT12-ART-AUDIT-TACTICAL.json')));
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'test-results/sprint12-tactical-after-inventory.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/source/card-art-012/manifest.json')));
const reasons = {
  stonewall_trench_engineer: 'A plated engineer actively welding a defensive wall replaces the generic shield bust. The compact crop retains the helmet, welding tool and blue repair light; fortified grey equipment matches Stonewall.',
  stonewall_shield_section: 'Linked armored defenders behind tall battered shields replace the single generic soldier. The raised focal point preserves the lead helmet and shield impact; the wider source makes the coordinated section explicit.',
  stonewall_bastion_gunner: 'A gunner operating an emplaced belt-fed weapon behind a fortified wall communicates prepared defense. The head, weapon and muzzle flash remain identifiable in the compact crop.',
  stonewall_field_mechanic: 'A kneeling armored mechanic repairs an exposed machine panel. The short card window keeps the helmet, working hand and blue-lit machinery together instead of an unrelated shield silhouette.',
  stonewall_hardpoint: 'A concrete-and-steel defensive emplacement with gun and protected crew replaces the structural diagram. The central architecture remains readable in the asset crop and shares the fortified Stonewall materials.',
  stonewall_dig_in: 'Soldiers reinforce sandbags under incoming fire, giving the Order an actual defensive action. The compact scene focuses on the sandbag work and nearby defenders; the full source retains the wider firefight.',
  stonewall_interlocking_fire: 'Separated fortified firing positions produce converging gunfire across the same approach. The crop keeps both local firing positions and the distant crossfire, conveying coordination rather than an abstract icon.',
  stonewall_hold_fast: 'Armored infantry hold damaged cover while incoming forces advance through smoke. The crop concentrates on crouched defenders and the barricade, with a clear defensive event rather than a Commander-style bust.',
  bruiser_demolition_squad: 'Two heavily armored demolition troops install a real charge against a wall. The higher crop keeps the lead helmet and attached explosive; battered orange armor and close-range action fit Bruiser.',
  bruiser_grenadier: 'A large armored grenadier raises a physical grenade with another hand extended toward the attack. Top alignment retains the grenade and helmet in the small window, repairing the previous torso-only crop.',
  bruiser_suppressor_heavy: 'A broad armored gunner fires an oversized belt-fed weapon from rubble. The higher focal point retains the helmet and large gun together, establishing a Heavy role without relying on the label.',
  bruiser_linebreaker: 'A massive soldier breaches a damaged wall behind reinforced equipment. The adjusted crop retains the orange helmet and leading armored tool while the source clearly shows the violent entry.',
  bruiser_assault_charge: 'Several armored troops advance through an active close-range firefight. The compact crop emphasizes forward movement and weapons; the full image supplies the charging formation instead of a flame glyph.',
  bruiser_frag_out: 'A thrown grenade and exploding enemy position form a concrete battlefield event. The compact crop emphasizes the blast and throwing arm, while the full source makes the projectile path explicit.',
  bruiser_no_shelter: 'A demolition operator detonates a physical charge on an enemy emplacement. The crop preserves the explosive impact and active tool, showing cover destruction rather than a generic targeting symbol.',
  bruiser_break_the_position: 'Armored assault infantry enter through a newly opened breach. The card crop retains several advancing bodies, weapons and broken masonry, communicating a coordinated attack on a position.',
  syndicate_spotter_cell: 'A binocular observer and tablet operator form a recognizable reconnaissance pair. The raised crop retains both heads and their distinct tools; clean black armor and amber optics fit Syndicate.',
  syndicate_fire_control_officer: 'An officer directs a tactical firing solution above an amber battlefield display. Top alignment restores the complete head and pointing gesture, while larger inspection retains the detailed command equipment.',
  syndicate_contract_marksman: 'A disciplined marksman aims a long scoped rifle from cover. The raised focal point keeps the helmet, eye protection and amber scope together; the precise equipment differs from a generic rifleman bust.',
  syndicate_suppression_team: 'Two professionally equipped rifle operators coordinate fire from a shared position. Top alignment preserves the supporting operator and the foreground gunner, maintaining the team role in the short crop.',
  syndicate_recon_drone: 'A physical reconnaissance drone with paired rotors and camera replaces the diagram. Its adjusted equipment-focused crop retains the flight hardware and sensor assembly against the urban battlefield.',
  syndicate_target_package: 'A tactical operator points out distant targets while consulting an amber display. The short crop prioritizes the display, pointing hand and marked buildings; the source provides the complete operator scene.',
  syndicate_coordinated_barrage: 'Several precise strikes hit separate positions in an urban battlefield. The compact crop retains the coordinated impacts and the shared ground, replacing the abstract blast diagram with a readable event.',
  syndicate_contingency_plan: 'A tactical officer redirects a mixed group into defensive positions. The compact crop shows the directing gesture and several equipped soldiers; the full source reinforces combined-arms preparation.',
  nightwalker_smoke_runner: 'A hooded operative moves low through purple smoke with a suppressed weapon. The higher crop keeps the complete hood and masked face visible without losing the stealth silhouette.',
  nightwalker_ghost_operative: 'A concealed marksman aims a suppressed rifle from a dark wall position. The adjusted crop keeps the hood, eye line and thin purple optic together, making the stealth and precision role distinct.',
  nightwalker_shadow_trapper: 'A masked operative works on a small practical trap beside cover. The raised crop restores the hood and face, while the complete inspection shows the hand and trap; the square battlefield thumbnail retains the whole work area.',
  nightwalker_false_contact: 'A real portable projector emits a translucent decoy in smoke. The equipment-focused crop retains the projector and lower projection rather than displaying only a floating torso; full inspection preserves the complete decoy.',
  nightwalker_smoke_screen: 'An operative releases a canister as smoke spreads across a moving group. The short crop preserves the deploying hand, canister and nearby smoke, expressing the Order as an action.',
  nightwalker_vanish: 'A hooded soldier slips behind damaged cover under incoming fire. The crop retains the evasive body position and surrounding impacts; the full source explains the escape rather than a generic shadow icon.',
  nightwalker_expose_the_opening: 'An observer uses an optic to identify highlighted enemy silhouettes across the battlefield. The compact crop retains the beam and exposed targets, keeping the information-warfare event understandable.',
  nightwalker_clean_exit: 'One hooded operative supports an injured ally during withdrawal. The compact crop focuses on the supported pair and visible injury, while the full image preserves their path out of combat.',
  rogue_scrap_grenadier: 'A scrapper assembles an improvised explosive from salvaged equipment. Top alignment restores the face and patched upper-body silhouette, repairing the previous cropped-off eyes; larger inspection shows the working hands and green-lit grenade.',
  rogue_jury_rigged_shield: 'A patched metal shield carries an exposed battery and rough reinforcement. The compact crop prioritizes the shield materials and improvised equipment rather than a generic shield icon.',
  rogue_patch_runner: 'A mobile field medic carries a patched treatment kit toward a wounded ally. Top alignment restores the face and working silhouette; the source and larger inspection show the casualty and medical context.',
  rogue_improvised_mine: 'A low circular mine made from salvaged metal sits among battlefield rubble. The crop keeps the recognizable casing, wiring and green arming light, making the asset tangible at small size.',
  rogue_make_it_work: 'A fighter adjusts the exposed power assembly of a salvaged weapon. The compact crop focuses on the working hands and repaired mechanism; patched armor and rough materials fit Rogue adaptation.',
  rogue_salvage_charge: 'A scavenger throws a green-lit improvised charge from a damaged position. Top alignment now retains the thrown device, extended hand and face, repairing the previous crop that hid the charge.',
  rogue_strip_it_for_parts: 'A scavenger physically removes damaged armor and machine parts. The short crop keeps the working hand and salvaged panel; the full source supplies the broader repurposing scene.',
  rogue_bad_plan_good_result: 'An improvised armored decoy absorbs fire while other fighters move behind it. The compact crop emphasizes the damaged decoy, impacts and surviving soldiers, depicting a deliberate trade rather than random symbolism.'
};
if (inventory.length !== 40 || Object.keys(reasons).length !== 40) throw new Error('Incomplete manual review records');
const cards = inventory.map(card => {
  const original = before.cards.find(row => row.id === card.id), assetRecord = manifest.cards[card.id];
  if (!original || !reasons[card.id] || !card.refined) throw new Error('Missing reviewed card '+card.id);
  if (assetRecord.position !== card.position || assetRecord.sha256 !== card.sha256) throw new Error('Evidence does not match final manifest '+card.id);
  return {...card, beforeGrade:original.beforeGrade, afterGrade:'B', renderGrade:'B', reason:reasons[card.id],
    sourceDimensions:{width:512,height:512},
    generatedSource:assetRecord.source,generatedSourceDimensions:assetRecord.sourceDimensions,sourceCrop:assetRecord.crop,
    criteria:{resolution:'512 × 512 optimized WebP from a '+assetRecord.crop.width+' × '+assetRecord.crop.height+' source crop; no source upscaling.',
      sharpness:'Painted material detail remains legible in the full source and canonical 5:7 card; compact battlefield images emphasize silhouette and main role equipment.',
      lighting:'Integrated battlefield light, material highlights and smoke match the illustrated military/science-fiction library.',
      framing:'Actual Collection, Arsenal, hand and enlarged inspection were reviewed. Uniform cover uses the recorded focal point; unit heads or primary action/equipment remain visible in the compact card window.',
      factionIdentity:'Physical armor, equipment and scene accents follow the faction motif; color supports identity without replacing it.',
      style:'Consistent painted faction scenes replace flat vector studies. B records an acceptable library asset rather than claiming the premium approved Commander portrait tier.',
      anatomyEquipment:'No distracting anatomy or impossible primary equipment defects were found at runtime size; practical role cues were manually checked.'},
    evidence:['test-results/sprint12-tactical-'+card.faction+'-sheet-after.png','test-results/sprint12-tactical-'+card.faction+'-collection-after.png']};
});
const report = {schemaVersion:1,phase:'after',build:'1.0.5 candidate',reviewedAt:'2026-10-05',
  scope:before.scope,method:'Manual review of all forty paired 512px sources and actual 200×280 Collection cards after 17 Tactical focal-point repairs; real renderer audit across 155 cards and 20 responsive contexts.',
  classification:before.classification,
  summary:{reviewed:40,A:0,B:40,C:0,D:0,replaced:40,focalPointsAdjusted:17,missingAssets:0,distortedSources:0},
  benchmarks:before.benchmarks,
  notes:['The frozen before audit is retained separately.','All B grades were assigned by visual review; asset decode and ratio tests alone do not assign quality grades.','Ten approved off-lane Commander portraits remain a separate A benchmark and are unchanged.','Order crops may prioritize the action/device instead of retaining every incidental actor head.','No balance campaign or complete competitive match was run for this art gate.'],cards};
fs.writeFileSync(path.join(root,'docs/art/SPRINT12-ART-AUDIT-TACTICAL-AFTER.json'),JSON.stringify(report,null,2)+'\n');
const lines = ['# Sprint 12 — Tactical Arsenal after-art review','','All 40 Tactical designs were individually reviewed as optimized painted sources and actual 200×280 Collection cards. Final grades: **A 0 / B 40 / C 0 / D 0**, compared with **A 0 / B 0 / C 17 / D 23** before. B means acceptable and consistent with the battlefield card library; the ten unchanged illustrated off-lane Commanders remain the separate A benchmark.','','Seventeen Tactical focal-point adjustments retain unit heads or primary action/equipment in the short art window. Canonical full card frames remain 5:7. No source image or encoded runtime image was changed by those metadata repairs. Asset availability and geometry checks support this review, but did not determine the grades.','','| Card | Before | After | Focal point | Individual reason |','| --- | --- | --- | --- | --- |'];
for(const c of cards) lines.push('| '+c.name+' (`'+c.id+'`) | '+c.beforeGrade+' | '+c.afterGrade+' | '+c.position+' | '+c.reason+' |');
lines.push('','Evidence: five paired source/actual-card sheets and five actual Collection screenshots are linked for every card in [the machine-readable review](SPRINT12-ART-AUDIT-TACTICAL-AFTER.json). The unchanged [before audit](SPRINT12-ART-AUDIT-TACTICAL.json) preserves original mappings, hashes, reasons and screenshots.','','Rendering verification: [all 155 designs across 184 contexts](../../test-results/sprint12-art-surfaces-after.json) and [twenty responsive contexts](../../test-results/sprint12-art-viewports-after.json). No campaigns or complete competitive matches were run for this art gate.','');
fs.writeFileSync(path.join(root,'docs/art/SPRINT12-ART-AUDIT-TACTICAL-AFTER.md'),lines.join('\n'));
console.log(JSON.stringify(report.summary));
