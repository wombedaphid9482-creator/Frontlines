/* Frontlines interface. All game rules and mutations live in engine.js. */
(function () {
  'use strict';
  const D = window.FrontlinesData;
  const E = window.FrontlinesEngine;
  const Decks = window.FrontlinesDecks?.forData(D);
  const Collection = window.FrontlinesCollection;
  const Commanders = E.commanders || window.FrontlinesCommanders;
  let collectionProfile = Collection?.load();
  const Runtime = window.FrontlinesRuntime || {version:window.FrontlinesBuild.version,balanceProfile:'baseline',balanceName:'Baseline',aiProfile:'baseline'};
  const app = document.getElementById('app');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  if (!D || !E) { app.innerHTML = '<main class="boot-screen"><h1>FRONTLINES</h1><p>Game files could not be loaded. Keep index.html, styles.css, data.js, engine.js, ai.js and app.js together in the same folder, then reopen index.html.</p></main>'; return; }
  const configFields = [
    ['startingCommand','Starting Command',5,100,'Support capacity at the start of a match.'],
    ['commandGrowth','Command growth',0,30,'Added on each subsequent offensive turn.'],
    ['commandCap','Command cap',10,200,'Maximum support capacity.'],
    ['captureThreshold','Capture threshold',5,100,'Accumulated Presence needed to take an objective.'],
    ['startingHand','Opening hand',1,15,'Cards drawn when the match begins.'],
    ['drawCount','Cards per turn',0,5,'Drawn at the start of an offensive turn.'],
    ['slotsPerTerritory','Slots per side / territory',1,5,'Maximum battlefield cards for each player in a zone.'],
    ['actionLimit','Command Actions per turn',1,8,'Major movement, attacks and marked tactical cards. Ordinary deployment is free of Command Actions.'],
    ['victoryTerritories','Territories to win',4,7,'Taking the enemy home also wins immediately.']
  ];
  let settings = { factions:['stonewall','bruiser'], deckIds:['stonewall-starter','bruiser-starter'], commanderIds:[null,null], mode:'hotseat', developer:false, bothHands:false, config:{...D.DEFAULT_CONFIG}, animationSpeed:'normal', reducedEffects:false, reducedShake:false, sound:false };
  settings.avoidLastOpponent=true;settings.lastOpponent='';
  try {
    const saved = JSON.parse(localStorage.getItem('frontlines.settings.v1') || 'null');
    if (saved) {
      settings.avoidLastOpponent=saved.avoidLastOpponent!==false;settings.lastOpponent=typeof saved.lastOpponent==='string'?saved.lastOpponent:'';
      Object.assign(settings,window.FrontlinesShellState.preferences(saved));
      if (Array.isArray(saved.factions) && saved.factions.length === 2 && saved.factions.every(f => D.FACTIONS[f])) settings.factions = saved.factions;
      if (Array.isArray(saved.deckIds) && saved.deckIds.length === 2 && saved.deckIds.every(id=>typeof id==='string')) settings.deckIds=saved.deckIds;
      if(Array.isArray(saved.commanderIds)&&saved.commanderIds.length===2)settings.commanderIds=saved.commanderIds.map(id=>typeof id==='string'?id:null);
      settings.mode = saved.mode === 'ai' ? 'ai' : 'hotseat';
      settings.developer = !!saved.developer;
      settings.bothHands = !!saved.bothHands && settings.developer;
      settings.animationSpeed = saved.animationSpeed === 'fast' ? 'fast' : 'normal';
      settings.reducedEffects = !!saved.reducedEffects;
      settings.reducedShake = !!saved.reducedShake;
      settings.sound = !!saved.sound;
      settings.masterVolume = Number.isFinite(saved.masterVolume) ? Math.max(0, Math.min(1, saved.masterVolume)) : .7;
      for (const [key,,min,max] of configFields) if (saved.config && Number.isFinite(saved.config[key])) settings.config[key] = Math.max(min,Math.min(max,Math.round(saved.config[key])));
      settings.config.commandCap = Math.max(settings.config.commandCap,settings.config.startingCommand);
    }
  } catch (_) { /* Private browsing and file URLs can deny storage. */ }
  Object.assign(settings,window.FrontlinesShellState.preferences(settings));
  const setupParams=new URLSearchParams(location.search);
  if(D.FACTIONS[setupParams.get('faction')])settings.factions[0]=setupParams.get('faction');
  if(Decks){const requestedDeck=Decks.getDecks().find(d=>d.id===setupParams.get('deck'));if(requestedDeck){settings.factions[0]=requestedDeck.faction;settings.deckIds[0]=requestedDeck.id;}}
  let state = null;
  let currentScreen = setupParams.get('screen')==='multiplayer'?'multiplayer':setupParams.get('screen') === 'play' || setupParams.has('deck') || setupParams.has('faction') ? 'play' : 'home';
  let shellSettingsOpen = false;
  let legal = [];
  let actionPreviewCache = new Map();
  let selection = null;
  let inspected = null;
  let modal = null;
  let privacy = false;
  let revealedPlayer = null;
  let victoryDismissed = false;
  let aiTimer = null;
  let toastTimer = null;
  let capturedZone = null;
  let focusBeforeModal = null;
  let matchOptions = null;
  // Online state is a player-safe projection. Only the desktop authority resolves it.
  let networkMatch = null;
  let victoryTimer = null;
  let victoryReady = false;
  let telemetry = null;
  let completedTelemetry = null;
  let telemetryFinished = false;
  let debugChanges = false;
  let progressionId = '', humanCommands = 0, matchReward = null, progressionIneligible = false;
  let recentMatches = [];
  let tutorial=null,tutorialInMatch=false,manualTopic='Winning',contextTip=null,aiActivity=null,activityHistory=[];
  let seenTips={};try{seenTips=JSON.parse(localStorage.getItem('frontlines.tips.v1')||'{}')||{};}catch(_){}
  let newcomer=true;try{newcomer=localStorage.getItem('frontlines.onboarding.v1')!=='seen';}catch(_){}
  function acknowledgeWelcome(){newcomer=false;try{localStorage.setItem('frontlines.onboarding.v1','seen');}catch(_){}}
  function costOf(action){return E.actionCost?E.actionCost(state,action):{presence:0,commandActions:['deploy','order','move','attack'].includes(action.type)?1:0};}
  function handCost(item,mode){
    const c=cardDef(item);if(!state||!item?.uid||!state.players[actor()].hand.some(h=>h.uid===item.uid))return {presence:c.presence,commandActions:cardCost(c)};
    const type=c.type==='order'?(state.response?(state.response.stage==='counter'?'counter':'respond'):'order'):'deploy';
    return E.actionCost(state,{type,handUid:item.uid,...(mode?{mode}: {})});
  }
  function cardCost(c){return Number.isInteger(c.commandCost)?c.commandCost:c.type==='order'&&c.timing!=='action'?0:1;}
  function costText(cost){return cost.presence+' Capacity · '+cost.commandActions+' Command Action'+(cost.commandActions===1?'':'s');}
  function offerTip(key,text){if(!settings.tutorialHints||(tutorialInMatch&&tutorial?.isActive())||seenTips[key])return;seenTips[key]=true;contextTip={key,text};try{localStorage.setItem('frontlines.tips.v1',JSON.stringify(seenTips));}catch(_){}}
  function tipMarkup(){return contextTip&&settings.tutorialHints&&!privacy&&!tutorialInMatch?'<aside class="context-tip" role="status"><b>COMMANDER TIP</b><span>'+esc(contextTip.text)+'</span><button class="btn quiet" data-action="dismiss-tip">Got it</button><button class="btn quiet" data-action="rules">Field manual</button></aside>':'';}
  try { const stored=JSON.parse(localStorage.getItem('frontlines.recent.v1')||'[]');if(Array.isArray(stored))recentMatches=stored.filter(m=>m&&Array.isArray(m.factions)&&m.factions.every(f=>D.FACTIONS[f])&&Number.isFinite(m.seed)).slice(0,20); } catch(_) { /* Local storage is optional. */ }
  function runtimeLabel() { return 'v'+Runtime.version+' / '+(Runtime.balanceProfile==='sprint12'?'Sprint 13 — Private Online Multiplayer':Runtime.balanceName); }
  function recordTelemetry(before,after,action,events,decision) {
    if(!telemetry)return;
    try { telemetry.record(before,after,action,{events,legalActions:legal,decision:decision||{profile:'human',reason:'Human selected a legal action.',score:null,evaluated:legal.length}}); }
    catch(error) { notify('Playtest recording paused: '+error.message,true);telemetry=null; }
  }
  function finishTelemetry() {
    if(telemetryFinished||!state||state.winner==null)return;
    telemetryFinished=true;
    if(telemetry) { try { completedTelemetry=telemetry.finish(state); } catch(error) { notify('Playtest recording could not be completed: '+error.message,true); } }
    finishProgression();
    const entry={version:Runtime.version,balanceProfile:Runtime.balanceProfile,balanceName:Runtime.balanceName,aiVersion:Runtime.aiVersion,mode:settings.mode,aiDifficulty:matchOptions.aiDifficulty||null,factions:state.players.map(p=>p.faction),decks:state.players.map(p=>p.deckMeta),winner:state.winner,turns:state.turn,seed:state.seed,playedAt:new Date().toISOString(),nonCompetitive:debugChanges||settings.bothHands||tutorialInMatch};
    recentMatches.unshift(entry);recentMatches=recentMatches.slice(0,20);
    try { localStorage.setItem('frontlines.recent.v1',JSON.stringify(recentMatches)); } catch(_) { /* No report or private hand is stored. */ }
  }
  const FX = () => window.FrontlinesEffects;
  function finishProgression() {
    if(networkMatch)return;
    if(!Collection||!progressionId||tutorialInMatch)return;
    const cardStats={};
    for(const c of completedTelemetry?.cards||[])if(c.player===0)cardStats[c.cardId]={deployments:c.deployments+c.orders,attacks:c.attacksInitiated,eliminations:c.kills,territoriesInfluenced:c.captureContributions,factionActions:c.passiveTriggers};
    matchReward=Collection.rewardMatch({id:progressionId,rewardPolicy:'completed-match-v2',completed:state.winner!==null,human:true,mode:'match',practice:progressionIneligible||debugChanges||settings.developer||settings.bothHands||Object.keys(D.DEFAULT_CONFIG).some(k=>state.config[k]!==D.DEFAULT_CONFIG[k]),conceded:false,ownTurns:state.stats.turns[0],meaningfulActions:humanCommands,victory:state.winner===0,deckCardIds:matchOptions.decks[0].cards,commanderId:state.players[0].commander?.id,commanderActiveUsed:state.players[0].commander?.used===true,cardStats});
    collectionProfile=Collection.load();
  }
  function rewardMarkup() {
    if(!Collection)return '';
    const gained=matchReward?.creditsEarned??matchReward?.reward?.credits??matchReward?.credits??0;
    const mastery=matchReward?.masteryGains||[],unlocks=mastery.flatMap(g=>g.unlocks||[]);
    return '<section class="match-rewards" aria-label="Operation rewards"><b>'+(matchReward?.ok===false?'REWARD COULD NOT BE SAVED':gained?('+'+gained+' CREDITS'):'NO PROGRESSION REWARD')+'</b><p>'+esc(matchReward?.reason||matchReward?.error||(gained?(matchReward.sources||[]).map(s=>s.name+' +'+s.credits).join(' · '):'Training, developer games and simulations do not grant match currency.'))+'</p><span>Balance: '+(collectionProfile?.credits||0)+' Credits · '+(collectionProfile?.supply||0)+' Supply</span>'+(gained?'<p>+'+mastery.reduce((n,g)=>n+g.points,0)+' mastery across '+mastery.length+' cards'+(unlocks.length?' · '+unlocks.length+' cosmetic treatments unlocked.':'.')+'</p>':'')+(matchReward?.ok===false?'<button class="btn primary" data-action="retry-reward">Retry saving reward</button>':'')+'<a class="btn quiet" href="collection.html#shop">Visit pack shop</a></section>';
  }
  function ownershipFor(deck,player) {
    if(!Collection||settings.developer||(player===1&&settings.mode==='ai'))return {complete:true,missing:[]};
    return Collection.canUseDeck(deck,collectionProfile);
  }
  function ownershipText(result) {
    return result.complete?'Collection ready':result.missing.map(m=>(D.CARDS[m.cardId||m.id]?.name||m.cardId||m.id)+': '+(m.owned??0)+' owned / '+(m.required??m.needed??0)+' needed').join('; ');
  }
  function configureEffects() {
    const reduced = settings.reducedEffects || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    FX()?.configure({...settings, reducedEffects:reduced});
    document.body.classList.toggle('reduce-effects',!!reduced);
    document.body.classList.toggle('reduce-shake',!!settings.reducedShake);
    document.body.dataset.animationSpeed = settings.animationSpeed;
  }
  function factionStyle(id) { return '--faction-color:'+D.FACTIONS[id].color+';'; }
  function skin(card) { return window.FrontlinesPresentation?.skin(card,{profile:collectionProfile})||{className:'',style:''}; }
  function tooltip(text) { return ' data-tip="'+esc(text)+'" title="'+esc(text)+'" tabindex="0"'; }
  function portrait(card, className) {
    if(window.FrontlinesArt?.html)return window.FrontlinesArt.html(card,{className:className||''});
    if ((card.type==='unit'||card.type==='leader') && window.FrontlinesArt) {
      const a=window.FrontlinesArt.get(card);
      return '<span class="card-portrait '+(window.FrontlinesPresentation?.skin(card).className||'')+' '+(className||'')+'" role="img" aria-label="'+esc(a.alt)+'" style="background-image:url(&quot;'+esc(a.src)+'&quot;);background-position:'+a.position+'"><span class="portrait-fallback">'+symbol(card.faction)+'</span></span>';
    }
    return '<span class="art-symbol '+(className||'')+'">'+art(card)+'</span>';
  }

  function saveSettings() { try { localStorage.setItem('frontlines.settings.v1',JSON.stringify(settings)); } catch (_) {} }
  function availableDecks(player) { return Decks?Decks.getDecks().filter(d=>d.faction===settings.factions[player]):[{id:settings.factions[player]+'-starter',name:'Starter deck',faction:settings.factions[player],cards:D.DECKS[settings.factions[player]],source:'starter'}]; }
  function chosenDeck(player) { const decks=availableDecks(player),chosen=decks.find(d=>d.id===settings.deckIds[player])||decks[0];if(chosen)settings.deckIds[player]=chosen.id;return chosen&&Commanders?{...chosen,commanderId:settings.commanderIds[player]||chosen.commanderId||Commanders.defaultFor(chosen.faction)}:chosen; }
  function legalSetupDecks() { return [0,1].every(p=>{const deck=chosenDeck(p);return !!deck&&(!Decks||Decks.validate(deck).legal)&&ownershipFor(deck,p).complete;}); }
  function faction(player) { return D.FACTIONS[state ? state.players[player].faction : settings.factions[player]]; }
  function actor() { return E.getActor(state); }
  function isAI() { return !networkMatch && state && settings.mode === 'ai' && actor() === 1 && state.winner == null; }
  function handsPublic() { return !networkMatch && settings.developer && settings.bothHands; }
  function controllable() { return currentScreen === 'match' && !shellSettingsOpen && state && !privacy && !isAI() && state.winner == null && (!networkMatch || actor()===networkMatch.localSeat && ['connected','active'].includes(networkMatch.status) && !networkMatch.pending); }
  function localSeat() { return networkMatch?.localSeat ?? 0; }
  function seatName(player) { return networkMatch?.names?.[player] || 'Player '+(player+1); }
  function seatOrder() { return networkMatch ? [localSeat(),1-localSeat()] : [0,1]; }
  function visibleTerritories() { return networkMatch?.localSeat===1 ? state.territories.slice().reverse() : state.territories; }
  function findUnit(uid) { return state.units.find(unit => unit.uid === uid); }
  function handItem(uid) { for (const p of state.players) { const h = p.hand.find(card => card.uid === uid); if (h) return h; } return null; }
  function cardDef(item) { return E.card(item); }
  function symbol(factionId) {
    const paths = {
      stonewall:'<path d="M12 9h40v29L32 55 12 38Z"/><path d="M22 19h20v15L32 44 22 34Z"/><path d="M32 19v25M22 29h20"/>',
      bruiser:'<path d="m32 5 23 27-23 27L9 32Z"/><path d="m23 18 18 14-18 14 7-14Z"/><path d="M9 32h11M45 32h10"/>',
      syndicate:'<path d="m32 7 24 13v25L32 58 8 45V20Z"/><path d="m32 17 14 8v15l-14 8-14-8V25Z"/><path d="m18 25 28 15M46 25 18 40M32 17v31"/>',
      nightwalker:'<path d="M50 11 39 32l11 21H15L29 32 15 11Z"/><path d="m29 18 10 14-10 14M16 32h9"/>',
      rogue:'<path d="m9 12 44 20L9 52l12-20Z"/><path d="m21 12 34 20-34 20M21 32h32"/>'
    };
    return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">'+(paths[factionId] || paths.stonewall)+'</svg>';
  }
  function brandSymbol() { return '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 5h9v7h8V5h9v22h-9v-7h-8v7H3Z"/><path d="M16 2v28"/></svg>'; }
  function homeView() {
    const resumable=state&&state.winner==null,progress=tutorial?.snapshot().progress||{};
    const trainingLabel=progress.complete?'REPLAY TUTORIAL':progress.index>0?'CONTINUE TUTORIAL':'TUTORIAL';
    return '<main class="command-home command-screen"><section class="home-intro"><span class="eyebrow">PROJECT FACTION / COMMAND INTERFACE</span><h1>TAKE GROUND.<br><span>HOLD THE LINE.</span></h1><p>Build your force. Read the battlefield. Commit Presence to push the frontline toward the enemy command.</p>'+(newcomer?'<section class="welcome-prompt" aria-label="New commander"><b>FIRST TIME AT THE FRONT?</b><p>Learn by playing a guided operation. Discover what to do, and why.</p><button class="btn primary" data-action="tutorial">Learn Frontlines</button><button class="btn quiet" data-action="play-immediately">Play immediately</button></section>':'<div class="home-motif">'+Object.keys(D.FACTIONS).map(id=>symbol(id)).join('')+'</div><p class="home-version">FIVE FACTIONS / YOUR DECK / ONE FRONTLINE</p>')+'</section><nav class="home-actions" aria-label="Main menu"><button class="home-command primary" data-action="open-play"><span><strong>'+(resumable?'RESUME OPERATION':'PLAY')+'</strong><small>'+(resumable?'Your active battlefield is paused.':'Choose your faction, deck and AI difficulty.')+'</small></span><b>→</b></button><button class="home-command" data-action="tutorial"><span><strong>'+trainingLabel+'</strong><small>Fourteen playable lessons. Learn your Commander and the front.</small></span><b>→</b></button><a class="home-command" href="tactical-training.html" data-game-navigation="training"><span><strong>TACTICAL TRAINING</strong><small>Cover, grenades, evasion and meaningful sacrifice.</small></span><b>→</b></a><a class="home-command" href="deck-builder.html" data-game-navigation="arsenal"><span><strong>ARSENAL</strong><small>Build, inspect and save your decks.</small></span><b>→</b></a><a class="home-command" href="collection.html" data-game-navigation="collection"><span><strong>COLLECTION & PACKS</strong><small>Earn Credits. Expand your Arsenal. Master your favorites.</small></span><b>→</b></a><a class="home-command" href="simulator.html" data-game-navigation="warroom"><span><strong>WAR ROOM</strong><small>Test decks, compare matchups and run tournaments.</small></span><b>→</b></a><button class="home-command" data-action="settings"><span><strong>SETTINGS</strong><small>Learning, display, interface and audio.</small></span><b>→</b></button><div class="home-secondary"><button class="btn quiet" data-action="rules">Field manual</button><button class="btn quiet" data-action="recent-matches">Match history</button>'+(window.FrontlinesDesktop?'<button class="btn quiet" data-shell-action="quit">Quit</button>':'')+'</div><span class="home-version" data-game-version>Frontlines '+esc(runtimeLabel())+' · F11 FULLSCREEN</span></nav></main>';
  }
  function art(card) {
    const glyph=window.FrontlinesArt?.symbol(card);if(glyph)return glyph;
    if (card.type === 'leader') return symbol(card.faction);
    if (card.type === 'order') return '<svg viewBox="0 0 80 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="40" cy="24" r="15"/><circle cx="40" cy="24" r="7"/><path d="M40 3v12m0 18v12M17 24h15m16 0h15M26 10l6 6m16 16 6 6M26 38l6-6m16-16 6-6"/></svg>';
    if (card.type === 'asset') return '<svg viewBox="0 0 80 48" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M17 38h46M23 37V23h34v14M29 23V12h22v11M40 12V3M35 6h10M28 29h7v8m10-8h7v8"/><path d="M15 16 9 10m56 6 6-6M18 8l-2-5m46 5 2-5"/></svg>';
    if (/heavy|escort|armored/i.test(card.name)) return '<svg viewBox="0 0 80 48" fill="currentColor" aria-hidden="true"><path d="M19 23h39l8 11H11Zm11-9h19l5 9H24Zm19 2h24v4H49Z"/><rect x="10" y="35" width="58" height="9" rx="4"/><g fill="#18232a"><circle cx="19" cy="39.5" r="2.5"/><circle cx="32" cy="39.5" r="2.5"/><circle cx="45" cy="39.5" r="2.5"/><circle cx="59" cy="39.5" r="2.5"/></g></svg>';
    return '<svg viewBox="0 0 80 48" fill="currentColor" aria-hidden="true"><path d="M34 7h10l3 6-2 7H33l-2-7Zm-5 16 11-3 12 4 5 14-7 2-4-10-2 8 6 9H39l-2-7-3 7H23l8-13-2-3-4 8-7-3Z"/><path d="m39 27 29-9 2 4-28 11Z"/></svg>';
  }
  function header() {
    const match=currentScreen==='match' && state;
    return '<header class="app-header"><div class="brand-icon">'+brandSymbol()+'</div><div class="brand">FRONTLINES<small>PROJECT FACTION</small></div><span class="spacer"></span><span class="session-label">'+esc(runtimeLabel())+'</span><nav class="header-actions" aria-label="Operation tools">'+(currentScreen!=='home'?'<button class="btn quiet" '+(networkMatch?'data-mp="leave"':'data-action="home"')+'>Command menu</button>':'')+(match?'<button class="btn quiet" data-action="log">Match log</button>'+(networkMatch?'<button class="btn quiet" data-mp="concede" '+(state.winner!==null?'disabled':'')+'>Concede match</button>':'<button class="btn quiet" data-action="new-match">New match</button>'):'')+(currentScreen!=='home'?'<button class="btn quiet" data-action="settings">Settings</button>':'')+(match&&settings.developer&&!networkMatch?'<button class="btn quiet" data-action="dev">Dev</button>':'')+'</nav></header>';
  }
  function commanderBrief(cmd) {
    if(!cmd)return '<p>No Commander assigned.</p>';
    return '<div class="commander-brief faction-'+cmd.faction+'" style="'+factionStyle(cmd.faction)+'">'+(window.FrontlinesArt?.commanderHtml?.(cmd)||'')+'<span class="eyebrow">'+esc(D.FACTIONS[cmd.faction].name)+' / COMMANDER · OUTSIDE THE DECK</span><h2>'+esc(cmd.name)+'</h2><p class="commander-role">'+esc(cmd.role)+'</p><h3>Passive · '+esc(cmd.passive.name)+'</h3><p>'+esc(cmd.passive.text)+'</p><h3>Active · '+esc(cmd.active.name)+'</h3><p>'+esc(cmd.active.text)+'</p><p class="commander-cost">'+esc(costText(cmd.active.cost))+' · ONCE PER MATCH</p><h3>Deckbuilding · '+esc(cmd.hook.name)+'</h3><p>'+esc(cmd.hook.text)+'</p><p class="muted">Commanders lead from outside the lanes. They consume no card slot or committed Presence, cannot be targeted, and never die or retreat. Your deployable Leader cards remain separate units.</p></div>';
  }
  function commanderChoice(player,deck) {
    if(!Commanders)return '';
    const cmd=Commanders.get(deck.commanderId);
    return '<div class="setup-commander"><label class="tag" for="commander-'+player+'">Choose Commander</label><select id="commander-'+player+'" data-setting="commanderId" data-player="'+player+'">'+(!cmd?'<option value="'+esc(deck.commanderId||'')+'">Unavailable Commander</option>':'')+Commanders.list(deck.faction).map(c=>'<option value="'+c.id+'" '+(c.id===deck.commanderId?'selected':'')+'>'+esc(c.name)+' · '+esc(c.role)+'</option>').join('')+'</select>'+(cmd?'<p><b>'+esc(cmd.passive.name)+'</b> · '+esc(cmd.passive.text)+'</p><p><b>'+esc(cmd.active.name)+'</b> · '+esc(cmd.active.text)+'</p><p class="setup-commander-hook">'+esc(cmd.hook.text)+'</p>':'<p>Choose one faction Commander to make this deck playable.</p>')+'</div>';
  }
  function commanderPanel(player) {
    const status=E.commanderStatus?.(state,player),cmd=Commanders?.get(status?.id||state.players[player].commander?.id);if(!cmd)return '';
    const owned=actor()===player,usable=controllable()&&owned&&legal.some(a=>a.type==='commander');
    const reason=status.used?'Active spent for this match':!owned?'Available on this commander’s offensive turn':!controllable()?'Wait for the current phase':!usable&&tutorialInMatch&&tutorial?.isGuided()?'Follow the highlighted lesson objective':status.reason||'Choose this ability, then its highlighted target.';
    const kind=status.used?'spent':!owned||!controllable()?'inactive':E.presence(state,player).available<status.cost.presence?'unaffordable':state.actionsLeft<status.cost.commandActions?'no-command':usable?'ready':'no-target';
    const labels={ready:'READY',spent:'SPENT','no-target':'NO VALID TARGET',unaffordable:'UNAFFORDABLE',inactive:'WAIT TURN','no-command':'NO COMMAND ACTION'};
    return '<section class="commander-panel faction-'+cmd.faction+(status.used?' commander-spent':'')+'" style="'+factionStyle(cmd.faction)+'" data-commander-state="'+kind+'" data-commander-player="'+player+'" aria-label="Player '+(player+1)+' Commander '+esc(cmd.name)+'"><button class="commander-portrait-button" data-action="commander-inspect" data-player="'+player+'" aria-label="Inspect '+esc(cmd.name)+'">'+(window.FrontlinesArt?.commanderHtml?.(cmd)||symbol(cmd.faction))+'</button><div class="commander-summary"><span class="commander-label">P'+(player+1)+' / '+esc(cmd.role)+'</span><b class="commander-name">'+esc(cmd.name)+'</b><p class="commander-passive"><strong>'+esc(cmd.passive.name)+'</strong> · '+esc(cmd.passive.text)+'</p></div><div class="commander-command"><button class="btn commander-active '+(usable?'primary':'quiet')+'" data-action="commander" data-player="'+player+'" '+(!usable?'disabled':'')+' aria-label="'+esc(labels[kind]+' · '+cmd.active.name+' · '+costText(status.cost)+' · '+reason)+'"><span class="commander-state">'+labels[kind]+'</span><b>'+esc(cmd.active.name)+'</b><small>'+status.cost.presence+' P · '+status.cost.commandActions+' ACTION · '+(status.used?'USED':'ONCE')+'</small></button><span class="commander-availability" role="status">'+esc(reason)+'</span></div></section>';
  }
  function commanderRow(){return '<div class="commander-row">'+seatOrder().map(commanderPanel).join('')+'</div>';}
  function chooseCommander(player){
    const status=E.commanderStatus?.(state,player);if(!status)return;
    inspected={kind:'commander',uid:String(player)};
    if(!controllable()||player!==actor()){render();return;}
    const actions=legal.filter(a=>a.type==='commander');if(!actions.length){notify(status.reason||'Commander ability is unavailable during this phase.',true);render();return;}
    const direct=actions.find(a=>!a.targetUid&&a.territory===undefined);if(direct){dispatch(direct);return;}
    selection=selection?.kind==='commander'?null:{kind:'commander',uid:status.id};render();
  }
  function randomOpponentMarkup(player){
    return player===1&&window.FrontlinesPlaytestOpponents?'<div class="random-opponent-controls"><button class="btn quiet" data-action="random-enemy">Random enemy</button><button class="btn quiet" data-action="random-enemy-deck">Random deck</button><label class="check-label"><input type="checkbox" data-setting="avoidLastOpponent" '+(settings.avoidLastOpponent?'checked':'')+'>Avoid last opponent</label></div>':'';
  }
  function randomOpponent(deckOnly){
    if(!Decks||!Commanders)return;
    try{
      const seed=window.crypto?.getRandomValues?window.crypto.getRandomValues(new Uint32Array(1))[0]:Math.floor(Math.random()*4294967296),deck=chosenDeck(1);
      const choice=window.FrontlinesPlaytestOpponents.choose(Decks,Commanders,{seed,avoidKey:settings.avoidLastOpponent?settings.lastOpponent:undefined,...(deckOnly?{faction:settings.factions[1],commanderId:deck.commanderId}:{})});
      settings.factions[1]=choice.faction;settings.deckIds[1]=choice.deckId;settings.commanderIds[1]=choice.commanderId;settings.mode='ai';saveSettings();render();notify('Enemy: '+choice.deckName+' / '+Commanders.get(choice.commanderId).name);
    }catch(error){notify(error.message,true);}
  }
  function factionChoice(player) {
    const f = D.FACTIONS[settings.factions[player]];
    const deck=chosenDeck(player),composition=Decks?.composition(deck),validation=Decks?.validate(deck)||{legal:true,errors:[]},ownership=ownershipFor(deck,player);
    return '<section class="faction-choice p'+(player+1)+' faction-'+f.id+'" style="'+factionStyle(f.id)+'"><div class="choice-heading"><span class="player-name">0'+(player+1)+' / '+(player?'OPPOSING FORCE':'YOUR FORCE')+'</span><button class="btn quiet compact" data-action="deck" data-player="'+player+'">Inspect deck ↗</button></div><label class="tag" for="faction-'+player+'">Choose faction</label><select id="faction-'+player+'" data-setting="faction" data-player="'+player+'">'+Object.values(D.FACTIONS).map(x=>'<option value="'+x.id+'" '+(x.id===f.id?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select><div class="setup-deck-picker">'+commanderChoice(player,deck)+'<label class="tag" for="deck-'+player+'">Choose deck</label><select id="deck-'+player+'" data-setting="deckId" data-player="'+player+'">'+availableDecks(player).map(d=>'<option value="'+esc(d.id)+'" '+(d.id===deck.id?'selected':'')+'>'+esc(d.name)+(d.source==='saved'&&!Decks.validate(d).legal?' · DRAFT':'')+'</option>').join('')+'</select><div class="setup-deck-summary '+(!validation.legal?'invalid':'')+'">'+deck.cards.length+'/'+(Decks?.RULES.size||26)+' CARDS'+(composition?' · '+composition.averageCost.toFixed(1)+' AVG P · '+(composition.units+composition.leaders)+' UNITS':'')+'<span>'+esc(validation.legal?deck.archetype?.replace(/-/g,' ')||'CUSTOM DECK':validation.errors.join(' '))+'</span><span class="setup-ownership '+(!ownership.complete?'invalid':'')+'">'+esc(ownershipText(ownership))+'</span></div><a class="setup-deck-edit" href="deck-builder.html?faction='+f.id+'&deck='+encodeURIComponent(deck.id)+'">Build your version →</a></div><p class="faction-description">'+esc(f.description)+'</p><span class="faction-tagline">'+esc(f.tagline)+'</span>'+randomOpponentMarkup(player)+'<div class="choice-symbol">'+symbol(f.id)+'</div></section>';
  }
  function setupView() {
    return '<main class="setup command-screen"><div class="briefing-top"><div><span class="eyebrow">PLAY / OPERATION SETUP</span><h1>TAKE GROUND.<br><span class="accent">HOLD THE LINE.</span></h1><p class="setup-intro">Commit your forces. Read your opponent. Push across a shifting battlefield. <strong>Presence takes territory. Territory wins wars.</strong></p></div><aside class="operation-stamp"><span class="eyebrow">OPERATION: FRONTLINES</span><strong>07 SECTORS</strong><p>02 COMMANDERS<br>01 CONTINUOUS FRONT<br>NO GROUND GIVEN FREELY</p></aside></div><div class="preview-map" aria-label="Seven territories: three blue, one neutral, three red">'+Array.from({length:7},(_,i)=>'<div class="preview-zone '+(i===3?'center':i>3?'enemy':'')+'"><span>'+String(i+1).padStart(2,'0')+' '+(i===3?'CONTACT':i===0||i===6?'HOME':'SECTOR')+'</span></div>').join('')+'</div><div class="map-caption"><span>WESTERN COMMAND →</span><span>← EASTERN COMMAND</span></div><div class="setup-controls">'+factionChoice(0)+factionChoice(1)+'<section class="launch-panel"><div><label for="mode">MATCH TYPE</label><select id="mode" data-setting="mode"><option value="hotseat" '+(settings.mode==='hotseat'?'selected':'')+'>Local hot-seat · 2 players</option><option value="ai" '+(settings.mode==='ai'?'selected':'')+'>Solo · deck-aware AI opponent</option></select></div>'+difficultyMarkup()+'<label class="check-label"><input type="checkbox" data-setting="developer" '+(settings.developer?'checked':'')+'>Developer tools</label><button class="btn primary" data-action="start" '+(!legalSetupDecks()?'disabled':'')+'>Deploy to front <span>→</span></button></section></div><div class="setup-footer"><p>OFFLINE READY / NO ACCOUNT REQUIRED<br>'+settings.config.startingCommand+' STARTING COMMAND · '+settings.config.actionLimit+' COMMAND ACTIONS · '+settings.config.captureThreshold+' CAPTURE THRESHOLD</p><button class="btn quiet" data-action="config">Balance configuration</button></div><div class="setup-principles"><p><b><span>01</span>Commit Presence</b>Deployed cards keep part of your Command occupied. Orders spend it until your next turn.</p><p><b><span>02</span>Fight for position</b>Advance one territory at a time. Expect responses, interceptions, and persistent wounds.</p><p><b><span>03</span>Push the frontline</b>End your turn on the objective to build capture progress. Seize the enemy home to win.</p></div></main>';
  }
  function hud(requestedPlayer) {
    const player=networkMatch?(requestedPlayer===0?localSeat():1-localSeat()):requestedPlayer;
    const p=state.players[player], f=faction(player), econ=E.presence(state,player), count=E.controlledCount(state,player);
    const nextCommand=Math.min(state.config.commandCap,econ.command+(p.turns?state.config.commandGrowth:0));
    const role=state.winner!=null?'OPERATIONS COMPLETE':state.response?actor()===player?(state.response.stage==='counter'?'COUNTER WINDOW':'RESPONSE WINDOW'):state.attacker===player?'ATTACKER · AWAITING RESPONSE':'DEFENDER':state.attacker===player?'ATTACK PHASE · YOUR INITIATIVE':'AWAITING INITIATIVE';
    const resources=[['TOTAL CAPACITY','command',econ.command,'Command is your total supported Presence capacity.'],['COMMITTED','committed',econ.committed,'Presence supporting surviving battlefield forces. Destroyed or recalled cards free this commitment.'],['SPENT','spent',econ.spent,'Presence spent on Orders. This refreshes at your next offensive turn.'],['AVAILABLE','available',econ.available,'Presence available for new cards: capacity minus committed minus spent.']];
    return '<section class="player-hud p'+(player+1)+' faction-'+f.id+(actor()===player?' is-actor':'')+'" data-player="'+player+'" style="'+factionStyle(f.id)+'" aria-label="Player '+(player+1)+' Presence"><div class="hud-identity"><b class="hud-player-badge allegiance p'+(player+1)+'">P'+(player+1)+'</b><div class="hud-emblem">'+symbol(f.id)+'</div><div><div class="hud-name">'+esc(f.name)+'</div><div class="hud-role">P'+(player+1)+' / '+role+'</div></div></div><div class="hud-resources">'+resources.map(([label,key,n,hint])=>'<div class="resource '+(key==='available'?'available':'')+'"'+tooltip(hint)+'><strong data-resource="'+key+'" data-resource-player="'+player+'" data-resource-key="'+key+'">'+n+'</strong><span>'+label+'</span></div>').join('')+'</div><div class="presence-capacity" role="img" aria-label="'+econ.committed+' committed, '+econ.spent+' spent, '+econ.available+' available of '+econ.command+' Presence"><i class="capacity-committed" style="width:'+(econ.committed/econ.command*100)+'%"></i><i class="capacity-spent" style="width:'+(econ.spent/econ.command*100)+'%"></i><i class="capacity-available" style="width:'+(econ.available/econ.command*100)+'%"></i></div><div class="hud-meta"><span'+tooltip('Territories owned. Taking the enemy home immediately secures victory.')+'>TERRITORY <b>'+count+'/7</b></span><span>HAND <b>'+p.hand.length+'</b></span><span>RESERVES <b>'+p.deck.length+'</b></span><span>CASUALTIES <b>'+p.discard.length+'</b></span><span class="next-presence"'+tooltip('Next offensive turn: capacity grows by '+(nextCommand-econ.command)+', Orders refresh and units ready. Committed Presence remains deployed.')+'>NEXT TURN <b>'+nextCommand+' CAP / +'+(nextCommand-econ.command)+'</b></span></div>'+(count>=5||state.contested===(player===0?6:0)?'<div class="conquest-warning">'+(state.winner===player?'◆ TERRITORY SECURED':'◆ ENEMY COMMAND WITHIN REACH')+'</div>':'')+'</section>';
  }
  function selectedActions() {
    if (!selection) return [];
    if(selection.kind==='commander'){const actions=legal.filter(a=>a.type==='commander');return selection.targetUid?actions.filter(a=>a.targetUid===selection.targetUid):actions.map(a=>a.territory!==undefined&&a.targetUid?{...a,territory:undefined}:a);}
    let actions=legal.filter(a=>selection.kind==='hand'?a.handUid===selection.uid&&(!a.mode||a.mode===selection.mode):selection.kind==='ability'?a.type==='ability'&&a.unitUid===selection.uid&&a.abilityId===selection.abilityId:(a.unitUid===selection.uid||a.guardUid===selection.uid));
    if(selection.kind==='unit')actions=actions.filter(a=>a.type!=='ability'&&a.type!=='overwatch');
    if(actions.some(a=>a.sacrificeUid)){
      if(selection.sacrificeUid)actions=actions.filter(a=>a.sacrificeUid===selection.sacrificeUid);
      else return actions.map(a=>({...a,targetUid:a.sacrificeUid,territory:undefined,sacrificeChoice:true}));
    }
    return actions;
  }
  function keywords(c){const extra=[];if(['salvageBlast','sacrificeRepair','badPlan'].includes(c.effect?.kind))extra.push('sacrifice');if(['interlockingFire','holdFast','contingency','badPlan'].includes(c.effect?.kind))extra.push('cover');if(c.effect?.kind==='assault')extra.push('exposed');return [...new Set([...(c.traits||[]),...(c.keywords||[]),...extra,...(c.tags||[]).filter(t=>['cover','dodge','suppression','overwatch','exposed','blast','smoke','breach','sacrifice'].includes(t)),...(['mark','reinforce','adapt','sabotage','scavenge','cover','dodge','suppression','overwatch','exposed','blast','smoke','sacrifice'].includes(c.effect?.kind)?[c.effect.kind]:[])])];}
  function tacticalStatuses(unit){return E.statusDetails?E.statusDetails(state,unit):[];}
  function temporaryState(unit){return [unit.marked?'MARKED +1 DAMAGE':'',unit.reinforced?'REINFORCED · ARMOR 1':'',unit.suppressed?'SABOTAGED':'',...tacticalStatuses(unit).map(s=>s.label+' · '+s.duration)].filter(Boolean).join(' / ');}
  function tacticalStatusMarkup(unit,detail){
    const icons={cover:'▰',dodge:'↝',suppression:'↓',overwatch:'⌖',exposed:'!',smoke:'≋'};
    return tacticalStatuses(unit).map(s=>'<span class="tactical-status status-'+esc(s.kind)+'" data-status="'+esc(s.kind)+'"'+tooltip(s.text+' '+s.duration)+'><b aria-hidden="true">'+(icons[s.kind]||'◆')+'</b>'+esc(s.label)+(detail?'<small>'+esc(s.duration)+'</small>':'')+'</span>').join('');
  }
  function isAreaAction(action){const c=action?.handUid?cardDef(handItem(action.handUid)):action?.unitUid?cardDef(findUnit(action.unitUid)):null,effect=action?.type==='ability'?c?.tactical?.ability?.effect:E.resolveEffect?.(c,action);return ['blast','salvageBlast'].includes(effect?.kind);}
  function previewAction(action){if(!E.actionPreview)return null;const key=JSON.stringify(action);if(!actionPreviewCache.has(key))actionPreviewCache.set(key,E.actionPreview(state,action));return actionPreviewCache.get(key);}
  function statusLabel(kind){return String(kind||'status').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/\b\w/g,c=>c.toUpperCase());}
  function previewStatusNotes(preview){
    if(!preview)return [];
    const notes=[];
    for(const [key,label] of [['statusesConsumed','consumed by this hit'],['statusesRemoved','removed / bypassed']]){
      for(const id of preview[key]||[]){const status=(state.effects||[]).find(s=>s.id===id);if(status)notes.push(statusLabel(status.kind)+' '+label);}
    }
    for(const s of preview.statusesApplied||[]){const target=findUnit(s.targetUid);notes.push(statusLabel(s.kind)+' applied'+(target?' to '+cardDef(target).name:''));}
    if(preview.ignoresCover)notes.push('Cover is bypassed');
    if(preview.ignoresDodge)notes.push('Dodge is bypassed');
    return [...new Set(notes)];
  }
  function unitTacticAvailability(unit,type){
    const definition=cardDef(unit),ability=definition.tactical?.ability;
    const action={type,unitUid:unit.uid,...(type==='ability'?{abilityId:ability?.id}:{})};
    const choices=legal.filter(a=>a.type===type&&a.unitUid===unit.uid);
    if(choices.length)return type==='overwatch'?'Ready: exhaust to watch the first voluntary enemy entry here.':'Ready: choose one of '+choices.length+' legal target'+(choices.length===1?'':'s')+'.';
    if(tutorialInMatch&&tutorial?.isGuided()&&!E.validate(state,action))return 'Guided lesson: follow the highlighted objective.';
    const reason=E.validate(state,action);
    return reason||'No legal targets for this action in the current window.';
  }
  function unitTacticAvailabilityMarkup(unit){
    const definition=cardDef(unit),rows=[];
    if(definition.tactical?.ability)rows.push([definition.tactical.ability.name,unitTacticAvailability(unit,'ability')]);
    if(definition.tactical?.overwatch&&!definition.tactical.overwatch.automatic)rows.push(['Overwatch',unitTacticAvailability(unit,'overwatch')]);
    return rows.length?'<div class="inspect-command-availability">'+rows.map(([name,text])=>'<p><b>'+esc(name)+'</b> · '+esc(text)+'</p>').join('')+'</div>':'';
  }
  function selectedTargetPreview(unit){
    if(!unit||!selection)return '';
    const action=selectedActions().find(a=>!a.sacrificeChoice&&['ability','order','commander','move'].includes(a.type)&&(a.targetUid===unit.uid||a.territory===unit.territory&&isAreaAction(a)));
    return action?tacticalPreviewMarkup(action):'';
  }
  function executeAction(action){
    if(!action||!controllable())return;
    if(action.sacrificeUid){openModal({type:'sacrifice',action:{...action}});return;}
    dispatch(action);
  }
  function sacrificeMarkup(action){
    const unit=findUnit(action.sacrificeUid),target=findUnit(action.targetUid),cost=costOf(action);
    if(!unit)return modalShell('Sacrifice unavailable','<p>The selected piece is no longer on the battlefield.</p>','<button class="btn primary" data-action="close-modal">Return to battlefield</button>');
    const destination=target?cardDef(target).name:action.territory!==undefined?state.territories[action.territory].name:'this effect';
    return modalShell('YOU ARE DESTROYING YOUR OWN UNIT','<p class="sacrifice-warning"><b>'+esc(cardDef(unit).name)+'</b> will be voluntarily destroyed to pay this cost. This cannot be undone.</p><p>Payoff: '+esc(destination)+'. '+esc(costText(cost))+'. Committed Presence is released. Sacrifice grants no ordinary Scavenge or Nothing Wasted casualty draw.</p>'+tacticalPreviewMarkup(action),'<button class="btn quiet" data-action="close-modal">Keep this unit</button><button class="btn danger" data-action="confirm-sacrifice">Confirm sacrifice</button>',true);
  }
  function tacticalPreviewMarkup(action){
    const preview=previewAction(action),notes=previewStatusNotes(preview);if(!preview||!preview.affected?.length&&!notes.length)return '';
    return '<div class="tactical-preview"><b>'+esc(preview.label||'TACTICAL PREVIEW')+'</b><span>'+esc(preview.text||'')+'</span><ul>'+(preview.affected||[]).map(hit=>{const u=findUnit(hit.uid);return '<li>'+esc(u?cardDef(u).name:'Target')+' · '+(hit.uid===action.sacrificeUid?'SACRIFICED AS COST':hit.healed?'Heal '+hit.healed+' → '+hit.healthAfter+' HP':Number.isFinite(hit.damage)?hit.damage+' damage'+(Number.isFinite(hit.healthAfter)?' → '+hit.healthAfter+' HP':''):'affected')+(hit.cover?' · '+esc(hit.cover):'')+'</li>';}).join('')+notes.map(text=>'<li class="preview-status-note">'+esc(text)+'</li>').join('')+'</ul><small>Preview uses the current battlefield. Combat Responses can change the outcome.</small></div>';
  }
  function unitMarkup(unit, targetActions) {
    const c=cardDef(unit), valid=targetActions.some(a=>a.targetUid===unit.uid||a.guardUid===unit.uid), selected=selection&&selection.kind==='unit'&&selection.uid===unit.uid;
    const attackTarget=targetActions.some(a=>a.type==='attack'&&a.targetUid===unit.uid), hp=c.health-unit.damage;
    const targetState=valid?'legal':selection||state.response?'invalid':'idle';
    const area=selectedActions().filter(a=>a.territory===unit.territory&&isAreaAction(a)).map(previewAction).filter(Boolean).flatMap(p=>p.affected||[]).find(hit=>hit.uid===unit.uid);
    return '<button class="unit p'+(unit.owner+1)+' faction-'+c.faction+(unit.ready?'':' exhausted')+(unit.damage?' wounded':'')+(unit.suppressed?' sabotaged':'')+(unit.marked?' marked':'')+(unit.reinforced?' reinforced':'')+(selected?' selected':'')+(valid?' valid-target':'')+(attackTarget?' enemy-target':'')+(area?' blast-affected':'')+' '+skin(c).className+'" style="'+factionStyle(c.faction)+skin(c).style+'" data-target-state="'+targetState+'" '+(area?'data-blast-damage="'+esc(area.damage)+'" ':'')+(targetState==='invalid'?'aria-disabled="true"':'')+' data-action="unit" data-uid="'+esc(unit.uid)+'" data-inspect="unit" data-inspect-id="'+esc(unit.uid)+'" aria-label="'+esc(c.name+' · Player '+(unit.owner+1)+' · Presence '+c.presence+' · Attack '+E.attackValue(state,unit)+' · Health '+hp+'/'+c.health+(unit.ready?' · Ready':' · Exhausted')+(temporaryState(unit)?' · '+temporaryState(unit):''))+'" title="'+esc(c.name+' · P'+(unit.owner+1)+' · '+(unit.ready?'Ready':'Exhausted'))+'"><span class="unit-art">'+portrait(c)+'</span><span class="unit-info"><span class="unit-name">'+esc(c.name)+'</span><span class="unit-stats"><span title="Presence">'+c.presence+' P</span><span title="Attack">'+E.attackValue(state,unit)+' ⚔</span><span class="hp '+(unit.damage?'damaged':'')+'" title="Remaining Health">'+hp+' ♥</span></span></span><b class="unit-allegiance allegiance p'+(unit.owner+1)+'">P'+(unit.owner+1)+'</b><span class="unit-readiness" aria-hidden="true"></span>'+(unit.marked||unit.reinforced||unit.suppressed?'<span class="unit-status" title="'+esc(temporaryState(unit)+' — expires at this unit’s next offensive turn.')+'">'+(unit.marked?'MARKED':unit.reinforced?'ARMOR':'JAMMED')+'</span>':'')+'<span class="unit-tactical-statuses">'+tacticalStatusMarkup(unit,false)+'</span>'+(area?'<span class="blast-preview-number">'+esc(area.damage)+' DMG</span>':'')+'<span class="unit-health-line" style="width:'+(hp/c.health*100)+'%"></span></button>';
  }
  function pressureMarkup(territory) {
    const strength=[0,1].map(p=>E.capturePressure(state,p).total);
    const total=strength[0]+strength[1], pct=total?strength[0]/total*100:50, limit=state.config.captureThreshold;
    const forecasts=[0,1].map(p=>territory.progress[p]+strength[p]);
    const text=p=>forecasts[p]>=limit&&strength[p]?'CAPTURE ON WINDOW END':strength[p]?'+'+strength[p]+' ON WINDOW END':'NO FIELD PRESENCE';
    return '<div class="lane-pressure"'+tooltip('Each side adds surviving Presence to capture progress at the end of its offensive turn. Enemies do not subtract from progress. Forecasts assume current forces survive.')+'><div class="pressure-title"><span>FRONTLINE PRESSURE</span><b>'+(total?(strength[0]===strength[1]?'EVEN':esc(faction(strength[0]>strength[1]?0:1).name).toUpperCase()+' PUSHING'):'AWAITING FORCES')+'</b></div><div class="pressure-track"><span style="width:'+pct+'%"></span><i style="left:'+pct+'%"></i></div><div class="capture-forecast">'+[0,1].map(p=>'<div class="forecast p'+(p+1)+(forecasts[p]>=limit&&strength[p]?' capture-imminent':'')+'"><span>P'+(p+1)+' · '+territory.progress[p]+'/'+limit+'</span><b>'+text(p)+'</b></div>').join('')+'</div></div>';
  }
  function territoryMarkup(territory, targetActions) {
    const target=targetActions.find(a=>a.territory===territory.id), areaPreview=target&&isAreaAction(target)&&previewAction(target), smoke=E.statusDetails?E.statusDetails(state,territory.id).filter(s=>s.kind==='smoke'):[], isFront=territory.id===state.contested, owner=territory.owner==null?null:faction(territory.owner);
    const targetState=target||targetActions.some(a=>a.targetUid&&findUnit(a.targetUid)?.territory===territory.id||a.guardUid&&findUnit(a.guardUid)?.territory===territory.id)?'legal':selection||state.response?'invalid':'idle';
    const roster=requestedPlayer=>{
      const player=networkMatch?(requestedPlayer===1?1-localSeat():localSeat()):requestedPlayer;
      const units=E.unitsAt(state,territory.id,player);
      return '<div class="roster-label p'+(player+1)+'"><b>P'+(player+1)+' FORCE</b><span>'+units.length+'/'+state.config.slotsPerTerritory+'</span></div><div class="zone-roster p'+(player+1)+'" style="--roster-slots:'+state.config.slotsPerTerritory+'">'+(units.length?units.map(u=>unitMarkup(u,targetActions)).join(''):'<div class="empty-ground" aria-label="No player '+(player+1)+' units"><span>'+symbol(faction(player).id)+'</span><small>P'+(player+1)+' / OPEN GROUND</small></div>')+'</div><div class="slot-meter p'+(player+1)+'" title="'+units.length+' / '+state.config.slotsPerTerritory+' slots used by Player '+(player+1)+'">'+Array.from({length:state.config.slotsPerTerritory},(_,i)=>'<i class="'+(i<units.length?'filled':'')+'"></i>').join('')+'</div>';
    };
    return '<section class="territory owner-'+territory.owner+(owner?' faction-'+owner.id:'')+(isFront?' contested':'')+(target?' legal-zone':'')+(capturedZone===territory.id?' captured':'')+(smoke.length?' tactical-smoke':'')+'" style="--zone-color:'+(owner?owner.color:'#958b74')+';--terrain-position:'+(territory.id/6*100)+'% 50%" data-target-state="'+targetState+'" data-action="territory" data-territory="'+territory.id+'" data-target-label="'+(target?.type==='move'?'MOVE':target?.type==='order'||target?.type==='ability'?'TACTIC':'DEPLOY')+'" aria-label="'+esc(territory.name)+' · '+(owner?esc(owner.name)+' territory':'Neutral territory')+(isFront?' · contested objective':'')+(smoke.length?' · '+smoke.map(s=>s.label+' '+s.duration).join(' / '):'')+(areaPreview?' · '+(areaPreview.text||'Area targets '+areaPreview.affected?.length+' enemies; Cover and Dodge bypassed.'):'')+'" '+(target?'tabindex="0" role="button"':'')+'><div class="terrain-lines" aria-hidden="true"></div><div class="territory-header"><div class="zone-code"><span>SECTOR 0'+(territory.id+1)+'</span><span class="home-label">'+(territory.id===0?'P1 HOME':territory.id===6?'P2 HOME':'')+'</span></div><h3>'+esc(territory.name)+'</h3><div class="zone-banner">'+(owner?'<b class="allegiance p'+(territory.owner+1)+'">P'+(territory.owner+1)+'</b>'+symbol(owner.id)+'<span>'+esc(owner.name)+'</span>':'<span>◇ NEUTRAL GROUND</span>')+'</div></div>'+(smoke.length?'<span class="territory-status"'+tooltip(smoke.map(s=>s.text+' '+s.duration).join(' '))+'>≋ SMOKE</span>':'')+(areaPreview?.affected?.length?'<span class="territory-blast-preview"'+tooltip(areaPreview.text||'Blast ignores Cover and Dodge; targets use stable battlefield order.')+'>'+esc(areaPreview.label||'BLAST')+' · '+areaPreview.affected.length+' TARGETS</span>':'')+roster(1)+'<div class="ground-line">'+(isFront?'◆ CURRENT OBJECTIVE':owner?'P'+(territory.owner+1)+' CONTROLLED':'UNCLAIMED')+'</div>'+roster(0)+'<div class="zone-progress">'+(isFront?pressureMarkup(territory):'<div class="zone-idle">'+(territory.id<state.contested?'→':'←')+' '+(territory.id===0||territory.id===6?'COMMAND TERRITORY':'CONNECTED GROUND')+'</div>')+'</div></section>';
  }
  function handCardMarkup(item, owner, deckView) {
    const c=cardDef(item),cost=deckView?{presence:c.presence,commandActions:cardCost(c)}:handCost(item,selection?.uid===item.uid?selection.mode:undefined);
    const affordable=deckView||cost.presence<=E.presence(state,owner).available,playable=!deckView&&controllable()&&owner===actor()&&legal.some(a=>a.handUid===item.uid),selected=selection&&selection.kind==='hand'&&selection.uid===item.uid;
    const reason=deckView?'':playable?'':owner!==actor()||!controllable()?'Wait for your turn or response window.':unavailableReason(c,item),kind=deckView?'inspect':playable?'playable':'unplayable',wounds=deckView?0:item.damage||0;
    return '<button class="hand-card faction-'+c.faction+(!affordable?' unavailable':'')+(!playable&&!deckView?' window-locked':'')+(selected?' selected':'')+(wounds?' wounded damaged':'')+' '+skin(c).className+'" style="'+factionStyle(c.faction)+skin(c).style+'" data-card-state="'+kind+'" data-retained-damage="'+wounds+'" data-unavailable-reason="'+esc(reason)+'" '+(!deckView&&!playable?'aria-disabled="true"':'')+' title="'+esc(reason||'Select '+c.name)+'" data-action="'+(deckView?'inspect-card':'hand')+'" data-uid="'+esc(deckView?c.id:item.uid)+'" data-player="'+owner+'" data-inspect="'+(deckView?'card':'hand')+'" data-inspect-id="'+esc(deckView?c.id:item.uid)+'" aria-label="'+esc(c.name+', Presence '+c.presence+', '+c.type+'. '+c.rulesText+(wounds?' Retained wounds: '+wounds+'.':'')+(reason?' '+reason:''))+'"><div class="card-top"><span class="card-type">'+(c.unique?'UNIQUE ':'')+esc(c.type==='leader'?'Field Leader':c.type==='unit'&&window.FrontlinesArt?window.FrontlinesArt.role(c):c.type)+'</span><span class="card-cost"><small>P</small>'+cost.presence+'</span></div><div class="card-art">'+portrait(c)+'</div><div class="command-price '+(cost.commandActions?'major':'')+'">'+cost.commandActions+' COMMAND ACTION'+(cost.commandActions===1?'':'S')+'</div><div class="card-name">'+esc(c.name)+'</div><div class="card-faction">'+symbol(c.faction)+'<span>'+esc(D.FACTIONS[c.faction].name)+(deckView&&item.count?' · '+item.count+' COPIES':'')+'</span>'+ (window.FrontlinesPresentation?.badge(c)||'')+'</div><div class="card-rules">'+esc(c.rulesText)+'</div><div class="card-stats">'+(c.type==='order'?'<span class="trait-label">'+esc(c.timing||'action')+' ORDER</span>':'<span><small>ATK</small>'+c.attack+'</span><span class="card-health '+(wounds?'damaged':'')+'"><small>HP</small>'+(c.health-wounds)+(wounds?'/'+c.health:'')+'</span>')+'<span class="card-ready">'+(deckView?'':wounds?'WOUNDED':playable?'READY':'INSPECT')+'</span></div></button>';
  }
  function inspectorMarkup() {
    if (privacy || !inspected) return '<aside class="inspector inspector-empty">'+brandSymbol()+'<span class="inspect-prompt">Know your commitment.</span><p>Select a card to deploy it. Select your unit to move or attack. Hover or focus any card for a full briefing.</p><div class="inspect-status">P = deployment + field + capture</div></aside>';
    if(inspected.kind==='commander')return '<aside class="inspector commander-inspector">'+commanderBrief(Commanders?.get(state?.players[Number(inspected.uid)]?.commander?.id))+'</aside>';
    const instance = inspected.kind==='unit'?findUnit(inspected.uid):inspected.kind==='hand'?handItem(inspected.uid):D.CARDS[inspected.uid];
    if (!instance) { inspected = null; return inspectorMarkup(); }
    const c = cardDef(instance), unit = inspected.kind==='unit'?instance:null, wounds=unit?.damage||(inspected.kind==='hand'?instance.damage||0:0);
    return '<aside class="inspector faction-'+c.faction+' '+skin(c).className+'" style="'+factionStyle(c.faction)+skin(c).style+'"><div class="inspect-art">'+portrait(c)+'</div><span class="eyebrow">'+esc(D.FACTIONS[c.faction].name)+' / '+esc(c.type)+(c.unique?' / UNIQUE':'')+'</span>'+(window.FrontlinesPresentation?.badge(c)||'')+'<h3>'+esc(c.name)+'</h3><div class="inspect-stats"><div><b>'+c.presence+'</b><small'+tooltip(glossaryText('Presence'))+'>PRESENCE</small></div>'+(c.type!=='order'?'<div><b>'+(unit?E.attackValue(state,unit):c.attack)+'</b><small'+tooltip('Attack is damage dealt in combat. Ready units can attack enemies in the same territory; the defender receives a response window.')+'>ATTACK</small></div><div><b>'+(c.health-wounds)+'</b><small>HEALTH'+(unit?' / '+c.health:'')+'</small></div>':'<div><b>↗</b><small>'+esc((c.timing||'action').toUpperCase())+'</small></div>')+'</div>'+(unit?'<div class="cost-preview"><span>Committed Presence: '+c.presence+' (already deployed)</span><span>'+(c.type==='asset'?'Fixed asset: cannot move or attack.':'Move: '+E.actionCost(state,{type:'move',unitUid:unit.uid}).commandActions+' Command Actions · Attack: 1')+'</span></div>':'<div class="cost-preview">'+(c.type==='order'?'Order cost: ':'Deployment cost: ')+costText(handCost(instance,selection?.mode))+'</div>')+(wounds&&!unit?'<div class="inspect-temporary">RECLAIMED · '+wounds+' wounds retained. Redeployment does not heal this card.</div>':'')+'<p>'+esc(c.rulesText)+'</p>'+(c.flavorText?'<p class="card-flavor">'+esc(c.flavorText)+'</p>':'')+'<div class="traits">'+keywords(c).map(trait=>'<span class="trait '+(unit?.suppressed?'suppressed':'')+'"'+tooltip(glossaryText(trait))+'>'+esc(trait)+'</span>').join('')+'</div>'+(unit?.marked?'<div class="inspect-temporary">MARKED · +1 incoming combat damage until this unit’s next offensive turn.</div>':'')+(unit?.reinforced?'<div class="inspect-temporary">REINFORCED · temporary Armor 1 until this unit’s next offensive turn. Does not stack with printed Armor.</div>':'')+(unit?.suppressed?'<div class="inspect-sabotage">SABOTAGED · printed traits suppressed until this unit’s owner begins their next offensive turn.</div>':'')+(unit?'<div class="inspect-status">'+(unit.ready?'● READY':'○ EXHAUSTED')+' · P'+(unit.owner+1)+'<br>'+esc(state.territories[unit.territory].name)+(unit.damage?' · '+unit.damage+' wounds':'')+'</div>':'<div class="inspect-status">'+(c.type==='order'?'Temporary Presence spending.':c.presence+' Presence stays committed while deployed.')+'</div>')+(unit?'<div class="inspect-tactical-statuses">'+tacticalStatusMarkup(unit,true)+'</div>':'')+(unit?combatPreview(unit):'')+'<button class="btn quiet inspect-expand" data-action="enlarge-card" data-card-id="'+esc(c.id)+'">Full card briefing</button></aside>';
  }
  function glossaryText(key) { const entries=Object.entries(D.GLOSSARY||{}),lookup=key==='command'?'Command aura':key; return (entries.find(([k])=>k.toLowerCase()===lookup.toLowerCase())||[])[1]||key; }
  function guidance() {
    if(state.winner!=null)return ['OPERATION COMPLETE',faction(state.winner).name+' has secured victory.','Review the battlefield or start another operation.'];
    if(networkMatch && !['connected','active'].includes(networkMatch.status))return ['MATCH PAUSED','Connection interrupted. Restoring the same battlefield.','Gameplay resumes after both commanders reconnect and synchronize.'];
    if(networkMatch?.pending)return ['COMMAND SENT','Waiting for the host to confirm your command.','The battlefield updates only after canonical resolution.'];
    if(networkMatch && actor()!==localSeat())return ['WAITING FOR '+esc(seatName(actor()).toUpperCase()),esc(seatName(actor()))+' is '+(state.response?'choosing a combat response.':'taking their action window.'),'You can inspect your hand, the public battlefield, Commanders and Field Manual.'];
    if(tutorialInMatch&&tutorial?.isGuided()&&tutorial.snapshot().complete)return ['LESSON COMPLETE','Objective secured. Continue in the training panel.','Inspect the battlefield or restart this lesson.'];
    if(isAI())return ['ENEMY WINDOW',esc(aiActivity?.text||faction(1).name+' is choosing a command.'),'AI difficulty: '+(tutorialInMatch&&tutorial?.isActive()?'Learning':matchOptions.aiDifficulty||settings.aiDifficulty)+'. You can inspect while it acts.'];
    if(state.response){const r=state.response,a=findUnit(r.attackerUid),d=findUnit(r.defenderUid);return [r.stage==='counter'?'COUNTER WINDOW':'DEFENDER RESPONSE',esc((a?cardDef(a).name:'Attacker')+' → '+(d?cardDef(d).name:'Defender')),'Responses use Capacity, 0 Command Actions. Choose a highlighted response or allow combat.'];}
    if(selection?.kind==='commander'){const cmd=Commanders?.get(state.players[actor()].commander?.id);return ['COMMAND ABILITY',esc(cmd?.active.name||'Commander active')+' · '+esc(costText(E.commanderStatus(state,actor()).cost)), selection.targetUid?'Choose the highlighted destination for your selected unit.': 'Choose a highlighted legal target. This active is used once per match.'];}
    if(selection?.kind==='hand'){
      const h=handItem(selection.uid);if(h){const c=cardDef(h),actions=selectedActions(),cost=handCost(h,selection.mode);
        if(actions.some(a=>a.sacrificeChoice))return ['SACRIFICE / CHOOSE COST',esc(c.name)+' · '+esc(costText(cost)),'Select your own highlighted piece to destroy. Then choose the payoff and explicitly confirm; selecting alone destroys nothing.'];
        if(selection.sacrificeUid)return ['SACRIFICE / CHOOSE PAYOFF',esc(cardDef(findUnit(selection.sacrificeUid)).name)+' selected as cost.','Choose the highlighted payoff target. The final confirmation names the piece you will destroy.'];
        if(c.effect?.kind==='adapt'&&!selection.mode)return ['CHOOSE A TACTIC',esc(c.name)+' · '+esc(costText(cost)),'Choose one Adapt mode. Only that mode’s legal targets will be highlighted.'];
        return [c.type==='order'?'PLAY ORDER':'DEPLOY FORCE',esc(c.name)+' · '+esc(costText(cost)),actions.length?'Choose a highlighted '+(c.type==='order'?(actions.some(a=>a.territory!==undefined)?'territory. Damage previews mark the affected enemies; Blast bypasses Cover and Dodge.':'target.'):'owned territory. Basic units use 0 Command Actions.'):unavailableReason(c,h)];}
    }
    if(selection?.kind==='ability'){const u=findUnit(selection.uid),ability=u&&cardDef(u).tactical?.ability;return ['UNIT ABILITY',esc(ability?.name||'Tactical ability')+' · '+esc(costText(costOf(selectedActions()[0]||{}))),'Choose a highlighted target. This paid ability exhausts its source and uses its action-window activation.'];}
    if(selection?.kind==='unit'){const u=findUnit(selection.uid);if(u)return ['UNIT COMMAND',esc(cardDef(u).name)+' · Move: '+E.actionCost(state,{type:'move',unitUid:u.uid}).commandActions+' Command Actions · Attack: 1',selectedActions().length?'Choose connected ground or a highlighted enemy.':unitUnavailableReason(u)];}
    const power=E.unitsAt(state,state.contested,state.attacker).reduce((n,u)=>n+cardDef(u).presence,0);
    return [state.actionsLeft?'YOUR ACTION WINDOW':'FREE DEPLOYMENT OPEN',state.actionsLeft?'Deploy with Capacity. Move or attack with Command Actions.':'0 Command Actions. Cards marked 0 can still be deployed.',power?'End window adds '+power+' Presence to '+state.territories[state.contested].name+'. Check the capture forecast.':'Deploy on owned forward ground, then move to the orange objective.'];
  }
  function unavailableReason(c,h) {
    if(tutorialInMatch&&tutorial?.isGuided()&&E.legalActions(state).some(a=>a.handUid===h?.uid)&&!legal.some(a=>a.handUid===h?.uid))return 'Guided lesson: '+window.FrontlinesTutorial.LESSONS[tutorial.snapshot().index].objective;
    if(state.winner!=null)return 'This operation is complete.';
    if(state.response)return 'Only legal '+(state.response.stage==='counter'?'Counter':'Response')+' Orders can be played during this window.';
    if(c.type==='order'&&c.timing!=='action')return 'Keep this '+c.timing+' Order for its combat window.';
    const cost=handCost(h,selection?.mode);if(cost.commandActions>state.actionsLeft)return 'Requires '+cost.commandActions+' Command Action. '+state.actionsLeft+' remain. Cards marked 0 may still be played.';
    const available=E.presence(state,actor()).available;
    if(cost.presence>available)return 'Not enough available Capacity: needs '+cost.presence+', available '+available+'.';
    if(c.unique&&state.units.some(u=>u.owner===actor()&&u.cardId===c.id))return 'Unique: you already have this leader deployed.';
    return c.type==='order'?'There are no legal targets for this Order.':'No controlled territory has an open allied slot.';
  }
  function unitUnavailableReason(u) {
    if(tutorialInMatch&&tutorial?.isGuided()&&E.legalActions(state).some(a=>a.unitUid===u.uid)&&!legal.some(a=>a.unitUid===u.uid))return 'Guided lesson: '+window.FrontlinesTutorial.LESSONS[tutorial.snapshot().index].objective;
    if(u.owner!==actor()) return 'This is an opposing unit. Select one of your ready units to attack it.';
    if(state.actionsLeft<=0&&!legal.some(a=>a.type==='move'&&a.unitUid===u.uid)) return 'No Command Actions remain. You can still deploy cards marked 0, or end your turn.';
    if(legal.some(a=>a.type==='ability'&&a.unitUid===u.uid))return 'Choose '+cardDef(u).tactical.ability.name+' below, then its highlighted target. The paid ability exhausts this piece.';
    if(legal.some(a=>a.type==='overwatch'&&a.unitUid===u.uid))return 'Choose Overwatch below to prepare one reaction instead of attacking. It costs 1 Command Action and exhausts this unit.';
    if(cardDef(u).type==='asset') return 'Assets cannot move or attack. They hold Presence and support allies here; printed tactical abilities use the controls below.';
    if(!u.ready) return 'This unit is exhausted. It readies at the start of your next offensive turn.';
    return 'No legal action here. Advance only to connected owned ground or the current objective. Newly deployed units need Rush to attack this turn.';
  }
  function ordersBar() {
    const [phase,text,hint]=guidance();
    let buttons='';
    if (selection&&!state.response) buttons+='<button class="btn quiet compact" data-action="cancel">Cancel <span class="muted">Esc</span></button>';
    if(selection?.kind==='hand'&&cardDef(handItem(selection.uid))?.effect?.kind==='adapt')buttons+='<button class="btn quiet" data-action="adapt-picker">Choose tactic</button>';
    if (controllable()) {
      const actions=selectedActions(), direct=actions.find(a=>a.type==='order'&&!a.targetUid&&a.territory===undefined&&!a.sacrificeChoice);
      if(direct) buttons+='<button class="btn primary" data-action="play-order">Execute order</button>';
      if(selection?.kind==='unit'){
        const u=findUnit(selection.uid),definition=u&&cardDef(u),ability=definition?.tactical?.ability,abilityActions=legal.filter(a=>a.type==='ability'&&a.unitUid===u?.uid),watch=legal.find(a=>a.type==='overwatch'&&a.unitUid===u?.uid);
        if(ability)buttons+='<button class="btn quiet tactical-command" data-action="unit-ability" data-uid="'+esc(u.uid)+'" data-ability-id="'+esc(ability.id)+'" '+(!abilityActions.length?'disabled':'')+' title="'+esc(abilityActions.length?costText(costOf(abilityActions[0])):'Ability unavailable: source must be ready, eligible this turn, affordable and have a legal target.')+'"><b>'+esc(ability.name)+'</b><small>'+ability.cost.presence+' P · '+ability.cost.commandActions+' ACTION</small></button>';
        if(definition?.tactical?.overwatch&&!definition.tactical.overwatch.onDeploy)buttons+='<button class="btn quiet tactical-command" data-action="unit-overwatch" data-uid="'+esc(u.uid)+'" '+(!watch?'disabled':'')+' title="Exhaust and spend 1 Command Action. Watch first enemy voluntary entry here for 2 damage. Smoke blocks reactions; expires at your next action window."><b>⌖ Overwatch</b><small>0 P · 1 ACTION</small></button>';
      }
      if(state.response) buttons+='<button class="btn primary" data-action="pass-response">'+(state.response.stage==='counter'?'Resolve attack':'Allow combat')+' →</button>';
      else buttons+='<button class="btn primary" data-action="end-turn">End window<span class="command-detail">'+(state.actionsLeft?' · '+state.actionsLeft+' left':'')+' →</span></button>';
    }
    const inspection=inspected?.kind==='unit'?findUnit(inspected.uid):inspected?.kind==='hand'?handItem(inspected.uid):null;
    if(inspection&&!privacy)buttons+='<button class="btn quiet mobile-inspect" data-action="enlarge-card" data-card-id="'+esc(cardDef(inspection).id)+'" '+(inspected.kind==='unit'?'data-unit-uid="'+esc(inspection.uid)+'"':'')+'>Inspect</button>';
    return '<section class="orders-bar '+(state.response?'reaction':'')+'" aria-live="polite"><span class="phase-marker">'+phase+'</span><div class="order-guidance">'+text+'<small>'+esc(hint)+'</small></div><div class="order-buttons">'+buttons+'</div></section>';
  }
  function objectiveSummary() {
    const t=state.territories[state.contested], limit=state.config.captureThreshold;
    return '<div class="objective-summary"'+tooltip('This forecast uses current battlefield forces. Combat or movement may change it. Each side scores at the end of its own action window.')+'><span class="objective-label">CAPTURE FORECAST</span>'+[0,1].map(p=>{const power=E.capturePressure(state,p).total, next=t.progress[p]+power;return '<span class="objective-side p'+(p+1)+'"><b>P'+(p+1)+' '+esc(faction(p).name)+'</b><span>+'+power+' → '+Math.min(next,limit)+'/'+limit+'</span>'+(next>=limit&&power?'<strong>◆ CAPTURE READY</strong>':'')+'</span>';}).join('')+'</div>';
  }
  function gameView() {
    const territories=visibleTerritories();
    const targetActions=state.response&&state.response.stage==='response'?legal.filter(a=>a.guardUid):selectedActions();
    const handPlayer=networkMatch?localSeat():settings.mode==='ai'&&actor()===1?0:actor(), handHidden=privacy||state.winner!=null;
    const dots=Array.from({length:state.config.actionLimit},(_,i)=>'<i class="'+(i<state.actionsLeft?'':'spent')+'"></i>').join('');
    return '<main class="game"><div class="command-row">'+hud(0)+'<div class="turn-hud"><span class="eyebrow">ACTION WINDOW '+String(state.turn).padStart(2,'0')+'</span><div class="action-dots" title="'+state.actionsLeft+' of '+state.config.actionLimit+' actions remaining">'+dots+'</div><span class="command-count">'+state.actionsLeft+' / '+state.config.actionLimit+'</span><span class="eyebrow">COMMAND ACTIONS</span><span class="turn-owner">P'+(state.attacker+1)+' · '+(state.winner!=null?'OPERATION COMPLETE':isAI()?'ENEMY WINDOW':'YOUR WINDOW')+'</span></div>'+hud(1)+'</div>'+commanderRow()+'<section aria-label="Battlefield"><div class="board-heading"><h2><span class="live-indicator"></span>Territorial operations</h2><div class="frontline-detail"><span>OBJECTIVE <b>'+esc(state.territories[state.contested].name)+'</b></span><span class="badge">'+state.config.captureThreshold+' P TO CAPTURE</span></div></div>'+objectiveSummary()+(aiActivity?'<div class="ai-activity" role="status"><b>'+esc(aiActivity.text)+'</b>'+(settings.actionExplanations&&aiActivity.why?'<small>'+esc(aiActivity.why)+'</small>':'')+'</div>':'')+tipMarkup()+'<div class="map-scroll"><div class="front-strip" aria-hidden="true" style="grid-template-columns:'+territories.map(t=>t.id===state.contested?'1.65fr':'1fr').join(' ')+'">'+territories.map(t=>'<div class="control-segment owner-'+t.owner+(t.id===state.contested?' contested':'')+'"></div>').join('')+'</div><div class="battlefield" style="grid-template-columns:'+territories.map(t=>t.id===state.contested?'1.65fr':'1fr').join(' ')+'">'+territories.map(t=>territoryMarkup(t,targetActions)).join('')+'</div></div><div class="board-caption"><span>P1 <b>WESTERN LINE →</b></span><span>UPPER ROW: P2 · LOWER ROW: P1</span><span><b>← EASTERN LINE</b> P2</span></div></section>'+ordersBar()+'<section class="hand-area"><div><div class="hand-heading"><h2>'+(handHidden?(state.winner!=null?'OPERATION COMPLETE':'CLASSIFIED HAND'):esc(faction(handPlayer).name)+' / P'+(handPlayer+1)+' HAND')+'</h2><span>'+(handHidden?(state.winner!=null?'FINAL BATTLEFIELD SECURED':'IDENTITY VERIFICATION REQUIRED'):state.players[handPlayer].hand.length+' CARDS · SELECT TO COMMIT')+'</span></div>'+(handHidden?'<div class="hidden-hand">'+(state.winner!=null?'TERRITORY SECURED / ALL ORDERS COMPLETE':'HAND SECURED / PASS THE COMPUTER')+'</div>':'<div class="hand-cards">'+state.players[handPlayer].hand.map(h=>handCardMarkup(h,handPlayer,false)).join('')+(state.players[handPlayer].hand.length?'':'<div class="hidden-hand" style="width:100%">No cards in hand. Draw on your next turn.</div>')+'</div><div class="opponent-note">'+(settings.mode==='ai'?'SOLO OPERATIONS · DECK-AWARE AI OPPONENT':'LOCAL HOT-SEAT · HANDS HIDDEN BETWEEN COMMANDERS')+'</div>')+'</div><div id="inspector">'+inspectorMarkup()+'</div></section>'+(handsPublic()&&!handHidden?'<details class="debug-other-hand"><summary class="debug-hand-toggle">Opponent hand · developer view</summary><div class="hand-heading"><h2>DEVELOPER VIEW / P'+(2-handPlayer)+' HAND</h2><span>INFORMATION VISIBLE TO BOTH PLAYERS</span></div><div class="hand-cards">'+state.players[1-handPlayer].hand.map(h=>handCardMarkup(h,1-handPlayer,false)).join('')+'</div></details>':'')+'<div class="footer-line"><span>PROJECT FACTION / FRONTLINES · '+esc(runtimeLabel())+'</span><span>ESC CANCEL · R RULES · L LOG · SEED '+state.seed+'</span></div></main>';
  }
  function privacyMarkup() {
    const p=actor(), f=faction(p), stage=state.response?(state.response.stage==='counter'?'A counter window needs your decision.':'An attack has been declared. Your response is requested.'):'Your offensive turn is ready.';
    return '<div class="overlay privacy" role="dialog" aria-modal="true" aria-labelledby="privacy-title"><div class="privacy-card"><div class="privacy-emblem" style="color:'+f.color+'">'+symbol(f.id)+'</div><span class="eyebrow">SECURE COMMAND TRANSFER / PLAYER '+(p+1)+'</span><h2 id="privacy-title">Pass to '+esc(f.name)+'.</h2><p>'+stage+'<br>Your hand stays hidden until you take command.</p><button class="btn primary" data-action="reveal">I am Player '+(p+1)+' · Reveal hand →</button><span class="small mono">THE PREVIOUS COMMANDER SHOULD LOOK AWAY</span></div></div>';
  }
  function modalShell(title,body,footer,wide) { return '<div class="overlay" data-overlay="true" role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><section class="modal '+(wide?'wide':'')+'"><div class="modal-title"><h2>'+title+'</h2><button class="close" data-action="close-modal" aria-label="Close dialog">×</button></div>'+body+(footer?'<div class="modal-footer">'+footer+'</div>':'')+'</section></div>'; }
  function rulesMarkup() {
    const sections=window.FrontlinesFieldManual.sections(state?state.config:settings.config,D);
    if(!sections[manualTopic])manualTopic='Winning';
    return modalShell('Field manual','<p class="manual-training-link"><a class="btn primary" href="tactical-training.html" data-game-navigation="training">Tactical Arsenal training →</a><span>Six optional playable Action → Counter → Result exercises.</span></p><div class="manual-layout"><nav class="manual-topics" aria-label="Rules topics">'+Object.keys(sections).map(topic=>'<button class="btn '+(topic===manualTopic?'primary':'quiet')+'" data-action="manual-topic" data-topic="'+esc(topic)+'">'+esc(topic)+'</button>').join('')+'</nav><section class="manual-reading"><h3>'+esc(manualTopic)+'</h3>'+sections[manualTopic].map(paragraph=>'<p>'+esc(paragraph)+'</p>').join('')+'</section></div>','<button class="btn primary" data-action="close-modal">Return to operations</button>',true);
  }
  function configMarkup() {
    return modalShell('Balance configuration','<p>These values apply to the next match. Prototype defaults are designed for a deliberate, moving frontline.</p><form id="config-form"><div class="config-grid">'+configFields.map(([key,label,min,max,hint])=>'<label>'+label+'<input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="1" value="'+settings.config[key]+'" required><small>'+hint+'</small></label>').join('')+'</div></form>','<button class="btn quiet" data-action="reset-config">Restore defaults</button><button class="btn primary" data-action="save-config">Save configuration</button>',false);
  }
  function cardBriefingMarkup(cardId,unitUid) {
    const c=D.CARDS[cardId];if(!c)return '';
    return modalShell(c.name,'<div class="full-card-briefing"><div class="full-card-preview">'+handCardMarkup({cardId:c.id},state?actor():0,true)+'</div><div><span class="eyebrow">'+esc(D.FACTIONS[c.faction].name)+' / '+esc(c.type)+'</span><div class="full-card-stats"><b>'+c.presence+' P</b>'+(c.type==='order'?'<span>'+esc(c.timing)+' Order</span>':'<span>'+c.attack+' Attack</span><span>'+c.health+' Health</span>')+'</div>'+(unitUid&&findUnit(unitUid)?'<div class="inspect-temporary">'+esc(temporaryState(findUnit(unitUid))||'No temporary conditions.')+' · '+(c.health-findUnit(unitUid).damage)+' / '+c.health+' Health</div>':'')+'<h3>Rules</h3><p>'+esc(c.rulesText)+'</p><dl class="glossary">'+keywords(c).map(t=>'<dt>'+esc(t)+'</dt><dd>'+esc(glossaryText(t))+'</dd>').join('')+'</dl>'+(c.flavorText?'<p class="card-flavor">'+esc(c.flavorText)+'</p>':'')+'</div></div>','<button class="btn primary" data-action="close-modal">Return to battlefield</button>',true);
  }
  function settingsMarkup() {
    return modalShell('Presentation settings','<p>Keep the front responsive. These preferences apply immediately and are saved on this device.</p><div class="presentation-settings"><label>Animation speed<select data-setting="animationSpeed"><option value="normal" '+(settings.animationSpeed==='normal'?'selected':'')+'>Normal</option><option value="fast" '+(settings.animationSpeed==='fast'?'selected':'')+'>Fast</option></select><small>Fast shortens feedback and opponent pacing.</small></label><label class="check-label"><input type="checkbox" data-setting="reducedEffects" '+(settings.reducedEffects?'checked':'')+'>Reduced visual effects</label><label class="check-label"><input type="checkbox" data-setting="reducedShake" '+(settings.reducedShake?'checked':'')+'>Reduced screen shake</label><label class="check-label"><input type="checkbox" data-setting="sound" '+(settings.sound?'checked':'')+'>Enable sound</label><p class="small muted">Audio uses lightweight placeholder cues. Your system’s reduced-motion preference also reduces animation.</p></div>','<button class="btn primary" data-action="close-modal">Return to operations</button>',false);
  }
  function logMarkup() {
    return '<div class="overlay drawer-overlay" data-overlay="true" role="dialog" aria-modal="true" aria-label="Match log"><aside class="log-drawer"><div class="modal-title"><div><span class="eyebrow">BATTLEFIELD TELEMETRY</span><h2>Match log</h2></div><button class="btn quiet compact" data-action="close-modal" aria-label="Close match log">×</button></div><div class="log-list">'+activityHistory.slice().reverse().map(entry=>'<div class="log-entry explanation"><span class="log-turn">W'+String(entry.turn).padStart(2,'0')+'</span><span>'+esc(entry.text)+(entry.why?'<small>'+esc(entry.why)+'</small>':'')+'</span></div>').join('')+state.log.slice().reverse().map(entry=>'<div class="log-entry '+esc(entry.type)+'"><span class="log-turn">W'+String(entry.turn).padStart(2,'0')+'</span><span>'+esc(entry.text)+'</span></div>').join('')+'</div><div class="modal-footer"><button class="btn quiet" data-action="export-log">Export log</button></div></aside></div>';
  }
  function deckMarkup(player) {
    if(networkMatch && player!==localSeat())return modalShell('Opponent briefing','<p>'+esc(seatName(player))+' · '+esc(faction(player).name)+'</p>'+commanderBrief(Commanders.get(state.players[player].commander?.id))+'<p>The opponent’s deck and hand are private. Inspect deployed cards on the battlefield.</p>','<button class="btn primary" data-action="close-modal">Return to battlefield</button>',true);
    const selected=state?matchOptions.decks[player]:chosenDeck(player),f=D.FACTIONS[selected.faction],counts={};selected.cards.forEach(id=>{counts[id]=(counts[id]||0)+1;});
    const cards=Object.keys(counts).filter(id=>D.CARDS[id]).map(id=>({cardId:id,count:counts[id]})),validation=Decks?.validate(selected);
    return modalShell(esc(selected.name),'<span class="eyebrow">'+selected.cards.length+' CARDS / '+cards.length+' DISTINCT DESIGNS / '+esc(f.name)+'</span><p>'+esc(f.description)+'</p>'+(validation&&!validation.legal?'<p class="playtest-notice">'+esc(validation.errors.join(' '))+'</p>':'')+'<div class="deck-grid">'+cards.map(c=>handCardMarkup(c,player,true)).join('')+'</div><div id="deck-detail" class="deck-detail">Select any card for a full briefing.</div>','<button class="btn primary" data-action="close-modal">Return to briefing</button>',true);
  }
  function devMarkup() {
    const selected=selection&&selection.kind==='unit'?findUnit(selection.uid):null;
    return modalShell('Developer console','<span class="eyebrow">TESTING TOOLS / MUTATIONS ARE LOGGED</span><p>Operations affect the selected player. Select a battlefield unit before opening this console to damage or remove it. Debug tools can change match balance.</p><label class="check-label"><input type="checkbox" data-setting="bothHands" '+(settings.bothHands?'checked':'')+'>Reveal both hands and disable hot-seat privacy</label><div class="dev-controls"><select id="dev-player" aria-label="Developer target player"><option value="0">Player 1 · '+esc(faction(0).name)+'</option><option value="1">Player 2 · '+esc(faction(1).name)+'</option></select><button class="btn quiet" data-action="debug" data-debug="presence">+10 Command</button><button class="btn quiet" data-action="debug" data-debug="draw">Draw 1 card</button><button class="btn quiet" data-action="debug" data-debug="capture">Capture objective</button></div><p class="small">Selected unit: <strong>'+(selected?esc(cardDef(selected).name)+' (P'+(selected.owner+1)+')':'none')+'</strong></p><div class="dev-controls"><button class="btn quiet" data-action="debug" data-debug="damage" '+(selected?'':'disabled')+'>Deal 2 damage</button><button class="btn danger" data-action="debug" data-debug="destroy" '+(selected?'':'disabled')+'>Destroy selected</button><button class="btn quiet" data-action="debug-end" '+(state.response||state.winner!=null?'disabled':'')+'>End current turn</button></div><details><summary class="small muted">Inspect full game state · includes both hands</summary><textarea class="state-dump" readonly aria-label="Full game state">'+esc(JSON.stringify(state,null,2))+'</textarea></details>','<button class="btn quiet" data-action="config">Next-match configuration</button><button class="btn primary" data-action="close-modal">Return to operations</button>',true);
  }
  function victoryMarkup() {
    if(networkMatch)return window.FrontlinesMultiplayerUI.resultMarkup(networkMatch,state);
    const winner=state.winner,f=faction(winner);
    return '<div class="overlay victory-overlay" role="dialog" aria-modal="true" aria-label="Match victory"><section class="modal victory-modal" style="'+factionStyle(f.id)+'"><div class="victory-emblem">'+symbol(f.id)+'</div><span class="eyebrow">OPERATION COMPLETE / PLAYER '+(winner+1)+'</span><h2>TERRITORY SECURED.</h2><div class="victory-sub">'+esc(f.name)+' VICTORY</div><p>'+esc(f.name)+' has seized the battlefield. The opposing command has lost its territory.</p><div class="victory-stats"><div><b>'+state.turn+'</b><span>ACTION WINDOWS</span></div><div><b>'+E.controlledCount(state,winner)+'</b><span>TERRITORIES</span></div><div><b>'+state.units.filter(u=>u.owner===winner).length+'</b><span>SURVIVORS</span></div></div>'+rewardMarkup()+'<details class="small muted"><summary>Match statistics</summary><div class="statistics-grid">'+Object.entries(state.stats||{}).map(([key,value])=>'<p><strong>'+esc(key.replace(/([A-Z])/g,' $1'))+':</strong> '+esc(typeof value==='object'?JSON.stringify(value):value)+'</p>').join('')+'</div></details><div class="modal-footer"><button class="btn quiet" data-action="review-victory">Review battlefield</button><button class="btn primary" data-action="rematch">Rematch →</button></div><button class="btn quiet compact" data-action="to-setup">Return to setup</button></section></div>';
  }
  function renderModal() {
    if(!modal)return '';
    if(modal?.type==='local-network-deck'){
      const deck=modal.deck,counts={};deck.cards.forEach(id=>counts[id]=(counts[id]||0)+1);
      return modalShell(esc(deck.name),'<span class="eyebrow">YOUR PRIVATE DECK / '+deck.cards.length+' CARDS</span><div class="deck-grid">'+Object.keys(counts).filter(id=>D.CARDS[id]).map(id=>handCardMarkup({cardId:id,count:counts[id]},0,true)).join('')+'</div><div id="deck-detail" class="deck-detail">Select a card for its full briefing.</div>','<button class="btn primary" data-action="close-modal">Return to lobby</button>',true);
    }
    if(modal?.type==='sacrifice')return sacrificeMarkup(modal.action);
    if(modal==='settings')return settingsMarkup();
    if(modal?.type==='commander'){const cmd=Commanders?.get(state?.players[modal.player]?.commander?.id||chosenDeck(modal.player)?.commanderId);return modalShell(cmd?.name||'Commander briefing',commanderBrief(cmd),'<button class="btn primary" data-action="close-modal">Return to operation</button>',true);}
    if(modal==='rules')return rulesMarkup();if(modal==='config')return configMarkup();if(modal==='log'&&state)return logMarkup();if(modal==='dev'&&settings.developer&&state)return devMarkup();
    if(typeof modal==='object'&&modal.type==='deck')return deckMarkup(modal.player);
    if(typeof modal==='object'&&modal.type==='inspect')return cardBriefingMarkup(modal.cardId,modal.unitUid);
    if(typeof modal==='object'&&modal.type==='adapt')return adaptMarkup(modal.uid);
    if(modal==='playtest'&&state&&state.winner!=null)return playtestMarkup();
    if(modal==='recent')return recentMarkup();
    if(modal==='new-match')return modalShell('Leave this operation?','<p>This match is still in progress. Returning to setup clears its battlefield and log. Your faction choices and balance settings are kept.</p>','<button class="btn quiet" data-action="close-modal">Keep playing</button><button class="btn danger" data-action="to-setup">Return to setup</button>');
    return '';
  }
  function adaptMarkup(uid){
    const h=handItem(uid),c=h&&cardDef(h);if(!c||c.effect?.kind!=='adapt')return '';
    const choices=c.effect.modes.map(mode=>{const actions=legal.filter(a=>a.handUid===uid&&a.mode===mode.id),effect=E.resolveEffect(c,{mode:mode.id});
      const rules=effect.kind==='draw'?'Draw '+effect.amount+' cards.':effect.kind==='heal'?'Heal one friendly battlefield card by '+effect.amount+'.':effect.kind==='cover'?'Give one friendly permanent Cover for the next direct enemy hit.':effect.kind==='suppression'?'Suppress one enemy: −1 Attack and no voluntary movement through its next action-window end.':effect.kind==='dodge'?'Give one friendly unit one temporary deterministic Dodge charge.':'Ready one exhausted friendly unit.';
      return '<button class="adapt-choice" data-action="adapt-mode" data-mode="'+esc(mode.id)+'" data-uid="'+esc(uid)+'" '+(!actions.length?'disabled':'')+'><strong>'+esc(mode.label)+'</strong><span>'+esc(rules)+'</span><small>'+costText({presence:c.presence,commandActions:cardCost(c)})+' · '+(actions.length?(actions.some(a=>a.targetUid)?actions.length+' legal targets':'No target needed'):esc(unavailableReason(c,h)))+'</small></button>';}).join('');
    return modalShell('ADAPT / '+c.name,'<p>Choose one tactic for this Order. You pay once, and resolve only the selected mode.</p><div class="adapt-choices">'+choices+'</div>','<button class="btn quiet" data-action="close-modal">Return to battlefield</button>',true);
  }
  const feedbackFields=[['unfair','What felt unfair?'],['confusing','What was confusing?'],['stronger','Which faction felt stronger, and why?'],['length','Did the match feel too short or too long?'],['brokenCard','Which card felt too strong?'],['uselessCard','Which card felt useless?']];
  function playtestMarkup() {
    const incomplete=!completedTelemetry;
    return modalShell('Export playtest report','<span class="eyebrow">LOCAL PLAYTEST / '+esc(runtimeLabel())+'</span><p>Save this finished match’s rules, seed, faction results, Presence economy, territory flow, card metrics, and bounded decision trace. Feedback is optional. The file stays on your computer until you choose to share it.</p>'+(debugChanges||settings.bothHands?'<p class="playtest-notice">DEVELOPER TEST: debug changes or revealed hands were used. This report is labeled noncompetitive.</p>':'')+(incomplete?'<p class="playtest-notice">Detailed recording was unavailable. This export contains match metadata, feedback, and the recent engine log.</p>':'')+'<form id="playtest-form"><div class="playtest-feedback">'+feedbackFields.map(([key,label])=>'<label for="feedback-'+key+'">'+label+'<textarea id="feedback-'+key+'" name="'+key+'" maxlength="600" rows="2" placeholder="Optional feedback"></textarea></label>').join('')+'<label for="feedback-inevitable">Turn when the result began to feel inevitable<input id="feedback-inevitable" name="inevitableTurn" type="number" min="1" max="'+state.turn+'" step="1" placeholder="Optional"></label></div></form><details class="playtest-contents"><summary>What is included?</summary><p>The completed match’s cards and decisions are included for analysis. No account, player identity, or contact details are requested. Recent-match history stores only small summaries, never hands or traces.</p><p>Telemetry samples at offensive turn ends. Long traces are capped at 1,000 decisions. Surviving units are reported as ongoing observations, not fabricated deaths.</p></details>','<button class="btn quiet" data-action="close-modal">Return to battlefield</button><button class="btn quiet" data-action="download-playtest" data-format="text">Text report</button><button class="btn primary" data-action="download-playtest" data-format="json">JSON report ↓</button>',true);
  }
  function recentMarkup() {
    return modalShell('Recent operations','<p>The latest 20 completed matches are kept on this device. These summaries contain no hands or decision traces.</p><div class="recent-table-wrap"><table class="recent-table"><thead><tr><th>Factions</th><th>Winner</th><th>Windows</th><th>Seed</th><th>Build / profile</th></tr></thead><tbody>'+(recentMatches.length?recentMatches.map(match=>'<tr><td>'+match.factions.map(id=>esc(D.FACTIONS[id].name)).join(' vs ')+(match.decks?'<small class="recent-decks">'+match.decks.map(d=>esc(d?.name||'Starter')).join(' vs ')+(match.opponentName?' · VS '+esc(match.opponentName):'')+'</small>':'')+'</td><td>'+esc(D.FACTIONS[match.factions[match.winner]]?.name||'Unresolved')+(match.mode==='private-online'?' <small>PRIVATE ONLINE · '+esc(match.winner===match.localSeat?'VICTORY':'DEFEAT')+'</small>':match.nonCompetitive?' <small>DEV TEST</small>':'')+'</td><td>'+match.turns+'</td><td>'+match.seed+'</td><td>'+esc(match.version+' / '+(match.balanceName||match.balanceProfile))+'</td></tr>').join(''):'<tr><td colspan="5">No completed matches recorded yet.</td></tr>')+'</tbody></table></div>','<button class="btn primary" data-action="close-modal">Return to setup</button>',true);
  }
  function playtestReport() {
    if(!state||state.winner==null)return null;
    const form=document.getElementById('playtest-form'),feedback={};
    if(form){if(!form.reportValidity())return null;new FormData(form).forEach((value,key)=>{if(String(value).trim())feedback[key]=key==='inevitableTurn'?Number(value):String(value).trim().slice(0,600);});}
    return {schemaVersion:1,kind:'frontlines-human-playtest',exportedAt:new Date().toISOString(),build:{version:Runtime.version,balanceProfile:Runtime.balanceProfile,balanceVersion:Runtime.balanceVersion,aiProfile:Runtime.aiProfile,aiVersion:Runtime.aiVersion,aiDifficulty:matchOptions.aiDifficulty||null},match:{seed:state.seed,mode:settings.mode,factions:state.players.map(p=>p.faction),winner:state.winner,turns:state.turn,configuration:state.config,decks:matchOptions.decks,finalTerritories:[0,1].map(p=>E.controlledCount(state,p)),nonCompetitive:debugChanges||settings.bothHands,debugChanges,publicHands:settings.bothHands},rules:{cards:D.CARDS,decks:D.DECKS,factions:D.FACTIONS,profile:Runtime.profile||null},telemetry:completedTelemetry,feedback,actionHistory:activityHistory.slice(),engineLog:state.log.slice()};
  }
  function downloadPlaytest(format) {
    const report=playtestReport();if(!report)return;
    let content;
    if(format==='text'){
      const trace=report.telemetry?.trace||[],economy=report.telemetry?.economy||[],territory=report.telemetry?.territory||{};
      content=['FRONTLINES / HUMAN PLAYTEST REPORT',runtimeLabel(),'Seed: '+report.match.seed,'Factions: '+report.match.factions.map(id=>D.FACTIONS[id].name).join(' vs '),'Decks: '+report.match.decks.map(d=>d.name).join(' vs '),'Winner: '+D.FACTIONS[report.match.factions[report.match.winner]].name,'Turns: '+report.match.turns,'Competitive sample: '+(!report.match.nonCompetitive),'Configuration: '+JSON.stringify(report.match.configuration),'','OPTIONAL PLAYER FEEDBACK',...Object.entries(report.feedback).map(([key,value])=>key+': '+value),'','PRESENCE ECONOMY',JSON.stringify(economy,null,2),'','TERRITORY FLOW',JSON.stringify(territory,null,2),'','CARD METRICS',JSON.stringify(report.telemetry?.cards||[],null,2),'','BOUNDED DECISION TRACE',...trace.map(item=>'Turn '+item.turn+' / P'+(item.actor+1)+' / '+item.actionText+'\nPresence before: '+JSON.stringify(item.presenceBefore)+'\nPresence after: '+JSON.stringify(item.presenceAfter)+(item.decision?'\nDecision: '+JSON.stringify(item.decision):'')),'','RECENT ENGINE LOG',...report.engineLog.map(entry=>'Turn '+entry.turn+': '+entry.text)].join('\r\n');
    }else content=JSON.stringify(report,null,2);
    const url=URL.createObjectURL(new Blob([content],{type:format==='text'?'text/plain':'application/json'})),anchor=document.createElement('a');
    anchor.href=url;anchor.download='frontlines-playtest-'+report.match.seed+(format==='text'?'.txt':'.json');anchor.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
    notify('Playtest report downloaded. Feedback is included only in that file.');
  }
  function render() {
    actionPreviewCache=new Map();
    if(state) legal=state.winner==null?(networkMatch?(controllable()?networkMatch.legalActions||[]:[]):tutorialInMatch&&tutorial?.isGuided()?tutorial.constrainActions(state):E.legalActions(state)):[];
    hideTooltip();
    const factions=state?state.players.map(p=>p.faction):settings.factions;
    app.style.setProperty('--p1-color',D.FACTIONS[factions[0]].color);
    app.style.setProperty('--p2-color',D.FACTIONS[factions[1]].color);
    const scroll = document.querySelector('.hand-cards')?.scrollLeft || 0, handScrollTop=document.querySelector('.hand-cards')?.scrollTop||0;
    app.innerHTML = header()+(currentScreen==='home'?homeView():currentScreen==='multiplayer'?window.FrontlinesMultiplayerUI.render():currentScreen==='match'&&state?gameView():setupView())+renderModal()+(currentScreen==='match'&&privacy?privacyMarkup():'')+(currentScreen==='match'&&state&&state.winner!=null&&victoryReady&&!victoryDismissed&&!(tutorialInMatch&&tutorial?.isActive())?victoryMarkup():'')+(currentScreen==='match'&&networkMatch&&state?.winner==null?window.FrontlinesMultiplayerUI.connectionMarkup(networkMatch):'');
    if(currentScreen==='home')document.querySelector('.home-actions [data-action="open-play"]')?.insertAdjacentHTML('afterend','<button class="home-command" data-action="open-multiplayer"><span><strong>MULTIPLAYER</strong><small>Host a private match. Send a code. Play a friend.</small></span><b>→</b></button>');
    if(networkMatch&&currentScreen==='match')decorateNetworkView();
    window.FrontlinesShell?.notifyMatch(!!state && state.winner==null);
    const versionLine=document.querySelector('.footer-line span');if(versionLine)versionLine.textContent='PROJECT FACTION / FRONTLINES · '+runtimeLabel()+' · '+(networkMatch?'PRIVATE ONLINE':Runtime.aiProfile+' AI');
    const victoryActions=document.querySelector('.victory-modal .modal-footer');if(victoryActions&&!networkMatch)victoryActions.insertAdjacentHTML('afterbegin','<button class="btn quiet" data-action="playtest-report">Export Playtest Report</button>');
    const hand=document.querySelector('.hand-cards');if(hand){hand.scrollLeft=scroll;hand.scrollTop=handScrollTop;}
    const hasOverlay=!!document.querySelector('.overlay');
    document.querySelector('.app-header')?.toggleAttribute('inert',hasOverlay);
    document.querySelector('main')?.toggleAttribute('inert',hasOverlay);
    document.body.style.overflow=hasOverlay?'hidden':'';
    if(currentScreen==='match'&&privacy)document.querySelector('[data-action="reveal"]')?.focus();

    if(tutorialInMatch&&!shellSettingsOpen&&!modal)tutorial?.mount();
  }
  function notify(message,error) { const toast=document.getElementById('toast');toast.textContent=message;toast.className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),error?5200:3300); }
  function openModal(value) { if(tutorialInMatch)tutorial?.pause();focusBeforeModal=document.activeElement;modal=value;render();document.querySelector('.overlay button')?.focus(); }
  function closeModal() {
    const identity=focusBeforeModal?.dataset;
    modal=null;render();
    const restored=identity?Array.from(app.querySelectorAll('[data-action]')).find(n=>n.dataset.action===identity.action&&n.dataset.uid===identity.uid&&n.dataset.player===identity.player):null;
    if(restored)restored.focus();if(tutorialInMatch)tutorial?.resume();scheduleAI();
  }
  function updateInspection(kind,uid) {
    if(privacy)return;
    inspected={kind,uid};
    const node=document.getElementById('inspector');if(node)node.innerHTML=inspectorMarkup();
  }
  function startMatch(options) {
    if(networkMatch){notify('Leave the private match before starting an offline operation.',true);return null;}
    options=options||{};
    tutorialInMatch=false;
    tutorial?.pause();document.body.classList.remove('tutorial-active');acknowledgeWelcome();contextTip=null;aiActivity=null;activityHistory=[];
    clearTimeout(aiTimer);aiTimer=null;
    clearTimeout(victoryTimer);victoryReady=false;FX()?.clear();configureEffects();
    if(options.factions)settings.factions=options.factions.slice();
    if(options.deckIds&&options.deckIds.length===2){settings.deckIds=options.deckIds.slice();settings.commanderIds=[null,null];}
    if(options.commanderIds&&options.commanderIds.length===2)settings.commanderIds=options.commanderIds.slice();
    if(options.decks&&options.decks.length===2)settings.factions=options.decks.map(d=>d.faction);
    if(options.mode)settings.mode=options.mode==='ai'?'ai':'hotseat';
    if(options.aiDifficulty&&['easy','normal','hard','expert'].includes(options.aiDifficulty)){settings.aiDifficulty=options.aiDifficulty;window.FrontlinesShell?.savePreferences({aiDifficulty:options.aiDifficulty});}
    if(options.developer!==undefined)settings.developer=!!options.developer;
    if(options.bothHands!==undefined)settings.bothHands=!!options.bothHands;
    const config={...settings.config,...(options.config||{})};
    const decks=(options.decks||[0,1].map(chosenDeck)).map((deck,p)=>Commanders?{...deck,commanderId:options.commanderIds?.[p]||deck.commanderId||Commanders.defaultFor(deck.faction)}:deck),invalid=decks.find(d=>Decks&&!Decks.validate(d).legal);
    if(invalid){notify(invalid.name+': '+Decks.validate(invalid).errors.join(' '),true);return null;}
    collectionProfile=Collection?.load();
    const missing=decks.map((d,p)=>({deck:d,ownership:ownershipFor(d,p)})).find(d=>!d.ownership.complete);
    if(missing){notify(missing.deck.name+' needs owned cards. '+ownershipText(missing.ownership)+'. Open Collection to craft or find packs.',true);render();return null;}
    const nextOptions={factions:settings.factions.slice(),decks:JSON.parse(JSON.stringify(decks)),config,aiDifficulty:settings.mode==='ai'?settings.aiDifficulty:null,seed:options.seed==null?Math.floor(Math.random()*2147483646)+1:options.seed};
    let nextState;try{nextState=E.createGame(nextOptions);}catch(error){notify(error.message,true);return null;}
    if(settings.mode==='ai'){settings.lastOpponent=window.FrontlinesPlaytestOpponents.key({faction:decks[1].faction,deckId:decks[1].id,commanderId:decks[1].commanderId});saveSettings();}
    currentScreen='match';matchOptions=nextOptions;state=nextState;selection=null;inspected=null;modal=null;revealedPlayer=null;capturedZone=null;victoryDismissed=false;
    completedTelemetry=null;telemetryFinished=false;debugChanges=false;
    progressionId='operation-'+(window.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));humanCommands=0;matchReward=null;progressionIneligible=settings.developer||settings.bothHands;
    telemetry=window.FrontlinesTelemetry?.createTracker({state,data:D,engine:E,trace:true,traceLimit:1000,territoryHistory:true,decks:decks.map(d=>d.id||d.name),aiProfiles:settings.mode==='ai'?['human',Runtime.aiProfile]:['human','human']})||null;
    privacy=settings.mode==='hotseat'&&!handsPublic();
    if(!privacy)revealedPlayer=0;
    saveSettings();render();if(!privacy){FX()?.phase(state,{handPlayer:0});state.players.forEach((p,i)=>FX()?.commanderIntro?.(Commanders?.get(p.commander?.id),document.querySelector('[data-commander-player="'+i+'"]'))); }scheduleAI();return state;
  }
  function transition(next,previous,action,snapshot,events) {
    state=next;selection=null;inspected=null;
    if(previous&&previous.contested!==state.contested){capturedZone=previous.contested;notify(events? actionNarration(previous,state,action,events):faction(state.territories[capturedZone].owner).name+' captured '+state.territories[capturedZone].name+'. The frontline has moved.');setTimeout(()=>{capturedZone=null;document.querySelectorAll('.captured').forEach(n=>n.classList.remove('captured'));},2200);}
    if(state.winner!=null){privacy=false;modal=null;victoryDismissed=false;finishTelemetry();if(previous?.winner==null){clearTimeout(victoryTimer);victoryReady=false;const completed=state;victoryTimer=setTimeout(()=>{if(state===completed&&state.winner!=null){victoryReady=true;if(!modal){render();document.querySelector('[data-action="rematch"]')?.focus();}}},settings.reducedEffects?200:settings.animationSpeed==='fast'?580:1080);}}
    else if(settings.mode==='hotseat'&&!handsPublic()&&actor()!==revealedPlayer){privacy=true;modal=null;}
    else privacy=false;
    if(privacy)FX()?.clear();
    render();FX()?.play(previous,state,action||{type:'debug'},snapshot,{privacy,engineEvents:events,handPlayer:settings.mode==='ai'&&actor()===1?0:actor()});scheduleAI();
  }
  function dispatch(action,decision) {
    if(!state)return {ok:false,error:'No active match.'};
    if(networkMatch){
      if(!controllable())return {ok:false,error:'Wait for your action window and a connected opponent.'};
      if(!legal.some(candidate=>JSON.stringify(candidate)===JSON.stringify(action)))return {ok:false,error:'Choose a highlighted legal command.'};
      networkMatch.pending=true;selection=null;render();
      window.FrontlinesMultiplayerUI.sendIntent(action).then(result=>{if(result?.ok===false&&networkMatch){networkMatch.pending=false;notify(result.error||'The command could not be confirmed.',true);render();}});
      return {ok:true,pending:true};
    }
    const tutorialCheck=tutorialInMatch&&tutorial?.isActive()?tutorial.beforeAction(action,decision):null;
    if(tutorialCheck&&tutorialCheck.ok===false){notify(tutorialCheck.error,true);return tutorialCheck;}
    const previous=state,snapshot=FX()?.capture(state,action),result=E.dispatch(state,action,{events:true});
    if(!result.ok){offerTip('invalid-action','Highlighted territories and targets are legal. Select a card or ready unit to preview its costs and valid choices.');notify(result.error||'That action is unavailable.',true);return result;}
    recordTelemetry(previous,result.state,action,result.events,decision);
    if(!tutorialInMatch&&!decision&&E.getActor(previous)===0&&['deploy','order','move','attack','respond','counter'].includes(action.type)&&!action.pass)humanCommands++;
    if(previous.attacker===0&&previous.actionsLeft>0&&result.state.actionsLeft===0)offerTip('commands-empty','Command Actions are spent. You can still deploy cards marked 0 Command Actions if you have available Capacity and an open slot.');
    if(result.events?.some(e=>e.type==='forcedRetreat'))offerTip('forced-retreat','The ground was lost. Surviving defenders retreat toward their own command, keeping the frontline intact.');
    if(result.events?.some(e=>e.type==='forcedElimination'))offerTip('no-retreat','A displaced card had no legal retreat. It was eliminated and its committed Presence was released.');
    if(decision&&isAI())aiActivity={text:actionNarration(previous,result.state,action,result.events),why:settings.actionExplanations?(decision.explanation||decision.reason||''):''};
    activityHistory.push({turn:previous.turn,text:actionNarration(previous,result.state,action,result.events),why:decision&&isAI()&&settings.actionExplanations?decision.explanation||'':''});activityHistory=activityHistory.slice(-40);
    if(tutorialInMatch)tutorial?.afterAction(previous,result.state,action,result.events);
    transition(result.state,previous,action,snapshot,result.events);return result;
  }
  function decorateNetworkView(){
    document.querySelector('.game')?.classList.add('network-game');
    const owner=document.querySelector('.turn-owner');if(owner)owner.textContent=state.winner!==null?'OPERATION COMPLETE':actor()===localSeat()?'YOUR ACTION WINDOW':'WAITING FOR '+seatName(actor()).toUpperCase();
    const note=document.querySelector('.opponent-note');if(note)note.textContent='PRIVATE ONLINE · '+seatName(1-localSeat())+' · '+(networkMatch.status==='connected'?actor()===1-localSeat()?'THINKING':'CONNECTED':networkMatch.status.toUpperCase());
    const caption=document.querySelector('.board-caption');if(caption)caption.innerHTML='<span>'+esc(seatName(localSeat()))+' <b>YOUR COMMAND →</b></span><span>UPPER: OPPONENT · LOWER: YOUR FORCE</span><span><b>← OPPONENT COMMAND</b> '+esc(seatName(1-localSeat()))+'</span>';
    for(const player of [0,1]){
      const hudNode=document.querySelector('.player-hud[data-player="'+player+'"]');if(!hudNode)continue;
      const role=hudNode.querySelector('.hud-role');if(role)role.textContent=seatName(player)+' · '+(player===localSeat()?'YOU':'OPPONENT');
      const meta=hudNode.querySelector('.hud-meta');if(meta){const spans=meta.querySelectorAll('span');if(spans[1])spans[1].innerHTML='HAND <b>'+(state.players[player].handCount??state.players[player].hand.length)+'</b>';if(spans[2])spans[2].innerHTML='RESERVES <b>'+(state.players[player].deckCount??state.players[player].deck.length)+'</b>';}
    }
    const footer=document.querySelector('.footer-line span:last-child');if(footer)footer.textContent='ESC CANCEL · R RULES · L LOG · PRIVATE MATCH';
  }
  function beginNetworkMatch(payload){return updateNetworkMatch(payload);}
  function updateNetworkMatch(payload){
    if(!payload?.state||![0,1].includes(payload.localSeat))return false;
    const priorNetwork=networkMatch,previous=networkMatch?.matchId===payload.matchId?state:null, isNew=!previous;
    const animate=isNew||Number(payload.sequence)>Number(priorNetwork.sequence);
    const action={type:'network'},snapshot=previous&&animate?FX()?.capture(previous,action):null;
    clearTimeout(aiTimer);clearTimeout(victoryTimer);aiTimer=null;if(animate)FX()?.clear();tutorial?.pause();tutorialInMatch=false;document.body.classList.remove('tutorial-active');
    networkMatch={...payload,pending:typeof payload.pending==='boolean'?payload.pending:!isNew&&!!priorNetwork?.pending&&priorNetwork.sequence===payload.sequence&&!payload.error,status:payload.status||'connected',legalActions:payload.legalActions||[]};
    state=JSON.parse(JSON.stringify(payload.state));currentScreen='match';privacy=false;revealedPlayer=payload.localSeat;debugChanges=false;progressionIneligible=true;
    telemetry=null;completedTelemetry=null;telemetryFinished=true;progressionId='';humanCommands=0;
    matchOptions={config:state.config,factions:state.players.map(p=>p.faction),decks:state.players.map((p,i)=>({...p.deckMeta,faction:p.faction,commanderId:p.commander?.id,cards:i===payload.localSeat?(window.FrontlinesMultiplayerUI.getSelectedDeck()?.cards||[]):[]}))};
    if(isNew){selection=null;inspected=null;modal=null;contextTip=null;activityHistory=[];capturedZone=null;victoryDismissed=false;matchReward=null;}
    else if(previous.response?.stage!==state.response?.stage||E.getActor(previous)!==actor()||priorNetwork.sequence!==payload.sequence||priorNetwork.pending){selection=null;}
    if(previous?.contested!==state.contested&&previous){capturedZone=previous.contested;setTimeout(()=>{capturedZone=null;document.querySelectorAll('.captured').forEach(n=>n.classList.remove('captured'));},2200);}
    if(state.winner!==null){
      victoryReady=true;if(isNew||previous.winner===null){modal=null;selection=null;}
      if(payload.progression&&Collection?.rewardPrivateMatch){matchReward=Collection.rewardPrivateMatch({...payload.progression,id:payload.matchId});collectionProfile=Collection.load();networkMatch.receipt={...matchReward,message:matchReward.ok===false?'Mastery could not be saved. Reopen the result after storage becomes available.':matchReward.reason||'Eligible card history and mastery saved. No Credits, Supply or packs.'};}
      if(!recentMatches.some(entry=>entry.matchId===payload.matchId)){
        recentMatches.unshift({version:Runtime.version,balanceProfile:Runtime.balanceProfile,balanceName:Runtime.balanceName,mode:'private-online',matchId:payload.matchId,protocolVersion:payload.result?.protocolVersion,seed:payload.result?.seed??0,startingSeat:payload.result?.startingSeat??0,localSeat:localSeat(),opponentName:seatName(1-localSeat()),factions:state.players.map(p=>p.faction),commanders:state.players.map(p=>p.commander?.id),winner:state.winner,turns:state.turn,reason:payload.result?.reason||'territory',playedAt:new Date().toISOString(),nonCompetitive:true,decks:state.players.map(p=>({name:p.deckMeta?.name||'Private deck',faction:p.faction,commanderId:p.commander?.id}))});recentMatches=recentMatches.slice(0,20);
        try{localStorage.setItem('frontlines.recent.v1',JSON.stringify(recentMatches));}catch(_){/* Match play does not require writable history storage. */}
      }
    }else victoryReady=false;
    configureEffects();render();
    if(payload.error)notify(typeof payload.error==='string'?payload.error:payload.error.message||'The command was rejected. Choose a highlighted legal action.',true);
    if(animate&&previous)FX()?.play(previous,state,action,snapshot,{privacy:false,engineEvents:payload.events||[],handPlayer:localSeat(),phaseTitle:actor()===localSeat()?state.response?state.response.stage==='counter'?'YOUR COUNTER WINDOW':'YOUR RESPONSE WINDOW':'YOUR ACTION WINDOW':'WAITING FOR '+seatName(actor()),phaseSubtitle:seatName(actor())+' / ACTION WINDOW '+state.turn});
    else if(isNew)FX()?.phase(state,{handPlayer:localSeat(),phaseTitle:actor()===localSeat()?'YOUR ACTION WINDOW':'WAITING FOR '+seatName(actor()),phaseSubtitle:seatName(actor())+' / ACTION WINDOW '+state.turn});
    return true;
  }
  function endNetworkMatch(screen){
    clearTimeout(aiTimer);clearTimeout(victoryTimer);FX()?.clear();networkMatch=null;state=null;selection=null;inspected=null;modal=null;privacy=false;victoryReady=false;currentScreen=screen==='multiplayer'?'multiplayer':'home';render();
  }
  function inspectNetworkDeck(deck){
    if(!deck)return;const previous=matchOptions;
    matchOptions=matchOptions||{decks:[]};matchOptions.decks[localSeat()]=deck;
    if(!state){const counts={};deck.cards.forEach(id=>counts[id]=(counts[id]||0)+1);openModal({type:'local-network-deck',deck});}
    else openModal({type:'deck',player:localSeat()});
    if(!state)matchOptions=previous;
  }
  function scheduleAI() {
    clearTimeout(aiTimer);aiTimer=null;
    if(currentScreen!=='match'||shellSettingsOpen||(tutorialInMatch&&tutorial?.isGuided())||!isAI()||modal||privacy)return;
    aiTimer=setTimeout(()=>{
      if(currentScreen!=='match'||shellSettingsOpen||!isAI()||modal||privacy)return;
      try {
        const aiOptions={profile:'deck',difficulty:tutorialInMatch?'learning':matchOptions.aiDifficulty||settings.aiDifficulty};
        const decision=window.FrontlinesAI?.explainAction?.(state,aiOptions),action=decision?.action||window.FrontlinesAI?.chooseAction(state,aiOptions);
        if(!action){notify('The AI could not choose an action. Switch to manual control in developer tools or start a new match.',true);return;}
        const result=dispatch(action,decision);
        if(!result.ok){const fallback=E.legalActions(state).find(a=>a.pass||a.type==='endTurn');if(fallback)dispatch(fallback);}
      } catch(error){notify('AI paused: '+error.message,true);}
    },settings.aiSpeed==='fast'?320:settings.aiSpeed==='deliberate'?1700:1000);
  }
  function chooseHand(uid,owner) {
    if(!controllable()){if(!privacy)updateInspection('hand',uid);return;}
    const h=handItem(uid);if(!h)return;
    const keyword=cardDef(h).traits?.find(t=>!seenTips['keyword-'+t]);if(keyword)offerTip('keyword-'+keyword,glossaryText(keyword));
    updateInspection('hand',uid);
    if(owner!==actor()){notify('This hand belongs to the other commander.',true);return;}
    const options=legal.filter(a=>a.handUid===uid);
    if(state.response){const choice=options.find(a=>a.type==='respond'||a.type==='counter');if(choice){dispatch(choice);return;}notify(unavailableReason(cardDef(h),h),true);return;}
    if(!options.length){selection=null;render();notify(unavailableReason(cardDef(h),h),true);return;}
    selection=selection&&selection.kind==='hand'&&selection.uid===uid?null:{kind:'hand',uid};
    if(selection&&cardDef(h).effect?.kind==='adapt'){openModal({type:'adapt',uid});return;}
    render();if(!options.length)notify(unavailableReason(cardDef(h),h),true);
  }
  function chooseUnit(uid) {
    const u=findUnit(uid);if(!u)return;
    if(!controllable()){updateInspection('unit',uid);return;}
    if(state.response){const guard=legal.find(a=>a.guardUid===uid);if(guard){dispatch(guard);return;}updateInspection('unit',uid);notify('Choose a highlighted ready Guard, a valid response card, or pass.',true);return;}
    const selected=selectedActions(), target=selected.find(a=>a.targetUid===uid);
    if(target){
      if(target.sacrificeChoice){selection.sacrificeUid=uid;inspected={kind:'unit',uid};render();notify('Sacrifice cost selected. Choose the highlighted payoff target; nothing is destroyed until you confirm.');return;}
      if(selection?.kind==='commander'&&legal.some(a=>a.type==='commander'&&a.targetUid===uid&&a.territory!==undefined)){selection.targetUid=uid;inspected={kind:'unit',uid};render();notify('Choose a highlighted friendly territory or current objective for this unit.');return;}
      executeAction(target);return;
    }
    if(selection?.kind==='ability'){notify('Choose a highlighted ability target.',true);return;}
    if(selection?.kind==='commander'){notify('Choose a highlighted Commander target.',true);return;}
    if(selection&&selection.kind==='hand'){
      const h=handItem(selection.uid),c=cardDef(h);
      if(c.type==='order'&&legal.some(a=>a.handUid===selection.uid&&a.targetUid)){const error=E.validate(state,{type:'order',handUid:h.uid,targetUid:uid,mode:selection.mode});notify(error||'Select a highlighted legal target.',true);return;}
    }
    if(selection&&selection.kind==='unit'&&u.owner!==actor()) { const error=E.validate(state,{type:'attack',unitUid:selection.uid,targetUid:uid});notify(error||'Select a highlighted legal target.',true);return; }
    inspected={kind:'unit',uid};selection=selection&&selection.kind==='unit'&&selection.uid===uid?null:{kind:'unit',uid};render();
    if(u.owner===actor()&&!selectedActions().length)notify(unitUnavailableReason(u),true);
  }
  function chooseTerritory(id) {
    if(!controllable()||!selection||state.response)return;
    const action=selectedActions().find(a=>a.territory===id);
    if(action){executeAction(action);return;}
    if(selection.kind==='commander'){notify('Choose a highlighted Commander target.',true);return;}
    const candidate=selection.kind==='hand'?{type:'deploy',handUid:selection.uid,territory:id}:{type:'move',unitUid:selection.uid,territory:id};
    if(selection.kind==='hand'&&cardDef(handItem(selection.uid)).type==='order'){notify('Choose a highlighted legal target for this Order.',true);return;}
    notify(E.validate(state,candidate)||'Choose a highlighted territory.',true);
  }
  function downloadLog() {
    const lines=['PROJECT FACTION: FRONTLINES / MATCH REPORT',runtimeLabel(),'AI difficulty: '+(matchOptions.aiDifficulty||'Local human players'),'Seed: '+state.seed,'Factions: '+state.players.map(p=>D.FACTIONS[p.faction].name).join(' vs '),'Configuration: '+JSON.stringify(state.config),'Statistics: '+JSON.stringify(state.stats),'',...state.log.map(e=>'[Turn '+e.turn+'] '+e.text)];
    const url=URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='frontlines-match-'+state.seed+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  app.addEventListener('click',event=>{
    FX()?.unlockAudio();
    if(event.target.dataset.overlay){closeModal();return;}
    const tip=event.target.closest('[data-tip]');if(tip&&!event.target.closest('[data-action]')){showTooltip(tip);return;}
    const node=event.target.closest('[data-action]');if(!node||node.disabled)return;
    const action=node.dataset.action;
    if(networkMatch&&['start','new-match','to-setup','rematch','dev','debug','debug-end','config','save-config','reset-config','tutorial','play-immediately','random-enemy','random-enemy-deck','retry-reward','playtest-report','download-playtest','reveal'].includes(action)){notify('Use the private match controls for this operation.',true);return;}
    if(currentScreen==='match'&&privacy&&action!=='reveal'&&!['home','settings'].includes(action))return;
    if(node.dataset.targetState==='invalid')return;
    switch(action){
      case 'random-enemy':randomOpponent(false);break;
      case 'random-enemy-deck':randomOpponent(true);break;
      case 'start':startMatch();break;
      case 'rules':openModal('rules');break;
      case 'settings':window.FrontlinesShell?.openSettings();break;
      case 'open-multiplayer':window.FrontlinesMultiplayerUI?.open();break;
      case 'home':showScreen('home');break;
      case 'open-play':acknowledgeWelcome();showScreen('play');break;
      case 'play-immediately':acknowledgeWelcome();settings.mode='ai';settings.aiDifficulty='easy';window.FrontlinesShell?.savePreferences({aiDifficulty:'easy'});saveSettings();showScreen('play');break;
      case 'tutorial':startTutorial(true);break;
      case 'dismiss-tip':contextTip=null;render();break;
      case 'manual-topic':manualTopic=node.dataset.topic;render();break;
      case 'recent-matches':openModal('recent');break;
      case 'playtest-report':if(state&&state.winner!=null){victoryDismissed=true;openModal('playtest');}break;
      case 'download-playtest':if(state&&state.winner!=null)downloadPlaytest(node.dataset.format);break;
      case 'config':openModal('config');break;
      case 'log':if(state)openModal('log');break;
      case 'commander':chooseCommander(Number(node.dataset.player));break;
      case 'commander-inspect':openModal({type:'commander',player:Number(node.dataset.player)});break;
      case 'dev':if(settings.developer)openModal('dev');break;
      case 'deck':openModal({type:'deck',player:Number(node.dataset.player)});break;
      case 'enlarge-card':if(!privacy)openModal({type:'inspect',cardId:node.dataset.cardId,unitUid:node.dataset.unitUid});break;
      case 'close-modal':closeModal();break;
      case 'confirm-sacrifice':{if(modal?.type==='sacrifice'&&controllable()){const pending=modal.action;modal=null;const result=dispatch(pending);if(!result.ok)render();}break;}
      case 'new-match':state.winner!=null?toSetup():openModal('new-match');break;
      case 'to-setup':toSetup();break;
      case 'rematch':startMatch({config:matchOptions.config,factions:matchOptions.factions,decks:matchOptions.decks});break;
      case 'review-victory':victoryDismissed=true;render();break;
      case 'retry-reward':if(state?.winner!=null&&!tutorialInMatch&&matchReward?.ok===false){finishProgression();render();}break;
      case 'reveal':revealedPlayer=actor();privacy=false;render();FX()?.phase(state,{handPlayer:actor()});break;
      case 'cancel':selection=null;render();break;
      case 'hand':chooseHand(node.dataset.uid,Number(node.dataset.player));break;
      case 'unit':chooseUnit(node.dataset.uid);break;
      case 'territory':chooseTerritory(Number(node.dataset.territory));break;
      case 'end-turn':if(controllable())dispatch({type:'endTurn'});break;
      case 'pass-response':if(controllable())dispatch({type:state.response.stage==='counter'?'counter':'respond',pass:true});break;
      case 'play-order':{const order=selectedActions().find(a=>a.type==='order'&&!a.targetUid&&a.territory===undefined&&!a.sacrificeChoice);if(order)executeAction(order);break;}
      case 'unit-overwatch':executeAction(legal.find(a=>a.type==='overwatch'&&a.unitUid===node.dataset.uid));break;
      case 'unit-ability':{
        const options=legal.filter(a=>a.type==='ability'&&a.unitUid===node.dataset.uid&&a.abilityId===node.dataset.abilityId);
        if(!options.length||!controllable())break;
        selection={kind:'ability',uid:node.dataset.uid,abilityId:node.dataset.abilityId};
        const direct=options.find(a=>!a.targetUid&&a.territory===undefined&&!a.sacrificeUid);if(direct)executeAction(direct);else render();break;
      }
      case 'adapt-picker':if(selection?.kind==='hand')openModal({type:'adapt',uid:selection.uid});break;
      case 'adapt-mode':if(controllable()&&legal.some(a=>a.handUid===node.dataset.uid&&a.mode===node.dataset.mode)){selection={kind:'hand',uid:node.dataset.uid,mode:node.dataset.mode};closeModal();render();}break;
      case 'reset-config':settings.config={...D.DEFAULT_CONFIG};saveSettings();render();notify('Default balance values restored.');break;
      case 'save-config':{
        const form=document.getElementById('config-form');if(!form.reportValidity())break;
        const result={};new FormData(form).forEach((v,k)=>{result[k]=Number(v);});
        if(result.commandCap<result.startingCommand){notify('Command cap must be at least the starting Command.',true);break;}
        settings.config=result;saveSettings();closeModal();notify('Balance configuration saved for the next match.');break;
      }
      case 'debug':{
        if(!settings.developer)break;
        const player=Number(document.getElementById('dev-player').value), type=node.dataset.debug;
        const previous=state;
        try{const snapshot=FX()?.capture(state,{type:'debug'}),next=E.debug(state,{type,player,unitUid:selection?.kind==='unit'?selection.uid:undefined,amount:type==='presence'?10:type==='damage'?2:1});debugChanges=true;recordTelemetry(previous,next,{type:'debug'},null,{profile:'developer',reason:'Developer mutation: '+type,score:null});transition(next,previous,{type:'debug'},snapshot);if(!privacy&&state.winner==null){modal='dev';render();}}catch(error){notify(error.message,true);}break;
      }
      case 'debug-end':if(settings.developer&&!state.response){modal=null;dispatch({type:'endTurn'});}break;
      case 'export-log':downloadLog();break;
      case 'inspect-card':{
        const c=D.CARDS[node.dataset.uid],detail=document.getElementById('deck-detail');
        if(detail&&c){detail.innerHTML='<strong>'+esc(c.name)+'</strong> · Presence '+c.presence+(c.type==='order'?' · '+esc(c.timing)+' Order':' · Attack '+c.attack+' · Health '+c.health)+'<p>'+esc(c.rulesText)+'</p>'+(c.traits||[]).map(t=>'<p><strong>'+esc(t)+':</strong> '+esc(glossaryText(t))+'</p>').join('');document.querySelectorAll('.deck-grid .selected').forEach(n=>n.classList.remove('selected'));node.classList.add('selected');}break;
      }
    }
  });
  function toSetup(){tutorialInMatch=false;tutorial?.pause();clearTimeout(aiTimer);clearTimeout(victoryTimer);aiTimer=null;FX()?.clear();state=null;currentScreen='play';selection=null;inspected=null;modal=null;privacy=false;victoryReady=false;render();}
  app.addEventListener('change',event=>{
    const node=event.target,key=node.dataset.setting;if(!key)return;
    if(networkMatch&&!['animationSpeed','reducedEffects','reducedShake','sound'].includes(key))return;
    if(key==='avoidLastOpponent'){settings.avoidLastOpponent=node.checked;saveSettings();return;}
    if(key==='faction'){const player=Number(node.dataset.player);settings.factions[player]=node.value;settings.deckIds[player]=node.value+'-starter';settings.commanderIds[player]=null;saveSettings();render();}
    if(key==='deckId'){const player=Number(node.dataset.player);settings.deckIds[player]=node.value;settings.commanderIds[player]=null;saveSettings();render();}
    if(key==='commanderId'){settings.commanderIds[Number(node.dataset.player)]=node.value;saveSettings();render();}
    if(key==='mode'){settings.mode=node.value;saveSettings();render();}
    if(key==='aiDifficulty'){settings.aiDifficulty=node.value;saveSettings();window.FrontlinesShell.savePreferences({aiDifficulty:node.value});render();}
    if(key==='developer'){settings.developer=node.checked;if(!node.checked)settings.bothHands=false;if(state&&node.checked)progressionIneligible=true;saveSettings();}
    if(key==='bothHands'&&settings.developer){settings.bothHands=node.checked;if(state&&node.checked)progressionIneligible=true;saveSettings();if(!node.checked&&settings.mode==='hotseat'){revealedPlayer=null;privacy=true;modal=null;selection=null;inspected=null;}render();}
    if(['animationSpeed','reducedEffects','reducedShake','sound'].includes(key)){settings[key]=key==='animationSpeed'?node.value:node.checked;saveSettings();configureEffects();if(key==='sound'&&node.checked)FX()?.unlockAudio();scheduleAI();}
  });
  function showTooltip(node) {
    if(privacy)return;
    const tip=document.getElementById('field-tooltip');if(!tip)return;
    const rect=node.getBoundingClientRect();tip.textContent=node.dataset.tip;tip.hidden=false;
    const width=tip.getBoundingClientRect().width, height=tip.getBoundingClientRect().height;
    tip.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left+rect.width/2-width/2))+'px';
    tip.style.top=(rect.top-height-9>8?rect.top-height-9:Math.min(innerHeight-height-8,rect.bottom+9))+'px';
  }
  function hideTooltip(){const tip=document.getElementById('field-tooltip');if(tip)tip.hidden=true;}
  function actionNarration(before,after,action,events){
    const player=E.getActor(before),name=D.FACTIONS[before.players[player].faction].name;
    const hand=before.players[player].hand.find(h=>h.uid===action.handUid),unit=before.units.find(u=>u.uid===action.unitUid),target=before.units.find(u=>u.uid===action.targetUid);
    const c=hand?D.CARDS[hand.cardId]:unit?D.CARDS[unit.cardId]:null;
    let text=action.type==='deploy'?name+' deploys '+c.name+' — '+costText(E.actionCost(before,action)):
      action.type==='attack'?name+' attacks '+D.CARDS[target.cardId].name+' in '+before.territories[unit.territory].name:
      action.type==='move'?name+' moves '+c.name+' to '+before.territories[action.territory].name:
      action.type==='order'?name+' plays '+c.name+(action.mode?' / '+c.effect.modes.find(m=>m.id===action.mode)?.label:'')+' — '+costText(E.actionCost(before,action)):
      action.type==='endTurn'?name+' ends the offensive turn':name+(action.pass?' allows combat to continue':' plays a combat response');
    const capture=(events||[]).find(e=>e.type==='capture'),retreats=(events||[]).filter(e=>e.type==='forcedRetreat'),losses=(events||[]).filter(e=>e.type==='forcedElimination');
    if(capture)text=D.FACTIONS[after.players[capture.player].faction].name+' captured '+after.territories[capture.territory].name+'.'+(retreats.length?' '+retreats.length+' defender'+(retreats.length===1?' retreats.':'s retreat.'):'')+(losses.length?' No retreat — '+losses.length+' eliminated.':'');
    return text;
  }
  function difficultyMarkup(){return '<div class="difficulty-picker"><label for="ai-difficulty">AI DIFFICULTY</label><select id="ai-difficulty" data-setting="aiDifficulty" '+(settings.mode!=='ai'?'disabled':'')+'>'+[['easy','Easy — Learning'],['normal','Normal — Standard'],['hard','Hard — Tactical'],['expert','Expert — Command AI']].map(([value,label])=>'<option value="'+value+'" '+(settings.aiDifficulty===value?'selected':'')+'>'+label+'</option>').join('')+'</select><p class="difficulty-note">'+(settings.aiDifficulty==='easy'?'Recommended for your first matches.':'No hidden bonuses. Expert is for experienced commanders.')+'</p></div>';}
  function loadTutorialScenario(next,metadata){
    clearTimeout(aiTimer);clearTimeout(victoryTimer);FX()?.clear();tutorialInMatch=true;settings.mode='ai';settings.developer=false;settings.bothHands=false;
    clearTimeout(toastTimer);const toast=document.getElementById('toast');if(toast){toast.textContent='';toast.classList.remove('visible','error');}
    state=next;currentScreen='match';privacy=false;revealedPlayer=0;selection=null;inspected=null;modal=null;contextTip=null;aiActivity=null;victoryReady=false;victoryDismissed=true;
    matchOptions={seed:next.seed,config:next.config,factions:next.players.map(p=>p.faction),aiDifficulty:'learning',decks:next.players.map(p=>({...p.deckMeta,cards:D.DECKS[p.faction].slice()}))};
    telemetry=null;completedTelemetry=null;telemetryFinished=true;debugChanges=true;render();scheduleAI();
  }
  function startTutorial(resume){
    if(networkMatch){notify('Leave the private match before starting training.',true);return;}
    if(state&&state.winner==null&&!tutorialInMatch&&!window.confirm('Start training and leave the current operation?'))return;
    acknowledgeWelcome();tutorialInMatch=true;tutorial.start({resume:resume!==false});
  }
  function combatPreview(target){
    if(!target||selection?.kind!=='unit'||!state)return '';
    const attacking=findUnit(selection.uid);if(!attacking||attacking.owner===target.owner||attacking.territory!==target.territory)return '';
    const error=E.validate(state,{type:'attack',unitUid:attacking.uid,targetUid:target.uid});if(error)return '<div class="combat-preview">'+esc(error)+'</div>';
    const forecast=E.previewCombat?E.previewCombat(state,attacking,target):null;
    const incoming=forecast?forecast.incoming:E.combatDamage(state,target,E.attackValue(state,attacking,target));let returning=forecast?forecast.returning:E.combatDamage(state,attacking,E.attackValue(state,target));if(!forecast&&E.hasTrait(target,'retaliate')&&cardDef(target).health-target.damage>incoming&&cardDef(attacking).health-attacking.damage>returning)returning++;
    return '<div class="combat-preview"><b>COMBAT PREVIEW · 1 COMMAND ACTION</b><br>'+incoming+' damage to target / '+returning+' retaliation to attacker.<br>Target '+Math.max(0,cardDef(target).health-target.damage-incoming)+' Health; attacker '+Math.max(0,cardDef(attacking).health-attacking.damage-returning)+' Health after exchange.<br>Includes visible protection, tactical statuses and Retaliate. Responses and Guard interception can change this forecast.</div>';
  }
  app.addEventListener('pointerover',event=>{const tip=event.target.closest('[data-tip]');if(tip&&!tip.contains(event.relatedTarget))showTooltip(tip);const node=event.target.closest('[data-inspect]');if(node&&!node.contains(event.relatedTarget))updateInspection(node.dataset.inspect,node.dataset.inspectId);});
  app.addEventListener('pointerout',event=>{const node=event.target.closest('[data-tip]');if(node&&!node.contains(event.relatedTarget))hideTooltip();});
  app.addEventListener('focusin',event=>{const tip=event.target.closest('[data-tip]');if(tip)showTooltip(tip);const node=event.target.closest('[data-inspect]');if(node)updateInspection(node.dataset.inspect,node.dataset.inspectId);});
  app.addEventListener('focusout',hideTooltip);
  window.addEventListener('scroll',hideTooltip,true);
  document.addEventListener('keydown',event=>{
    FX()?.unlockAudio();
    const overlay=document.querySelector('.overlay');
    if(event.key==='Tab'&&overlay){const items=Array.from(overlay.querySelectorAll('button:not(:disabled),input,select,textarea,summary,[tabindex="0"]')).filter(n=>n.offsetParent!==null);const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
    if(shellSettingsOpen)return;
    if(event.key==='Escape'){if(modal)closeModal();else if(selection||inspected){selection=null;inspected=null;render();}else if(currentScreen==='play'||currentScreen==='match')showScreen('home');return;}
    if(currentScreen==='match'&&privacy)return;
    if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)||event.ctrlKey||event.altKey||event.metaKey)return;
    if(event.key.toLowerCase()==='r')openModal('rules');
    if(event.key.toLowerCase()==='l'&&state)openModal('log');
    if((event.key==='Enter'||event.key===' ')&&event.target.classList.contains('legal-zone')){event.preventDefault();chooseTerritory(Number(event.target.dataset.territory));}
  });
  function showScreen(screen) {
    if(!['home','play','multiplayer'].includes(screen))return;
    if(networkMatch&&screen!=='multiplayer'){notify('Leave the private match through its menu controls.',true);return;}
    if(screen==='multiplayer'&&state?.winner===null&&!networkMatch){if(!window.confirm('Leave the current operation to open private multiplayer?'))return;state=null;}
    clearTimeout(aiTimer);aiTimer=null;FX()?.clear();modal=null;selection=null;inspected=null;
    currentScreen=screen==='multiplayer'?'multiplayer':screen==='home'?'home':state&&state.winner==null?'match':'play';
    if(tutorialInMatch){if(currentScreen==='match')tutorial?.resume();else tutorial?.pause();}
    if(currentScreen==='play'&&state)state=null;
    render();if(currentScreen==='match')scheduleAI();
    document.querySelector(currentScreen==='home'?'[data-action="open-play"]':currentScreen==='multiplayer'?'[data-mp="host"]':'[data-action="start"]')?.focus();
  }
  app.addEventListener('click',event=>{const link=event.target.closest('[data-game-navigation]');if(link){event.preventDefault();window.FrontlinesShell?.navigate(link.dataset.gameNavigation);}});
  window.addEventListener('frontlines-settings-opened',()=>{shellSettingsOpen=true;if(tutorialInMatch)tutorial?.pause();clearTimeout(aiTimer);aiTimer=null;FX()?.clear();});
  window.addEventListener('frontlines-settings-closed',()=>{shellSettingsOpen=false;if(tutorialInMatch&&currentScreen==='match')tutorial?.resume();render();scheduleAI();});
  window.addEventListener('frontlines-settings',event=>{Object.assign(settings,event.detail);if(state&&(settings.developer||settings.bothHands))progressionIneligible=true;if(!settings.tutorialHints)contextTip=null;saveSettings();configureEffects();render();scheduleAI();});
  window.addEventListener('frontlines-reset-hints',()=>{seenTips={};contextTip=null;try{localStorage.removeItem('frontlines.tips.v1');}catch(_){}render();});
  window.addEventListener('frontlines-version',event=>{if(event.detail&&Runtime.version!==event.detail){Runtime.version=event.detail;render();}});
  let tutorialStorage;try{tutorialStorage=window.localStorage;}catch(_){}
  tutorial=window.FrontlinesTutorial.create({engine:E,data:D,ai:window.FrontlinesAI,getState:()=>state,loadScenario:loadTutorialScenario,dispatch,render,
    onExit:()=>{tutorialInMatch=false;clearTimeout(aiTimer);state=null;settings.mode='ai';settings.aiDifficulty='easy';currentScreen='play';window.FrontlinesShell?.savePreferences({aiDifficulty:'easy'});render();},
    onComplete:()=>{const reward=Collection?.completeTutorial('frontlines-training');collectionProfile=Collection?.load();notify('Training operation secured. '+(reward?.creditsEarned?'+'+reward.creditsEarned+' Credits. ':'')+'You can replay the tutorial or start an Easy match.');},storage:tutorialStorage,document});
  window.FrontlinesApp={showScreen,refresh:render,beginNetworkMatch,updateNetworkMatch,endNetworkMatch,inspectNetworkDeck,retryNetworkProgression:()=>networkMatch&&state?.winner!==null?updateNetworkMatch(networkMatch):false,getState:()=>state?JSON.parse(JSON.stringify(state)):null,dispatch,startMatch,startTutorial,getTutorialState:()=>tutorial.snapshot(),tutorial,getSettings:()=>JSON.parse(JSON.stringify(settings)),getUIState:()=>({screen:currentScreen,settingsOpen:shellSettingsOpen,privacy,network:!!networkMatch,localSeat:networkMatch?.localSeat,networkStatus:networkMatch?.status,networkPending:!!networkMatch?.pending,actor:state?actor():null,selection,settings:JSON.parse(JSON.stringify(settings))}),getPlaytestReport:()=>state&&state.winner!=null&&!tutorialInMatch&&!networkMatch?playtestReport():null,getRecentMatches:()=>JSON.parse(JSON.stringify(recentMatches)),getMatchReward:()=>matchReward?JSON.parse(JSON.stringify(matchReward)):null,getCollection:()=>Collection?.load()};
  configureEffects();
  render();
  if(currentScreen==='multiplayer')window.FrontlinesMultiplayerUI?.open();
})();
