// @ts-nocheck
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addTween,
  clearTweens,
  linear,
  quadIn,
  quadOut,
  tween,
  updateTweens,
} from '../../index.ts';

test('basic easing functions preserve endpoints', () => {
  for (const easing of [linear, quadIn, quadOut]) {
    assert.equal(easing(0), 0);
    assert.equal(easing(1), 1);
  }
});

test('tween interpolates values and completes once', () => {
  const updates = [];
  let completed = 0;
  const t = tween({
    from: { x: 0 },
    to: { x: 10 },
    duration: 1,
    easing: linear,
    onUpdate(values) {
      updates.push(values.x);
    },
    onComplete() {
      completed++;
    },
  });

  t.update(0.25);
  t.update(0.25);
  t.update(0.5);
  t.update(1);

  assert.deepEqual(updates, [2.5, 5, 10]);
  assert.equal(t.done, true);
  assert.equal(completed, 1);
});

test('tween manager removes completed tweens', () => {
  clearTweens();

  let completed = 0;
  addTween({
    from: { x: 0 },
    to: { x: 1 },
    duration: 0.5,
    easing: linear,
    onComplete() {
      completed++;
    },
  });

  updateTweens(0.5);
  updateTweens(0.5);

  assert.equal(completed, 1);
  clearTweens();
});
