import test from "node:test";
import assert from "node:assert/strict";

import {
    Color,
    clamp,
    createCamera,
    hsl,
    lerp,
    mapRange,
    rect,
    rgb,
    vec2,
} from "../../../dist/tinyts.esm.js";

test("vec2 mutating operations are chainable and predictable", () => {
    const v = vec2(3, 4);

    assert.equal(v.length(), 5);
    assert.equal(v.lengthSquared(), 25);
    assert.equal(v.normalize(), v);
    assert.equal(Math.round(v.length() * 1e6) / 1e6, 1);

    v.set(1, 2).add(vec2(3, 4)).subtract(vec2(1, 1)).scale(2);
    assert.deepEqual({ x: v.x, y: v.y }, { x: 6, y: 10 });
    assert.deepEqual(rect(1, 2, 3, 4), { x: 1, y: 2, w: 3, h: 4 });
});

test("scalar helpers cover common mapping operations", () => {
    assert.equal(clamp(10, 0, 5), 5);
    assert.equal(clamp(-2, 0, 5), 0);
    assert.equal(lerp(10, 20, 0.25), 12.5);
    assert.equal(mapRange(5, 0, 10, 0, 100), 50);
});

test("Color parses and serializes hex and rgba values", () => {
    assert.equal(Color.fromHex("#abc").toHex(), "#aabbcc");
    assert.equal(
        Color.fromHex("#33669980").toRGBA(),
        "rgba(51,102,153,0.5019607843137255)",
    );
    assert.equal(rgb(255, 128, 0).toHex(), "#ff8000");
    assert.equal(rgb(255, 0, 0, 0.5).toString(), "rgba(255,0,0,0.5)");
});

test("HSL helpers use fractional and percentage APIs correctly", () => {
    assert.equal(Color.fromHSL(0, 1, 0.5).toHex(), "#ff0000");
    assert.equal(hsl(120, 100, 50).toHex(), "#00ff00");
});

test("camera centers on bounds smaller than the visible view", () => {
    const camera = createCamera({
        size: vec2(1280, 720),
        zoom: 2,
        bounds: { pos: vec2(0, 0), size: vec2(240, 120) },
    });

    camera.pos.set(1000, 1000);
    camera.update(1 / 60);

    assert.deepEqual({ x: camera.pos.x, y: camera.pos.y }, { x: 120, y: 60 });
});
