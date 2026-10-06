'use strict';
// Preserve the manually reviewed before evidence; never regrade automatically.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),records=require('../test-results/sprint12-tactical-before-inventory.json');
const reasons={
  stonewall_trench_engineer:'Generic shield-bearing bust does not depict trench construction or entrenching work; shares head and torso with Shield Section and Field Mechanic.',
  stonewall_shield_section:'One repeated soldier with a small shield does not communicate a defensive section or linked shield wall; mostly a palette/armor change from Trench Engineer.',
  stonewall_bastion_gunner:'The narrow angular rifle shape does not read as a fortified heavy gunner; identical base bust and abstract ground to the other Stonewall units.',
  stonewall_field_mechanic:'Tiny wrench and tablet suggest a role, but there is no repair scene, equipment depth or distinct subject pose; shared helmet and body template.',
  stonewall_hardpoint:'Flat outline of a bunker is a diagram rather than a lit battlefield fortification; no scale, terrain integration or defended position.',
  stonewall_dig_in:'Large shield/plus glyph communicates an interface effect, not infantry digging in or taking cover.',
  stonewall_interlocking_fire:'Crosshair glyph does not show units establishing intersecting fields of fire; no event or actors.',
  stonewall_hold_fast:'Same shield/plus glyph as Dig In despite being a defining Legendary hold-the-position event; no surviving defenders or reinforcement scene.',
  bruiser_demolition_squad:'Single generic rifle bust does not communicate a demolition squad, breaching tools or coordinated action.',
  bruiser_grenadier:'Small polygon replaces the held weapon, but the figure and pose are reused; grenade action and explosive equipment are not readable.',
  bruiser_suppressor_heavy:'Repeated rifle silhouette has modest extra shoulder plates; lacks the large support weapon and violent suppressive-fire role.',
  bruiser_linebreaker:'Near-identical composition to Suppressor Heavy; no distinct breakthrough stance, breaching equipment or forward movement.',
  bruiser_assault_charge:'Shield/plus glyph duplicates Stonewall defensive imagery, conflicting with the aggressive charging event.',
  bruiser_frag_out:'Starburst icon is an effect marker rather than an explosive battlefield action; no thrown grenade or targets.',
  bruiser_no_shelter:'Abstract opposing arrows do not depict removing shelter or breaching a fortified position.',
  bruiser_break_the_position:'Same abstract opposing arrows as No Shelter; the flagship event has no assault scene or differentiated composition.',
  syndicate_spotter_cell:'Repeated marksman bust with a rifle, no spotting optics or squad observation; indistinguishable from the following officer and marksman.',
  syndicate_fire_control_officer:'The sole new Leader uses the same rifle pose as Spotter Cell and Contract Marksman; no command equipment or coordinating action.',
  syndicate_contract_marksman:'A long weapon suggests precision, but it shares the same pose, helmet and armor with two other cards and lacks optic/weapon detail.',
  syndicate_suppression_team:'Single generic soldier with a changed rifle shape does not read as a coordinated fire team or suppression action.',
  syndicate_recon_drone:'Geometric drone schematic identifies equipment, but lacks painted materials, depth, surveillance setting and plausible battlefield scale.',
  syndicate_target_package:'Square crosshair icon conveys targeting UI, not a spotter feeding a precision firing solution.',
  syndicate_coordinated_barrage:'Starburst glyph is reused from other factions; no coordinated artillery, targeting overlay or impact scene.',
  syndicate_contingency_plan:'Shield/plus glyph is reused from Stonewall and Bruiser; no combined-arms defensive regroup or tactical command.',
  nightwalker_smoke_runner:'Repeated static bust has no smoke, running action or scout kit; the violet hood alone identifies the faction.',
  nightwalker_ghost_operative:'Near-identical portrait to Smoke Runner; no distinct infiltration silhouette, precision equipment or concealed movement.',
  nightwalker_shadow_trapper:'Same static hooded bust with a longer rifle shape; no ambush preparation, trap or overwatch scene.',
  nightwalker_false_contact:'Outlined shield with a cross is a generic defense marker rather than a holographic decoy or false battlefield contact.',
  nightwalker_smoke_screen:'Line cloud icon does not show smoke deployed across terrain or units moving through concealment.',
  nightwalker_vanish:'Angular running glyph is interface iconography rather than an operative evading a direct attack.',
  nightwalker_expose_the_opening:'Square crosshair duplicates Syndicate Target Package; no Nightwalker reconnaissance or exposure action.',
  nightwalker_clean_exit:'Same running glyph as Vanish; no wounded operative retreat, extraction route or smoke cover.',
  rogue_scrap_grenadier:'Generic bust with a brown scarf and polygon equipment; no scavenged explosive gear or improvised bomb action.',
  rogue_jury_rigged_shield:'Generic outlined shield, also reused for False Contact; lacks patched metal, improvised supports or scavenged equipment.',
  rogue_patch_runner:'Scarf plus tiny wrench/tablet gives a weak medic cue, but the same generic bust has no field-patching action or mobile silhouette.',
  rogue_improvised_mine:'Minimal polygon and antenna is a schematic stand-in; no repurposed parts, emplacement or armed mine detail.',
  rogue_make_it_work:'Branching-arrows glyph is a mode-selection icon rather than an improvised battlefield solution.',
  rogue_salvage_charge:'Starburst icon duplicates Frag Out and Coordinated Barrage; no scrap explosive preparation or costly detonation event.',
  rogue_strip_it_for_parts:'Crossed-square glyph is a sacrifice marker; it does not depict dismantling a friendly machine to repair another.',
  rogue_bad_plan_good_result:'Same crossed-square sacrifice glyph as Strip It for Parts; no improvised cover, escape or distinct result scene.'
};
const common={
  resolution:'400 × 400 vector; decodes cleanly and has no raster compression defects.',
  sharpness:'Line edges remain sharp, but the deliberate detail level is far below the approved painted atlas and Commander benchmark.',
  lighting:'One abstract gradient spotlight and flat fill; no material lighting, atmospheric depth or integrated scene.',
  framing:'Shared centered glyph/bust inside a large empty tactical border. The image scales without distortion, but the subject is small and role cues become weaker in compact windows.',
  factionIdentity:'Faction color and background line motif are consistent; physical armor/equipment philosophy is weakly distinguished.',
  style:'Flat vector studies are visibly from a different visual generation than the established illustrated military/science-fiction cards.',
  smallSize:'Repeated silhouette or glyph remains visible, but different cards cannot reliably be identified from their artwork at actual card size.',
  anatomyEquipment:'No apparent accidental generation artifacts; anatomy is an intentionally simplified template. Equipment lacks the detail and coherence of the painted benchmark.'
};
const rows=records.map(r=>({...r,sourceDimensions:{width:400,height:400},beforeGrade:['unit','leader'].includes(r.type)?'C':'D',renderGrade:['unit','leader'].includes(r.type)?'C':'D',reason:reasons[r.id],criteria:common,recommendedAction:'Replace with a coherent painted faction scene; preserve rules, stats, Commander portraits and 5:7 frame.',evidence:['test-results/sprint12-tactical-'+r.faction+'-sheet-before.png','test-results/sprint12-tactical-'+r.faction+'-collection-before.png']}));
if(rows.length!==40||rows.some(r=>!r.reason))throw new Error('Missing reviewed record');
const audit={schemaVersion:1,phase:'before',build:'1.0.4',reviewedAt:'2026-10-04',scope:'All 40 Tactical Arsenal battlefield designs; off-lane Commanders are separate preserved benchmarks.',method:'Manual visual inspection of five full-art/70px/110×70px sheets, five actual 1366×768 Collection views, full-resolution legacy atlas benchmark and ten approved Commander portraits.',classification:{A:'Strong/release quality',B:'Acceptable/consistent',C:'Noticeably below current standard',D:'Broken/placeholder/bad crop/low quality'},summary:{reviewed:40,A:0,B:0,C:17,D:23,replacementsRecommended:40,missingAssets:0,distortedSources:0},benchmarks:['docs/art/sprint12-before/legacy-atlas-benchmarks.png','docs/art/sprint12-before/commander-benchmarks.png'],notes:['A correct decode and faction-colored template do not meet the illustrated art-quality floor.','C grades acknowledge recognizable human unit subjects. D grades identify glyph/diagram stand-ins where the card needs an action or equipment scene.','No numeric gameplay or balance campaign was run for this audit.'],cards:rows};
const dest=path.join(root,'docs/art');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'SPRINT12-ART-AUDIT-TACTICAL.json'),JSON.stringify(audit,null,2)+'\n');
const md=['# Sprint 12 — Tactical Arsenal art audit (before)','',audit.method,'','All forty sources decode without distortion. None meets the illustrated benchmark: **17 C, 23 D; all forty need replacement.** The seventeen Unit/Leader studies depict readable but repeated flat busts. The eighteen Orders and five Assets use glyphs or equipment diagrams as stand-ins. Approved Commander portraits must remain unchanged.','','Source file hashes and exact before evidence are recorded in the adjacent JSON audit. These grades describe the captured v1.0.4 art, even after later replacements.','','| Card | Type | Grade | Specific finding |','| --- | --- | --- | --- |',...rows.map(r=>'| '+r.name+' (`'+r.id+'`) | '+r.type+' | '+r.beforeGrade+' | '+r.reason+' |'),'','## Common criteria','',...Object.entries(common).map(([key,value])=>'- **'+key+':** '+value),'','## Evidence','',...['stonewall','bruiser','syndicate','nightwalker','rogue'].map(f=>'- [Full and small-size '+f+' sheet](../../test-results/sprint12-tactical-'+f+'-sheet-before.png) · [Actual Collection view](../../test-results/sprint12-tactical-'+f+'-collection-before.png)'),'','No balance campaign or gameplay mutation was needed. Rendering-surface geometry is documented separately.',''];
fs.writeFileSync(path.join(dest,'SPRINT12-ART-AUDIT-TACTICAL.md'),md.join('\n'));console.log(JSON.stringify(audit.summary));
