// ─── 2-D value noise ─────────────────────────────────────────────────────────
//  Deterministic, fast, and sufficient for procedural terrain, caves, etc.
//  Built-in octave layering (fractal brownian motion) for natural-looking
//  detail at multiple scales.
// ─────────────────────────────────────────────────────────────────────────────

/** Simple integer hash returning a value in [0, 1). */
function hash(x: number, y: number): number {
    let h = (x * 374761393) | 0;
    h = ((h + y * 668265263) | 0) ^ ((h >>> 13) | 0);
    h = ((h * 1274126177) | 0) ^ ((h >>> 16) | 0);
    return (h & 0x7fffffff) / 0x80000000;
}

function smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
}

/** 2D value noise in [0, 1] using smoothstep interpolation. */
export function noise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = smoothstep(fx);
    const sy = smoothstep(fy);

    const n00 = hash(ix, iy);
    const n10 = hash(ix + 1, iy);
    const n01 = hash(ix, iy + 1);
    const n11 = hash(ix + 1, iy + 1);

    const top = n00 + (n10 - n00) * sx;
    const bot = n01 + (n11 - n01) * sx;
    return top + (bot - top) * sy;
}

/**
 * Fractal Brownian Motion noise using layered octaves of 2D noise.
 *
 * @param x - X coordinate.
 * @param y - Y coordinate.
 * @param octaves - Number of octaves.
 * @param lacunarity - Frequency multiplier per octave.
 * @param gain - Amplitude multiplier per octave.
 */
export function fractalNoise2D(
    x: number,
    y: number,
    octaves: number = 4,
    lacunarity: number = 2,
    gain: number = 0.5,
): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += amplitude * noise2D(x * frequency, y * frequency);
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }

    return value / maxValue;
}
