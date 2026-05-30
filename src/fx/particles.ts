import { Vec2, vec2, lerp, rand } from "../core/math";
import { Color } from "../render/color";
import {
    drawRect,
    drawCircle,
    drawSprite,
    getContext,
} from "../render/renderer2d";
import { activeEngine } from "../core/engine";

// ─── Particle ──────────────────────────────────────────────────────────────

/** Particle shape type. */
export type ParticleShape = "rect" | "circle" | "streak";

/** State of a single particle. */
export interface Particle {
    /** The parent emitter. */
    emitter: Emitter | null;
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    startSize: number;
    endSize: number;
    rotation: number;
    angularVel: number;
    r: number;
    g: number;
    b: number;
    a: number;
    /** Normalized direction for streak rendering. */
    dirX: number;
    dirY: number;
    /** Whether the particle is active. */
    active: boolean;
}

// ─── Emitter Config ────────────────────────────────────────────────────────

/** Configuration options for a particle emitter. */
export interface EmitterConfig {
    /** Particles emitted per second (0 or omit for burst-only). */
    rate?: number;
    /** Particle shape: 'rect' (default), 'circle', or 'streak' (line along velocity). */
    shape?: ParticleShape;
    /** Burst count, or [min, max] range. */
    count?: number | [number, number];
    /** Particle lifetime range in seconds. */
    life?: [number, number];
    /** Launch speed range in pixels/second. */
    speed?: [number, number];
    /** Start size range in pixels. */
    size?: [number, number];
    /** End size range (after lifetime). */
    sizeEnd?: [number, number];
    /** Base emission direction in radians (default 0). */
    angle?: number;
    /** Arc spread from base angle in radians (default 2pi). */
    spread?: number;
    /** Start rotation range in radians. */
    rotation?: [number, number];
    /** Angular velocity range in radians/second. */
    angularVel?: [number, number];
    /** Start color (hex string or Color). */
    startColor?: string | Color;
    /** End color (particle lerps to this over its life). */
    endColor?: string | Color;
    /** Gravity vector in pixels/s^2. */
    gravity?: Vec2;
    /** Velocity damping per frame at 60Hz (0-1, default 0.95). */
    damping?: number;
    /** Optional sprite for all particles in this emitter. */
    sprite?: CanvasImageSource | null;
    /** Render with additive blending (lighter composite mode). */
    additive?: boolean;
    /** How long the emitter runs in seconds (0 = infinite). */
    duration?: number;
    /** When true, duration-based emitters restart on expiry. */
    loop?: boolean;
    /** Seconds to simulate on addEmitter so continuous effects look filled-in. */
    prewarm?: number;
    /** Static position or getter function for attached emitters. */
    pos?: Vec2 | (() => Vec2);
    /** Called every frame per live particle. */
    onParticleUpdate?: (p: Particle, dt: number) => void;
    /** Called when emitter is fully done (all particles dead). */
    onComplete?: () => void;
}

// ─── Emitter ───────────────────────────────────────────────────────────────

/** Emitter that spawns particles based on a config. */
export class Emitter {
    /** Current world position. */
    readonly pos = new Vec2(0, 0);
    /** Seconds since emitter was created. */
    elapsed = 0;
    /** Whether the emitter is still spawning new particles. */
    alive = true;
    /** Whether the emitter is fully finished (all particles dead). */
    done = false;
    /** @internal active particle count */
    _activeCount = 0;
    /** @internal fractional spawn accumulator */
    _spawnAccum = 0;
    /** @internal resolved start color as float quad */
    _sc: [number, number, number, number] = [1, 1, 1, 1];
    /** @internal resolved end color as float quad */
    _ec: [number, number, number, number] = [0.5, 0.5, 0.5, 1];

    constructor(readonly config: EmitterConfig) {
        this._syncPos();
        const sc = resolveColor(config.startColor, "#fff");
        const ec = resolveColor(config.endColor, "#888");
        this._sc = [sc.r, sc.g, sc.b, sc.a];
        this._ec = [ec.r, ec.g, ec.b, ec.a];
    }

    /** Stop spawning new particles (existing ones fade naturally). */
    stop(): void {
        this.alive = false;
    }

    /** Immediately kill all particles and mark as done. */
    kill(): void {
        this.alive = false;
        this.done = true;
    }

    _syncPos(): void {
        const p = this.config.pos;
        if (!p) return;
        if (p instanceof Vec2) {
            this.pos.set(p.x, p.y);
        } else {
            const v = p();
            this.pos.set(v.x, v.y);
        }
    }
}

// ─── ParticleSystem ─────────────────────────────────────────────────────────

