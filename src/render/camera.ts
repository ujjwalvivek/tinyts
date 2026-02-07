import { Vec2, clamp } from "../core/math";
import { setRenderTransform, resetRenderTransform } from "./renderer2d";

/** Initial configuration for a Camera. */
export interface CameraConfig {
    /** Camera center position in world space. */
    pos?: Vec2;
    /** Viewport size in logical pixels. */
    size?: Vec2;
    /** Camera zoom level. */
    zoom?: number;
    /** Camera rotation angle in radians. */
    rotation?: number;
    /** World-space AABB the camera is clamped to. */
    bounds?: { pos: Vec2; size: Vec2 };
}

/** 2D camera with follow, deadzone, shake, and world-bounds clamping. */
export class Camera {
    /** Camera center position. */
    pos: Vec2;
    /** Viewport size in pixels. */
    size: Vec2;
    /** Camera zoom level. */
    zoom: number;
    /** Camera rotation in radians. */
    rotation: number;
    /** World-space boundary constraint. */
    bounds: { pos: Vec2; size: Vec2 } | null;

    private followTarget: Vec2 | { x: number; y: number } | null = null;
    private deadZone: Vec2;
    private lookahead: Vec2;
    private followSpeed: number;

    private shakeOffset: Vec2;
    private shakeIntensity: number;
    private shakeTime: number;

    /**
     * Create a 2D camera.
     * @param config - Initial configuration.
     */
    constructor(config: CameraConfig = {}) {
        this.pos = config.pos?.clone() ?? new Vec2(0, 0);
        this.size = config.size?.clone() ?? new Vec2(640, 360);
        this.zoom = config.zoom ?? 1;
        this.rotation = config.rotation ?? 0;
        this.bounds = config.bounds ?? null;

        this.deadZone = new Vec2(0, 0);
        this.lookahead = new Vec2(0, 0);
        this.followSpeed = 1;

        this.shakeOffset = new Vec2(0, 0);
        this.shakeIntensity = 0;
        this.shakeTime = 0;

        this.followTarget = null;
    }

    /**
     * Follow a target position each frame.
     * @param target - Object with x,y to track.
     * @param options - Follow options (deadzone, lookahead, speed).
     */
    follow(
        target: Vec2 | { x: number; y: number },
        options?: {
            deadZone?: Vec2;
            lookahead?: Vec2;
            speed?: number;
        },
    ): void {
        this.followTarget = target;
        if (options?.deadZone) this.deadZone = options.deadZone.clone();
        if (options?.lookahead) this.lookahead = options.lookahead.clone();
        if (options?.speed) this.followSpeed = options.speed;
    }

    /** Stop following the current target. */
    stopFollow(): void {
        this.followTarget = null;
    }

    /** Trigger a screen shake with the given pixel intensity (lasts 0.25s). */
    shake(intensity: number): void {
        this.shakeIntensity = intensity;
        this.shakeTime = 0.25;
    }

    /** Advance follow, shake, and bounds clamping by dt seconds. */
    update(dt: number): void {
        if (this.followTarget) {
            const target = new Vec2(this.followTarget.x, this.followTarget.y);
            target.x += this.lookahead.x;
            target.y += this.lookahead.y;

            const dx = target.x - this.pos.x;
            const dy = target.y - this.pos.y;

            if (Math.abs(dx) > this.deadZone.x) {
                this.pos.x +=
                    (dx - Math.sign(dx) * this.deadZone.x) *
                    this.followSpeed *
                    dt;
            }
            if (Math.abs(dy) > this.deadZone.y) {
                this.pos.y +=
                    (dy - Math.sign(dy) * this.deadZone.y) *
                    this.followSpeed *
                    dt;
            }
        }

        if (this.shakeIntensity > 0) {
            this.shakeTime -= dt;
            if (this.shakeTime <= 0) {
                this.shakeIntensity = 0;
                this.shakeOffset.set(0, 0);
            } else {
                this.shakeOffset.set(
                    (Math.random() - 0.5) * 2 * this.shakeIntensity,
                    (Math.random() - 0.5) * 2 * this.shakeIntensity,
                );
            }
        }

        if (this.bounds) {
            const halfW = this.size.x / (2 * this.zoom);
            const halfH = this.size.y / (2 * this.zoom);
            const minX = this.bounds.pos.x + halfW;
            const maxX = this.bounds.pos.x + this.bounds.size.x - halfW;
            const minY = this.bounds.pos.y + halfH;
            const maxY = this.bounds.pos.y + this.bounds.size.y - halfH;
            this.pos.x =
                minX <= maxX
                    ? clamp(this.pos.x, minX, maxX)
                    : this.bounds.pos.x + this.bounds.size.x / 2;
            this.pos.y =
                minY <= maxY
                    ? clamp(this.pos.y, minY, maxY)
                    : this.bounds.pos.y + this.bounds.size.y / 2;
        }
    }

    /** Push the camera transform onto the renderer. Call before drawing world objects. */
    apply(): void {
        const p = new Vec2(
            this.pos.x - this.shakeOffset.x,
            this.pos.y - this.shakeOffset.y,
        );
        setRenderTransform(p, this.zoom);
    }

    /** Pop the camera transform. Call after drawing world objects. */
    end(): void {
        resetRenderTransform();
    }

    /** Convert a world-space position to screen-space. */
    worldToScreen(worldPos: Vec2): Vec2 {
        return new Vec2(
            (worldPos.x - this.pos.x + this.shakeOffset.x) * this.zoom +
                this.size.x / 2,
            (worldPos.y - this.pos.y + this.shakeOffset.y) * this.zoom +
                this.size.y / 2,
        );
    }

    /** Convert a screen-space position to world-space. */
    screenToWorld(screenPos: Vec2): Vec2 {
        return new Vec2(
            (screenPos.x - this.size.x / 2) / this.zoom -
                this.shakeOffset.x +
                this.pos.x,
            (screenPos.y - this.size.y / 2) / this.zoom -
                this.shakeOffset.y +
                this.pos.y,
        );
    }

    /** Alias for {@link worldToScreen}. */
    applyToPos(worldPos: Vec2): Vec2 {
        return this.worldToScreen(worldPos);
    }

    /** Create a deep copy of this camera. */
    clone(): Camera {
        const c = new Camera({
            pos: this.pos.clone(),
            size: this.size.clone(),
            zoom: this.zoom,
            rotation: this.rotation,
            bounds: this.bounds
                ? {
                      pos: this.bounds.pos.clone(),
                      size: this.bounds.size.clone(),
                  }
                : undefined,
        });
        c.deadZone = this.deadZone.clone();
        c.lookahead = this.lookahead.clone();
        return c;
    }
}

/** Factory function to create a new Camera. */
export function createCamera(config?: CameraConfig): Camera {
    return new Camera(config);
}
