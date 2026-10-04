/* Local playtest convenience: select legal existing lists, never generate cards. */
(function(root,factory){
  'use strict';const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.FrontlinesPlaytestOpponents=api;
})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const key=choice=>[choice.faction,choice.deckId,choice.commanderId||''].join('/');
  function choose(Decks,Commanders,options={}){
    const candidates=[];
    for(const deck of Decks.getDecks()){
      if(options.faction&&deck.faction!==options.faction)continue;
      const leaders=options.commanderId?[Commanders.get(options.commanderId)]:Commanders.list(deck.faction);
      for(const commander of leaders){
        if(!commander||commander.faction!==deck.faction)continue;
        if(!Decks.validate({...deck,commanderId:commander.id}).legal)continue;
        candidates.push({faction:deck.faction,deckId:deck.id,deckName:deck.name,commanderId:commander.id});
      }
    }
    if(!candidates.length)throw Error('No legal decks match the selected faction and Commander.');
    const alternatives=candidates.filter(c=>key(c)!==options.avoidKey),pool=alternatives.length?alternatives:candidates;
    let seed=(Number(options.seed)>>>0)||1;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
    return {...pool[Math.floor((seed>>>0)/4294967296*pool.length)]};
  }
  return Object.freeze({key,choose});
});
