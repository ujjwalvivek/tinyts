// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aabb,
  createSpatialGrid,
  vec2,
} from '../../index.ts';

function sorted(set) {
  return [...set].sort((a, b) => a - b);
}

test('spatial grid returns ids overlapping queried cells', () => {
  const grid = createSpatialGrid(10);

  grid.insert(1, aabb(vec2(0, 0), vec2(5, 5)));
  grid.insert(2, aabb(vec2(20, 0), vec2(5, 5)));

  assert.deepEqual(sorted(grid.query(aabb(vec2(4, 4), vec2(2, 2)))), [1]);
  assert.deepEqual(sorted(grid.queryAll()), [1, 2]);
});

test('spatial grid does not include adjacent cells on exact max boundary', () => {
  const grid = createSpatialGrid(10);

  grid.insert(1, aabb(vec2(0, 0), vec2(10, 10)));
  grid.insert(2, aabb(vec2(10, 0), vec2(10, 10)));

  assert.deepEqual(sorted(grid.query(aabb(vec2(0, 0), vec2(10, 10)))), [1]);
  assert.deepEqual(sorted(grid.query(aabb(vec2(10, 0), vec2(10, 10)))), [2]);
});

test('spatial grid clear removes cells and ids', () => {
  const grid = createSpatialGrid(10);
  grid.insert(1, aabb(vec2(0, 0), vec2(5, 5)));
  grid.clear();

  assert.deepEqual(sorted(grid.queryAll()), []);
  assert.deepEqual(sorted(grid.query(aabb(vec2(0, 0), vec2(10, 10)))), []);
});
