// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

test('ESM bundle exposes expected public API', async () => {
  const mod = await import('../dist/tinyts.esm.js');

  for (const key of [
    'engineStart',
    'engineStop',
    'vec2',
    'drawRect',
    'keyDown',
    'playSound',
    'moveAABB',
    'tilemapFromString',
    'createSpatialGrid',
    'emitParticles',
  ]) {
    assert.equal(typeof mod[key], 'function', key);
  }
});

test('CJS bundle can be required', () => {
  const require = createRequire(import.meta.url);
  const mod = require('../dist/tinyts.cjs');

  assert.equal(typeof mod.engineStart, 'function');
  assert.equal(mod.vec2(1, 2).y, 2);
});

test('global bundle assigns browser-friendly globals', async () => {
  await import('../dist/tinyts.js');

  assert.equal(typeof globalThis.engineStart, 'function');
  assert.equal(typeof globalThis.vec2, 'function');
  assert.equal(globalThis.vec2(1, 2).x, 1);
});
