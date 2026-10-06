'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),pkg=require('../package.json');
// Protocol compatibility fingerprints the canonical implementation, not artwork.
const gameplayFiles=['commanders.js','deck-rules.js','engine.js','tactical-rules.js'];
const hashes=Object.fromEntries(gameplayFiles.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex')]));
const gameplaySourceHash=crypto.createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
const output='/* Generated from package.json by scripts/sync-version.js. */\n(function(root){const info=Object.freeze('+JSON.stringify({version:pkg.version,productName:pkg.productName,gameplaySourceHash})+');if(typeof module==="object"&&module.exports)module.exports=info;root.FrontlinesBuild=info;})(typeof globalThis==="object"?globalThis:this);\n';
fs.writeFileSync(path.resolve(__dirname,'../build-info.js'),output);
