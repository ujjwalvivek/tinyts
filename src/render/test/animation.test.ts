import test from 'node:test';
import assert from 'node:assert/strict';

import { SpriteAnimation } from '../../index.ts';

test('SpriteAnimation loops and updates frames correctly', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1, 2],
    speed: 10, // 10 FPS → 0.1s per frame
    loop: true,
  });

  assert.equal(anim.getFrame(), 0);
  anim.update(0.05);
  assert.equal(anim.getFrame(), 0); // not enough time

  anim.update(0.06); // total 0.11s → frame 1
  assert.equal(anim.getFrame(), 1);

  anim.update(0.1); // total 0.21s → frame 2
  assert.equal(anim.getFrame(), 2);

  anim.update(0.1); // total 0.31s → wraps to frame 0
  assert.equal(anim.getFrame(), 0);
  assert.equal(anim.done, false);
});

test('SpriteAnimation with loop false stops at last frame', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1],
    speed: 10,
    loop: false,
  });

  assert.equal(anim.getFrame(), 0);
  anim.update(0.11); // → frame 1
  assert.equal(anim.getFrame(), 1);
  assert.equal(anim.done, false);

  anim.update(0.1); // past end → clamp at frame 1, done
  assert.equal(anim.getFrame(), 1);
  assert.equal(anim.done, true);

  // further updates are no-ops
  anim.update(1.0);
  assert.equal(anim.getFrame(), 1);
  assert.equal(anim.done, true);
});

test('SpriteAnimation handles large dt by skipping frames', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1, 2, 3, 4],
    speed: 10, // 0.1s per frame
    loop: true,
  });

  // A single 0.35s update should skip past frames 0→1→2 and land on 3
  anim.update(0.35);
  assert.equal(anim.getFrame(), 3);
});

test('SpriteAnimation large dt stops correctly for non-looping', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1, 2],
    speed: 10,
    loop: false,
  });

  // dt large enough to blow past all frames
  anim.update(5.0);
  assert.equal(anim.getFrame(), 2); // clamped at last
  assert.equal(anim.done, true);
});

test('SpriteAnimation calculates sprite options source rect correctly', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [2],
    speed: 10,
  });

  // sheetWidth 32 → 2 columns
  // frame 2: col = 2 % 2 = 0, row = floor(2/2) = 1
  // sourceX = 0, sourceY = 16
  const opts = anim.getSpriteOptions(32);
  assert.deepEqual(opts, {
    sourceX: 0,
    sourceY: 16,
    sourceWidth: 16,
    sourceHeight: 16,
  });
});

test('SpriteAnimation reset clears state', () => {
  const anim = new SpriteAnimation({
    frameWidth: 16,
    frameHeight: 16,
    frames: [0, 1],
    speed: 10,
    loop: false,
  });

  anim.update(0.5); // blow past end
  assert.equal(anim.done, true);
  assert.equal(anim.getFrame(), 1);

  anim.reset();
  assert.equal(anim.done, false);
  assert.equal(anim.elapsed, 0);
  assert.equal(anim.getFrame(), 0);
});