/** Manages emitters and particle pooling. */
export class ParticleSystem {
    /** Shared particle pool. */
    readonly pool: Particle[] = [];
    /** Active emitters. */
    readonly emitters: Emitter[] = [];

    private _rPos = new Vec2(0, 0);
    private _rSize = new Vec2(0, 0);
    private _rColor = new Color(1, 1, 1, 1);

    /** Free-list of indices of inactive particles in the pool. */
    private _freeList: number[] = [];

    // ── Pool ──────────────────────────────────────────────────────────

    private _alloc(): Particle {
        // Reuse an inactive particle via free-list (O(1))
        const idx = this._freeList.pop();
        if (idx !== undefined) return this.pool[idx];

        // No inactive particles — create a new one
        const p: Particle = {
            emitter: null,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            life: 0,
            maxLife: 0,
            size: 0,
            startSize: 0,
            endSize: 0,
            rotation: 0,
            angularVel: 0,
            r: 1,
            g: 1,
            b: 1,
            a: 1,
            dirX: 0,
            dirY: 0,
            active: false,
        };
        this.pool.push(p);
        return p;
    }

    // ── Emitter Management ────────────────────────────────────────────

    /** Register and start a new emitter. */
    addEmitter(config: EmitterConfig): Emitter {
        const e = new Emitter(config);
        this.emitters.push(e);

        // Burst emission (always happens once on creation)
        const rate = config.rate ?? 0;
        if (rate > 0 || config.count !== undefined) {
            this._burst(e);
        } else {
            // Default: emit 1 particle if no count specified
            this._spawn(e);
        }

        // Pure burst: stop spawning immediately
        if (rate <= 0) {
            e.alive = false;
        }

        // Prewarm
        if (config.prewarm && config.prewarm > 0) {
            const step = 1 / 60;
            let t = 0;
            while (t < config.prewarm) {
                this._emitStep(e, step);
                this._tick(step, true);
                this._sweep();
                t += step;
            }
        }

        return e;
    }

    /** Remove an emitter and kill all its particles. */
    removeEmitter(e: Emitter): void {
        e.kill();
        for (let i = 0; i < this.pool.length; i++) {
            const p = this.pool[i];
            if (p.emitter === e && p.active) {
                p.active = false;
                p.emitter = null;
                this._freeList.push(i);
            }
        }
        e._activeCount = 0;
        this._sweep();
    }

    // ── Update / Tick ─────────────────────────────────────────────────

    /** Advance the particle simulation by dt seconds. */
    update(dt: number): void {
        for (const e of this.emitters) {
            if (e.done) continue;
            e._syncPos();
            this._emitStep(e, dt);
        }
        this._tick(dt, false);
        this._sweep();
    }

    /** Render all active particles. */
    render(): void {
        const ctx = getContext() as any;
        // Check for Canvas2D context (has save/restore)
        const isCanvas2D = ctx && typeof ctx.save === "function";

        if (isCanvas2D) {
            this._renderCanvas2D(ctx as CanvasRenderingContext2D);
        } else {
            this._renderBasic();
        }
    }

