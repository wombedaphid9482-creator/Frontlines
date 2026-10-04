'use strict';
const fs=require('node:fs'),path=require('node:path'),pkg=require('../package.json');
const output='/* Generated from package.json by scripts/sync-version.js. */\n(function(root){const info=Object.freeze('+JSON.stringify({version:pkg.version,productName:pkg.productName})+');if(typeof module==="object"&&module.exports)module.exports=info;root.FrontlinesBuild=info;})(typeof globalThis==="object"?globalThis:this);\n';
fs.writeFileSync(path.resolve(__dirname,'../build-info.js'),output);
