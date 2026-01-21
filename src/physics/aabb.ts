import { Vec2 } from "../core/math";

/** 2D axis-aligned bounding box. */
export interface AABB {
    /** Top-left position. */
    pos: Vec2;
    /** Size. */
    size: Vec2;
}

/** Create an AABB. */
export function aabb(pos: Vec2, size: Vec2): AABB {
    return { pos, size };
}

/** Check if two AABBs overlap. */
export function aabbOverlap(a: AABB, b: AABB): boolean {
    return (
        a.pos.x < b.pos.x + b.size.x &&
        a.pos.x + a.size.x > b.pos.x &&
        a.pos.y < b.pos.y + b.size.y &&
        a.pos.y + a.size.y > b.pos.y
    );
}

/** Overlap information. */
export interface OverlapResult {
    /** Overlap vector. */
    overlap: Vec2;
    /** Surface normal pointing away from the overlap. */
    normal: Vec2;
}

/** Calculate the overlap between two AABBs. */
export function aabbOverlapResult(a: AABB, b: AABB): OverlapResult | null {
    if (!aabbOverlap(a, b)) return null;

    const dx1 = b.pos.x + b.size.x - a.pos.x;
    const dx2 = a.pos.x + a.size.x - b.pos.x;
    const dy1 = b.pos.y + b.size.y - a.pos.y;
    const dy2 = a.pos.y + a.size.y - b.pos.y;

    let minOverlap = dx1;
    let normalX = 1;
    let normalY = 0;

    if (dx2 < minOverlap) {
        minOverlap = dx2;
        normalX = -1;
        normalY = 0;
    }
    if (dy1 < minOverlap) {
        minOverlap = dy1;
        normalX = 0;
        normalY = 1;
    }
    if (dy2 < minOverlap) {
        minOverlap = dy2;
        normalX = 0;
        normalY = -1;
    }

    return {
        overlap: new Vec2(
            normalX !== 0 ? minOverlap : 0,
            normalY !== 0 ? minOverlap : 0,
        ),
        normal: new Vec2(normalX, normalY),
    };
}

/** Check if a point is inside an AABB. */
export function pointInRect(point: Vec2, r: AABB): boolean {
    return (
        point.x >= r.pos.x &&
        point.x <= r.pos.x + r.size.x &&
        point.y >= r.pos.y &&
        point.y <= r.pos.y + r.size.y
    );
}

// ─── Result types ────────────────────────────────────────────────────────────

/** Result of moving an AABB. */
export interface MoveResult {
    /** Final position. */
    pos: Vec2;
    /** Corrected velocity. */
    velocity: Vec2;
    /** True if a collision occurred. */
    hit: boolean;
    /** Surface normal at contact. */
    normal: Vec2;
    /** Index of the collider hit. */
    colliderIndex: number;
    /** Touching flags for each side. */
    touching: {
        left: boolean;
        right: boolean;
        top: boolean;
        bottom: boolean;
    };
}

/** Result of a swept collision test. */
export interface SweepResult {
    /** Time of first impact in [0, 1]. */
    t: number;
    /** Surface normal at impact. */
    normal: Vec2;
}

// ─── Collider entry ──────────────────────────────────────────────────────────

/**
 * A collider entry for use with moveAABB. Wraps an AABB with an optional
 * collision mask for layer-based filtering and material properties.
 */
export interface ColliderEntry {
    /** Bounding box. */
    aabb: AABB;
    /** Bitmask for layer-based collision filtering. */
    mask?: number;
    /** Bounce coefficient in [0, 1]. 0 = no bounce (stop), 1 = perfect bounce. */
    restitution?: number;
    /** Friction coefficient in [0, 1]. 0 = no friction, 1 = full stop on contact. */
    friction?: number;
}

/** Default mask: collide with everything. */
const ALL_MASK = 0xffffffff;

function isColliderEntry(c: AABB | ColliderEntry): c is ColliderEntry {
    return "aabb" in c;
}

function resolveEntry(raw: AABB | ColliderEntry): ColliderEntry {
    return isColliderEntry(raw) ? raw : { aabb: raw };
}

// ─── Swept AABB (CCD) ────────────────────────────────────────────────────────

/**
 * Swept AABB test - finds the first time of impact between a moving AABB and
 * a static target AABB over the interval [0, 1].
 *
 * Returns null if no collision occurs.
 *
 * @param body - The moving AABB.
 * @param velocity - Velocity of the moving body.
 * @param target - The static target AABB.
 * @param dt - Frame delta time.
 */
