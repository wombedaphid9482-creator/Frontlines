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
  Object.values(THEMES).forEach(Object.freeze);
  const api = { THEMES:Object.freeze(THEMES), role, get };
  root.FrontlinesArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
