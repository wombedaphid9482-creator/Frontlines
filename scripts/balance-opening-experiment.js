'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createExperiment}=require('./balance-experiment.js');
function replaceOnce(source,before,after){assert.equal(source.split(before).length-1,1,'Missing or ambiguous opening experiment marker: '+before);return source.replace(before,after);}
function createOpeningExperiment(id,parentSource,parentId,changes={}){
 const directory=createExperiment(id,parentSource,parentId,changes),file=path.join(directory,'balance',id+'.json');
 const original=JSON.parse(fs.readFileSync(file)),profile={...original,secondPlayerOpeningDraw:1};
 let balance=fs.readFileSync(path.join(directory,'balance.js'),'utf8');
 balance=replaceOnce(balance,JSON.stringify(original),JSON.stringify(profile));
 balance=replaceOnce(balance,'data.BALANCE_PROFILE=profile.id;data.BALANCE_VERSION=profile.version;',"data.SECOND_PLAYER_OPENING_DRAW=profile.secondPlayerOpeningDraw||0;\n    data.BALANCE_PROFILE=profile.id;data.BALANCE_VERSION=profile.version;");
 fs.writeFileSync(path.join(directory,'balance.js'),balance);fs.writeFileSync(file,JSON.stringify(profile,null,2)+'\n');
 let engine=fs.readFileSync(path.join(directory,'engine.js'),'utf8');
 const draw='draw(state, p.id, config.startingHand, true)';
 engine=replaceOnce(engine,draw,'draw(state, p.id, config.startingHand + (p.id === 1 ? (Data.SECOND_PLAYER_OPENING_DRAW || 0) : 0), true)');
 engine=replaceOnce(engine,"VERSION:'frontlines-territory-v2-arsenal'","VERSION:'frontlines-territory-v3-opening-compensation'");fs.writeFileSync(path.join(directory,'engine.js'),engine);
 let sim=fs.readFileSync(path.join(directory,'sim-core.js'),'utf8');
 sim=replaceOnce(sim,"reserves:'Draw configured opening and own-turn cards.","reserves:'Player 2 draws one additional card from their legal reserve during opening setup. Draw configured opening and own-turn cards.");
 sim=replaceOnce(sim,"rulesVersion:'sprint4-territory-arsenal-v1'","openingDrawBonus:{player1:0,player2:D.SECOND_PLAYER_OPENING_DRAW||0},\n      rulesVersion:D.SECOND_PLAYER_OPENING_DRAW?'sprint5-territory-opening-v1':'sprint4-territory-arsenal-v1'");
 sim=replaceOnce(sim,'config:D.DEFAULT_CONFIG}))','config:D.DEFAULT_CONFIG,secondPlayerOpeningDraw:D.SECOND_PLAYER_OPENING_DRAW||0}))');
 fs.writeFileSync(path.join(directory,'sim-core.js'),sim);
 for(const modulePath of Object.keys(require.cache))if(modulePath.startsWith(directory+path.sep))delete require.cache[modulePath];
 const runtime=require(path.join(directory,'balance.js')).createRuntime(id),state=runtime.engine.createGame({factions:['stonewall','bruiser'],seed:123});
 assert.equal(state.players[1].hand.length,runtime.data.DEFAULT_CONFIG.startingHand+1);runtime.engine.assertInvariants(state);
 const hypothesis=JSON.parse(fs.readFileSync(path.join(directory,'hypothesis.json')));hypothesis.openingRule={secondPlayerOpeningDraw:1,source:'Existing legal reserve',notAnExtraCard:true};fs.writeFileSync(path.join(directory,'hypothesis.json'),JSON.stringify(hypothesis,null,2)+'\n');require('./balance-provenance.js').writeProvenance(directory,id);return directory;
}
module.exports={createOpeningExperiment};
