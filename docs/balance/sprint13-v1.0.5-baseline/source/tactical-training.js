/* Optional Forge XI exercises. Printed rules and every action resolve through
 * the match engine. Fixtures arrange real legal inventories; no rewards or
 * competitive reports are emitted by this practice-only page. */
(function(root,factory){
  'use strict';
  const node=typeof module==='object'&&module.exports;
  const runtime=node?require('./balance.js').createRuntime(require('./balance.js').DEFAULT_PROFILE):null;
  const api=factory(node?runtime.data:root.FrontlinesData,node?runtime.engine:root.FrontlinesEngine);
  if(node)module.exports=api;root.FrontlinesTacticalTraining=api;
  if(!node&&root.document?.getElementById('tactical-training'))mountPage(root,api);
  function mountPage(root,Training){
    const D=root.FrontlinesData,E=root.FrontlinesEngine,host=root.document.getElementById('tactical-training');
    const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let index=0,runner=null,confirmation=false,error='',completed=[];
    try{const saved=JSON.parse(root.localStorage.getItem('frontlines.tactical-training.v1')||'{}');completed=Array.isArray(saved.completed)?saved.completed.filter(i=>Number.isInteger(i)&&i>=0&&i<6):[];}catch(_){}
    function save(){try{root.localStorage.setItem('frontlines.tactical-training.v1',JSON.stringify({version:1,completed}));}catch(_){} }
    function start(i){try{index=i;runner=Training.createRunner(i);confirmation=false;error='';render();}catch(e){error=e.message;host.innerHTML='<p class="training-error">'+esc(error)+'</p><a class="btn quiet" href="index.html">Return to command menu</a>';}}
    function unitMarkup(s,u,targets){const c=D.CARDS[u.cardId],statuses=E.statusDetails?.(s,u)||[];
      return '<article class="training-unit" data-uid="'+esc(u.uid)+'" data-target="'+targets.includes(u.uid)+'" style="--faction-color:'+D.FACTIONS[c.faction].color+'"><div class="training-unit-header"><span class="training-unit-art">'+(root.FrontlinesArt?.html(c)||'')+'</span><b class="training-unit-name">'+esc(c.name)+'</b></div><div class="training-unit-stats">'+E.attackValue(s,u)+' ATK · '+(c.health-u.damage)+'/'+c.health+' HP · '+(u.ready?'READY':'EXHAUSTED')+'</div><div class="training-unit-statuses">'+statuses.map(v=>'<span class="tactical-status status-'+esc(v.kind)+'" data-status="'+esc(v.kind)+'" title="'+esc(v.text+' '+(v.duration||v.expiryText||''))+'">'+esc(v.label)+'</span>').join('')+'</div></article>';
    }
    function render(){const snapshot=runner.snapshot(),s=snapshot.state,lesson=snapshot.lesson,step=snapshot.step,actions=runner.preview(),targets=actions.flatMap(a=>[a.targetUid,a.unitUid,a.sacrificeUid].filter(Boolean));
      const zones=[2,3,4].map(id=>{const smoke=(E.statusDetails?.(s,id)||[]).filter(v=>v.kind==='smoke');return '<section class="training-zone '+(id===3?'active':'')+'" data-territory="'+id+'"><h3>SECTOR '+(id+1)+' / '+esc(s.territories[id].name)+'</h3>'+smoke.map(v=>'<div class="training-territory-status">≋ '+esc(v.label)+' · '+esc(v.duration||v.expiryText||'')+'</div>').join('')+[1,0].map(p=>'<div class="training-roster"><div class="training-roster-label">P'+(p+1)+' / '+esc(D.FACTIONS[s.players[p].faction].name)+'</div>'+s.units.filter(u=>u.territory===id&&u.owner===p).map(u=>unitMarkup(s,u,targets)).join('')+(s.units.some(u=>u.territory===id&&u.owner===p)?'':'<span class="training-empty">OPEN GROUND</span>')+'</div>').join('')+'</section>';}).join('');
      host.innerHTML='<div class="training-intro"><span class="eyebrow">OPTIONAL / SIX PLAYABLE EXERCISES / NO REWARDS</span><h1>SOLVE THIS BATTLEFIELD.</h1><p>The beginner tutorial remains fourteen approachable lessons. Here you command both sides of six small tactical situations, using the same rules as a normal match.</p></div><nav class="training-nav" aria-label="Tactical lessons">'+Training.LESSONS.map((l,i)=>'<button data-training="lesson" data-index="'+i+'" '+(i===index?'aria-current="step"':'')+'><b>'+(completed.includes(i)?'✓ ':'')+(i+1)+'. '+esc(l.subtitle)+'</b>'+esc(l.title)+'</button>').join('')+'</nav><div class="training-workspace"><section class="training-board" aria-label="Practice battlefield">'+zones+'</section><aside class="training-control" aria-live="polite"><div class="training-phase-track">'+['ACTION','COUNTER','RESULT'].map(phase=>phase===(step?.phase||'RESULT')?'<b>'+phase+'</b>':phase).join(' → ')+'</div><span class="training-phase">'+(step?step.phase+' / PLAYER '+(step.actor+1):'RESULT / EXERCISE COMPLETE')+'</span><h2>'+esc(lesson.title)+'</h2>'+(step?'<p>'+esc(step.text)+'</p>':'')+(snapshot.complete?'<div class="training-result">✓ '+esc(lesson.result)+'</div><button class="btn primary training-execute" data-training="next-lesson">'+(index===5?'Return to first exercise':'Next exercise →')+'</button>':'<button class="btn primary training-execute" data-training="execute">'+esc(step.label)+' →</button>')+'<button class="btn quiet" data-training="restart">Restart this exercise</button>'+(error?'<p class="training-error">'+esc(error)+'</p>':'')+'<div class="training-resources">'+[0,1].map(p=>{const r=E.presence(s,p);return 'P'+(p+1)+' · '+r.available+' AVAILABLE / '+r.committed+' COMMITTED · '+s.players[p].hand.length+' HAND CARDS';}).join('<br>')+'<br>ACTION WINDOW '+s.turn+' · '+s.actionsLeft+' COMMAND ACTIONS</div><p class="training-status-explanation">'+esc(lesson.lesson)+'</p></aside></div><section class="training-ledger"><h3>BATTLEFIELD RESULTS</h3><ol>'+s.log.slice(-8).map(row=>'<li>Window '+row.turn+' · '+esc(row.text)+'</li>').join('')+'</ol></section>'+(confirmation?'<div class="training-confirm" role="dialog" aria-modal="true" aria-labelledby="training-sacrifice-title"><section><h2 id="training-sacrifice-title">YOU ARE DESTROYING YOUR OWN UNIT</h2><p><b>'+esc(D.CARDS[s.units.find(u=>u.uid===snapshot.refs.cost).cardId].name)+'</b> will be voluntarily destroyed to repair the Bulwark. The lost piece and paid Order are real costs. Scavenge and Nothing Wasted grant no casualty draw.</p><div class="training-confirm-buttons"><button class="btn quiet" data-training="cancel">Keep this unit</button><button class="btn danger" data-training="confirm">Confirm sacrifice</button></div></section></div>':'');
      if(confirmation){host.querySelector('.training-workspace').inert=true;host.querySelector('.training-nav').inert=true;host.querySelector('[data-training="cancel"]').focus();}
    }
    function perform(confirm){try{const result=runner.next(confirm);confirmation=!!result.requiresConfirmation;error='';if(result.complete&&!completed.includes(index)){completed.push(index);save();}render();if(!confirmation)host.querySelector('[data-training="execute"],[data-training="next-lesson"]')?.focus();}catch(e){error=e.message;confirmation=false;render();}}
    host.addEventListener('click',event=>{const button=event.target.closest('[data-training]');if(!button)return;switch(button.dataset.training){case 'lesson':start(Number(button.dataset.index));break;case 'restart':start(index);break;case 'next-lesson':start((index+1)%6);break;case 'execute':perform(false);break;case 'confirm':perform(true);break;case 'cancel':confirmation=false;render();host.querySelector('[data-training="execute"]').focus();break;}});
    root.document.addEventListener('keydown',event=>{if(!confirmation)return;if(event.key==='Escape'){event.preventDefault();confirmation=false;render();host.querySelector('[data-training="execute"]').focus();}if(event.key==='Tab'){const buttons=[...host.querySelectorAll('.training-confirm button')],first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&root.document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&root.document.activeElement===last){event.preventDefault();first.focus();}}});
    root.FrontlinesTacticalTrainingPage={snapshot:()=>runner?.snapshot(),start};start(index);
  }
})(typeof globalThis==='object'?globalThis:this,function(Data,Engine){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const LESSONS=Object.freeze([
    {id:'cover-breach',title:'A position can be broken',subtitle:'Cover → Breach',factions:['stonewall','bruiser'],
      lesson:'Cover is a one-hit tactical resource. Breach removes it before its protection can apply.',
      steps:[{phase:'ACTION',label:'Dig In: cover the Rifle Squad',actor:0,text:'Prepare a defender. Cover reduces the next eligible direct hit by 2, never stacks and expires at its displayed turn boundary.',actions:[{type:'order',hand:'cover',target:'defender'}]},
        {phase:'COUNTER',label:'Attack with Demolition Squad',actor:1,text:'Breach attacks remove and ignore Cover. The scripted defender passes; both units still exchange combat damage.',actions:[{type:'attack',unit:'breacher',target:'defender'}]}],
      result:'The protected squad still took the Breach hit. Cover cannot turn a prepared position into invulnerability.'},
    {id:'blast',title:'A grenade rewards a cluster',subtitle:'Blast → Disperse',factions:['bruiser','stonewall'],
      lesson:'Blast targets a territory and uses a printed cap. The preview names the actual enemies, not every unit in the zone.',
      steps:[{phase:'ACTION',label:'Throw a grenade at the center',actor:0,text:'Grenadier pays 2 Capacity and 1 Command Action, exhausts and hits up to two enemies. Blast bypasses Cover and Dodge.',actions:[{type:'ability',unit:'grenadier',abilityId:'grenade',territory:3}]},
        {phase:'COUNTER',label:'Withdraw one defender to friendly ground',actor:1,text:'Spread the two damaged defenders across territories. Voluntary movement costs a Command Action and readiness.',actions:[{type:'move',unit:'defender',territory:4}]},
        {phase:'RESULT',label:'Use Frag Out on the remaining center unit',actor:0,text:'This territory now contains only one enemy. The cap of two is not permission to hit another territory.',actions:[{type:'order',hand:'frag',territory:3}]}],
      result:'The second blast could hit only the enemy still in the center. Separating forces reduces area value without a hard deck counter.'},
    {id:'dodge',title:'Evasion has an answer',subtitle:'Dodge → Mark / Exposed',factions:['nightwalker','syndicate'],
      lesson:'Dodge is deterministic. The next direct hit is avoided unless Precision, Mark or Exposed answers it; no hidden chance roll exists.',
      steps:[{phase:'ACTION',label:'Vanish: protect the Stalker',actor:0,text:'Give a fragile important unit one temporary Dodge charge. This neither heals nor readies it.',actions:[{type:'order',hand:'vanish',target:'defender'}]},
        {phase:'COUNTER',label:'Apply Target Package',actor:1,text:'Mark and Exposed prepare the target. Exposed removes Cover and Dodge; its next direct enemy hit receives +1 damage.',actions:[{type:'order',hand:'package',target:'defender'}]},
        {phase:'RESULT',label:'Fire the prepared direct attack',actor:1,text:'The prepared attacker can now hit. Response passes are scripted so the visible setup and payoff are easy to compare.',actions:[{type:'attack',unit:'attacker',target:'defender'}]}],
      result:'Exposed removed the evasion and the direct attack consumed its extra vulnerability. Dodge protects timing, not permanent untargetability.'},
    {id:'watch-suppress',title:'Prepared fire is still dangerous',subtitle:'Overwatch / Suppression',factions:['stonewall','syndicate'],
      lesson:'Overwatch watches the first voluntary enemy entry here. Suppression slows mobility and Attack, but is not a stun or a cancellation of existing preparation.',
      steps:[{phase:'ACTION',label:'Arm Bastion Gunner’s Overwatch',actor:0,text:'Spend 1 Command Action and exhaust. The visible watch expires at your next action-window start.',actions:[{type:'overwatch',unit:'watcher'}]},
        {phase:'COUNTER',label:'Suppress the prepared gunner',actor:1,text:'Pinpoint Fire gives −1 Attack and stops voluntary movement through the gunner’s next action-window end. It never stacks and the gunner can still contribute.',actions:[{type:'ability',unit:'suppressor',abilityId:'pinpoint-fire',target:'watcher'}]},
        {phase:'RESULT',label:'Move Security into the watched territory',actor:1,text:'This entry triggers the existing watch once for 2 direct damage. Suppression did not cancel it. Smoke, removal or another route would answer the reaction.',actions:[{type:'move',unit:'entrant',territory:3}]}],
      result:'The reaction fired once and Overwatch was consumed. Suppression remains a limited restriction, not a permanent lock.'},
    {id:'sacrifice',title:'Pay a real price to save the force',subtitle:'Enemy damage → Sacrifice / Repair',factions:['rogue','bruiser'],
      lesson:'A voluntary destruction is a cost, not an enemy casualty. General Scavenge and Nothing Wasted rewards cannot turn this trade into free cards.',
      steps:[{phase:'ACTION',label:'Enemy bombardment threatens the Bulwark',actor:1,text:'Resolve a real damage Order. Rogue has both a nearby Scavenge source and Nothing Wasted, so the later sacrifice tests the exact casualty distinction.',actions:[{type:'order',hand:'bombard',target:'survivor'}]},
        {phase:'COUNTER',label:'Strip the shield to repair the Bulwark',actor:0,text:'Choose the Shield as the voluntary cost and the damaged Bulwark as the separate payoff. Confirm before destroying your own piece.',confirm:true,actions:[{type:'order',hand:'parts',sacrifice:'cost',target:'survivor'}]}],
      result:'The shield was destroyed; the surviving Bulwark healed. The Order and the lost piece are real costs. No casualty draw was granted.'},
    {id:'smoke',title:'Cross during the smoke window',subtitle:'Overwatch → Smoke → Timing',factions:['stonewall','nightwalker'],
      lesson:'Smoke is local and temporary. It reduces direct damage to its creating side and blocks Overwatch reactions in that territory; Blast bypasses it.',
      steps:[{phase:'ACTION',label:'Prepare Overwatch in the center',actor:0,text:'The gunner threatens the next voluntary enemy entry. All units and the watch remain visible.',actions:[{type:'overwatch',unit:'watcher'}]},
        {phase:'COUNTER',label:'Place Smoke Screen over your center ally',actor:1,text:'Smoke can target territory containing your permanent. It blocks reactions here without denying normal card play or Mark targeting.',actions:[{type:'order',hand:'smoke',territory:3}]},
        {phase:'RESULT',label:'Cross into the smoke',actor:1,text:'Move into the watched territory now. Smoke blocks the reaction; it does not grant a permanent escape.',actions:[{type:'move',unit:'entrant',territory:3}]},
        {phase:'RESULT',label:'Advance to the next timing boundary',actor:1,text:'End both action windows. Overwatch expires at the watching side’s next start; Smoke expires at its creating side’s next start.',actions:[{type:'endTurn'},{type:'endTurn'}]}],
      result:'The crossing took no Overwatch damage, and both temporary effects expired at real engine action-window boundaries.'}
  ]);
  function legalDeck(D,faction,needed,E){
    const counts={},cards=[];
    function add(id){const c=D.CARDS[id];if(!c||c.faction!==faction)throw Error('Training card is unavailable: '+id);const cap=c.unique?1:4;if((counts[id]||0)>=cap)return;counts[id]=(counts[id]||0)+1;cards.push(id);}
    needed.forEach(add);for(const id of D.DECKS[faction])if(cards.length<26)add(id);
    for(const id of D.DECKS[faction])if(cards.length<26)add(id);
    if(cards.length!==26)throw Error('Training inventory is not a 26-card legal deck.');
    return {id:'tactical-training-'+faction,name:'Tactical exercise — '+D.FACTIONS[faction].name,faction,cards,archetype:'training',commanderId:faction==='rogue'?'commander_rogue_scavenger':E.commanders.defaultFor(faction)};
  }
  function createFixture(index,options={}){
    const D=options.data||Data,E=options.engine||Engine,lesson=LESSONS[index];if(!lesson)throw Error('Choose one of the six tactical lessons.');
    const specifications=[
      {field:[[0,'stonewall_rifles',3,'defender'],[1,'bruiser_demolition_squad',3,'breacher']],hand:[[0,'stonewall_dig_in','cover']]},
      {field:[[0,'bruiser_grenadier',3,'grenadier'],[1,'stonewall_defender',3,'defender'],[1,'stonewall_escort',3,'other']],hand:[[0,'bruiser_frag_out','frag']]},
      {field:[[0,'nightwalker_stalker',3,'defender'],[1,'syndicate_security',3,'attacker']],hand:[[0,'nightwalker_vanish','vanish'],[1,'syndicate_target_package','package']]},
      {field:[[0,'stonewall_bastion_gunner',3,'watcher'],[1,'syndicate_suppression_team',3,'suppressor'],[1,'syndicate_security',4,'entrant']],hand:[]},
      {field:[[0,'rogue_jury_rigged_shield',3,'cost',2],[0,'rogue_bulwark',3,'survivor',0],[0,'rogue_broker',3,'salvager']],hand:[[0,'rogue_strip_it_for_parts','parts'],[1,'bruiser_bombard','bombard']]},
      {field:[[0,'stonewall_bastion_gunner',3,'watcher'],[1,'nightwalker_stalker',3,'anchor'],[1,'nightwalker_smoke_runner',4,'entrant']],hand:[[1,'nightwalker_smoke_screen','smoke']]}
    ],spec=specifications[index],needed=[0,1].map(p=>[...spec.field.filter(x=>x[0]===p).map(x=>x[1]),...spec.hand.filter(x=>x[0]===p).map(x=>x[1])]);
    const decks=lesson.factions.map((f,p)=>legalDeck(D,f,needed[p],E));
    const state=E.createGame({seed:110040+index,factions:lesson.factions,decks,config:{startingCommand:80,commandCap:80,commandGrowth:0,startingHand:1,drawCount:0,actionLimit:6,captureThreshold:1000,slotsPerTerritory:5}});
    state.units=[];state.players.forEach((p,i)=>{p.hand=[];p.discard=[];p.deck=decks[i].cards.slice();});
    const refs={};function take(p,id,name){const deck=state.players[p].deck,at=deck.indexOf(id);if(at<0)throw Error('Training exceeded inventory: '+id);deck.splice(at,1);const item={uid:'c'+state.nextUid++,cardId:id};refs[name]=item.uid;return item;}
    spec.field.forEach(([p,id,territory,name,damage=0])=>state.units.push({...take(p,id,name),owner:p,territory,damage,ready:true,deployedTurn:0,movedTurn:-1}));
    spec.hand.forEach(([p,id,name])=>state.players[p].hand.push(take(p,id,name)));
    E.assertInvariants(state);return {state,refs,lesson,index};
  }
  function createRunner(index,options={}){
    const E=options.engine||Engine,D=options.data||Data,fixture=createFixture(index,{engine:E,data:D});let state=fixture.state,position=0,history=[];
    function resolve(spec){const a={type:spec.type};for(const key of ['abilityId','territory'])if(spec[key]!==undefined)a[key]=spec[key];for(const [key,ref]of [['handUid','hand'],['unitUid','unit'],['targetUid','target'],['sacrificeUid','sacrifice']])if(spec[ref])a[key]=fixture.refs[spec[ref]];return a;}
    function apply(a){const result=E.dispatch(state,a,{events:true});if(!result.ok)throw Error(result.error);state=result.state;E.assertInvariants(state);history.push({action:a,events:result.events||[],turn:state.turn});return result;}
    function finishResponse(){for(let n=0;state.response&&n<3;n++)apply({type:state.response.stage==='counter'?'counter':'respond',pass:true});if(state.response)throw Error('Training response failed to resolve.');}
    function next(confirm=false){
      const step=fixture.lesson.steps[position];if(!step)return {complete:true,state:copy(state),history:copy(history)};
      if(step.confirm&&!confirm)return {requiresConfirmation:true,source:copy(state.units.find(u=>u.uid===fixture.refs.cost)),state:copy(state)};
      if(!state.response&&state.attacker!==step.actor)apply({type:'endTurn'});
      if(state.attacker!==step.actor)throw Error('Training actor did not reach its action window.');
      step.actions.forEach(spec=>{apply(resolve(spec));finishResponse();});position++;
      return snapshot();
    }
    function snapshot(){return {index,position,complete:position>=fixture.lesson.steps.length,state:copy(state),history:copy(history),lesson:fixture.lesson,refs:{...fixture.refs},step:fixture.lesson.steps[position]||null};}
    return {next,snapshot,preview:()=>{const step=fixture.lesson.steps[position];return step?step.actions.map(resolve):[];}};
  }
  return {LESSONS,createFixture,createRunner};
});
