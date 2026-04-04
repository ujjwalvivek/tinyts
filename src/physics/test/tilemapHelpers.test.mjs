import test from 'node:test';
import assert from 'node:assert/strict';

import {
  tilemapFromString,
  fillTiles,
  drawLineTiles,
  drawCircleTiles,
  stampTiles,
  stampTilemap,
} from '../../../dist/tinyts.esm.js';

function emptyMap(w, h) {
  return tilemapFromString(
    Array.from({ length: h }, () => '.'.repeat(w)).join('\n'),
    { '.': {} },
    10,
  );
}

test('fillTiles sets a rectangular region', () => {
  const map = emptyMap(5, 5);
  fillTiles(map, 1, 1, 3, 3, 1);

  assert.equal(map.getTile(0, 0), 0);
  assert.equal(map.getTile(1, 1), 1);
  assert.equal(map.getTile(3, 3), 1);
  assert.equal(map.getTile(4, 4), 0);

  // Outside bounds should be clamped
  fillTiles(map, -1, -1, 10, 10, 2);
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      assert.equal(map.getTile(x, y), 2);
    }
  }
});

test('drawLineTiles draws a Bresenham line', () => {
  const map = emptyMap(10, 10);
  drawLineTiles(map, 0, 0, 4, 4, 1);

  // Diagonal should be set
  assert.equal(map.getTile(0, 0), 1);
  assert.equal(map.getTile(1, 1), 1);
  assert.equal(map.getTile(2, 2), 1);
  assert.equal(map.getTile(3, 3), 1);
  assert.equal(map.getTile(4, 4), 1);

  // Off the line should not
  assert.equal(map.getTile(0, 4), 0);
});

test('drawCircleTiles draws a filled circle', () => {
  const map = emptyMap(10, 10);
  drawCircleTiles(map, 4, 4, 3, 1);

  // Center should be filled
  assert.equal(map.getTile(4, 4), 1);

  // Center-adjacent should be filled
  assert.equal(map.getTile(4, 5), 1);

  // Far corner should not
  assert.equal(map.getTile(0, 0), 0);
});

test('stampTiles copies a 2D array into the tilemap', () => {
  const map = emptyMap(5, 5);
  const stamp = [
    [1, 2],
    [3, 4],
  ];

  stampTiles(map, 1, 1, stamp);
  assert.equal(map.getTile(1, 1), 1);
  assert.equal(map.getTile(2, 1), 2);
  assert.equal(map.getTile(1, 2), 3);
  assert.equal(map.getTile(2, 2), 4);

  // Outside bounds should not error
  stampTiles(map, -1, -1, stamp);
});

test('stampTilemap copies from one tilemap to another', () => {
  const source = tilemapFromString('12\n34\n', {
    '1': { sprite: 1 },
    '2': { sprite: 2 },
    '3': { sprite: 3 },
    '4': { sprite: 4 },
    '.': {},
  }, 10);

  const dest = emptyMap(5, 5);
  stampTilemap(dest, 1, 1, source);

  // '1' → char '1' → sprite index for '1'
  assert.equal(dest.getTile(1, 1), source.getTile(0, 0));
  assert.equal(dest.getTile(2, 1), source.getTile(1, 0));
  assert.equal(dest.getTile(1, 2), source.getTile(0, 1));
  assert.equal(dest.getTile(2, 2), source.getTile(1, 1));
});

test('stampTilemap with source region', () => {
  const source = tilemapFromString('123\n456\n789\n', {
    '1': { sprite: 1 },
    '2': { sprite: 2 },
    '3': { sprite: 3 },
    '4': { sprite: 4 },
    '5': { sprite: 5 },
    '6': { sprite: 6 },
    '7': { sprite: 7 },
    '8': { sprite: 8 },
    '9': { sprite: 9 },
    '.': {},
  }, 10);

  const dest = emptyMap(5, 5);
  stampTilemap(dest, 0, 0, source, 1, 1, 2, 2);

  // Source region (1,1)-(2,2) = [[5,6],[8,9]]
  assert.equal(dest.getTile(0, 0), source.getTile(1, 1));
  assert.equal(dest.getTile(1, 0), source.getTile(2, 1));
  assert.equal(dest.getTile(0, 1), source.getTile(1, 2));
  assert.equal(dest.getTile(1, 1), source.getTile(2, 2));
});
