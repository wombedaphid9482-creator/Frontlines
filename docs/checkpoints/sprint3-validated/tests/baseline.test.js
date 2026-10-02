'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = path.resolve(__dirname, '../docs/balance/sprint-3-baseline');
test('Sprint 3 archived runtime and authoring source remain byte-for-byte unchanged', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(base,'manifest.json'),'utf8'));
  const hashes = {...manifest.hashes,...JSON.parse(fs.readFileSync(path.join(base,'source-art-hashes.json'),'utf8')),...JSON.parse(fs.readFileSync(path.join(base,'supplement-hashes.json'),'utf8'))};
  for(const [file,expected] of Object.entries(hashes)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'source',file))).digest('hex');
    assert.equal(actual,expected,`Historical baseline changed: ${file}`);
  }
  assert.ok(Object.keys(hashes).length >= 42);
});
test('User-reported aggregate baseline is preserved separately from reproducible records', () => {
  const reported = JSON.parse(fs.readFileSync(path.join(base,'reported-results.json'),'utf8'));
  assert.equal(reported.rows.reduce((sum,row)=>sum+row.wins,0),10000);
  assert.equal(reported.rows.find(row=>row.faction==='bruiser').wins,3929);
  assert.ok(reported.unknown.includes('seed'));
});
