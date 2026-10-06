'use strict';
// File-level artwork checks only. Pixel quality and rendered crop review remain
// part of the visual gate; a valid header alone is not a quality judgment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function imageDimensions(bytes){
  if(!Buffer.isBuffer(bytes))throw Error('Image payload must be a Buffer');
  if(bytes.length>=24&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))){
    if(bytes.readUInt32BE(8)!==13||bytes.toString('ascii',12,16)!=='IHDR')throw Error('Invalid PNG header');
    const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
    if(!width||!height)throw Error('Invalid PNG dimensions');
    return [width,height];
  }
  if(bytes.length<20||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Expected a PNG or WebP image');
  if(bytes.readUInt32LE(4)+8!==bytes.length)throw Error('Truncated or malformed WebP container');
  for(let offset=12;offset+8<=bytes.length;){
    const kind=bytes.toString('ascii',offset,offset+4),length=bytes.readUInt32LE(offset+4),payload=offset+8;
    if(payload+length>bytes.length)throw Error('Truncated WebP chunk');
    if(kind==='VP8X'){
      if(length<10)throw Error('Truncated extended WebP header');
      return [bytes.readUIntLE(payload+4,3)+1,bytes.readUIntLE(payload+7,3)+1];
    }
    if(kind==='VP8 '){
      if(length<10||bytes.subarray(payload+3,payload+6).toString('hex')!=='9d012a')throw Error('Invalid lossy WebP frame');
      return [bytes.readUInt16LE(payload+6)&0x3fff,bytes.readUInt16LE(payload+8)&0x3fff];
    }
    if(kind==='VP8L'){
      if(length<5||bytes[payload]!==0x2f)throw Error('Invalid lossless WebP frame');
      const bits=bytes.readUInt32LE(payload+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];
    }
    offset=payload+length+(length%2);
  }
  throw Error('No WebP image frame found');
}

