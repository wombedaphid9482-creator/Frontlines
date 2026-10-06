/* Canonical deck limits: editor, schema, engine setup and simulator share these. */
(function(root){
  'use strict';
  const rules=Object.freeze({size:26,maxCopies:4,maxLeaders:2,factionOnly:true,commanderSlots:1,commanderOutsideDeck:true});
  if(typeof module==='object'&&module.exports)module.exports=rules;
  root.FrontlinesDeckRules=rules;
})(typeof globalThis==='object'?globalThis:this);