export function sweepAABB(
    body: AABB,
    velocity: Vec2,
    target: AABB,
    dt: number,
): SweepResult | null {
    const vx = velocity.x * dt;
    const vy = velocity.y * dt;

    // No movement - fall back to static overlap test
    if (vx === 0 && vy === 0) {
        const overlap = aabbOverlapResult(body, target);
        return overlap ? { t: 0, normal: overlap.normal } : null;
    }

    let tEntry = 0;
    let tExit = 1;
    let normalX = 0;
    let normalY = 0;

    // X-axis sweep
    if (vx !== 0) {
        const invVx = 1 / vx;
        let entry: number;
        let exit: number;
        if (vx > 0) {
            entry = (target.pos.x - (body.pos.x + body.size.x)) * invVx;
            exit = (target.pos.x + target.size.x - body.pos.x) * invVx;
        } else {
            entry = (target.pos.x + target.size.x - body.pos.x) * invVx;
            exit = (target.pos.x - (body.pos.x + body.size.x)) * invVx;
        }
        if (entry > tEntry) {
            tEntry = entry;
            normalX = -Math.sign(vx);
            normalY = 0;
        }
        if (exit < tExit) tExit = exit;
        if (tEntry > tExit) return null;
    } else {
        // Static X: must already overlap on X for a collision to be possible
        if (
            body.pos.x + body.size.x <= target.pos.x ||
            body.pos.x >= target.pos.x + target.size.x
        ) {
            return null;
        }
    }

    // Y-axis sweep
    if (vy !== 0) {
        const invVy = 1 / vy;
        let entry: number;
        let exit: number;
        if (vy > 0) {
            entry = (target.pos.y - (body.pos.y + body.size.y)) * invVy;
            exit = (target.pos.y + target.size.y - body.pos.y) * invVy;
        } else {
            entry = (target.pos.y + target.size.y - body.pos.y) * invVy;
            exit = (target.pos.y - (body.pos.y + body.size.y)) * invVy;
        }
        if (entry > tEntry) {
            tEntry = entry;
            normalX = 0;
            normalY = -Math.sign(vy);
        }
        if (exit < tExit) tExit = exit;
        if (tEntry > tExit) return null;
    } else {
        if (
            body.pos.y + body.size.y <= target.pos.y ||
            body.pos.y >= target.pos.y + target.size.y
        ) {
            return null;
        }
    }

    if (tEntry >= 0 && tEntry <= 1) {
        return { t: tEntry, normal: new Vec2(normalX, normalY) };
    }

    return null;
}

// ─── Single-step resolve (internal) ──────────────────────────────────────────

