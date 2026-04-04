import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aabb,
  tilemapFromString,
  vec2,
  moveTilemap,
} from '../../../dist/tinyts.esm.js';

function makeMap() {
  return tilemapFromString(`
    .....
    ..#..
    .###.
    .....
  `, {
    '.': {},
    '#': { solid: true, sprite: 1 },
    '@': { spawn: 'player' },
  }, 10);
}

test('tilemapFromString exposes dimensions, tiles, and coordinate conversion', () => {
  const map = makeMap();

  assert.equal(map.width, 5);
  assert.equal(map.height, 4);
  assert.equal(map.getTile(2, 1), 1);
  assert.deepEqual(map.tileToWorld(2, 1), vec2(20, 10));
  assert.deepEqual(map.worldToTile(29.9, 10), { x: 2, y: 1 });
});

test('tilemap spawn lookup returns tile center', () => {
  const map = tilemapFromString(`
    ...
    .@.
    ...
  `, {
    '.': {},
    '@': { spawn: 'player' },
  }, 16);

  assert.deepEqual(map.getSpawn('player'), vec2(24, 24));
  assert.equal(map.getSpawn('missing'), null);
});

test('tilemap solidity treats outside map as solid', () => {
  const map = makeMap();

  assert.equal(map.isSolid(2, 1), true);
  assert.equal(map.isSolid(0, 0), false);
  assert.equal(map.isSolid(-1, 0), true);
});

test('tilemap isSolidAABB checks every covered tile', () => {
  const map = makeMap();

  assert.equal(map.isSolidAABB(aabb(vec2(0, 0), vec2(8, 8))), false);
  assert.equal(map.isSolidAABB(aabb(vec2(19, 10), vec2(4, 4))), true);
});

test('tilemap collision resolves floor contact as touching bottom', () => {
  const map = tilemapFromString(`
    ...
    ###
  `, {
    '.': {},
    '#': { solid: true },
  }, 10);

  const result = map.collisionTest(vec2(2, 8), vec2(6, 6));

  assert.equal(result.hit, true);
  assert.deepEqual({ x: result.pos.x, y: result.pos.y }, { x: 2, y: 4 });
  assert.equal(result.touching.bottom, true);
  assert.equal(result.touching.top, false);
});

test('tilemap collision resolves wall contact as touching right', () => {
  const map = tilemapFromString(`
    .#
    .#
  `, {
    '.': {},
    '#': { solid: true },
  }, 10);

  const result = map.collisionTest(vec2(8, 2), vec2(6, 6));

  assert.equal(result.hit, true);
  assert.deepEqual({ x: result.pos.x, y: result.pos.y }, { x: 4, y: 2 });
  assert.equal(result.touching.right, true);
  assert.equal(result.touching.left, false);
});

test('moveTilemap resolves floor collision', () => {
  const map = tilemapFromString(`
    ...
    ###
  `, {
    '.': {},
    '#': { solid: true },
  }, 10);

  const playerBox = aabb(vec2(2, 2), vec2(6, 6));
  const velocity = vec2(0, 100); // moving down
  const result = moveTilemap(playerBox, velocity, map, 0.1); // moves down by 10 units

  assert.equal(result.hit, true);
  assert.equal(result.pos.y, 4); // top of floor (10) minus player height (6)
  assert.equal(result.normal.y, -1);
});

test('moveTilemap resolves wall collision', () => {
  const map = tilemapFromString(`
    .#
    .#
  `, {
    '.': {},
    '#': { solid: true },
  }, 10);

  const playerBox = aabb(vec2(1, 2), vec2(6, 6));
  const velocity = vec2(100, 0); // moving right
  const result = moveTilemap(playerBox, velocity, map, 0.1); // moves right by 10 units

  assert.equal(result.hit, true);
  assert.equal(result.pos.x, 4); // left of wall (10) minus player width (6)
  assert.equal(result.normal.x, -1);
});

