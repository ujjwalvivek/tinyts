import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aabb,
  aabbOverlap,
  aabbOverlapResult,
  moveAABB,
  vec2,
} from '../../index.ts';

test('aabbOverlap detects intersections but not touching edges', () => {
  assert.equal(
    aabbOverlap(aabb(vec2(0, 0), vec2(10, 10)), aabb(vec2(9, 0), vec2(10, 10))),
    true,
  );
  assert.equal(
    aabbOverlap(aabb(vec2(0, 0), vec2(10, 10)), aabb(vec2(10, 0), vec2(10, 10))),
    false,
  );
});

test('aabbOverlapResult returns the minimum resolution axis', () => {
  const result = aabbOverlapResult(
    aabb(vec2(8, 0), vec2(4, 4)),
    aabb(vec2(10, 0), vec2(4, 4)),
  );

  assert.ok(result);
  assert.deepEqual({ x: result.normal.x, y: result.normal.y }, { x: -1, y: 0 });
  assert.deepEqual({ x: result.overlap.x, y: result.overlap.y }, { x: 2, y: 0 });
});

test('moveAABB resolves horizontal movement against a wall', () => {
  const result = moveAABB(
    aabb(vec2(0, 0), vec2(4, 4)),
    vec2(12, 0),
    [aabb(vec2(10, 0), vec2(4, 4))],
    1,
  );

  assert.equal(result.hit, true);
  assert.equal(result.colliderIndex, 0);
  assert.deepEqual({ x: result.normal.x, y: result.normal.y }, { x: -1, y: 0 });
  assert.deepEqual({ x: result.pos.x, y: result.pos.y }, { x: 6, y: 0 });
});

test('moveAABB uses resolved x position when resolving y', () => {
  const result = moveAABB(
    aabb(vec2(0, 0), vec2(4, 4)),
    vec2(8, 8),
    [aabb(vec2(6, 10), vec2(8, 4))],
    1,
  );

  assert.equal(result.hit, true);
  assert.deepEqual({ x: result.pos.x, y: result.pos.y }, { x: 8, y: 6 });
});