function localAsset(root,relative,prefix){
  if(typeof relative!=='string'||!relative||relative.includes('\\')||relative.includes('\0')||/[?#]/.test(relative)||path.posix.normalize(relative)!==relative||relative.startsWith('/')||!relative.startsWith(prefix))throw Error('Expected a normalized local '+prefix+' path');
  const candidate=path.resolve(root,relative),within=path.relative(path.resolve(root),candidate);
  if(!within||within==='..'||within.startsWith('..'+path.sep)||path.isAbsolute(within))throw Error('Asset path escaped the project');
  // Do not allow an otherwise well-formed registry path to escape through a link.
  const resolved=fs.realpathSync(candidate),resolvedWithin=path.relative(fs.realpathSync(root),resolved);
  if(!resolvedWithin||resolvedWithin==='..'||resolvedWithin.startsWith('..'+path.sep)||path.isAbsolute(resolvedWithin))throw Error('Asset link escaped the project');
  return candidate;
}

function validateReplacementAssets(root,assets,options={}){
  const errors=[],ids=new Set(),mappedCards=new Set(),runtimes=new Set();let totalBytes=0;
  if(!Array.isArray(assets))return {valid:false,errors:['Replacement assets must be an array'],totalBytes:0};
  const fail=(id,message)=>errors.push((id||'unnamed asset')+': '+message);
  for(const asset of assets){
    if(!asset||typeof asset!=='object'){fail('', 'Malformed asset record');continue;}
    const id=asset.id;
    if(typeof id!=='string'||!/^[a-z0-9_-]+$/.test(id))fail(id,'Invalid stable artwork ID');
    if(ids.has(id))fail(id,'Duplicate artwork ID');ids.add(id);
    const cardIds=asset.cardIds||[asset.cardId||id];
    if(!Array.isArray(cardIds)||!cardIds.length)fail(id,'Missing card mappings');
    else for(const cardId of cardIds){
      if(options.cards&&!Object.hasOwn(options.cards,cardId))fail(id,'Unknown card '+cardId);
      if(mappedCards.has(cardId))fail(id,'Card mapped more than once: '+cardId);mappedCards.add(cardId);
    }
    let runtime,source,runtimeSize,sourceSize;
    try{runtime=fs.readFileSync(localAsset(root,asset.runtime,'assets/cards/'));runtimeSize=imageDimensions(runtime);if(!asset.runtime.endsWith('.webp'))fail(id,'Runtime artwork must be optimized WebP');}catch(error){fail(id,error.message);}
    try{
      const preservedRuntime=typeof asset.source==='string'&&asset.source.startsWith('assets/cards/');
      if(preservedRuntime&&!Object.hasOwn(options.preservedSourceHashes||{},asset.source))throw Error('Runtime source is not an explicitly preserved historical asset');
      source=fs.readFileSync(localAsset(root,asset.source,preservedRuntime?'assets/cards/':'assets/source/'));sourceSize=imageDimensions(source);
      if(preservedRuntime&&sha256(source)!==options.preservedSourceHashes[asset.source])fail(id,'Historical source differs from its frozen checkpoint');
    }catch(error){fail(id,error.message);}
    if(runtime){
      totalBytes+=runtime.length;
      if(runtimes.has(asset.runtime))fail(id,'Duplicate runtime asset; share one asset record with explicit cardIds');runtimes.add(asset.runtime);
      if(runtime.length>(options.maxAssetBytes||200000))fail(id,'Runtime exceeds per-asset size budget');
      if(asset.runtimeBytes!==runtime.length)fail(id,'Runtime byte count mismatch');
      if(asset.runtimeSha256!==sha256(runtime))fail(id,'Runtime SHA256 mismatch');
      const declared=asset.runtimeDimensions||[asset.width,asset.height];
      if(JSON.stringify(declared)!==JSON.stringify(runtimeSize))fail(id,'Runtime dimensions mismatch');
      if(runtimeSize.some(n=>n<(options.minRuntimeDimension||512)||n>(options.maxRuntimeDimension||1024)))fail(id,'Runtime dimensions outside expected display range');
    }
    if(source){
      if(asset.sourceSha256!==sha256(source))fail(id,'Source SHA256 mismatch');
      if(JSON.stringify(asset.sourceDimensions)!==JSON.stringify(sourceSize))fail(id,'Source dimensions mismatch');
    }
    if(runtimeSize&&sourceSize){
      let region=sourceSize;
      if(asset.crop){
        const {left,top,width,height}=asset.crop;
        if(![left,top,width,height].every(Number.isInteger)||left<0||top<0||width<=0||height<=0||left+width>sourceSize[0]||top+height>sourceSize[1])fail(id,'Source crop is outside the preserved image');
        else region=[width,height];
      }
      if(Math.abs(runtimeSize[0]/runtimeSize[1]-region[0]/region[1])>.01)fail(id,'Runtime aspect ratio would stretch the source crop');
      if(runtimeSize[0]>region[0]||runtimeSize[1]>region[1])fail(id,'Runtime unexpectedly upscales preserved artwork');
    }
  }
  if(totalBytes>(options.maxTotalBytes||20000000))errors.push('Replacement set exceeds the shared runtime size budget');
  return {valid:errors.length===0,errors,totalBytes,mappedCards:[...mappedCards]};
}

function validateCardArtManifest(root,manifest,options={}){
  const errors=[],records=[];
  if(!manifest||!['sprint12-art-v1','frontlines-refined-art-012-v1'].includes(manifest.version))errors.push('Expected the explicit Sprint 12 art manifest version');
  if(!manifest?.cards||typeof manifest.cards!=='object'||Array.isArray(manifest.cards))return {valid:false,errors:[...errors,'Manifest cards must be an explicit ID registry'],totalBytes:0,mappedCards:[]};
  for(const[id,record]of Object.entries(manifest.cards)){
    if(!record||typeof record!=='object'){errors.push(id+': Malformed artwork record');continue;}
    if(options.cards&&!Object.hasOwn(options.cards,id))errors.push(id+': Unknown card');
    if(!['C','D'].includes(record.classificationBefore))errors.push(id+': Only documented C/D artwork should be replaced');
    if(!['A','B'].includes(record.classificationAfter))errors.push(id+': Replacement does not meet the art quality floor');
    if(typeof record.reason!=='string'||record.reason.trim().length<12)errors.push(id+': Missing review rationale');
    records.push({...record,id,cardIds:[id],runtime:record.src,runtimeSha256:record.sha256,runtimeDimensions:[record.width,record.height]});
  }
  const result=validateReplacementAssets(root,records,options);
  return {...result,valid:!errors.length&&result.valid,errors:[...errors,...result.errors]};
}

module.exports={sha256,imageDimensions,localAsset,validateReplacementAssets,validateCardArtManifest};
