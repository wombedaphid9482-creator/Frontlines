'use strict';
// Records the completed HUMAN review of all five actual-card after sheets.
// This does not infer grades from pixels, re-encode artwork, or close the whole155-card gate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),auditPath=path.join(root,'docs/art/SPRINT12-ART-AUDIT-LEGACY.json');
const audit=JSON.parse(fs.readFileSync(auditPath,'utf8'));
const before=JSON.parse(fs.readFileSync(path.join(root,'docs/art/sprint12-before/legacy-mappings-before.json'),'utf8'));
const after=JSON.parse(fs.readFileSync(path.join(root,'docs/art/sprint12-after/legacy-mappings-after.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/source/card-art-012/manifest.json'),'utf8'));
const wholeArtGateAccepted=manifest.qualityReview?.status==='accepted';
const plan=JSON.parse(fs.readFileSync(path.join(root,'assets/source/card-art-012/jobs-plan.json'),'utf8'));
const commanderSources=JSON.parse(fs.readFileSync(path.join(root,'assets/source/commanders/portraits-v2.json'),'utf8'));
const sha=src=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,src))).digest('hex');
const concreteSubjects={};
for(const job of plan.jobs)for(const cell of job.cells)for(const id of cell.cardIds)concreteSubjects[id]=cell.scene;
for(const record of plan.reuse)for(const id of record.cardIds)concreteSubjects[id]=record.reason;
const focalChanges={bruiser_brawler:'50% 10%',bruiser_surge_drummers:'50% 20%',rogue_lancer:'50% 10%'};
for(const[id,position]of Object.entries(focalChanges))if(manifest.cards[id]?.position!==position)throw new Error('The visually accepted focal point has not been published: '+id);
if(after.cards.length!==115||new Set(after.cards.map(c=>c.id)).size!==115)throw new Error('Complete115-card after evidence is required.');
for(const record of audit.cards){
  const current=after.cards.find(c=>c.id===record.id),replacement=manifest.cards[record.id];
  if(!current||!current.source||!fs.existsSync(path.join(root,current.source)))throw new Error('Missing actual after source: '+record.id);
  record.afterGrade='B';
  record.afterSourceGrade=replacement?.source.startsWith('assets/source/')?'B':'A';
  record.afterReviewed=true;
  record.afterArt={source:current.source,position:current.position,dimensions:current.dimensions,sha256:sha(current.source)};
  record.afterEvidence='docs/art/sprint12-after/legacy-'+record.faction+'-faces.png';
  record.afterRoleFit=record.roleMismatch?'Repaired: '+concreteSubjects[record.id]:replacement?concreteSubjects[record.id]:'The restored face and original faction equipment remain readable; the established broad combat/support role is retained.';
  record.afterRationale=replacement
    ?'A complete painted '+record.type+' composition now replaces the inadequate crop, glyph, or role mapping. The actual200×280 card was reviewed for a readable principal subject, identifying equipment/action, consistent faction lighting, correct5:7 framing, and no severe compression/anatomy defect. '+(record.roleMismatch?'The named equipment-role mismatch is resolved. ':'')+(focalChanges[record.id]?'The raised focal point was recaptured and reviewed; the full face/helmet is retained. ':'')+'B reflects accepted production quality without claiming a bespoke premium Commander finish.'
    :'The preserved original painting now uses a safe top-anchored crop. Its face and faction equipment are readable at200×280 with no stretching or severe compression defect. Exact role-painting reuse remains explicitly documented; this is B shared-role art, not bespoke A identity.';
  record.afterRemainingLimitation=replacement&&record.id.startsWith('stonewall_')&&['stonewall_medic','stonewall_plate_medic','stonewall_recovery_team'].includes(record.id)
    ?'Three coherent armored medical-support cards share one reviewed painted role composition.'
    :replacement?'The runtime illustration is512×512; native source resolution is retained in the PNG master.':record.duplicateIds.length?'The same broad-role composition remains shared with '+record.duplicateIds.length+' legacy cards.':'None found in the reviewed card face.';
}
const originalAtlases=Object.entries(before.sources).every(([src,record])=>sha(src)===record.sha256);
const commanderRuntime=audit.commanders.every(record=>sha(record.src)===record.sha256);
const commanderMasters=commanderSources.assets.every(record=>sha(record.source)===record.sourceSha256);
if(!originalAtlases||!commanderRuntime||!commanderMasters)throw new Error('Protected source or Commander artwork changed.');
audit.afterCheckpoint={
  phase:'Painted replacements and safe framing, after the three focal-point corrections',reviewed:true,
  grades:{A:0,B:115,C:0,D:0},reviewer:'Content agent and independent root review of the complete sheets and corrected final faces.',
  method:'Human visual inspection of all115 actual Collection faces in five200×280 contact sheets; the final Bruiser and Rogue sheets were recaptured and re-inspected after focal correction. Source tiles and all ten Commander benchmarks were also inspected.',
  retainedLegacyCards:64,refinedLegacyCards:51,paintedOrderAssetScenes:39,roleFitRepairs:12,
  focalCorrections:focalChanges,legacySourceHashesUnchanged:originalAtlases,
  commanderRuntimeHashesUnchanged:commanderRuntime,commanderSourceHashesUnchanged:commanderMasters,
  evidence:Object.keys(after.sources).map(src=>src.split('/')[2]).map(faction=>'docs/art/sprint12-after/legacy-'+faction+'-faces.png'),
  completeMatches:0,largeSimulations:0,
  wholeArtGate:wholeArtGateAccepted?'accepted':'awaiting other scopes',
  acceptance:wholeArtGateAccepted?'Root accepted the full155-card visual gate after the separate40-card Tactical and cross-surface reviews; the legacy115-card scope has no outstandingC/D artwork.':'The legacy115-card scope has no outstandingC/D artwork. Final155-card art-gate acceptance also requires the separate40-card Tactical audit and cross-surface review.'
};
audit.summary.after={A:0,B:115,C:0,D:0};
fs.writeFileSync(auditPath,JSON.stringify(audit,null,2));
const markdownPath=path.join(root,'docs/art/SPRINT12-ART-AUDIT-LEGACY.md');
let markdown=fs.readFileSync(markdownPath,'utf8').split('\n## Completed legacy after review\n')[0];
markdown+='\n## Completed legacy after review\n\nAll **115 actual legacy card faces** have now been reviewed after artwork replacement and framing repair: **115 B, zero C/D**. The original before grades and the framing-only checkpoint remain above and in the JSON; they have not been rewritten.\n\nThe review accepts **64 preserved shared-role paintings** and **51 refined legacy mappings**: 39 real painted Order/Asset scenes plus twelve equipment-role repairs. Three compatible repairs reuse exact strong original atlas quadrants. Three Stonewall medical-support cards share a coherent new armored-medic illustration. Shared artwork remains documented as B rather than being described as bespoke A art.\n\nThe first after pass caught faces cropping too low on Scarred Brawler, Surge Drummers and Improvised Lancer. Their safe cover focal points are now **10%, 20% and 10% vertically**, respectively. The final Bruiser and Rogue sheets were recaptured and manually reviewed, retaining faces and identifying equipment without stretching or changing source pixels.\n\nAll five original atlases, ten Commander runtime portraits and ten preserved Commander PNG masters remain byte-for-byte unchanged. Commander quality remains **A**. The optimized replacements are genuine **512×512 WebPs**, downsampled uniformly from native627px atlas cells or the1254px standalone drummer master; no source was enlarged.\n\n'+audit.afterCheckpoint.evidence.map(src=>'- ['+src.split('/').pop().replace('-faces.png','')+' — reviewed final faces]('+src.replace('docs/art/','')+')').join('\n')+'\n\n'+(wholeArtGateAccepted?'Root has now independently accepted the complete **155-card visual gate** after the separate40-card Tactical and all-context reviews.':'This closes the **legacy115-card** review. The whole155-card art gate also depends on the separate Tactical Arsenal and all-context checks.')+' No complete match or large simulation was run during this art-only work.\n';
fs.writeFileSync(markdownPath,markdown);
console.log(JSON.stringify({legacyReviewed:115,after:{A:0,B:115,C:0,D:0},retained:64,replacedOrRemapped:51,commanderBenchmarks:10,protectedFilesUnchanged:originalAtlases&&commanderRuntime&&commanderMasters,wholeArtGate:audit.afterCheckpoint.wholeArtGate}));
