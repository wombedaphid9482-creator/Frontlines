/* Original Frontlines procedural score, composed for this project. No samples,
 * copyrighted recordings or third-party assets are used. Each replaceable track
 * defines a loop of complete musical bars; future tension/faction layers can be
 * assigned through the same state table without touching game rules. */
(function(root){
  'use strict';
  const tracks={
    command:{id:'command',title:'Lines of Command',bpm:88,bars:4,bass:[38,38,34,36],melody:[62,null,65,69,67,null,65,62,60,null,62,65,62,null,60,57],pad:[50,53,57],pulse:.12,energy:.22},
    arsenal:{id:'arsenal',title:'Tools of the Campaign',bpm:72,bars:4,bass:[38,41,34,36],melody:[62,null,null,65,60,null,null,57,58,null,null,62,60,null,null,57],pad:[50,53,57],pulse:.04,energy:.12},
    supply:{id:'supply',title:'Supply Lines',bpm:92,bars:4,bass:[38,41,36,34],melody:[62,null,69,null,65,null,72,null,67,null,62,null,65,null,58,null],pad:[50,57,60],pulse:.07,energy:.15},
    battlefield:{id:'battlefield',title:'Hold the Line',bpm:104,bars:4,bass:[38,38,34,36],melody:[50,null,57,62,53,null,60,65,46,null,53,58,48,null,55,60],pad:[50,53,57],pulse:.18,energy:.25}
  };
  for(const track of Object.values(tracks)){Object.freeze(track.bass);Object.freeze(track.melody);Object.freeze(track.pad);Object.freeze(track);}
  const api=Object.freeze({license:'Original procedural composition and synthesis for Frontlines; no external audio assets.',tracks:Object.freeze(tracks),states:Object.freeze({menu:'command',arsenal:'arsenal',collection:'arsenal',deckbuilder:'arsenal',shop:'supply',pack:'supply',match:'battlefield'}),crossfadeSeconds:.65,maximumVoices:2});
  root.FrontlinesMusic=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
