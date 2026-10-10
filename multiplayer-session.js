/* Canonical host authority and strict client projection. Transport stays outside. */
(function(root,factory){'use strict';const node=typeof module==='object'&&module.exports;const api=factory(node?require('./multiplayer-protocol.js'):root.FrontlinesMultiplayerProtocol,node?require('./decks.js'):root.FrontlinesDecks,node?require('./telemetry.js'):root.FrontlinesTelemetry);if(node)module.exports=api;root.FrontlinesMultiplayerSession=api;})(typeof globalThis!=='undefined'?globalThis:this,function(P,Decks,Telemetry){
  'use strict';
  const copy=P.clone;
  function createHost(options){
    if(!options?.runtime?.engine||!P.safeId(options.hostId)||!P.safeId(options.sessionId))throw new Error('A canonical runtime and authenticated session identity are required.');
    const runtime=options.runtime,E=runtime.engine,D=runtime.data,library=Decks.forData(D),now=options.now||Date.now;
    const compatibility=P.createCompatibility(runtime,{appVersion:options.appVersion,implementationHash:options.implementationHash});
    const grace=options.reconnectGraceMs||60000,createdAt=now(),inviteExpiresAt=createdAt+(options.inviteTtlMs||900000);
    let sessionExpiresAt=createdAt+(options.sessionTtlMs||21600000),status='lobby',state=null,matchId=null,sequence=0,tracker=null,summary=null,resultReason=null,startDeadline=null,lastHostSeat=null;
    let publicLog=[],lastEvents=[],seatMembers=[],startAcks=new Set(),seen=new Map(),diagnosticLog=[],lastActionId=null,responseSequence=null;
    const members=new Map();
    const member=(id,name,role)=>({id,name:P.displayName(name,role==='host'?'Host':'Guest'),role,connected:true,ready:false,selection:null,deckHash:null,compatibility:copy(compatibility),seat:null,reconnectToken:P.reconnectToken(),tokenExpiresAt:sessionExpiresAt,disconnectedAt:null});
    members.set(options.hostId,member(options.hostId,options.name,'host'));
    const record=(type,detail={})=>{diagnosticLog.push({type,at:now(),matchId,sequence,...(state?P.timingContext(state):{}),...detail});if(diagnosticLog.length>1000)diagnosticLog.shift();};
    record('hostCreated');
    const fail=(code,reason,extra={})=>({ok:false,code,reason,...extra});
    function authenticate(id){if(status==='closed')return fail('MATCH_CLOSED','This private match has closed.');if(now()>sessionExpiresAt)return fail('SESSION_EXPIRED','This private match has expired. Create a new invitation.');return members.has(id)?null:fail('INVALID_SENDER','You are not a member of this private match.');}
    function lobby(){const players=Array.from(members.values()).map(m=>({senderId:m.id,role:m.role,name:m.name,connected:m.connected,ready:m.ready,compatible:true,faction:m.selection?.faction||null,commanderId:m.selection?.commanderId||null,deck:m.selection?{id:m.selection.id,name:m.selection.name,size:m.selection.cards.length,hash:m.deckHash,legal:library.validate(m.selection).legal}:null}));const reasons=[];if(status!=='lobby')reasons.push('Return to the lobby before starting another match.');if(players.length!==2)reasons.push('Waiting for your opponent to join.');for(const player of players){if(!player.connected)reasons.push(player.name+' is reconnecting.');if(!player.deck?.legal)reasons.push(player.name+' needs a legal deck and Commander.');if(!player.ready)reasons.push(player.name+' is not ready.');}return {sessionId:options.sessionId,status,players,canStart:reasons.length===0,startReasons:reasons,inviteExpiresAt,protocolVersion:P.VERSION,compatibility:copy(compatibility)};}
    function context(){return {sessionId:options.sessionId,matchId,senderId:options.hostId,sequence,rulesetHash:compatibility.rulesetHash};}
    function frames(type='lobby'){return Array.from(members.values()).filter(m=>m.connected).map(m=>({toId:m.id,message:type==='lobby'?P.packet(context(),'lobby',lobby()):snapshotMessage(m.id,type)}));}
    function emit(type='lobby',extra={}){return {ok:true,outbox:frames(type),local:lobby(),...extra};}
    function join(id,name,remoteCompatibility){
      if(!P.safeId(id)||id===options.hostId)return fail('INVALID_SENDER','Choose a valid guest identity.');if(status==='closed')return fail('MATCH_CLOSED','The host has closed this match.');if(now()>inviteExpiresAt)return fail('INVITE_EXPIRED','The invitation has expired. Ask the host for a new code.');if(status!=='lobby')return fail('MATCH_IN_PROGRESS','This match is already in progress.');if(members.has(id))return fail('ALREADY_JOINED','Reconnect with your existing private-match identity.');if(members.size>=2)return fail('MATCH_FULL','This private match already has two players.');
      const compatible=P.compareCompatibility(compatibility,remoteCompatibility);if(!compatible.ok)return compatible;
      const guest=member(id,name,'guest');members.set(id,guest);record('guestJoined',{senderId:id});
      const response=emit();response.outbox.push({toId:id,message:P.packet(context(),'welcome',{senderId:id,reconnectToken:guest.reconnectToken,tokenExpiresAt:guest.tokenExpiresAt,lobby:lobby()})});return response;
    }
    function select(id,raw){
      const error=authenticate(id);if(error)return error;if(status!=='lobby')return fail('MATCH_IN_PROGRESS','Deck choices can change in the lobby.');const m=members.get(id);if(!m.connected)return fail('CONNECTION_LOST','Reconnect before choosing your deck.');
      if(typeof raw?.commanderId!=='string'||!E.commanders.get(raw.commanderId)||E.commanders.get(raw.commanderId).faction!==raw.faction)return fail('DECK_INVALID','Choose one available Commander from your deck faction.');
      const legality=library.validate(raw);if(!legality.legal)return fail('DECK_INVALID',legality.errors.join(' '));
      const selected=copy({id:typeof raw.id==='string'?raw.id.slice(0,100):'',name:raw.name.replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,80)||'Custom deck',faction:raw.faction,commanderId:raw.commanderId,cards:raw.cards,archetype:typeof raw.archetype==='string'?raw.archetype.slice(0,80):'custom',set:typeof raw.set==='string'?raw.set.slice(0,80):'legacy'});
      // Validate the normalized data again; no remote extension fields enter the engine.
      if(!library.validate(selected).legal)return fail('DECK_INVALID','The selected deck or Commander is invalid.');m.selection=selected;m.deckHash=P.deckHash(selected);m.ready=false;record('selectionChanged',{senderId:id,faction:selected.faction,deckHash:m.deckHash});return emit();
    }
    function ready(id,value){const error=authenticate(id);if(error)return error;if(status!=='lobby')return fail('MATCH_IN_PROGRESS','Ready up in the lobby.');const m=members.get(id);if(typeof value!=='boolean')return fail('MALFORMED_MESSAGE','Ready must be true or false.');if(!m.connected)return fail('CONNECTION_LOST','Reconnect before readying.');if(value&&(!m.selection||!library.validate(m.selection).legal))return fail('DECK_INVALID','Choose a legal deck and Commander before readying.');m.ready=value;record(value?'playerReady':'playerUnready',{senderId:id});return emit();}
    function start(id,startOptions={}){
      const error=authenticate(id);if(error)return error;if(id!==options.hostId)return fail('HOST_ONLY','Only the host can start this private match.');const current=lobby();if(!current.canStart)return fail('NOT_READY',current.startReasons.join(' '));
      const seed=startOptions.seed!==undefined?startOptions.seed>>>0:options.seedFactory?options.seedFactory()>>>0:new DataView(P.randomBytes(4).buffer).getUint32(0,false);
      const hostSeat=lastHostSeat===null?(seed&1):1-lastHostSeat,guest=Array.from(members.values()).find(m=>m.id!==options.hostId);lastHostSeat=hostSeat;members.get(options.hostId).seat=hostSeat;guest.seat=1-hostSeat;seatMembers=[];for(const m of members.values())seatMembers[m.seat]=m.id;
      const selections=seatMembers.map(memberId=>copy(members.get(memberId).selection));
      try{state=E.createGame({seed,factions:selections.map(deck=>deck.faction),decks:selections});}catch(error){return fail('DECK_INVALID',error.message);}
      matchId=P.randomId('match');sequence=0;seen=new Map();startAcks=new Set();lastEvents=[];lastActionId=null;responseSequence=state.response?0:null;summary=null;resultReason=null;publicLog=[{...P.timingContext(state),type:'setup',text:members.get(seatMembers[0]).name+' acts first. Both Commanders are ready.'}];status='starting';startDeadline=now()+30000;
      tracker=Telemetry?.createTracker({data:D,engine:E,state,decks:selections.map(deck=>deck.id),aiProfiles:['human','human'],trace:false,traceLimit:0});
      sessionExpiresAt=now()+(options.sessionTtlMs||21600000);for(const m of members.values())m.tokenExpiresAt=sessionExpiresAt;
      record('matchCreated',{startingMember:seatMembers[0],canonicalHash:P.hash(state)});return emit('snapshot');
    }
    function acknowledgeStart(id,ackMatchId,ack){const error=authenticate(id);if(error)return error;if(status!=='starting'||ackMatchId!==matchId)return fail('STALE_MATCH','This opening acknowledgement does not match the current match.');if(!members.get(id).connected)return fail('CONNECTION_LOST','Reconnect to enter the match.');if(ack&&(ack.sequence!==sequence||ack.stateHash!==snapshotFor(id).stateHash))return fail('STATE_MISMATCH','The match opening needs synchronization.',{resync:true});startAcks.add(id);record('startAcknowledged',{senderId:id});if(startAcks.size===2){status='active';startDeadline=null;record('matchStarted');}return emit('snapshot');}
    function resultFor(seat){
      if(!state||state.winner===null)return null;
      const ownCards=(summary?.cards||[]).filter(card=>card.player===seat&&(card.plays||card.attacksInitiated||card.tacticalAbilities||card.passiveTriggers));
      const cardStats=Object.fromEntries(ownCards.map(card=>[card.cardId,{plays:card.plays||0,orders:card.orders||0,deployments:card.deployments||0,attacks:card.attacksInitiated||0,kills:card.kills||0,captureContributions:card.captureContributions||0,passiveTriggers:card.passiveTriggers||0}]));
      return {winner:state.winner,reason:resultReason||'territory',startingSeat:0,turns:state.turn,actionWindows:state.windowIndex??state.turn,windows:state.windowIndex??state.turn,turnsCompleted:state.lastResolvedTurn??null,timingModel:compatibility.timingModel,turnSystemVersion:compatibility.turnSystemVersion,seed:state.seed,protocolVersion:P.VERSION,matchId,factions:state.players.map(p=>p.faction),commanders:state.players.map(p=>p.commander.id),usedCards:ownCards.map(card=>card.cardId),cardStats,commanderActiveUsed:state.players[seat].commander.used,creditsEarned:0,supplyEarned:0};
    }
    function snapshotFor(id){
      const error=authenticate(id);if(error)return error;const m=members.get(id);if(!state||m.seat===null)return {sessionId:options.sessionId,matchId,status,lobby:lobby(),localSeat:null};
      const safe=P.projectState(state,m.seat,{publicLog}),shared=P.projectState(state,null,{publicLog});
      return {sessionId:options.sessionId,matchId,sequence,localSeat:m.seat,status,state:safe,stateHash:P.hash(safe),sharedHash:P.hash(shared),events:P.projectEvents(lastEvents,m.seat),legalActions:status==='active'&&E.getActor(state)===m.seat?copy(E.legalActions(state)):[],responseWindow:state.response?{id:matchId+'_response_'+responseSequence,openedAtSequence:responseSequence,eligibleSeat:E.getActor(state),stage:state.response.stage}:null,names:seatMembers.map(memberId=>members.get(memberId).name),result:resultFor(m.seat),progression:state.winner===null?null:{id:matchId,matchId,completed:true,mode:'private-online',localSeat:m.seat,victory:state.winner===m.seat,conceded:resultReason==='concede',usedCards:resultFor(m.seat).usedCards,cardStats:resultFor(m.seat).cardStats,commanderId:state.players[m.seat].commander.id,commanderActiveUsed:state.players[m.seat].commander.used},lastActionId,disconnectDeadline:Array.from(members.values()).filter(row=>!row.connected&&row.disconnectedAt!==null).reduce((deadline,row)=>Math.min(deadline,row.disconnectedAt+grace),Infinity)===Infinity?null:Math.min(...Array.from(members.values()).filter(row=>!row.connected&&row.disconnectedAt!==null).map(row=>row.disconnectedAt+grace))};
    }
    function snapshotMessage(id,type='snapshot'){const snapshot=snapshotFor(id);if(type==='snapshot')snapshot.events=[];return P.packet({...context(),stateHash:snapshot.stateHash},type,snapshot);}
    function checkpointMessages(){
      if(!state||!matchId||status==='closed')return [];
      const sharedHash=P.hash(P.projectState(state,null,{publicLog}));
      return Array.from(members.values()).filter(m=>m.connected&&m.seat!==null).map(m=>({toId:m.id,message:P.packet({...context(),stateHash:P.hash(P.projectState(state,m.seat,{publicLog}))},'checkpoint',{sharedHash})}));
    }
    function publicAction(before,action,seat){const item=action.handUid?before.players[seat].hand.find(row=>row.uid===action.handUid):null,unit=action.unitUid?before.units.find(row=>row.uid===action.unitUid):null;const result={type:'intent',...P.timingContext(before),player:seat,actionType:action.type};if(before.response)result.responseContext=P.clone(before.response);if(item){result.cardId=item.cardId;result.uid=item.uid;}if(unit){result.cardId=unit.cardId;result.uid=unit.uid;}if(action.targetUid)result.targetUid=action.targetUid;if(action.territory!==undefined)result.territory=action.territory;return result;}
    function logEvent(event){const name=event.cardId&&D.CARDS[event.cardId]?.name||event.targetCardId&&D.CARDS[event.targetCardId]?.name||'',player=event.player===0||event.player===1?members.get(seatMembers[event.player]).name:'Battlefield';let text;
      if(event.type==='intent'){if(event.actionType==='endTurn')text=player+' ends their action window.';else if(event.actionType==='attack')text=player+' declares an attack with '+name+'.';else if(['respond','counter'].includes(event.actionType))text=player+' '+(name?'plays '+name:'passes the response')+'.';}
      else if(event.type==='draw')text=player+' draws a card.';else if(event.type==='deploy')text=player+' deploys '+name+'.';else if(event.type==='move')text=name+' moves from zone '+event.from+' to '+event.to+'.';else if(event.type==='order')text=player+' plays '+name+'.';else if(event.type==='damage')text=(D.CARDS[event.targetCardId]?.name||'Target')+' takes '+event.damage+' damage.';else if(event.type==='death')text=name+' is destroyed ('+event.cause+').';else if(event.type==='capture')text=player+' captures '+D.TERRITORY_NAMES[event.territory]+'.';else if(event.type==='commanderActivated')text=player+' activates their Commander.';else if(event.type.startsWith('status'))text=(event.status||event.kind)+' '+event.type.slice(6).toLowerCase()+'.';else if(event.type==='forcedRetreat')text=name+' is forced to retreat.';else if(event.type==='concede')text=player+' concedes the match.';
      if(event.type==='windowStarted')text='Turn '+event.turn+' — '+player+' Action Window ('+(event.window===0?'FIRST':'SECOND')+').';else if(event.type==='turnStarted')text='Turn '+event.turn+' begins.';else if(event.type==='turnEndBegin')text='Turn '+event.turn+' — territory resolution.';else if(event.type==='turnEndComplete')text='Turn '+event.turn+' resolution complete.';
      if(text)publicLog.push({...P.timingContext(event),type:event.type==='intent'?'info':event.type,text});if(publicLog.length>500)publicLog.splice(0,publicLog.length-500);
    }
    function submitIntent(id,raw){
      const auth=authenticate(id);if(auth)return auth;let message;try{message=P.parseMessage(raw);}catch(error){return fail('MALFORMED_MESSAGE',error.message);}if(message.senderId!==id||message.sessionId!==options.sessionId)return fail('INVALID_SENDER','The gameplay sender is not authenticated for this session.');
      if(message.messageType!=='intent'||!P.safeId(message.actionId)||!message.payload||Object.keys(message.payload).length!==1||!message.payload.action)return fail('MALFORMED_ACTION','Invalid gameplay intention.');
      if(message.matchId!==matchId)return fail('STALE_MATCH','This action belongs to a previous match.');if(message.rulesetHash!==compatibility.rulesetHash)return fail('RULESET_MISMATCH','Game data does not match.');
      const fingerprint=P.hash({sender:id,payload:message.payload}),seenKey=id+':'+message.actionId,prior=seen.get(seenKey);
      if(prior){if(prior.fingerprint!==fingerprint)return fail('ACTION_ID_REUSED','An action identifier cannot be reused for a different action.');record('duplicateIntent',{actionId:message.actionId,senderId:id});return {ok:true,duplicate:true,sequence:prior.sequence,outbox:[{toId:id,message:snapshotMessage(id,'snapshot')}],local:lobby()};}
      if(status!=='active'||Array.from(members.values()).some(m=>!m.connected))return fail('MATCH_PAUSED','The match is paused until both players are connected.');
      if(!Number.isInteger(message.sequence)||message.sequence!==sequence)return fail(message.sequence<sequence?'STALE_ACTION':'FUTURE_ACTION','Your battlefield needs synchronization.',{resync:true});
      const m=members.get(id);if(message.stateHash!==snapshotFor(id).stateHash)return fail('STATE_MISMATCH','Your battlefield needs synchronization.',{resync:true});if(E.getActor(state)!==m.seat)return fail('WRONG_PLAYER','Wait for your action or response window.');
      const action=message.payload.action,error=P.validateAction(action);if(error)return fail('MALFORMED_ACTION',error);
      let resolution;try{resolution=E.dispatch(state,{...action,player:m.seat},{events:true});}catch(error){record('engineRejected',{senderId:id,actionId:message.actionId});return fail('ILLEGAL_ACTION','That action cannot be resolved. Request synchronization and try again.');}
      if(!resolution.ok)return fail('ILLEGAL_ACTION',resolution.error);
      const before=state;state=resolution.state;sequence++;lastActionId=message.actionId;lastEvents=[publicAction(before,action,m.seat),...(resolution.events||[])];
      if(before.response&&!state.response){responseSequence=null;lastEvents.push({type:'responseClosed',...P.timingContext(state),player:m.seat});}else if(!before.response&&state.response){responseSequence=sequence;lastEvents.push({type:'responseOpened',...P.timingContext(state),player:state.response.responder,attackerUid:state.response.attackerUid,defenderUid:state.response.defenderUid});}
      tracker?.record(before,state,action,{events:resolution.events||[]});for(const event of P.projectEvents(lastEvents,null))logEvent(event);
      seen.set(seenKey,{fingerprint,sequence});record('intentAccepted',{senderId:id,actionId:message.actionId,actionType:action.type,canonicalHash:P.hash(state)});
      if(state.winner!==null){status='results';resultReason='territory';summary=tracker?.finish(state)||null;record('matchCompleted',{winner:state.winner});}
      return emit('state');
    }
    function disconnect(id,reason='connectionLost'){const error=authenticate(id);if(error)return error;const m=members.get(id);m.connected=false;m.ready=false;m.disconnectedAt=now();if(['active','starting','reconnecting'].includes(status))status='reconnecting';record('playerDisconnected',{senderId:id,reason:String(reason).slice(0,80)});return emit(state?'snapshot':'lobby');}
    function reconnect(id,token){const error=authenticate(id);if(error)return error;const m=members.get(id);if(typeof token!=='string'||token!==m.reconnectToken||now()>m.tokenExpiresAt)return fail('RECONNECT_REJECTED','This reconnect credential has expired.');m.connected=true;m.disconnectedAt=null;if(state&&state.winner===null&&Array.from(members.values()).every(row=>row.connected)){status=startAcks.size===2?'active':'starting';if(status==='starting')startDeadline=now()+30000;}else if(state?.winner!==null&&state)status='results';record('playerReconnected',{senderId:id});return emit(state?'snapshot':'lobby');}
    function tick(){if(status==='closed')return {ok:true,outbox:[]};if(status==='starting'&&startDeadline!==null&&now()>startDeadline){status='lobby';state=null;matchId=null;for(const m of members.values()){m.ready=false;m.seat=null;}record('startTimeout');return emit();}if(status==='reconnecting'&&Array.from(members.values()).some(m=>!m.connected&&m.disconnectedAt!==null&&now()-m.disconnectedAt>=grace)){status='connectionLost';record('reconnectGraceExpired');return emit('snapshot');}if(now()>sessionExpiresAt){status='closed';record('sessionExpired');return emit();}return {ok:true,outbox:[]};}
    function waitLonger(id){const error=authenticate(id);if(error)return error;if(id!==options.hostId||status!=='connectionLost')return fail('HOST_ONLY','Only the host can extend this reconnect wait.');for(const m of members.values())if(!m.connected)m.disconnectedAt=now();status='reconnecting';record('reconnectWaitExtended');return emit('snapshot');}
    function concede(id){const error=authenticate(id);if(error)return error;const m=members.get(id);if(!state||state.winner!==null||m.seat===null||!['active','reconnecting','connectionLost'].includes(status))return fail('MATCH_NOT_ACTIVE','There is no unfinished match to concede.');state=copy(state);state.winner=1-m.seat;state.response=null;if(state.turnSystemVersion===2)state.phase='MATCH_END';E.assertInvariants(state);sequence++;lastActionId=null;lastEvents=[{type:'concede',...P.timingContext(state),player:m.seat,winner:state.winner}];logEvent(lastEvents[0]);status='results';resultReason='concede';summary=tracker?.finish(state)||null;record('matchConceded',{senderId:id,winner:state.winner});return emit('state');}
    function returnToLobby(id){const error=authenticate(id);if(error)return error;if(!state||state.winner===null)return fail('MATCH_NOT_COMPLETE','Finish or concede the current match before returning to the lobby.');status='lobby';state=null;matchId=null;sequence=0;lastEvents=[];startAcks=new Set();for(const m of members.values()){m.ready=false;m.seat=null;}record('returnedToLobby');return emit();}
    const rematch=id=>returnToLobby(id);
    function close(id){if(id!==options.hostId&&!members.has(id))return fail('INVALID_SENDER','You are not a member of this private match.');status='closed';for(const m of members.values())m.ready=false;record('sessionClosed');return emit();}
    function rename(id,name){const error=authenticate(id);if(error)return error;members.get(id).name=P.displayName(name,members.get(id).role);return emit(state?'snapshot':'lobby');}
    function diagnostics(){return {schemaVersion:compatibility.stateSchemaVersion,turnSystemVersion:compatibility.turnSystemVersion,timingModel:compatibility.timingModel,timing:state?P.timingContext(state):null,sessionId:options.sessionId,matchId,protocolVersion:P.VERSION,appVersion:compatibility.appVersion,rulesetHash:compatibility.rulesetHash,contentHash:compatibility.contentHash,status,sequence,lastActionId,canonicalHash:state?P.hash(state):null,players:Array.from(members.values()).map(m=>({role:m.role,connected:m.connected,ready:m.ready,seat:m.seat})),events:copy(diagnosticLog)};}
    function handle(id,raw){
      let message;try{message=P.parseMessage(raw);}catch(error){
        // A transport-authenticated first-time guest still needs a clean reply
        // when its wire protocol is incompatible. Revalidate all other JSON
        // bounds before replying; never attach a lobby or match snapshot.
        try{
          const candidate=typeof raw==='string'&&raw.length<=P.MAX_MESSAGE_BYTES?JSON.parse(raw):typeof raw==='object'?raw:null;
          if(candidate?.messageType==='hello'&&candidate.protocolVersion!==P.VERSION&&P.safeId(id)&&id!==options.hostId&&!members.has(id)&&candidate.senderId===id&&candidate.sessionId===options.sessionId){
            P.parseMessage({...candidate,protocolVersion:P.VERSION});
            const rejected=fail('PROTOCOL_MISMATCH','These Frontlines builds use incompatible multiplayer protocols.');
            rejected.outbox=[{toId:id,message:P.packet({sessionId:options.sessionId,senderId:options.hostId,rulesetHash:compatibility.rulesetHash},'error',{code:rejected.code,reason:rejected.reason,resync:false,actionId:null})}];return rejected;
          }
        }catch(_){/* Malformed or unauthenticated data receives no private reply. */}
        return fail('MALFORMED_MESSAGE',error.message);
      }if(message.senderId!==id||message.sessionId!==options.sessionId)return fail('INVALID_SENDER','The sender is not authenticated for this session.');
      const payload=message.payload||{};let result;
      switch(message.messageType){
        case 'hello':{
          const compatible=P.compareCompatibility(compatibility,payload.compatibility);
          if(!compatible.ok){result=compatible;break;}
          if(members.has(id)&&id!==options.hostId&&status==='lobby'&&(payload.reconnectToken===undefined||payload.reconnectToken===null||payload.reconnectToken==='')){
            // The relay already authenticated this same temporary identity.
            // If the opening welcome was lost, repeat only its own lobby
            // welcome; never weaken the credential requirement in a match.
            const existing=members.get(id);result=reconnect(id,existing.reconnectToken);
            if(result.ok)result.outbox.push({toId:id,message:P.packet(context(),'welcome',{senderId:id,reconnectToken:existing.reconnectToken,tokenExpiresAt:existing.tokenExpiresAt,lobby:lobby()})});
          }else result=members.has(id)?reconnect(id,payload.reconnectToken):join(id,payload.name,payload.compatibility);
          break;
        }
        case 'selection':result=select(id,payload.deck);break;
        case 'ready':result=ready(id,payload.ready);break;
        case 'start':result=start(id);break;
        case 'startAck':result=acknowledgeStart(id,message.matchId,{sequence:message.sequence,stateHash:message.stateHash});break;
        case 'intent':result=submitIntent(id,message);break;
        case 'resync':{const error=authenticate(id);result=error||{ok:true,outbox:state?[{toId:id,message:snapshotMessage(id,'snapshot')}]:[{toId:id,message:P.packet(context(),'lobby',lobby())}],local:lobby()};if(!error)record('resyncRequested',{senderId:id});break;}
        case 'concede':result=message.matchId===matchId?concede(id):fail('STALE_MATCH','This concession belongs to another match.');break;
        case 'rematch':case 'returnLobby':result=returnToLobby(id);break;
        case 'name':result=rename(id,payload.name);break;
        case 'waitLonger':result=waitLonger(id);break;
        case 'leave':result=close(id);break;
        default:result=fail('MALFORMED_MESSAGE','Unsupported private-match message.');
      }
      if(!result.ok&&(members.has(id)||message.messageType==='hello'&&P.safeId(id)&&id!==options.hostId)){
        const errorContext=members.has(id)?context():{sessionId:options.sessionId,senderId:options.hostId,rulesetHash:compatibility.rulesetHash};
        result.outbox=[{toId:id,message:P.packet(errorContext,'error',{code:result.code,reason:result.reason,resync:result.resync===true,actionId:message.actionId||null})}];if(result.resync&&state&&members.has(id))result.outbox.push({toId:id,message:snapshotMessage(id,'snapshot')});record('messageRejected',{senderId:id,messageType:message.messageType,code:result.code});
      }
      return result;
    }
    return {compatibility:copy(compatibility),sessionId:options.sessionId,hostId:options.hostId,join,select,ready,start,acknowledgeStart,submitIntent,disconnect,reconnect,tick,waitLonger,concede,rematch,returnToLobby,close,rename,handle,snapshotFor,lobby,diagnostics,snapshotMessage,checkpointMessages,broadcast:()=>frames(state?'snapshot':'lobby'),inspectCanonical:()=>state?copy(state):null,getReconnectCredential:id=>members.has(id)?{token:members.get(id).reconnectToken,expiresAt:members.get(id).tokenExpiresAt}:null};
  }
  function createClient(options){
    if(!options||!P.safeId(options.sessionId)||!P.safeId(options.senderId))throw new Error('A client session identity is required.');
    let snapshot=null,lobby=null,sequence=-1,matchId=null,status='connecting',needsResync=false,reconnectToken=null,tokenExpiresAt=null;
    const retiredMatches=new Set(),retire=id=>{if(id)retiredMatches.add(id);if(retiredMatches.size>32)retiredMatches.delete(retiredMatches.values().next().value);};
    const compatibility=copy(options.compatibility),context=()=>({sessionId:options.sessionId,matchId,senderId:options.senderId,sequence:Math.max(0,sequence),rulesetHash:compatibility.rulesetHash,stateHash:snapshot?.stateHash||null});
    function accept(raw){let message;try{message=P.parseMessage(raw);}catch(error){return {ok:false,code:'MALFORMED_MESSAGE',reason:error.message};}if(message.sessionId!==options.sessionId||options.hostId&&message.senderId!==options.hostId)return {ok:false,code:'INVALID_SENDER',reason:'This message does not come from your private-match host.'};if(message.rulesetHash&&message.rulesetHash!==compatibility.rulesetHash)return {ok:false,code:'RULESET_MISMATCH',reason:'Game data does not match.'};
      const payload=message.payload;
      if(message.messageType==='welcome'){reconnectToken=payload.reconnectToken;tokenExpiresAt=payload.tokenExpiresAt;lobby=copy(payload.lobby);status=lobby.status;return {ok:true,type:'welcome',lobby:copy(lobby)};}
      if(message.messageType==='lobby'){lobby=copy(payload);status=lobby.status;if(status==='lobby'||status==='closed'){retire(matchId);snapshot=null;matchId=null;sequence=-1;needsResync=false;}return {ok:true,type:'lobby',lobby:copy(lobby)};}
      if(message.messageType==='error'){if(payload.resync){needsResync=true;status='synchronizing';}return {ok:false,...copy(payload)};}
      if(message.messageType==='checkpoint'){
        if(!P.safeId(message.matchId)||!Number.isInteger(message.sequence)||message.sequence<0||message.rulesetHash!==compatibility.rulesetHash||typeof message.stateHash!=='string'||!(/^[a-f0-9]{64}$/).test(message.stateHash)||!payload||Object.keys(payload).length!==1||typeof payload.sharedHash!=='string'||!(/^[a-f0-9]{64}$/).test(payload.sharedHash))return {ok:false,type:'checkpoint',code:'MALFORMED_MESSAGE',reason:'Invalid battlefield checkpoint.'};
        if(retiredMatches.has(message.matchId)||message.matchId===matchId&&message.sequence<sequence)return {ok:true,type:'checkpoint',noop:true,stale:true};
        if(snapshot&&message.matchId===matchId&&message.sequence===sequence&&message.stateHash===snapshot.stateHash&&payload.sharedHash===snapshot.sharedHash)return {ok:true,type:'checkpoint',noop:true};
        needsResync=true;status='synchronizing';return {ok:false,type:'checkpoint',code:message.matchId!==matchId?'MATCH_MISMATCH':message.sequence!==sequence?'SEQUENCE_GAP':'STATE_MISMATCH',resync:true,reason:'Battlefield updates were missed. Request synchronization.'};
      }
      if(!['snapshot','state'].includes(message.messageType)||!payload?.state||![0,1].includes(payload.localSeat)||!Number.isInteger(message.sequence)||message.sequence<0)return {ok:false,code:'MALFORMED_MESSAGE',reason:'Invalid authoritative snapshot.'};
      if(!P.validTiming(payload.state,compatibility)||message.matchId!==payload.matchId||payload.sessionId!==options.sessionId||payload.sequence!==message.sequence||message.stateHash!==payload.stateHash||P.hash(payload.state)!==payload.stateHash||P.hash(P.projectState(payload.state,null,{publicLog:payload.state.log}))!==payload.sharedHash){needsResync=true;status='synchronizing';return {ok:false,code:'STATE_MISMATCH',resync:true,reason:'Battlefield state needs synchronization.'};}
      if(matchId&&message.matchId!==matchId&&status!=='lobby'&&!['starting','results'].includes(payload.status))return {ok:false,code:'STALE_MATCH',reason:'This snapshot belongs to another match.'};
      if(message.matchId===matchId&&message.sequence<sequence)return {ok:false,code:'STALE_SNAPSHOT',reason:'An old battlefield update was ignored.'};
      if(message.messageType==='state'&&message.matchId===matchId){if(message.sequence===sequence)return payload.stateHash===snapshot?.stateHash?{ok:true,duplicate:true}:{ok:false,code:'STATE_MISMATCH',resync:true};if(message.sequence!==sequence+1){needsResync=true;status='synchronizing';return {ok:false,code:'SEQUENCE_GAP',resync:true,reason:'Battlefield updates were missed. Request synchronization.'};}}
      if(matchId!==message.matchId)retire(matchId);snapshot=copy(payload);matchId=message.matchId;sequence=message.sequence;status=payload.status;needsResync=false;return {ok:true,type:message.messageType,snapshot:copy(snapshot)};
    }
    function makeIntent(action,actionId){if(!snapshot||status!=='active'||needsResync)throw new Error('Wait for an active synchronized match.');if(!snapshot.legalActions.some(candidate=>P.canonical(candidate)===P.canonical(action)))throw new Error('This action is not available in your current window.');return P.makeIntent(context(),action,actionId);}
    return {accept,makeIntent,message:(type,payload)=>P.packet(context(),type,payload),requestResync:()=>P.packet(context(),'resync',{}),hello:name=>P.packet(context(),'hello',{name,compatibility,...(reconnectToken?{reconnectToken}:{})}),getSnapshot:()=>snapshot?copy(snapshot):null,getLobby:()=>lobby?copy(lobby):null,getStatus:()=>status,needsResync:()=>needsResync,getSequence:()=>sequence,getReconnectCredential:()=>({token:reconnectToken,expiresAt:tokenExpiresAt}),disconnect:()=>{status='reconnecting';needsResync=true;return {ok:true};}};
  }
  return {VERSION:P.VERSION,createHost,createClient};
});
