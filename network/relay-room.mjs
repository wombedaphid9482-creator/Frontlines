// Provider-independent two-seat relay service. No card rules or private engine state live here.
export const SERVICE_VERSION=1;
export const MAX_HTTP_BYTES=8192,MAX_FRAME_BYTES=262144;
export const INVITE_ALPHABET='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const SESSION_TTL_MS=6*60*60*1000,INVITE_TTL_MS=15*60*1000,TICKET_TTL_MS=30000;
export const utf8Bytes=value=>new TextEncoder().encode(value).length;
export const clone=value=>JSON.parse(JSON.stringify(value));
export function normalizeInvite(value){if(typeof value!=='string')return null;const code=value.toUpperCase().replace(/[\s-]/g,'');return code.length===8&&[...code].every(c=>INVITE_ALPHABET.includes(c))?code:null;}
export function randomValue(length=32){const values=new Uint8Array(length);crypto.getRandomValues(values);return Array.from(values,b=>b.toString(16).padStart(2,'0')).join('');}
export function randomInvite(){const values=new Uint8Array(8);crypto.getRandomValues(values);return Array.from(values,b=>INVITE_ALPHABET[b&31]).join('');}
export async function hashToken(token){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export function fail(code,status=400){return Object.assign(new Error(code),{code,status});}
export function validObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
export async function readJSON(request){
  const declared=Number(request.headers.get('Content-Length')||0);if(declared>MAX_HTTP_BYTES){try{await request.body?.cancel();}catch{}throw fail('REQUEST_TOO_LARGE',413);}
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw fail('INVALID_REQUEST',415);
  // Read bounded chunks: a missing/forged Content-Length cannot force an unbounded allocation.
  const reader=request.body?.getReader();let size=0,text='';const decoder=new TextDecoder();if(!reader)throw fail('INVALID_REQUEST');
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_HTTP_BYTES){await reader.cancel();throw fail('REQUEST_TOO_LARGE',413);}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  let data;try{data=JSON.parse(text);}catch{throw fail('INVALID_REQUEST');}if(!validObject(data))throw fail('INVALID_REQUEST');return data;
}
export function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});}
export class RelayRoom {
  constructor({storage,now=()=>Date.now(),token=randomValue}={}){this.storage=storage;this.now=now;this.token=token;this.room=null;this.tail=Promise.resolve();}
  async restore(){if(this.room===null)this.room=await this.storage.get('room')||null;return this.room;}
  async save(){await this.storage.put('room',clone(this.room));}
  serial(fn){const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next;}
  current(){if(!this.room)throw fail('MATCH_NOT_FOUND',404);if(this.room.closed)throw fail('MATCH_CLOSED',410);if(this.room.expiresAt<=this.now())throw fail('MATCH_EXPIRED',410);return this.room;}
  async member(role){const reconnectToken=this.token(),senderId=this.token(16);return {member:{senderId,role,tokenHash:await hashToken(reconnectToken),joinedAt:this.now(),tickets:[]},reconnectToken};}
  receipt(member,reconnectToken){return {ok:true,code:this.room.code,sessionId:this.room.sessionId,senderId:member.senderId,role:member.role,reconnectToken,expiresAt:this.room.expiresAt,inviteExpiresAt:this.room.inviteExpiresAt,serviceVersion:SERVICE_VERSION};}
  create(code){return this.serial(async()=>{await this.restore();if(this.room&&this.room.expiresAt>this.now()&&!this.room.closed)throw fail('INVITE_COLLISION',409);const {member,reconnectToken}=await this.member('host');this.room={version:SERVICE_VERSION,code,sessionId:this.token(16),createdAt:this.now(),expiresAt:this.now()+SESSION_TTL_MS,inviteExpiresAt:this.now()+INVITE_TTL_MS,closed:false,members:[member]};await this.save();return this.receipt(member,reconnectToken);});}
  join(){return this.serial(async()=>{await this.restore();const room=this.current();if((room.inviteExpiresAt??room.createdAt+INVITE_TTL_MS)<=this.now())throw fail('MATCH_EXPIRED',410);if(room.members.length!==1)throw fail('MATCH_FULL',409);const {member,reconnectToken}=await this.member('guest');room.members.push(member);await this.save();return this.receipt(member,reconnectToken);});}
  async authenticate(data){
    if(!validObject(data)||typeof data.sessionId!=='string'||typeof data.senderId!=='string'||typeof data.reconnectToken!=='string'||data.reconnectToken.length>128)throw fail('AUTH_FAILED',403);
    const room=this.current();if(data.sessionId!==room.sessionId)throw fail('AUTH_FAILED',403);const member=room.members.find(m=>m.senderId===data.senderId);if(!member||await hashToken(data.reconnectToken)!==member.tokenHash)throw fail('AUTH_FAILED',403);return member;
  }
  ticket(data){return this.serial(async()=>{await this.restore();const member=await this.authenticate(data),ticket=this.token();member.tickets=member.tickets.filter(t=>t.expiresAt>this.now()).slice(-3);member.tickets.push({hash:await hashToken(ticket),expiresAt:this.now()+TICKET_TTL_MS});await this.save();return {ok:true,ticket,expiresAt:this.now()+TICKET_TTL_MS};});}
  consumeTicket(ticket){return this.serial(async()=>{await this.restore();this.current();if(typeof ticket!=='string'||ticket.length!==64)throw fail('AUTH_FAILED',403);const hash=await hashToken(ticket);for(const member of this.room.members){const index=member.tickets.findIndex(t=>t.hash===hash&&t.expiresAt>this.now());if(index>=0){member.tickets.splice(index,1);await this.save();return {senderId:member.senderId,role:member.role,sessionId:this.room.sessionId,code:this.room.code,expiresAt:this.room.expiresAt};}}throw fail('AUTH_FAILED',403);});}
  leave(data){return this.serial(async()=>{await this.restore();const member=await this.authenticate(data);if(member.role==='host'){this.room.closed=true;this.room.members=[];}else this.room.members=this.room.members.filter(m=>m!==member);await this.save();return {ok:true,closed:this.room.closed,senderId:member.senderId};});}
  async publicMembers(){await this.restore();const room=this.current();return room.members.map(m=>({senderId:m.senderId,role:m.role}));}
  async authorizedSocket(attachment){await this.restore();const room=this.current();if(!attachment||attachment.sessionId!==room.sessionId||!room.members.some(m=>m.senderId===attachment.senderId&&m.role===attachment.role))throw fail('AUTH_FAILED',403);return attachment;}
  async expired(){await this.restore();return !this.room||this.room.closed||this.room.expiresAt<=this.now();}
  async cleanup(){this.room=null;await this.storage.deleteAll();}
}

export function parseFrame(raw){
  if(typeof raw!=='string')throw fail('INVALID_MESSAGE');if(utf8Bytes(raw)>MAX_FRAME_BYTES)throw fail('MESSAGE_TOO_LARGE',413);let data;try{data=JSON.parse(raw);}catch{throw fail('INVALID_MESSAGE');}if(!validObject(data))throw fail('INVALID_MESSAGE');
  if(data.type==='ping'){if(Object.keys(data).some(k=>!['type','sentAt'].includes(k))||!Number.isSafeInteger(data.sentAt))throw fail('INVALID_MESSAGE');return data;}
  if(data.type!=='forward'||Object.keys(data).some(k=>!['type','message','destinationId'].includes(k))||!validObject(data.message)||(data.destinationId!==undefined&&(typeof data.destinationId!=='string'||data.destinationId.length>64)))throw fail('INVALID_MESSAGE');return data;
}
