'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
for(const file of ['index.html','deck-builder.html','collection.html','simulator.html','tactical-training.html']){
 const target=path.join(root,file);let text=fs.readFileSync(target,'utf8');
 if(!text.includes('src="tactical-rules.js"'))text=text.replace(/(<script(?: defer)? src="engine.js"><\/script>)/,(_,tag)=>tag.includes(' defer')?'<script defer src="tactical-rules.js"></script>\n  '+tag:'<script src="tactical-rules.js"></script>'+tag);
 if(!text.includes('src="tactical-arsenal.js"'))text=text.replace(/(<script(?: defer)? src="balance.js"><\/script>)/,(_,tag)=>tag.includes(' defer')?'<script defer src="tactical-arsenal.js"></script>\n  '+tag:'<script src="tactical-arsenal.js"></script>'+tag);
 fs.writeFileSync(target,text);
}
for(const file of ['package.json','package-lock.json']){
 const target=path.join(root,file),data=JSON.parse(fs.readFileSync(target,'utf8'));data.version='1.0.4';
 if(file==='package.json')data.build.directories.output='release/1.0.4';else if(data.packages?.[''])data.packages[''].version='1.0.4';
 fs.writeFileSync(target,JSON.stringify(data,null,2)+'\n');
}
const B=require('../balance.js');fs.writeFileSync(path.join(root,'balance/sprint11.json'),JSON.stringify(B.getProfiles().find(p=>p.id==='sprint11'),null,2)+'\n');
require('./sync-version.js');console.log('Integrated tactical modules and v1.0.4 metadata; no simulation started.');
