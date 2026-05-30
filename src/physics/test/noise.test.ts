import test from 'node:test';
import assert from 'node:assert/strict';

import {
  noise2D,
  fractalNoise2D,
} from '../../index.ts';

test('noise2D returns values in [0, 1] range', () => {
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      const n = noise2D(x * 0.5, y * 0.5);
      assert.ok(n >= 0, `noise2D(${x},${y}) = ${n} < 0`);
      assert.ok(n <= 1, `noise2D(${x},${y}) = ${n} > 1`);
    }
  }
});

test('noise2D is deterministic (same inputs → same outputs)', () => {
  const a = noise2D(3.14, 2.71);
  const b = noise2D(3.14, 2.71);
  assert.equal(a, b);
});

test('noise2D produces different values for different coordinates', () => {
  const a = noise2D(0, 0);
  const b = noise2D(10, 10);
  assert.notEqual(a, b);
});

test('fractalNoise2D returns values in [0, 1] range', () => {
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const n = fractalNoise2D(x * 0.3, y * 0.3, 4, 2, 0.5);
      assert.ok(n >= 0, `fractalNoise2D(${x},${y}) = ${n} < 0`);
      assert.ok(n <= 1, `fractalNoise2D(${x},${y}) = ${n} > 1`);
    }
  }
});

test('fractalNoise2D is also deterministic', () => {
  const a = fractalNoise2D(1.5, 2.5, 3, 2, 0.5);
  const b = fractalNoise2D(1.5, 2.5, 3, 2, 0.5);
  assert.equal(a, b);
});

test('fractalNoise2D defaults to 4 octaves', () => {
  const explicit = fractalNoise2D(1, 1, 4, 2, 0.5);
  const defaulted = fractalNoise2D(1, 1);
  assert.equal(explicit, defaulted);
});

test('more octaves in fractal noise produces smoother results', () => {
  // Single octave vs multi-octave should differ
  const single = fractalNoise2D(0.5, 0.5, 1, 2, 0.5);
  const multi = fractalNoise2D(0.5, 0.5, 6, 2, 0.5);
  assert.notEqual(single, multi);
});
