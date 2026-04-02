import test from "node:test";
import assert from "node:assert/strict";

import { Timer, engineStart, engineStop } from "../../../dist/tinyts.esm.js";

// Create a minimal engine so Timer's engine-time mode has something to reference
test.before(() => {
    if (typeof globalThis.window === "undefined") {
        // Minimal DOM shim for Timer that uses performance.now
        // Timer already handles this through its fallback
    }
});

test("Timer starts at zero elapsed time", () => {
    const t = new Timer(false); // wall-clock mode
    const elapsed = t.elapsed();
    assert.ok(elapsed >= 0);
    assert.ok(elapsed < 0.1);
});

test("Timer elapsed increases after time passes", async () => {
    const t = new Timer(false);
    const before = t.elapsed();

    await new Promise((r) => setTimeout(r, 20));

    const after = t.elapsed();
    assert.ok(after > before, `after=${after} should be > before=${before}`);
});

test("Timer done returns false before duration, true after", async () => {
    const t = new Timer(false);
    assert.equal(t.done(0.5), false);

    await new Promise((r) => setTimeout(r, 60));

    assert.equal(t.done(0.05), true);
});

test("Timer reset sets elapsed back to 0", () => {
    const t = new Timer(false);
    t.elapsed(); // ensure any init path covered
    t.reset();
    assert.ok(t.elapsed() < 0.01);
});

test("Timer pause freezes elapsed time", async () => {
    const t = new Timer(false);
    await new Promise((r) => setTimeout(r, 20));
    const beforePause = t.elapsed();

    t.pause();
    assert.equal(t.isPaused(), true);

    await new Promise((r) => setTimeout(r, 30));

    const afterPause = t.elapsed();
    // Should be very close to beforePause (not advancing by 30ms)
    assert.ok(
        Math.abs(afterPause - beforePause) < 0.02,
        `afterPause=${afterPause} should be close to beforePause=${beforePause}`,
    );
});

test("Timer resume continues from paused offset", async () => {
    const t = new Timer(false);
    t.pause();
    t.resume();
    assert.equal(t.isPaused(), false);
    // Should continue advancing
    assert.ok(t.elapsed() >= 0);
});

test("Timer progress returns fraction in [0, 1]", () => {
    const t = new Timer(false);
    const p = t.progress(10);
    assert.ok(p >= 0 && p <= 1);
});

test("Timer remaining returns seconds left", () => {
    const t = new Timer(false);
    const rem = t.remaining(10);
    assert.ok(rem > 0 && rem <= 10);
});

test("Timer remaining returns 0 when done", () => {
    const t = new Timer(false);
    assert.equal(t.remaining(0), 0);
});

test("Timer elapsedMs returns milliseconds", () => {
    const t = new Timer(false);
    const ms = t.elapsedMs();
    assert.ok(ms >= 0);
    assert.ok(ms < 100);
});
