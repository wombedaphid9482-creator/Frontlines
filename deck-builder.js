/* Local Arsenal interface. Deck rules and storage are shared with live play and Balance Lab. */
(function () {
  'use strict';
  const D=window.FrontlinesData,Art=window.FrontlinesArt,Collection=window.FrontlinesCollection,Presentation=window.FrontlinesPresentation,Commanders=window.FrontlinesCommanders;
  const Decks=window.FrontlinesDecks?.forData(D);
  const app=document.getElementById('deck-builder'),dialog=document.getElementById('deck-dialog');
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  if(!Decks||!D){app.innerHTML='<section class="boot-screen"><h1>ARSENAL</h1><p>Deck files could not be loaded. Keep decks.js beside the game files.</p></section>';return;}
  let faction='stonewall',deck,inspected=null,dirty=false,toastTimer;
  let mobilePanel='cards',libraryPanel='library',advancedFilters=false,navigationApproved=false;
  let collectionScope='deck',librarySearch='',libraryKind='',history=[],future=[],rendering=false;
  const freshFilters=sort=>({search:'',type:'',cost:'',keyword:'',role:'',archetype:'',tag:'',set:'',command:'',rarity:'',ownership:'',inDeck:false,sort:sort||'cost'});
  let filters=freshFilters();
  const params=new URLSearchParams(location.search);
  if(D.FACTIONS[params.get('faction')])faction=params.get('faction');
  const library=()=>Decks.getDecks();
  const initial=library().find(d=>d.id===params.get('deck'))||library().find(d=>d.faction===faction);
  deck=clone(initial||{id:'',name:'Untitled deck',faction,commanderId:Commanders?.defaultFor(faction),cards:[],archetype:'custom',source:'saved'});faction=deck.faction;
  inspected=deck.cards.find(id=>D.CARDS[id])||Object.keys(D.CARDS).find(id=>D.CARDS[id].faction===faction);
  const readOnly=()=>deck.source==='starter'||deck.source==='preset'||deck.source==='commander-starter';
  const commander=()=>Commanders?.get(deck.commanderId);
  const synergy=c=>Commanders?.synergy(c,deck.commanderId)||{score:0,reasons:[],reason:''};
  let collectionProfile=Collection?.load();
  const profile=()=>collectionProfile;
  const owned=id=>Collection?Collection.ownedCount(id,profile()):allowedCopies(D.CARDS[id]);
  const meta=id=>Collection?.metadata(id)||{rarity:'common',craftCost:0,pools:[]};
  const entry=id=>profile()?.cards[id]||{variants:['standard'],preferredVariant:'standard',mastery:{points:0}};
  const ownership=()=>Collection?.canUseDeck(deck,profile())||{complete:true,missing:[]};
  const skin=c=>Presentation?.skin(c,{profile:profile()})||{className:'rarity-'+meta(c.id).rarity,style:''};
  function ownershipMarkup(){const result=ownership();return result.complete?'<p class="deck-ownership ready">● COLLECTION COMPLETE · Every required copy is owned.</p>':'<div class="deck-ownership incomplete" role="status"><b>COLLECTION INCOMPLETE · '+result.missing.reduce((n,c)=>n+c.missing,0)+' copies to acquire</b><ul>'+result.missing.map(m=>'<li>'+esc(D.CARDS[m.cardId]?.name||m.cardId)+' · owned '+m.owned+' / required '+m.required+'</li>').join('')+'</ul><a href="collection.html#shop" class="btn secondary">Get packs or craft missing cards →</a><p>Deck rules remain separate. A legal deck can always be tested in the War Room.</p></div>';}
  function collectionDetail(c,scope='panel'){
    const state=entry(c.id),metadata=meta(c.id),copies=owned(c.id),cosmetics=Collection?.cosmeticState(c,profile()),mastery=Collection?.masterySummary(c,profile());
    if(!cosmetics||!mastery)return '';
    const cosmeticReason=profile()?.readOnly?'Collection storage needs recovery before preferences can be saved.':!copies?'Own a copy to choose its finish and earned wear.':'',disabled=!!cosmeticReason;
    const cosmeticHelp='builder-cosmetic-help-'+scope+'-'+c.id,craftHelp='builder-craft-help-'+scope+'-'+c.id;
    const craftReason=!Collection?'Crafting is unavailable.':profile()?.readOnly?'Collection storage needs recovery before crafting.':copies>=allowedCopies(c)?'You own the maximum playable copies.':profile().supply<metadata.craftCost?'Need '+(metadata.craftCost-profile().supply)+' more Supply to craft this card.':'';
    const select=(layer,values,current,heading)=>'<label for="builder-'+layer+'-'+scope+'-'+esc(c.id)+'">'+heading+'<select id="builder-'+layer+'-'+scope+'-'+esc(c.id)+'" data-cosmetic-card="'+esc(c.id)+'" data-cosmetic-layer="'+layer+'" '+(disabled?'disabled title="'+esc(cosmeticReason)+'" aria-describedby="'+esc(cosmeticHelp)+'"':'')+'>'+values.map(value=>'<option value="'+esc(value)+'" '+(current===value?'selected':'')+'>'+esc(value==='standard'&&layer==='wear'?'Unworn':Collection.VARIANTS[value]?.label||label(value))+'</option>').join('')+'</select></label>';
    return '<section class="card-collection-detail"><h3>YOUR COLLECTION</h3><div class="card-ownership-line">'+(Presentation?.summary(c,{profile:profile()})||'')+'<span>'+copies+' owned / '+(Decks.validate(deck).counts[c.id]||0)+' required'+(state.newlyAcquired?' · NEW':'')+'</span></div>'+
      (!copies?'<p>Unowned · available from '+metadata.pools.map(id=>Collection.PACKS[id]?.name||label(id)).join(', ')+'.</p>':'<p><b>'+esc(mastery.levelLabel)+'</b> · '+mastery.points+' mastery<br>'+mastery.matchesUsed+' matches used · '+mastery.deployments+' deployments · '+mastery.winsIncluded+' wins while included.</p><p>'+esc(mastery.lastProgressReason)+'</p><p>'+(mastery.nextMilestone?esc(mastery.nextMilestone.label)+' at '+mastery.nextMilestone.points+' mastery · '+mastery.nextMilestone.remaining+' to go.':'Veteran service distinction earned.')+'</p><p class="variant-note">'+(mastery.firstAcquiredKnown?'Acquired '+esc(new Date(mastery.firstAcquiredDate).toLocaleDateString()):'Legacy acquisition date unknown. Existing progress is preserved.')+'</p>')+
      select('variant',[...cosmetics.unlockedVariants,...(cosmetics.unlockedVariants.length>1?['random']:[])],state.cosmetics?.preferredVariant||'standard','PREMIUM FINISH')+
      select('wear',cosmetics.unlockedWear,state.cosmetics?.preferredWear||'standard','EARNED SERVICE WEAR')+
      '<p id="'+esc(cosmeticHelp)+'" class="collection-action-help">'+esc(cosmeticReason||'Choose an unlocked finish and earned wear independently.')+'</p><label class="prestige-favorite"><input type="checkbox" data-cosmetic-card="'+esc(c.id)+'" data-cosmetic-layer="favorite" '+(cosmetics.favorite?'checked':'')+' '+(profile()?.readOnly?'disabled title="Collection storage needs recovery before favorites can be saved." aria-describedby="'+esc(cosmeticHelp)+'"':'')+'> ★ Favorite card</label><p class="variant-note">Rarity frame, premium finish and earned wear stack independently. These choices preserve all stats, rules and deck legality.</p><button class="btn secondary" data-action="craft-card" data-id="'+esc(c.id)+'" '+(craftReason?'disabled':'')+' title="'+esc(craftReason||'Craft one gameplay copy with Supply')+'" aria-describedby="'+esc(craftHelp)+'">Craft one copy · '+metadata.craftCost+' Supply</button><p id="'+esc(craftHelp)+'" class="collection-action-help '+(craftReason?'blocked':'')+'">'+esc(craftReason||'Ready to craft.')+' Supply available: '+(profile()?.supply||0)+'.</p></section>';
  }
  function notify(message,error){const toast=document.getElementById('deck-toast');toast.textContent=message;toast.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),4000);}
  function abandonDraft(){return !dirty||window.confirm('Discard the unsaved changes to this deck?');}
  function confirmLeave(){navigationApproved=false;if(!abandonDraft())return false;navigationApproved=true;return true;}
  function leaveArsenal(){window.FrontlinesShell?.goHome();}
  function cardRole(card){return card.artRole||Art?.role(card)||card.type;}
  function portrait(card){
    if(Art?.html)return '<div class="arsenal-art">'+Art.html(card,{className:'arsenal-portrait'})+(Presentation?.layers(card,{profile:profile()})||'')+'</div>';
    if(card.type==='unit'||card.type==='leader'){
      const a=Art?.get(card);if(a)return '<div class="arsenal-art"><span class="arsenal-portrait" role="img" aria-label="'+esc(a.alt)+'" style="background-image:url(&quot;'+esc(a.src)+'&quot;);background-position:'+a.position+'"></span></div>';
    }
    const emblem=Art?.THEMES[card.faction]?.emblem,symbol=Art?.symbol?.(card);
    return '<div class="arsenal-art"><span class="arsenal-portrait role-'+esc(card.type)+'" role="img" aria-label="'+esc(card.name+' tactical insignia')+'">'+(symbol|| (emblem?'<img src="'+esc(emblem)+'" alt="" width="66" height="66">':'<span>◇</span>'))+'</span></div>';
  }
  function allowedCopies(card){return Decks.copyLimit?Decks.copyLimit(card):card.type==='leader'?Decks.RULES.maxLeaders:Decks.RULES.maxCopies;}
  function archetypes(card){return [...new Set([...(Array.isArray(card.archetypes)?card.archetypes:[]),card.archetype].filter(x=>typeof x==='string'&&x))];}
  function tags(card){return Array.isArray(card.tags)?card.tags.filter(x=>typeof x==='string'):[];}
  function label(value){return String(value).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
  function setLabel(value){return value==='tactical-011'?'Tactical Arsenal · Forge XI':value==='arsenal-007'?'Forge VII':value==='arsenal'?'Arsenal expansion':value==='core'?'Original arsenal':label(value);}
  function mechanicKeys(card){return [...new Set([...(card.traits||[]),...(card.effect?[card.effect.kind]:[]),...tags(card).filter(t=>['cover','breach','blast','dodge','suppression','overwatch','sacrifice','exposed','smoke'].includes(t))])];}
  function scopedCatalog(){return Object.values(D.CARDS).filter(c=>collectionScope==='all'||c.faction===(collectionScope==='deck'?faction:collectionScope));}
  function editingKey(value){return JSON.stringify({id:value.id,name:value.name,faction:value.faction,commanderId:value.commanderId,cards:value.cards,archetype:value.archetype});}
  let savedKey=editingKey(deck);
  function remember(){history.push(clone(deck));if(history.length>40)history.shift();future=[];}
  function markDirty(){dirty=!deck.id||editingKey(deck)!==savedKey;}
  function addReason(c,counts){return readOnly()?'Make an editable copy to change this template':c.faction!==deck.faction?D.FACTIONS[c.faction].name+' cards cannot enter a '+D.FACTIONS[deck.faction].name+' deck':(counts[c.id]||0)>=allowedCopies(c)?'Maximum '+allowedCopies(c)+' copies reached':(counts[c.id]||0)>=owned(c.id)?'Own '+owned(c.id)+' copies. Acquire or craft another copy first.':deck.cards.length>=Decks.RULES.size?'Deck is full. Remove a card before adding another.':'Add one owned copy';}
  function canAdd(c,counts){return !!c&&!readOnly()&&c.faction===deck.faction&&(counts[c.id]||0)<Math.min(allowedCopies(c),owned(c.id))&&deck.cards.length<Decks.RULES.size;}
  function setQuantity(id,value,inline=false){
    if(readOnly())return;
    const redraw=()=>inline?refreshDeckEdit():render();
    const counts=Decks.validate(deck).counts,current=counts[id]||0,c=D.CARDS[id],desired=Number(value);
    if(String(value).trim()===''||!Number.isInteger(desired)||desired<0||desired>500){notify('Choose a whole number of copies from 0 to '+(c?allowedCopies(c):current)+'.',true);redraw();return false;}
    if(desired===current){redraw();return true;}
    if(desired>current&&(!c||c.faction!==deck.faction)){notify(c?addReason(c,counts):'Unavailable cards can be removed, but cannot be added.',true);redraw();return false;}
    if(c&&desired>allowedCopies(c)&&desired>current){notify(c.name+' allows at most '+allowedCopies(c)+' copies.',true);redraw();return false;}
    if(c&&desired>owned(id)&&desired>current){notify('You own '+owned(id)+' copies of '+c.name+'. Get packs or craft another copy before adding it.',true);redraw();return false;}
    if(desired>current&&deck.cards.length-current+desired>Decks.RULES.size){notify('Use '+Decks.RULES.size+' cards. Remove '+(deck.cards.length-current+desired-Decks.RULES.size)+' other card(s) before increasing this quantity.',true);redraw();return false;}
    remember();let kept=0;deck.cards=deck.cards.filter(cardId=>cardId!==id||++kept<=desired);
    for(let i=current;i<desired;i++)deck.cards.push(id);
    markDirty();if(c)inspected=id;libraryPanel='contents';redraw();return true;
  }
  function commandCost(card){return ['response','counter'].includes(card.timing)?0:Number.isInteger(card.commandCost)?card.commandCost:1;}
  function commandCostNote(card){
    const commands=commandCost(card);
    if(['response','counter'].includes(card.timing))return 'Reaction: spends Capacity without a Command Action.';
    return commands===0?'Free '+(card.type==='order'?'support Order':'deployment')+': spends Capacity without a Command Action.':
      'Playing this card spends Capacity and '+commands+' Command Action'+(commands===1?'':'s')+'.';
  }
  function definition(key){const glossaryKey=key==='command'?'Command aura':key;return Object.entries(D.GLOSSARY||{}).find(([name])=>name.toLowerCase()===glossaryKey.toLowerCase())?.[1]||'Read the card’s exact rules text.';}
  function panelHeading(title,detail){return '<div class="arsenal-panel-heading"><h2>'+title+'</h2><span>'+esc(detail)+'</span></div>';}
  function commanderPortrait(c){return Art?.commanderHtml?Art.commanderHtml(c,{className:'builder-commander-portrait'}):'<span class="builder-commander-emblem" aria-hidden="true">'+esc(D.FACTIONS[c.faction].icon||'◈')+'</span>';}
  function commanderRules(c){return '<dl class="commander-rules"><div><dt>PASSIVE · '+esc(c.passive.name)+'</dt><dd>'+esc(c.passive.text)+'</dd></div><div><dt>ACTIVE · '+esc(c.active.name)+'</dt><dd>'+esc(c.active.text)+' <b>Cost: '+c.active.cost.presence+' Presence / '+c.active.cost.commandActions+' Command Action'+(c.active.cost.commandActions===1?'':'s')+'. Once per match.</b></dd></div><div><dt>DECKBUILDING · '+esc(c.hook.name)+'</dt><dd>'+esc(c.hook.text)+'</dd></div></dl>';}
  function commanderBanner(){
    if(!Decks.commandersEnabled())return '';
    const c=commander(),synergies=deck.cards.filter(id=>synergy(D.CARDS[id]).score>0).length;
    return '<section class="builder-commander-banner" style="--faction-color:'+D.FACTIONS[faction].color+'" aria-label="Deck Commander">'+(c?commanderPortrait(c):'<span class="builder-commander-emblem">?</span>')+'<div><span class="eyebrow">FACTION → COMMANDER → FOUNDATION → CUSTOMIZE</span><h2>'+esc(c?.name||'Choose a Commander')+'</h2><p>'+(c?'<b>'+esc(c.passive.name)+':</b> '+esc(c.passive.text):'This saved assignment needs repair. Your card list is preserved.')+'</p><small>'+synergies+' / '+deck.cards.length+' cards support this Commander · Commander sits outside the '+Decks.RULES.size+'-card list.</small></div><button class="btn primary" data-action="commander-flow">'+(c?'Commander & doctrine':'Repair assignment')+'</button></section>';
  }
  let commanderFlow={mode:'change',faction,selected:null};
  function openCommanderFlow(mode='change'){
    commanderFlow={mode,faction,selected:commander()?.faction===faction?commander().id:Commanders.defaultFor(faction)};renderCommanderFlow();dialog.showModal();
  }
  function renderCommanderFlow(){
    const choices=Commanders.list(commanderFlow.faction),selected=Commanders.get(commanderFlow.selected),isNew=commanderFlow.mode==='new';
    dialog.innerHTML='<div class="commander-flow"><span class="eyebrow">BUILD YOUR OPERATION</span><h2>'+(isNew?'Choose the leader of your deck':'Commander & doctrine')+'</h2><p>A Commander stays outside the lanes. Its passive shapes every turn; its active is a once-per-match tactical decision. Leader cards in your 26-card list remain deployable units.</p><ol class="commander-flow-steps"><li class="current">1 · Faction</li><li class="current">2 · Commander</li><li>3 · Foundation</li><li>4 · Customize</li></ol><label for="commander-flow-faction">FACTION<select id="commander-flow-faction" '+(!isNew?'disabled':'')+'>'+Object.values(D.FACTIONS).map(f=>'<option value="'+f.id+'" '+(f.id===commanderFlow.faction?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><div class="commander-choice-grid">'+choices.map(c=>'<button class="commander-choice '+(c.id===commanderFlow.selected?'selected':'')+'" data-dialog-action="commander-select" data-commander-id="'+esc(c.id)+'" style="--faction-color:'+D.FACTIONS[c.faction].color+'" aria-pressed="'+(c.id===commanderFlow.selected)+'">'+commanderPortrait(c)+'<span><b>'+esc(c.name)+'</b><small>'+esc(c.role)+'</small></span></button>').join('')+'</div>'+(selected?'<section class="commander-doctrine" style="--faction-color:'+D.FACTIONS[selected.faction].color+'"><h3>'+esc(selected.name)+' · '+esc(selected.role)+'</h3>'+commanderRules(selected)+'<p class="commander-foundation-note"><b>READY FOUNDATION · '+Decks.RULES.size+' owned cards</b><br>'+esc(Decks.commanderStarters().find(d=>d.commanderId===selected.id)?.name||'')+'<br>Use this coherent starting plan, then edit your copy. All launch Commanders and foundation inventories are granted.</p></section>':'')+'<div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Cancel</button>'+(!isNew?'<button class="btn secondary" data-dialog-action="commander-assign">'+(readOnly()?'Copy deck & assign':'Keep cards & assign')+'</button>':'<button class="btn secondary" data-dialog-action="commander-empty">Start empty deck</button>')+'<button class="btn primary" data-dialog-action="commander-foundation">Use foundation & customize →</button></div></div>';
  }
  function assignCommanderSelection(){
    const id=commanderFlow.selected;if(!Commanders.get(id))return;
    if(readOnly()){const result=Decks.duplicate({...deck,commanderId:id},deck.name.slice(0,70)+' copy');if(!result.ok){notify(result.error,true);return;}selectDeck(result.deck);}
    else{remember();deck.commanderId=id;markDirty();render();}
    dialog.close();notify(Commanders.get(id).name+' now leads this deck. Your card choices were preserved.');
  }
  function useCommanderFoundation(empty=false){
    if(!abandonDraft())return;
    const c=Commanders.get(commanderFlow.selected),base=Decks.commanderStarters().find(d=>d.commanderId===c.id);
    const next=empty?{id:'',name:D.FACTIONS[c.faction].name+' — '+c.name+' custom',faction:c.faction,commanderId:c.id,cards:[],archetype:'custom',source:'saved'}:{...clone(base),id:'',name:base.name+' copy',source:'saved'};
    libraryPanel='contents';mobilePanel='library';selectDeck(next);dirty=true;dialog.close();render();notify(empty?'Empty Commander draft created. Add 26 owned cards.':'Owned foundation ready. Customize it, save it, then play.');document.getElementById('deck-name')?.focus();
  }
  function selectedCatalog(){
    const counts=Decks.validate(deck).counts,terms=filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return scopedCatalog()
      .filter(c=>!terms.length||terms.every(term=>[c.id,c.name,c.rulesText,c.role,c.designIntent,D.FACTIONS[c.faction].name,c.ai?.role,c.effect?.kind,...archetypes(c),...tags(c),...(c.traits||[])].join(' ').toLowerCase().includes(term)))
      .filter(c=>!filters.type||c.type===filters.type)
      .filter(c=>!filters.role||cardRole(c)===filters.role||c.role===filters.role)
      .filter(c=>!filters.keyword||mechanicKeys(c).includes(filters.keyword))
      .filter(c=>!filters.archetype||archetypes(c).includes(filters.archetype))
      .filter(c=>!filters.tag||tags(c).includes(filters.tag))
      .filter(c=>!filters.set||(c.set||'core')===filters.set)
      .filter(c=>!filters.rarity||meta(c.id).rarity===filters.rarity)
      .filter(c=>!filters.ownership||(filters.ownership==='owned'?owned(c.id)>0:filters.ownership==='unowned'?owned(c.id)===0:!!entry(c.id).newlyAcquired))
      .filter(c=>filters.command===''||commandCost(c)===Number(filters.command))
      .filter(c=>!filters.inDeck||!!counts[c.id])
      .filter(c=>!filters.cost||(filters.cost==='9+'?c.presence>=9:filters.cost==='0-2'?c.presence<=2:filters.cost==='3-4'?c.presence>=3&&c.presence<=4:filters.cost==='5-6'?c.presence>=5&&c.presence<=6:c.presence>=7&&c.presence<=8))
      .sort((a,b)=>filters.sort==='name'?a.name.localeCompare(b.name):filters.sort==='type'?a.type.localeCompare(b.type)||a.presence-b.presence||a.name.localeCompare(b.name):a.presence-b.presence||a.name.localeCompare(b.name));
  }
  function options(items,selected,all){return '<option value="">'+all+'</option>'+items.map(([value,name])=>'<option value="'+esc(value)+'" '+(value===selected?'selected':'')+'>'+esc(name)+'</option>').join('');}
  function metadataOptions(pool,read,selected){const values=[...new Set(pool.flatMap(read))].sort();if(selected&&!values.includes(selected))values.push(selected);return values.map(k=>[k,label(k)]);}
  function filterMarkup(){
    const pool=scopedCatalog(),select=(key,title,items,all)=>'<label for="card-'+key+'-filter">'+title+'<select id="card-'+key+'-filter" data-filter="'+key+'">'+options(items,filters[key],all)+'</select></label>';
    return '<div class="arsenal-filters"><label class="collection-scope" for="collection-faction">BROWSE COLLECTION<select id="collection-faction"><option value="deck" '+(collectionScope==='deck'?'selected':'')+'>My deck faction · '+esc(D.FACTIONS[faction].name)+'</option><option value="all" '+(collectionScope==='all'?'selected':'')+'>All factions</option>'+Object.values(D.FACTIONS).map(f=>'<option value="'+f.id+'" '+(collectionScope===f.id?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><label class="search" for="card-search">SEARCH CARDS<input id="card-search" data-filter="search" type="search" placeholder="Name, rules, keyword or strategy…" maxlength="100" value="'+esc(filters.search)+'"></label>'+select('type','TYPE',[['unit','Unit'],['leader','Field Leader'],['order','Order'],['asset','Asset']],'All types')+select('cost','PRESENCE',[['0-2','0–2'],['3-4','3–4'],['5-6','5–6'],['7-8','7–8'],['9+','9+']],'All costs')+'<button class="btn quiet filter-toggle" data-action="filters" aria-controls="advanced-card-filters" aria-expanded="'+advancedFilters+'">'+(advancedFilters?'Fewer':'More')+' filters</button><div id="advanced-card-filters" class="advanced-card-filters" '+(!advancedFilters?'hidden':'')+'>'+select('keyword','KEYWORD / EFFECT',metadataOptions(pool,mechanicKeys,filters.keyword),'All keywords')+select('role','BATTLEFIELD ROLE',metadataOptions(pool,c=>[cardRole(c),c.role].filter(Boolean),filters.role),'All roles')+select('archetype','STRATEGY TAG',metadataOptions(pool,archetypes,filters.archetype),'All strategies')+select('tag','DESIGN TAG',metadataOptions(pool,tags,filters.tag),'All tags')+select('set','CARD SET',metadataOptions(pool,c=>[c.set||'core'],filters.set).map(([k])=>[k,setLabel(k)]),'All sets')+select('rarity','RARITY',(Collection?.RARITIES||['common','uncommon','rare','epic','legendary']).map(r=>[r,label(r)]),'All rarities')+select('ownership','OWNERSHIP',[['owned','Owned'],['unowned','Unowned'],['new','Newly acquired']],'All designs')+select('command','COMMAND ACTIONS',[['0','Free / reaction'],['1','1 Command Action'],['2','2 Command Actions']],'Any command cost')+'<label for="card-sort">SORT<select id="card-sort" data-filter="sort"><option value="cost" '+(filters.sort==='cost'?'selected':'')+'>Presence cost</option><option value="name" '+(filters.sort==='name'?'selected':'')+'>Name</option><option value="type" '+(filters.sort==='type'?'selected':'')+'>Card type</option></select></label><label class="in-deck-filter" for="card-in-deck"><input id="card-in-deck" data-filter="inDeck" type="checkbox" '+(filters.inDeck?'checked':'')+'> In this deck only</label><button class="btn quiet" data-action="clear-filters">Reset filters</button></div></div>';
  }
  function resultMarkup(){const cards=selectedCatalog(),names={search:'Search',type:'Type',cost:'Presence',keyword:'Keyword',role:'Role',archetype:'Strategy',tag:'Tag',set:'Set',command:'Command',rarity:'Rarity',ownership:'Ownership',inDeck:'In deck'},active=Object.entries(filters).filter(([k,v])=>k!=='sort'&&v!==''&&v!==false);return '<span class="catalog-result-count">'+cards.length+' / '+scopedCatalog().length+' designs</span><div class="active-card-filters" aria-label="Active filters">'+active.map(([k,v])=>'<button data-action="clear-filter" data-filter-key="'+k+'" aria-label="Clear '+names[k]+' filter">'+esc(names[k]+(k==='inDeck'?'':': '+(k==='set'?setLabel(v):label(v))))+' <span aria-hidden="true">×</span></button>').join('')+'</div>'+(collectionScope!=='deck'&&collectionScope!==faction?'<span class="catalog-scope-note">Browsing freely · your deck remains '+esc(D.FACTIONS[faction].name)+'.</span>':'');}
  function cardMarkup(c,counts){
    const count=counts[c.id]||0,copies=owned(c.id),blocked=!canAdd(c,counts),state=entry(c.id),treatment=skin(c);
    return '<article class="arsenal-card '+esc(treatment.className)+' '+(inspected===c.id?'selected':'')+(c.faction!==faction?' other-faction':'')+(!copies?' unowned':'')+'" style="--faction-color:'+D.FACTIONS[c.faction].color+';'+esc(treatment.style)+'" data-card="'+esc(c.id)+'">'+(Presentation?.chrome(c,{profile:profile()})||'')+'<button class="arsenal-card-inspect" data-action="inspect" data-id="'+esc(c.id)+'" aria-label="Inspect '+esc(c.name+' · '+treatment.ariaLabel)+'"><span class="arsenal-card-top"><span>'+esc(c.type==='leader'?'FIELD LEADER':c.type==='unit'?cardRole(c).toUpperCase():c.type.toUpperCase())+'</span><b>'+c.presence+' P</b></span>'+portrait(c)+'<span class="arsenal-card-faction">'+esc(D.FACTIONS[c.faction].name)+(state.newlyAcquired?'<small>NEW</small>':'')+'</span><span class="arsenal-card-name">'+esc(c.name)+'</span><span class="arsenal-card-collection">'+(Presentation?.badge(c)||'')+'<span>'+(!copies?'UNOWNED':copies+' OWNED')+'</span></span>'+(synergy(c).score>0?'<span class="commander-synergy" title="'+esc(synergy(c).reason)+'">◆ '+esc(commander()?.name)+' synergy</span>':'')+'<span class="arsenal-card-rules">'+esc(c.rulesText)+'</span><span class="arsenal-card-stats">'+(c.type==='order'?'<span>'+esc(c.timing||'action')+' ORDER</span>':'<span><small>ATK</small> '+c.attack+'</span><span><small>HP</small> '+c.health+'</span>')+'<span class="arsenal-command-cost" title="'+esc(commandCostNote(c))+'" aria-label="'+commandCost(c)+' Command Actions"><small>CMD</small> '+commandCost(c)+'</span></span></button><div class="arsenal-copy-controls"><button data-action="remove-card" data-id="'+esc(c.id)+'" '+(readOnly()||!count?'disabled':'')+' aria-label="Remove '+esc(c.name)+'">−</button><span><b>'+count+' REQUIRED</b><small>'+copies+' owned · '+allowedCopies(c)+' limit</small></span><button class="add" data-action="add-card" data-id="'+esc(c.id)+'" '+(blocked?'disabled':'')+' aria-label="Add '+esc(c.name)+'" title="'+esc(addReason(c,counts))+'">+</button></div></article>';
  }
  function catalogMarkup(){const cards=selectedCatalog(),counts=Decks.validate(deck).counts;return cards.length?cards.map(c=>cardMarkup(c,counts)).join(''):'<p class="catalog-empty">No cards match these filters.<br>Try a broader search or reset filters.</p>';}
  function compositionMarkup(){
    const stats=Decks.composition(deck),validation=Decks.validate(deck),curveMax=Math.max(1,...stats.curve.map(b=>b.count));
    return '<section class="deck-summary" style="--faction-color:'+D.FACTIONS[faction].color+'" aria-label="Persistent deck composition"><div class="deck-summary-identity"><span>'+esc(D.FACTIONS[faction].name)+'</span><strong id="summary-deck-name">'+esc(deck.name)+'</strong><small>AI intent: <span id="summary-archetype">'+esc((deck.archetype||'custom').replace(/-/g,' '))+'</span></small></div><div class="deck-summary-count"><b>'+stats.size+'/'+Decks.RULES.size+'</b><span>CARDS</span><strong id="summary-legality" class="'+(validation.legal?'legal':'invalid')+'">'+(validation.legal?'LEGAL DECK':'DRAFT')+'</strong></div><div class="deck-summary-average"><b>'+stats.averageCost.toFixed(1)+'</b><span>AVG PRESENCE</span></div><div class="deck-summary-types"><span><b>'+ (stats.units+stats.leaders)+'</b> Units</span><span><b>'+stats.orders+'</b> Orders</span><span><b>'+stats.assets+'</b> Assets</span><span title="Heavy / Specialist / Commander">'+stats.heavy+' Heavy · '+stats.specialist+' Specialist · '+stats.leaders+' Field Leaders</span>'+(stats.commandCosts?'<span class="deck-command-distribution" title="Printed Command Action costs; response and counter cards are free reactions">'+stats.commandCosts.free+' free · '+stats.commandCosts.paid+' paid commands</span>':'')+'</div><div class="deck-curve" aria-label="Presence cost distribution"><h3>PRESENCE CURVE</h3><div class="deck-curve-columns">'+stats.curve.map(b=>'<div class="deck-curve-column"><div class="deck-curve-bar"><i style="height:'+(b.count/curveMax*100)+'%"></i><span>'+b.count+'</span></div><span>'+esc(b.label)+'</span></div>').join('')+'</div></div></section>';
  }
  function commandMarkup(){
    const validation=Decks.validate(deck),legal=validation.legal,readonly=readOnly(),access=ownership();
    const saveReason=readonly?'Make an editable copy before saving changes.':'',testReason=legal?'':'Make this deck legal before testing: '+validation.errors.join(' ');
    const missing=access.missing.reduce((n,item)=>n+item.missing,0),playReason=!legal?'Make this deck legal before playing: '+validation.errors.join(' '):!access.complete?'Acquire '+missing+' missing card '+(missing===1?'copy':'copies')+' before playing.':'';
    const hints=[saveReason, !legal?'Play and test locked: '+validation.errors[0]:playReason,legal?'War Room testing is available.':'You can save this draft while repairing it.'].filter(Boolean);
    const attributes=reason=>(reason?'disabled ':'')+'title="'+esc(reason||'Ready to continue')+'" aria-describedby="arsenal-command-help"';
    return '<footer class="arsenal-command-bar" aria-label="Deck commands"><p id="arsenal-command-help" class="arsenal-command-help" role="status">'+hints.map(esc).join(' ')+'</p><div class="arsenal-command-status">'+(readonly?'ORIGINAL DECK · MAKE IT YOURS':dirty?'UNSAVED CHANGES · CTRL + S':'YOUR DECK · LOCAL LIBRARY')+'</div><button class="btn '+(readonly?'secondary':'primary')+'" data-action="save" '+attributes(saveReason)+'>Save '+(legal?'deck':'draft')+'</button><button class="btn secondary" data-action="simulate" '+attributes(testReason)+'>Test in War Room</button><button class="btn '+(readonly?'primary':'secondary')+'" data-action="duplicate">'+(readonly?'Make editable copy':'Duplicate')+'</button><button class="btn quiet" data-action="export">Export deck</button><button class="btn primary play-deck-command" data-action="play" '+attributes(playReason)+'>Play this deck →</button></footer>';
  }
  function refreshCommands(){document.querySelector('.arsenal-command-bar').outerHTML=commandMarkup();}

  function libraryMarkup(){
    const factionDecks=library().filter(d=>d.faction===faction);
    return '<div class="library-selection"><label for="builder-faction">DECK FACTION<select id="builder-faction">'+Object.values(D.FACTIONS).map(f=>'<option value="'+f.id+'" '+(f.id===faction?'selected':'')+'>'+esc(f.name)+'</option>').join('')+'</select></label><label for="builder-deck">ACTIVE DECK<select id="builder-deck">'+(!deck.id?'<option value="" selected>Unsaved: '+esc(deck.name)+'</option>':'')+factionDecks.map(d=>'<option value="'+esc(d.id)+'" '+(d.id===deck.id?'selected':'')+'>'+esc(d.name)+' · '+(d.source==='saved'?(Decks.validate(d).legal?'saved':'draft'):d.source)+'</option>').join('')+'</select></label></div><div class="arsenal-library-tabs" role="tablist" aria-label="Deck library panels"><button role="tab" id="library-tab" aria-controls="library-contents" aria-selected="'+(libraryPanel==='library')+'" data-action="library-panel" data-panel="library">Deck library</button><button role="tab" id="contents-tab" aria-controls="deck-editor" aria-selected="'+(libraryPanel==='contents')+'" data-action="library-panel" data-panel="contents">Deck contents</button></div><div id="library-contents" class="library-contents" role="tabpanel" aria-labelledby="library-tab" '+(libraryPanel!=='library'?'hidden':'')+'><div class="deck-library-filters"><label for="deck-library-search">FIND A DECK<input id="deck-library-search" type="search" maxlength="100" placeholder="Name or strategy…" value="'+esc(librarySearch)+'"></label><label for="deck-library-kind">SHOW<select id="deck-library-kind">'+options([['saved','Saved decks'],['templates','Original templates'],['drafts','Drafts to repair']],libraryKind,'All decks')+'</select></label></div><div class="deck-library-list">'+libraryItems()+'</div>'+recoveryMarkup()+'<p class="arsenal-storage-note">Original starters and all ten Commander foundations are owned. Other templates may need packs or crafting. Your saved drafts stay on this device.</p></div><div id="deck-editor" role="tabpanel" aria-labelledby="contents-tab" '+(libraryPanel!=='contents'?'hidden':'')+'>'+editorMarkup()+'</div><div class="library-commands"><button class="btn secondary" data-action="new">New deck</button><button class="btn quiet" data-action="import">Import deck</button><button class="btn quiet" data-action="random" title="Generate a random legal deck">Random</button></div>';
  }
  function libraryItems(){const terms=librarySearch.toLowerCase().trim().split(/\s+/).filter(Boolean),items=library().filter(d=>d.faction===faction).filter(d=>terms.every(t=>(d.name+' '+(d.archetype||'custom')).replace(/-/g,' ').toLowerCase().includes(t))).filter(d=>!libraryKind||(libraryKind==='templates'?d.source!=='saved':libraryKind==='drafts'?!Decks.validate(d).legal:d.source==='saved'));return items.map(d=>{const access=Collection?.canUseDeck(d,profile())||{complete:true,missing:[]};return '<button class="deck-library-item '+(d.id===deck.id?'selected':'')+'" data-action="select-deck" data-id="'+esc(d.id)+'"><strong>'+esc(d.name)+'</strong><span>'+esc((d.archetype||'custom').replace(/-/g,' '))+'</span>'+(d.commanderId?'<span class="deck-library-commander">◈ '+esc(Commanders.get(d.commanderId)?.name||d.commanderId)+'</span>':'')+'<small>'+(d.source==='saved'?(Decks.validate(d).legal?'SAVED · LEGAL':'SAVED DRAFT'):d.source==='starter'?'ORIGINAL STARTER':d.source==='commander-starter'?'COMMANDER FOUNDATION':'ARCHETYPE PRESET')+' · '+d.cards.length+' cards</small><small class="'+(access.complete?'legal':'invalid')+'">'+(access.complete?'ALL COPIES OWNED':access.missing.reduce((n,m)=>n+m.missing,0)+' COPIES TO ACQUIRE · PACKS / CRAFTING')+'</small></button>';}).join('')||'<p class="arsenal-storage-note">No decks match. Clear the library search or choose another category.</p>';}
  function recoveryMarkup(){const report=Decks.storageDiagnostics?.();if(!report?.warnings.length)return '';return '<details class="deck-recovery"><summary>Saved library needs attention</summary><p>'+report.warnings.map(esc).join('<br>')+'</p><p>Your recoverable drafts remain listed. Download the original storage data before repairing or replacing unreadable records.</p><button class="btn secondary" data-action="recovery-export">Download recovery data</button></details>';}
  function tendenciesMarkup(){const stats=Decks.composition(deck),tendencies=stats.archetypeTags||[];return '<section class="deck-tendencies"><h3>CARD TENDENCIES</h3>'+(tendencies.length?'<div>'+tendencies.map(t=>'<span>'+esc(label(t.tag))+' <b>'+t.count+'</b></span>').join('')+'</div><p>Counts use card strategy tags and can overlap. They describe your choices; they do not change AI intent.</p>':'<p>Add cards with strategy tags to see the approaches supported by this deck.</p>')+'</section>';}
  function deckRows(){
    const counts=Decks.validate(deck).counts;
    return Object.keys(counts).sort((a,b)=>(D.CARDS[a]?.presence??100)-(D.CARDS[b]?.presence??100)||(D.CARDS[a]?.name||a).localeCompare(D.CARDS[b]?.name||b)).map(id=>{const c=D.CARDS[id],name=c?.name||'Unavailable: '+id;return '<div class="deck-row '+(!c||c.faction!==faction||counts[id]>owned(id)?'missing':'')+'"><span class="deck-row-cost">'+(c?c.presence:'?')+'</span><button class="deck-row-inspect" data-action="inspect" data-id="'+esc(id)+'">'+esc(name)+'<small class="deck-row-owned">'+(c?owned(id)+' owned · '+counts[id]+' required'+(counts[id]>owned(id)?' · INCOMPLETE':''):'Unavailable design')+'</small></button><div class="deck-row-quantity"><button class="remove" data-action="remove-card" data-id="'+esc(id)+'" '+(readOnly()?'disabled':'')+' aria-label="Remove '+esc(name)+'">−</button><input id="quantity-'+esc(id)+'" data-card-quantity="'+esc(id)+'" type="number" min="0" max="'+(c?Math.max(Math.min(allowedCopies(c),owned(id)),counts[id]):counts[id])+'" step="1" value="'+counts[id]+'" '+(readOnly()?'disabled':'')+' aria-label="Copies of '+esc(name)+'"><button class="add" data-action="add-card" data-id="'+esc(id)+'" '+(!canAdd(c,counts)?'disabled':'')+' aria-label="Add '+esc(name)+'" title="'+esc(c?addReason(c,counts):'Unavailable card')+'">+</button></div>'+(!readOnly()&&(!c||c.faction!==faction)?'<button class="deck-remove-unavailable" data-action="remove-all" data-id="'+esc(id)+'">Remove all '+counts[id]+' copies</button>':'')+'</div>';}).join('')||'<p class="arsenal-storage-note">Your deck is empty. Add cards from the Arsenal.</p>';
  }
  function editorMarkup(){
    const validation=Decks.validate(deck),readonly=readOnly();
    const strategies=[...new Set([...Decks.presets().filter(d=>d.faction===faction).map(d=>d.archetype),...Object.values(D.CARDS).filter(c=>c.faction===faction).flatMap(archetypes),deck.archetype].filter(a=>a&&a!=='custom'))];
    return '<div class="deck-editor" style="--faction-color:'+D.FACTIONS[faction].color+'"><label class="deck-name-label" for="deck-name">DECK NAME<input id="deck-name" maxlength="80" value="'+esc(deck.name)+'" '+(readonly?'readonly':'')+'></label><div id="deck-status" class="deck-status">'+(validation.legal?'<strong>● RULES LEGAL / '+(ownership().complete?'READY TO PLAY':'COLLECTION INCOMPLETE')+'</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<span id="dirty-status">'+(readonly?'Original '+(deck.source==='starter'?'starter':deck.source==='commander-starter'?'Commander foundation':'archetype preset')+' · preserved':dirty?'Unsaved changes':deck.id?'Saved on this device':'Not saved yet')+'</span></div>'+(!readonly?'<label class="deck-strategy-label" for="deck-strategy">AI STRATEGY INTENT<select id="deck-strategy" aria-describedby="deck-strategy-note"><option value="custom" '+(deck.archetype==='custom'?'selected':'')+'>Custom / faction priorities</option>'+strategies.map(a=>'<option value="'+esc(a)+'" '+(deck.archetype===a?'selected':'')+'>'+esc(label(a))+'</option>').join('')+'</select></label><p id="deck-strategy-note" class="arsenal-storage-note">Optional instruction for deck-aware AI. Your card choices stay unrestricted.</p>':'<p class="deck-source-notice">This original is preserved. Use <b>Make editable copy</b> below to build your own version.</p>')+(!validation.legal?'<div class="deck-legality" role="status"><b>Fix before playing</b><ul>'+validation.errors.map(e=>'<li>'+esc(e)+'</li>').join('')+'</ul></div>':'')+(!readonly?'<div class="deck-edit-history" aria-label="Undo card edits"><button class="btn quiet" data-action="undo" '+(!history.length?'disabled':'')+'>↶ Undo edit</button><button class="btn quiet" data-action="redo" '+(!future.length?'disabled':'')+'>↷ Redo edit</button></div>':'')+'<div class="deck-list" aria-label="Current deck cards">'+deckRows()+'</div>'+ownershipMarkup()+tendenciesMarkup()+(!readonly&&deck.id?'<button class="btn danger delete-deck-command" data-action="delete">Delete saved deck</button>':'')+'</div>';
  }
  function detailMarkup(scope='panel'){
    const c=D.CARDS[inspected];if(!c)return '<div class="arsenal-detail"><h2>Card briefing</h2><p>Select a card to inspect its rules and artwork.</p></div>';
    const keywords=mechanicKeys(c);if(c.effect&&definition(c.effect.kind)!=='Read the card’s exact rules text.'&&!keywords.includes(c.effect.kind))keywords.push(c.effect.kind);
    return '<div class="arsenal-detail '+esc(skin(c).className)+'" style="--faction-color:'+D.FACTIONS[c.faction].color+';'+esc(skin(c).style)+'">'+(Presentation?.chrome(c,{profile:profile()})||'')+'<span class="eyebrow">'+esc(D.FACTIONS[c.faction].name)+' / '+esc(c.type==='leader'?'Field Leader':c.type)+(c.unique?' / UNIQUE IN PLAY':'')+' / '+esc(setLabel(c.set||'core'))+'</span><h2>'+esc(c.name)+'</h2>'+portrait(c)+'<div class="arsenal-detail-stats"><div><b>'+c.presence+'</b><small>PRESENCE</small></div>'+(c.type!=='order'?'<div><b>'+c.attack+'</b><small>ATTACK</small></div><div><b>'+c.health+'</b><small>HEALTH</small></div>':'<div><b>↗</b><small>'+esc((c.timing||'action').toUpperCase())+'</small></div>')+'<div class="arsenal-detail-command-cost"><b>'+commandCost(c)+'</b><small>COMMAND ACTIONS</small></div></div><p class="arsenal-command-note">'+esc(commandCostNote(c))+'</p><h3>RULES</h3><p>'+esc(c.rulesText)+'</p>'+(synergy(c).score>0?'<section class="commander-card-synergy"><h3>'+esc(commander()?.name)+' SYNERGY</h3><p>'+esc(synergy(c).reason)+'</p></section>':'')+'<div class="keyword-definitions">'+keywords.map(k=>'<div class="keyword-definition"><b>'+esc(k)+'.</b> '+esc(definition(k))+'</div>').join('')+'</div>'+collectionDetail(c,scope)+(c.role?'<h3>BATTLEFIELD ROLE</h3><p>'+esc(label(c.role))+'</p>':'')+(c.designIntent?'<h3>DECKBUILDING CHOICE</h3><p>'+esc(c.designIntent)+'</p>':'')+(archetypes(c).length||tags(c).length?'<h3>STRATEGY / DESIGN TAGS</h3><div class="card-design-tags">'+[...new Set([...archetypes(c),...tags(c)])].map(t=>'<span>'+esc(label(t))+'</span>').join('')+'</div>':'')+(c.flavorText||c.flavor?'<h3>FLAVOR</h3><p class="flavor">'+esc(c.flavorText||c.flavor)+'</p>':'')+'<p class="role-note">'+(c.type==='order'?'Orders commit Presence until the start of your next Action Window.':'Printed Presence is cost, ongoing commitment and capture strength.')+'<br>Maximum '+allowedCopies(c)+' copies of this design per deck.'+(c.unique?' Only one copy of this unique card may be deployed at once.':'')+'</p>'+(c.faction!==faction?'<p class="foreign-card-notice">Collection inspection · this '+esc(D.FACTIONS[c.faction].name)+' card cannot enter your '+esc(D.FACTIONS[faction].name)+' deck.</p>':'')+'<button class="btn quiet compact" data-action="inspect-dialog">Enlarge briefing ↗</button></div>';
  }
  function openBriefing(){dialog.innerHTML=detailMarkup('dialog').replace(/<button class="btn quiet compact" data-action="inspect-dialog">.*?<\/button>/,'')+'<div class="arsenal-dialog-actions"><button class="btn primary" data-dialog-action="close">Back to deck</button></div>';dialog.showModal();}
  function render(){
    if(rendering)return;rendering=true;
    try{
    collectionProfile=Collection?.load();
    const active=document.activeElement,focusId=active?.id,focusAction=active?.dataset?.action,focusCard=active?.dataset?.id;
    const scrolls={catalog:document.getElementById('card-catalog')?.scrollTop||0,library:document.getElementById('library-contents')?.scrollTop||0,editor:document.getElementById('deck-editor')?.scrollTop||0,detail:document.getElementById('card-detail')?.scrollTop||0};
    app.innerHTML='<div class="arsenal-main"><section class="arsenal-intro"><div><span class="eyebrow">YOUR FACTION. YOUR PLAN.</span><h1>ARSENAL</h1></div><p class="deck-rules">'+Decks.RULES.size+' cards · One faction · '+Decks.RULES.maxCopies+' copies per design · '+Decks.RULES.maxLeaders+' per Leader unit · One Commander outside the deck</p></section>'+commanderBanner()+'<nav class="arsenal-panel-tabs" aria-label="Arsenal panels">'+[['library','Deck library'],['cards','Card collection'],['briefing','Card briefing']].map(([id,label])=>'<button class="btn secondary '+(mobilePanel===id?'selected':'')+'" data-action="panel" data-panel="'+id+'" aria-pressed="'+(mobilePanel===id)+'">'+label+'</button>').join('')+'</nav><div class="arsenal-layout" data-active-panel="'+mobilePanel+'"><section class="arsenal-panel arsenal-deck-panel" data-pane="library">'+panelHeading('YOUR DECKS',D.FACTIONS[faction].name)+libraryMarkup()+'</section><section class="arsenal-panel arsenal-catalog-panel" data-pane="cards">'+panelHeading('CARD COLLECTION',(Collection?.summary(profile()).uniqueOwned||0)+' OWNED · '+(profile()?.supply||0)+' SUPPLY')+filterMarkup()+'<div id="catalog-results" class="catalog-results" role="status" aria-live="polite">'+resultMarkup()+'</div><div id="card-catalog" class="arsenal-catalog">'+catalogMarkup()+'</div></section><aside class="arsenal-panel arsenal-detail-panel" data-pane="briefing" aria-label="Selected card briefing">'+panelHeading('CARD BRIEFING','ART / RULES / KEYWORDS')+'<div id="card-detail">'+detailMarkup()+'</div></aside></div>'+compositionMarkup()+commandMarkup()+'</div>';
    document.getElementById('card-catalog').scrollTop=scrolls.catalog;document.getElementById('library-contents').scrollTop=scrolls.library;document.getElementById('deck-editor').scrollTop=scrolls.editor;document.getElementById('card-detail').scrollTop=scrolls.detail;
    const nextFocus=focusId?document.getElementById(focusId):focusAction?app.querySelector('[data-action="'+CSS.escape(focusAction)+'"]'+(focusCard?'[data-id="'+CSS.escape(focusCard)+'"]':'')):null;if(nextFocus&&!nextFocus.disabled)nextFocus.focus({preventScroll:true});
    }finally{rendering=false;}
  }
  function refreshCatalog(){document.getElementById('card-catalog').innerHTML=catalogMarkup();document.getElementById('catalog-results').innerHTML=resultMarkup();}
  function refreshDeckEdit(){
    if(rendering)return;rendering=true;
    try{
      const editor=document.getElementById('deck-editor'),scroll=editor.scrollTop;
      editor.innerHTML=editorMarkup();editor.scrollTop=scroll;
      document.querySelector('.deck-summary').outerHTML=compositionMarkup();refreshCatalog();
      refreshCommands();
    }finally{rendering=false;}
  }
  function craftCard(id){if(!Collection)return;const result=Collection.craft(id);if(result.ok){collectionProfile=result.profile;render();if(dialog.open)openBriefing();notify('One copy of '+D.CARDS[id].name+' crafted.');}else notify(result.error||'Crafting unavailable.',true);}
  function preferredVariant(node){
    if(!Collection)return;const layer=node.dataset.cosmeticLayer,id=node.dataset.cosmeticCard;
    const result=Collection.setCosmeticPreferences(id,{[layer]:layer==='favorite'?node.checked:node.value});
    if(result.ok===false){notify(result.error||'Treatment unavailable.',true);return;}
    collectionProfile=result.profile;render();if(dialog.open)openBriefing();
  }
  function selectDeck(next){deck=clone(next);faction=deck.faction;savedKey=editingKey(deck);history=[];future=[];dirty=false;filters=freshFilters(filters.sort);inspected=deck.cards.find(id=>D.CARDS[id])||Object.keys(D.CARDS).find(id=>D.CARDS[id].faction===faction);render();}
  function saveDeck(){
    const result=Decks.save(deck);if(!result.ok){render();notify(result.error,true);return null;}
    deck=result.deck;savedKey=editingKey(deck);history=[];future=[];dirty=false;libraryPanel='contents';render();notify(Decks.validate(deck).legal?(ownership().complete?'Deck saved. Ready for the frontline.':'Deck saved. Acquire missing copies before live play; War Room is available.'):'Draft saved. Fix the legality warnings before playing.');return deck;
  }
  function downloadDeck(){
    try{const json=Decks.exportDeck(deck),url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=(deck.name.replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,70)||'frontlines-deck')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){notify(error.message,true);}
  }
  function downloadRecovery(){try{const report=Decks.storageDiagnostics?.(),raw=Decks.recoveryExport?Decks.recoveryExport():JSON.stringify(report,null,2),url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='frontlines-library-recovery.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('Original library data downloaded. Your saved records remain on this device.');}catch(error){notify('Recovery download failed: '+error.message,true);}}
  function openImport(){dialog.innerHTML='<h2>Import a deck</h2><p>Choose a Frontlines deck JSON file or paste its text. Imported decks are saved as a separate copy. Unknown or changed cards become visible legality warnings.</p><label class="tag" for="deck-import-file">JSON FILE</label><input id="deck-import-file" type="file" accept=".json,application/json"><label class="tag" for="deck-import-text">OR PASTE JSON</label><textarea id="deck-import-text" placeholder="Paste exported deck JSON here…" maxlength="100000"></textarea><p id="import-error" role="status"></p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Cancel</button><button class="btn primary" data-dialog-action="import">Import & save copy</button></div>';dialog.showModal();}
  function importText(text){
    try{const imported=Decks.importDeck(text),raw=JSON.parse(text),migrated=Decks.commandersEnabled()&&(raw.deck||raw).commanderId===undefined,result=Decks.save(imported);if(!result.ok)throw new Error(result.error);dialog.close();libraryPanel='contents';mobilePanel='library';selectDeck(result.deck);notify(migrated?'Legacy deck imported with '+commander().name+' as faction Commander. Your card list was preserved.':Decks.validate(deck).legal?'Deck imported and saved.':'Draft imported. Review the legality warnings.');return true;}catch(error){const notice=document.getElementById('import-error');if(notice)notice.textContent=error.message;else notify(error.message,true);return false;}
  }
  app.addEventListener('input',event=>{
    if(event.target.id==='deck-name'&&!readOnly()){deck.name=event.target.value;markDirty();document.getElementById('summary-deck-name').textContent=deck.name;document.querySelector('.arsenal-command-status').textContent=dirty?'UNSAVED CHANGES · CTRL + S':'YOUR DECK · LOCAL LIBRARY';const legal=Decks.validate(deck).legal;document.getElementById('deck-status').innerHTML=(legal?'<strong>● RULES LEGAL / '+(ownership().complete?'READY TO PLAY':'COLLECTION INCOMPLETE')+'</strong>':'<b class="invalid">● DRAFT / NOT PLAYABLE</b>')+'<span id="dirty-status">'+(dirty?'Unsaved changes':'Saved on this device')+'</span>';document.getElementById('summary-legality').textContent=legal?'LEGAL DECK':'DRAFT';document.getElementById('summary-legality').className=legal?'legal':'invalid';refreshCommands();}
    if(event.target.dataset.filter==='search'){filters.search=event.target.value;refreshCatalog();}
    if(event.target.id==='deck-library-search'){librarySearch=event.target.value;document.querySelector('.deck-library-list').innerHTML=libraryItems();}
  });
  app.addEventListener('change',event=>{
    if(rendering)return;
    const node=event.target;
    if(node.dataset.cosmeticCard){preferredVariant(node);return;}
    if(node.dataset.cardQuantity){setQuantity(node.dataset.cardQuantity,node.value,true);return;}
    if(node.dataset.filter&&node.dataset.filter!=='search'){filters[node.dataset.filter]=node.type==='checkbox'?node.checked:node.value;refreshCatalog();}
    if(node.id==='collection-faction'){collectionScope=node.value;render();document.getElementById('card-catalog').scrollTop=0;}
    if(node.id==='deck-library-kind'){libraryKind=node.value;document.querySelector('.deck-library-list').innerHTML=libraryItems();}
    if(node.id==='deck-strategy'&&!readOnly()){deck.archetype=node.value;markDirty();document.getElementById('dirty-status').textContent=dirty?'Unsaved changes':'Saved on this device';document.getElementById('summary-archetype').textContent=deck.archetype.replace(/-/g,' ');document.querySelector('.arsenal-command-status').textContent=dirty?'UNSAVED CHANGES · CTRL + S':'YOUR DECK · LOCAL LIBRARY';}
    if(node.id==='builder-deck'){if(!abandonDraft()){node.value=deck.id;return;}const next=library().find(d=>d.id===node.value);if(next)selectDeck(next);}
    if(node.id==='builder-faction'){if(!abandonDraft()){node.value=faction;return;}selectDeck(library().find(d=>d.faction===node.value));}
  });
  app.addEventListener('click',event=>{
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;
    const id=node.dataset.id,c=D.CARDS[id];
    switch(node.dataset.action){
      case 'commander-flow':openCommanderFlow();break;
      case 'filters':advancedFilters=!advancedFilters;render();break;
      case 'panel':mobilePanel=node.dataset.panel;render();break;
      case 'library-panel':libraryPanel=node.dataset.panel;render();break;
      case 'select-deck':if(abandonDraft()){const next=library().find(d=>d.id===id);if(next)selectDeck(next);}break;
      case 'inspect':if(c){inspected=id;Collection?.markSeen(id);collectionProfile=Collection?.load();document.getElementById('card-detail').innerHTML=detailMarkup();refreshCatalog();if(innerWidth<=1100)openBriefing();}else notify('This card is unavailable. Remove or replace it to make the deck legal.',true);break;
      case 'inspect-dialog':openBriefing();break;
      case 'craft-card':craftCard(id);break;
      case 'add-card':if(canAdd(c,Decks.validate(deck).counts))setQuantity(id,(Decks.validate(deck).counts[id]||0)+1);break;
      case 'remove-card':setQuantity(id,Math.max(0,(Decks.validate(deck).counts[id]||0)-1));break;
      case 'remove-all':setQuantity(id,0);break;
      case 'undo':if(history.length&&!readOnly()){future.push(clone(deck));deck=history.pop();faction=deck.faction;markDirty();render();}break;
      case 'redo':if(future.length&&!readOnly()){history.push(clone(deck));deck=future.pop();faction=deck.faction;markDirty();render();}break;
      case 'clear-filter':if(node.dataset.filterKey in filters){filters[node.dataset.filterKey]=node.dataset.filterKey==='inDeck'?false:'';render();}break;
      case 'clear-filters':filters=freshFilters();render();break;
      case 'save':saveDeck();break;
      case 'duplicate':{const result=Decks.duplicate(deck,deck.name.slice(0,70)+' copy');if(result.ok){libraryPanel='contents';selectDeck(result.deck);notify('Editable copy saved. Make this deck your own.');document.getElementById('deck-name').focus();}else notify(result.error,true);break;}
      case 'new':if(abandonDraft()){libraryPanel='contents';mobilePanel='library';openCommanderFlow('new');}break;
      case 'random':if(abandonDraft()){libraryPanel='contents';mobilePanel='library';const next=Decks.random(faction,Math.floor(Math.random()*2147483646)+1);selectDeck(next);dirty=true;render();notify(ownership().complete?'Legal random deck created. Save it to keep a copy.':'Legal random template created. Acquire missing cards before live play, or test it in the War Room.');}break;
      case 'export':downloadDeck();break;
      case 'recovery-export':downloadRecovery();break;
      case 'import':if(abandonDraft())openImport();break;
      case 'delete':dialog.innerHTML='<h2>Delete this saved deck?</h2><p>'+esc(deck.name)+' will be removed from this device. Export a copy first if you want to keep it. Original starter and archetype decks remain available.</p><div class="arsenal-dialog-actions"><button class="btn quiet" data-dialog-action="close">Keep deck</button><button class="btn danger" data-dialog-action="delete">Delete deck</button></div>';dialog.showModal();break;
      case 'simulate':if(Decks.validate(deck).legal){const current=readOnly()?deck:saveDeck();if(current)location.href='simulator.html?deck='+encodeURIComponent(current.id);}break;
      case 'play':if(Decks.validate(deck).legal&&ownership().complete){const current=readOnly()?deck:saveDeck();if(current)location.href='index.html?screen=play&faction='+encodeURIComponent(current.faction)+'&deck='+encodeURIComponent(current.id);}break;
    }
  });
  dialog.addEventListener('click',event=>{
    const craft=event.target.closest('[data-action="craft-card"]');if(craft&&!craft.disabled){craftCard(craft.dataset.id);return;}
    const node=event.target.closest('[data-dialog-action]');if(!node)return;
    if(node.dataset.dialogAction==='close')dialog.close();
    if(node.dataset.dialogAction==='commander-select'){commanderFlow.selected=node.dataset.commanderId;renderCommanderFlow();}
    if(node.dataset.dialogAction==='commander-assign')assignCommanderSelection();
    if(node.dataset.dialogAction==='commander-foundation')useCommanderFoundation();
    if(node.dataset.dialogAction==='commander-empty')useCommanderFoundation(true);
    if(node.dataset.dialogAction==='import')importText(document.getElementById('deck-import-text').value);
    if(node.dataset.dialogAction==='delete'){const result=Decks.remove(deck.id);if(result.ok){dialog.close();selectDeck(library().find(d=>d.faction===faction));notify('Saved deck deleted.');}else notify(result.error,true);}
  });
  dialog.addEventListener('change',async event=>{
    if(event.target.dataset.cosmeticCard){preferredVariant(event.target);return;}
    if(event.target.id==='commander-flow-faction'){commanderFlow.faction=event.target.value;commanderFlow.selected=Commanders.defaultFor(commanderFlow.faction);renderCommanderFlow();return;}
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
  window.addEventListener('storage',event=>{if(event.key===Collection?.STORAGE_KEY){render();return;}if(event.key===Decks.STORAGE_KEY&&!dirty){const updated=library().find(d=>d.id===deck.id);if(updated)selectDeck(updated);else render();}});
  window.addEventListener('beforeunload',event=>{if(navigationApproved){navigationApproved=false;return;}if(dirty){event.preventDefault();event.returnValue='';}});
  window.FrontlinesDeckBuilder={getDeck:()=>clone(deck),getSavedDecks:()=>Decks.load(),getLegality:()=>Decks.validate(deck),getOwnership:ownership,getCommander:()=>clone(commander()||null),getCommanderStarters:()=>Decks.commanderStarters(),getComposition:()=>Decks.composition(deck),getFilters:()=>({...filters,collectionScope}),getCatalogIds:()=>selectedCatalog().map(c=>c.id),hasUnsavedChanges:()=>dirty,confirmLeave,selectDeck:id=>{const next=library().find(d=>d.id===id);if(next)selectDeck(next);},importText};
  window.FrontlinesEffects?.setMusicState('arsenal');render();
})();
