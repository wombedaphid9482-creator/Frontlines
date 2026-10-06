'use strict';
// Two complete UI matches exercise win/loss rewards; no balance campaign.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.argv[2]||'playwright');
const origin=process.env.FRONTLINES_TEST_URL||'http://127.0.0.1:4173',out=path.resolve(__dirname,'../test-results');
const evidence={passed:false,completeMatches:[],largeCampaigns:0,errors:[]};
(async()=>{const browser=await chromium.launch({headless:true,channel:'msedge'});try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});page.on('pageerror',e=>evidence.errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>!!window.FrontlinesApp);
  const initial=await page.evaluate(()=>FrontlinesCollection.load().credits);let balance=initial;
  for(const winningPlayer of [0,1]){
    if(winningPlayer===0){const started=await page.evaluate(()=>FrontlinesApp.startMatch({decks:FrontlinesDecks.forData(FrontlinesData).starters().filter(d=>['stonewall','bruiser'].includes(d.faction)),mode:'hotseat',developer:false,bothHands:false,seed:120501}));assert.ok(started);}
    else {await page.locator('[data-action="rematch"]').click();assert.equal(await page.evaluate(()=>FrontlinesApp.getState().winner),null);}
    let result;
    for(let batch=0;batch<100;batch++){
      result=await page.evaluate(winningPlayer=>{
        for(let n=0;n<20;n++){
          const s=FrontlinesApp.getState(),E=FrontlinesEngine;if(s.winner!==null)break;
          const actor=E.getActor(s),legal=E.legalActions(s);
          const action=actor===winningPlayer?FrontlinesAI.chooseAction(s,{profile:'deck',difficulty:'normal',legalActions:legal}):legal.find(a=>a.pass)||legal.find(a=>a.type==='endTurn');
          if(!action)throw Error('No legal fixture action');const r=FrontlinesApp.dispatch(action);if(!r.ok)throw Error(r.error);
        }
        const s=FrontlinesApp.getState();return {winner:s.winner,window:s.turn,reward:FrontlinesApp.getMatchReward(),credits:FrontlinesCollection.load().credits};
      },winningPlayer);
      if(result.winner!==null)break;
    }
    assert.equal(result.winner,winningPlayer);assert.equal(result.reward.ok,true);assert.equal(result.reward.eligible,true);
    const expected=winningPlayer===0?120:50;assert.equal(result.reward.creditsEarned,expected);balance+=expected;assert.equal(result.credits,balance);
    await page.locator('.match-rewards').waitFor();assert.match(await page.locator('.match-rewards').innerText(),new RegExp('\\+'+expected+' CREDITS'));
    const receipts=await page.evaluate(()=>Object.keys(FrontlinesCollection.load().rewards).length);assert.equal(receipts,winningPlayer===0?1:2);
    // Rendering/reviewing a completed match must never award again.
    if(winningPlayer===1)await page.locator('[data-action="review-victory"]').click();
    assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),balance);
    evidence.completeMatches.push({...result,winningPlayer,expected,receiptCount:receipts});
    if(winningPlayer===0){
      // Review dismisses the modal; the persistent match control offers rematch.
      const hasRematch=await page.locator('[data-action="rematch"]').count();assert.ok(hasRematch);
    }
  }
  await page.goto(origin+'/collection.html');await page.waitForFunction(()=>!!window.FrontlinesCollection);
  assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),balance);await page.reload();assert.equal(await page.evaluate(()=>FrontlinesCollection.load().credits),balance);
  evidence.initialCredits=initial;evidence.finalCredits=balance;evidence.persistedAfterReload=true;assert.deepEqual(evidence.errors,[]);evidence.passed=true;
}finally{await browser.close();}})().catch(error=>{evidence.failure=String(error.stack||error);process.exitCode=1;}).finally(()=>{fs.writeFileSync(path.join(out,'sprint12-rewards-browser.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence,null,2));});
