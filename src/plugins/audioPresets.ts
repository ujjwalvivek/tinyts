import type { SynthOptions } from "../audio/audio";

/**
 * Preset helper functions that return `SynthOptions` configs.
 *
 * Each preset provides production-quality defaults for a common retro sound.
 * Call them and spread in your own overrides:
 *
 *   playSound(jump({ volume: 0.5 }));
 *
 * ── Examples ─────────────────────────────────────────────────────────────────
 *
 *   import { playSound } from "@ujjwalvivek/tinyts";
 *   import * as sfx from "@ujjwalvivek/tinyts/plugins/audioPresets";
 *
 *   // One-shot
 *   playSound(sfx.coin());
 *
 *   // With overrides
 *   playSound(sfx.explosion({ volume: 0.8, pitch: 0.7 }));
 *
 *   // Positional
 *   playSoundAt(sfx.laser(), enemyPos, cameraPos);
 */

// ─── Jump ───────────────────────────────────────────────────────────────────

/** Quick upward pitch sweep - classic platformer jump. */
export function jump(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 260,
        frequencySlide: 520,
        attack: 0.01,
        decay: 0.08,
        sustain: 0,
        release: 0.12,
        volume: 0.25,
        ...overrides,
    };
}

// ─── Coin / Pickup ──────────────────────────────────────────────────────────

/** Bright ascending two-tone chime. */
export function coin(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 880,
        frequencySlide: 1320,
        attack: 0.01,
        decay: 0.05,
        sustain: 0,
        release: 0.15,
        volume: 0.25,
        ...overrides,
    };
}

// ─── Laser / Shoot ──────────────────────────────────────────────────────────

/** Fast descending sweep - laser or gunshot. */
export function laser(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "sawtooth",
        frequency: 800,
        frequencySlide: -600,
        attack: 0.01,
        decay: 0.05,
        sustain: 0,
        release: 0.12,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Hit / Hurt ─────────────────────────────────────────────────────────────

/** Short low thump with sub-ish decay. */
export function hit(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 120,
        frequencySlide: -40,
        attack: 0.01,
        decay: 0.06,
        sustain: 0,
        release: 0.08,
        volume: 0.3,
        ...overrides,
    };
}

// ─── Explosion ──────────────────────────────────────────────────────────────

/** Noise burst with long decay - explosion or crash. */
export function explosion(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "noise",
        frequency: 200,
        frequencySlide: -100,
        attack: 0.03,
        decay: 0.2,
        sustain: 0,
        release: 0.5,
        volume: 0.35,
        ...overrides,
    };
}

// ─── Powerup ────────────────────────────────────────────────────────────────

/** Long ascending sweep with shimmer. */
export function powerup(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 220,
        frequencySlide: 660,
        attack: 0.05,
        decay: 0.15,
        sustain: 0,
        hold: 0.1,
        release: 0.25,
        volume: 0.25,
        ...overrides,
    };
}

// ─── Blip / UI Click ────────────────────────────────────────────────────────

/** Tiny clean tick - menu hover or UI confirm. */
export function blip(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 600,
        attack: 0.01,
        decay: 0.03,
        sustain: 0,
        release: 0.04,
        volume: 0.15,
        ...overrides,
    };
}

// ─── Dash / Whoosh ──────────────────────────────────────────────────────────

/** Quick windy sweep - dash, dodge, or roll. */
export function dash(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "noise",
        frequency: 300,
        frequencySlide: -200,
        attack: 0.01,
        decay: 0.06,
        sustain: 0,
        release: 0.1,
        volume: 0.15,
        ...overrides,
    };
}

// ─── Land ───────────────────────────────────────────────────────────────────

/** Soft thud - landing after a jump. */
export function land(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "triangle",
        frequency: 80,
        frequencySlide: -20,
        attack: 0.01,
        decay: 0.04,
        sustain: 0,
        release: 0.06,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Death ──────────────────────────────────────────────────────────────────

/** Dramatic descending tone - player death or game over. */
export function death(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 400,
        frequencySlide: -300,
        attack: 0.02,
        decay: 0.3,
        sustain: 0.2,
        hold: 0.2,
        release: 0.6,
        volume: 0.3,
        ...overrides,
    };
}

// ─── Bounce ─────────────────────────────────────────────────────────────────

/** Springy pong-like bounce. */
export function bounce(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "sine",
        frequency: 500,
        frequencySlide: -350,
        attack: 0.01,
        decay: 0.04,
        sustain: 0,
        release: 0.08,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Menu Accept ────────────────────────────────────────────────────────────

/** Confirming tone - slightly richer than blip. */
export function menuAccept(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 440,
        frequencySlide: 220,
        attack: 0.01,
        decay: 0.06,
        sustain: 0,
        hold: 0.05,
        release: 0.1,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Menu Cancel ────────────────────────────────────────────────────────────

/** Dismissing tone - short descending blip. */
export function menuCancel(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 440,
        frequencySlide: -220,
        attack: 0.01,
        decay: 0.06,
        sustain: 0,
        release: 0.08,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Enemy Death ────────────────────────────────────────────────────────────

/** Short pop - enemy defeated. */
export function enemyDeath(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "sawtooth",
        frequency: 300,
        frequencySlide: -200,
        attack: 0.01,
        decay: 0.08,
        sustain: 0,
        release: 0.12,
        volume: 0.2,
        ...overrides,
    };
}

// ─── Alarm / Warning ────────────────────────────────────────────────────────

/** Pulsing alert - low health or danger timers (call repeatedly). */
export function alarm(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "square",
        frequency: 880,
        attack: 0.01,
        decay: 0.05,
        sustain: 0,
        release: 0.25,
        volume: 0.3,
        ...overrides,
    };
}

// ─── Teleport ───────────────────────────────────────────────────────────────

/** Ethereal ascending swirl - teleport or warp. */
export function teleport(overrides?: Partial<SynthOptions>): SynthOptions {
    return {
        wave: "sine",
        frequency: 220,
        frequencySlide: 880,
        attack: 0.05,
        decay: 0.15,
        sustain: 0.1,
        hold: 0.1,
        release: 0.4,
        volume: 0.25,
        ...overrides,
    };
}
