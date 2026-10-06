'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),C=require('../collection');
function fixture(){const data=new Map(),store={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};C.load(store);return store;}
const played={id:'match-13-1',completed:true,victory:true,usedCards:['stonewall_rifles'],cardStats:{stonewall_rifles:{deployments:1,attacks:2,kills:1}},commanderId:'commander_stonewall_warden',commanderActiveUsed:true};
test('private match actual mastery is atomic and cannot mint economy or normal first-match bonus',()=>{
  const s=fixture(),before=C.load(s),result=C.rewardPrivateMatch(played,s),after=C.load(s);
  assert.equal(result.ok,true);assert.equal(result.creditsEarned,0);assert.equal(result.policy,'mastery-only');assert.equal(result.masteryGains.length,1);
  assert.equal(after.credits,before.credits);assert.equal(after.supply,before.supply);assert.deepEqual(after.packs,before.packs);assert.equal(after.firstMatchRewarded,false);
  assert.equal(after.cards.stonewall_rifles.mastery.deployments,1);assert.equal(after.cards.stonewall_rifles.mastery.attacks,2);assert.equal(after.cards.stonewall_rifles.mastery.eliminations,1);
  assert.equal(after.commanders[played.commanderId].mastery.activations,1);const saved=C.recoveryExport(s);
  assert.equal(C.rewardPrivateMatch(played,s).alreadyRewarded,true);assert.equal(C.recoveryExport(s),saved);
  assert.equal(C.rewardMatch({id:'ordinary',rewardPolicy:'completed-match-v2',completed:true,human:true,victory:false},s).creditsEarned,100);
});
test('private abandoned, unresolved and instant-concede results never record mastery',()=>{
  const s=fixture(),saved=C.recoveryExport(s);
  for(const flags of [{completed:false},{victory:null},{conceded:true},{reason:'concede'},{abandoned:true},{usedCards:[]}])assert.equal(C.rewardPrivateMatch({...played,...flags},s).eligible,false);
  assert.equal(C.recoveryExport(s),saved);
});
test('private usage excludes unplayed cards and retries failed storage without duplication',()=>{
  const s=fixture(),write=s.setItem,saved=C.recoveryExport(s);
  s.setItem=()=>{throw Error('Quota fixture');};assert.equal(C.rewardPrivateMatch(played,s).ok,false);assert.equal(C.recoveryExport(s),saved);s.setItem=write;
  const r=C.rewardPrivateMatch({...played,usedCards:['stonewall_rifles','stonewall_heavy']},s);
  assert.equal(r.masteryGains.length,1);assert.equal(C.load(s).cards.stonewall_heavy.mastery.matchesIncluded,0);
  assert.equal(C.rewardPrivateMatch({...played,id:'__proto__'},s).ok,false);
});
