'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
if(!fs.existsSync(path.join(root,'docs/art/SPRINT12-VISUAL-CHECKPOINT.json')))throw new Error('The art checkpoint must precede refinement integration.');
for(const file of ['package.json','package-lock.json']){
  const target=path.join(root,file),pkg=JSON.parse(fs.readFileSync(target,'utf8'));pkg.version='1.0.5';
  if(file==='package.json')pkg.build.directories.output='release/1.0.5';else pkg.packages[''].version='1.0.5';
  fs.writeFileSync(target,JSON.stringify(pkg,null,2)+'\n');
}
const profile=require('../balance').getProfiles().find(p=>p.id==='sprint12');
fs.writeFileSync(path.join(root,'balance/sprint12.json'),JSON.stringify(profile,null,2)+'\n');
require('./sync-version');
console.log('Integrated v1.0.5 and the explicit refinement profile; historical profiles remain available.');
