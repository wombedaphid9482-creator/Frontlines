/* Local Arsenal interface. Deck rules and storage are shared with live play and Balance Lab. */
(function () {
  'use strict';
  const D=window.FrontlinesData,Art=window.FrontlinesArt;
  const Decks=window.FrontlinesDecks?.forData(D);
  const app=document.getElementById('deck-builder'),dialog=document.getElementById('deck-dialog');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  if(!Decks||!D){app.innerHTML='<section class="boot-screen"><h1>ARSENAL</h1><p>Deck files could not be loaded. Keep decks.js beside the game files.</p></section>';return;}
  let faction='stonewall',deck,inspected=null,dirty=false,toastTimer;
  let filters={search:'',type:'',cost:'',keyword:'',role:'',sort:'cost'};
  const params=new URLSearchParams(location.search);
  if(D.FACTIONS[params.get('faction')])faction=params.get('faction');
  const library=()=>Decks.getDecks();
  const initial=library().find(d=>d.id===params.get('deck'))||library().find(d=>d.faction===faction);
  deck=clone(initial||{id:'',name:'Untitled deck',faction,cards:[],archetype:'custom',source:'saved'});faction=deck.faction;
  inspected=deck.cards.find(id=>D.CARDS[id])||Object.keys(D.CARDS).find(id=>D.CARDS[id].faction===faction);
  const readOnly=()=>deck.source==='starter'||deck.source==='preset';
  function notify(message,error){const toast=document.getElementById('deck-toast');toast.textContent=message;toast.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),4000);}
  function abandonDraft(){return !dirty||window.confirm('Discard the unsaved changes to this deck?');}
  function cardRole(card){return card.artRole||Art?.role(card)||card.type;}
  function portrait(card){
    if(card.type==='unit'||card.type==='leader'){
      const a=Art?.get(card);if(a)return '<span class="arsenal-portrait" role="img" aria-label="'+esc(a.alt)+'" style="background-image:url(&quot;'+esc(a.src)+'&quot;);background-position:'+a.position+'"></span>';
    }
    const emblem=Art?.THEMES[card.faction]?.emblem;
    return '<span class="arsenal-portrait role-'+esc(card.type)+'" role="img" aria-label="'+esc(card.name+' tactical insignia')+'">'+(emblem?'<img src="'+esc(emblem)+'" alt="" width="66" height="66">':'<span>◇</span>')+'</span>';
  }
  function allowedCopies(card){return card.type==='leader'?Decks.RULES.maxLeaders:Decks.RULES.maxCopies;}
  function definition(key){const glossaryKey=key==='command'?'Command aura':key;return Object.entries(D.GLOSSARY||{}).find(([name])=>name.toLowerCase()===glossaryKey.toLowerCase())?.[1]||'Read the card’s exact rules text.';}
  function panelHeading(title,detail){return '<div class="arsenal-panel-heading"><h2>'+title+'</h2><span>'+esc(detail)+'</span></div>';}
  function selectedCatalog(){
    return Object.values(D.CARDS).filter(c=>c.faction===faction)
      .filter(c=>!filters.search||[c.name,c.rulesText,c.role,c.archetype,...(c.traits||[])].join(' ').toLowerCase().includes(filters.search.toLowerCase()))
      .filter(c=>!filters.type||c.type===filters.type)
      .filter(c=>!filters.role||cardRole(c)===filters.role||c.role===filters.role)
      .filter(c=>!filters.keyword||(c.traits||[]).includes(filters.keyword)||c.effect?.kind===filters.keyword)
      .filter(c=>!filters.cost||(filters.cost==='9+'?c.presence>=9:filters.cost==='0-2'?c.presence<=2:filters.cost==='3-4'?c.presence>=3&&c.presence<=4:filters.cost==='5-6'?c.presence>=5&&c.presence<=6:c.presence>=7&&c.presence<=8))
      .sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name):filters.sort==='type'?a.type.localeCompare(b.type)||a.presence-b.presence||a.name.localeCompare(b.name):a.presence-b.presence||a.name.localeCompare(b.name));
  }
  function options(items,selected,all){return '<option value="">'+all+'</option>'+items.map(([value,name])=>'<option value="'+esc(value)+'" '+(value===selected?'selected':'')+'>'+esc(name)+'</option>').join('');}
  function filterMarkup(){
    const pool=Object.values(D.CARDS).filter(c=>c.faction===faction),keywords=[...new Set(pool.flatMap(c=>[...(c.traits||[]),...(c.effect?[c.effect.kind]:[])]))].sort(),roles=[...new Set(pool.flatMap(c=>[cardRole(c),c.role].filter(Boolean)))].sort();
    return '<div class="arsenal-filters"><label class="search" for="card-search">SEARCH CARDS<input id="card-search" data-filter="search" type="search" placeholder="Name, rules, keyword or role…" maxlength="100" value="'+esc(filters.search)+'"></label><label for="card-type-filter">CARD TYPE<select id="card-type-filter" data-filter="type">'+options([['unit','Unit'],['leader','Commander'],['order','Order'],['asset','Asset']],filters.type,'All types')+'</select></label><label for="card-cost-filter">PRESENCE<select id="card-cost-filter" data-filter="cost">'+options([['0-2','0–2'],['3-4','3–4'],['5-6','5–6'],['7-8','7–8'],['9+','9+']],filters.cost,'All costs')+'</select></label><label for="card-keyword-filter">KEYWORD / EFFECT<select id="card-keyword-filter" data-filter="keyword">'+options(keywords.map(k=>[k,k]),filters.keyword,'All keywords')+'</select></label><label for="card-role-filter">ROLE<select id="card-role-filter" data-filter="role">'+options(roles.map(k=>[k,k]),filters.role,'All roles')+'</select></label><label for="card-sort">SORT<select id="card-sort" data-filter="sort"><option value="cost" '+(filters.sort==='cost'?'selected':'')+'>Presence cost</option><option value="name" '+(filters.sort==='name'?'selected':'')+'>Name</option><option value="type" '+(filters.sort==='type'?'selected':'')+'>Card type</option></select></label><button class="btn quiet compact" data-action="clear-filters">Reset filters</button></div>';
  }
  function cardMarkup(c,counts){
    const count=counts[c.id]||0,max=allowedCopies(c),blocked=readOnly()||count>=max||deck.cards.length>=Decks.RULES.size;
    return '<article class="arsenal-card '+(inspected===c.id?'selected':'')+'" style="--faction-color:'+D.FACTIONS[c.faction].color+'" data-card="'+esc(c.id)+'"><button class="arsenal-card-inspect" data-action="inspect" data-id="'+esc(c.id)+'" aria-label="Inspect '+esc(c.name)+'"><span class="arsenal-card-top"><span>'+esc(c.type==='leader'?'COMMANDER':c.type==='unit'?cardRole(c).toUpperCase():c.type.toUpperCase())+'</span><b>'+c.presence+' P</b></span>'+portrait(c)+'<span class="arsenal-card-name">'+esc(c.name)+'</span><span class="arsenal-card-rules">'+esc(c.rulesText)+'</span><span class="arsenal-card-stats">'+(c.type==='order'?'<span>'+esc(c.timing||'action')+' ORDER</span>':'<span><small>ATK</small> '+c.attack+'</span><span><small>HP</small> '+c.health+'</span>')+'</span></button><div class="arsenal-copy-controls"><button data-action="remove-card" data-id="'+esc(c.id)+'" '+(readOnly()||!count?'disabled':'')+' aria-label="Remove '+esc(c.name)+'">−</button><span>'+count+' / '+max+'</span><button class="add" data-action="add-card" data-id="'+esc(c.id)+'" '+(blocked?'disabled':'')+' aria-label="Add '+esc(c.name)+'" title="'+(readOnly()?'Make an editable copy to change this deck':count>=max?'Maximum copies reached':deck.cards.length>=26?'Deck is full':'Add one copy')+'">+</button></div></article>';
  }
  function catalogMarkup(){const cards=selectedCatalog(),counts=Decks.validate(deck).counts;return cards.length?cards.map(c=>cardMarkup(c,counts)).join(''):'<p class="catalog-empty">No cards match these filters.<br>Try a broader search or reset filters.</p>';}
  function compositionMarkup(){
    const stats=Decks.composition(deck),curveMax=Math.max(1,...stats.curve.map(b=>b.count));
    return '<div class="deck-composition" aria-label="Deck composition">'+[[stats.size+'/'+Decks.RULES.size,'CARDS'],[stats.averageCost.toFixed(1),'AVG PRESENCE'],[stats.units+stats.leaders,'FIGHTING UNITS'],[stats.orders,'ORDERS'],[stats.assets,'ASSETS'],[stats.leaders,'COMMANDERS'],[stats.heavy,'HEAVIES'],[stats.specialist,'SPECIALISTS'],[Object.keys(Decks.validate(deck).counts).length,'DESIGNS']].map(([n,label])=>'<div><b>'+n+'</b><small>'+label+'</small></div>').join('')+'</div><div class="deck-curve" aria-label="Presence cost distribution"><h3>PRESENCE CURVE</h3><div class="deck-curve-columns">'+stats.curve.map(b=>'<div class="deck-curve-column"><div class="deck-curve-bar"><i style="height:'+(b.count/curveMax*100)+'%"></i><span>'+b.count+'</span></div><span>'+esc(b.label)+'</span></div>').join('')+'</div></div>';
  }
  function deckRows(){
    const counts=Decks.validate(deck).counts;
    return Object.keys(counts).sort((a,b)=>(D.CARDS[a]?.presence??100)-(D.CARDS[b]?.presence??100)||(D.CARDS[a]?.name||a).localeCompare(D.CARDS[b]?.name||b)).map(id=>{const c=D.CARDS[id];return '<div class="deck-row '+(!c?'missing':'')+'"><span class="deck-row-cost">'+(c?c.presence:'?')+'</span><button class="deck-row-inspect" data-action="inspect" data-id="'+esc(id)+'">'+esc(c?.name||'Unavailable: '+id)+'</button><span class="deck-row-count">×'+counts[id]+'</span><button class="remove" data-action="remove-card" data-id="'+esc(id)+'" '+(readOnly()?'disabled':'')+' aria-label="Remove '+esc(c?.name||id)+'">−</button></div>';}).join('')||'<p class="arsenal-storage-note">Your deck is empty. Add cards from the Arsenal.</p>';
  }
  function editorMarkup(){
    const validation=Decks.validate(deck),readonly=readOnly();
    return '<div class="deck-editor" style="--faction-color:'+D.FACTIONS[faction].color+'"><label class="deck-name-label" for="deck-name">DECK NAME<input id="deck-name" maxlength="80" value="'+esc(deck.name)+'" '+(readonly?'readonly':'')+'></label><div id="deck-status" class="deck-status">'+(validation.legal?'<strong>● LEGAL / READY TO PLAY</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<br><span id="dirty-status">'+(readonly?'Original '+(deck.source==='starter'?'starter':'archetype preset')+' · preserved':dirty?'Unsaved changes':deck.id?'Saved on this device':'Not saved yet')+'</span></div>'+(!readonly?'<label class="deck-strategy-label" for="deck-strategy">STRATEGY INTENT<select id="deck-strategy"><option value="custom" '+(deck.archetype==='custom'?'selected':'')+'>Custom / faction priorities</option>'+[...new Set(Decks.presets().filter(d=>d.faction===faction).map(d=>d.archetype))].map(a=>'<option value="'+esc(a)+'" '+(deck.archetype===a?'selected':'')+'>'+esc(a.replace(/-/g,' '))+'</option>').join('')+'</select><small>Guides deck-aware AI in matches and simulations. Your card choices stay unrestricted within this faction.</small></label>':'')+(deck.archetype&&deck.archetype!=='custom'?'<div class="deck-archetype">'+esc(deck.archetype.replace(/-/g,' '))+'</div>':'')+(deck.description?'<p class="deck-description">'+esc(deck.description)+'</p>':'')+(readonly?'<div class="deck-source-notice">This original deck remains available for every player. Make a copy to create your own version.<button class="btn primary" data-action="duplicate">Make editable copy →</button></div>':'')+compositionMarkup()+(!validation.legal?'<div class="deck-legality" role="status"><b>Fix these before playing</b><ul>'+validation.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'')+'<div class="deck-list" aria-label="Current deck cards">'+deckRows()+'</div><div class="deck-actions">'+(!readonly?'<button class="btn primary" data-action="save">Save '+(validation.legal?'deck':'draft')+'</button><button class="btn quiet" data-action="duplicate">Duplicate</button>':'')+'<button class="btn quiet" data-action="export">Export JSON ↓</button><button class="btn quiet" data-action="play" '+(!validation.legal?'disabled':'')+'>Use in match ↗</button><button class="btn quiet" data-action="simulate" '+(!validation.legal?'disabled':'')+'>Simulate deck ↗</button>'+(!readonly&&deck.id?'<button class="btn danger" data-action="delete">Delete deck</button>':'')+'</div><p class="arsenal-storage-note">All gameplay cards are available. Your saved decks stay on this device. Export a copy to share or back them up. Illegal drafts remain editable after updates.</p></div>';
  }
  function detailMarkup(){
    const c=D.CARDS[inspected];if(!c)return '<div class="arsenal-detail"><h2>Card briefing</h2><p>Select a card to inspect its rules and artwork.</p></div>';
    const keywords=[...(c.traits||[])];if(c.effect&&definition(c.effect.kind)!=='Read the card’s exact rules text.'&&!keywords.includes(c.effect.kind))keywords.push(c.effect.kind);
    return '<div class="arsenal-detail" style="--faction-color:'+D.FACTIONS[c.faction].color+'">'+portrait(c)+'<span class="eyebrow">'+esc(D.FACTIONS[c.faction].name)+' / '+esc(c.type==='leader'?'Commander':c.type)+(c.unique?' / UNIQUE IN PLAY':'')+'</span><h2>'+esc(c.name)+'</h2><div class="arsenal-detail-stats"><div><b>'+c.presence+'</b><small>PRESENCE</small></div>'+(c.type!=='order'?'<div><b>'+c.attack+'</b><small>ATTACK</small></div><div><b>'+c.health+'</b><small>HEALTH</small></div>':'<div><b>↗</b><small>'+esc((c.timing||'action').toUpperCase())+'</small></div>')+'</div><h3>RULES</h3><p>'+esc(c.rulesText)+'</p><div class="keyword-definitions">'+keywords.map(k=>'<div class="keyword-definition"><b>'+esc(k)+'.</b> '+esc(definition(k))+'</div>').join('')+'</div>'+(c.flavorText||c.flavor?'<h3>FLAVOR</h3><p class="flavor">'+esc(c.flavorText||c.flavor)+'</p>':'')+(c.role?'<h3>BATTLEFIELD ROLE</h3><p>'+esc(c.role)+'</p>':'')+'<p class="role-note">'+(c.type==='order'?'Orders spend Presence until your next turn.':'Printed Presence is cost, ongoing commitment and capture strength.')+'<br>Maximum '+allowedCopies(c)+' copies of this design per deck.'+(c.unique?' Only one copy of this unique card may be deployed at once.':'')+'</p><button class="btn quiet compact" data-action="inspect-dialog">Enlarge briefing ↗</button></div>';
  }
  function render(){
    const factionDecks=library().filter(d=>d.faction===faction);
    app.innerHTML='<div class="arsenal-main"><section class="arsenal-intro"><div><span class="eyebrow">FORGE 004 / YOUR FACTION. YOUR PLAN.</span><h1>BUILD YOUR FRONTLINE.</h1><p>Inspect every card, shape your Presence curve, and make your own version of a faction. Start with an original deck or assemble a new one, then take it into a match or the Balance Lab.</p></div><div class="deck-rules">26 CARDS / ONE FACTION<br>UP TO 4 COPIES PER DESIGN<br>UP TO 2 COPIES PER COMMANDER</div></section><div class="arsenal-toolbar"><label for="builder-faction">FACTION<select id="builder-faction">'+Object.values(D.FACTIONS).map(f=>'<option value="'+f.id+'" '+(f.id===faction?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><label for="builder-deck">DECK LIBRARY<select id="builder-deck">'+(!deck.id?'<option value="" selected>Unsaved: '+esc(deck.name)+'</option>':'')+factionDecks.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===deck.id?'selected':'')+'>'+esc(d.name)+' · '+(d.source==='saved'?(Decks.validate(d).legal?'saved':'draft'):d.source)+'</option>').join('')+'</select></label><div class="arsenal-toolbar-buttons"><button class="btn quiet" data-action="new">New deck</button><button class="btn quiet" data-action="random">Random legal</button><button class="btn quiet" data-action="import">Import JSON</button></div></div><div class="arsenal-layout"><section class="arsenal-panel arsenal-catalog-panel">'+panelHeading('FACTION ARSENAL',Object.values(D.CARDS).filter(c=>c.faction===faction).length+' designs')+filterMarkup()+'<div id="card-catalog" class="arsenal-catalog">'+catalogMarkup()+'</div></section><section class="arsenal-panel arsenal-deck-panel">'+panelHeading('YOUR DECK',D.FACTIONS[faction].name)+'<div id="deck-editor">'+editorMarkup()+'</div></section><aside class="arsenal-panel arsenal-detail-panel" aria-label="Selected card briefing">'+panelHeading('CARD BRIEFING','ART / RULES / KEYWORDS')+'<div id="card-detail">'+detailMarkup()+'</div></aside></div></div>';
  }
  function refreshCatalog(){document.getElementById('card-catalog').innerHTML=catalogMarkup();}
  function selectDeck(next){deck=clone(next);faction=deck.faction;dirty=false;filters={search:'',type:'',cost:'',keyword:'',role:'',sort:filters.sort};inspected=deck.cards.find(id=>D.CARDS[id])||Object.keys(D.CARDS).find(id=>D.CARDS[id].faction===faction);render();}
  function saveDeck(){
    const result=Decks.save(deck);if(!result.ok){render();notify(result.error,true);return null;}
    deck=result.deck;dirty=false;render();notify(Decks.validate(deck).legal?'Deck saved. Ready for the frontline.':'Draft saved. Fix the legality warnings before playing.');return deck;
  }
  function downloadDeck(){
    try{const json=Decks.exportDeck(deck),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(deck.name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'frontlines-deck')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notify(error.message,true);}
  }
  function openImport(){dialog.innerHTML='<h2>Import a deck</h2><p>Choose a Frontlines deck JSON file or paste its text. Imported decks are saved as a separate copy. Unknown or changed cards become visible legality warnings.</p><label class="tag" for="deck-import-file">JSON FILE</label><input id="deck-import-file" type="file" accept=".json,application/json"><label class="tag" for="deck-import-text">OR PASTE JSON</label><textarea id="deck-import-text" placeholder="Paste exported deck JSON here…" maxlength="100000"></textarea><p id="import-error" role="status"></p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Cancel</button><button class="btn primary" data-dialog-action="import">Import & save copy</button></div>';dialog.showModal();}
  function importText(text){
    try{const imported=Decks.importDeck(text),result=Decks.save(imported);if(!result.ok)throw new Error(result.error);dialog.close();selectDeck(result.deck);notify(Decks.validate(deck).legal?'Deck imported and saved.':'Draft imported. Review the legality warnings.');return true;}catch(error){const notice=document.getElementById('import-error');if(notice)notice.textContent=error.message;else notify(error.message,true);return false;}
  }
  app.addEventListener('input',event=>{
    if(event.target.id==='deck-name'&&!readOnly()){deck.name=event.target.value;dirty=true;const legal=Decks.validate(deck).legal;document.getElementById('deck-status').innerHTML=(legal?'<strong>● LEGAL / READY TO PLAY</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<br><span id="dirty-status">Unsaved changes</span>';for(const action of ['play','simulate']){const launch=app.querySelector('[data-action="'+action+'"]');if(launch)launch.disabled=!legal;}}
    if(event.target.dataset.filter==='search'){filters.search=event.target.value;refreshCatalog();}
  });
  app.addEventListener('change',event=>{
    const node=event.target;
    if(node.dataset.filter&&node.dataset.filter!=='search'){filters[node.dataset.filter]=node.value;refreshCatalog();}
    if(node.id==='deck-strategy'&&!readOnly()){deck.archetype=node.value;dirty=true;document.getElementById('dirty-status').textContent='Unsaved changes';}
    if(node.id==='builder-deck'){if(!abandonDraft()){node.value=deck.id;return;}const next=library().find(d=>d.id===node.value);if(next)selectDeck(next);}
    if(node.id==='builder-faction'){if(!abandonDraft()){node.value=faction;return;}selectDeck(library().find(d=>d.faction===node.value));}
  });
  app.addEventListener('click',event=>{
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;
    const id=node.dataset.id,c=D.CARDS[id];
    switch(node.dataset.action){
      case 'inspect':if(c){inspected=id;document.getElementById('card-detail').innerHTML=detailMarkup();refreshCatalog();if(innerWidth<=760){dialog.innerHTML=detailMarkup()+'<div class="arsenal-dialog-actions"><button class="btn primary" data-dialog-action="close">Back to deck</button></div>';dialog.showModal();}}else notify('This card is unavailable. Remove or replace it to make the deck legal.',true);break;
      case 'inspect-dialog':dialog.innerHTML=detailMarkup().replace(/<button class="btn quiet compact" data-action="inspect-dialog">.*?<\/button>/,'')+'<div class="arsenal-dialog-actions"><button class="btn primary" data-dialog-action="close">Back to deck</button></div>';dialog.showModal();break;
      case 'add-card':if(!readOnly()&&c&&c.faction===deck.faction&&deck.cards.length<26&&(Decks.validate(deck).counts[id]||0)<allowedCopies(c)){deck.cards.push(id);dirty=true;inspected=id;render();}break;
      case 'remove-card':if(!readOnly()){const index=deck.cards.indexOf(id);if(index>=0){deck.cards.splice(index,1);dirty=true;render();}}break;
      case 'clear-filters':filters={search:'',type:'',cost:'',keyword:'',role:'',sort:'cost'};render();break;
      case 'save':saveDeck();break;
      case 'duplicate':{const result=Decks.duplicate(deck,deck.name.slice(0,70)+' copy');if(result.ok){selectDeck(result.deck);notify('Editable copy saved. Make this deck your own.');document.getElementById('deck-name').focus();}else notify(result.error,true);break;}
      case 'new':if(abandonDraft()){selectDeck({id:'',name:D.FACTIONS[faction].name+' custom',faction,cards:[],archetype:'custom',source:'saved'});dirty=true;render();document.getElementById('deck-name').focus();}break;
      case 'random':if(abandonDraft()){const next=Decks.random(faction,Math.floor(Math.random()*2147483646)+1);selectDeck(next);dirty=true;render();notify('Legal random deck created. Save it to keep a copy.');}break;
      case 'export':downloadDeck();break;
      case 'import':if(abandonDraft())openImport();break;
      case 'delete':dialog.innerHTML='<h2>Delete this saved deck?</h2><p>'+esc(deck.name)+' will be removed from this device. Export a copy first if you want to keep it. Original starter and archetype decks remain available.</p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Keep deck</button><button class="btn danger" data-dialog-action="delete">Delete deck</button></div>';dialog.showModal();break;
      case 'simulate':if(Decks.validate(deck).legal){const current=readOnly()?deck:saveDeck();if(current)location.href='simulator.html?deck='+encodeURIComponent(current.id);}break;
      case 'play':if(Decks.validate(deck).legal){const current=readOnly()?deck:saveDeck();if(current)location.href='index.html?faction='+encodeURIComponent(current.faction)+'&deck='+encodeURIComponent(current.id);}break;
    }
  });
  dialog.addEventListener('click',event=>{
    const node=event.target.closest('[data-dialog-action]');if(!node)return;
    if(node.dataset.dialogAction==='close')dialog.close();
    if(node.dataset.dialogAction==='import')importText(document.getElementById('deck-import-text').value);
    if(node.dataset.dialogAction==='delete'){const result=Decks.remove(deck.id);if(result.ok){dialog.close();selectDeck(library().find(d=>d.faction===faction));notify('Saved deck deleted.');}else notify(result.error,true);}
  });
  dialog.addEventListener('change',async event=>{
    if(event.target.id!=='deck-import-file')return;const file=event.target.files?.[0];if(!file)return;
    if(file.size>100000){document.getElementById('import-error').textContent='Deck files must be smaller than 100 KB.';return;}
    try{document.getElementById('deck-import-text').value=await file.text();document.getElementById('import-error').textContent='File loaded. Select Import & save copy.';}catch(_){document.getElementById('import-error').textContent='The file could not be read.';}
  });
  window.addEventListener('storage',event=>{if(event.key===Decks.STORAGE_KEY&&!dirty){const updated=library().find(d=>d.id===deck.id);if(updated)selectDeck(updated);else render();}});
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.FrontlinesDeckBuilder={getDeck:()=>clone(deck),getSavedDecks:()=>Decks.load(),getLegality:()=>Decks.validate(deck),getComposition:()=>Decks.composition(deck),selectDeck:id=>{const next=library().find(d=>d.id===id);if(next)selectDeck(next);},importText};
  render();
})();