    private _renderCanvas2D(ctx: CanvasRenderingContext2D): void {
        let lastAdditive: boolean | null = null;

        for (const p of this.pool) {
            if (!p.active) continue;

            const additive = p.emitter?.config.additive ?? false;
            if (additive !== lastAdditive) {
                ctx.globalCompositeOperation = additive
                    ? "lighter"
                    : "source-over";
                lastAdditive = additive;
            }

            this._rColor.set(p.r, p.g, p.b, p.a);
            const colorStr = this._rColor.toRGBA();

            const shape = p.emitter?.config.shape ?? "rect";
            const hasSprite = !!p.emitter?.config.sprite;

            if (hasSprite) {
                // Sprite rendering - use renderer API for the sprite
                this._rColor.set(p.r, p.g, p.b, p.a);

                // If rotated, use direct canvas
                if (p.rotation !== 0) {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    const half = p.size / 2;
                    const spr = p.emitter!.config.sprite!;
                    ctx.globalAlpha = p.a;
                    ctx.drawImage(spr, -half, -half, p.size, p.size);
                    ctx.globalAlpha = 1;
                    ctx.restore();
                } else {
                    const half = p.size / 2;
                    this._rPos.set(p.x - half, p.y - half);
                    this._rSize.set(p.size, p.size);
                    drawSprite(
                        p.emitter!.config.sprite!,
                        this._rPos,
                        this._rSize,
                    );
                }
            } else if (shape === "circle") {
                ctx.fillStyle = colorStr;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
                ctx.fill();
            } else if (shape === "streak") {
                // Elongated streak along initial direction
                const len = p.size * 3;
                const w = Math.max(0.5, p.size * 0.22);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(Math.atan2(p.dirY, p.dirX));
                ctx.fillStyle = colorStr;
                ctx.fillRect(-len / 2, -w / 2, len, w);
                ctx.restore();
            } else {
                // Rect shape
                const half = p.size / 2;
                if (p.rotation !== 0) {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.fillStyle = colorStr;
                    ctx.fillRect(-half, -half, p.size, p.size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = colorStr;
                    ctx.fillRect(p.x - half, p.y - half, p.size, p.size);
                }
            }
        }

        if (lastAdditive) {
            ctx.globalCompositeOperation = "source-over";
        }
    }

    /** Fallback for WebGL - basic rendering without rotation or shape extras. */
    private _renderBasic(): void {
        for (const p of this.pool) {
            if (!p.active) continue;

            const half = p.size / 2;
            this._rPos.set(p.x - half, p.y - half);
            this._rSize.set(p.size, p.size);
            this._rColor.set(p.r, p.g, p.b, p.a);

            if (p.emitter?.config.sprite) {
                drawSprite(p.emitter.config.sprite, this._rPos, this._rSize);
            } else if (p.emitter?.config.shape === "circle") {
                drawCircle(this._rPos, half, this._rColor);
            } else {
                drawRect(this._rPos, this._rSize, this._rColor);
            }
        }
    }

    /** Immediately kill all emitters and particles. */
    clear(): void {
        this._freeList.length = 0;
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].active = false;
            this.pool[i].emitter = null;
            this._freeList.push(i);
        }
        for (const e of this.emitters) {
            e._activeCount = 0;
        }
        this.emitters.length = 0;
    }

    /** Current number of active particles. */
    get count(): number {
        let n = 0;
        for (const p of this.pool) {
            if (p.active) n++;
        }
        return n;
    }

    // ── Private: Emission ─────────────────────────────────────────────

    private _burst(e: Emitter): void {
        const cfg = e.config;
        let n: number;
        if (cfg.count === undefined) {
            n = 1;
        } else if (Array.isArray(cfg.count)) {
            n = Math.max(0, Math.round(rand(cfg.count[0], cfg.count[1])));
        } else {
            n = cfg.count;
        }
        for (let i = 0; i < n; i++) this._spawn(e);
    }

    private _emitStep(e: Emitter, dt: number): void {
        if (!e.alive) return;
        const rate = e.config.rate ?? 0;
        if (rate > 0) {
            e._spawnAccum += rate * dt;
            while (e._spawnAccum >= 1) {
                this._spawn(e);
                e._spawnAccum -= 1;
            }
        }
        e.elapsed += dt;
        const dur = e.config.duration ?? 0;
        if (dur > 0 && e.elapsed >= dur) {
            if (e.config.loop) {
                e.elapsed = 0;
                if (e.config.count !== undefined) this._burst(e);
            } else {
                e.alive = false;
            }
        }
    }

    private _spawn(e: Emitter): void {
        const p = this._alloc();
        const cfg = e.config;

        p.emitter = e;
        e._activeCount++;

        // Lifetime
        const life = cfg.life ?? [0.2, 0.6];
        p.maxLife = rand(life[0], life[1]);
        p.life = p.maxLife;

        // Position
        p.x = e.pos.x;
        p.y = e.pos.y;

        // Velocity
        const speed = cfg.speed ?? [20, 60];
        const spd = rand(speed[0], speed[1]);
        const aBase = cfg.angle ?? 0;
        const aSpread = cfg.spread ?? Math.PI * 2;
        const angle = aBase + rand(-aSpread / 2, aSpread / 2);
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;

        // Size
        const size = cfg.size ?? [2, 6];
        p.startSize = rand(size[0], size[1]);
        const sizeEnd = cfg.sizeEnd ?? [p.startSize * 0.1, p.startSize * 0.1];
        p.endSize = rand(sizeEnd[0], sizeEnd[1]);
        p.size = p.startSize;

        // Rotation
        p.rotation = cfg.rotation ? rand(cfg.rotation[0], cfg.rotation[1]) : 0;
        p.angularVel = cfg.angularVel
            ? rand(cfg.angularVel[0], cfg.angularVel[1])
            : 0;

        // Streak direction (from initial velocity)
        if (cfg.shape === "streak") {
            const slen = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1;
            p.dirX = p.vx / slen;
            p.dirY = p.vy / slen;
        } else {
            p.dirX = 0;
            p.dirY = 0;
        }

        // Color (start)
        p.r = e._sc[0];
        p.g = e._sc[1];
        p.b = e._sc[2];
        p.a = e._sc[3];
        p.active = true;
    }

    // ── Private: Physics Tick ─────────────────────────────────────────

    private _tick(dt: number, _prewarming: boolean): void {
        for (let i = this.pool.length - 1; i >= 0; i--) {
            const p = this.pool[i];
            if (!p.active) continue;
            if (!p.emitter) {
                p.active = false;
                this._freeList.push(i);
                continue;
            }

            p.life -= dt;
            if (p.life <= 0) {
                p.active = false;
                p.emitter._activeCount--;
                p.emitter = null;
                this._freeList.push(i);
                continue;
            }

            const t = 1 - p.life / p.maxLife; // 0 → 1 over particle lifespan

            // Gravity
            const g = p.emitter.config.gravity;
            if (g) {
                p.vx += g.x * dt;
                p.vy += g.y * dt;
            }

            // Damping (framerate-independent - matches old 60Hz fixed-step behavior)
            const damp = p.emitter.config.damping ?? 0.95;
            const df = Math.pow(damp, dt * 60);
            p.vx *= df;
            p.vy *= df;

            // Integrate position
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Size
            p.size = lerp(p.startSize, p.endSize, t);

            // Rotation
            p.rotation += p.angularVel * dt;

            // Color interpolation
            const sc = p.emitter._sc;
            const ec = p.emitter._ec;
            p.r = sc[0] + (ec[0] - sc[0]) * t;
            p.g = sc[1] + (ec[1] - sc[1]) * t;
            p.b = sc[2] + (ec[2] - sc[2]) * t;
            p.a = sc[3] + (ec[3] - sc[3]) * t;

            // User callback
            p.emitter.config.onParticleUpdate?.(p, dt);
        }
    }

    // ── Private: Sweep done emitters ──────────────────────────────────

    private _sweep(): void {
        for (let i = this.emitters.length - 1; i >= 0; i--) {
            const e = this.emitters[i];
            if (e.done || (!e.alive && e._activeCount <= 0)) {
                if (!e.done) {
                    e.done = true;
                    e.config.onComplete?.();
                }
                this.emitters.splice(i, 1);
            }
        }
    }
}

