/* Reproducible vector equipment studies for Tactical Arsenal. This only writes
 * the forty explicitly named expansion assets and their source manifest. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),T=require('../tactical-arsenal');
const themes={stonewall:['#82b8cf','#d0e1e6','#162d3b'],bruiser:['#ed835c','#edb297','#38241f'],syndicate:['#d4b56a','#e8dab0','#302a1c'],nightwalker:['#b09ad8','#dbd2ec','#282336'],rogue:['#7ec3a1','#c0dccf','#1f332b']};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function symbol(kind){
  const shapes={
    cover:'<path d="M95 62 160 40l65 22v88l-65 63-65-63Z"/><path d="M160 70v99m-43-54h86"/>',
    breach:'<path d="M93 80h54l-9 38 36-5-15 49h66M79 166h31m81-90h49"/><path d="m207 47 30 25-31 25M112 195l-31-24 32-26"/>',
    blast:'<path d="m160 41 16 55 48-28-25 52 57 15-58 18 30 49-53-22-16 57-15-55-50 27 25-51-57-16 57-18-30-51 55 26Z"/><circle cx="160" cy="140" r="24"/>',
    dodge:'<path d="m91 92 47-35 62 27-21 52-56 7-38 48m33-21 73 36m-3-112 56-36M71 130h43M52 158h42"/><path d="m197 149 37 30-49 24"/>',
    suppression:'<path d="M78 82h136v24H78Zm28 39h138v24H106Zm-48 39h137v24H58Z"/><path d="M256 68v124m-17-17 17 25 17-25"/>',
    overwatch:'<circle cx="160" cy="137" r="66"/><circle cx="160" cy="137" r="31"/><path d="M160 40v66m0 61v68M61 137h69m61 0h67M85 67l28 29m95 77 26 29"/>',
    exposed:'<path d="M88 73h144v124H88ZM160 100v42m0 20v7M65 137h35m119 0h35M160 49v37m0 98v37"/>',
    smoke:'<path d="M100 184c-56 0-40-58-9-56-15-42 51-69 68-26 28-40 72-12 62 18 58-5 66 64 22 67Z"/><path d="M96 205h119m-88-129c-23-31 27-43 11-66m38 64c32-24-10-47 15-62"/>',
    heal:'<path d="M138 62h44v51h51v44h-51v51h-44v-51H87v-44h51Z"/>',
    sacrifice:'<path d="M99 61h122v132H99Z"/><path d="m80 80 158 127M239 73 80 204M160 24v21m-72 189 18-23m112 23-17-23"/>',
    adapt:'<path d="M160 224v-83m0 0-73-63m73 63 76-63M87 78v44m0-44h45m104 0h-44m44 0v43"/><circle cx="160" cy="141" r="16"/>'
  };return shapes[kind]||shapes.cover;
}
function kind(card){
  const id=card.id;
  if(/charge|grenadier|frag|barrage/.test(id)&&!id.endsWith('assault_charge'))return 'blast';
  if(/demolition|linebreaker|no_shelter|break_the_position/.test(id))return 'breach';
  if(/suppress/.test(id))return 'suppression';
  if(/gunner|trapper|mine|interlocking/.test(id))return 'overwatch';
  if(/smoke/.test(id))return 'smoke';
  if(/spotter|control|marksman|drone|target|expose/.test(id))return 'exposed';
  if(/operative|contact|vanish|exit/.test(id))return 'dodge';
  if(/mechanic|patch_runner/.test(id))return 'heal';
  if(/strip_it|bad_plan/.test(id))return 'sacrifice';
  if(/make_it/.test(id))return 'adapt';
  return 'cover';
}
function scenery(faction,p,s){
  const scene={
    stonewall:'<path d="M0 243V184l65-19 65 25v53m135 0v-96l56-30 79 31v96M0 250h400"/><path d="M26 211h45m232-43h58m-83 36h47"/>',
    bruiser:'<path d="m0 238 44-72 48 48 51-96 61 89 52-63 43 68 57-72 44 98M0 250h400"/><path d="m46 109 9-36m204 34 18-23m74 37 18-31"/>',
    syndicate:'<path d="M18 245V111h69v134m226 0V75h67v170M37 136h32m-32 17h32m-32 17h32m263-70h29m-29 17h29m-29 17h29"/><path d="m102 110 20-12 20 12v24l-20 12-20-12Z"/>',
    nightwalker:'<path d="M0 254 47 127l36 127m218 0 36-177 59 177M18 93h54m249-47h70M0 263h400"/><path d="M19 63v28m347 48v45"/>',
    rogue:'<path d="m0 260 29-90 66 15 31 75m174 0 20-124 56 21 24 103M0 266h400"/><path d="m34 172 43 46m244-64 47 45M34 67l46 23 31-46m202 38 62-26 17 36"/>'
  };
  return '<g fill="none" stroke="'+p+'" stroke-width="2" opacity=".18">'+scene[faction]+'</g><path d="M0 300 85 273h220l95 27v100H0Z" fill="#061019"/>';
}
function equipment(k,p,s){
  if(k==='blast')return '<path d="m100 225 67-33 70 6 10 48-53 16-81-10Z" fill="#21323a" stroke="'+s+'" stroke-width="3"/><path d="m176 199 27-7 34 6 53 18-5 17-53-19-29-3" fill="#293d44" stroke="#080e17" stroke-width="4"/><path d="M117 215h28v22h-28Z" fill="'+p+'"/><path d="M227 164v23m-13-23h24" stroke="'+s+'" stroke-width="5"/>';
  if(k==='cover')return '<path d="M81 208 144 193l24 30-10 78-34 24-49-52Z" fill="#233946" stroke="'+s+'" stroke-width="4"/><path d="m89 218 47-12 20 23-10 61-24 21-33-40Z" fill="'+p+'" opacity=".36"/><path d="M122 225v66m-24-43h49" stroke="'+s+'" stroke-width="3"/><path d="M244 231h72v16h-72Z" fill="#14232f" stroke="'+p+'" stroke-width="3"/>';
  if(k==='heal'||k==='adapt'||k==='sacrifice')return '<path d="m217 228 45-19 40 43-51 34Z" fill="#1a333f" stroke="'+p+'" stroke-width="3"/><path d="m231 233 26-12 27 27-28 17Z" fill="#071923"/><path d="M242 236h25m-18 9h19" stroke="'+s+'" stroke-width="2"/><path d="M121 211v83m-15-84 15 15 14-16" stroke="'+s+'" stroke-width="8" fill="none"/>';
  if(k==='exposed'||k==='overwatch')return '<path d="m112 244 134-64 83-9 4 12-79 19-104 57Z" fill="#162733" stroke="'+s+'" stroke-width="3"/><path d="m201 197 8-19 29-5 13 14Z" fill="'+p+'" stroke="#08131d" stroke-width="3"/><path d="m241 209 15 48-15 5-18-45Z" fill="#223740"/>';
  return '<path d="m123 223 110-20 79 16-2 19-71-4-94 15Z" fill="#152a36" stroke="'+s+'" stroke-width="3"/><path d="m189 236 9 36 20-3-7-39Z" fill="#192a33"/><path d="M257 207h31v-11h-31Z" fill="'+p+'"/><path d="m241 164 31 2 18 17-30 7Z" fill="'+p+'" opacity=".6"/>';
}
function person(card,k,p,s){
  const heavy=/heavy|linebreaker|shield/.test(card.id),wide=heavy?80:56,stealth=card.faction==='nightwalker';
  const asym=card.faction==='rogue';
  return '<g><path d="m'+(200-wide)+' 175 47-26h41l'+wide+' 39 15 153H'+(184-wide)+'Z" fill="url(#armor)" stroke="#060e16" stroke-width="5"/><path d="m164 166 37 22 39-25 21 121-62 21-64-31Z" fill="'+p+'" opacity=".25"/><path d="m173 183 27 13 29-14m-74 64 45 18 47-16M201 198v47" stroke="'+s+'" stroke-width="3" fill="none" opacity=".65"/><path d="m'+(200-wide)+' 181-34 33 9 84 33-5 7-83Zm'+(wide*2)+' 7 30 28-7 70-36-6-4-64Z" fill="#162a36" stroke="#08131e" stroke-width="4"/>'+
    (heavy?'<path d="m120 164 53-18 11 48-63 15Zm98-13 57 24 8 49-58-28Z" fill="#314a55" stroke="'+p+'" stroke-width="4"/>':'')+
    '<path d="M175 91q27-19 52 2l-3 48-23 22-23-20Z" fill="'+(stealth?'#263645':'#947b65')+'" stroke="#080f17" stroke-width="4"/>'+
    (stealth?'<path d="m157 117 9-50 35-23 32 24 15 48-24-23-44 2Z" fill="#121723" stroke="'+p+'" stroke-width="3"/><path d="m178 125 47-2-8 19-16 17-20-17Z" fill="#131f2b"/><path d="M181 111h16m11-1h16" stroke="'+p+'" stroke-width="4"/>':'<path d="M165 115V75l21-19h34l20 21v36l-23-12-32 5Z" fill="#273b49" stroke="#07111c" stroke-width="5"/><path d="m170 102 61-3 4 18-67 3Z" fill="#0a1b29" stroke="'+p+'" stroke-width="3"/><path d="M182 110h36" stroke="'+s+'" stroke-width="3"/>')+
    (asym?'<path d="m151 160 43 25 60-23-9 36-45 22-51-33Z" fill="#8b7553"/><path d="m252 180 36 70-27 16-23-68Z" fill="#766343"/><path d="m155 234 20 4-7 38-19-8Z" fill="#8a7556" stroke="#16212a" stroke-width="3"/>':'')+
    equipment(k,p,s)+'<path d="M157 317h89M168 329h62" stroke="'+p+'" stroke-width="3" opacity=".45"/></g>';
}
function device(card,k,p,s){
  if(card.id.endsWith('hardpoint'))return '<path d="M61 302v-99l52-49h168l58 53v95Z" fill="url(#armor)" stroke="'+s+'" stroke-width="4"/><path d="m102 209 30-25h132l31 27-7 62H111Z" fill="#081a27" stroke="'+p+'" stroke-width="4"/><path d="M135 216h129v23H135Zm-46 70h226" stroke="'+p+'" stroke-width="4"/><path d="m159 153 6-30h69l7 30Z" fill="#2b4451"/><path d="M177 133h128v15H177Z" fill="#213947" stroke="'+s+'" stroke-width="3"/>';
  if(card.id.endsWith('recon_drone'))return '<path d="m97 160 103-47 101 47-70 90h-61Z" fill="url(#armor)" stroke="'+p+'" stroke-width="4"/><path d="m78 112 64 30M260 143l57-31M154 212l-29 70m122-70 29 70" stroke="'+s+'" stroke-width="8"/><circle cx="66" cy="108" r="39" fill="none" stroke="'+p+'" stroke-width="5"/><circle cx="329" cy="104" r="39" fill="none" stroke="'+p+'" stroke-width="5"/><circle cx="199" cy="182" r="26" fill="#081926" stroke="'+s+'" stroke-width="3"/><circle cx="199" cy="182" r="10" fill="'+p+'"/><path d="m184 250-20 67m42-66 20 62" stroke="'+p+'" stroke-width="2" stroke-dasharray="7 9"/>';
  if(card.id.endsWith('improvised_mine'))return '<path d="m89 271 36-74 78-20 76 32 30 71-84 27-103-4Z" fill="url(#armor)" stroke="'+s+'" stroke-width="4"/><path d="M203 184v-48m-17 0h35m-21-6v-23" stroke="'+p+'" stroke-width="6"/><path d="m139 225 26-20 64 3 32 23-12 35-96 7Z" fill="#0b1c26" stroke="'+p+'" stroke-width="3"/><circle cx="202" cy="239" r="17" fill="'+p+'"/><path d="M96 285h36m137 5h28m-132-84 15-13" stroke="#aa9979" stroke-width="5"/>';
  return '<path d="m126 113 90-15 70 148-39 59-121-9-24-51Z" fill="url(#armor)" stroke="'+s+'" stroke-width="4"/><path d="m140 132 64-10 59 117-30 42-92-7-18-38Z" fill="'+p+'" opacity=".28"/><path d="M193 148v101m-47-43h86" stroke="'+p+'" stroke-width="5"/><path d="m128 303-32 30m152-26 31 24" stroke="'+s+'" stroke-width="9"/>';
}
function render(card,index){
  const [p,s,g]=themes[card.faction],k=kind(card),isUnit=['unit','leader'].includes(card.type),isAsset=card.type==='asset';
  // Keep head and signature equipment together in the central safe crop so the
  // same composition remains legible in the short hand and battlefield windows.
  const subject=isUnit?'<g transform="translate(58 92) scale(.71)">'+person(card,k,p,s)+'</g>':isAsset?device(card,k,p,s):'<g transform="translate(40 55)" stroke="'+s+'" stroke-width="8" stroke-linecap="square" stroke-linejoin="bevel" fill="none">'+symbol(k)+'</g><path d="M79 321h246m-220 13h193m-163 14h132" stroke="'+p+'" stroke-width="3" opacity=".5"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="'+esc(card.name+' tactical equipment study')+'"><title>'+esc(card.name)+'</title><defs><linearGradient id="field" x2=".85" y2="1"><stop stop-color="'+g+'"/><stop offset="1" stop-color="#070e18"/></linearGradient><linearGradient id="armor" x2="1" y2="1"><stop stop-color="#3f5360"/><stop offset=".54" stop-color="#21333f"/><stop offset="1" stop-color="#101b28"/></linearGradient><radialGradient id="light"><stop stop-color="'+p+'" stop-opacity=".28"/><stop offset="1" stop-color="'+p+'" stop-opacity="0"/></radialGradient></defs><rect width="400" height="400" fill="url(#field)"/><circle cx="'+(index%2?274:128)+'" cy="149" r="180" fill="url(#light)"/>'+scenery(card.faction,p,s)+'<path d="m0 0 150 0-95 400H0Z" fill="'+p+'" opacity=".06"/>'+subject+'<g stroke="'+p+'" stroke-width="2" fill="none" opacity=".65"><path d="M20 55V20h52m256 0h52v35M20 345v35h52m256 0h52v-35"/><path d="M27 38h55m236 0h55M30 362h82m176 0h82"/></g><path d="m183 359 17-12 17 12-17 12Z" fill="'+p+'"/><g stroke="'+s+'" stroke-width="1" opacity=".2"><path d="M0 93h400M0 293h400M48 0v400M349 0v400"/></g></svg>';
}
const manifest={version:T.VERSION,style:'Faction-colored graphic equipment studies; square viewBox, safe uniform cover crop; no old assets touched.',cards:[]};
Object.values(T.CARD_ADDITIONS).forEach((card,index)=>{const file=path.join(root,card.artSrc),svg=render(card,index);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,svg);manifest.cards.push({id:card.id,path:card.artSrc,width:400,height:400,bytes:Buffer.byteLength(svg),sha256:crypto.createHash('sha256').update(svg).digest('hex')});});
const dest=path.join(root,'assets/source/tactical-011/art-manifest.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({cards:manifest.cards.length,bytes:manifest.cards.reduce((n,c)=>n+c.bytes,0),manifest:path.relative(root,dest)}));