function resolveAABB(
    body: AABB,
    velocity: Vec2,
    colliders: (AABB | ColliderEntry)[],
    dt: number,
    bodyLayer?: number,
): MoveResult {
    const residualVel = velocity.clone();
    const step = residualVel.clone().scale(dt);
    const newPos = body.pos.clone().add(step);

    const result: MoveResult = {
        pos: newPos,
        velocity: residualVel,
        hit: false,
        normal: new Vec2(0, 0),
        colliderIndex: -1,
        touching: { left: false, right: false, top: false, bottom: false },
    };

    // Sweep along each axis independently.
    for (let axis = 0; axis < 2; axis++) {
        const testPos = result.pos.clone();
        if (axis === 0) testPos.y = body.pos.y;

        const testBox: AABB = { pos: testPos, size: body.size };

        for (let i = 0; i < colliders.length; i++) {
            const entry = resolveEntry(colliders[i]);

            // Layer mask check
            if (bodyLayer !== undefined || entry.mask !== undefined) {
                const layer = bodyLayer ?? ALL_MASK;
                const mask = entry.mask ?? ALL_MASK;
                if ((layer & mask) === 0) continue;
            }

            const overlap = aabbOverlapResult(testBox, entry.aabb);
            if (!overlap) continue;

            result.hit = true;
            result.colliderIndex = i;
            result.normal = overlap.normal;

            const rest = entry.restitution ?? 0;
            const fric = entry.friction ?? 0;

            if (axis === 0) {
                if (velocity.x > 0) {
                    result.pos.x = entry.aabb.pos.x - body.size.x;
                    result.normal = new Vec2(-1, 0);
                    testBox.pos.x = result.pos.x;
                    result.velocity.x = -velocity.x * rest;
                    result.velocity.y *= 1 - fric;
                    result.touching.right = true;
                } else if (velocity.x < 0) {
                    result.pos.x = entry.aabb.pos.x + entry.aabb.size.x;
                    result.normal = new Vec2(1, 0);
                    testBox.pos.x = result.pos.x;
                    result.velocity.x = -velocity.x * rest;
                    result.velocity.y *= 1 - fric;
                    result.touching.left = true;
                } else if (overlap.normal.x !== 0) {
                    result.pos.x += overlap.normal.x * overlap.overlap.x;
                    testBox.pos.x = result.pos.x;
                    result.velocity.x = -velocity.x * rest;
                    result.velocity.y *= 1 - fric;
                    if (overlap.normal.x < 0) result.touching.right = true;
                    else result.touching.left = true;
                }
            } else {
                if (velocity.y > 0) {
                    result.pos.y = entry.aabb.pos.y - body.size.y;
                    result.normal = new Vec2(0, -1);
                    testBox.pos.y = result.pos.y;
                    result.velocity.y = -velocity.y * rest;
                    result.velocity.x *= 1 - fric;
                    result.touching.bottom = true;
                } else if (velocity.y < 0) {
                    result.pos.y = entry.aabb.pos.y + entry.aabb.size.y;
                    result.normal = new Vec2(0, 1);
                    testBox.pos.y = result.pos.y;
                    result.velocity.y = -velocity.y * rest;
                    result.velocity.x *= 1 - fric;
                    result.touching.top = true;
                } else if (overlap.normal.y !== 0) {
                    result.pos.y += overlap.normal.y * overlap.overlap.y;
                    testBox.pos.y = result.pos.y;
                    result.velocity.y = -velocity.y * rest;
                    result.velocity.x *= 1 - fric;
                    if (overlap.normal.y < 0) result.touching.bottom = true;
                    else result.touching.top = true;
                }
            }
        }
    }

    return result;
}

// ─── Public move ─────────────────────────────────────────────────────────────

/**
 * Move an AABB through colliders with optional CCD substeps.
 *
 * @param body - The moving AABB.
 * @param velocity - Velocity (corrected on collision).
 * @param colliders - Static colliders.
 * @param dt - Frame delta time.
 * @param bodyLayer - Optional layer bitmask for the body.
 * @param ccdSubsteps - Number of CCD substeps (default 1).
 */
export function moveAABB(
    body: AABB,
    velocity: Vec2,
    colliders: (AABB | ColliderEntry)[],
    dt: number,
    bodyLayer?: number,
    ccdSubsteps: number = 1,
): MoveResult {
    const substeps = Math.max(1, ccdSubsteps | 0);

    if (substeps <= 1) {
        return resolveAABB(body, velocity, colliders, dt, bodyLayer);
    }

    const subDt = dt / substeps;
    let currentPos = body.pos.clone();
    let currentVel = velocity.clone();
    let lastResult: MoveResult = {
        pos: currentPos,
        velocity: currentVel,
        hit: false,
        normal: new Vec2(0, 0),
        colliderIndex: -1,
        touching: { left: false, right: false, top: false, bottom: false },
    };

    for (let i = 0; i < substeps; i++) {
        const stepBody: AABB = { pos: currentPos, size: body.size };
        lastResult = resolveAABB(
            stepBody,
            currentVel,
            colliders,
            subDt,
            bodyLayer,
        );
        currentPos.copy(lastResult.pos);
        currentVel.copy(lastResult.velocity);

        // Early exit if fully stopped (no velocity on either axis).
        if (lastResult.hit && currentVel.x === 0 && currentVel.y === 0) break;
    }

    return lastResult;
}

// ─── AABB utilities ──────────────────────────────────────────────────────────

/** Expand an AABB by a given margin. */
export function aabbExpand(r: AABB, amount: number): AABB {
    return {
        pos: new Vec2(r.pos.x - amount, r.pos.y - amount),
        size: new Vec2(r.size.x + amount * 2, r.size.y + amount * 2),
    };
}

/** Get the center position of an AABB. */
export function aabbCenter(r: AABB): Vec2 {
    return new Vec2(r.pos.x + r.size.x / 2, r.pos.y + r.size.y / 2);
}