// ─── Color Resolution ───────────────────────────────────────────────────────

function resolveColor(
    c: string | Color | undefined,
    fallback: string,
): { r: number; g: number; b: number; a: number } {
    if (!c) return parseHex(fallback);
    if (typeof c === "string") return parseHex(c);
    return { r: c.r, g: c.g, b: c.b, a: c.a };
}

function parseHex(hex: string): { r: number; g: number; b: number; a: number } {
    const c = Color.fromHex(hex);
    return { r: c.r, g: c.g, b: c.b, a: c.a };
}

// ═════════════════════════════════════════════════════════════════════════════
// Backward-Compatible API (maps to engine's particle system singleton)
// ═════════════════════════════════════════════════════════════════════════════

/** Parameters for emitting particles. */
export interface EmitParams {
    /** Emission position. */
    pos: Vec2;
    /** Number of particles to emit. */
    count?: number;
    /** Lifetime range in seconds. */
    life?: [number, number];
    /** Speed range. */
    speed?: [number, number];
    /** Start size range. */
    size?: [number, number];
    /** Emission angle range. */
    angle?: [number, number];
    /** Start and end colors. */
    color?: [string, string];
    /** Gravity force. */
    gravity?: number;
    /** Damping factor. */
    damping?: number;
    /** Whether to use additive blending. */
    additive?: boolean;
    /** End size range. */
    sizeEnd?: [number, number];
    /** Optional sprite. */
    sprite?: CanvasImageSource;
}

/** Emit particles with the given parameters. */
export function emitParticles(params: EmitParams): void {
    const system = activeEngine?.particleSystem;
    if (!system) return;
    const angleRange = params.angle ?? [0, Math.PI * 2];
    const config: EmitterConfig = {
        count: params.count ?? 16,
        life: params.life,
        speed: params.speed,
        size: params.size,
        sizeEnd: params.sizeEnd,
        angle: (angleRange[0] + angleRange[1]) / 2,
        spread: angleRange[1] - angleRange[0],
        startColor: params.color?.[0],
        endColor: params.color?.[1],
        gravity:
            params.gravity !== undefined ? vec2(0, params.gravity) : undefined,
        damping: params.damping,
        additive: params.additive,
        sprite: params.sprite,
        pos: params.pos,
    };
    system.addEmitter(config);
}

/** Update active particles. */
export function updateParticles(dt: number): void {
    activeEngine?.particleSystem.update(dt);
}

/** Render active particles. */
export function renderParticles(): void {
    activeEngine?.particleSystem.render();
}

/** Clear all active particles. */
export function clearParticles(): void {
    activeEngine?.particleSystem.clear();
}

/** Get the count of active particles. */
export function getActiveParticleCount(): number {
    return activeEngine?.particleSystem.count ?? 0;
}
