import type { SpriteOptions } from "./types";

// ═════════════════════════════════════════════════════════════════════════════
// Sprite Animation
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for creating a {@link SpriteAnimation}.
 *
 * @example
 * ```ts
 * const config: SpriteAnimationConfig = {
 *   frameWidth: 16,
 *   frameHeight: 16,
 *   frames: [0, 1, 2, 3],
 *   speed: 8,
 *   loop: true,
 * };
 * ```
 */
export interface SpriteAnimationConfig {
    /** Width of a single frame in the sprite sheet, in pixels. */
    frameWidth: number;
    /** Height of a single frame in the sprite sheet, in pixels. */
    frameHeight: number;
    /**
     * Ordered array of frame indices into the sprite sheet.
     * Indices are numbered left-to-right, top-to-bottom starting at 0.
     */
    frames: number[];
    /** Playback speed in frames per second. */
    speed: number;
    /** Whether the animation loops. Defaults to `true`. */
    loop?: boolean;
}

/**
 * Tracks and updates sprite-sheet animation state.
 *
 * Manages frame timing, looping, and generates {@link SpriteOptions} source
 * rectangles suitable for passing directly to `drawSprite()`.
 *
 * @remarks
 * The `update()` method correctly handles large delta times by advancing
 * through multiple frames when necessary (e.g. after a frame hitch).
 *
 * @example
 * ```ts
 * const walkAnim = new SpriteAnimation({
 *   frameWidth: 16,
 *   frameHeight: 16,
 *   frames: [0, 1, 2, 3],
 *   speed: 8,       // 8 FPS
 *   loop: true,
 * });
 *
 * // In your update loop:
 * walkAnim.update(dt);
 *
 * // In your render loop:
 * const opts = walkAnim.getSpriteOptions(spriteSheet.width);
 * drawSprite(spriteSheet, playerPos, vec2(16, 16), opts);
 * ```
 */
export class SpriteAnimation {
    /** Width of a single frame in the sprite sheet, in pixels. */
    readonly frameWidth: number;
    /** Height of a single frame in the sprite sheet, in pixels. */
    readonly frameHeight: number;
    /** Ordered array of frame indices into the sprite sheet. */
    readonly frames: number[];
    /** Playback speed in frames per second. */
    speed: number;
    /** Whether the animation loops back to the first frame after finishing. */
    loop: boolean;

    /** Accumulated time for the current frame (seconds). */
    elapsed: number = 0;
    /** Index into the {@link frames} array (not the frame value itself). */
    currentFrameIndex: number = 0;
    /** `true` once a non-looping animation has played its last frame. */
    done: boolean = false;

    /**
     * Create a new sprite animation.
     * @param config - Animation configuration.
     */
    constructor(config: SpriteAnimationConfig) {
        this.frameWidth = config.frameWidth;
        this.frameHeight = config.frameHeight;
        this.frames = config.frames;
        this.speed = config.speed;
        this.loop = config.loop !== false;
    }

    /**
     * Advance the animation by `dt` seconds.
     *
     * Handles frame skipping correctly - if `dt` is large enough to span
     * multiple frames (e.g. after a hitch), all intermediate frames are
     * consumed so the animation stays in sync with wall-clock time.
     *
     * @param dt - Delta time in seconds since the last update.
     */
    update(dt: number): void {
        if (this.done || this.frames.length === 0) return;

        this.elapsed += dt;
        const frameDuration = 1 / this.speed;

        while (this.elapsed >= frameDuration) {
            this.elapsed -= frameDuration;
            this.currentFrameIndex++;

            if (this.currentFrameIndex >= this.frames.length) {
                if (this.loop) {
                    this.currentFrameIndex = 0;
                } else {
                    this.currentFrameIndex = this.frames.length - 1;
                    this.done = true;
                    this.elapsed = 0;
                    return;
                }
            }
        }
    }

    /**
     * Return the current frame index value from the {@link frames} array.
     *
     * @returns The sprite-sheet frame index for the current animation state.
     */
    getFrame(): number {
        return this.frames[this.currentFrameIndex];
    }

    /**
     * Compute {@link SpriteOptions} source-rectangle fields for the current
     * frame, given the total width of the sprite sheet.
     *
     * The frame index is mapped to a grid position assuming frames are
     * arranged left-to-right, top-to-bottom in the sheet.
     *
     * @param sheetWidth - Total width of the sprite sheet image in pixels.
     * @returns A `SpriteOptions` object with `sourceX`, `sourceY`,
     *          `sourceWidth`, and `sourceHeight` populated.
     *
     * @example
     * ```ts
     * const opts = anim.getSpriteOptions(spriteSheet.width);
     * drawSprite(spriteSheet, pos, size, opts);
     * ```
     */
    getSpriteOptions(sheetWidth: number): SpriteOptions {
        const frame = this.getFrame();
        const cols = Math.floor(sheetWidth / this.frameWidth) || 1;
        const x = (frame % cols) * this.frameWidth;
        const y = Math.floor(frame / cols) * this.frameHeight;
        return {
            sourceX: x,
            sourceY: y,
            sourceWidth: this.frameWidth,
            sourceHeight: this.frameHeight,
        };
    }

    /**
     * Reset the animation to the first frame.
     * Also clears the {@link done} flag for non-looping animations.
     */
    reset(): void {
        this.elapsed = 0;
        this.currentFrameIndex = 0;
        this.done = false;
    }
}
