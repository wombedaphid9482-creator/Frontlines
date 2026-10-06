'use strict';
/* Approved art-only pipeline. Usage:
 * node scripts/optimize-sprint12-art.js --check
 * node scripts/optimize-sprint12-art.js [--plan relative/or/absolute/jobs-plan.json]
 * --check never writes; any missing/invalid source prevents every output write.
 * Generated classificationAfter B is PROVISIONAL until the independent visual audit.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/noaho/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),VERSION='frontlines-refined-art-012-v1';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const allowedFactions=new Set(['stonewall','bruiser','syndicate','nightwalker','rogue']);
function plain(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function projectFile(relative,prefix){
  if(typeof relative!=='string'||!relative||path.isAbsolute(relative)||relative.includes('\\'))throw new Error('Source must be a project-relative forward-slash path.');
  const absolute=path.resolve(root,relative),allowed=path.resolve(root,prefix),rel=path.relative(allowed,absolute);
  if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw new Error('Path escapes its approved asset directory: '+relative);
  return absolute;
}
function position(value='50% 50%'){
  if(typeof value!=='string')throw new Error('Art position must be two percentages.');
  const match=value.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
  if(!match||match.slice(1).some(n=>Number(n)>100))throw new Error('Invalid art focal position: '+value);
  return value;
}
function cellCrop(metadata,grid,cell){
  if(![1,2].includes(grid)||!Number.isInteger(cell)||cell<0||cell>=grid*grid)throw new Error('Only valid 1×1 or 2×2 panel coordinates are supported.');
  if(!Number.isInteger(metadata.width)||!Number.isInteger(metadata.height)||metadata.width!==metadata.height)throw new Error('Painting source must be a decoded square image; independent X/Y scaling is prohibited.');
  const width=Math.floor(metadata.width/grid),height=Math.floor(metadata.height/grid);
  if(width<512||height<512)throw new Error('Source panel is below 512px; refusing to upscale.');
  return {left:(cell%grid)*width,top:Math.floor(cell/grid)*height,width,height};
}
function validatePlan(plan,catalog){
  if(!plain(plan)||!Array.isArray(plan.jobs)||!Array.isArray(plan.reuse))throw new Error('Plan requires jobs and reuse arrays.');
  if(!plan.jobs.length)throw new Error('No painted source jobs were supplied.');
  const entries=[],ids=new Set(),names=new Set();
  function cards(record,sourceInfo){
    if(!plain(record)||!Array.isArray(record.cardIds)||!record.cardIds.length)throw new Error('Every mapped cell needs cardIds.');
    const focal=position(record.position),reason=record.reason;
    if(typeof reason!=='string'||!reason.trim())throw new Error('Every mapped cell needs a concrete art reason.');
    if(record.classificationBefore!==undefined&&!['A','B','C','D'].includes(record.classificationBefore))throw new Error('Invalid before classification.');
    for(const id of record.cardIds){
      if(typeof id!=='string'||!catalog[id]||!allowedFactions.has(catalog[id].faction))throw new Error('Unknown battlefield card ID: '+id);
      if(ids.has(id))throw new Error('Duplicate card mapping: '+id);ids.add(id);
      entries.push({id,...sourceInfo,position:focal,reason,classificationBefore:record.classificationBefore||(['unit','leader'].includes(catalog[id].type)?'C':'D')});
    }
  }
  for(const job of plan.jobs){
    if(!plain(job)||typeof job.name!=='string'||!/^[a-z0-9-]+$/.test(job.name)||names.has(job.name))throw new Error('Each source job needs a unique safe name.');
    names.add(job.name);const grid=job.grid??2;
    if(![1,2].includes(grid)||!Array.isArray(job.cells)||!job.cells.length)throw new Error('Job must have a 1×1 or 2×2 grid and mapped cells.');
    projectFile(job.source,'assets/source/card-art-012');if(!job.source.endsWith('.png'))throw new Error('Generated masters must remain PNG source files.');
    const slots=new Set();for(const record of job.cells){
      if(!Number.isInteger(record.cell)||record.cell<0||record.cell>=grid*grid||slots.has(record.cell))throw new Error('Duplicate or invalid source cell in '+job.name);slots.add(record.cell);
      cards(record,{source:job.source,atlas:job.name,grid,cell:record.cell,reuse:false});
    }
  }
  for(const record of plan.reuse){
    projectFile(record.source,'assets/cards');if(!record.source.endsWith('.webp'))throw new Error('Reused runtime source must be WebP.');
    const crop=record.crop;if(!plain(crop)||!['left','top','width','height'].every(k=>Number.isInteger(crop[k])&&crop[k]>=0)||crop.width!==512||crop.height!==512)throw new Error('Reused source crops must be exact 512×512 integer quadrants.');
    cards(record,{source:record.source,atlas:record.atlas||path.basename(record.source,'.webp'),crop:{...crop},cell:record.cell??null,reuse:true});
  }
  if(plan.expectedCardCount!==undefined&&(!Number.isInteger(plan.expectedCardCount)||entries.length!==plan.expectedCardCount))throw new Error('Expected '+plan.expectedCardCount+' mapped cards, got '+entries.length+'.');
  if(plan.expectedSourceJobs!==undefined&&plan.jobs.length!==plan.expectedSourceJobs)throw new Error('Unexpected generated-source job count.');
  return entries;
}
function promptProvenance(plan,folder=path.join(root,'assets/source/card-art-012')){
  const records=[];
  for(const name of fs.readdirSync(folder).filter(name=>/^generation-.*\.json$/.test(name)).sort()){
    const value=JSON.parse(fs.readFileSync(path.join(folder,name),'utf8'));
    const list=Array.isArray(value)?value:Array.isArray(value.jobs)?value.jobs:Array.isArray(value.records)?value.records:[value];
    for(const record of list)if(record&&typeof record.prompt==='string')records.push({...record,recordLog:'assets/source/card-art-012/'+name});
  }
  const executions=[],missing=[];
  for(const job of plan.jobs){
    const record=records.find(r=>r.workspaceSource===job.source||r.source===job.source||String(r.name||'').replace(/\.png$/,'')===job.name);
    if(!record){missing.push(job.source);continue;}
    executions.push({source:job.source,executedPrompt:record.prompt,recordLog:record.recordLog,sourceGeneratedPath:record.sourceGeneratedPath||record.generatedPath||null,outputHint:record.outputHint||record.output_hint||null,outputHintNote:record.outputHint||record.output_hint?null:record.outputHintNote||'Raw tool hint text was not retained in this generation log; exact prompt and original returned PNG path are preserved.',designPlanPrompt:job.prompt||null,matchesDesignPlan:record.prompt===job.prompt});
  }
  return {designPlan:plan.prompts||null,exactExecutedPrompts:executions,missingExecutionRecords:missing,status:missing.length?'incomplete-execution-provenance':'complete-execution-provenance',note:'Design-plan wording is not claimed as the executed prompt. Exact tool prompts come only from preserved generation logs.'};
}
async function preflight(plan,catalog){
  const entries=validatePlan(plan,catalog),sourceFiles=[...new Set(entries.map(e=>e.source))],missing=sourceFiles.filter(src=>!fs.existsSync(path.join(root,src))),sources={},errors=[];
  for(const source of sourceFiles){
    if(missing.includes(source))continue;
    try{
      const bytes=fs.readFileSync(path.join(root,source)),metadata=await sharp(bytes).metadata(),expected=source.endsWith('.png')?'png':'webp';
      if(metadata.format!==expected)throw new Error('Source content must genuinely be '+expected+', not '+metadata.format+'.');
      sources[source]={bytes,metadata,sha256:sha(bytes)};
    }catch(error){errors.push({source,error:error.message});}
  }
  for(const e of entries){
    if(!sources[e.source])continue;
    try{
      const metadata=sources[e.source].metadata,crop=e.reuse?e.crop:cellCrop(metadata,e.grid,e.cell);
      if(crop.left+crop.width>metadata.width||crop.top+crop.height>metadata.height)throw new Error('Crop extends beyond preserved source.');
      if(crop.width<512||crop.height<512)throw new Error('No upscaling is permitted.');
      e.crop={...crop};
    }catch(error){errors.push({id:e.id,source:e.source,error:error.message});}
  }
  return {ready:!missing.length&&!errors.length,missing,errors,entries,sources};
}
async function optimize(plan,catalog,{check=false,prompts={}}={}){
  const result=await preflight(plan,catalog),report={ready:result.ready,checkOnly:check,cards:result.entries.length,jobs:plan.jobs.length,availableSources:Object.keys(result.sources).length,missing:result.missing,errors:result.errors,runtimeWrites:0};
  if(!result.ready||check)return report;
  // Encode and decode every asset before publishing any runtime files or map.
  const prepared=[],cards={},encoded=new Map();
  for(const e of result.entries){
    const key=e.source+'|'+JSON.stringify(e.crop);let bytes=encoded.get(key);
    if(!bytes){bytes=await sharp(result.sources[e.source].bytes).extract(e.crop).resize(512,512,{fit:'cover',withoutEnlargement:true}).webp({quality:88,effort:6}).toBuffer();encoded.set(key,bytes);}
    const metadata=await sharp(bytes).metadata();if(metadata.width!==512||metadata.height!==512)throw new Error('Encoded runtime image is not square 512px: '+e.id);
    const definition=catalog[e.id],src='assets/cards/refined-012/'+definition.faction+'/'+e.id+'.webp',source=result.sources[e.source];
    projectFile(src,'assets/cards/refined-012');
    cards[e.id]={src,source:e.source,sha256:sha(bytes),width:512,height:512,runtimeBytes:bytes.length,sourceSha256:source.sha256,sourceDimensions:[source.metadata.width,source.metadata.height],crop:e.crop,atlas:e.atlas,cell:e.cell,classificationBefore:e.classificationBefore,classificationAfter:'B',classificationStatus:'provisional-pending-visual-review',reason:e.reason,position:e.position,alt:definition.name+' — '+definition.faction+' painted '+definition.type+' illustration',resize:'uniform cover to 512×512; no enlargement'};
    prepared.push({src,bytes});
  }
  const manifest={version:VERSION,tool:'built-in image_gen sources; bundled Sharp 512px WebP quality 88',prompts,qualityReview:{status:'pending',classificationAfterIsProvisional:true,requirement:'Visually review every actual rendered card and retain before/after evidence before accepting B or declaring the art gate complete.'},cards};
  const map='/* Generated from preserved Sprint 12 art sources. Trusted build asset IDs only.\n * Grades remain provisional until independent actual-card visual review. */\n(function(root){\n  \'use strict\';\n  const CARDS='+JSON.stringify(cards,null,2)+';\n  function freeze(value){if(value&&typeof value===\'object\'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}\n  const api=freeze({VERSION:'+JSON.stringify(VERSION)+',CARDS});\n  root.FrontlinesArtMap012=api;\n  if(typeof module!==\'undefined\'&&module.exports)module.exports=api;\n})(typeof globalThis!==\'undefined\'?globalThis:this);\n';
  for(const asset of prepared){const destination=path.join(root,asset.src);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,asset.bytes);}
  fs.writeFileSync(path.join(root,'assets/source/card-art-012/manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(root,'art-map012.js'),map);
  // Masters and all historical assets were read-only throughout the operation.
  return {...report,runtimeWrites:prepared.length,runtimeBytes:prepared.reduce((n,a)=>n+a.bytes.length,0),uniqueEncodedPaintings:encoded.size,qualityReview:'pending'};
}
if(require.main===module){
  (async()=>{
    const args=process.argv.slice(2),planIndex=args.indexOf('--plan'),planPath=planIndex<0?'assets/source/card-art-012/jobs-plan.json':args[planIndex+1];
    if(!planPath)throw new Error('--plan requires a JSON file path.');
    const absolute=path.resolve(root,planPath);if(!fs.existsSync(absolute)){console.log(JSON.stringify({ready:false,missingPlan:planPath,runtimeWrites:0}));process.exitCode=2;return;}
    const plan=JSON.parse(fs.readFileSync(absolute,'utf8')),catalog=require('../balance').dataFor('sprint11').CARDS;
    const prompts=promptProvenance(plan);
    if(!args.includes('--check')&&prompts.missingExecutionRecords.length)throw new Error('Exact executed-prompt logs are missing for: '+prompts.missingExecutionRecords.join(', '));
    const report=await optimize(plan,catalog,{check:args.includes('--check'),prompts});console.log(JSON.stringify(report,null,2));if(!report.ready)process.exitCode=2;
  })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
module.exports={VERSION,projectFile,position,cellCrop,validatePlan,promptProvenance,preflight,optimize};
