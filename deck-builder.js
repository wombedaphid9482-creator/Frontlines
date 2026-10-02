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
  let mobilePanel='cards',libraryPanel='library',advancedFilters=false,navigationApproved=false;
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
  function confirmLeave(){navigationApproved=false;if(!abandonDraft())return false;navigationApproved=true;return true;}
  function leaveArsenal(){window.FrontlinesShell?.goHome();}
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
    return '<div class="arsenal-filters"><label class="search" for="card-search">SEARCH CARDS<input id="card-search" data-filter="search" type="search" placeholder="Name, rules or role…" maxlength="100" value="'+esc(filters.search)+'"></label><label for="card-type-filter">TYPE<select id="card-type-filter" data-filter="type">'+options([['unit','Unit'],['leader','Commander'],['order','Order'],['asset','Asset']],filters.type,'All types')+'</select></label><label for="card-cost-filter">PRESENCE<select id="card-cost-filter" data-filter="cost">'+options([['0-2','0–2'],['3-4','3–4'],['5-6','5–6'],['7-8','7–8'],['9+','9+']],filters.cost,'All costs')+'</select></label><button class="btn quiet filter-toggle" data-action="filters" aria-controls="advanced-card-filters" aria-expanded="'+advancedFilters+'">'+(advancedFilters?'Less':'More')+' filters</button><div id="advanced-card-filters" class="advanced-card-filters" '+(!advancedFilters?'hidden':'')+'><label for="card-keyword-filter">KEYWORD / EFFECT<select id="card-keyword-filter" data-filter="keyword">'+options(keywords.map(k=>[k,k]),filters.keyword,'All keywords')+'</select></label><label for="card-role-filter">ROLE<select id="card-role-filter" data-filter="role">'+options(roles.map(k=>[k,k]),filters.role,'All roles')+'</select></label><label for="card-sort">SORT<select id="card-sort" data-filter="sort"><option value="cost" '+(filters.sort==='cost'?'selected':'')+'>Presence cost</option><option value="name" '+(filters.sort==='name'?'selected':'')+'>Name</option><option value="type" '+(filters.sort==='type'?'selected':'')+'>Card type</option></select></label><button class="btn quiet" data-action="clear-filters">Reset filters</button></div></div>';
  }
  function cardMarkup(c,counts){
    const count=counts[c.id]||0,max=allowedCopies(c),blocked=readOnly()||count>=max||deck.cards.length>=Decks.RULES.size;
    return '<article class="arsenal-card '+(inspected===c.id?'selected':'')+'" style="--faction-color:'+D.FACTIONS[c.faction].color+'" data-card="'+esc(c.id)+'"><button class="arsenal-card-inspect" data-action="inspect" data-id="'+esc(c.id)+'" aria-label="Inspect '+esc(c.name)+'"><span class="arsenal-card-top"><span>'+esc(c.type==='leader'?'COMMANDER':c.type==='unit'?cardRole(c).toUpperCase():c.type.toUpperCase())+'</span><b>'+c.presence+' P</b></span>'+portrait(c)+'<span class="arsenal-card-name">'+esc(c.name)+'</span><span class="arsenal-card-rules">'+esc(c.rulesText)+'</span><span class="arsenal-card-stats">'+(c.type==='order'?'<span>'+esc(c.timing||'action')+' ORDER</span>':'<span><small>ATK</small> '+c.attack+'</span><span><small>HP</small> '+c.health+'</span>')+'</span></button><div class="arsenal-copy-controls"><button data-action="remove-card" data-id="'+esc(c.id)+'" '+(readOnly()||!count?'disabled':'')+' aria-label="Remove '+esc(c.name)+'">−</button><span>'+count+' / '+max+'</span><button class="add" data-action="add-card" data-id="'+esc(c.id)+'" '+(blocked?'disabled':'')+' aria-label="Add '+esc(c.name)+'" title="'+(readOnly()?'Make an editable copy to change this deck':count>=max?'Maximum copies reached':deck.cards.length>=26?'Deck is full':'Add one copy')+'">+</button></div></article>';
  }
  function catalogMarkup(){const cards=selectedCatalog(),counts=Decks.validate(deck).counts;return cards.length?cards.map(c=>cardMarkup(c,counts)).join(''):'<p class="catalog-empty">No cards match these filters.<br>Try a broader search or reset filters.</p>';}
  function compositionMarkup(){
    const stats=Decks.composition(deck),validation=Decks.validate(deck),curveMax=Math.max(1,...stats.curve.map(b=>b.count));
    return '<section class="deck-summary" style="--faction-color:'+D.FACTIONS[faction].color+'" aria-label="Persistent deck composition"><div class="deck-summary-identity"><span>'+esc(D.FACTIONS[faction].name)+'</span><strong id="summary-deck-name">'+esc(deck.name)+'</strong><small id="summary-archetype">'+esc((deck.archetype||'custom').replace(/-/g,' '))+'</small></div><div class="deck-summary-count"><b>'+stats.size+'/'+Decks.RULES.size+'</b><span>CARDS</span><strong id="summary-legality" class="'+(validation.legal?'legal':'invalid')+'">'+(validation.legal?'LEGAL DECK':'DRAFT')+'</strong></div><div class="deck-summary-average"><b>'+stats.averageCost.toFixed(1)+'</b><span>AVG PRESENCE</span></div><div class="deck-summary-types"><span><b>'+ (stats.units+stats.leaders)+'</b> Units</span><span><b>'+stats.orders+'</b> Orders</span><span><b>'+stats.assets+'</b> Assets</span><span title="Heavy / Specialist / Commander">'+stats.heavy+' Heavy · '+stats.specialist+' Specialist · '+stats.leaders+' Commander</span></div><div class="deck-curve" aria-label="Presence cost distribution"><h3>PRESENCE CURVE</h3><div class="deck-curve-columns">'+stats.curve.map(b=>'<div class="deck-curve-column"><div class="deck-curve-bar"><i style="height:'+(b.count/curveMax*100)+'%"></i><span>'+b.count+'</span></div><span>'+esc(b.label)+'</span></div>').join('')+'</div></div></section>';
  }
  function commandMarkup(){
    const legal=Decks.validate(deck).legal,readonly=readOnly();
    return '<footer class="arsenal-command-bar" aria-label="Deck commands"><div class="arsenal-command-status">'+(readonly?'ORIGINAL DECK · MAKE IT YOURS':dirty?'UNSAVED CHANGES · CTRL + S':'YOUR DECK · LOCAL LIBRARY')+'</div><button class="btn primary" data-action="save" '+(readonly?'disabled title="Make an editable copy before saving changes"':'')+'>Save '+(legal?'deck':'draft')+'</button><button class="btn secondary" data-action="simulate" '+(!legal?'disabled':'')+'>Test in War Room</button><button class="btn '+(readonly?'primary':'secondary')+'" data-action="duplicate">'+(readonly?'Make editable copy':'Duplicate')+'</button><button class="btn quiet" data-action="export">Export deck</button><button class="btn primary play-deck-command" data-action="play" '+(!legal?'disabled':'')+'>Play this deck →</button></footer>';
  }
  function libraryMarkup(){
    const factionDecks=library().filter(d=>d.faction===faction);
    return '<div class="library-selection"><label for="builder-faction">FACTION<select id="builder-faction">'+Object.values(D.FACTIONS).map(f=>'<option value="'+f.id+'" '+(f.id===faction?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><label for="builder-deck">DECK LIBRARY<select id="builder-deck">'+(!deck.id?'<option value="" selected>Unsaved: '+esc(deck.name)+'</option>':'')+factionDecks.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===deck.id?'selected':'')+'>'+esc(d.name)+' · '+(d.source==='saved'?(Decks.validate(d).legal?'saved':'draft'):d.source)+'</option>').join('')+'</select></label></div><div class="arsenal-library-tabs" role="tablist" aria-label="Deck library panels"><button role="tab" id="library-tab" aria-controls="library-contents" aria-selected="'+(libraryPanel==='library')+'" data-action="library-panel" data-panel="library">Saved decks</button><button role="tab" id="contents-tab" aria-controls="deck-editor" aria-selected="'+(libraryPanel==='contents')+'" data-action="library-panel" data-panel="contents">Deck contents</button></div><div id="library-contents" class="library-contents" role="tabpanel" aria-labelledby="library-tab" '+(libraryPanel!=='library'?'hidden':'')+'><div class="deck-library-list">'+factionDecks.map(d=>'<button class="deck-library-item '+(d.id===deck.id?'selected':'')+'" data-action="select-deck" data-id="'+esc(d.id)+'"><strong>'+esc(d.name)+'</strong><span>'+esc((d.archetype||'custom').replace(/-/g,' '))+'</span><small>'+ (d.source==='saved'?(Decks.validate(d).legal?'SAVED · LEGAL':'SAVED DRAFT'):d.source==='starter'?'ORIGINAL STARTER':'ARCHETYPE PRESET')+'</small></button>').join('')+'</div><p class="arsenal-storage-note">All cards are available. Saved decks stay on this device. Originals remain available when you make a copy.</p></div><div id="deck-editor" role="tabpanel" aria-labelledby="contents-tab" '+(libraryPanel!=='contents'?'hidden':'')+'>'+editorMarkup()+'</div>'+ '<div class="library-commands"><button class="btn secondary" data-action="new">New deck</button><button class="btn quiet" data-action="import">Import deck</button><button class="btn quiet" data-action="random" title="Generate a random legal deck">Random</button></div>';
  }
  function deckRows(){
    const counts=Decks.validate(deck).counts;
    return Object.keys(counts).sort((a,b)=>(D.CARDS[a]?.presence??100)-(D.CARDS[b]?.presence??100)||(D.CARDS[a]?.name||a).localeCompare(D.CARDS[b]?.name||b)).map(id=>{const c=D.CARDS[id];return '<div class="deck-row '+(!c?'missing':'')+'"><span class="deck-row-cost">'+(c?c.presence:'?')+'</span><button class="deck-row-inspect" data-action="inspect" data-id="'+esc(id)+'">'+esc(c?.name||'Unavailable: '+id)+'</button><span class="deck-row-count">×'+counts[id]+'</span><button class="remove" data-action="remove-card" data-id="'+esc(id)+'" '+(readOnly()?'disabled':'')+' aria-label="Remove '+esc(c?.name||id)+'">−</button></div>';}).join('')||'<p class="arsenal-storage-note">Your deck is empty. Add cards from the Arsenal.</p>';
  }
  function editorMarkup(){
    const validation=Decks.validate(deck),readonly=readOnly();
    return '<div class="deck-editor" style="--faction-color:'+D.FACTIONS[faction].color+'"><label class="deck-name-label" for="deck-name">DECK NAME<input id="deck-name" maxlength="80" value="'+esc(deck.name)+'" '+(readonly?'readonly':'')+'></label><div id="deck-status" class="deck-status">'+(validation.legal?'<strong>● LEGAL / READY TO PLAY</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<span id="dirty-status">'+(readonly?'Original '+(deck.source==='starter'?'starter':'archetype preset')+' · preserved':dirty?'Unsaved changes':deck.id?'Saved on this device':'Not saved yet')+'</span></div>'+(!readonly?'<label class="deck-strategy-label" for="deck-strategy">STRATEGY INTENT<select id="deck-strategy" title="Guides deck-aware AI; your card choices remain unrestricted"><option value="custom" '+(deck.archetype==='custom'?'selected':'')+'>Custom / faction priorities</option>'+[...new Set(Decks.presets().filter(d=>d.faction===faction).map(d=>d.archetype))].map(a=>'<option value="'+esc(a)+'" '+(deck.archetype===a?'selected':'')+'>'+esc(a.replace(/-/g,' '))+'</option>').join('')+'</select></label>':'<p class="deck-source-notice">This original is preserved. Use <b>Make editable copy</b> below to build your own version.</p>')+(!validation.legal?'<div class="deck-legality" role="status"><b>Fix before playing</b><ul>'+validation.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'')+'<div class="deck-list" aria-label="Current deck cards">'+deckRows()+'</div>'+(!readonly&&deck.id?'<button class="btn danger delete-deck-command" data-action="delete">Delete saved deck</button>':'')+'</div>';
  }
  function detailMarkup(){
    const c=D.CARDS[inspected];if(!c)return '<div class="arsenal-detail"><h2>Card briefing</h2><p>Select a card to inspect its rules and artwork.</p></div>';
    const keywords=[...(c.traits||[])];if(c.effect&&definition(c.effect.kind)!=='Read the card’s exact rules text.'&&!keywords.includes(c.effect.kind))keywords.push(c.effect.kind);
    return '<div class="arsenal-detail" style="--faction-color:'+D.FACTIONS[c.faction].color+'">'+portrait(c)+'<span class="eyebrow">'+esc(D.FACTIONS[c.faction].name)+' / '+esc(c.type==='leader'?'Commander':c.type)+(c.unique?' / UNIQUE IN PLAY':'')+'</span><h2>'+esc(c.name)+'</h2><div class="arsenal-detail-stats"><div><b>'+c.presence+'</b><small>PRESENCE</small></div>'+(c.type!=='order'?'<div><b>'+c.attack+'</b><small>ATTACK</small></div><div><b>'+c.health+'</b><small>HEALTH</small></div>':'<div><b>↗</b><small>'+esc((c.timing||'action').toUpperCase())+'</small></div>')+'</div><h3>RULES</h3><p>'+esc(c.rulesText)+'</p><div class="keyword-definitions">'+keywords.map(k=>'<div class="keyword-definition"><b>'+esc(k)+'.</b> '+esc(definition(k))+'</div>').join('')+'</div>'+(c.flavorText||c.flavor?'<h3>FLAVOR</h3><p class="flavor">'+esc(c.flavorText||c.flavor)+'</p>':'')+(c.role?'<h3>BATTLEFIELD ROLE</h3><p>'+esc(c.role)+'</p>':'')+'<p class="role-note">'+(c.type==='order'?'Orders spend Presence until your next turn.':'Printed Presence is cost, ongoing commitment and capture strength.')+'<br>Maximum '+allowedCopies(c)+' copies of this design per deck.'+(c.unique?' Only one copy of this unique card may be deployed at once.':'')+'</p><button class="btn quiet compact" data-action="inspect-dialog">Enlarge briefing ↗</button></div>';
  }
  function render(){
    const active=document.activeElement,focusId=active?.id,focusAction=active?.dataset?.action,focusCard=active?.dataset?.id;
    const scrolls={catalog:document.getElementById('card-catalog')?.scrollTop||0,library:document.querySelector('.deck-library-list')?.scrollTop||0,editor:document.querySelector('.deck-list')?.scrollTop||0,detail:document.getElementById('card-detail')?.scrollTop||0};
    app.innerHTML='<div class="arsenal-main"><section class="arsenal-intro"><div><span class="eyebrow">YOUR FACTION. YOUR PLAN.</span><h1>ARSENAL</h1></div><p class="deck-rules">26 cards · One faction · 4 copies per design · 2 per Commander</p></section><nav class="arsenal-panel-tabs" aria-label="Arsenal panels">'+[['library','Deck library'],['cards','Card collection'],['briefing','Card briefing']].map(([id,label])=>'<button class="btn secondary '+(mobilePanel===id?'selected':'')+'" data-action="panel" data-panel="'+id+'" aria-pressed="'+(mobilePanel===id)+'">'+label+'</button>').join('')+'</nav><div class="arsenal-layout" data-active-panel="'+mobilePanel+'"><section class="arsenal-panel arsenal-deck-panel" data-pane="library">'+panelHeading('YOUR DECKS',D.FACTIONS[faction].name)+libraryMarkup()+'</section><section class="arsenal-panel arsenal-catalog-panel" data-pane="cards">'+panelHeading('FACTION ARSENAL',Object.values(D.CARDS).filter(c=>c.faction===faction).length+' designs')+filterMarkup()+'<div id="card-catalog" class="arsenal-catalog">'+catalogMarkup()+'</div></section><aside class="arsenal-panel arsenal-detail-panel" data-pane="briefing" aria-label="Selected card briefing">'+panelHeading('CARD BRIEFING','ART / RULES / KEYWORDS')+'<div id="card-detail">'+detailMarkup()+'</div></aside></div>'+compositionMarkup()+commandMarkup()+'</div>';
    document.getElementById('card-catalog').scrollTop=scrolls.catalog;document.querySelector('.deck-library-list').scrollTop=scrolls.library;document.querySelector('.deck-list').scrollTop=scrolls.editor;document.getElementById('card-detail').scrollTop=scrolls.detail;
    const nextFocus=focusId?document.getElementById(focusId):focusAction?app.querySelector('[data-action="'+CSS.escape(focusAction)+'"]'+(focusCard?'[data-id="'+CSS.escape(focusCard)+'"]':'')):null;if(nextFocus&&!nextFocus.disabled)nextFocus.focus({preventScroll:true});
  }
  function refreshCatalog(){document.getElementById('card-catalog').innerHTML=catalogMarkup();}
  function selectDeck(next){deck=clone(next);faction=deck.faction;dirty=false;filters={search:'',type:'',cost:'',keyword:'',role:'',sort:filters.sort};inspected=deck.cards.find(id=>D.CARDS[id])||Object.keys(D.CARDS).find(id=>D.CARDS[id].faction===faction);render();}
  function saveDeck(){
    const result=Decks.save(deck);if(!result.ok){render();notify(result.error,true);return null;}
    deck=result.deck;dirty=false;libraryPanel='contents';render();notify(Decks.validate(deck).legal?'Deck saved. Ready for the frontline.':'Draft saved. Fix the legality warnings before playing.');return deck;
  }
  function downloadDeck(){
    try{const json=Decks.exportDeck(deck),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(deck.name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'frontlines-deck')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notify(error.message,true);}
  }
  function openImport(){dialog.innerHTML='<h2>Import a deck</h2><p>Choose a Frontlines deck JSON file or paste its text. Imported decks are saved as a separate copy. Unknown or changed cards become visible legality warnings.</p><label class="tag" for="deck-import-file">JSON FILE</label><input id="deck-import-file" type="file" accept=".json,application/json"><label class="tag" for="deck-import-text">OR PASTE JSON</label><textarea id="deck-import-text" placeholder="Paste exported deck JSON here…" maxlength="100000"></textarea><p id="import-error" role="status"></p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Cancel</button><button class="btn primary" data-dialog-action="import">Import & save copy</button></div>';dialog.showModal();}
  function importText(text){
    try{const imported=Decks.importDeck(text),result=Decks.save(imported);if(!result.ok)throw new Error(result.error);dialog.close();libraryPanel='contents';mobilePanel='library';selectDeck(result.deck);notify(Decks.validate(deck).legal?'Deck imported and saved.':'Draft imported. Review the legality warnings.');return true;}catch(error){const notice=document.getElementById('import-error');if(notice)notice.textContent=error.message;else notify(error.message,true);return false;}
  }
  app.addEventListener('input',event=>{
    if(event.target.id==='deck-name'&&!readOnly()){deck.name=event.target.value;dirty=true;document.getElementById('summary-deck-name').textContent=deck.name;document.querySelector('.arsenal-command-status').textContent='UNSAVED CHANGES · CTRL + S';const legal=Decks.validate(deck).legal;document.getElementById('deck-status').innerHTML=(legal?'<strong>● LEGAL / READY TO PLAY</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<br><span id="dirty-status">Unsaved changes</span>';document.getElementById('summary-legality').textContent=legal?'LEGAL DECK':'DRAFT';document.getElementById('summary-legality').className=legal?'legal':'invalid';for(const action of ['play','simulate']){const launch=app.querySelector('[data-action="'+action+'"]');if(launch)launch.disabled=!legal;}}
    if(event.target.dataset.filter==='search'){filters.search=event.target.value;refreshCatalog();}
  });
  app.addEventListener('change',event=>{
    const node=event.target;
    if(node.dataset.filter&&node.dataset.filter!=='search'){filters[node.dataset.filter]=node.value;refreshCatalog();}
    if(node.id==='deck-strategy'&&!readOnly()){deck.archetype=node.value;dirty=true;document.getElementById('dirty-status').textContent='Unsaved changes';document.getElementById('summary-archetype').textContent=deck.archetype.replace(/-/g,' ');document.querySelector('.arsenal-command-status').textContent='UNSAVED CHANGES · CTRL + S';}
    if(node.id==='builder-deck'){if(!abandonDraft()){node.value=deck.id;return;}const next=library().find(d=>d.id===node.value);if(next)selectDeck(next);}
    if(node.id==='builder-faction'){if(!abandonDraft()){node.value=faction;return;}selectDeck(library().find(d=>d.faction===node.value));}
  });
  app.addEventListener('click',event=>{
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;
    const id=node.dataset.id,c=D.CARDS[id];
    switch(node.dataset.action){
      case 'filters':advancedFilters=!advancedFilters;render();break;
      case 'panel':mobilePanel=node.dataset.panel;render();break;
      case 'library-panel':libraryPanel=node.dataset.panel;render();break;
      case 'select-deck':if(abandonDraft()){const next=library().find(d=>d.id===id);if(next)selectDeck(next);}break;
      case 'inspect':if(c){inspected=id;document.getElementById('card-detail').innerHTML=detailMarkup();refreshCatalog();if(innerWidth<850){dialog.innerHTML=detailMarkup()+'<div class="arsenal-dialog-actions"><button class="btn primary" data-dialog-action="close">Back to deck</button></div>';dialog.showModal();}}else notify('This card is unavailable. Remove or replace it to make the deck legal.',true);break;
      case 'inspect-dialog':dialog.innerHTML=detailMarkup().replace(/<button class="btn quiet compact" data-action="inspect-dialog">.*?<\/button>/,'')+'<div class="arsenal-dialog-actions"><button class="btn primary" data-dialog-action="close">Back to deck</button></div>';dialog.showModal();break;
      case 'add-card':if(!readOnly()&&c&&c.faction===deck.faction&&deck.cards.length<26&&(Decks.validate(deck).counts[id]||0)<allowedCopies(c)){deck.cards.push(id);dirty=true;inspected=id;render();}break;
      case 'remove-card':if(!readOnly()){const index=deck.cards.indexOf(id);if(index>=0){deck.cards.splice(index,1);dirty=true;render();}}break;
      case 'clear-filters':filters={search:'',type:'',cost:'',keyword:'',role:'',sort:'cost'};render();break;
      case 'save':saveDeck();break;
      case 'duplicate':{const result=Decks.duplicate(deck,deck.name.slice(0,70)+' copy');if(result.ok){libraryPanel='contents';selectDeck(result.deck);notify('Editable copy saved. Make this deck your own.');document.getElementById('deck-name').focus();}else notify(result.error,true);break;}
      case 'new':if(abandonDraft()){libraryPanel='contents';mobilePanel='library';selectDeck({id:'',name:D.FACTIONS[faction].name+' custom',faction,cards:[],archetype:'custom',source:'saved'});dirty=true;render();document.getElementById('deck-name').focus();}break;
      case 'random':if(abandonDraft()){libraryPanel='contents';mobilePanel='library';const next=Decks.random(faction,Math.floor(Math.random()*2147483646)+1);selectDeck(next);dirty=true;render();notify('Legal random deck created. Save it to keep a copy.');}break;
      case 'export':downloadDeck();break;
      case 'import':if(abandonDraft())openImport();break;
      case 'delete':dialog.innerHTML='<h2>Delete this saved deck?</h2><p>'+esc(deck.name)+' will be removed from this device. Export a copy first if you want to keep it. Original starter and archetype decks remain available.</p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Keep deck</button><button class="btn danger" data-dialog-action="delete">Delete deck</button></div>';dialog.showModal();break;
      case 'simulate':if(Decks.validate(deck).legal){const current=readOnly()?deck:saveDeck();if(current)location.href='simulator.html?deck='+encodeURIComponent(current.id);}break;
      case 'play':if(Decks.validate(deck).legal){const current=readOnly()?deck:saveDeck();if(current)location.href='index.html?screen=play&faction='+encodeURIComponent(current.faction)+'&deck='+encodeURIComponent(current.id);}break;
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
  document.addEventListener('keydown',event=>{
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'){
      event.preventDefault();if(dialog.open||window.FrontlinesShell?.getState().settingsOpen)return;
      if(readOnly())notify('Make an editable copy to save your own version.');else saveDeck();
    }
    if(event.key==='Escape'){
      if(dialog.open){event.preventDefault();event.stopImmediatePropagation();dialog.close();}
      else if(mobilePanel==='briefing'){event.preventDefault();event.stopImmediatePropagation();mobilePanel='cards';render();}
      else if(!window.FrontlinesShell?.getState().settingsOpen && !['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();leaveArsenal();}
    }
  },true);
  window.addEventListener('storage',event=>{if(event.key===Decks.STORAGE_KEY&&!dirty){const updated=library().find(d=>d.id===deck.id);if(updated)selectDeck(updated);else render();}});
  window.addEventListener('beforeunload',event=>{if(navigationApproved){navigationApproved=false;return;}if(dirty){event.preventDefault();event.returnValue='';}});
  window.FrontlinesDeckBuilder={getDeck:()=>clone(deck),getSavedDecks:()=>Decks.load(),getLegality:()=>Decks.validate(deck),getComposition:()=>Decks.composition(deck),hasUnsavedChanges:()=>dirty,confirmLeave,selectDeck:id=>{const next=library().find(d=>d.id===id);if(next)selectDeck(next);},importText};
  render();
})();
