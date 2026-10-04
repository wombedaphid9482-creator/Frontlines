#!/usr/bin/env node
'use strict';
// Verify the actual packaged payload, not merely the files intended for packaging.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const asar=require('@electron/asar');
const root=path.resolve(__dirname,'..'),pkg=require('../package.json');
const release=path.resolve(root,process.argv[2]||`release/${pkg.version}`);
assert.ok(release.startsWith(root+path.sep),'Release must be inside this workspace.');
const archive=path.join(release,'win-unpacked','resources','app.asar');
const packedFile=file=>asar.extractFile(archive,file.split('/').join(path.sep));
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const runtimeFiles=[];
function walk(relative){
  const directory=path.join(root,relative);
  if(!fs.existsSync(directory))return;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const name=path.posix.join(relative,entry.name);
    if(entry.isDirectory())walk(name);else if(entry.isFile())runtimeFiles.push(name);
  }
}
for(const entry of fs.readdirSync(root,{withFileTypes:true}))if(entry.isFile()&&/\.(js|html|css)$/.test(entry.name))runtimeFiles.push(entry.name);
for(const directory of ['balance','assets/cards','assets/ui','assets/battlefield','assets/audio','assets/effects','assets/animations'])walk(directory);
const archivePaths=asar.listPackage(archive).map(name=>name.replaceAll('\\','/').replace(/^\/+/,''));
const sourceHashes={};
for(const file of runtimeFiles.sort()){
  assert.ok(archivePaths.includes(file),'Missing packaged runtime file: '+file);
  const source=fs.readFileSync(path.join(root,file)),packed=packedFile(file);
  assert.ok(source.equals(packed),'Packaged runtime differs from tested source: '+file);
  sourceHashes[file]=hash(source);
}
for(const file of archivePaths)assert.ok(!/^(tests|docs|scripts|release|dist|assets\/source)(\/|$)/.test(file)&&!/^node_modules\/(electron|electron-builder|playwright|@playwright|@electron\/asar)(\/|$)/.test(file),'Development material entered the runtime: '+file);
const packedPackage=JSON.parse(packedFile('package.json'));
assert.equal(packedPackage.version,pkg.version);assert.equal(packedPackage.main,pkg.main);
assert.equal(packedPackage.dependencies['electron-updater'],pkg.dependencies['electron-updater']);
const updater=JSON.parse(packedFile('node_modules/electron-updater/package.json'));
assert.ok(updater.version,'Production updater dependency missing.');
const baselineDirectory=path.join(root,'docs/balance/sprint5-baseline-source');
const baseline=JSON.parse(fs.readFileSync(path.join(baselineDirectory,'checkpoint-hashes.json')));
for(const [file,expected]of Object.entries(baseline.files))assert.equal(hash(fs.readFileSync(path.join(baselineDirectory,file))),expected,'Frozen Sprint 5 baseline changed: '+file);
const installerName=`Frontlines-Setup-${pkg.version}.exe`,installer=fs.readFileSync(path.join(release,installerName));
const report={version:pkg.version,verifiedRuntimeFiles:runtimeFiles.length,sourceHashes,
  productionUpdaterVersion:updater.version,verifiedFrozenFiles:Object.keys(baseline.files).length,
  developmentMaterialExcluded:true,installer:{file:installerName,bytes:installer.length,sha256:hash(installer)}};
fs.mkdirSync(path.join(root,'test-results'),{recursive:true});
fs.writeFileSync(path.join(root,'test-results',`release-${pkg.version}-verification.json`),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,sourceHashes:undefined},null,2));
