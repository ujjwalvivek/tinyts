// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
    createVerletPoint,
    createVerletStick,
    createVerletRope,
    verletIntegrate,
    verletSolveStick,
    updateVerletRope,
    vec2,
} from "../../index.ts";

test("createVerletPoint stores position and pin state", () => {
    const p = createVerletPoint(10, 20, true);
    assert.equal(p.pos.x, 10);
    assert.equal(p.pos.y, 20);
    assert.equal(p.oldPos.x, 10);
    assert.equal(p.oldPos.y, 20);
    assert.equal(p.pinned, true);
});

test("createVerletPoint defaults to unpinned", () => {
    const p = createVerletPoint(5, 5);
    assert.equal(p.pinned, false);
});

test("createVerletStick calculates rest length from positions", () => {
    const a = createVerletPoint(0, 0);
    const b = createVerletPoint(3, 4);
    const stick = createVerletStick(a, b);
    assert.equal(stick.length, 5); // 3-4-5 triangle
    assert.equal(stick.a, a);
    assert.equal(stick.b, b);
});

test("createVerletStick accepts explicit rest length", () => {
    const a = createVerletPoint(0, 0);
    const b = createVerletPoint(10, 0);
    const stick = createVerletStick(a, b, 8);
    assert.equal(stick.length, 8);
});

test("createVerletRope creates a chain of points and sticks", () => {
    const rope = createVerletRope(0, 100, 5, 20, true);

    assert.equal(rope.points.length, 6); // segments + 1
    assert.equal(rope.sticks.length, 5);

    // First point is pinned
    assert.equal(rope.points[0].pinned, true);

    // Last point is not pinned
    assert.equal(rope.points[5].pinned, false);

    // Points are spaced by segmentLength along X
    assert.equal(rope.points[0].pos.x, 0);
    assert.equal(rope.points[1].pos.x, 20);
    assert.equal(rope.points[5].pos.x, 100);
    assert.equal(rope.points[0].pos.y, 100);
});

test("pinned points do not move on integrate", () => {
    const p = createVerletPoint(50, 50, true);
    const gravity = new vec2(0, 100);

    verletIntegrate(p, gravity, 0.016);
    assert.equal(p.pos.x, 50);
    assert.equal(p.pos.y, 50);
});

test("unpinned points move under gravity on integrate", () => {
    const p = createVerletPoint(50, 50, false);
    const gravity = new vec2(0, 100);

    verletIntegrate(p, gravity, 0.016);
    // With damping 0.999, gravity should pull it down
    assert.ok(p.pos.y > 50);
});

test("verletSolveStick enforces rest length", () => {
    const a = createVerletPoint(0, 0, true); // pinned
    const b = createVerletPoint(10, 0, false); // unpinned
    const stick = createVerletStick(a, b, 5); // rest length = 5

    // Pull b away to 20
    b.pos.set(20, 0);
    verletSolveStick(stick);

    // b should be moved back toward a (stick enforces rest length 5 from a at 0)
    // With one pinned point and 0.5 factor, a single solve moves 50% toward target.
    // dist goes from 20 → 12.5 in one iteration.
    const dist = Math.abs(b.pos.x - a.pos.x);
    assert.ok(dist < 20, `dist=${dist} should be less than initial 20`);
    assert.ok(
        dist > 5,
        `dist=${dist} should be more than rest length 5 (single-ended constraint)`,
    );
    // With multiple iterations it converges to 5; test that it's moving in the right direction
    const expected = 20 - (20 - 5) * 0.5;
    assert.ok(
        Math.abs(dist - expected) < 0.001,
        `dist=${dist} should be ~${expected}`,
    );
    // a should not move (pinned)
    assert.equal(a.pos.x, 0);
});

test("updateVerletRope runs without error and moves points", () => {
    const rope = createVerletRope(0, 0, 3, 10, true);
    const gravity = new vec2(0, 100);

    // Run a few frames
    for (let i = 0; i < 3; i++) {
        updateVerletRope(rope, gravity, 4, 8, 0.016);
    }

    // All unpinned points should have moved
    for (let i = 1; i < rope.points.length; i++) {
        assert.ok(
            rope.points[i].pos.y > 0 || rope.points[i].pos.x !== i * 10,
            `Point ${i} should have moved`,
        );
    }
});
