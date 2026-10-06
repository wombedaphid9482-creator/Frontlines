'use strict';
// Opt-in packaged two-process test. Uses the normal isolated renderer bridge;
// the only shared fixture file contains the public invitation and ready marker.
const fs=require('node:fs'),path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run({app,win,controller}){
  const value=key=>process.argv.find(arg=>arg.startsWith(key+'='))?.slice(key.length+1);
  const role=value('--mp-role'),runId=value('--mp-run-id');
  if(!['host','guest'].includes(role)||!/^s13-[A-Za-z0-9_-]{1,60}$/.test(runId||''))throw Error('Invalid native multiplayer fixture.');
  const workspace=path.resolve(process.cwd()),output=path.resolve(workspace,'test-results','native-multiplayer',runId);
  if(!output.startsWith(path.join(workspace,'test-results')+path.sep))throw Error('Fixture escaped test-results.');
  fs.mkdirSync(output,{recursive:true});const deadline=Date.now()+150000,failures=[];
  const evaluate=source=>win.webContents.executeJavaScript(source);
  const command=(type,payload={})=>evaluate('FrontlinesDesktop.multiplayer('+JSON.stringify(type)+','+JSON.stringify(payload)+')');
  const wait=async(predicate,label)=>{while(Date.now()<deadline){const result=await predicate();if(result)return result;await delay(35);}const m=controller.getState(),ui=await evaluate("({last:window.__lastNativeCommand,sequence:FrontlinesMultiplayerUI.getState().snapshot?.sequence,pending:FrontlinesApp.getUIState().network?.pending,revision:FrontlinesMultiplayerUI.getState().modelRevision})");throw Error('Timed out: '+label+' '+JSON.stringify({phase:m.phase,sequence:m.snapshot?.sequence,status:m.snapshot?.status,connection:m.connection,error:m.error,ui}));};
  await evaluate("FrontlinesApp.showScreen('multiplayer');FrontlinesShell.savePreferences({animationSpeed:'fast',presentation:'minimal',reducedEffects:true});const nativeSend=FrontlinesMultiplayerUI.sendIntent;FrontlinesMultiplayerUI.sendIntent=action=>nativeSend(action).then(result=>{window.__lastNativeCommand={type:action.type,ok:result.ok,error:result.error,stateSequence:result.state?.snapshot?.sequence};return result;});true;");
  let result;
  if(role==='host'){
    result=await command('host',{name:'Ryken smoke'});if(!result.ok)throw Error(result.code||result.message);
    fs.writeFileSync(path.join(output,'invite.json'),JSON.stringify({code:result.state.code}));
  }else{
    const invitation=await wait(()=>fs.existsSync(path.join(output,'invite.json'))&&JSON.parse(fs.readFileSync(path.join(output,'invite.json'))),'public invitation');
    result=await command('join',{code:invitation.code,name:'Wyatt smoke'});if(!result.ok)throw Error(result.code||result.message);
  }
  await wait(()=>controller.getState().lobby.players.length===2,'both lobby seats');
  result=await evaluate(`(async()=>{const faction=${JSON.stringify(role==='host'?'nightwalker':'rogue')},id=${JSON.stringify(role==='host'?'nightwalker-smoke-and-mirrors':'rogue-make-do')};const library=FrontlinesDecks.forData(FrontlinesData),deck=library.getDecks().find(d=>d.id===id);return FrontlinesDesktop.multiplayer('select',{deck,faction,commanderId:deck.commanderId});})()`);
  if(!result.ok)throw Error(result.code||result.message);
  await wait(()=>controller.getState().lobby.players[role==='host'?0:1]?.legal,'legal own selection');
  await command('ready',{ready:true});
  await wait(()=>controller.getState().lobby.canStart||controller.getState().snapshot?.status==='active','both ready');
  if(role==='host'){result=await command('start');if(!result.ok)throw Error(result.code||result.message);}
  await wait(()=>controller.getState().snapshot?.status==='active','opening acknowledged');
  const firstSeat=controller.getState().localSeat;let actions=0;
  while(controller.getState().phase!=='results'&&Date.now()<deadline){
    const snapshot=controller.getState().snapshot;
    if(snapshot?.status==='active'&&snapshot.legalActions.length){
      const sequence=snapshot.sequence;
      result=await evaluate(`(()=>{const model=FrontlinesMultiplayerUI.getState(),snap=model.snapshot;if(!snap?.legalActions?.length)return {waiting:true};let action;try{action=FrontlinesAI.chooseAction(snap.state);}catch{}if(!action||!snap.legalActions.some(a=>JSON.stringify(a)===JSON.stringify(action)))action=snap.legalActions.find(a=>a.type==='deploy')||snap.legalActions.find(a=>a.type==='attack')||snap.legalActions.find(a=>a.type==='endTurn')||snap.legalActions[0];return FrontlinesApp.dispatch(action);})()`);
      if(result.ok===false)throw Error(result.error);if(!result.waiting){actions++;if(actions%40===0)console.log('FRONTLINES_MULTIPLAYER_PROGRESS '+JSON.stringify({role,actions,sequence}));await wait(()=>controller.getState().snapshot?.sequence>sequence,'accepted action');await delay(250);}
    }else await delay(15);
  }
  if(controller.getState().phase!=='results')throw Error('Private match did not finish.');
  const final=controller.getState(),ui=await evaluate(`(()=>{const state=FrontlinesApp.getState(),model=FrontlinesMultiplayerUI.getState();if(!document.querySelector('.network-game'))throw Error('Native network battlefield absent');if(state.players[1-model.localSeat].hand.length)throw Error('Opponent hand exposed');if(state.players.some(p=>p.deck.some(id=>id!==null)))throw Error('Private reserve exposed');return {territories:document.querySelectorAll('.territory').length,commanders:document.querySelectorAll('.commander-panel').length,winner:state.winner,ratio:[...document.querySelectorAll('.game-card')].slice(0,8).map(n=>{const r=n.getBoundingClientRect();return r.width/r.height;})};})()`);
  fs.writeFileSync(path.join(output,role+'-completed.json'),JSON.stringify({winner:final.snapshot.state.winner,sequence:final.snapshot.sequence,sharedHash:final.snapshot.sharedHash}));
  await wait(()=>fs.existsSync(path.join(output,(role==='host'?'guest':'host')+'-completed.json')),'peer completed result');
  const peer=JSON.parse(fs.readFileSync(path.join(output,(role==='host'?'guest':'host')+'-completed.json')));
  if(peer.sharedHash!==final.snapshot.sharedHash||peer.winner!==final.snapshot.state.winner)throw Error('Packaged clients desynchronized.');
  if(role==='host')await command('rematch');
  await wait(()=>controller.getState().phase==='lobby','rematch lobby');await command('ready',{ready:true});await wait(()=>controller.getState().lobby.canStart||controller.getState().snapshot?.status==='active','rematch ready');
  if(role==='host')await command('start');await wait(()=>controller.getState().snapshot?.status==='active','rematch active');
  if(controller.getState().localSeat!==1-firstSeat)throw Error('Rematch initiative did not alternate.');
  fs.writeFileSync(path.join(output,role+'-rematch.json'),'{}');await wait(()=>fs.existsSync(path.join(output,(role==='host'?'guest':'host')+'-rematch.json')),'peer rematch');
  const report={version:app.getVersion(),role,twoSeparateProcesses:true,transport:'actual-local-worker-relay',publicInternetVerified:false,
    privateMatchCompleted:true,decisions:actions,sequence:final.snapshot.sequence,winner:final.snapshot.state.winner,sharedHash:final.snapshot.sharedHash,
    lobby:true,bothReady:true,openingAcknowledged:true,hiddenHand:true,hiddenReserve:true,rematch:true,initiativeAlternated:true,ui,
    diagnostics:controller.diagnostics(),failures};
  fs.writeFileSync(path.join(output,role+'-result.json'),JSON.stringify(report,null,2));console.log('FRONTLINES_MULTIPLAYER_SMOKE '+JSON.stringify(report));
  app.exit(0);
}
module.exports={run};
