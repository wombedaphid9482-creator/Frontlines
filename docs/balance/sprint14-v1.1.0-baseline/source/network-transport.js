(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FrontlinesNetworkTransport=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const VERSION='frontlines-transport-v1',WIRE_VERSION=1,MAX_MESSAGE_BYTES=262144,ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const clone=value=>JSON.parse(JSON.stringify(value)),bytes=value=>new TextEncoder().encode(value).length;
  function normalizeInvite(value){if(typeof value!=='string')return null;const code=value.toUpperCase().replace(/[\s-]/g,'');return code.length===8&&[...code].every(c=>ALPHABET.includes(c))?code:null;}
  function formatInvite(code){return code.slice(0,4)+'-'+code.slice(4);}
  function randomToken(length=24){const values=new Uint8Array(length);globalThis.crypto.getRandomValues(values);return Array.from(values,b=>b.toString(16).padStart(2,'0')).join('');}
  function randomInvite(){const values=new Uint8Array(8);globalThis.crypto.getRandomValues(values);return Array.from(values,b=>ALPHABET[b&31]).join('');}
  function error(code){const e=new Error(code);e.code=code;return e;}
  function emitter(){const listeners={};return {on(type,fn){if(typeof fn!=='function')throw TypeError('Listener required');(listeners[type]??=new Set()).add(fn);return()=>listeners[type].delete(fn);},emit(type,value){for(const fn of listeners[type]||[])fn(clone(value));}};}
  function validEndpoint(value,allowLocalhost){let url;try{url=new URL(value);}catch{throw error('SERVICE_UNAVAILABLE');}const local=['127.0.0.1','localhost','[::1]'].includes(url.hostname);if(url.username||url.password||url.search||url.hash||!(url.protocol==='https:'||(allowLocalhost&&local&&url.protocol==='http:')))throw error('SERVICE_UNAVAILABLE');return url.origin+url.pathname.replace(/\/$/,'');}
  function createRelayTransport(options={}){
    const fetcher=options.fetch||globalThis.fetch,Socket=options.WebSocket||globalThis.WebSocket,events=emitter();
    const grace=Math.max(1000,Math.min(300000,options.reconnectGraceMs||90000));let endpoint=null,credential=null,socket=null,retryTimer=null,heartbeat=null,manual=false,generation=0,attempts=0,lostAt=null,lastPong=0;
    const publicState={status:'idle',role:null,senderId:null,sessionId:null,inviteCode:null,peer:null,peerConnected:false,route:'relay',expiresAt:null,latencyMs:null,reconnectAttempts:0,lastErrorCode:null};
    const counters={messagesSent:0,messagesReceived:0,reconnections:0,providerErrors:[],connectionTimes:[]};
    function state(){return clone(publicState);}
    function change(patch){Object.assign(publicState,patch);events.emit('state',state());}
    function note(code){counters.providerErrors.push({code,time:new Date().toISOString()});if(counters.providerErrors.length>40)counters.providerErrors.shift();}
    function timers(){clearTimeout(retryTimer);clearInterval(heartbeat);retryTimer=heartbeat=null;}
    async function post(path,body){
      if(!endpoint)endpoint=validEndpoint(options.serviceURL,options.allowLocalhost===true);
      const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),options.requestTimeoutMs||12000);try{
        const response=await fetcher(endpoint+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctrl.signal,credentials:'omit',cache:'no-store'});
        let data;try{data=await response.json();}catch{throw error('SERVICE_UNAVAILABLE');}
        if(!response.ok||!data.ok)throw error(typeof data.error==='string'&&/^[A-Z_]{3,48}$/.test(data.error)?data.error:'SERVICE_UNAVAILABLE');return data;
      }catch(e){if(e.code)throw e;throw error('SERVICE_UNAVAILABLE');}finally{clearTimeout(timeout);}
    }
    function scheduleReconnect(){
      if(manual||!credential)return;if(lostAt===null)lostAt=Date.now();
      if(Date.now()-lostAt>=grace){change({status:'connection-lost',lastErrorCode:'CONNECTION_LOST'});return;}
      change({status:'reconnecting',reconnectAttempts:attempts});retryTimer=setTimeout(()=>{attempts++;openSocket(true).catch(e=>{note(e.code||'SERVICE_UNAVAILABLE');if(['MATCH_CLOSED','MATCH_EXPIRED','AUTH_FAILED'].includes(e.code)){change({status:'closed',lastErrorCode:e.code});return;}scheduleReconnect();});},Math.min(8000,500*2**Math.min(attempts,4)));
    }
    async function openSocket(reconnecting=false){
      if(!credential)throw error('NO_SESSION');manual=false;timers();const current=++generation;
      const ticket=await post('/v1/rooms/'+credential.code+'/ticket',{sessionId:credential.sessionId,senderId:credential.senderId,reconnectToken:credential.reconnectToken});
      if(current!==generation||manual)throw error('CANCELLED');
      return new Promise((resolve,reject)=>{
        let ready=false,settled=false;const url=endpoint.replace(/^http/,'ws')+'/v1/rooms/'+credential.code+'/socket';
        const ws=new Socket(url,['frontlines-relay-v1','ticket.'+ticket.ticket]);socket=ws;
        const timeout=setTimeout(()=>{if(!ready){ws.close();if(!settled){settled=true;reject(error('CONNECTION_FAILED'));}}},options.socketTimeoutMs||12000);
        ws.addEventListener('message',event=>{
          if(current!==generation)return;let data;try{if(typeof event.data!=='string'||bytes(event.data)>MAX_MESSAGE_BYTES+1024)throw Error();data=JSON.parse(event.data);}catch{note('INVALID_RELAY_MESSAGE');ws.close(1008,'Invalid message');return;}
          if(data.type==='connected'){
            if(data.senderId!==credential.senderId||data.sessionId!==credential.sessionId){note('AUTH_FAILED');ws.close(1008,'Authentication failed');return;}
            ready=true;clearTimeout(timeout);attempts=0;lostAt=null;lastPong=Date.now();if(reconnecting)counters.reconnections++;
            const peer=Array.isArray(data.members)?data.members.find(m=>m.senderId!==credential.senderId):null;
            change({status:'connected',lastErrorCode:null,reconnectAttempts:0,...(Array.isArray(data.members)?{peer:peer?{senderId:peer.senderId,role:peer.role}:null,peerConnected:peer?.connected===true}:{})});counters.connectionTimes.push(new Date().toISOString());events.emit('connected',state());
            heartbeat=setInterval(()=>{if(current!==generation)return;if(Date.now()-lastPong>60000){ws.close(4000,'Connection interrupted');return;}try{ws.send(JSON.stringify({type:'ping',sentAt:Date.now()}));}catch{}},20000);
            if(!settled){settled=true;resolve(state());}
          }else if(data.type==='presence'){
            const peer=Array.isArray(data.members)?data.members.find(m=>m.senderId!==credential.senderId):null;
            change({peer:peer?{senderId:peer.senderId,role:peer.role}:null,peerConnected:peer?.connected===true});
          }else if(data.type==='message'){
            if(!ready||!data.senderId||data.senderId===credential.senderId||!data.message||typeof data.message!=='object'){note('INVALID_RELAY_MESSAGE');return;}
            counters.messagesReceived++;events.emit('message',{senderId:data.senderId,senderRole:data.senderRole,message:data.message});
          }else if(data.type==='pong'){
            lastPong=Date.now();change({latencyMs:Math.max(0,Math.min(60000,Date.now()-data.sentAt))});
          }else if(data.type==='error'){
            const code=/^[A-Z_]{3,48}$/.test(data.error||'')?data.error:'SERVICE_UNAVAILABLE';note(code);change({lastErrorCode:code});
          }else if(data.type==='closed'){
            manual=true;timers();change({status:'closed',peerConnected:false,lastErrorCode:'MATCH_CLOSED'});events.emit('disconnected',state());ws.close();
          }
        });
        ws.addEventListener('error',()=>{note('SOCKET_ERROR');});
        ws.addEventListener('close',()=>{
          clearTimeout(timeout);if(current!==generation)return;clearInterval(heartbeat);heartbeat=null;socket=null;
          if(!settled){settled=true;reject(error('CONNECTION_FAILED'));}
          if(manual){if(publicState.status!=='closed')change({status:'disconnected',peerConnected:false});return;}
          if(ready){change({status:'reconnecting',peerConnected:false});events.emit('disconnected',state());scheduleReconnect();}
        });
      });
    }
    async function createOrJoin(code){
      if(credential)throw error('SESSION_ALREADY_OPEN');change({status:code?'joining':'creating',lastErrorCode:null});
      try{const data=await post(code?'/v1/rooms/'+code+'/join':'/v1/rooms',{});credential={code:data.code,sessionId:data.sessionId,senderId:data.senderId,reconnectToken:data.reconnectToken};
        change({status:'connecting',role:data.role,senderId:data.senderId,sessionId:data.sessionId,inviteCode:formatInvite(data.code),expiresAt:data.expiresAt});return await openSocket();
      }catch(e){note(e.code||'SERVICE_UNAVAILABLE');if(!credential)change({status:'error',lastErrorCode:e.code||'SERVICE_UNAVAILABLE'});else{change({status:'reconnecting',lastErrorCode:e.code||'CONNECTION_FAILED'});scheduleReconnect();}throw e;}
    }
    function disconnect(){manual=true;++generation;timers();if(socket)try{socket.close(1000,'Leaving connection');}catch{}socket=null;change({status:'disconnected',peerConnected:false});events.emit('disconnected',state());}
    return Object.freeze({
      hostSession:()=>createOrJoin(null),joinSession(code){const normalized=normalizeInvite(code);if(!normalized)return Promise.reject(error('INVALID_INVITE'));return createOrJoin(normalized);},
      connect:()=>openSocket(true),disconnect,
      async closeSession(){if(!credential){disconnect();return {ok:true};}let result;try{result=await post('/v1/rooms/'+credential.code+'/leave',{sessionId:credential.sessionId,senderId:credential.senderId,reconnectToken:credential.reconnectToken});}finally{disconnect();credential=null;change({status:'closed',sessionId:null,senderId:null,inviteCode:null,peer:null,role:null});}return result;},
      send(message,destinationId){let text;try{if(!message||typeof message!=='object'||Array.isArray(message))throw Error();text=JSON.stringify({type:'forward',message,...(destinationId?{destinationId}:{})});}catch{throw error('INVALID_MESSAGE');}if(bytes(text)>MAX_MESSAGE_BYTES)throw error('MESSAGE_TOO_LARGE');if(publicState.status!=='connected'||!socket||socket.readyState!==1)throw error('NOT_CONNECTED');socket.send(text);counters.messagesSent++;return {ok:true};},
      onMessage:fn=>events.on('message',fn),onConnected:fn=>events.on('connected',fn),onDisconnected:fn=>events.on('disconnected',fn),onState:fn=>events.on('state',fn),getConnectionState:state,
      diagnostics:()=>({...state(),transportVersion:VERSION,...clone(counters)}),
      // Development faults remain outside the normal UI; no gameplay decisions use this clock.
      interruptForTest(){if(!socket)throw error('NOT_CONNECTED');socket.close(4000,'Test interruption');}
    });
  }
  function createLoopbackHub(options={}){
    const rooms=new Map(),adapters=new Map(),pending=[],now=options.now||(()=>Date.now());let faults={delayMs:options.delayMs||0,duplicate:0,drop:0,reverse:false};
    function deliver(fn){pending.push(fn);if(options.autoFlush!==false)setTimeout(flush,faults.delayMs);}
    function flush(){const queue=pending.splice(0);if(faults.reverse)queue.reverse();for(const fn of queue)fn();}
    function presence(room){for(const member of room.members.values())member.change({peer:Array.from(room.members.values()).filter(m=>m!==member).map(m=>({senderId:m.id,role:m.role}))[0]||null,peerConnected:Array.from(room.members.values()).some(m=>m!==member&&m.connected)});}
    function createTransport(){
      const events=emitter();let room=null,id=null,role=null,connected=false;const s={status:'idle',role:null,senderId:null,sessionId:null,inviteCode:null,peer:null,peerConnected:false,route:'loopback',expiresAt:null};
      const record={get id(){return id;},get role(){return role;},get connected(){return connected;},receive:value=>events.emit('message',value),change(p){Object.assign(s,p);events.emit('state',s);}};
      function connect(){if(!room||room.closed)throw error('MATCH_CLOSED');connected=true;const peer=Array.from(room.members.values()).find(m=>m!==record);record.change({status:'connected',peer:peer?{senderId:peer.id,role:peer.role}:null,peerConnected:peer?.connected===true});presence(room);events.emit('connected',s);return Promise.resolve(clone(s));}
      function bind(found,nextRole){room=found;role=nextRole;id=randomToken(12);room.members.set(id,record);adapters.set(id,{record,connect,drop});record.change({role,senderId:id,sessionId:room.id,inviteCode:formatInvite(room.code),expiresAt:room.expiresAt});return connect();}
      function drop(){connected=false;record.change({status:'reconnecting',peerConnected:false});presence(room);events.emit('disconnected',s);}
      return Object.freeze({
        hostSession(){if(room)throw error('SESSION_ALREADY_OPEN');let code;do{code=randomInvite();}while(rooms.has(code));const r={code,id:randomToken(12),expiresAt:now()+21600000,inviteExpiresAt:now()+900000,members:new Map(),closed:false};rooms.set(code,r);return bind(r,'host');},
        joinSession(value){if(room)throw error('SESSION_ALREADY_OPEN');const code=normalizeInvite(value),r=code&&rooms.get(code);if(!code)throw error('INVALID_INVITE');if(!r||r.closed)throw error('MATCH_NOT_FOUND');if(r.expiresAt<=now()||r.inviteExpiresAt<=now())throw error('MATCH_EXPIRED');if(r.members.size!==1)throw error('MATCH_FULL');return bind(r,'guest');},connect,
        disconnect(){if(room)drop();record.change({status:'disconnected'});},
        closeSession(){if(!room)return Promise.resolve({ok:true});connected=false;if(role==='host'){room.closed=true;for(const member of room.members.values()){adapters.get(member.id)?.drop();member.change({status:'closed',peerConnected:false});}}else room.members.delete(id);if(!room.closed)presence(room);record.change({status:'closed',peerConnected:false});return Promise.resolve({ok:true});},
        send(message,destinationId){const text=JSON.stringify(message);if(!message||typeof message!=='object'||Array.isArray(message))throw error('INVALID_MESSAGE');if(bytes(text)>MAX_MESSAGE_BYTES)throw error('MESSAGE_TOO_LARGE');if(!connected||!room||room.closed)throw error('NOT_CONNECTED');const target=Array.from(room.members.values()).find(m=>m!==record);if(!target||!target.connected)throw error('PEER_DISCONNECTED');if(destinationId&&target.id!==destinationId)throw error('INVALID_DESTINATION');if(faults.drop>0){faults.drop--;return {ok:true};}const copies=1+(faults.duplicate>0?(faults.duplicate--,1):0);for(let i=0;i<copies;i++)deliver(()=>{if(target.connected)target.receive({senderId:id,senderRole:role,message:JSON.parse(text)});});return {ok:true};},
        onMessage:fn=>events.on('message',fn),onConnected:fn=>events.on('connected',fn),onDisconnected:fn=>events.on('disconnected',fn),onState:fn=>events.on('state',fn),getConnectionState:()=>clone(s),diagnostics:()=>({...clone(s),transportVersion:VERSION}),interruptForTest:drop
      });
    }
    return Object.freeze({createTransport,flush,setFaults(value){faults={...faults,...value};},dropConnection(senderId){const a=adapters.get(senderId);if(!a)throw error('INVALID_SENDER');a.drop();},reconnect(senderId){const a=adapters.get(senderId);if(!a)throw error('INVALID_SENDER');return a.connect();},expire(code){const r=rooms.get(normalizeInvite(code));if(r)r.expiresAt=0;}});
  }
  return Object.freeze({VERSION,WIRE_VERSION,MAX_MESSAGE_BYTES,normalizeInvite,formatInvite,createRelayTransport,createLoopbackHub});
});
