'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const Collection=require('../collection');
function fixture(){const records=new Map();const store={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,String(v))};store.setItem(Collection.STORAGE_KEY,JSON.stringify(Collection.createProfile({seed:12})));return store;}
const match=(id,victory,overrides={})=>({id,rewardPolicy:'completed-match-v2',completed:true,human:true,mode:'match',victory,ownTurns:1,meaningfulActions:0,deckCardIds:['stonewall_rifles'],...overrides});
test('every completed normal win and loss pays configured credits, including short matches',()=>{
  for(const victory of [true,false]){
    const store=fixture(),initial=Collection.load(store).credits,rewards=Collection.ECONOMY.rewards;
    const normal=rewards.completion+(victory?rewards.victory:rewards.defeat);
    assert.equal(normal,victory?70:50);
    const first=Collection.rewardMatch(match('first',victory),store);
    assert.equal(first.ok,true);assert.equal(first.eligible,true);assert.equal(first.creditsEarned,normal+50);
    assert.equal(Collection.load(store).credits,initial+normal+50);
    const saved=Collection.recoveryExport(store),retry=Collection.rewardMatch(match('first',victory),store);
    assert.equal(retry.alreadyRewarded,true);assert.equal(Collection.recoveryExport(store),saved);
    const rematch=Collection.rewardMatch(match('rematch',!victory,{ownTurns:0}),store);
    assert.equal(rematch.creditsEarned,rewards.completion+(!victory?rewards.victory:rewards.defeat));
    assert.equal(rematch.sources.some(s=>s.name==='First completed match'),false);
    assert.equal(Collection.load(store).cards.stonewall_rifles.mastery.matchesIncluded,2);
  }
});
test('completion policy preserves exclusions and never rewards unresolved or invalid results',()=>{
  const store=fixture(),saved=Collection.recoveryExport(store);
  for(const flags of [{completed:false},{victory:undefined},{human:false},{allAI:true},{simulation:true},{warRoom:true},{mode:'simulator'},{mode:'ai-vs-ai'},{practice:true},{tutorial:true},{mode:'training'},{nonCompetitive:true},{conceded:true}]){
    const result=Collection.rewardMatch(match('excluded',false,flags),store);assert.equal(result.eligible,false);assert.equal(result.creditsEarned,0);
  }
  assert.equal(Collection.rewardMatch(match('__proto__',true),store).ok,false);
  assert.equal(Collection.recoveryExport(store),saved);
});
test('failed reward save changes neither currency nor receipt and can be retried exactly once',()=>{
  const store=fixture(),save=store.setItem,saved=Collection.recoveryExport(store);
  store.setItem=()=>{throw new Error('Disk quota fixture');};
  assert.equal(Collection.rewardMatch(match('retry-after-quota',true),store).ok,false);
  assert.equal(Collection.recoveryExport(store),saved);
  store.setItem=save;
  const retry=Collection.rewardMatch(match('retry-after-quota',true),store);assert.equal(retry.creditsEarned,120);
  const after=Collection.recoveryExport(store);assert.equal(Collection.rewardMatch(match('retry-after-quota',true),store).alreadyRewarded,true);assert.equal(Collection.recoveryExport(store),after);
});
test('existing collection balances, receipts, mastery and deck storage survive the update',()=>{
  const store=fixture(),profile=Collection.load(store);profile.credits=827;profile.supply=41;profile.firstMatchRewarded=true;profile.cards.stonewall_rifles.mastery.points=39;profile.rewards.legacy={id:'legacy',eligible:true,creditsEarned:70};
  store.setItem(Collection.STORAGE_KEY,JSON.stringify(profile));store.setItem('frontlines.decks.v1','[{"id":"saved-custom-deck"}]');
  const loaded=Collection.load(store);assert.equal(loaded.credits,827);assert.equal(loaded.supply,41);assert.equal(loaded.cards.stonewall_rifles.mastery.points,39);assert.deepEqual(loaded.rewards,profile.rewards);
  assert.equal(Collection.rewardMatch(match('updated-loss',false),store).creditsEarned,50);assert.equal(Collection.load(store).credits,877);assert.equal(store.getItem('frontlines.decks.v1'),'[{"id":"saved-custom-deck"}]');
});
