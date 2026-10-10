/* Private-match command interface. The desktop host owns transport and rules. */
(function (root) {
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = value => JSON.parse(JSON.stringify(value));
  const native = root.FrontlinesDesktop;
  let model = {phase:'menu',available:!!native?.multiplayer,connection:{state:'idle'},lobby:{players:[]}};
  let busy = false, error = '', notice = '', menu = 'menu', unsubscribe = null, ownLobbySeat = 0;
  const preferences = () => root.FrontlinesShell?.getState?.().preferences || {};
  const displayName = () => preferences().displayName || 'Commander';
  const library = () => root.FrontlinesDecks.forData(root.FrontlinesData);
  const localPlayer = () => model.lobby?.players?.[model.lobbySeat ?? ownLobbySeat];
  function sanitizeName(value) { return String(value || '').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24) || 'Commander'; }
  function normalizeCode(value) { return String(value || '').toUpperCase().replace(/[\s-]/g,'').slice(0,8); }
  function codeText(value) { const code=normalizeCode(value);return code.length>4?code.slice(0,4)+'-'+code.slice(4):code; }
  function friendlyError(value) {
    const code = String(value?.code || value?.errorCode || '').toUpperCase();
    if (/VERSION|PROTOCOL|TIMING/.test(code)) return 'VERSION MISMATCH. Update Frontlines before joining this match.';
    if (/RULESET|CONTENT|DATA_MISMATCH/.test(code)) return 'GAME DATA DOES NOT MATCH. Both players need the same Frontlines build.';
    if (/EXPIRED|NOT_FOUND|INVALID_CODE/.test(code)) return 'MATCH NOT FOUND. The invite may have expired or the host may have left.';
    if (/FULL/.test(code)) return 'MATCH FULL. This private match already has two players.';
    if (/DECK|COMMANDER|SELECTION/.test(code)) return 'DECK INVALID. Select a legal deck and a Commander from its faction.';
    if (/UNCONFIGURED|CONFIGURATION|SERVICE_UNAVAILABLE/.test(code)) return 'PRIVATE ONLINE SERVICE UNAVAILABLE. Offline Frontlines remains available.';
    return typeof value?.message==='string' && value.message.length<=220 && /\s/.test(value.message) && !/^[A-Z_0-9]+$/.test(value.message) ? value.message : 'Could not connect. Check your internet connection and try again.';
  }
  function rerender() { root.FrontlinesApp?.refresh?.(); }
  function accept(next) {
    if (!next || typeof next !== 'object') return;
    // IPC events and invoke replies are separate queues. An older reply must
    // never replace an already newer lobby/connection/battlefield projection.
    if(Number.isInteger(next.modelRevision)&&Number.isInteger(model.modelRevision)&&next.modelRevision<model.modelRevision)return;
    if(next.snapshot?.matchId&&next.snapshot.matchId===model.snapshot?.matchId&&
      Number.isInteger(next.snapshot.sequence)&&Number.isInteger(model.snapshot.sequence)&&next.snapshot.sequence<model.snapshot.sequence)return;
    const previous = model;
    model = clone(next);busy=false;
    if(model.phase==='lobby')ownLobbySeat=model.lobbySeat ?? model.localSeat ?? ownLobbySeat;
    if (next.error) error = friendlyError(typeof next.error==='object'?next.error:{code:next.errorCode,message:next.error});
    else error='';
    if (model.snapshot?.state) {
      const payload={...model.snapshot,localSeat:model.localSeat ?? model.snapshot.localSeat,names:model.names || model.snapshot.names,
        status:['connectionLost','closed'].includes(model.snapshot.status)?model.snapshot.status:model.connection?.state==='connected' ? model.snapshot.status || 'connected' : model.connection?.state || model.snapshot.status,
        result:model.result || model.snapshot.result,receipt:model.receipt || model.snapshot.receipt,error:model.error};
      root.FrontlinesApp?.updateNetworkMatch(payload);
    } else if (['lobby','closed','menu'].includes(model.phase) && root.FrontlinesApp?.getUIState?.().network) {
      root.FrontlinesApp.endNetworkMatch(model.phase==='menu'?'home':'multiplayer');
    }
    if (previous.connection?.state==='reconnecting' && model.connection?.state==='connected') {notice='Reconnected. The battlefield is synchronized.';root.FrontlinesEffects?.cue?.('select',{channel:'ui'});}
    if (model.phase==='lobby' && previous.phase!=='lobby') menu='menu';
    if(model.phase==='lobby'&&previous.phase==='lobby'&&(model.lobby?.players?.length>previous.lobby?.players?.length||model.lobby?.players?.some((p,i)=>p.ready&&!previous.lobby?.players?.[i]?.ready)))root.FrontlinesEffects?.cue?.('select',{channel:'ui'});
    if(!model.snapshot?.state)rerender();
  }
  async function command(type,payload) {
    if (!native?.multiplayer) {error='PRIVATE ONLINE SERVICE UNAVAILABLE. Use the installed Windows build for private matches.';rerender();return {ok:false,error};}
    if(busy&&type!=='intent')return {ok:false,error:'Please wait for the current connection request.'};
    if(type!=='intent'){busy=true;error='';notice='';rerender();}
    try {
      const result=await native.multiplayer(type,payload || {});
      if(result?.state)accept(result.state);
      if(result?.ok===false){error=friendlyError(result);throw Object.assign(new Error(error),{code:result.code});}
      return result || {ok:true};
    } catch (failure) {
      error = friendlyError({code:failure.code,message:failure.message});rerender();return {ok:false,error};
    } finally {if(type!=='intent'){busy=false;rerender();}}
  }
  function selectedDeck() {
    const player=localPlayer(), decks=library().getDecks(), faction=player?.faction || preferences().multiplayerFaction || 'stonewall';
    const deckId=player?.deck?.id || player?.deckId || preferences().multiplayerDeckId;
    const selected=decks.find(d=>d.faction===faction&&d.id===deckId) || decks.find(d=>d.faction===faction);
    return selected?{...selected,commanderId:player?.commanderId || selected.commanderId || root.FrontlinesCommanders.defaultFor(faction)}:null;
  }
  function validation(deck) {
    if(!deck)return {legal:false,reason:'Choose a deck.'};
    const valid=library().validate(deck), ownership=root.FrontlinesCollection?.canUseDeck(deck);
    return {legal:valid.legal&&ownership?.complete!==false,reason:!valid.legal?valid.errors.join(' '):ownership?.complete===false?'This deck needs more owned copies. Build or craft its missing cards.':'Legal deck · Collection ready'};
  }
  function playerPanel(seat) {
    const p=model.lobby?.players?.[seat], own=seat===(model.lobbySeat ?? ownLobbySeat), deck=own?selectedDeck():p?.deck;
    const factionId=p?.faction || deck?.faction || (own?'stonewall':'bruiser'), f=root.FrontlinesData.FACTIONS[factionId], cmd=root.FrontlinesCommanders.get(p?.commanderId || deck?.commanderId);
    const selected=own?validation(deck):{legal:p?.legal===true,reason:p?.reason||'Waiting for a legal deck.'};
    return '<section class="mp-player faction-'+esc(factionId)+'" style="--faction-color:'+esc(f?.color||'#92a4b5')+'" data-mp-seat="'+seat+'"><div class="mp-player-title"><div><span class="eyebrow">'+(seat===0?'HOST':'GUEST')+(own?' / YOU':' / OPPONENT')+'</span><h2>'+esc(p?.name || (own?displayName():'Waiting for player'))+'</h2></div><span class="mp-ready '+(p?.ready?'ready':'')+'">'+(p?.ready?'READY':p?.connected?'NOT READY':'WAITING')+'</span></div>'+
      (p?.connected||own?'<div class="mp-commander-art">'+(cmd?root.FrontlinesArt?.commanderHtml(cmd)||'':'')+'<div><b>'+esc(cmd?.name||'Choose your Commander')+'</b><span>'+esc(cmd?.role||f?.name||'')+'</span><p>'+esc(cmd?.passive?.text||'Your Commander shapes how your force fights.')+'</p></div></div>':'<div class="mp-empty-seat"><strong>YOUR OPPONENT BELONGS HERE.</strong><p>Send the invite code to a friend. They only need Frontlines.</p></div>')+
      (own?'<div class="mp-selection"><label>Faction<select data-mp-setting="faction" '+(busy?'disabled':'')+'>'+Object.values(root.FrontlinesData.FACTIONS).map(x=>'<option value="'+x.id+'" '+(deck?.faction===x.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label><label>Commander<select data-mp-setting="commander" '+(busy?'disabled':'')+'>'+root.FrontlinesCommanders.list(deck?.faction||factionId).map(c=>'<option value="'+c.id+'" '+(deck?.commanderId===c.id?'selected':'')+'>'+esc(c.name)+'</option>').join('')+'</select></label><label class="mp-deck-choice">Deck<select data-mp-setting="deck" '+(busy?'disabled':'')+'>'+library().getDecks().filter(d=>d.faction===(deck?.faction||factionId)).map(d=>'<option value="'+esc(d.id)+'" '+(deck?.id===d.id?'selected':'')+'>'+esc(d.name)+(library().validate(d).legal?'':' · DRAFT')+'</option>').join('')+'</select></label></div><div class="mp-deck-summary"><b>'+esc(deck?.name||'No deck selected')+'</b><span>'+esc(deck?.cards?.length||0)+'/26 CARDS · '+(deck?library().composition(deck).averageCost.toFixed(1):'0.0')+' AVG P</span><p class="'+(selected.legal?'':'mp-warning')+'">'+esc(selected.reason)+'</p></div><button class="btn quiet" data-mp="inspect-deck">Inspect your deck</button>':'<div class="mp-public-choice"><p><span>FACTION</span><b>'+esc(f?.name||'Not selected')+'</b></p><p><span>COMMANDER</span><b>'+esc(cmd?.name||'Not selected')+'</b></p><p><span>DECK</span><b>'+esc(p?.deck?.name||p?.deckName||'Not selected')+'</b></p><span class="small muted">Opponent cards remain private until played.</span></div>')+'</section>';
  }
  function stateLabel() {
    return {idle:'PRIVATE ONLINE 1v1',connecting:'CONNECTING',creating:'CREATING MATCH',connected:'CONNECTED',reconnecting:'RECONNECTING',disconnected:'CONNECTION LOST',closed:'MATCH CLOSED',unavailable:'SERVICE UNAVAILABLE'}[model.connection?.state] || 'PRIVATE ONLINE 1v1';
  }
  function render() {
    const lobby=model.phase==='lobby' || !!model.lobby?.players?.some(p=>p?.connected), isClosed=model.phase==='closed';
    const banner=(error?'<div class="mp-error" role="alert">'+esc(error)+(/MISMATCH/.test(error)?'<button class="btn primary" data-mp="update">Update Frontlines</button>':'')+'</div>':'')+(notice?'<p class="mp-notice" role="status">'+esc(notice)+'</p>':'');
    const title='<div class="mp-heading"><div><span class="eyebrow">PRIVATE OPERATIONS / '+esc(stateLabel())+'</span><h1>YOUR FRIEND.<br><span>YOUR FRONTLINE.</span></h1></div><label class="mp-name">Display name<input data-mp-setting="name" maxlength="24" value="'+esc(displayName())+'" autocomplete="nickname" aria-label="Multiplayer display name"></label></div>';
    if(lobby&&!isClosed) {
      const player=localPlayer(), valid=validation(selectedDeck()), connected=model.connection?.state==='connected', startReason=model.lobby?.startReason||(!model.lobby?.canStart?'Both players must connect, choose legal decks and Ready.':'Both players are ready.');
      return '<main class="mp-screen mp-lobby" aria-label="Private match lobby">'+title+'<div class="mp-lobby-toolbar"><div class="mp-invite"><span>INVITE CODE</span><strong>'+esc(codeText(model.code||''))+'</strong><button class="btn quiet" data-mp="copy">Copy code</button></div><span class="mp-connection" role="status">'+esc(stateLabel())+'</span><button class="btn quiet" data-mp="report">Export report</button></div>'+banner+'<div class="mp-players">'+playerPanel(0)+playerPanel(1)+'</div><footer class="mp-actions"><button class="btn quiet" data-mp="leave">Leave lobby</button><div><p id="mp-start-reason" role="status">'+esc(startReason)+'</p><span class="small muted">Changing faction, Commander or deck removes Ready.</span></div><button class="btn '+(player?.ready?'quiet':'primary')+'" data-mp="ready" '+(!connected||!valid.legal||busy?'disabled':'')+'>'+(player?.ready?'Not ready':'Ready up')+'</button>'+(model.localSeat===0?'<button class="btn primary" data-mp="start" aria-describedby="mp-start-reason" title="'+esc(startReason)+'" '+(!model.lobby?.canStart||busy?'disabled':'')+'>Start match →</button>':'')+'</footer></main>';
    }
    const unavailable=model.available===false||model.configurationRequired===true;
    return '<main class="mp-screen" aria-label="Multiplayer menu">'+title+banner+'<section class="mp-entry"><div class="mp-entry-copy"><span class="eyebrow">TWO COMMANDERS. ONE BATTLEFIELD.</span><h2>'+(isClosed?'MATCH CLOSED.':'HOST. SEND CODE. PLAY.')+'</h2><p>'+esc(isClosed?'The private session has ended. Create or join another match.':'Play a private Frontlines match with a friend. No accounts, IP addresses or router settings.')+'</p><div class="mp-policy"><b>PRIVATE MATCH PROGRESSION</b><p>Card history and eligible battlefield mastery are kept. Private games grant no Credits, Supply or packs.</p></div>'+(unavailable?'<p class="mp-warning">The private online service is unavailable in this build. Solo, Tutorial, Arsenal and War Room work offline.</p>':'')+'</div><div class="mp-entry-actions">'+(menu==='join'?'<form class="mp-join-form"><label for="mp-invite">Invite code</label><input id="mp-invite" maxlength="15" autocomplete="off" spellcheck="false" placeholder="F7K9-R2QM" aria-label="Private match invite code"><button class="home-command primary" type="submit" '+(busy||unavailable?'disabled':'')+'><span><strong>'+(busy?'CONNECTING…':'JOIN MATCH')+'</strong><small>Enter your friend’s eight-character code.</small></span><b>→</b></button><button class="btn quiet" type="button" data-mp="back">Back</button></form>':'<button class="home-command primary" data-mp="host" '+(busy||unavailable?'disabled':'')+'><span><strong>'+(busy?'CREATING MATCH…':'HOST PRIVATE MATCH')+'</strong><small>Create an invite code for your friend.</small></span><b>→</b></button><button class="home-command" data-mp="join-screen" '+(busy||unavailable?'disabled':'')+'><span><strong>JOIN PRIVATE MATCH</strong><small>Use the invite code your friend sent.</small></span><b>→</b></button><button class="btn quiet" data-mp="home">Return to command menu</button>')+'</div></section><p class="mp-entry-footer">'+esc(stateLabel())+' · '+(model.connection?.route==='relay'?'SECURE RELAY · ':'')+'PRIVATE FRIEND-TO-FRIEND FRONTLINES</p></main>';
  }
  function connectionMarkup(payload) {
    const status=payload.status || model.connection?.state, peer=model.names?.[1-payload.localSeat] || payload.names?.[1-payload.localSeat] || 'Opponent';
    const closed=['closed','disconnected','expired','connectionLost','connection-lost'].includes(status);
    if(['connected','active','playing','results','finished'].includes(status))return '';
    return '<aside class="mp-reconnect" role="status" aria-live="polite"><strong>'+(closed?'CONNECTION LOST':status==='starting'?'ENTERING THE BATTLEFIELD…':status==='synchronizing'?'RESYNCING…':'RECONNECTING…')+'</strong><p>'+esc(closed?'The match is paused. Your opponent cannot act while disconnected.':status==='starting'?'Both commanders are confirming the same opening battlefield.':'Restoring your connection to '+peer+'. The battlefield stays paused.')+'</p>'+(status==='connectionLost'&&(model.lobbySeat??ownLobbySeat)===0?'<button class="btn primary" data-mp="wait">Wait longer</button>':'')+'<button class="btn quiet" data-mp="resync">Retry connection</button><button class="btn quiet" data-mp="report">Export report</button><button class="btn quiet" data-mp="leave">Return to menu</button></aside>';
  }
  function resultMarkup(payload,state) {
    const seat=payload.localSeat,winner=state.winner,f=root.FrontlinesData.FACTIONS[state.players[winner]?.faction], result=payload.result||model.result||{},names=payload.names||model.names||[], receipt=payload.receipt||model.receipt;
    return '<div class="overlay victory-overlay" role="dialog" aria-modal="true" aria-label="Private match result"><section class="modal victory-modal mp-result" style="--faction-color:'+esc(f?.color||'#d6a572')+'"><div class="victory-emblem">'+(root.FrontlinesArt?.commanderHtml(root.FrontlinesCommanders.get(state.players[winner]?.commander?.id))||'')+'</div><span class="eyebrow">PRIVATE OPERATION COMPLETE</span><h2>'+(winner===seat?'TERRITORY SECURED.':'FRONTLINE LOST.')+'</h2><div class="victory-sub">'+esc(names[winner]||'Player '+(winner+1))+' / '+esc(f?.name||'')+' VICTORY</div><p>'+esc(result.reason==='concede'?(winner===seat?'The opposing command conceded.':'Your command conceded this battlefield.'):result.reason==='disconnect'?'The session ended after a permanent disconnect.':'The battlefield has been secured.')+'</p><div class="mp-result-forces">'+state.players.map((p,i)=>'<p><b>'+esc(names[i]||'Player '+(i+1))+'</b><span>'+esc(root.FrontlinesData.FACTIONS[p.faction]?.name)+' · '+esc(root.FrontlinesCommanders.get(p.commander?.id)?.name)+'</span></p>').join('')+'</div><div class="victory-stats"><div><b>'+state.turn+'</b><span>'+(state.turnSystemVersion===2?'TURNS':'ACTION WINDOWS')+'</span>'+(state.turnSystemVersion===2?'<small>'+state.windowIndex+' ACTION WINDOWS</small>':'')+'</div><div><b>'+root.FrontlinesEngine.controlledCount(state,winner)+'</b><span>TERRITORIES</span></div><div><b>'+state.units.filter(u=>u.owner===winner).length+'</b><span>SURVIVORS</span></div></div><section class="match-rewards"><b>PRIVATE MATCH HISTORY RECORDED</b><p>'+esc(receipt?.message||'No Credits, Supply or packs. Eligible mastery records only cards actually used.')+'</p></section><div class="modal-footer"><button class="btn quiet" data-action="review-victory">Review battlefield</button><button class="btn primary" data-mp="rematch">Rematch →</button><button class="btn quiet" data-mp="lobby">Return to lobby</button></div><div class="mp-result-secondary"><button class="btn quiet" data-mp="report">Export report</button><button class="btn quiet" data-mp="leave">Main menu</button></div></section></div>';
  }
  async function select(values) {
    const current=selectedDeck(), faction=values.faction||current?.faction||'stonewall', decks=library().getDecks().filter(d=>d.faction===faction);
    const picked=decks.find(d=>d.id===(values.deckId||current?.id))||decks[0];if(!picked)return;
    const commanderId=values.commanderId || (faction===current?.faction?current?.commanderId:null) || picked.commanderId || root.FrontlinesCommanders.defaultFor(faction);
    const deck={...picked,commanderId};root.FrontlinesShell?.savePreferences({multiplayerFaction:faction,multiplayerDeckId:picked.id});
    return command('select',{faction,commanderId,deck});
  }
  async function open() {
    menu='menu';error='';notice='';root.FrontlinesApp?.showScreen('multiplayer');
    if(root.FrontlinesApp?.getUIState?.().screen!=='multiplayer')return;
    if(native?.getMultiplayerState){try{accept(await native.getMultiplayerState());}catch(_){error='Private online service is unavailable. Try again shortly.';rerender();}}
  }
  document.addEventListener('click',async event=>{
    const n=event.target.closest('[data-mp]');if(!n||n.disabled)return;event.preventDefault();
    const action=n.dataset.mp;
    if(action==='join-screen'){menu='join';error='';rerender();document.getElementById('mp-invite')?.focus();}
    else if(action==='back'){menu='menu';error='';rerender();}
    else if(action==='home'){root.FrontlinesApp?.showScreen('home');}
    else if(action==='update'){root.FrontlinesShell?.openSettings('advanced');}
    else if(action==='host'){const name=sanitizeName(document.querySelector('[data-mp-setting="name"]')?.value||displayName());root.FrontlinesShell?.savePreferences({displayName:name});const result=await command('host',{name});if(result.ok&&model.phase==='lobby'&&!localPlayer()?.deck)await select({});}
    else if(action==='ready'){await command('ready',{ready:!localPlayer()?.ready});}
    else if(action==='start'){await command('start');}
    else if(action==='copy'){try{await navigator.clipboard.writeText(codeText(model.code));notice='Invite code copied. Send it to your friend.';}catch(_){notice='Invite code: '+codeText(model.code)+'. Select and copy it.';}rerender();}
    else if(action==='inspect-deck'){root.FrontlinesApp?.inspectNetworkDeck(selectedDeck());}
    else if(action==='concede'){if(root.confirm('Concede this match? Your opponent will receive victory.'))await command('concede');}
    else if(action==='leave'){if(model.phase==='match'&&!root.confirm('Leave this private match? It will pause and your opponent will be notified.'))return;await command('leave');root.FrontlinesApp?.endNetworkMatch('home');}
    else if(action==='rematch'||action==='lobby'){await command(action);}
    else if(action==='resync'){await command('resync');}
    else if(action==='wait'){await command('wait');}
    else if(action==='retry-reward'){root.FrontlinesApp?.retryNetworkProgression?.();}
    else if(action==='report'){const result=await command('report');const report=result.report||model.diagnostics;if(report){const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Frontlines-Multiplayer-Report.json';a.click();URL.revokeObjectURL(url);notice='Multiplayer report exported.';rerender();}}
  });
  document.addEventListener('change',async event=>{
    const field=event.target.dataset.mpSetting;if(!field)return;
    if(field==='name'){const name=sanitizeName(event.target.value);root.FrontlinesShell?.savePreferences({displayName:name});if(model.sessionId)await command('name',{name});else rerender();}
    else if(field==='faction')await select({faction:event.target.value});
    else if(field==='deck')await select({deckId:event.target.value,commanderId:null});
    else if(field==='commander')await select({commanderId:event.target.value});
  });
  document.addEventListener('submit',async event=>{
    if(!event.target.matches('.mp-join-form'))return;event.preventDefault();const code=normalizeCode(document.getElementById('mp-invite')?.value);
    if(code.length!==8){error='Enter the eight-character invite code from your friend.';rerender();return;}
    const name=sanitizeName(document.querySelector('[data-mp-setting="name"]')?.value||displayName());root.FrontlinesShell?.savePreferences({displayName:name});
    const result=await command('join',{code,name});if(result.ok&&model.phase==='lobby'&&!localPlayer()?.deck)await select({});
  });
  if(native?.onMultiplayer)unsubscribe=native.onMultiplayer(accept);
  root.FrontlinesMultiplayerUI={open,render,accept,getState:()=>clone(model),getSelectedDeck:()=>selectedDeck(),sendIntent:action=>command('intent',{action}),connectionMarkup,resultMarkup,command,normalizeCode,sanitizeName,
    disconnect:()=>command('leave'),dispose:()=>unsubscribe?.()};
})(window);
