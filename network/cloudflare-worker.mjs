import {DurableObject} from 'cloudflare:workers';
import {RelayRoom,normalizeInvite,randomInvite,readJSON,json,fail,parseFrame} from './relay-room.mjs';

export default {
  async fetch(request,env){
    try{
      const url=new URL(request.url);if(request.method==='OPTIONS')return json({ok:true});
      if(request.method==='GET'&&url.pathname==='/health')return json({ok:true,service:'frontlines-private-relay',serviceVersion:1});
      // IP is used only as an ephemeral limiter key and is never persisted or logged.
      if(env.API_LIMIT){const key=(request.headers.get('CF-Connecting-IP')||'unknown')+(url.pathname==='/v1/rooms'?':create':':session');if(!(await env.API_LIMIT.limit({key})).success)return json({ok:false,error:'TOO_MANY_REQUESTS'},429);}
      if(request.method==='POST'&&url.pathname==='/v1/rooms'){
        await readJSON(request);for(let attempt=0;attempt<5;attempt++){const code=randomInvite(),stub=env.ROOMS.getByName(code);const result=await stub.fetch(new Request('https://room.internal/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}));if(result.status!==409)return result;}throw fail('SERVICE_BUSY',503);
      }
      const found=/^\/v1\/rooms\/([A-Z2-9]{8})\/(join|ticket|leave|socket)$/.exec(url.pathname),code=found&&normalizeInvite(found[1]);if(!code)throw fail('MATCH_NOT_FOUND',404);
      const action=found[2];if((action==='socket'&&request.method!=='GET')||(action!=='socket'&&request.method!=='POST'))throw fail('INVALID_REQUEST',405);
      const destination=new URL(request.url);destination.hostname='room.internal';destination.pathname='/'+action;
      if(action==='socket')return await env.ROOMS.getByName(code).fetch(new Request(destination,request));
      // Consume/validate at the edge before forwarding a bounded body. A DO must
      // not reply while a rejected oversized upstream request is still piping.
      const body=await readJSON(request);return await env.ROOMS.getByName(code).fetch(new Request(destination,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
    }catch(e){return json({ok:false,error:e.code||'SERVICE_UNAVAILABLE'},e.status||503);}
  }
};

export class FrontlinesRoom extends DurableObject {
  constructor(ctx,env){super(ctx,env);this.room=new RelayRoom({storage:ctx.storage});this.ctx=ctx;}
  sockets(){return this.ctx.getWebSockets();}
  send(ws,data){try{ws.send(JSON.stringify(data));return true;}catch{return false;}}
  async members(){
    let members;try{members=await this.room.publicMembers();}catch{return;}
    const sockets=this.sockets();for(const member of members)member.connected=sockets.some(ws=>{const a=ws.deserializeAttachment();return a?.senderId===member.senderId&&ws.readyState===1;});
    return members;
  }
  async presence(){
    const members=await this.members();if(!members)return;
    for(const ws of this.sockets())this.send(ws,{type:'presence',members});
  }
  async fetch(request){
    try{
      const path=new URL(request.url).pathname;
      if(path==='/socket'){
        if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')throw fail('UPGRADE_REQUIRED',426);
        const protocols=(request.headers.get('Sec-WebSocket-Protocol')||'').split(',').map(p=>p.trim()),tickets=protocols.filter(p=>p.startsWith('ticket.'));
        if(!protocols.includes('frontlines-relay-v1')||tickets.length!==1||protocols.length!==2)throw fail('AUTH_FAILED',403);
        const identity=await this.room.consumeTicket(tickets[0].slice(7));
        // A reconnect replaces only this authenticated seat's old socket.
        for(const old of this.sockets())if(old.deserializeAttachment()?.senderId===identity.senderId)old.close(4001,'Connection replaced');
        const pair=new WebSocketPair(),[client,server]=Object.values(pair);this.ctx.acceptWebSocket(server);server.serializeAttachment({...identity,rateStart:Date.now(),rateCount:0});
        this.send(server,{type:'connected',...identity,members:await this.members()});await this.presence();return new Response(null,{status:101,webSocket:client,headers:{'Sec-WebSocket-Protocol':'frontlines-relay-v1'}});
      }
      const body=await readJSON(request);let result;
      if(path==='/create'){result=await this.room.create(body.code);await this.ctx.storage.setAlarm(result.expiresAt);}
      else if(path==='/join')result=await this.room.join();
      else if(path==='/ticket')result=await this.room.ticket(body);
      else if(path==='/leave'){
        result=await this.room.leave(body);for(const ws of this.sockets()){const a=ws.deserializeAttachment();if(result.closed){this.send(ws,{type:'closed'});ws.close(1000,'Match closed');}else if(a?.senderId===result.senderId)ws.close(1000,'Left session');}await this.presence();
      }else throw fail('INVALID_REQUEST',404);
      return json(result);
    }catch(e){return json({ok:false,error:e.code||'SERVICE_UNAVAILABLE'},e.status||503);}
  }
  async webSocketMessage(ws,raw){
    try{
      const identity=await this.room.authorizedSocket(ws.deserializeAttachment());
      if(Date.now()-identity.rateStart>10000){identity.rateStart=Date.now();identity.rateCount=0;}identity.rateCount++;ws.serializeAttachment(identity);if(identity.rateCount>80)throw fail('TOO_MANY_MESSAGES',429);
      const frame=parseFrame(raw);if(frame.type==='ping'){this.send(ws,{type:'pong',sentAt:frame.sentAt});return;}
      const target=this.sockets().find(other=>other!==ws&&other.readyState===1&&other.deserializeAttachment()?.senderId!==identity.senderId);
      if(!target)throw fail('PEER_DISCONNECTED',409);if(frame.destinationId&&frame.destinationId!==target.deserializeAttachment()?.senderId)throw fail('INVALID_DESTINATION',403);
      this.send(target,{type:'message',senderId:identity.senderId,senderRole:identity.role,message:frame.message});
    }catch(e){this.send(ws,{type:'error',error:e.code||'SERVICE_UNAVAILABLE'});if(['AUTH_FAILED','MATCH_EXPIRED','MATCH_CLOSED','MESSAGE_TOO_LARGE','TOO_MANY_MESSAGES'].includes(e.code))ws.close(1008,'Session unavailable');}
  }
  async webSocketClose(ws,code,reason,wasClean){try{ws.close(code===1006?1000:code,reason);}catch{}await this.presence();}
  async webSocketError(ws){try{ws.close(1011,'Connection interrupted');}catch{}await this.presence();}
  async alarm(){if(await this.room.expired()){for(const ws of this.sockets()){this.send(ws,{type:'closed'});ws.close(1000,'Session expired');}await this.room.cleanup();}}
}
