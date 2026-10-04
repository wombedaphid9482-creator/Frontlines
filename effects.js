/* Project Faction presentation. The engine state always wins; no effect mutates it.
 * Routine arrival cues finish within 1.1 seconds. Public battlefield copies are the only
 * DOM clones; hand snapshots contain geometry, never private artwork or text. */
(function (root, factory) {
  'use strict';
  const data = root.FrontlinesData || (typeof require === 'function' ? require('./data.js') : null);
  const api = factory(root, data);
  root.FrontlinesEffects = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root, D) {
  'use strict';
  const hasDOM = !!root.document;
  const doc = root.document;
  const P = root.FrontlinesPresentation || (typeof require === 'function' ? require('./presentation.js') : null);
  const Music = root.FrontlinesMusic || (typeof require === 'function' ? require('./music-data.js') : null);
  let settings = { animationSpeed: 'normal', presentation: 'full', reducedEffects: false, reducedShake: false, sound: false, masterVolume:.7, musicVolume:.3, uiVolume:.65, cardEffectsVolume:.8, battlefieldVolume:.7 };
  let overlay = null, epoch = 0, counterFrame = null, audioContext = null, master = null, soundAdapter = null, deferredPublic = null;
  let channels = {}, musicState = 'menu', activeTrack = null, pendingTrack = null, musicTimer = null, musicToken = 0, musicRequest = 0, musicSources = [], musicBuffers = new Map();
  const cueTimes = new Map();
  let viewport = { x: 0, y: 0 };
  const timers = new Set(), animations = new Set(), tweens = new Set(), sounds = new Set();
  const motionQuery = hasDOM && root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const definition = item => D && D.CARDS[item && (item.cardId || item.id)];
  const actor = state => state.response && state.response.stage === 'response' ? state.response.responder : state.attacker;
  const phaseName = state => state.response ? state.response.stage : 'attack';
  const role = unit => {
    const c = definition(unit) || {};
    const art = root.FrontlinesArt || (typeof require === 'function' ? require('./art.js') : null);
    if (art?.role && c.name) { const r = art.role(c); return r === 'rifle' ? 'rifleman' : r; }
    if (c.type === 'leader') return 'commander';
    if (/heavy|armored|escort|siege|breaker/i.test(c.role || c.artRole || c.name || '')) return 'heavy';
    if (/specialist|sniper|marksman|saboteur|scout|recon|medic|engineer/i.test(c.role || c.artRole || c.name || '')) return 'specialist';
    return 'rifleman';
  };
  function economy(state, player) {
    const p = state.players[player];
    const committed = state.units.filter(u => u.owner === player).reduce((n, u) => n + (definition(u)?.presence || 0), 0);
    return { command: p.command, committed, spent: p.spent, available: p.command - committed - p.spent };
  }

  /* Pure diff for tests and future canvas renderers. It neither dispatches actions
   * nor advances rules after a timer. Reclaim and retreat must never look like kills. */
  function deriveEvents(before, after, action, engineEvents) {
    if (!before || !after) return [];
    action = action || {};
    const events = [], prior = new Map(before.units.map(u => [u.uid, u])), next = new Map(after.units.map(u => [u.uid, u]));
    const displaced=new Map((engineEvents||[]).filter(e=>e.type==='forcedRetreat'||e.type==='forcedElimination').map(e=>[e.uid,e]));
    const nextHands = new Set(after.players.flatMap(p => p.hand.map(h => h.uid)));
    for (const unit of after.units) {
      const old = prior.get(unit.uid);
      if (!old) events.push({ type: 'deploy', unit, handUid: unit.uid });
      else {
        if (old.territory !== unit.territory) events.push({ type: displaced.get(unit.uid)?.type==='forcedRetreat'?'retreat':'move', unit, from: old.territory, to: unit.territory });
        const delta = unit.damage - old.damage;
        if (delta) events.push({ type: delta > 0 ? 'damage' : 'heal', unit, amount: Math.abs(delta) });
      }
    }
    for (const unit of before.units) if (!next.has(unit.uid)) {
      events.push({ type: displaced.get(unit.uid)?.type==='forcedElimination'?'rout':nextHands.has(unit.uid) ? 'reclaim' : 'death', unit, presence: definition(unit)?.presence || 0 });
    }
    after.players.forEach((p, player) => {
      const old = new Set(before.players[player].hand.map(h => h.uid));
      p.hand.forEach(h => { if (!old.has(h.uid)) events.push({ type: 'draw', player, uid: h.uid }); });
      const from = economy(before, player), to = economy(after, player);
      Object.keys(from).forEach(key => { if (from[key] !== to[key]) events.push({ type: 'resource', player, key, from: from[key], to: to[key] }); });
    });
    // An Order is spent when played. Its deferred defensive effect may resolve later.
    if (action.handUid) {
      for (let player = 0; player < 2; player++) {
        const h = before.players[player].hand.find(item => item.uid === action.handUid), c = definition(h);
        if (c && c.type === 'order' && !after.players[player].hand.some(item => item.uid === h.uid)) {
          events.push({ type: 'order', player, cardId: h.cardId, targetUid: action.targetUid || before.response?.defenderUid, kind: c.effect?.kind || 'order' });
        }
      }
    }
    if (!before.response && after.response) {
      const u = prior.get(after.response.attackerUid);
      events.push({ type: 'engage', attackerUid: after.response.attackerUid, defenderUid: after.response.defenderUid, role: role(u), owner: u?.owner });
    }
    if (before.response && !after.response && ['respond', 'counter'].includes(action.type)) {
      const r = before.response, u = prior.get(r.attackerUid);
      // The engine bounds history at 500 rows. Resolution's terminal entry is
      // authoritative even when old and new log arrays have the same length.
      const terminal = after.log[after.log.length - 1];
      const exchanged = !(terminal?.type === 'combat' && /without combat damage/i.test(terminal.text));
      events.push({ type: 'combat', attackerUid: r.attackerUid, defenderUid: r.defenderUid, cardId:u?.cardId, role: role(u), owner: u?.owner, exchanged });
      if (r.order && !action.handUid) {
        const c = definition(r.order);
        if (c?.effect) events.push({ type: 'ability', player: r.responder, cardId: r.order.cardId, kind: c.effect.kind, targetUid: c.effect.kind === 'ambush' ? r.attackerUid : r.defenderUid });
      }
    }
    if (before.response && after.response && before.response.defenderUid !== after.response.defenderUid) {
      const unit = next.get(after.response.defenderUid);
      if (unit) events.push({ type: 'intercept', unit, priorTargetUid: before.response.defenderUid });
    }
    after.territories.forEach((t, i) => {
      if (before.territories[i].owner !== t.owner) events.push({ type: 'capture', territory: t.id, owner: t.owner });
    });
    // Securing already-owned ground is still a breakthrough and needs a capture cue.
    for (let player = 0; player < 2; player++) {
      if ((after.stats?.captures?.[player] || 0) > (before.stats?.captures?.[player] || 0) && !events.some(e => e.type === 'capture' && e.territory === before.contested)) {
        events.push({ type: 'capture', territory: before.contested, owner: player });
      }
    }
    if (before.contested !== after.contested) events.push({ type: 'frontline', from: before.contested, to: after.contested });
    if (actor(before) !== actor(after) || phaseName(before) !== phaseName(after) || before.turn !== after.turn) {
      events.push({ type: 'phase', actor: actor(after), stage: phaseName(after), turn: after.turn });
    }
    if (before.winner == null && after.winner != null) events.push({ type: 'victory', player: after.winner });
    for(const event of engineEvents||[])if(event.type==='commanderActivated')events.push({type:'commander',player:event.player,commanderId:event.commanderId,targetUid:event.targetUid,territory:event.territory,ability:event.ability});
    if(displaced.size){const order={capture:0,retreat:1,rout:1,move:2,resource:3,frontline:4,phase:5,victory:6};events.sort((a,b)=>(order[a.type]??2)-(order[b.type]??2));}
    return events;
  }

  const reduced = () => !!(settings.reducedEffects || settings.presentation === 'minimal' || motionQuery?.matches);
  const duration = ms => reduced() ? Math.min(ms, 120) : Math.round(ms * (settings.animationSpeed === 'fast' ? .55 : 1) * (settings.presentation === 'reduced' ? .65 : 1));
  const blocked = () => !hasDOM || doc.hidden || !!doc.querySelector('.privacy');
  const color = (state, player) => D?.FACTIONS[state.players[player]?.faction]?.color || (player === 0 ? '#86afcc' : '#e47d59');
  const rect = node => {
    if (!node) return null;
    const r = node.getBoundingClientRect();
    return r.width && r.height ? { left: r.left, top: r.top, width: r.width, height: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  };
  function unitNode(uid) { return Array.from(doc.querySelectorAll('.unit[data-uid],[data-unit]')).find(n => (n.dataset.uid || n.dataset.unit) === uid); }
  function territoryNode(id) { return Array.from(doc.querySelectorAll('.territory[data-territory]')).find(n => Number(n.dataset.territory) === id); }
  function handNode(uid) { return Array.from(doc.querySelectorAll('.hand-card[data-uid]')).find(n => n.dataset.uid === uid); }
  function publicClone(node) {
    if (!node) return null;
    const clone = node.cloneNode(true);
    [clone, ...clone.querySelectorAll('*')].forEach(n => {
      n.removeAttribute('id'); n.removeAttribute('title');
      n.removeAttribute('tabindex'); n.removeAttribute('aria-label');
      for (const key of Object.keys(n.dataset)) delete n.dataset[key];
      if (/BUTTON|INPUT|SELECT/.test(n.tagName)) n.disabled = true;
    });
    clone.classList.remove('selected', 'valid-target', 'enemy-target');
    clone.setAttribute('aria-hidden', 'true');
    return clone;
  }
  function capture(before, action) {
    if (!hasDOM || !before || blocked()) return null;
    const snapshot = { units: {}, territories: {}, hand: {}, resources: {}, epoch, turn: before.turn };
    doc.querySelectorAll('.unit[data-uid],[data-unit]').forEach(n => {
      const uid = n.dataset.uid || n.dataset.unit;
      snapshot.units[uid] = { rect: rect(n), clone: publicClone(n), territory: before.units.find(u => u.uid === uid)?.territory };
    });
    doc.querySelectorAll('.territory[data-territory]').forEach(n => { snapshot.territories[n.dataset.territory] = rect(n); });
    // Geometry cannot reveal the identity of a hidden hand on a command transfer.
    doc.querySelectorAll('.hand-card[data-uid]').forEach(n => { snapshot.hand[n.dataset.uid] = rect(n); });
    return snapshot;
  }
  function schedule(fn, ms) {
    if (timers.size >= 64) return null;
    const token = epoch;
    const id = root.setTimeout(() => { timers.delete(id); if (token === epoch && !blocked()) fn(); }, duration(ms));
    timers.add(id); return id;
  }
  function layer() {
    viewport = { x: root.scrollX || 0, y: root.scrollY || 0 };
    if (!overlay || !overlay.isConnected) {
      overlay = doc.createElement('div'); overlay.className = 'faction-fx-layer'; overlay.setAttribute('aria-hidden', 'true');
      doc.body.appendChild(overlay);
    }
    return overlay;
  }
  function element(className, r, tint, text) {
    // Effects cap at 48 live overlays; a full frontline never creates unlimited particles.
    const parent = layer();
    if (parent.children.length >= 48) return null;
    const n = doc.createElement('div'); n.className = 'faction-fx ' + className;
    if (r) Object.assign(n.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
    if (tint) n.style.setProperty('--fx-color', tint);
    if (text != null) n.textContent = text;
    parent.appendChild(n); return n;
  }
  function animate(node, frames, ms, delay, cleanup, easing) {
    if (animations.size >= 128) { if (cleanup) cleanup(); return; }
    if (!node || !node.animate) { if (cleanup) schedule(cleanup, ms + (delay || 0)); return; }
    const animation = node.animate(frames, { duration: duration(ms), delay: duration(delay || 0), easing: easing||'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    animations.add(animation);
    animation.finished.then(() => { animations.delete(animation); if (cleanup) cleanup(); }, () => { animations.delete(animation); });
  }
  function flash(node, tint, ms) {
    if (!node) return;
    animate(node, [{ boxShadow: 'inset 0 0 0 1px ' + tint, filter: 'brightness(1.7)' }, { boxShadow: 'inset 0 0 0 1px transparent', filter: 'brightness(1)' }], ms || 340);
  }
  function floatText(r, value, tint, variant, delay) {
    if (!r) return;
    const n = element('fx-number ' + (variant || ''), { left: r.x - 70, top: r.y - 15, width: 140, height: 30 }, tint, value);
    if (n) animate(n, reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translateY(5px) scale(.85)' }, { opacity: 1, offset: .15, transform: 'translateY(-3px) scale(1.04)' }, { opacity: 0, transform: 'translateY(-32px) scale(1)' }], 620, delay, () => n.remove());
  }
  function ring(r, tint, variant) {
    if (!r || reduced()) return;
    const size = Math.max(24, Math.min(110, r.width, r.height+20));
    const n = element('fx-ring ' + (variant || ''), { left: r.x - size / 2, top: r.y - size / 2, width: size, height: size }, tint);
    if (n) animate(n, [{ opacity: .95, transform: 'scale(.3)' }, { opacity: 0, transform: 'scale(1.6)' }], 410, 0, () => n.remove());
  }
  function tracer(from, to, tint, variant, delay) {
    if (!from || !to || reduced()) return;
    const dx = to.x - from.x, dy = to.y - from.y, distance = Math.hypot(dx, dy);
    const n = element('fx-tracer ' + (variant || ''), { left: from.x, top: from.y, width: distance, height: 3 }, tint);
    if (!n) return;
    n.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
    animate(n, [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: .95, offset: .3, clipPath: 'inset(0 5% 0 15%)' }, { opacity: 0, clipPath: 'inset(0 0 0 100%)' }], 210, delay, () => n.remove());
  }
  function shake() {
    if (reduced() || settings.presentation === 'reduced' || settings.reducedShake) return;
    const board = doc.querySelector('.battlefield');
    animate(board, [{ transform: 'translate(0,0)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(1px,0)' }, { transform: 'translate(0,0)' }], 200);
  }
  function treatment(card) { return P?.limits(card,settings,motionQuery?.matches) || {profile:{deployment:340,attack:300,impact:220,packReveal:260},faction:{motif:'shield',color:'#82b8cf',spread:1},particles:0,audioLayers:0}; }
  function particles(r, card, impact) {
    if(!r||reduced())return;
    const t=treatment(card),count=t.particles;
    for(let i=0;i<count;i++){
      const angle=(i/count)*Math.PI*2,spread=Math.min(35,r.width*.3)*t.faction.spread;
      // Emit from the card perimeter, leaving the name, stats and rules unobscured.
      const n=element('fx-particle fx-'+t.faction.motif,{left:r.x+Math.cos(angle)*(r.width/2+4)-2,top:r.y+Math.sin(angle)*(r.height/2+4)-2,width:4,height:4},t.faction.color);
      if(n)animate(n,[{opacity:.75,transform:'translate(0,0)'},{opacity:0,transform:'translate('+(Math.cos(angle)*spread)+'px,'+(Math.sin(angle)*spread)+'px)'}],impact?t.profile.impact:t.profile.deployment,0,()=>n.remove());
    }
  }
  function deploy(e, snapshot, state) {
    const node = unitNode(e.unit.uid), target = rect(node), source = snapshot?.hand[e.handUid], tint = color(state, e.unit.owner);
    const card=definition(e.unit), t=treatment(card);
    const landing=Math.round(t.profile.deployment*.72);
    cue('deploy',{card,channel:'card'});
    if (source && target && !reduced()) {
      const n = element('fx-deployment', source, tint), clone = publicClone(node);
      if (n && clone) {
        n.appendChild(clone);
        const dx = target.x - source.x, dy = target.y - source.y;
        const ratio=Math.min(target.width/source.width,target.height/source.height);
        animate(n,P.deploymentFrames(dx,dy,ratio),t.profile.deployment,0,()=>n.remove(),'linear');
      }
    } else if(target&&!reduced()) {
      // AI and newly visible hot-seat deployments have no outgoing hand geometry.
      // A public portrait still gets a readable advance, land and settle moment.
      const r={left:target.x-52,top:target.y-70,width:104,height:140},n=element('fx-deployment fx-arrival',r,tint),clone=publicClone(node);
      if(n&&clone){n.appendChild(clone);animate(n,P.deploymentFrames(0,0,.28),t.profile.deployment,0,()=>n.remove(),'linear');}
    }
    schedule(()=>{const actual=unitNode(e.unit.uid),r=rect(actual);flash(actual,tint,230);particles(r,card);if(!reduced())landingPlate(r,tint,t.faction.motif);cue('land',{card,channel:'card'});},landing);
  }
  function landingPlate(r,tint,motif){
    if(!r||reduced())return;
    const n=element('fx-landing fx-'+motif,{left:r.left-7,top:r.top-5,width:r.width+14,height:r.height+10},tint);
    if(n)animate(n,[{opacity:1,transform:'scaleX(.6) scaleY(.75)'},{opacity:.65,offset:.3,transform:'scale(1.08)'},{opacity:0,transform:'scaleX(1.18) scaleY(1.35)'}],260,0,()=>n.remove());
  }
  function movement(e, snapshot, state) {
    const node = unitNode(e.unit.uid), to = rect(node), from = snapshot?.units[e.unit.uid]?.rect;
    if (node && to && from && !reduced()) {
      animate(node, [{ transform: 'translate(' + (from.x - to.x) + 'px,' + (from.y - to.y) + 'px)', opacity: .5 }, { transform: 'translate(0,0)', opacity: 1 }], 400);
      tracer(from, to, color(state, e.unit.owner), 'movement');
    } else flash(node, color(state, e.unit.owner));
  }
  function forcedRetreat(e,snapshot,state){
    const record=snapshot?.units[e.unit.uid],from=record?.rect,node=unitNode(e.unit.uid),to=rect(node),tint=color(state,e.unit.owner);
    if(from&&to&&record.clone&&!reduced()){
      const n=element('fx-withdrawal',from,tint);if(n){n.appendChild(record.clone);animate(n,[{transform:'translate(0,0)',opacity:1},{transform:'translate('+(to.x-from.x)+'px,'+(to.y-from.y)+'px)',opacity:.85}],400,180,()=>n.remove());}
      animate(node,[{opacity:0},{opacity:0,offset:.8},{opacity:1}],430,180);
    }else flash(node,tint);
    floatText(from||to,'RETREAT → '+(e.to+1),tint,'fx-caption',180);
  }
  function engage(e, snapshot, state) {
    const attacker = unitNode(e.attackerUid), defender = unitNode(e.defenderUid), tint = color(state, e.owner);
    flash(attacker, tint); ring(rect(defender), tint, 'fx-lockon');
    floatText(rect(defender), 'ENGAGED', tint, 'fx-caption'); cue('select');
  }
  function combat(e, snapshot, state) {
    if (!e.exchanged) return 0;
    const node = unitNode(e.attackerUid), target = unitNode(e.defenderUid);
    const from = rect(node) || snapshot?.units[e.attackerUid]?.rect, to = rect(target) || snapshot?.units[e.defenderUid]?.rect;
    const tint = color(state, e.owner);
    const card=definition({cardId:e.cardId})||definition(state.units.find(u=>u.uid===e.attackerUid)),t=treatment(card);
    const plan=P.attackPlan(card,e.role),impact=plan.windup+plan.delivery;
    if (from && to && node && !reduced()) {
      const scale = plan.lunge / (Math.hypot(to.x - from.x, to.y - from.y) || 1),dx=(to.x-from.x)*scale,dy=(to.y-from.y)*scale;
      animate(node,[{transform:'translate(0,0)'},{transform:'translate('+(-dx*.35)+'px,'+(-dy*.35)+'px)',offset:.23},{transform:'translate('+dx+'px,'+dy+'px)',offset:.48},{transform:'translate('+(-dx*.1)+'px,'+(-dy*.1)+'px)',offset:.7},{transform:'translate(0,0)'}],plan.duration,0,null,'linear');
    }
    const shots = settings.presentation==='reduced'?1:plan.shots;
    for (let i = 0; i < shots; i++) {
      tracer(from, to, tint, e.role+' fx-'+t.faction.motif,plan.windup+i*65);
    }
    if (e.role === 'commander') floatText(from, 'FIRE COMMAND', tint, 'fx-caption');
    schedule(()=>{cue(e.role==='heavy'?'heavy':e.role==='specialist'?'specialist':'rifle',{card,channel:'card'});},plan.windup);
    schedule(()=>{if(e.role==='heavy')shake();particles(to,card,true);landingPlate(to,tint,t.faction.motif);cue('impact',{card,channel:'battlefield'});},impact);
    return impact;
  }
  function loss(e, snapshot, state, combatDelay) {
    const record = snapshot?.units[e.unit.uid], r = record?.rect, tint = color(state, e.unit.owner);
    const dead=e.type==='death'||e.type==='rout',delay=(e.type==='rout'?180:0)+(combatDelay||0);
    if (r && record.clone) {
      const n = element(dead ? 'fx-casualty' : 'fx-reclaim', r, tint);
      if (n) {
        n.appendChild(record.clone);
        animate(n, reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, filter: 'brightness(1)', transform: 'translateY(0)' }, {opacity:1,filter:'brightness(2)',offset:.08,transform:'translateY(0)'},{ opacity: .8, filter: 'grayscale(1) brightness(1)', offset: .25 }, { opacity: 0, filter: 'grayscale(1) brightness(.3)', transform: 'translateY(' + (dead ? 15 : -20) + 'px) scale(.92)', clipPath: 'inset(45% 0 45% 0)' }], 500, 20+delay, () => n.remove());
      }
    }
    floatText(r, e.type==='rout'?'NO RETREAT — ELIMINATED':dead?'DESTROYED':'WITHDRAWN', dead ? '#ffc4ae' : tint, 'fx-caption', 40+delay);
    if (!reduced()) floatText(r && { ...r, y: r.y + 25 }, e.presence + 'P RELEASED', '#b7dca8', 'fx-caption', 130+delay);
    if(delay)schedule(()=>cue(dead?'death':'deploy'),delay);else cue(dead?'death':'deploy');
  }
  function captureZone(e, state) {
    const node = territoryNode(e.territory), r = rect(node), tint = color(state, e.owner);
    flash(node, tint, 650); cue('capture');
    const n = element('fx-capture', r, tint);
    if (n) {
      const identity = doc.querySelector('.player-hud.p' + (e.owner + 1) + ' .hud-emblem');
      const emblem = identity?.querySelector('svg')?.cloneNode(true);
      if (emblem) n.appendChild(emblem);
      const label = doc.createElement('span'); label.textContent = 'GROUND SECURED'; n.appendChild(label);
      animate(n, reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, offset: .35, clipPath: 'inset(0 0 0 0)' }, { opacity: 0, clipPath: 'inset(0 0 0 0)' }], 680, 0, () => n.remove());
    }
  }
  function frontier(e, state) {
    const from = rect(territoryNode(e.from)), to = rect(territoryNode(e.to));
    if (!from || !to) return;
    const r = { left: from.x - 1, top: Math.min(from.top, to.top), width: 3, height: Math.min(from.height, to.height) };
    const n = element('fx-frontline', r, '#f5b365');
    if (n) animate(n, reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateX(0)', opacity: .7 }, { transform: 'translateX(' + (to.x - from.x) + 'px)', opacity: .9, offset: .75 }, { transform: 'translateX(' + (to.x - from.x) + 'px)', opacity: 0 }], 640, 0, () => n.remove());
  }
  function resourceNode(player, key) {
    const exact = Array.from(doc.querySelectorAll('[data-resource-player][data-resource-key]')).find(n => Number(n.dataset.resourcePlayer) === player && n.dataset.resourceKey === key);
    if (exact) return exact.querySelector('strong') || exact;
    const hud = doc.querySelector('.player-hud.p' + (player + 1)) || Array.from(doc.querySelectorAll('.player-hud[data-player]')).find(n => Number(n.dataset.player) === player);
    if (!hud) return null;
    const marked = Array.from(hud.querySelectorAll('[data-resource]')).find(n => n.dataset.resource === key);
    if (marked) return marked.querySelector('strong') || marked;
    const aliases = { command: ['COMMAND', 'CAPACITY', 'TOTAL'], committed: ['FIELD', 'COMMITTED'], spent: ['SPENT'], available: ['AVAILABLE'] };
    const wrapper = Array.from(hud.querySelectorAll('.resource')).find(n => aliases[key].some(a => n.querySelector('span')?.textContent.toUpperCase().includes(a)));
    return wrapper?.querySelector('strong');
  }
  function tickCounters() {
    counterFrame = null;
    const now = root.performance.now();
    tweens.forEach(t => {
      if (!t.node.isConnected) { tweens.delete(t); return; }
      const progress = Math.min(1, (now - t.start) / t.duration), eased = 1 - Math.pow(1 - progress, 3);
      t.node.textContent = String(Math.round(t.from + (t.to - t.from) * eased));
      if (progress >= 1) { t.node.textContent = String(t.to); tweens.delete(t); }
    });
    if (tweens.size) counterFrame = root.requestAnimationFrame(tickCounters);
  }
  function resource(e) {
    const node = resourceNode(e.player, e.key); if (!node) return;
    for (const t of tweens) if (t.node === node) tweens.delete(t);
    flash(node, e.to > e.from ? '#b7dca8' : '#f5ae79', 440);
    if (reduced()) { node.textContent = String(e.to); return; }
    node.textContent = String(e.from);
    tweens.add({ node, from: e.from, to: e.to, start: root.performance.now(), duration: duration(460) });
    if (counterFrame == null) counterFrame = root.requestAnimationFrame(tickCounters);
  }
  function phase(state, options) {
    if (!state || blocked() || options?.privacy) return;
    if (deferredPublic) {
      const pending = deferredPublic; deferredPublic = null;
      if (pending.seed === state.seed && pending.turn === state.turn) {
        // Opening a hand can change page height or scroll position. Re-anchor public
        // casualty copies to their territory so delayed deaths never float elsewhere.
        for (const record of Object.values(pending.snapshot?.units || {})) {
          const oldZone = pending.snapshot.territories[record.territory], newZone = rect(territoryNode(record.territory));
          if (!record.rect || !oldZone || !newZone) continue;
          const dx = newZone.left - oldZone.left, dy = newZone.top - oldZone.top;
          record.rect = { ...record.rect, left: record.rect.left + dx, top: record.rect.top + dy, x: record.rect.x + dx, y: record.rect.y + dy };
        }
        runEvents(pending.events, state, pending.snapshot, { ...options, suppressPhase: true });
        // Only counts survived privacy. Obtain new card nodes from the hand that
        // has just been revealed, without retaining any outgoing hand identity.
        const handPlayer = options?.handPlayer == null ? actor(state) : options.handPlayer;
        const count = Math.min(pending.drawCounts?.[handPlayer] || 0, 15);
        if (count) {
          const cards = Array.from(doc.querySelectorAll('.hand-area .hand-cards .hand-card'))
            .filter(node => Number(node.dataset.player) === handPlayer);
          cards.slice(-count).forEach(node => drawCard(node, state, handPlayer));
        }
      }
    }
    const player = actor(state), title = state.response ? state.response.stage === 'counter' ? 'COUNTER WINDOW' : 'RESPONSE PHASE' : options?.handPlayer != null && options.handPlayer !== player ? 'ENEMY TURN' : 'YOUR TURN';
    const n = element('fx-phase', null, color(state, player));
    if (!n) return;
    const label = doc.createElement('strong'); label.textContent = title; n.appendChild(label);
    const sub = doc.createElement('small'); sub.textContent = (D?.FACTIONS[state.players[player].faction]?.name || 'Commander') + ' / TURN ' + state.turn; n.appendChild(sub);
    animate(n, reduced() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 0, transform: 'translate(-50%,-5px)' }, { opacity: 1, transform: 'translate(-50%,0)', offset: .2 }, { opacity: 1, offset: .7, transform: 'translate(-50%,0)' }, { opacity: 0, transform: 'translate(-50%,-5px)' }], 650, 0, () => n.remove());
  }
  function victory(e, state) {
    const tint = color(state, e.player), board = doc.querySelector('.battlefield');
    flash(board, tint, 900); cue('victory');
    state.territories.filter(t => t.owner === e.player).forEach((t, i) => schedule(() => ring(rect(territoryNode(t.id)), tint, 'victory'), i * 55));
    const r = rect(board), n = element('fx-victory', r, tint, 'TERRITORY SECURED');
    if (n) animate(n, [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 1, offset: .7 }, { opacity: 0 }], 950, 0, () => n.remove());
  }
  function play(before, after, action, snapshot, options) {
    if (!hasDOM || !before || !after) return [];
    const events = deriveEvents(before, after, action,options?.engineEvents);
    if (options?.privacy || doc.querySelector('.privacy')) {
      clear();
      // Keep only public facts for reveal. No hand text, art, rectangles, draw UIDs,
      // or complete before/after state can survive a hot-seat command transfer.
      deferredPublic = {
        seed: after.seed, turn: after.turn,
        drawCounts: [0, 1].map(player => events.filter(e => e.type === 'draw' && e.player === player).length),
        events: events.filter(e => !['draw', 'phase'].includes(e.type)),
        snapshot: snapshot ? { units: snapshot.units, territories: snapshot.territories, hand: {}, epoch } : null
      };
      return events;
    }
    if (blocked()) { clear(); return events; }
    // A snapshot from a cancelled match is stale. Never resurrect its clones.
    if (snapshot && snapshot.epoch !== epoch) snapshot = null;
    if (snapshot && !reduced()) {
      // FLIP the surviving hand against its former rectangles. The current DOM
      // alone supplies artwork, so this cannot resurrect an outgoing private card.
      for (const [uid, from] of Object.entries(snapshot.hand)) {
        const node = handNode(uid), to = rect(node);
        if (node && to && from && (Math.abs(from.left - to.left) > 1 || Math.abs(from.top - to.top) > 1)) {
          animate(node, [{ transform: 'translate(' + (from.left - to.left) + 'px,' + (from.top - to.top) + 'px)' }, { transform: 'translate(0,0)' }], 280);
        }
      }
    }
    runEvents(events, after, snapshot, options);
    return events;
  }
  function runEvents(events, after, snapshot, options) {
    const combatEvent = events.find(e => e.type === 'combat');
    const combatDelay=combatEvent?combat(combatEvent,snapshot,after):0;
    let gained = false;
    for (const e of events) {
      switch (e.type) {
        case 'deploy': deploy(e, snapshot, after); break;
        case 'move': movement(e, snapshot, after); break;
        case 'retreat': forcedRetreat(e,snapshot,after);break;
        case 'engage': engage(e, snapshot, after); break;
        case 'intercept': {
          const n = unitNode(e.unit.uid), tint = color(after, e.unit.owner);
          flash(n, tint); ring(rect(n), tint, 'fx-lockon'); floatText(rect(n), 'GUARD INTERCEPT', tint, 'fx-caption'); cue('select'); break;
        }
        case 'damage': {
          const showDamage=()=>{const n=unitNode(e.unit.uid);flash(n,'#ffb397');
            if(!reduced())animate(n,[{transform:'translateX(0)'},{transform:'translateX(3px)'},{transform:'translateX(-2px)'},{transform:'translateX(0)'}],220);
            floatText(rect(n)||snapshot?.units[e.unit.uid]?.rect,'−'+e.amount,'#ffc4ae');cue('damage',{card:definition(e.unit),channel:'battlefield'});};
          if(combatDelay)schedule(showDamage,combatDelay);else showDamage();break;
        }
        case 'heal': { const n = unitNode(e.unit.uid); flash(n, '#a7dba0'); floatText(rect(n), '+' + e.amount, '#b7e6ab'); break; }
        case 'death': case 'rout': case 'reclaim': loss(e,snapshot,after,combatDelay);break;
        case 'commander': {
          const c=root.FrontlinesCommanders?.get?.(e.commanderId)||root.FrontlinesCommanders?.COMMANDERS?.[e.commanderId];
          if(c)commanderActivate(c,commanderNode(e.player),{target:unitNode(e.targetUid)||territoryNode(e.territory),ability:e.ability});break;
        }
        case 'draw': {
          if (options?.handPlayer != null && options.handPlayer !== e.player) break;
          drawCard(handNode(e.uid), after, e.player); break;
        }
        case 'order': case 'ability': {
          const n = unitNode(e.targetUid), r = rect(n) || snapshot?.units[e.targetUid]?.rect || rect(territoryNode(after.contested));
          const tint = /heal|rally|shield/.test(e.kind) ? '#a9d5a6' : color(after, e.player);
          ring(r, tint, 'order'); flash(n, tint); floatText(r, e.kind.toUpperCase(), tint, 'fx-caption'); cue('deploy'); break;
        }
        case 'resource': resource(e); if (e.key === 'available' && e.to > e.from) gained = true; break;
        case 'capture': captureZone(e, after); break;
        case 'frontline': if(events.some(item=>item.type==='retreat'||item.type==='rout'))schedule(()=>frontier(e,after),480);else frontier(e, after); break;
        case 'phase': if (!options?.suppressPhase && after.winner == null) phase(after, options); break;
        case 'victory': victory(e, after); break;
      }
    }
    if (gained) cue('presence');
  }
  function drawCard(node, state, player) {
    if (node && !reduced()) animate(node, [{ opacity: 0, transform: 'translate(22px,16px) rotate(3deg)' }, { opacity: 1, transform: 'translate(0,0) rotate(0)' }], 400);
    else flash(node, color(state, player));
  }
  function commanderNode(player){
    return doc?.querySelector('[data-commander-player="'+player+'"]')||doc?.querySelector('.commander-panel[data-player="'+player+'"]');
  }
  function commanderIntro(commander,node,options){
    if(!commander||blocked())return;
    if((root.innerWidth||1366)<1000&&doc.querySelector('.fx-commander-intro')&&!options?.queued){schedule(()=>commanderIntro(commander,node,{...options,queued:true}),1360);return;}
    const card={...commander,rarity:'legendary'},t=treatment(card);cue('commanderIntro',{card,channel:'card'});
    flash(node,t.faction.color,520);
    if(reduced())return;
    const viewportWidth=root.innerWidth||440,width=Math.min(440,Math.max(280,viewportWidth-24)),player=node?.dataset?.commanderPlayer,center=viewportWidth>=1000&&player!=null?viewportWidth*(Number(player)===1?.75:.25):viewportWidth/2;
    const n=element('fx-commander-intro',{left:Math.max(12,Math.min(viewportWidth-width-12,center-width/2)),top:Math.min(160,Math.max(70,(root.innerHeight||768)*.16)),width,height:114},t.faction.color);
    if(!n)return;
    n.innerHTML=root.FrontlinesArt?.commanderHtml(commander,{className:'fx-commander-portrait'})||'';
    const words=doc.createElement('div'),eyebrow=doc.createElement('small'),name=doc.createElement('strong'),passive=doc.createElement('span');
    eyebrow.textContent=options?.label||'OPERATION COMMANDER';name.textContent=commander.name;passive.textContent=commander.passive?.name||commander.role||'Strategic command';words.append(eyebrow,name,passive);n.appendChild(words);
    animate(n,[{opacity:0,transform:'translateY(8px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.18},{opacity:1,transform:'translateY(0) scale(1)',offset:.77},{opacity:0,transform:'translateY(-6px) scale(.99)'}],1280,0,()=>n.remove());
  }
  function commanderActivate(commander,node,options){
    if(!commander||blocked())return;
    const card={...commander,rarity:'legendary'},t=treatment(card),from=rect(node),to=rect(options?.target);
    cue('commander',{card,channel:'card'});flash(node,t.faction.color,600);
    const art=node?.querySelector('.art-commander');
    if(art&&!reduced())animate(art,[{transform:'scale(1)'},{transform:'scale(1.09)',offset:.25},{transform:'scale(.98)',offset:.65},{transform:'scale(1)'}],760);
    if(from){landingPlate(from,t.faction.color,t.faction.motif);floatText({...from,y:from.top-6},String(options?.ability||commander.active?.name||'SIGNATURE COMMAND').toUpperCase(),t.faction.color,'fx-caption');}
    if(to){tracer(from,to,t.faction.color,'commander fx-'+t.faction.motif,160);schedule(()=>{landingPlate(to,t.faction.color,t.faction.motif);particles(to,card,true);cue('impact',{card,channel:'battlefield'});},310);}
  }

  /* Original layered procedural audio. Adapters receive a channel gain node and
   * presentation metadata so replacement licensed samples obey the same mixer. */
  function unlockAudio(event) {
    if (!hasDOM || !settings.sound || (event && !event.isTrusted)) return;
    if (!event && !root.navigator?.userActivation?.isActive) return;
    try {
      if (!audioContext) {
        const Context = root.AudioContext || root.webkitAudioContext; if (!Context) return;
        audioContext = new Context(); master = audioContext.createGain(); master.connect(audioContext.destination);
        for(const channel of ['music','ui','card','battlefield']){channels[channel]=audioContext.createGain();channels[channel].connect(master);}
        applyMixer();
      }
      if (audioContext.state === 'suspended') audioContext.resume().then(queueMusic).catch(() => {});
      else queueMusic();
    } catch (_) { /* Audio failure must never interrupt a legal game action. */ }
  }
  function tone(frequency, ms, type, offset, glide, channel, level) {
    if (sounds.size >= 24) return;
    const start = audioContext.currentTime + (offset || 0), end = start + ms / 1000;
    const source = audioContext.createOscillator(), gain = audioContext.createGain();
    source.type = type || 'sine'; source.frequency.setValueAtTime(frequency, start);
    if (glide) source.frequency.exponentialRampToValueAtTime(glide, end);
    gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(level||.12, start + .006); gain.gain.exponentialRampToValueAtTime(.0001, end);
    source.connect(gain); gain.connect(channels[channel||'ui']); sounds.add(source);
    source.onended = () => { sounds.delete(source); source.disconnect(); gain.disconnect(); };
    source.start(start); source.stop(end + .01);
  }
  function noise(ms, cutoff, channel, level) {
    if (sounds.size >= 24) return;
    const start = audioContext.currentTime, length = Math.ceil(audioContext.sampleRate * ms / 1000), buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const wave = buffer.getChannelData(0); for (let i = 0; i < length; i++) wave[i] = Math.random() * 2 - 1;
    const source = audioContext.createBufferSource(), gain = audioContext.createGain(), filter = audioContext.createBiquadFilter();
    source.buffer = buffer; filter.type = 'lowpass'; filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(level||.16, start); gain.gain.exponentialRampToValueAtTime(.0001, start + ms / 1000);
    source.connect(filter); filter.connect(gain); gain.connect(channels[channel||'battlefield']); sounds.add(source);
    source.onended = () => { sounds.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start();
  }
  function cue(name, options) {
    if (!settings.sound || blocked() || !audioContext || audioContext.state !== 'running') return;
    try {
      options=options||{};const channel=channels[options.channel]?options.channel:/deploy|land|reveal|rifle|heavy|specialist|commander/.test(name)?'card':/damage|death|capture|victory|impact/.test(name)?'battlefield':'ui';
      const now=audioContext.currentTime,last=cueTimes.get(name);if(last!=null&&now-last<.035)return;cueTimes.set(name,now);
      const card=options.card,t=treatment(card),layers=card?t.audioLayers:0,base=.12/Math.sqrt(1+layers*.35);
      if (soundAdapter) { soundAdapter({ name, context: audioContext,channel,output:channels[channel],rarity:t.profile.id||'common',faction:t.faction, layers:layers+1 }); return; }
      const note=(f,ms,type,offset,glide)=>tone(f,ms,type,offset,glide,channel,base),hit=(ms,cutoff)=>noise(ms,cutoff,channel,base);
      switch (name) {
        case 'hover': note(680,25); break;
        case 'select': case 'purchase': note(520,65,'triangle',0,840);break;
        case 'deploy': note(340,170,'sine',0,160);note(510,90,'triangle',.06,420);break;
        case 'land': hit(115,740);note(84,220,'triangle',0,38);note(1250,70,'sine',.015,730);break;
        case 'reveal': note(330,130,'sine',0,660);break;
        case 'rifle': hit(75,4200);note(130,70,'square',0,60);note(115,60,'square',.075,55);break;
        case 'heavy': hit(190,820);note(72,250,'triangle',0,29);note(148,125,'sine',.035,62);break;
        case 'specialist': note(920,160,'sine',0,140);break;
        case 'impact': hit(85,1150);note(145,130,'triangle',0,55);break;
        case 'commanderIntro': [1,1.5,2].forEach((ratio,i)=>note(t.faction.pitch*ratio,200,'triangle',i*.1));note(t.faction.pitch*3,240,'sine',.27);break;
        case 'commander': note(t.faction.pitch,240,t.faction.tone,0,t.faction.pitch*2);hit(110,1100);note(t.faction.pitch*3,170,'sine',.16);break;
        case 'damage': hit(45,2100);break;
        case 'death': hit(210,1300);note(180,180,'sawtooth',0,45);break;
        case 'capture': [330,440,660].forEach((f,i)=>note(f,130,'triangle',i*.08));break;
        case 'presence': note(610,70,'sine');note(860,90,'sine',.08);break;
        case 'victory': [261.6,329.6,392,523.2].forEach((f,i)=>note(f,330,'triangle',i*.12));break;
      }
      for(let i=0;i<layers;i++)tone(t.faction.accent[i%3]*(i===3?2:1),110+i*35,t.faction.tone,.025+i*.035,null,channel,.045/Math.sqrt(layers));
    } catch (_) { /* Optional audio stays independent of the state machine. */ }
  }
  function applyMixer(){
    if(!master)return;
    const now=audioContext.currentTime,values={music:settings.musicVolume,ui:settings.uiVolume,card:settings.cardEffectsVolume,battlefield:settings.battlefieldVolume};
    master.gain.setTargetAtTime(settings.sound ? .22*settings.masterVolume : 0,now,.035);
    for(const channel of Object.keys(values))channels[channel].gain.setTargetAtTime(values[channel],now,.035);
  }
  function scoreBuffer(track){
    if(musicBuffers.has(track.id))return musicBuffers.get(track.id);
    // Synthesized fundamentals need no high-rate recording. WebAudio resamples the
    // buffer, while bounded chunks yield between jobs so first music never stalls UI.
    const rate=Math.min(16000,audioContext.sampleRate),beat=60/track.bpm,seconds=beat*track.bars*4,length=Math.round(rate*seconds),buffer=audioContext.createBuffer(1,length,rate),wave=buffer.getChannelData(0),jobs=[];
    const hz=midi=>440*Math.pow(2,(midi-69)/12);
    // Every phrase has a release before the final loop boundary, eliminating clicks.
    const voice=(midi,start,duration,amplitude,harmonic)=>{
      if(midi==null)return;jobs.push({frequency:hz(midi),first:Math.round(start*rate),last:Math.min(length,Math.round((start+duration)*rate)),duration,amplitude,harmonic});
    };
    for(let bar=0;bar<track.bars;bar++){
      const start=bar*4*beat,bass=track.bass[bar%track.bass.length];
      voice(bass,start,4*beat-.09,.08,.16);
      track.pad.forEach((note,i)=>voice(note+(bass-track.bass[0]),start,4*beat-.09,.021,0));
      for(let b=0;b<4;b++){
        voice(track.melody[(bar*4+b)%track.melody.length],start+b*beat,beat*.7,track.energy*.13,.08);
        voice(bass+12,start+b*beat,beat*.23,track.pulse*.13,.3);
      }
    }
    const ready=(async()=>{
      for(const job of jobs){
        const step=2*Math.PI*job.frequency/rate,sinStep=Math.sin(step),cosStep=Math.cos(step);let sin=0,cos=1;
        for(let i=job.first;i<job.last;i++){
          const time=(i-job.first)/rate,envelope=Math.max(0,Math.min(1,time/.035,(job.duration-time)/.09));
          wave[i]+=job.amplitude*envelope*(sin+job.harmonic*2*sin*cos);
          const nextSin=sin*cosStep+cos*sinStep;cos=cos*cosStep-sin*sinStep;sin=nextSin;
          if((i-job.first+1)%4096===0)await new Promise(resolve=>root.setTimeout(resolve,0));
        }
      }
      return buffer;
    })();
    musicBuffers.set(track.id,ready);return ready;
  }
  function stopMusic(){
    musicToken++;musicRequest++;pendingTrack=null;if(musicTimer!=null)root.clearTimeout(musicTimer);musicTimer=null;
    for(const voice of musicSources){try{voice.source.stop();voice.source.disconnect();voice.gain.disconnect();}catch(_){}}
    musicSources=[];activeTrack=null;
  }
  async function transitionMusic(){
    if(!settings.sound||!audioContext||audioContext.state!=='running'||doc?.hidden)return;
    const track=Music?.tracks[Music.states[musicState]];if(!track||activeTrack===track.id||pendingTrack===track.id)return;
    const request=++musicRequest;pendingTrack=track.id;
    try{
      const buffer=await scoreBuffer(track);
      if(request!==musicRequest||!settings.sound||doc.hidden||Music.states[musicState]!==track.id){if(request===musicRequest)pendingTrack=null;return;}
      pendingTrack=null;const now=audioContext.currentTime,crossfade=Music.crossfadeSeconds;
      // A fast route change discards any already-fading voice before starting a third.
      if(musicSources.length>=Music.maximumVoices){const stale=musicSources.shift();try{stale.source.stop();stale.source.disconnect();stale.gain.disconnect();}catch(_){}}
      for(const old of musicSources){if(old.fading)continue;old.fading=true;old.gain.gain.cancelScheduledValues(now);old.gain.gain.setValueAtTime(Math.max(.0001,old.gain.gain.value),now);old.gain.gain.linearRampToValueAtTime(0,now+crossfade);old.source.stop(now+crossfade+.02);}
      const source=audioContext.createBufferSource(),gain=audioContext.createGain(),voice={source,gain,track:track.id,fading:false};source.buffer=buffer;source.loop=true;
      gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+crossfade);source.connect(gain);gain.connect(channels.music);
      source.onended=()=>{musicSources=musicSources.filter(v=>v!==voice);source.disconnect();gain.disconnect();};
      musicSources.push(voice);activeTrack=track.id;source.start();
    }catch(_){if(request===musicRequest)pendingTrack=null;/* Optional audio cannot interrupt navigation. */}
  }
  function queueMusic(){
    if(!hasDOM||musicTimer!=null||!settings.sound||!audioContext||audioContext.state!=='running')return;
    const token=musicToken;musicTimer=root.setTimeout(()=>{musicTimer=null;if(token===musicToken)transitionMusic();},0);
  }
  function setMusicState(state){const next=Music?.states[state]?state:'menu';musicState=next;queueMusic();return next;}
  function reveal(card,node){
    if(blocked())return;const t=treatment(card),r=rect(node);cue('reveal',{card,channel:'card'});
    if(!r||reduced())return;
    const n=element('fx-reveal',r,t.profile.border||t.faction.color);
    if(n)animate(n,[{opacity:.8},{opacity:0}],t.profile.packReveal,0,()=>n.remove());
    particles(r,card);
  }
  function stopSounds() {
    sounds.forEach(source => { try { source.stop(); } catch (_) {} }); sounds.clear();
  }
  function clear(preservePublic) {
    if (preservePublic !== true) deferredPublic = null;
    epoch++;
    timers.forEach(id => root.clearTimeout(id)); timers.clear();
    animations.forEach(a => a.cancel()); animations.clear();
    tweens.forEach(t => { if (t.node.isConnected) t.node.textContent = String(t.to); }); tweens.clear();
    if (counterFrame != null && hasDOM) root.cancelAnimationFrame(counterFrame); counterFrame = null;
    if (overlay) overlay.remove(); overlay = null;
    stopSounds();
  }
  function configure(next) {
    settings = { ...settings, ...(next || {}) };
    settings.animationSpeed = settings.animationSpeed === 'fast' ? 'fast' : 'normal';
    settings.presentation=['full','reduced','minimal'].includes(settings.presentation)?settings.presentation:'full';
    for(const [key,fallback]of Object.entries({masterVolume:.7,musicVolume:.3,uiVolume:.65,cardEffectsVolume:.8,battlefieldVolume:.7}))settings[key]=Number.isFinite(settings[key])?Math.max(0,Math.min(1,settings[key])):fallback;
    applyMixer();
    if (!settings.sound) {stopSounds();stopMusic();}else queueMusic();
    if (hasDOM) {doc.documentElement.dataset.effectsSpeed = settings.animationSpeed;doc.body.dataset.presentation=settings.presentation;}
  }
  if (hasDOM) {
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) { clear(); if (audioContext?.state === 'running') audioContext.suspend().catch(() => {}); } });
    root.addEventListener('pagehide', () => {clear();stopMusic();if(audioContext?.state==='running')audioContext.suspend().catch(()=>{});});
    doc.addEventListener('pointerdown',unlockAudio,{passive:true});
    doc.addEventListener('keydown',unlockAudio,{passive:true});
    // Fixed overlays are invalid after scroll or resize, so cancel them promptly.
    root.addEventListener('resize', () => clear(true), { passive: true });
    doc.addEventListener('scroll', e => {
      // Restoring hand scroll during app render must not erase a public death or
      // capture replay. Board/page scroll changes do invalidate fixed coordinates.
      if (e.target.classList?.contains('hand-cards')) return;
      if (e.target === doc && viewport.x === (root.scrollX || 0) && viewport.y === (root.scrollY || 0)) return;
      clear(true);
    }, { passive: true, capture: true });
    if (motionQuery?.addEventListener) motionQuery.addEventListener('change', clear);
    let lastHover = 0;
    doc.addEventListener('pointerover', e => {
      const n = e.target.closest?.('.hand-card');
      if (!n || n.contains(e.relatedTarget) || !e.isTrusted) return;
      const now = root.performance.now(); if (now - lastHover < 85) return; lastHover = now;
      cue('hover');
    });
    doc.addEventListener('click', e => { if (e.isTrusted && e.target.closest?.('.hand-card,.unit,.btn,.command,.home-command,[data-settings-tab]')) cue('select',{channel:'ui'}); });
  }
  return { configure, capture, play, clear, phase, cue, unlockAudio, deriveEvents, reveal, setMusicState,commanderIntro,commanderActivate,
    audioState:()=>({enabled:!!settings.sound,unlocked:!!audioContext,state:musicState,track:activeTrack,looping:musicSources.filter(v=>!v.fading).every(v=>v.source.loop),musicVoices:musicSources.length,effectVoices:sounds.size,channels:{master:settings.masterVolume,music:settings.musicVolume,ui:settings.uiVolume,card:settings.cardEffectsVolume,battlefield:settings.battlefieldVolume}}),
    setSoundAdapter: adapter => { soundAdapter = typeof adapter === 'function' ? adapter : null; } };
});
