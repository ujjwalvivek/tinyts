import { Vec2 } from "../core/math";

// ─── Verlet integration ─────────────────────────────────────────────────────
//  Minimal verlet-physics module for chains, ropes, vines, and soft-ish
//  constraints. Uses position-based dynamics (no explicit velocity - velocity
//  is implicit as `pos - oldPos`).
//
//  Usage:
//    const rope = createVerletRope(100, 0, 20, 8);
//    // Each frame:
//    updateVerletRope(rope, new Vec2(0, 981), 4, 8, dt);
//    // Render rope.points[i].pos
// ─────────────────────────────────────────────────────────────────────────────

/** A point in Verlet integration. */
export interface VerletPoint {
    /** Current position. */
    pos: Vec2;
    /** Position in the previous frame. */
    oldPos: Vec2;
    /** If true, the point is fixed in place. */
    pinned: boolean;
}

/** A distance constraint connecting two Verlet points. */
export interface VerletStick {
    /** First endpoint. */
    a: VerletPoint;
    /** Second endpoint. */
    b: VerletPoint;
    /** Rest length of the constraint. */
    length: number;
}

/** A rope composed of Verlet points and sticks. */
export interface VerletRope {
    /** List of points. */
    points: VerletPoint[];
    /** List of constraints. */
    sticks: VerletStick[];
}

// ─── Factories ───────────────────────────────────────────────────────────────

/** Create a Verlet point. */
export function createVerletPoint(
    x: number,
    y: number,
    pinned: boolean = false,
): VerletPoint {
    return { pos: new Vec2(x, y), oldPos: new Vec2(x, y), pinned };
}

/** Create a Verlet stick constraint. */
export function createVerletStick(
    a: VerletPoint,
    b: VerletPoint,
    length?: number,
): VerletStick {
    return {
        a,
        b,
        length: length ?? a.pos.distanceTo(b.pos),
    };
}

/** Create a rope of equally-spaced Verlet points. */
export function createVerletRope(
    x: number,
    y: number,
    segments: number,
    segmentLength: number,
    startPinned: boolean = true,
): VerletRope {
    const points: VerletPoint[] = [];
    const sticks: VerletStick[] = [];

    for (let i = 0; i <= segments; i++) {
        points.push(
            createVerletPoint(x + i * segmentLength, y, i === 0 && startPinned),
        );
    }
    for (let i = 0; i < segments; i++) {
        sticks.push(createVerletStick(points[i], points[i + 1], segmentLength));
    }

    return { points, sticks };
}

// ─── Simulation ──────────────────────────────────────────────────────────────

/** Apply gravity and integrate the position of a Verlet point. */
export function verletIntegrate(
    point: VerletPoint,
    gravity: Vec2,
    dt: number,
): void {
    if (point.pinned) return;

    const velX = point.pos.x - point.oldPos.x;
    const velY = point.pos.y - point.oldPos.y;

    point.oldPos.copy(point.pos);

    // Damping: 0.999 * vel (lose 0.1% energy each frame)
    point.pos.x += velX * 0.999 + gravity.x * dt * dt;
    point.pos.y += velY * 0.999 + gravity.y * dt * dt;
}

/** Solve a stick constraint to satisfy its rest length. */
export function verletSolveStick(stick: VerletStick): void {
    const dx = stick.b.pos.x - stick.a.pos.x;
    const dy = stick.b.pos.y - stick.a.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.0001) return;

    const correction = ((dist - stick.length) / dist) * 0.5;
    const cx = dx * correction;
    const cy = dy * correction;

    if (!stick.a.pinned) {
        stick.a.pos.x += cx;
        stick.a.pos.y += cy;
    }
    if (!stick.b.pinned) {
        stick.b.pos.x -= cx;
        stick.b.pos.y -= cy;
    }
}

/**
 * Advance a rope simulation by one frame.
 *
 * @param rope - The rope to simulate.
 * @param gravity - Gravity acceleration vector.
 * @param substeps - Integration substeps.
 * @param iterations - Constraint solver iterations.
 * @param dt - Frame delta time.
 */
export function updateVerletRope(
    rope: VerletRope,
    gravity: Vec2,
    substeps: number,
    iterations: number,
    dt: number,
): void {
    const subDt = dt / substeps;
    const subGravity = gravity.clone().scale(1 / substeps);

    for (let s = 0; s < substeps; s++) {
        for (const point of rope.points) {
            verletIntegrate(point, subGravity, subDt);
        }
        for (let i = 0; i < iterations; i++) {
            for (const stick of rope.sticks) {
                verletSolveStick(stick);
            }
        }
    }
}
