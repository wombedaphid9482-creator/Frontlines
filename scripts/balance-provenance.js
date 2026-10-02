'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function writeProvenance(directory,id){
 directory=path.resolve(directory);const baseline=path.resolve('docs/balance/sprint5-baseline-source'),frozen=JSON.parse(fs.readFileSync(path.join(baseline,'checkpoint-hashes.json')));
 for(const [file,hash]of Object.entries(frozen.files))assert.equal(digest(path.join(baseline,file)),hash,'Frozen baseline changed: '+file);
 const before=require(path.join(baseline,'balance.js')).dataFor('arsenal'),after=require(path.join(directory,'balance.js')).dataFor(id),profile=require(path.join(directory,'balance.js')).getProfiles().find(p=>p.id===id);
 const diff=(a,b)=>Object.fromEntries(Object.keys({...a,...b}).filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key])).map(key=>[key,{before:a[key],after:b[key]}]));
 const cards=Object.fromEntries(Object.keys(after.CARDS).map(card=>[card,diff(before.CARDS[card],after.CARDS[card])]).filter(([,fields])=>Object.keys(fields).length));
 const result={experiment:id,comparisonProfile:'arsenal',cards,config:diff(before.DEFAULT_CONFIG,after.DEFAULT_CONFIG),starters:diff(before.DECKS,after.DECKS),secondPlayerOpeningDraw:{before:before.SECOND_PLAYER_OPENING_DRAW||0,after:after.SECOND_PLAYER_OPENING_DRAW||0},profileVersion:profile.version,compiledFromActualSource:true};
 fs.writeFileSync(path.join(directory,'actual-deltas.json'),JSON.stringify(result,null,2)+'\n');
 const files={};function scan(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())scan(file);else if(/\.(js|json|html|css)$/.test(entry.name)&&!['checkpoint-hashes.json','actual-deltas.json','hypothesis.json'].includes(entry.name))files[path.relative(directory,file).replace(/\\/g,'/')]=digest(file);}}scan(directory);
 fs.writeFileSync(path.join(directory,'checkpoint-hashes.json'),JSON.stringify({experiment:id,balanceProfile:id,balanceVersion:profile.version,frozenBaselineReference:'../../sprint5-baseline-source/checkpoint-hashes.json',description:'Actual current isolated-source hashes; regenerated after all experiment patches. Not inherited parent hashes.',files},null,2)+'\n');return result;
}
module.exports={writeProvenance};
if(require.main===module){for(const id of fs.readdirSync('docs/balance/sprint5-experiments')){const directory=path.resolve('docs/balance/sprint5-experiments',id);if(fs.existsSync(path.join(directory,'balance',id+'.json')))writeProvenance(directory,id);}console.log('Regenerated exact experiment deltas and source hashes; immutable baseline hashes verified.');}
