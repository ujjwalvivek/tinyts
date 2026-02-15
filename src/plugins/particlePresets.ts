import type { EmitterConfig } from "../fx/particles";
import { Vec2 } from "../core/math";

/**
 * Preset helper functions that return partial EmitterConfig objects.
 *
 * Each preset provides production-quality defaults for a common effect.
 * Call them and spread in your own overrides:
 *
 *   system.addEmitter(explosion({ pos: myPos, startColor: '#ff0' }));
 *
 * All presets respect `pos` from the overrides - you must provide it.
 */

// ─── Explosion ──────────────────────────────────────────────────────────────

/** Fiery burst - fast, short-lived, spreads in all directions with additive glow. */
export function explosion(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        count: [20, 35],
        life: [0.2, 0.7],
        speed: [60, 220],
        size: [4, 10],
        sizeEnd: [0, 2],
        startColor: "#ff6622",
        endColor: "#ffcc44",
        damping: 0.88,
        additive: true,
        ...overrides,
    };
}

// ─── Smoke ──────────────────────────────────────────────────────────────────

/** Rising, expanding, fading smoke cloud - soft circles. */
export function smoke(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 6,
        life: [1.0, 2.5],
        speed: [4, 16],
        size: [6, 14],
        sizeEnd: [16, 32],
        shape: "circle",
        startColor: "rgba(180,180,195,0.45)",
        endColor: "rgba(100,100,120,0)",
        gravity: new Vec2(0, -18),
        damping: 0.97,
        ...overrides,
    };
}

// ─── Fire ───────────────────────────────────────────────────────────────────

/** Continuous flame - additive glow, circular particles, fast upward. */
export function fire(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 28,
        life: [0.35, 0.9],
        speed: [40, 100],
        size: [3, 9],
        sizeEnd: [1, 3],
        shape: "circle",
        startColor: "#ff5500",
        endColor: "#ffdd44",
        gravity: new Vec2(0, -70),
        damping: 0.82,
        additive: true,
        ...overrides,
    };
}

// ─── Spark Burst ────────────────────────────────────────────────────────────

/** Fast streaks - metal sparks or magic spray with motion trails. */
export function sparkBurst(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        count: [10, 20],
        life: [0.15, 0.45],
        speed: [120, 300],
        size: [1.5, 3.5],
        sizeEnd: [0, 1],
        shape: "streak",
        startColor: "#ffeeaa",
        endColor: "#ff8800",
        damping: 0.55,
        additive: true,
        ...overrides,
    };
}

// ─── Rain ───────────────────────────────────────────────────────────────────

/** Rain storm - thin vertical streaks, high speed, slight wind spread. */
export function rain(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 60,
        life: [0.8, 2.0],
        speed: [350, 550],
        size: [1.8, 3.5],
        sizeEnd: [1.8, 3.5],
        shape: "streak",
        angle: Math.PI / 2,
        spread: 0.25,
        startColor: "rgba(160,195,255,0.5)",
        endColor: "rgba(160,195,255,0)",
        gravity: new Vec2(8, 250),
        damping: 1,
        ...overrides,
    };
}

// ─── Confetti ───────────────────────────────────────────────────────────────

/** Celebration burst - colorful rotating rects with gravity. */
export function confetti(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        count: [35, 65],
        life: [1.0, 2.5],
        speed: [80, 220],
        size: [3, 7],
        sizeEnd: [3, 7],
        rotation: [0, Math.PI * 2],
        angularVel: [-5, 5],
        startColor: "#ff3366",
        endColor: "#66ff99",
        gravity: new Vec2(0, 80),
        damping: 0.96,
        ...overrides,
    };
}

// ─── Trail ──────────────────────────────────────────────────────────────────

/** Fading soft trail - small circles, narrow spread, for moving objects. */
export function trail(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 24,
        life: [0.25, 0.7],
        speed: [0, 3],
        size: [2, 5],
        sizeEnd: [0, 0],
        shape: "circle",
        spread: 0.25,
        startColor: "rgba(200,220,255,0.5)",
        endColor: "rgba(200,220,255,0)",
        damping: 0.98,
        ...overrides,
    };
}

// ─── Dust / Footsteps ───────────────────────────────────────────────────────

/** Tiny circle puffs kicked up on landing or walking. */
export function dust(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        count: [3, 8],
        life: [0.3, 0.7],
        speed: [8, 28],
        size: [1.5, 4],
        sizeEnd: [3, 7],
        shape: "circle",
        angle: -Math.PI / 2,
        spread: Math.PI,
        startColor: "rgba(190,180,170,0.45)",
        endColor: "rgba(190,180,170,0)",
        gravity: new Vec2(0, 8),
        damping: 0.9,
        ...overrides,
    };
}

// ─── Bubble ─────────────────────────────────────────────────────────────────

/** Rising, transparent circles - underwater effect. */
export function bubble(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 3,
        life: [1.0, 3.0],
        speed: [6, 22],
        size: [2, 7],
        sizeEnd: [3, 9],
        shape: "circle",
        startColor: "rgba(255,255,255,0.35)",
        endColor: "rgba(180,210,255,0)",
        gravity: new Vec2(2, -12),
        damping: 0.98,
        ...overrides,
    };
}

// ─── Portal ─────────────────────────────────────────────────────────────────

/** Swirling magical portal - rotating additive circles, purple/magenta. */
export function portal(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 30,
        life: [0.6, 1.4],
        speed: [20, 60],
        size: [2, 6],
        sizeEnd: [0, 1],
        shape: "circle",
        angularVel: [-3, 3],
        startColor: "#8844ff",
        endColor: "#ff44aa",
        additive: true,
        damping: 0.9,
        ...overrides,
    };
}

// ─── Magic Sparkle ──────────────────────────────────────────────────────────

/** Bright twinkling sparkles - short-lived additive circles, white->color. */
export function magicSparkle(
    overrides?: Partial<EmitterConfig>,
): EmitterConfig {
    return {
        count: [15, 30],
        life: [0.2, 0.6],
        speed: [50, 140],
        size: [1, 3],
        sizeEnd: [0, 0.5],
        shape: "circle",
        startColor: "#ffddff",
        endColor: "#ff66ff",
        additive: true,
        damping: 0.7,
        ...overrides,
    };
}

// ─── Snow ───────────────────────────────────────────────────────────────────

/** Gentle snowfall - soft white circles drifting down with slight wind. */
export function snow(overrides?: Partial<EmitterConfig>): EmitterConfig {
    return {
        rate: 25,
        life: [2.0, 4.0],
        speed: [5, 20],
        size: [1.5, 4],
        sizeEnd: [1.5, 4],
        shape: "circle",
        startColor: "rgba(230,240,255,0.7)",
        endColor: "rgba(230,240,255,0)",
        gravity: new Vec2(3, 25),
        damping: 0.995,
        ...overrides,
    };
}
