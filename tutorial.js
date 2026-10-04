/* Guided training uses the authoritative rules engine. Lesson fixtures arrange
 * real starter-deck cards; they never create cards, modify printed stats, or
 * enter competitive reports. Only the final lesson is an open Learning match. */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const runtime=node?require('./balance.js').createRuntime(require('./balance.js').DEFAULT_PROFILE):null;
  const api=factory(node?runtime.data:root.FrontlinesData,node?runtime.engine:root.FrontlinesEngine,node?require('./commanders.js'):root.FrontlinesCommanders);
  if(node)module.exports=api;
  root.FrontlinesTutorial=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(Base,Engine,Commanders){
  'use strict';
  const STORAGE_KEY='frontlines.tutorial.v1';
  const VERSION=2,TRAINING_INDEX=13;
  const copy=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const LESSONS=Object.freeze([
    {id:'the-front',title:'Read the front',objective:'Find your blue territory, their orange territory, and the neutral center.',why:'Territory wins the operation. Push the active objective toward the enemy home; your units turn battlefield Presence into capture progress.',hints:['The blue P1 markers belong to you.','The orange outline marks the current objective. It begins in neutral Downtown.','Your connected ground runs from Western Command to Industrial District.'],targets:['.territory[data-territory="2"]','.territory[data-territory="3"]','.territory[data-territory="4"]']},
    {id:'your-turn',title:'Two different resources',objective:'Select Line Rifle Squad in your hand. Deploy it into Industrial District, your forward territory.',why:'Capacity pays for your forces. An ordinary deployment commits Presence without spending a Command Action. Keep your three commands for tactical decisions.',hints:['Your hand is beside the battlefield. Look for Line Rifle Squad.','Select that card, then select your blue forward territory.','Deploy Line Rifle Squad into sector 03: Industrial District.'],targets:['.player-hud.p1','.hand-area','.territory[data-territory="2"]']},
    {id:'deployment',title:'Choose a position',objective:'Deploy Route Pathfinder into Industrial District.',why:'Units start on controlled ground. Forward deployment leaves a short route to the objective. This Mobile unit stays ready after its first move each turn.',hints:['Select Route Pathfinder, the unit with Mobile.','The neutral center is not a legal deployment zone. Start on connected blue ground.','Select Route Pathfinder, then Industrial District in sector 03.'],targets:['.hand-area','.territory[data-territory="2"]']},
    {id:'commands',title:'Spend a command',objective:'Deploy the Rifle Squad into Industrial District, then have the existing center Rifle Squad attack the wounded Assault Squad.',why:'Deploying spends Capacity. Attacking spends one Command Action and exhausts the attacker. A newly deployed unit normally cannot attack immediately.',hints:['First deploy the Rifle Squad from your hand into the blue forward territory.','There is already a ready Rifle Squad in Downtown. It can attack now.','Select your center Rifle Squad, then the enemy Assault Squad in the same territory.'],targets:['.hand-area','.turn-hud','.territory[data-territory="3"]']},
    {id:'combat',title:'Read an exchange',objective:'Select your Bastion Heavy in Downtown, then attack the wounded Scarred Brawler.',why:'Both units deal damage in the same exchange. Your Heavy can finish this wounded defender and survive the retaliation. The defender gets a response window before damage resolves.',hints:['Attack and remaining Health are shown on each unit. Wounds persist.','Select Bastion Heavy. Its target must be in the same territory.','Select Bastion Heavy, then the wounded Scarred Brawler. The training opponent will pass its response.'],targets:['.territory[data-territory="3"]']},
    {id:'territory',title:'Turn Presence into ground',objective:'Move Route Pathfinder from Industrial District into Downtown, then end your turn.',why:'Surviving forces on the active objective add their printed Presence to capture progress at turn end. In this small lesson, one Pathfinder supplies the entire capture threshold.',hints:['Select the ready Route Pathfinder on your forward territory.','Moving is a major command. Move one adjacent sector into Downtown.','Move your Pathfinder into Downtown, then use End Turn. Watch the control marker and the frontline.'],targets:['.territory[data-territory="2"]','.territory[data-territory="3"]','[data-action="end-turn"]']},
    {id:'retreat',title:'No units left behind',objective:'End your turn to capture Downtown. Watch the surviving enemy retreat. Then test a blocked retreat.',why:'A capture resolves defenders immediately. Surviving units retreat one adjacent territory toward their own home, into friendly ground with an open slot. Units with no legal retreat are eliminated.',hints:['Your forces already supply enough Presence to capture this objective.','The surviving Brawler can retreat into its friendly Transit Exchange.','End Turn. After the retreat, use Set up encirclement to see what happens when its destination is full.'],targets:['.territory[data-territory="3"]','.territory[data-territory="4"]','[data-action="end-turn"]']},
    {id:'orders',title:'Play an Order',objective:'Select Defensive Fire, then target the wounded enemy Brawler.',why:'This tactical Order deals damage, spends Capacity until your next turn, and consumes one Command Action. The unit is removed only if its remaining Health is exhausted.',hints:['Defensive Fire is an Order in your hand, not a unit to deploy.','A damage Order targets an enemy battlefield card. Check its remaining Health.','Select Defensive Fire, then the enemy Scarred Brawler in Downtown.'],targets:['.hand-area','.territory[data-territory="3"]','.turn-hud']},
    {id:'factions',title:'Five ways to fight',objective:'Inspect at least one example card below. Every faction uses the same battlefield, but its tools shape a different plan.',why:'Stonewall holds ground. Bruiser breaks lines. Syndicate coordinates. Nightwalker disrupts. Rogue adapts. Your deck explores one part of that identity.',hints:['The five faction buttons show representative real cards.','Compare their keywords and their Presence commitments.','Select any faction to inspect its example, then continue.'],targets:['.territory[data-territory="3"]']},
    {id:'guided-turn',title:'Your plan, your turn',objective:'Capture Downtown this turn. Choose which force to move into the center, then end your turn.',why:'You now choose the sequence. Either ready unit can supply this lesson’s capture threshold. You may also deploy another ordinary unit and move it forward. The objective matters more than one prescribed combination.',hints:['Look at the capture threshold and your units on the forward territory.','A unit contributes Presence only when it reaches the active objective.','Move either your Rifle Squad or Route Pathfinder into Downtown, then End Turn.'],targets:['.territory[data-territory="2"]','.territory[data-territory="3"]','[data-action="end-turn"]']},
    {id:'commander-passive',title:'Meet your Commander',objective:'The Warden leads your Stonewall deck. Read Hold Fast in the Commander panel, then end your turn. Watch your wounded Heavy recover when your next offensive turn starts.',why:'Your Commander stays outside the lanes and costs no deck slot or committed Presence. Hold Fast is automatic: at the start of your offensive turn it heals 1 damage from every allied card on ground you control. The scripted opponent will pass.',hints:['Both Commander panels sit between resources and the battlefield. The Warden is your named leader.','Your Heavy on Industrial District starts with 2 damage. The passive needs no activation or Command Action.','Use End Turn, observe the enemy pass, then compare the Heavy’s remaining Health when your turn returns.'],targets:['[data-commander-player="0"]','.territory[data-territory="2"]','[data-action="end-turn"]']},
    {id:'commander-active',title:'Issue your signature command',objective:'Activate The Warden’s Lasting Resolve, then select your wounded Bastion Heavy on Industrial District.',why:'An active is a deliberate decision. Lasting Resolve costs 2 available Capacity and 1 Command Action, heals 3 damage and grants temporary Armor 1. You have one use for the entire match: the panel becomes spent after a successful activation.',hints:['Look for Lasting Resolve on your P1 Commander panel. Its cost is printed below the name.','Select the active. The wounded allied Heavy becomes a highlighted legal target.','Click Lasting Resolve, then the Heavy in Industrial District. Check its Health, Armor, resources and the spent Commander button.'],targets:['[data-commander-player="0"]','.territory[data-territory="2"]']},
    {id:'commander-deckbuilding',title:'Choose how your faction fights',objective:'Compare The Warden and The Marshal below, then choose the Commander you want for the final training operation.',why:'One faction supports different plans. The Warden rewards holding friendly ground with durable, fortified forces. The Marshal rewards units that survive defending, then turns survivors into a counterattack. Your Commander belongs alongside your 26 cards; choose synergy, not a rarity advantage. Arsenal offers a ready foundation for each leader.',hints:['Both launch Commanders are free. Your collection never needs a pack to test them.','Read each leader’s passive, active and deckbuilding direction. Think about the card roles you would add.','Choose The Warden or The Marshal below, then Continue. That leader will actually command your final training match.'],targets:['[data-commander-player="0"]']},
    {id:'training',title:'Take command',objective:'Win a short real operation against Learning AI. Capture Downtown to secure this training battlefield.',why:'Play your own turns. The opponent follows the same card stats, Capacity and command rules. This training operation ends after four territories; ordinary matches continue toward the enemy home.',hints:['Deploy ordinary units into your forward territory; you can keep deploying when Command Actions are spent.','Move surviving forces onto Downtown. Capture progress accumulates at the end of your turns.','Build enough Presence on the objective, remove dangerous defenders when useful, and end your turn. You need 16 capture progress.'],targets:[]}
  ]);
  const FACTION_EXAMPLES={stonewall:'stonewall_rifles',bruiser:'bruiser_assault',syndicate:'syndicate_coordinator',nightwalker:'nightwalker_blade',rogue:'rogue_outrider'};
  const FACTION_COPY={stonewall:'Fortification, defense and attrition. Hold a position, then advance deliberately.',bruiser:'Frontal pressure and breakthrough. Act quickly, and protect your force if the assault stalls.',syndicate:'Combined arms and efficient coordination. Give each piece a useful job.',nightwalker:'Disruption, timing and selective attacks. Remove the piece that makes an enemy plan work.',rogue:'Movement, recovery and improvisation. Change your plan as the front shifts.'};

  function progress(storage){
    const empty={version:VERSION,index:0,started:false,complete:false,completedLessons:[],commanderId:'commander_stonewall_warden'};
    try{
      const value=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(!value||![1,VERSION].includes(value.version))return empty;
      const legacy=value.version===1;
      let index=legacy&&(value.complete||value.index>=10)?10:Number.isInteger(value.index)?Math.max(0,Math.min(TRAINING_INDEX,value.index)):0;
      const completedLessons=Array.isArray(value.completedLessons)?Array.from(new Set(value.completedLessons.filter(i=>Number.isInteger(i)&&i>=0&&i<(legacy?10:LESSONS.length)))):[];
      const taught=[10,11,12].every(i=>completedLessons.includes(i));if(index===TRAINING_INDEX&&!taught)index=10;
      return {version:VERSION,index,started:!!value.started||legacy&&!!value.complete,complete:!legacy&&!!value.complete&&taught,completedLessons,commanderId:['commander_stonewall_warden','commander_stonewall_marshal'].includes(value.commanderId)?value.commanderId:'commander_stonewall_warden'};
    }catch(_){return empty;}
  }

  function createFixture(index,options){
    options=options||{};
    const D=options.data||Base,E=options.engine||Engine,phase=options.phase||0;
    if(!Number.isInteger(index)||index<0||index>=LESSONS.length)throw Error('Choose a valid tutorial lesson.');
    const training=index===TRAINING_INDEX;
    const state=E.createGame({factions:['stonewall','bruiser'],decks:[{id:'tutorial-stonewall',name:'Stonewall training',faction:'stonewall',cards:D.DECKS.stonewall.slice(),commanderId:training?(options.commanderId||'commander_stonewall_warden'):'commander_stonewall_warden'},{id:'tutorial-bruiser',name:'Bruiser training',faction:'bruiser',cards:D.DECKS.bruiser.slice(),commanderId:'commander_bruiser_breaker'}],seed:607000+index*101+phase,
      config:{startingCommand:training?24:40,commandCap:training?60:80,commandGrowth:training?5:10,captureThreshold:training?16:12,startingHand:5,drawCount:training?1:0,slotsPerTerritory:5,actionLimit:3,victoryTerritories:training?4:7}});
    // Fixtures rebuild only the arrangement of the original legal inventories.
    // Every card below is taken from its 26-card starter list, never cloned.
    state.units=[];
    state.players.forEach(p=>{p.hand=[];p.discard=[];p.deck=D.DECKS[p.faction].slice();p.deckMeta={id:'tutorial-'+p.faction,name:training?'Learning '+D.FACTIONS[p.faction].name:'Lesson fixture '+D.FACTIONS[p.faction].name,faction:p.faction,archetype:'learning',commanderId:p.commander?.id};});
    const refs={};
    function take(player,id){const p=state.players[player],at=p.deck.indexOf(id);if(at<0)throw Error('Tutorial fixture exceeded its actual deck inventory: '+id);p.deck.splice(at,1);return {uid:'c'+state.nextUid++,cardId:id};}
    function hand(id,name){const item=take(0,id);state.players[0].hand.push(item);if(name)refs[name]=item.uid;return item;}
    function field(player,id,territory,name,damage){const item=take(player,id);const unit={...item,owner:player,territory,damage:damage||0,ready:true,deployedTurn:0,movedTurn:-1};state.units.push(unit);if(name)refs[name]=unit.uid;return unit;}
    switch(index){
      case 0:hand('stonewall_rifles','deploy');hand('stonewall_pathfinder');break;
      case 1:hand('stonewall_rifles','deploy');hand('stonewall_heavy');hand('stonewall_brace');break;
      case 2:hand('stonewall_pathfinder','deploy');hand('stonewall_rifles');hand('stonewall_fire_support');break;
      case 3:{
        hand('stonewall_rifles','deploy');
        const attacker=field(0,'stonewall_rifles',3,'attacker');
        const attack=E.attackValue(state,attacker);
        field(1,'bruiser_assault',3,'enemy',Math.max(0,D.CARDS.bruiser_assault.health-attack));break;
      }
      case 4:{
        const attacker=field(0,'stonewall_heavy',3,'attacker');
        const attack=E.attackValue(state,attacker);
        field(1,'bruiser_brawler',3,'enemy',Math.max(1,D.CARDS.bruiser_brawler.health-attack));break;
      }
      case 5:field(0,'stonewall_pathfinder',2,'mover');state.config.captureThreshold=D.CARDS.stonewall_pathfinder.presence;break;
      case 6:{
        const a=field(0,'stonewall_heavy',3,'attacker'),b=field(0,'stonewall_rifles',3,'support');
        field(1,'bruiser_brawler',3,'enemy');
        state.config.captureThreshold=D.CARDS[a.cardId].presence+D.CARDS[b.cardId].presence;
        if(phase===1){for(let i=0;i<4;i++)field(1,'bruiser_assault',4,'blocker'+i);field(1,'bruiser_brawler',4,'blocker4');}
        break;
      }
      case 7:hand('stonewall_fire_support','order');field(0,'stonewall_rifles',2);field(1,'bruiser_brawler',3,'enemy',Math.max(0,D.CARDS.bruiser_brawler.health-D.CARDS.stonewall_fire_support.effect.amount));break;
      case 8:hand('stonewall_rifles');break;
      case 9:field(0,'stonewall_rifles',2,'firstChoice');field(0,'stonewall_pathfinder',2,'secondChoice');hand('stonewall_rifles','deploy');state.config.captureThreshold=Math.min(D.CARDS.stonewall_rifles.presence,D.CARDS.stonewall_pathfinder.presence);break;
      case 10:field(0,'stonewall_heavy',2,'passiveAlly',2);break;
      case 11:field(0,'stonewall_heavy',2,'activeAlly',3);break;
      case 12:hand('stonewall_defender');hand('stonewall_heavy');break;
      case 13:
        hand('stonewall_rifles');hand('stonewall_rifles');hand('stonewall_pathfinder');hand('stonewall_heavy');hand('stonewall_triage');
        // A declared known opening hand makes this instructional match readable.
        // The opponent has the same fair Capacity and legal 26-card inventory.
        for(const id of ['bruiser_assault','bruiser_brawler','bruiser_heavy','bruiser_resupply','bruiser_rally'])state.players[1].hand.push(take(1,id));
        break;
    }
    state.log.push({turn:state.turn,type:'tutorial',text:training?'TRAINING OPERATION: known legal starter hands; first player to control four territories wins. Learning AI uses the same rules.':'GUIDED LESSON FIXTURE: real starter cards have been arranged for this exercise. This is not a normal or competitive match.'});
    E.assertInvariants(state);
    assertInventory(state,D);
    return {state,refs,metadata:{lesson:LESSONS[index].id,index,training,nonCompetitive:true,scenario:true}};
  }

  function assertInventory(state,D){
    D=D||Base;
    state.players.forEach((p,owner)=>{
      const actual=p.deck.concat(p.discard,p.hand.map(c=>c.cardId),state.units.filter(u=>u.owner===owner).map(u=>u.cardId)).sort();
      const expected=D.DECKS[p.faction].slice().sort();
      if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Tutorial must conserve every card in the legal starter deck.');
    });
    return true;
  }

  function create(options){
    options=options||{};
    const D=options.data||Base,E=options.engine||Engine;
    const doc=options.document||(typeof document==='object'?document:null);
    let storage=options.storage;
    if(!storage)try{if(typeof localStorage==='object')storage=localStorage;}catch(_){}
    let saved=progress(storage),commanderChoice=saved.commanderId,active=false,paused=false,index=saved.index,phase=0,stage=0,complete=false,hintLevel=0,feedback='',refs={},example=null,inspectedExample=false,timer=null,generation=0,focusKey='',pendingFinish=false;
    const clearTimer=()=>{if(timer!==null){clearTimeout(timer);timer=null;}generation++;};
    const current=()=>options.getState?.();
    function persist(){saved={version:VERSION,index,started:true,complete:saved.complete,completedLessons:saved.completedLessons||[],commanderId:commanderChoice,updatedAt:new Date().toISOString()};try{storage?.setItem(STORAGE_KEY,JSON.stringify(saved));}catch(_){} }
    function markLesson(){if(!saved.completedLessons.includes(index))saved.completedLessons.push(index);persist();}
    function load(){
      clearTimer();stage=0;complete=index===0;hintLevel=0;feedback='';example=null;inspectedExample=false;pendingFinish=false;focusKey='';
      const fixture=createFixture(index,{data:D,engine:E,phase,commanderId:commanderChoice});refs=fixture.refs;
      options.loadScenario?.(fixture.state,fixture.metadata);
      mount();return fixture.state;
    }
    function start(request){
      request=request||{};saved=progress(storage);commanderChoice=saved.commanderId;active=true;paused=false;
      const continuing=request.resume&&!saved.complete;
      index=continuing?saved.index:0;
      if(!continuing){saved.complete=false;saved.completedLessons=[];}
      phase=0;persist();return load();
    }
    function restartLesson(){if(!active)return;phase=0;return load();}
    function restart(){active=true;paused=false;index=0;phase=0;saved={version:VERSION,index:0,started:true,complete:false,completedLessons:[]};persist();return load();}
    function exit(reason){clearTimer();active=false;paused=false;cleanup();persist();options.onExit?.(reason||'skip');}
    function pause(){paused=true;clearTimer();cleanup();}
    function resume(){if(!active)return;paused=false;mount();}
    function enough(state){return E.unitsAt(state,state.contested,0).reduce((n,u)=>n+D.CARDS[u.cardId].presence,0)+state.territories[state.contested].progress[0]>=state.config.captureThreshold;}
    function lessonPermit(state,action){
      if(index===TRAINING_INDEX)return true;
      if(complete)return false;
      if(index===0||index===8||index===12)return false;
      if(index===10)return stage===0&&action.type==='endTurn';
      if(index===11)return action.type==='commander'&&action.targetUid===refs.activeAlly;
      if(index===1||index===2)return action.type==='deploy'&&action.handUid===refs.deploy&&action.territory===2;
      if(index===3)return stage===0?action.type==='deploy'&&action.handUid===refs.deploy&&action.territory===2:action.type==='attack'&&action.unitUid===refs.attacker&&action.targetUid===refs.enemy;
      if(index===4)return action.type==='attack'&&action.unitUid===refs.attacker&&action.targetUid===refs.enemy;
      if(index===5)return stage===0?action.type==='move'&&action.unitUid===refs.mover&&action.territory===3:action.type==='endTurn';
      if(index===6)return action.type==='endTurn';
      if(index===7)return action.type==='order'&&action.handUid===refs.order&&action.targetUid===refs.enemy;
      if(index===9)return action.type!=='endTurn'||enough(state);
      return false;
    }
    function beforeAction(action,decision){
      if(!active)return {ok:true};
      const state=current();
      if(paused)return {ok:false,error:'Your tutorial is paused. Resume it from the Command menu.'};
      if(!state)return {ok:false,error:'Restart this lesson to restore its training battlefield.'};
      const error=E.validate(state,action);
      if(error)return {ok:false,error};
      if(index===TRAINING_INDEX)return {ok:true};
      const automatic=!!decision?.tutorialAutomatic;
      if(automatic&&index===10&&stage===1&&E.getActor(state)===1&&action.type==='endTurn')return {ok:true};
      if(automatic&&E.getActor(state)===1&&state.response&&action.type==='respond'&&action.pass===true)return {ok:true};
      if(E.getActor(state)!==0)return {ok:false,error:'The training opponent is resolving this response. Your next decision follows shortly.'};
      if(lessonPermit(state,action))return {ok:true};
      feedback=complete?'Lesson complete. Continue when you are ready.':index===9&&action.type==='endTurn'?'Move enough Presence into Downtown before ending this guided turn. Hint and Restart lesson are always available.':'For this exercise: '+LESSONS[index].objective;
      mount();return {ok:false,error:feedback};
    }
    function afterAction(before,after,action,events){
      if(!active||paused)return;
      events=events||[];
      if(index===TRAINING_INDEX){
        if(after.winner===0&&[10,11,12].every(i=>saved.completedLessons.includes(i))){complete=true;feedback='Territory secured. You won an actual operation using the same rules as the opponent.';saved.complete=true;markLesson();pendingFinish=true;}
        else if(after.winner===1){feedback='The Learning opponent secured this operation. Nothing is lost: restart this training match and try a different sequence.';}
        else if(E.getActor(after)===0&&!after.response){
          if(after.actionsLeft===0&&after.players[0].hand.some(c=>D.CARDS[c.cardId].commandCost===0&&D.CARDS[c.cardId].presence<=E.presence(after,0).available))feedback='Your commands are spent, but affordable Free Action cards can still be deployed.';
          else if(enough(after))feedback='Your forces can capture on End Turn if they remain here. A capture sends surviving defenders back to friendly ground.';
          else if(!E.unitsAt(after,after.contested,0).length)feedback='Your forces need to reach the objective to generate capture progress. Deployment alone does not take ground.';
          else feedback='Your surviving objective Presence contributes when you end your turn. Capture progress accumulates.';
        }
        return;
      }
      if(index===10){if(before.attacker===0&&action.type==='endTurn'){stage=1;feedback='Your turn ended. The training opponent passes; watch Hold Fast repair your Heavy when you regain initiative.';}if(before.attacker===1&&after.attacker===0&&after.units.find(u=>u.uid===refs.passiveAlly)?.damage===1){complete=true;feedback='Hold Fast triggered automatically: your Heavy healed 1 damage on friendly ground. No Capacity or Command Action was spent on the passive.';}}
      if(index===11&&action.type==='commander'&&after.players[0].commander?.used){complete=true;feedback='Lasting Resolve healed your Heavy, granted temporary Armor and spent 2 Capacity / 1 Command Action. The active is now spent for this entire match. Your passive keeps working.';}
      if(index===1||index===2){complete=true;const cost=E.actionCost?E.actionCost(before,action):{commandActions:before.actionsLeft-after.actionsLeft};feedback=D.CARDS[before.players[0].hand.find(h=>h.uid===action.handUid).cardId].presence+' Presence is now committed. '+cost.commandActions+' Command Actions spent; '+after.actionsLeft+' remain.';}
      if(index===3&&stage===0&&action.type==='deploy'){stage=1;feedback='Capacity changed; your Command Actions stayed available. Now select the established center Rifle Squad and its enemy target.';}
      if((index===3&&stage===1||index===4)&&events.some(e=>e.type==='combat')){complete=true;const damaged=after.units.find(u=>u.uid===refs.attacker);feedback='Combat resolved: '+(after.units.some(u=>u.uid===refs.enemy)?'the defender survived.':'the defender was eliminated and its committed Presence was freed.')+(damaged?' Your attacker survives with '+(D.CARDS[damaged.cardId].health-damaged.damage)+' Health.':' Your attacker was also eliminated.');}
      if(index===5){if(action.type==='move'){stage=1;feedback='Your Pathfinder reached the objective. Its '+D.CARDS.stonewall_pathfinder.presence+' Presence will contribute at turn end.';}if(events.some(e=>e.type==='capture'&&e.player===0)){complete=true;feedback='Downtown is yours. The frontline advanced one sector and your surviving mobile force followed the breakthrough.';}}
      if(index===6&&events.some(e=>e.type==='capture'&&e.player===0)){
        if(phase===0&&events.some(e=>e.type==='forcedRetreat')){stage=1;feedback='The surviving Brawler retreated into friendly Transit Exchange. Its Presence remains committed: retreat is not destruction.';}
        else if(phase===1&&events.some(e=>e.type==='forcedElimination')){complete=true;feedback='NO RETREAT: Transit Exchange was full. The Brawler was eliminated, its card entered casualties, and its committed Presence was freed.';}
        else{feedback='Capture happened, but the expected retreat did not resolve. Restart this lesson to restore the fixture.';}
      }
      if(index===7&&action.type==='order'){complete=true;feedback='Defensive Fire resolved. Its Capacity is temporarily spent; your next turn refreshes it. One Command Action was consumed.';}
      if(index===9&&events.some(e=>e.type==='capture'&&e.player===0)){complete=true;feedback='You captured Downtown with your own sequence. In a full match, keep planning around the next objective.';}
      if(complete)markLesson();
    }
    function next(){
      if(!active)return;
      if(index===TRAINING_INDEX&&current()?.winner===1){restartLesson();return;}
      if(index===6&&stage===1&&!complete){phase=1;load();feedback='Encirclement fixture: the enemy destination is full. End Turn and watch the no-retreat resolution.';mount();return;}
      if(index===8&&inspectedExample)complete=true;
      if(!complete){feedback='Finish this objective first, or use Hint. You can restart or skip at any time.';mount();return;}
      markLesson();
      if(index===TRAINING_INDEX){exit('complete');return;}
      index++;phase=0;persist();load();
    }
    function inspectFaction(id){if(index!==8||!D.FACTIONS[id])return;example=id;inspectedExample=true;complete=true;feedback='Example inspected. Compare another faction, or continue when ready.';mount();}
    function chooseCommander(id){if(index!==12||!['commander_stonewall_warden','commander_stonewall_marshal'].includes(id))return;commanderChoice=id;complete=true;feedback=Commanders.get(id).name+' will lead your final training deck. Its passive and active reward this leader’s deckbuilding direction.';persist();mount();}
    function hint(){hintLevel=Math.min(3,hintLevel+1);mount();}
    function snapshot(){return {active,paused,index,lesson:LESSONS[index].id,phase,stage,complete,hintLevel,feedback,refs:copy(refs),progress:copy(saved),training:index===TRAINING_INDEX,commanderId:commanderChoice};}
    function cleanup(){
      if(!doc)return;
      doc.getElementById('tutorial-coach')?.remove();doc.body.classList.remove('tutorial-active');
      doc.querySelectorAll('.tutorial-focus').forEach(n=>{n.classList.remove('tutorial-focus');n.removeAttribute('data-tutorial-highlight');n.removeAttribute('aria-describedby');});
    }
    function targets(){
      if(index===1||index===2)return ['[data-action="hand"][data-uid="'+refs.deploy+'"]','.territory[data-territory="2"]'];
      if(index===3)return stage===0?['[data-action="hand"][data-uid="'+refs.deploy+'"]','.territory[data-territory="2"]']:['[data-action="unit"][data-uid="'+refs.attacker+'"]','[data-action="unit"][data-uid="'+refs.enemy+'"]'];
      if(index===4)return ['[data-action="unit"][data-uid="'+refs.attacker+'"]','[data-action="unit"][data-uid="'+refs.enemy+'"]'];
      if(index===5)return stage===0?['[data-action="unit"][data-uid="'+refs.mover+'"]','.territory[data-territory="3"]']:['[data-action="end-turn"]'];
      if(index===11)return ['[data-action="commander"][data-player="0"]','[data-action="unit"][data-uid="'+refs.activeAlly+'"]'];
      if(index===7)return ['[data-action="hand"][data-uid="'+refs.order+'"]','[data-action="unit"][data-uid="'+refs.enemy+'"]'];
      return LESSONS[index].targets;
    }
    function exampleMarkup(){
      const faction=example||'stonewall',c=D.CARDS[FACTION_EXAMPLES[faction]],art=typeof globalThis==='object'?globalThis.FrontlinesArt?.get(c):null;
      return '<div class="tutorial-factions" aria-label="Faction examples">'+Object.keys(FACTION_EXAMPLES).map(id=>'<button type="button" data-tutorial-faction="'+id+'" class="'+(faction===id?'selected':'')+'" aria-pressed="'+(faction===id)+'" style="--example-color:'+D.FACTIONS[id].color+'">'+esc(D.FACTIONS[id].name)+'</button>').join('')+'</div><div class="tutorial-example" style="--example-color:'+D.FACTIONS[faction].color+'">'+(art?'<div class="tutorial-example-art" role="img" aria-label="'+esc(art.alt)+'" style="background-image:url(&quot;'+esc(art.src)+'&quot;);background-position:'+art.position+'"></div>':'')+'<strong>'+esc(c.name)+'</strong><span>'+c.presence+' P / '+c.attack+' ATK / '+c.health+' HP</span><p>'+esc(FACTION_COPY[faction])+'</p><p class="tutorial-example-rules">'+esc(c.rulesText)+'</p></div>';
    }
    function commanderTeachingMarkup(){
      if(index!==12)return '';
      const cmd=Commanders.get(commanderChoice);
      return '<div class="tutorial-commander-choice" aria-label="Choose your training Commander">'+Commanders.list('stonewall').map(c=>'<button type="button" data-tutorial-commander="'+c.id+'" aria-pressed="'+(c.id===commanderChoice)+'"><b>'+esc(c.name)+'</b><br>'+esc(c.role)+'</button>').join('')+'</div><div class="tutorial-commander-copy"><h3>'+esc(cmd.name)+' · '+esc(cmd.passive.name)+'</h3><p>'+esc(cmd.passive.text)+'</p><h3>'+esc(cmd.active.name)+'</h3><p>'+esc(cmd.active.text)+'</p><p><b>Deckbuilding:</b> '+esc(cmd.hook.text)+'</p><p>Both Commanders are outside the 26-card list. A ready-to-play foundation is available for each in Arsenal.</p></div>';
    }
    function coachMarkup(){
      const lesson=LESSONS[index],state=current(),win=index===TRAINING_INDEX&&state?.winner===0,loss=index===TRAINING_INDEX&&state?.winner===1,retreatSetup=index===6&&stage===1&&!complete;
      const heading=win?'Training secured':lesson.title;
      const objective=index===6&&phase===1?'End your turn. The defender cannot retreat into its full friendly territory.':lesson.objective;
      let combat='';
      if((index===3&&stage===1||index===4)&&!complete&&state){const a=state.units.find(u=>u.uid===refs.attacker),b=state.units.find(u=>u.uid===refs.enemy);if(a&&b)combat='<div class="tutorial-combat-preview"><span>YOUR ATTACK <b>'+E.attackValue(state,a)+'</b></span><span>ENEMY HEALTH <b>'+(D.CARDS[b.cardId].health-b.damage)+'</b></span><span>RETALIATION <b>'+E.attackValue(state,b)+'</b></span><span>YOUR HEALTH <b>'+(D.CARDS[a.cardId].health-a.damage)+'</b></span></div>';}
      return '<header class="tutorial-coach-header"><span>FIELD TRAINING / '+String(index+1).padStart(2,'0')+' OF '+LESSONS.length+'</span><h2>'+esc(heading)+'</h2><div class="tutorial-progress" aria-label="Lesson '+(index+1)+' of '+LESSONS.length+'">'+LESSONS.map((_,i)=>'<i class="'+(i===index?'current':saved.completedLessons.includes(i)?'done':'')+'"></i>').join('')+'</div></header><div class="tutorial-coach-body"><p id="tutorial-objective" class="tutorial-objective">'+esc(objective)+'</p><p class="tutorial-why">'+esc(lesson.why)+'</p>'+combat+(index===8?exampleMarkup():'')+commanderTeachingMarkup()+'<div class="tutorial-feedback '+(complete?'success':'')+'" role="status" aria-live="polite">'+esc(feedback||(index===0?'Look for P1, P2 and the orange objective outline. Then continue.':index===TRAINING_INDEX?'Learning AI has no hidden bonuses. This is a shortened training objective, not a competitive result.':'Try the highlighted controls.'))+'</div>'+(hintLevel?'<div class="tutorial-hint"><strong>HINT '+hintLevel+' / 3</strong><p>'+esc(lesson.hints[hintLevel-1])+'</p></div>':'')+'<div class="tutorial-lesson-actions"><button type="button" data-tutorial-action="hint" '+(hintLevel===3?'disabled':'')+'>'+(hintLevel?'Next hint':'Hint')+'</button><button type="button" class="tutorial-continue" data-tutorial-action="next" '+(!(complete||retreatSetup)&&!win?'disabled':'')+'>'+(win?'Finish tutorial':retreatSetup?'Set up encirclement':complete?'Continue →':loss?'Try again':'Complete objective')+'</button></div></div><footer class="tutorial-coach-footer"><button type="button" data-tutorial-action="restart-lesson">Restart lesson</button><details><summary>Training options</summary><button type="button" data-tutorial-action="restart-all">Restart tutorial</button><button type="button" data-tutorial-action="skip">Skip tutorial</button></details></footer>';
    }
    function mount(){
      if(!doc)return;
      const host=doc.querySelector('.game');
      if(!active||paused||!host){cleanup();return;}
      doc.body.classList.add('tutorial-active');
      let rail=doc.getElementById('tutorial-coach');
      if(!rail){rail=doc.createElement('aside');rail.id='tutorial-coach';rail.className='tutorial-coach';rail.setAttribute('aria-label','Guided playable tutorial');host.appendChild(rail);}
      const previousAction=rail.contains(doc.activeElement)?doc.activeElement.dataset.tutorialAction:null;
      rail.innerHTML=coachMarkup();
      // Show the immediate combat decision before longer explanation, keeping
      // all forecast values visible even in the minimum-height coach rail.
      const forecast=rail.querySelector('.tutorial-combat-preview'),why=rail.querySelector('.tutorial-objective');
      if(forecast&&why)why.parentNode.insertBefore(forecast,why);
      // Primary teaching controls stay outside the text scroller, so the hint
      // and next-step buttons remain reachable even on the minimum viewport.
      const actions=rail.querySelector('.tutorial-lesson-actions');
      if(actions)rail.insertBefore(actions,rail.querySelector('.tutorial-coach-footer'));
      if(index===TRAINING_INDEX&&current()?.winner===1){const retry=rail.querySelector('[data-tutorial-action="next"]');if(retry){retry.disabled=false;retry.textContent='Retry training';}}
      if(previousAction)rail.querySelector('[data-tutorial-action="'+previousAction+'"]')?.focus({preventScroll:true});
      doc.querySelectorAll('.tutorial-focus').forEach(n=>{n.classList.remove('tutorial-focus');n.removeAttribute('data-tutorial-highlight');n.removeAttribute('aria-describedby');});
      const selectors=complete?[]:targets();
      selectors.forEach(selector=>doc.querySelectorAll(selector).forEach(n=>{n.classList.add('tutorial-focus');n.setAttribute('data-tutorial-highlight','true');n.setAttribute('aria-describedby','tutorial-objective');}));
      const key=index+':'+phase+':'+stage+':'+complete;
      if(key!==focusKey){focusKey=key;const n=doc.querySelector(selectors.find(s=>s.includes('data-uid'))||selectors.find(s=>s.includes('data-territory="3"'))||selectors[0]||'#tutorial-coach');n?.scrollIntoView?.({block:'nearest',inline:'center',behavior:'instant'});}
      const state=current();
      if(index===10&&stage===1&&state?.attacker===1&&!state.response&&timer===null){const serial=generation;timer=setTimeout(()=>{timer=null;if(serial!==generation||!active||paused)return;options.dispatch?.({type:'endTurn'},{profile:'tutorial-script',tutorialAutomatic:true,reason:'The opponent passes so the Warden passive visibly triggers at your next offensive turn.'});},options.responseDelay===undefined?650:options.responseDelay);}
      if(index!==TRAINING_INDEX&&state?.response&&E.getActor(state)===1&&timer===null){
        const serial=generation;
        timer=setTimeout(()=>{timer=null;if(serial!==generation||!active||paused)return;const next=current();if(next?.response&&E.getActor(next)===1)options.dispatch?.({type:'respond',pass:true},{profile:'tutorial-script',tutorialAutomatic:true,reason:'The learning fixture passes this response so you can read the exchange.'});},options.responseDelay===undefined?650:options.responseDelay);
      }
      if(pendingFinish){pendingFinish=false;options.onComplete?.(snapshot());}
    }
    if(doc)doc.addEventListener('click',event=>{
      const commander=event.target.closest?.('[data-tutorial-commander]');if(commander){event.preventDefault();chooseCommander(commander.dataset.tutorialCommander);return;}
      const faction=event.target.closest?.('[data-tutorial-faction]');if(faction){event.preventDefault();inspectFaction(faction.dataset.tutorialFaction);return;}
      const button=event.target.closest?.('[data-tutorial-action]');if(!button||button.disabled)return;
      event.preventDefault();
      if(button.dataset.tutorialAction==='hint')hint();
      if(button.dataset.tutorialAction==='next')next();
      if(button.dataset.tutorialAction==='restart-lesson')restartLesson();
      if(button.dataset.tutorialAction==='restart-all')restart();
      if(button.dataset.tutorialAction==='skip')exit('skip');
    });
    return {start,restart,restartLesson,continue:next,next,hint,inspectFaction,chooseCommander,beforeAction,afterAction,mount,pause,resume,exit,snapshot,isActive:()=>active,isGuided:()=>active&&index!==TRAINING_INDEX,isTraining:()=>active&&index===TRAINING_INDEX,constrainActions:state=>E.legalActions(state).filter(a=>!active||index===TRAINING_INDEX||lessonPermit(state,a))};
  }
  return {VERSION,TRAINING_INDEX,STORAGE_KEY,LESSONS,FACTION_EXAMPLES,progress,createFixture,assertInventory,create};
});
