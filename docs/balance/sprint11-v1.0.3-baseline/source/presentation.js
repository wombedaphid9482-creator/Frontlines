/* Shared collectible presentation. This module only reads card/profile metadata;
 * rarity and cosmetic treatment never change a card's rules or statistics. */
(function(root,factory){
  const api=factory(root);root.FrontlinesPresentation=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
  'use strict';
  const freeze=value=>{Object.values(value).forEach(v=>{if(v&&typeof v==='object')freeze(v);});return Object.freeze(value);};
  const PROFILES=freeze({
    common:{id:'common',label:'Common',border:'#98a6ae',frame:'clean',glow:0,foilIntensity:.08,idleAnimation:'none',packReveal:260,deployment:720,attack:430,impact:190,audioLayers:0,particleLimit:0,performanceTier:0},
    uncommon:{id:'uncommon',label:'Uncommon',border:'#8cbc99',frame:'accent',glow:.08,foilIntensity:.12,idleAnimation:'none',packReveal:340,deployment:780,attack:460,impact:220,audioLayers:1,particleLimit:2,performanceTier:1},
    rare:{id:'rare',label:'Rare',border:'#82b5df',frame:'precision',glow:.14,foilIntensity:.16,idleAnimation:'sheen',packReveal:450,deployment:860,attack:490,impact:260,audioLayers:2,particleLimit:4,performanceTier:2},
    epic:{id:'epic',label:'Epic',border:'#bc9ad9',frame:'layered',glow:.2,foilIntensity:.2,idleAnimation:'sheen',packReveal:620,deployment:960,attack:530,impact:310,audioLayers:3,particleLimit:7,performanceTier:3},
    legendary:{id:'legendary',label:'Legendary',border:'#e1bf79',frame:'signature',glow:.24,foilIntensity:.24,idleAnimation:'hologram',packReveal:800,deployment:1060,attack:580,impact:350,audioLayers:4,particleLimit:10,performanceTier:4}
  });
  const FACTIONS=freeze({
    stonewall:{motif:'shield',tone:'triangle',pitch:110,spread:1,color:'#82b8cf',accent:[110,220,330]},
    bruiser:{motif:'shockwave',tone:'triangle',pitch:85,spread:1.25,color:'#ed835c',accent:[85,127.5,170]},
    syndicate:{motif:'target',tone:'sine',pitch:420,spread:.7,color:'#d4b56a',accent:[420,630,840]},
    nightwalker:{motif:'distortion',tone:'sine',pitch:280,spread:.8,color:'#b09ad8',accent:[280,297,560]},
    rogue:{motif:'spark',tone:'triangle',pitch:190,spread:1.1,color:'#7ec3a1',accent:[190,285,475]}
  });
  const PRESETS=freeze({full:{particles:1,duration:1,audioLayers:4},reduced:{particles:.3,duration:.65,audioLayers:1},minimal:{particles:0,duration:.25,audioLayers:0}});
  const VARIANTS=Object.freeze(['standard','field-worn','battle-hardened','veteran','foil','full-art']);
  const collection=()=>root.FrontlinesCollection || (typeof require==='function'?require('./collection.js'):null);
  function metadata(card){try{return collection()?.metadata(card)||{};}catch(_){return typeof card==='object'?card:{};}}
  function profile(card){const rarity=String(typeof card==='string'&&PROFILES[card]?card:metadata(card).rarity||card?.rarity||'common').toLowerCase();return PROFILES[rarity]||PROFILES.common;}
  function variantId(value){const v=String(value||'standard').replace(/([a-z])([A-Z])/g,'$1-$2').toLowerCase().replace(/_/g,'-');return VARIANTS.includes(v)?v:'standard';}
  function skin(card,options){
    options=options||{};const p=profile(card);let preferred=options.variant;
    if(!preferred)try{preferred=collection()?.variantFor(card,options.profile);}catch(_){}
    const variant=variantId(preferred);
    return {rarity:p.id,variant,className:(FACTIONS[card?.faction]?'faction-'+card.faction+' ':'')+'rarity-'+p.id+' variant-'+variant,style:'--rarity-color:'+p.border+';--rarity-glow:'+p.glow+';--foil-intensity:'+p.foilIntensity+';'};
  }
  function faction(card){const c=typeof card==='object'?card:metadata(card);return FACTIONS[c?.faction]||FACTIONS.stonewall;}
  function limits(card,settings,motion){
    const p=profile(card),s=settings||{},tier=motion||s.reducedEffects?'minimal':s.presentation||'full',preset=PRESETS[tier]||PRESETS.full;
    return {profile:p,faction:faction(card),particles:Math.min(10,Math.floor(p.particleLimit*preset.particles)),audioLayers:Math.min(p.audioLayers,preset.audioLayers),duration:Math.min(tier==='minimal'?120:1100,Math.round(p.deployment*preset.duration*(s.animationSpeed==='fast'?.55:1))),preset:tier};
  }
  function commanderSkin(commander,options){
    const base=skin(commander,options),p=PROFILES.legendary;
    return {...base,rarity:p.id,className:base.className.replace(/rarity-[a-z]+/,'rarity-'+p.id),style:'--rarity-color:'+p.border+';--rarity-glow:'+p.glow+';--foil-intensity:'+p.foilIntensity+';'};
  }
  // Pure motion recipes are shared by animation and tests. Timing never gates an
  // engine action; canceling an effect leaves the authoritative board intact.
  function deploymentFrames(dx,dy,ratio){
    const scale=Math.max(.18,Math.min(1,Number(ratio)||.5));
    return [
      {opacity:.85,transform:'translate(0,0) scale(.92)',offset:0,easing:'ease-out'},
      {opacity:1,transform:'translate(0,-16px) scale(1.06)',offset:.18,easing:'ease-in-out'},
      {opacity:1,transform:'translate('+dx*.2+'px,'+(dy*.2-22)+'px) scale(1.2)',offset:.42,easing:'cubic-bezier(.5,0,.85,.6)'},
      {opacity:1,transform:'translate('+dx+'px,'+dy+'px) scale('+scale*.88+')',offset:.72,easing:'ease-out'},
      {opacity:.96,transform:'translate('+dx+'px,'+(dy-3)+'px) scale('+scale*1.04+')',offset:.84,easing:'ease-out'},
      {opacity:0,transform:'translate('+dx+'px,'+dy+'px) scale('+scale+')',offset:1}
    ];
  }
  function attackPlan(card,role){
    const p=profile(card),f=faction(card),heavy=role==='heavy',precise=role==='specialist'||f.motif==='distortion';
    return {duration:p.attack+(heavy?100:0),windup:heavy?170:precise?150:95,delivery:heavy?125:precise?90:70,shots:heavy||precise?1:3,lunge:heavy?12:precise?5:8,recoil:heavy?4:2,motif:f.motif};
  }
  const badge=card=>{const p=profile(card);return '<span class="rarity-badge rarity-'+p.id+'" aria-label="Rarity: '+p.label+'">'+p.label+'</span>';};
  function reveal(node,card){return root.FrontlinesEffects?.reveal(card,node);}
  return {PROFILES,FACTIONS,PRESETS,VARIANTS,profile,faction,skin,commanderSkin,badge,limits,variantId,reveal,deploymentFrames,attackPlan};
});
