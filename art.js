/* Runtime art lookup. Art changes never enter the rules state. Four roles share
 * one optimized faction atlas; replace these paths to grow the art library. */
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
    return { faction, role:category, src:'assets/cards/'+faction+'/starter-atlas.webp', position:POSITIONS[category], alt:card.name+' — '+faction+' '+category+' concept illustration' };
  }
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function html(card,options){
    if(!card)return '';
    options=options||{};
    const className=String(options.className||'card-portrait').split(/\s+/).filter(c=>/^[a-z][a-z0-9_-]*$/i.test(c)).join(' ');
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
  const api = { THEMES:Object.freeze(THEMES), role, get, symbol, html };
  root.FrontlinesArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
