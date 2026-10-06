/* Art stays outside rules state. Ordinary cards retain their original painted
 * faction atlases. Named Commanders use individual optimized painted portraits. */
(function (root) {
  'use strict';
  const THEMES = {
    stonewall: { primary:'#82b8cf', secondary:'#d0e1e6', ground:'#17303d', motif:'Reinforced shields · angular bunker plating', emblem:'assets/ui/faction_emblems/stonewall.svg' },
    syndicate: { primary:'#d4b56a', secondary:'#e8dab0', ground:'#302b1c', motif:'Optics · clean corporate hexagons', emblem:'assets/ui/faction_emblems/syndicate.svg' },
    bruiser: { primary:'#ed835c', secondary:'#edb297', ground:'#392720', motif:'Battered reinforcement · shock chevrons', emblem:'assets/ui/faction_emblems/bruiser.svg' },
    nightwalker: { primary:'#b09ad8', secondary:'#dbd2ec', ground:'#292337', motif:'Masks · narrow electronic light strips', emblem:'assets/ui/faction_emblems/nightwalker.svg' },
    rogue: { primary:'#7ec3a1', secondary:'#c0dccf', ground:'#1f332c', motif:'Patchwork armor · asymmetrical route arrows', emblem:'assets/ui/faction_emblems/rogue.svg' }
  };
  const POSITIONS = { rifle:'0% 0%', heavy:'100% 0%', specialist:'0% 100%', commander:'100% 100%' };
  // Explicit expansion-only mapping. Legacy atlas crops and Commander portraits
  // below are preserved; arbitrary imported artSrc values are never trusted.
  const TACTICAL_ART=Object.freeze(Object.fromEntries(Object.entries({
    stonewall:'trench_engineer shield_section bastion_gunner field_mechanic hardpoint dig_in interlocking_fire hold_fast',
    bruiser:'demolition_squad grenadier suppressor_heavy linebreaker assault_charge frag_out no_shelter break_the_position',
    syndicate:'spotter_cell fire_control_officer contract_marksman suppression_team recon_drone target_package coordinated_barrage contingency_plan',
    nightwalker:'smoke_runner ghost_operative shadow_trapper false_contact smoke_screen vanish expose_the_opening clean_exit',
    rogue:'scrap_grenadier jury_rigged_shield patch_runner improvised_mine make_it_work salvage_charge strip_it_for_parts bad_plan_good_result'
  }).flatMap(([faction,keys])=>keys.split(' ').map(key=>[faction+'_'+key,'assets/cards/tactical-011/'+faction+'/'+faction+'_'+key+'.svg']))));
  function role(card) {
    // New strategic roles can intentionally reuse an established atlas crop.
    if (Object.prototype.hasOwnProperty.call(POSITIONS, card.artRole)) return card.artRole;
    if (card.type === 'leader') return 'commander';
    if (/heavy|siege|bastion|armored|vanguard|breach|trail guard|rage gunner/i.test(card.name)) return 'heavy';
    if ((card.traits || []).some(t => ['medic','precision','command'].includes(t)) || /scout|saboteur|courier|salvage|pathfinder|stalker/i.test(card.name)) return 'specialist';
    return 'rifle';
  }
  function get(card) {
    const faction = THEMES[card.faction] ? card.faction : 'stonewall';
    const category = role(card);
    if(Object.hasOwn(TACTICAL_ART,card.id))return {faction,role:category,src:TACTICAL_ART[card.id],position:'50% 50%',alt:card.name+' — '+faction+' tactical equipment illustration',tactical:true};
    return { faction, role:category, src:'assets/cards/'+faction+'/starter-atlas.webp', position:POSITIONS[category], alt:card.name+' — '+faction+' '+category+' concept illustration' };
  }
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const COMMANDER_ART=Object.freeze({
    commander_stonewall_warden:{faction:'stonewall',name:'The Warden',identity:'warden',pose:0},
    commander_stonewall_marshal:{faction:'stonewall',name:'The Marshal',identity:'marshal',pose:1},
    commander_bruiser_breaker:{faction:'bruiser',name:'The Breaker',identity:'breaker',pose:2},
    commander_bruiser_bloodhound:{faction:'bruiser',name:'The Bloodhound',identity:'hunter',pose:3},
    commander_syndicate_coordinator:{faction:'syndicate',name:'The Coordinator',identity:'coordinator',pose:0},
    commander_syndicate_quartermaster:{faction:'syndicate',name:'The Quartermaster',identity:'quartermaster',pose:1},
    commander_nightwalker_ghost:{faction:'nightwalker',name:'The Ghost',identity:'ghost',pose:2},
    commander_nightwalker_saboteur:{faction:'nightwalker',name:'The Saboteur',identity:'saboteur',pose:3},
    commander_rogue_scavenger:{faction:'rogue',name:'The Scavenger',identity:'scavenger',pose:0},
    commander_rogue_drifter:{faction:'rogue',name:'The Drifter',identity:'drifter',pose:1}
  });
  const hash=value=>{let n=2166136261;for(const c of String(value||'')){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return n>>>0;};
  function identity(card){
    const text=[card.name,card.role,(card.traits||[]).join(' ')].join(' ').toLowerCase();
    if(card.type==='leader')return 'officer';
    if(/medic|\btriage\b|\baid\b|surgeon/.test(text))return 'medic';
    if(/blade|lancer/i.test(card.name||''))return 'blade';
    if(/brawl|counterpunch|collision/i.test(card.name||''))return 'brawler';
    if(/shield|guard|defend|escort|fortification/.test(text))return 'shield';
    if(/sniper|marksman|observer|precision|assassin|blade|spotter|exposure/.test(text))return 'marksman';
    if(/salvag|scaven|repair|engineer|sapper|saboteur|mechanic|recycler|sabotage/.test(text))return 'engineer';
    if(/courier|mobile|scout|pathfinder|stalker|runner|outrider|infiltrat/.test(text))return 'scout';
    if(role(card)==='heavy')return 'heavy';
    if(/command|coordinat|relay|tactical/.test(text))return 'officer';
    return 'rifle';
  }
  function background(faction,subject,seed){
    const t=THEMES[faction],x=38+(seed%4)*22;
    const motifs={
      stonewall:'<path d="M0 163V89l42-15 34 13v76m177 0V59l38-17 29 15v106M0 170h320M14 102h39m210-29h36"/><path d="M23 163V126h31v37m218 0v-61h22v61"/>',
      bruiser:'<path d="m0 148 39-59 45 34 42-57 36 60 48-50 52 44 58-21M0 168h320"/><path d="m25 166 14-42m215 42 7-35m-8-71 18-19m-91 18 9-24"/>',
      syndicate:'<path d="M18 164V55h56v109m166 0V30h55v134M33 75h27m-27 14h27m-27 14h27m196-42h29m-29 17h29m-29 17h29M0 165h320"/><path d="m92 59 16-9 16 9v18l-16 9-16-9Z"/>',
      nightwalker:'<path d="M0 166 47 75l27 91m173 0 25-106 37 106M33 49h26m207-19h32M0 177h320"/><path d="M0 45h73m181 67h66M14 35v22m288 29v39"/>',
      rogue:'<path d="m0 169 24-47 40 5 21 42m167 0 10-83 36 14 22 68M0 177h320M23 125l30 32m211-52 23 32"/><path d="m25 46 39 17 17-31m171 27 42-15 12 28"/>'
    };
    const accent=subject==='medic'?'<path d="M46 85v38m-19-19h38" stroke-width="8"/>':subject==='marksman'?'<circle cx="263" cy="62" r="24"/><path d="M263 28v18m0 32v18m-34-34h18m32 0h18"/>':subject==='heavy'?'<path d="m12 36 18 15 18-15m227 92 16 15 16-15" stroke-width="5"/>':'';
    return '<rect width="320" height="200" fill="'+t.ground+'" opacity=".8"/><path d="M'+x+' 0h95l-90 200H0Z" fill="'+t.primary+'" opacity=".06"/><g stroke="'+t.primary+'" stroke-width="2" fill="none" opacity=".23">'+motifs[faction]+accent+'</g><path d="M0 186 90 159h133l97 27v14H0Z" fill="#071018" opacity=".7"/>';
  }
  function figure(faction,subject,seed,named){
    const t=THEMES[faction],p=t.primary,s=t.secondary;
    const heavy=['heavy','breaker','warden','brawler'].includes(subject),stealth=faction==='nightwalker'||subject==='marksman',scarf=faction==='rogue'||subject==='drifter';
    const headX=subject==='scout'||subject==='hunter'?172:subject==='marksman'?144:160,tilt=subject==='scout'?8:subject==='heavy'?-4:seed%3-1;
    const shoulder=heavy?64:subject==='medic'?40:48;
    let out='<g transform="rotate('+tilt+' 160 155)">';
    // Broad, angular armor plates remain legible in a 70px-high match portrait.
    out+='<path d="M'+(160-shoulder)+' 106 139 94h42l'+shoulder+' 28 14 78H'+(160-shoulder-18)+'Z" fill="'+(stealth?'#14202c':'#253846')+'" stroke="#080f15" stroke-width="5"/>';
    out+='<path d="m138 100 22 12 23-12 16 76-39 15-38-15Z" fill="'+p+'" opacity="'+(faction==='bruiser'?'.42':'.28')+'"/><path d="m143 108 17 13 16-13m-43 47 27 10 29-10M160 122v33" fill="none" stroke="'+s+'" stroke-width="2" opacity=".55"/>';
    out+='<path d="m'+(160-shoulder)+' 109 -22 25 10 55 26-4 -4-61Zm'+(shoulder*2)+' 2 24 20-8 52-25-1 2-61Z" fill="#192b35" stroke="#071019" stroke-width="4"/>';
    if(heavy)out+='<path d="m'+(160-shoulder-6)+' 102 42-11 12 35-53 15Z M184 96l46 14 8 35-49-15Z" fill="'+p+'" stroke="#101923" stroke-width="5"/><path d="M126 134h68v25h-68Z" fill="#17222a" stroke="'+s+'" stroke-width="2"/>';
    if(faction==='bruiser')out+='<path d="m115 114-7 59m83-50 6 66" stroke="'+s+'" stroke-width="5"/><path d="m123 131 14 16-15 7m71-20-12 14 14 8" stroke="#784c37" stroke-width="4" fill="none"/>';
    if(scarf)out+='<path d="m124 103 31 14 41-20-2 28-34 17-37-15Z" fill="#85715a"/><path d="m195 114 30 54-22 8-17-53Z" fill="#7c6950"/><path d="m118 136 19 4-5 25-20-5Z" fill="#8b775b" stroke="#1b292e" stroke-width="3"/>';
    // Human faces, protective masks and faction headgear use the same illustration language.
    out+='<path d="M'+(headX-22)+' 47q22-20 43 0l-3 43-19 14-18-13Z" fill="'+(stealth?'#334653':named?'#ae8970':'#937c67')+'" stroke="#0a1218" stroke-width="4"/>';
    if(subject==='ghost'||(stealth&&subject!=='saboteur'))out+='<path d="m'+(headX-36)+' 68 7-38 27-13 29 16 10 35-20-23-38 2Z" fill="#101823" stroke="'+p+'" stroke-width="2"/><path d="m'+(headX-20)+' 63 43 0-3 21-21 14-18-15Z" fill="'+(subject==='ghost'?'#b1bec4':'#202d3b')+'"/><path d="M'+(headX-14)+' 65h13m6 0h11" stroke="'+p+'" stroke-width="3"/>';
    else if(['marshal','officer','quartermaster','drifter'].includes(subject))out+='<path d="m'+(headX-30)+' 48 6-24 42-2 9 22-31 8Z" fill="'+(subject==='drifter'?'#5d594a':'#1b2b37')+'" stroke="#0a131b" stroke-width="4"/><path d="M'+(headX-35)+' 48h66" stroke="'+s+'" stroke-width="5"/><path d="M'+(headX-8)+' 32h15" stroke="'+p+'" stroke-width="3"/>';
    else if(['scavenger','engineer','saboteur'].includes(subject))out+='<path d="M'+(headX-26)+' 40q28-23 53 3l-4 14-44-3Z" fill="#273b43" stroke="#0c1820" stroke-width="4"/><path d="M'+(headX-22)+' 49h45v17h-45Z" fill="#0d222c" stroke="'+p+'" stroke-width="3"/><circle cx="'+(headX-12)+'" cy="57" r="6" fill="'+s+'" opacity=".8"/><circle cx="'+(headX+11)+'" cy="57" r="6" fill="'+p+'"/><path d="m'+(headX-15)+' 75 31 0 7 17-20 8-22-9Z" fill="#26343c"/>';
    else if(subject==='breaker')out+='<path d="m'+(headX-23)+' 40 2-15 43 8 3 16Z" fill="#302c29"/><path d="m'+(headX-21)+' 68 12-4m18 2 10-1M'+(headX-6)+' 87h15" stroke="#282322" stroke-width="3"/><path d="m'+(headX+16)+' 49-8 29" stroke="'+s+'" stroke-width="2"/>';
    else out+='<path d="M'+(headX-29)+' 59V35l17-11h29l13 12v28l-19-13-32 5Z" fill="#253d4b" stroke="#0c1720" stroke-width="4"/><path d="m'+(headX-25)+' 52 47-3 4 16-51 0Z" fill="#0d202b" stroke="'+p+'" stroke-width="2"/><path d="M'+(headX-15)+' 58h28" stroke="'+s+'" stroke-width="3"/>';
    if(subject==='coordinator')out+='<path d="M193 43v31h-14" stroke="'+p+'" stroke-width="4" fill="none"/><circle cx="193" cy="44" r="6" fill="'+p+'"/><path d="M143 74h22" stroke="'+s+'" stroke-width="2"/>';
    if(subject==='hunter')out+='<path d="m181 55 13-3 7 9-18 5Z" fill="'+p+'"/><path d="m139 77 38-5 5 20-23 13-23-12Z" fill="#16242c" stroke="'+s+'" stroke-width="2"/>';
    // Equipment is silhouette-sized: not a small metadata badge.
    if(subject==='shield'||subject==='warden')out+='<path d="M72 111 126 99l19 28-12 57-34 14-33-31Z" fill="#223744" stroke="'+s+'" stroke-width="4"/><path d="m80 119 40-9 13 19-11 46-24 12-21-25Z" fill="'+p+'" opacity=".28"/><path d="M103 118v60m-18-40h35" stroke="'+s+'" stroke-width="3"/><path d="M194 132h82v12h-82Z" fill="#121d25" stroke="'+p+'" stroke-width="2"/>';
    else if(subject==='medic')out+='<path d="M78 139h58v48H78Z" fill="#b6c7c5" stroke="#182e37" stroke-width="4"/><path d="M99 148h15v27H99Zm-7 6h29v14H92Z" fill="#356861"/><path d="M195 135h19v33h-19Z" fill="'+s+'"/><path d="M203 125v54" stroke="'+p+'" stroke-width="3"/>';
    else if(subject==='blade')out+='<path d="m89 159 44-51 2 17-34 48Z" fill="'+s+'" stroke="#0c1a25" stroke-width="3"/><path d="m197 150 19-63 9-11 2 39-21 43Z" fill="'+p+'" stroke="#0c1a25" stroke-width="3"/><path d="m95 172 17 8m88-20 13 6" stroke="'+s+'" stroke-width="8"/>';
    else if(subject==='brawler')out+='<path d="m66 136 25-11 29 16-5 32-39 6-14-23Z M208 132l32-6 25 20-4 31-38 2-20-28Z" fill="#35424a" stroke="'+s+'" stroke-width="4"/><path d="m73 146 35 0m-34 9h33m116-9h30m-28 9h29" stroke="'+p+'" stroke-width="5"/>';
    else if(subject==='heavy'||subject==='breaker')out+='<path d="m105 150 74-26 72 15 4 22-105 20-33-12Z" fill="#14242d" stroke="'+s+'" stroke-width="4"/><path d="M208 131h96v12h-96Zm2 17h94v12h-94Z" fill="#293a42" stroke="#0b1821" stroke-width="3"/><path d="M177 153v22m12-26v22m-53-13 6 11" stroke="'+p+'" stroke-width="5"/>';
    else if(subject==='marksman'||subject==='hunter'||subject==='ghost')out+='<path d="m104 164 107-50 78-10 5 8-78 18-78 42Z" fill="#13222d" stroke="'+s+'" stroke-width="3"/><path d="m172 124 9-15 24-4 6 11Z" fill="'+p+'" stroke="#0b1721" stroke-width="3"/><path d="m206 131 8 37-13 3-11-30" fill="#223540"/>';
    else if(['engineer','scavenger','saboteur','quartermaster'].includes(subject))out+='<path d="m191 143 41-17 32 34-41 23Z" fill="#223944" stroke="'+p+'" stroke-width="3"/><path d="m204 146 20-8 22 20-21 12Z" fill="#0c1c27"/><path d="m208 150 20-2m-13 11 18-2" stroke="'+s+'" stroke-width="2"/><path d="M97 130v53m-9-57 9 10 12-10" fill="none" stroke="'+s+'" stroke-width="7"/>';
    else if(subject==='officer'||subject==='marshal'||subject==='coordinator')out+='<path d="m99 140 30 10-4 30-31-11Z" fill="#304750" stroke="'+p+'" stroke-width="3"/><path d="m186 130 54 23-5 11-52-21Z" fill="#192931" stroke="'+s+'" stroke-width="3"/><path d="M144 135h33m-27 9h21" stroke="'+s+'" stroke-width="3"/>';
    else out+='<path d="m109 145 104-14 58 8-1 12-65 1-71 13Z" fill="#152631" stroke="'+s+'" stroke-width="3"/><path d="m166 152 7 25 13-2-4-26" fill="#1b303c"/><path d="M210 134h24v-8h-24Z" fill="'+p+'"/>';
    if(named)out+='<path d="m118 109 11 4m-9 2 11 4m56-10 12-5m-11 11 13-5" stroke="'+s+'" stroke-width="4"/>';
    out+='<path d="M0 199h320" stroke="'+p+'" stroke-width="2"/></g>';
    return out;
  }
  function illustration(card){
    const faction=THEMES[card.faction]?card.faction:'stonewall',subject=identity(card),seed=hash(card.id||card.name);
    return '<svg class="art-identity" viewBox="0 0 320 200" fill="none" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">'+background(faction,subject,seed)+figure(faction,subject,seed,false)+'<path d="M7 16V7h19m268 0h19v9M7 184v9h19m268 0h19v-9" stroke="'+THEMES[faction].primary+'" opacity=".5"/></svg>';
  }
  function commanderGet(commander){
    const id=typeof commander==='string'?commander:commander?.id,art=COMMANDER_ART[id];
    if(!art)return null;
    return {src:'assets/cards/commanders/'+id+'-portrait-v2.webp',alt:art.name+' — '+art.faction+' strategic Commander portrait',faction:art.faction,role:'commander',identity:art.identity,width:768,height:768};
  }
  function commanderSvg(commander){
    const id=typeof commander==='string'?commander:commander?.id,c=COMMANDER_ART[id];if(!c)return '';
    const t=THEMES[c.faction];
    return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="280" viewBox="0 0 400 280" role="img" aria-label="'+escape(c.name)+'"><title>'+escape(c.name)+' · '+c.faction+'</title><rect width="400" height="280" fill="#0a151e"/><g transform="translate(-18 0) scale(1.4)">'+background(c.faction,c.identity,c.pose)+figure(c.faction,c.identity,c.pose,true)+'</g><path d="M12 48V12h52M336 12h52v36M12 232v36h52m272 0h52v-36" stroke="'+t.primary+'" stroke-width="2" fill="none"/><path d="M20 255h106m148 0h106" stroke="'+t.secondary+'" stroke-width="1"/><path d="m184 253 16-12 16 12-16 12Z" fill="'+t.primary+'"/><path d="M20 25h46m-46 7h28" stroke="'+t.primary+'" opacity=".6"/></svg>';
  }
  function commanderHtml(commander,options){
    const a=commanderGet(commander);if(!a)return '';
    const className=String(options?.className||'commander-portrait').split(/\s+/).filter(c=>/^[a-z][a-z0-9_-]*$/i.test(c)).join(' ');
    return '<span class="'+className+' art-commander art-'+a.identity+'" role="img" aria-label="'+escape(a.alt)+'"><img src="'+a.src+'" alt="" loading="lazy" decoding="async"></span>';
  }
  function html(card,options){
    if(!card)return '';
    options=options||{};
    const className=String(options.className||'card-portrait').split(/\s+/).filter(c=>/^[a-z][a-z0-9_-]*$/i.test(c)).join(' ');
    if(Object.hasOwn(TACTICAL_ART,card.id)){
      const a=get(card);
      return '<span class="'+className+' art-tactical" role="img" aria-label="'+escape(a.alt)+'" style="background-image:url(&quot;'+escape(a.src)+'&quot;);background-size:cover;background-position:center"></span>';
    }
    if(card.type==='unit'||card.type==='leader'){
      const a=get(card);
      return '<span class="'+className+'" role="img" aria-label="'+escape(a.alt)+'" style="background-image:url(&quot;'+escape(a.src)+'&quot;);background-position:'+a.position+'"></span>';
    }
    return '<span class="art-symbol '+className+'" role="img" aria-label="'+escape(card.name+' tactical insignia')+'">'+symbol(card)+'</span>';
  }
  function symbol(card){
    if(card.type!=='order'&&card.type!=='asset')return '';
    const paths={
      mark:'<circle cx="40" cy="24" r="14"/><path d="M40 3v12m0 18v12M18 24h13m18 0h13"/><circle cx="40" cy="24" r="3" fill="currentColor"/>',
      reinforce:'<path d="M40 4 60 12v12L40 44 20 24V12Z"/><path d="M40 15v18M31 24h18"/>',
      heal:'<path d="M31 7h18v9h10v16H49v9H31v-9H21V16h10Z"/>',
      draw:'<path d="M23 9h26v29H23Zm7-4h26v29M31 17h10m-10 7h10m-10 7h7"/>',
      adapt:'<path d="M40 42V25m0 0L20 10m20 15L60 10M20 10h12m-12 0v12M60 10H48m12 0v12"/><circle cx="40" cy="25" r="4"/>',
      rally:'<path d="M20 37 40 12l20 25M30 37l10-13 10 13M40 12V4"/>',
      sabotage:'<path d="m17 32 9-15 9 17 10-22 8 19h11M20 8l40 32M60 8 20 40"/>',
      reclaim:'<path d="M58 31a18 18 0 1 1 0-18M58 13H44m14 0V1"/><path d="M33 23h14m-14 7h10"/>',
      asset:'<path d="M17 38h46M23 37V23h34v14M29 23V12h22v11M40 12V3M35 6h10M28 29h7v8m10-8h7v8"/>',
      order:'<circle cx="40" cy="24" r="15"/><circle cx="40" cy="24" r="7"/><path d="M40 3v12m0 18v12M17 24h15m16 0h15"/>'
    };
    return '<svg viewBox="0 0 80 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[card.effect?.kind]||paths[card.type])+'</svg>';
  }
  Object.values(THEMES).forEach(Object.freeze);
  Object.values(COMMANDER_ART).forEach(Object.freeze);
  const api = { THEMES:Object.freeze(THEMES), COMMANDER_ART, TACTICAL_ART, role, get, symbol, html, identity, illustration, commanderGet, commanderHtml, commanderSvg };
  root.FrontlinesArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
