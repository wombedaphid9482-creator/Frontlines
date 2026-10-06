'use strict';
// Desktop-only boundary. Neither authority state nor transport capabilities are
// exposed through preload. Renderer receives the same filtered view as a guest.
const Balance=require('./balance'),Build=require('./build-info'),Config=require('./multiplayer-config');
const Protocol=require('./multiplayer-protocol'),Session=require('./multiplayer-session'),Transport=require('./network-transport');
const COMMANDS=new Set(['host','join','name','select','ready','start','intent','concede','rematch','lobby','leave','resync','wait','report']);
const clone=value=>JSON.parse(JSON.stringify(value));
const cleanName=value=>String(value||'Commander').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24)||'Commander';
const safeCode=value=>typeof value==='string'&&/^[A-Z_]{3,48}$/.test(value)?value:'NETWORK_ERROR';
function validateCommand(command,payload){
  if(!COMMANDS.has(command))throw Object.assign(Error('Unknown multiplayer command.'),{code:'INVALID_COMMAND'});
  if(!payload||typeof payload!=='object'||Array.isArray(payload)||JSON.stringify(payload).length>65536)throw Object.assign(Error('Invalid multiplayer request.'),{code:'INVALID_MESSAGE'});
  return clone(payload);
}
function createController(options={}){
  const runtime=options.runtime||Balance.createRuntime(Balance.DEFAULT_PROFILE),appVersion=options.appVersion||Build.version;
  const compatibility=Protocol.createCompatibility(runtime,{appVersion,implementationHash:Build.gameplaySourceHash});
  const configured=options.transportFactory||options.serviceURL||Config.serviceURL;
  const listeners=new Set();let transport=null,host=null,client=null,identity=null,role=null,name='Commander',lobby=null,lastSnapshot=null,error=null,epoch=0,previousPeer=false,starting=false,ackMatch=null,lastPeerId=null,completedResult=null;
  const counters={received:0,sent:0,rejected:0,resyncs:0,disconnects:0};let ticker=null,pendingAction=null,pendingTimer=null,syncRetryTimer=null;
  function clearPending(){clearTimeout(pendingTimer);pendingTimer=null;pendingAction=null;}
  function requestSync(attempt=0){
    clearTimeout(syncRetryTimer);syncRetryTimer=null;
    if(!client||!transport)return;
    try{route(client.requestResync());}catch{/* Reconnect restores the next authoritative view. */}
    if(client?.needsResync()&&attempt<6){syncRetryTimer=setTimeout(()=>requestSync(attempt+1),1500);syncRetryTimer.unref?.();}
  }
  let connection={state:'idle',route:'relay'},phase='menu',modelRevision=0;
  function state(){
    const localSeat=lastSnapshot?.localSeat??(role==='guest'?1:0);
    return clone({modelRevision,phase,available:!!configured,configurationRequired:!configured,connection,sessionId:identity?.sessionId||null,
      code:identity?.inviteCode||null,localSeat,lobbySeat:role==='guest'?1:0,names:lastSnapshot?.names||lobby?.players?.map(p=>p?.name)||[],
      lobby:lobby||{players:[],canStart:false,startReason:'Invite a friend to begin.'},snapshot:lastSnapshot?{...lastSnapshot,pending:!!pendingAction}:null,
      result:lastSnapshot?.result||null,error});
  }
  function emit(){modelRevision++;const model=state();for(const fn of listeners)fn(model);options.onActive?.(isActive());}
  function isActive(){return !!lastSnapshot?.state&&lastSnapshot.state.winner===null;}
  function fail(code,message){error={code:safeCode(code),message:message||'Could not complete the private-match request.'};emit();return {ok:false,...error,state:state()};}
  function envelope(type,data={}){return client.message(type,data);}
  function send(message,toId){if(!transport)throw Object.assign(Error('No private session.'),{code:'NO_SESSION'});transport.send(message,toId);counters.sent++;}
  function accept(message){
    const result=client.accept(message);
    if(result.ok&&result.type==='checkpoint'&&result.noop)return;
    if(result.ok===false){
      counters.rejected++;
      if(result.code==='STALE_SNAPSHOT')return;
      clearPending();
      error={code:safeCode(result.code),message:result.reason||'The action was rejected.'};
      if(role==='guest'&&!lastSnapshot&&['VERSION_MISMATCH','PROTOCOL_MISMATCH','RULESET_MISMATCH','INVITE_EXPIRED','SESSION_EXPIRED','MATCH_FULL','MATCH_CLOSED'].includes(result.code)){
        const rejected={...error};leave().then(()=>fail(rejected.code,rejected.message));return;
      }
      if(result.resync){counters.resyncs++;if(lastSnapshot)lastSnapshot={...lastSnapshot,status:'synchronizing',legalActions:[]};queueMicrotask(()=>requestSync());}
    }else{
      if(message.messageType==='snapshot'||message.messageType==='lobby'||message.messageType==='state'&&message.sequence>(pendingAction?.sequence??Infinity)){clearPending();clearTimeout(syncRetryTimer);syncRetryTimer=null;}
      const rawLobby=client.getLobby();
      if(rawLobby)lobby=normalizeLobby(rawLobby);
      lastSnapshot=client.getSnapshot();
      if(lastSnapshot?.result)completedResult={matchId:lastSnapshot.matchId,winner:lastSnapshot.result.winner,reason:lastSnapshot.result.reason,seed:lastSnapshot.result.seed,windows:lastSnapshot.result.windows};
      if(lastSnapshot?.state){phase=lastSnapshot.state.winner!==null?'results':'match';error=null;}
      else if(lobby){phase=lobby.status==='closed'?'closed':'lobby';ackMatch=null;}
      if(lastSnapshot?.status==='starting'&&ackMatch!==lastSnapshot.matchId){const pendingMatch=lastSnapshot.matchId;ackMatch=pendingMatch;queueMicrotask(()=>{if(lastSnapshot?.matchId===pendingMatch)route(envelope('startAck'));});}
    }
    emit();
  }
  function normalizeLobby(raw){return {...raw,players:raw.players.map(p=>({...p,legal:p.deck?.legal===true,reason:p.deck?.legal?'Legal deck':'Choose a legal deck and Commander.',deck:p.deck?{...p.deck,faction:p.faction}:null})),startReason:raw.startReasons?.join(' ')||''};}
  function flush(result){
    if(!result)return;
    for(const item of result.outbox||[]){if(item.toId===identity?.senderId)accept(item.message);else{try{send(item.message,item.toId);}catch(failure){if(failure.code!=='PEER_DISCONNECTED')error={code:safeCode(failure.code),message:'Waiting for the connection to recover.'};}}}
    if(result.local?.players)lobby=normalizeLobby(result.local);
    if(result.ok===false){counters.rejected++;error={code:safeCode(result.code),message:result.reason||'The action was rejected.'};}
    emit();
  }
  function route(message){if(role==='host')flush(host.handle(identity.senderId,message));else send(message);}
  function connectionChanged(next){
    const mapped={creating:'connecting',joining:'connecting','connection-lost':'disconnected',error:'disconnected'};
    connection={state:next.status==='connected'&&!next.peerConnected&&isActive()?'reconnecting':mapped[next.status]||next.status,route:next.route,latencyMs:next.latencyMs??null,reason:next.lastErrorCode||null,
      peerConnected:next.peerConnected===true,reconnectAttempts:next.reconnectAttempts||0};
    if(identity){identity={...identity,...next};}
    if(client&&lastSnapshot?.state?.winner===null&&(next.status!=='connected'||!next.peerConnected)){
      client.disconnect();lastSnapshot={...lastSnapshot,status:'reconnecting',legalActions:[]};
    }
    if(next.peer?.senderId)lastPeerId=next.peer.senderId;
    if(host&&lastPeerId&&next.status==='connected'){
      if(previousPeer&&!next.peerConnected&&host.lobby().players.some(p=>p.senderId===lastPeerId)){counters.disconnects++;flush(host.disconnect(lastPeerId));}
    }
    if(next.status==='connected')previousPeer=next.peerConnected===true;emit();
  }
  async function open(nextRole,payload){
    if(transport)throw Object.assign(Error('Leave the current private lobby first.'),{code:'SESSION_ALREADY_OPEN'});
    if(!configured)throw Object.assign(Error('The private online service has not been activated for this build.'),{code:'SERVICE_UNCONFIGURED'});
    const current=++epoch;role=nextRole;name=cleanName(payload.name);phase='menu';error=null;starting=true;
    transport=options.transportFactory?options.transportFactory():Transport.createRelayTransport({serviceURL:options.serviceURL||Config.serviceURL,
      allowLocalhost:options.allowLocalhost===true,reconnectGraceMs:Config.reconnectGraceMs,...options.transportOptions});
    transport.onState(next=>{if(current===epoch)connectionChanged(next);});
    transport.onMessage(data=>{
      if(current!==epoch||!identity)return;counters.received++;
      try{
        if(role==='host'){if(data.senderRole!=='guest')return;flush(host.handle(data.senderId,data.message));}
        else{if(data.senderRole!=='host'||data.senderId!==identity.peer?.senderId)return;accept(data.message);}
      }catch(failure){fail(failure.code||'INVALID_MESSAGE','A private-match message was rejected.');}
    });
    transport.onDisconnected(()=>{if(current!==epoch)return;counters.disconnects++;clearPending();client?.disconnect();if(lastSnapshot)lastSnapshot={...lastSnapshot,status:'reconnecting',legalActions:[]};if(host&&identity)flush(host.disconnect(identity.senderId));emit();});
    transport.onConnected(next=>{
      if(current!==epoch||starting||!identity)return;
      identity={...identity,...next};
      if(host){const credential=host.getReconnectCredential(identity.senderId);flush(host.reconnect(identity.senderId,credential.token));}else route(client.hello(name));
    });
    try{
      identity=await(nextRole==='host'?transport.hostSession():transport.joinSession(payload.code));
      client=Session.createClient({compatibility,sessionId:identity.sessionId,senderId:identity.senderId});
      if(nextRole==='host'){
        host=Session.createHost({runtime,appVersion,sessionId:identity.sessionId,hostId:identity.senderId,name,
          implementationHash:Build.gameplaySourceHash,reconnectGraceMs:Config.reconnectGraceMs,...options.hostOptions});
        let ticks=0;ticker=setInterval(()=>{
          const result=host?.tick();if(result?.outbox?.length)flush(result);
          if(++ticks%5===0&&transport?.getConnectionState().status==='connected')for(const item of host?.checkpointMessages()||[])if(item.toId!==identity?.senderId)try{send(item.message,item.toId);}catch{/* Presence/reconnect owns connection recovery. */}
        },1000);ticker.unref?.();
        lobby=normalizeLobby(host.lobby());phase='lobby';
      }else{route(client.hello(name));phase='lobby';}
      starting=false;emit();return {ok:true,state:state()};
    }catch(failure){starting=false;if(current===epoch)await leave();throw failure;}
  }
  async function leave(){
    if(transport&&client&&identity&&transport.getConnectionState().status==='connected')try{route(envelope('leave'));}catch{/* Presence loss still pauses the peer if notification cannot be delivered. */}
    ++epoch;clearPending();clearTimeout(syncRetryTimer);syncRetryTimer=null;clearInterval(ticker);ticker=null;const old=transport;transport=null;host=null;client=null;identity=null;role=null;lobby=null;lastSnapshot=null;previousPeer=false;starting=false;ackMatch=null;lastPeerId=null;completedResult=null;
    phase='menu';connection={state:'idle',route:'relay'};error=null;
    if(old)try{await old.closeSession();}catch{/* An offline leave still returns to the offline menu. */}emit();return {ok:true,state:state()};
  }
  function diagnostics(){
    const h=host?.diagnostics?.()||{},t=transport?.diagnostics?.()||{};
    // Build this explicitly: provider diagnostics include session identifiers and
    // invite codes that must never appear in a shareable match report.
    return clone({format:'frontlines-private-diagnostics-v1',version:appVersion,protocolVersion:compatibility.protocolVersion||1,
      rulesetHash:compatibility.rulesetHash,contentHash:compatibility.contentHash,transport:t.transportVersion||Transport.VERSION,
      sessionId:identity?.sessionId||null,matchId:lastSnapshot?.matchId||null,route:connection.route,role,connection:{state:connection.state,latencyMs:connection.latencyMs||null},
      sequence:lastSnapshot?.sequence??0,sharedHash:lastSnapshot?.sharedHash||null,viewHash:lastSnapshot?.stateHash||null,
      status:lastSnapshot?.status||phase,result:lastSnapshot?.result?{winner:lastSnapshot.state?.winner,reason:lastSnapshot.result.reason}:null,
      counters:{...counters,messagesSent:t.messagesSent||0,messagesReceived:t.messagesReceived||0,reconnections:t.reconnections||0},
      providerErrors:(t.providerErrors||[]).map(row=>({code:safeCode(row.code),time:row.time})),
      completedMatch:completedResult,canonicalHash:lastSnapshot?.state?.winner!==null&&typeof h.canonicalHash==='string'?h.canonicalHash:null,
      events:(h.events||[]).map(row=>Object.fromEntries(['type','at','sequence','actionId','actionType','code'].filter(key=>row[key]!==undefined).map(key=>[key,row[key]]))),
      limitations:['Host authority is suitable for private friend play, not ranked anti-cheat.','Application restart does not migrate a match.'],
      excludes:['invite code','reconnect capability','socket ticket','IP address','private hands','reserve order','private deck lists']});
  }
  async function command(type,payload={}){
    try{
      const data=validateCommand(type,payload);error=null;
      if(type==='host'||type==='join')return await open(type==='host'?'host':'guest',data);
      if(type==='leave')return await leave();
      if(type==='report')return {ok:true,report:diagnostics(),state:state()};
      if(!identity||!client)throw Object.assign(Error('Host or join a private match first.'),{code:'NO_SESSION'});
      if(type==='intent'){
        if(pendingAction)throw Object.assign(Error('Wait for your previous command to be confirmed.'),{code:'ACTION_PENDING'});
        const message=client.makeIntent(data.action);pendingAction={actionId:message.actionId,sequence:message.sequence};
        pendingTimer=setTimeout(()=>{
          if(!pendingAction)return;clearPending();counters.resyncs++;error={code:'ACTION_CONFIRMATION_TIMEOUT',message:'The command was not confirmed. Synchronizing the battlefield; no action is replayed.'};
          client?.disconnect();if(lastSnapshot)lastSnapshot={...lastSnapshot,status:'synchronizing',legalActions:[]};emit();
          requestSync();
        },options.intentTimeoutMs||8000);pendingTimer.unref?.();
        emit();try{route(message);}catch(failure){clearPending();throw failure;}
      }
      else if(type==='resync'){counters.resyncs++;route(envelope('resync'));}
      else if(type==='select')route(envelope('selection',{deck:{...data.deck,faction:data.faction||data.deck?.faction,commanderId:data.commanderId||data.deck?.commanderId}}));
      else if(type==='name'){name=cleanName(data.name);route(envelope('name',{name}));}
      else if(type==='lobby')route(envelope('returnLobby'));
      else if(type==='wait')route(envelope('waitLonger'));
      else route(envelope(type,data));
      return {ok:!error,...(error||{}),state:state()};
    }catch(failure){return fail(failure.code||'NETWORK_ERROR',failure.message);}
  }
  return Object.freeze({command,getState:state,onState(fn){listeners.add(fn);return()=>listeners.delete(fn);},isActive,diagnostics,
    dispose:leave,interruptForTest(){if(!options.allowTestFaults)throw Error('Test faults disabled.');return transport?.interruptForTest();}});
}
module.exports={createController,validateCommand,COMMANDS};
