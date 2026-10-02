#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),A=require('../analytics');
const file=process.argv[2];if(!file){console.error('Usage: node scripts/check-balance-gate.js REPORT.json');process.exitCode=2;}else{try{const report=JSON.parse(fs.readFileSync(path.resolve(file),'utf8')),gate=A.balanceGate(report);console.log(JSON.stringify(gate,null,2));if(!gate.requiredPassed||!gate.preferredPassed)process.exitCode=1;}catch(error){console.error(error.message);process.exitCode=2;}}
