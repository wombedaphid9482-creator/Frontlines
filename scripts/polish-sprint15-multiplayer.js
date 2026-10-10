'use strict';
// Apply bounded copy/ARIA changes to the existing private-match interface.
const fs=require('node:fs'),file=require('node:path').resolve(__dirname,'../multiplayer-ui.js');let source=fs.readFileSync(file,'utf8');
function replace(before,after){if(!source.includes(before))throw Error('Polish source changed: '+before.slice(0,70));source=source.replace(before,after);}
replace('/VERSION|PROTOCOL/.test(code)','/VERSION|PROTOCOL|TIMING/.test(code)');
replace("<p>'+esc(startReason)+'</p>","<p id=\"mp-start-reason\" role=\"status\">'+esc(startReason)+'</p>");
replace('data-mp="start" \'+','data-mp="start" aria-describedby="mp-start-reason" title="\'+esc(startReason)+\'" \'+');
replace("status==='starting'?'ENTERING THE BATTLEFIELD…':'RECONNECTING…'","status==='starting'?'ENTERING THE BATTLEFIELD…':status==='synchronizing'?'RESYNCING…':'RECONNECTING…'");
replace("<div><b>'+state.turn+'</b><span>ACTION WINDOWS</span></div>","<div><b>'+state.turn+'</b><span>'+(state.turnSystemVersion===2?'TURNS':'ACTION WINDOWS')+'</span>'+(state.turnSystemVersion===2?'<small>'+state.windowIndex+' ACTION WINDOWS</small>':'')+'</div>");
replace("if (model.phase==='lobby' && previous.phase!=='lobby') menu='menu';","if (model.phase==='lobby' && previous.phase!=='lobby') menu='menu';\n    if(model.phase==='lobby'&&previous.phase==='lobby'&&(model.lobby?.players?.length>previous.lobby?.players?.length||model.lobby?.players?.some((p,i)=>p.ready&&!previous.lobby?.players?.[i]?.ready)))root.FrontlinesEffects?.cue?.('select',{channel:'ui'});");
fs.writeFileSync(file,source);console.log('Private match copy, clock, readiness and feedback polished.');
