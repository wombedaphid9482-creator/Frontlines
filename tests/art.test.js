'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('../data.js');
const Art = require('../art.js').forVersion('1.0.4');
const project = path.join(__dirname, '..');

// Read the standard WebP frame metadata without introducing a runtime library.
function dimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = bytes.toString('ascii', offset, offset + 4);
    const length = bytes.readUInt32LE(offset + 4);
    const payload = offset + 8;
    assert.ok(payload + length <= bytes.length, 'Truncated WebP chunk');
    if (kind === 'VP8X') return [bytes.readUIntLE(payload + 4, 3) + 1, bytes.readUIntLE(payload + 7, 3) + 1];
    if (kind === 'VP8 ') {
      assert.equal(bytes.subarray(payload + 3, payload + 6).toString('hex'), '9d012a');
      return [bytes.readUInt16LE(payload + 6) & 0x3fff, bytes.readUInt16LE(payload + 8) & 0x3fff];
    }
    if (kind === 'VP8L') {
      assert.equal(bytes[payload], 0x2f);
      const bits = bytes.readUInt32LE(payload + 1);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    offset = payload + length + (length % 2);
  }
  assert.fail('No supported WebP frame metadata');
}

test('every playable unit and leader resolves to an existing faction art role', () => {
  const roles = new Set(['rifle', 'heavy', 'specialist', 'commander']);
  const positions = new Set(['0% 0%', '100% 0%', '0% 100%', '100% 100%']);
  for (const card of Object.values(D.CARDS).filter(c => c.type === 'unit' || c.type === 'leader')) {
    const asset = Art.get(card);
    assert.equal(asset.faction, card.faction, card.id);
    assert.ok(roles.has(asset.role), `Unknown role for ${card.id}`);
    assert.ok(positions.has(asset.position), `Missing atlas crop for ${card.id}`);
    assert.equal(asset.src, `assets/cards/${card.faction}/starter-atlas.webp`);
    assert.ok(fs.existsSync(path.join(project, asset.src)), `Missing art for ${card.id}`);
    assert.ok(asset.alt.includes(card.name), `Missing accessible card name: ${card.id}`);
    if (card.type === 'leader') assert.equal(asset.role, 'commander', card.id);
  }
});

test('all five runtime atlases are optimized 1024px WebP assets under the size budget', t => {
  let total = 0;
  for (const faction of Object.keys(D.FACTIONS)) {
    const file = path.join(project, 'assets', 'cards', faction, 'starter-atlas.webp');
    const bytes = fs.readFileSync(file);
    assert.deepEqual(dimensions(bytes), [1024, 1024], faction);
    assert.ok(bytes.length < 350000, `${faction} runtime atlas exceeds 350KB`);
    total += bytes.length;
    assert.ok(fs.existsSync(path.join(project, 'assets', 'source', 'cards', faction, 'starter-atlas.png')), `Missing preserved source art for ${faction}`);
  }
  assert.ok(total < 1750000, 'Five runtime atlases exceed the shared art budget');
  t.diagnostic(`Five runtime atlases: ${total.toLocaleString('en-US')} bytes total`);
});

test('each faction has a distinct reusable theme and local SVG emblem', () => {
  const primaryColors = new Set(), emblems = new Set();
  for (const faction of Object.keys(D.FACTIONS)) {
    const theme = Art.THEMES[faction];
    assert.ok(theme, `Missing faction identity: ${faction}`);
    for (const key of ['primary', 'secondary', 'ground']) assert.match(theme[key], /^#[0-9a-f]{6}$/i);
    assert.ok(theme.motif.length > 10, `Missing motif: ${faction}`);
    const svg = fs.readFileSync(path.join(project, theme.emblem), 'utf8');
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=/);
    primaryColors.add(theme.primary);
    emblems.add(theme.emblem);
  }
  assert.equal(primaryColors.size, 5);
  assert.equal(emblems.size, 5);
});
