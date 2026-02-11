import { Vec2 } from "../core/math";
import { drawRect } from "../render/renderer2d";
import type { AABB, MoveResult } from "./aabb";

// ─── Types ─────────────────────────────────────────────────────────────────

/** Configuration definition for a tile type. */
export interface TileDef {
    /** Whether the tile blocks movement. */
    solid?: boolean;
    /** Color for debug rendering. */
    color?: string;
    /** Sprite index. */
    sprite?: number;
    /** Spawn point name. */
    spawn?: string;
    /** Bitmask for collision layer filtering. Only checked when `solid` is true. */
    mask?: number;
    /** Bounce coefficient in [0, 1]. 0 = no bounce, 1 = perfect bounce. */
    restitution?: number;
    /** Friction coefficient in [0, 1]. 0 = no friction, 1 = full stop on contact. */
    friction?: number;
    /** If true, this tile acts as a one-way platform - bodies can jump through from below but stand on top. */
    oneWay?: boolean;
    [key: string]: unknown;
}

/** A 2D grid-based tile map. */
export interface TileMap {
    /** Width in tiles. */
    width: number;
    /** Height in tiles. */
    height: number;
    /** Tile size in world units. */
    tileSize: number;
    /** Grid of tile sprite indices. */
    tiles: number[][];
    /** Mapping of character/key to tile definition. */
    legend: Record<string, TileDef>;
    /** Get tile sprite index at grid coordinates. */
    getTile: (x: number, y: number) => number;
    /** Get tile definition at grid coordinates. */
    getTileDef: (x: number, y: number) => TileDef | undefined;
    /** Check if grid coordinates contain a solid tile. */
    isSolid: (x: number, y: number, layer?: number) => boolean;
    /** Get world position of a spawn point. */
    getSpawn: (name: string, index?: number) => Vec2 | null;
    /** Render the tilemap. */
    render: (offsetX?: number, offsetY?: number) => void;
    /** Test collision of a box against the tilemap and return corrected position. */
    collisionTest: (
        pos: Vec2 | { x: number; y: number },
        size: Vec2 | { x: number; y: number },
        bodyLayer?: number,
    ) => {
        hit: boolean;
        normal: Vec2;
        pos: Vec2;
        touching: {
            left: boolean;
            right: boolean;
            top: boolean;
            bottom: boolean;
        };
    };
    /** Convert tile coordinates to world position. */
    tileToWorld: (tx: number, ty: number) => Vec2;
    /** Convert world coordinates to tile position. */
    worldToTile: (wx: number, wy: number) => { x: number; y: number };
    /** Check if an AABB overlaps any solid tile. */
    isSolidAABB: (aabb: AABB, layer?: number) => boolean;
}

const ALL_MASK = 0xffffffff;

// ─── Shared internals ────────────────────────────────────────────────────────

function buildSpriteLookup(legend: Record<string, TileDef>): {
    defs: (TileDef | undefined)[];
    charToSprite: (ch: string) => number;
} {
    const usedIndices = new Set<number>();
    const charToIdx = new Map<string, number>();

    // Pass 1 - collect explicit sprite indices
    for (const ch of Object.keys(legend)) {
        const def = legend[ch];
        if (def.sprite !== undefined) {
            charToIdx.set(ch, def.sprite);
            usedIndices.add(def.sprite);
        }
    }

    // Pass 2 - assign auto-indices for remaining chars
    let nextIdx = 0;
    for (const ch of Object.keys(legend)) {
        if (charToIdx.has(ch)) continue;
        while (usedIndices.has(nextIdx)) nextIdx++;
        charToIdx.set(ch, nextIdx);
        usedIndices.add(nextIdx);
    }

    // Build the array (sparse-indexed by sprite value → TileDef)
    const maxIdx = Math.max(...charToIdx.values(), 0);
    const defs: (TileDef | undefined)[] = new Array(maxIdx + 1);
    for (const [ch, idx] of charToIdx) {
        defs[idx] = legend[ch];
    }

    return {
        defs,
        charToSprite: (ch) => charToIdx.get(ch) ?? 0,
    };
}

function buildTileMap(
    tiles: number[][],
    width: number,
    height: number,
    tileSize: number,
    spriteDefs: (TileDef | undefined)[],
    legend: Record<string, TileDef>,
    lines?: string[],
): TileMap {
    // ── Core queries ──────────────────────────────────────────────────────

    function getTile(x: number, y: number): number {
        if (x < 0 || x >= width || y < 0 || y >= height) return 0;
        return tiles[y][x];
    }

    function getTileDef(x: number, y: number): TileDef | undefined {
        if (x < 0 || x >= width || y < 0 || y >= height) return undefined;
        return spriteDefs[tiles[y][x]];
    }

    function isSolid(x: number, y: number, layer?: number): boolean {
        if (x < 0 || x >= width || y < 0 || y >= height) return true;
        const def = spriteDefs[tiles[y]?.[x]];
        if (!def?.solid) return false;
        if (layer !== undefined) {
            const mask = def.mask ?? ALL_MASK;
            return (layer & mask) !== 0;
        }
        return true;
    }

    // ── Coordinate conversion ─────────────────────────────────────────────

    function tileToWorld(tx: number, ty: number): Vec2 {
        return new Vec2(tx * tileSize, ty * tileSize);
    }

    function worldToTile(wx: number, wy: number): { x: number; y: number } {
        return { x: Math.floor(wx / tileSize), y: Math.floor(wy / tileSize) };
    }

    // ── Rendering ──────────────────────────────────────────────────────────

    function render(offsetX: number = 0, offsetY: number = 0): void {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const def = spriteDefs[tiles[y][x]];
                if (def?.color) {
                    drawRect(
                        new Vec2(
                            x * tileSize + offsetX,
                            y * tileSize + offsetY,
                        ),
                        new Vec2(tileSize, tileSize),
                        def.color,
                    );
                }
            }
        }
    }

    // ── Spawn points (string-based only) ───────────────────────────────────

    function getSpawn(name: string, index: number = 0): Vec2 | null {
        if (!lines) return null;
        let found = 0;
        for (const ch of Object.keys(legend)) {
            const def = legend[ch];
            if (def?.spawn === name) {
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if ((lines[y]?.[x] || ".") === ch) {
                            if (found === index) {
                                return new Vec2(
                                    x * tileSize + tileSize / 2,
                                    y * tileSize + tileSize / 2,
                                );
                            }
                            found++;
                        }
                    }
                }
            }
        }
        return null;
    }

    // ── Collision test (iterative MTD push-out) ───────────────────────────

    function collisionTest(
        pos: Vec2 | { x: number; y: number },
        size: Vec2 | { x: number; y: number },
        bodyLayer?: number,
    ): {
        hit: boolean;
        normal: Vec2;
        pos: Vec2;
        touching: {
            left: boolean;
            right: boolean;
            top: boolean;
            bottom: boolean;
        };
    } {
        const result = {
            hit: false,
            normal: new Vec2(0, 0),
            pos: new Vec2(pos.x, pos.y),
            touching: { left: false, right: false, top: false, bottom: false },
        };
        const margin = 0.001;
        const maxIterations = 4;

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            let bestTileX = 0;
            let bestTileY = 0;
            let bestOverlapX = 0;
            let bestOverlapY = 0;
            let bestNormalX = 0;
            let bestNormalY = 0;
            let bestOverlap = Infinity;

            const minTile = worldToTile(result.pos.x, result.pos.y);
            const maxTile = worldToTile(
                result.pos.x + size.x - margin,
                result.pos.y + size.y - margin,
            );

            for (let ty = minTile.y; ty <= maxTile.y; ty++) {
                for (let tx = minTile.x; tx <= maxTile.x; tx++) {
                    if (!isSolid(tx, ty, bodyLayer)) continue;

                    const tileWorld = tileToWorld(tx, ty);
                    const tileDef = spriteDefs[tiles[ty]?.[tx]];

                    // One-way platform: skip if body center is below tile centre
                    if (tileDef?.oneWay) {
                        if (
                            result.pos.y + size.y / 2 >=
                            tileWorld.y + tileSize / 2
                        )
                            continue;
                        const overlapBottom =
                            tileWorld.y + tileSize - result.pos.y;
                        if (overlapBottom > 0 && overlapBottom < bestOverlap) {
                            bestOverlap = overlapBottom;
                            bestOverlapX = 0;
                            bestOverlapY = overlapBottom;
                            bestNormalX = 0;
                            bestNormalY = -1;
                            bestTileX = tx;
                            bestTileY = ty;
                        }
                        continue;
                    }

                    const overlapLeft = result.pos.x + size.x - tileWorld.x;
                    const overlapRight = tileWorld.x + tileSize - result.pos.x;
                    const overlapTop = result.pos.y + size.y - tileWorld.y;
                    const overlapBottom = tileWorld.y + tileSize - result.pos.y;

                    if (
                        overlapLeft <= 0 ||
                        overlapRight <= 0 ||
                        overlapTop <= 0 ||
                        overlapBottom <= 0
                    )
                        continue;

                    const overlapX = Math.min(overlapLeft, overlapRight);
                    const overlapY = Math.min(overlapTop, overlapBottom);
                    const MathOverlap = Math.min(overlapX, overlapY);

                    if (MathOverlap < bestOverlap) {
                        bestTileX = tx;
                        bestTileY = ty;
                        bestOverlapX = overlapX;
                        bestOverlapY = overlapY;
                        bestOverlap = MathOverlap;

                        if (overlapX < overlapY) {
                            bestNormalX =
                                result.pos.x + size.x / 2 <
                                tileWorld.x + tileSize / 2
                                    ? -1
                                    : 1;
                            bestNormalY = 0;
                        } else {
                            bestNormalX = 0;
                            bestNormalY =
                                result.pos.y + size.y / 2 <
                                tileWorld.y + tileSize / 2
                                    ? -1
                                    : 1;
                        }
                    }
                }
            }

            if (bestOverlap === Infinity) break;

            result.hit = true;
            result.normal.set(bestNormalX, bestNormalY);

            if (bestNormalX !== 0) {
                result.pos.x += bestNormalX * bestOverlapX;
                if (bestNormalX < 0) result.touching.right = true;
                else result.touching.left = true;
            } else if (bestNormalY !== 0) {
                result.pos.y += bestNormalY * bestOverlapY;
                if (bestNormalY < 0) result.touching.bottom = true;
                else result.touching.top = true;
            }

            if (!isSolid(bestTileX, bestTileY, bodyLayer)) break;
        }

        return result;
    }

    // ── AABB helper ────────────────────────────────────────────────────────

    function isSolidAABB(aabb: AABB, layer?: number): boolean {
        const minTile = worldToTile(aabb.pos.x, aabb.pos.y);
        const maxTile = worldToTile(
            aabb.pos.x + aabb.size.x - 0.001,
            aabb.pos.y + aabb.size.y - 0.001,
        );
        for (let y = minTile.y; y <= maxTile.y; y++) {
            for (let x = minTile.x; x <= maxTile.x; x++) {
                if (isSolid(x, y, layer)) return true;
            }
        }
        return false;
    }

    return {
        width,
        height,
        tileSize,
        tiles,
        legend,
        getTile,
        getTileDef,
        isSolid,
        getSpawn,
        render,
        collisionTest,
        tileToWorld,
        worldToTile,
        isSolidAABB,
    };
}

// ─── Factory: string-based ──────────────────────────────────────────────────

/**
 * Create a tilemap from a multi-line string.
 *
 * @example
 * ```ts
 * const map = tilemapFromString(
 *   `#.#\n###`,
 *   { '#': { solid: true }, '.': {} }
 * );
 * ```
 */
export function tilemapFromString(
    text: string,
    legend: Record<string, TileDef>,
    tileSize: number = 16,
): TileMap {
    const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    const height = lines.length;
    const width = Math.max(...lines.map((l) => l.length));
    const tiles: number[][] = [];
    const lookup = buildSpriteLookup(legend);

    for (let y = 0; y < height; y++) {
        tiles[y] = [];
        for (let x = 0; x < width; x++) {
            const ch = lines[y][x] || ".";
            tiles[y][x] = lookup.charToSprite(ch);
        }
    }

    return buildTileMap(
        tiles,
        width,
        height,
        tileSize,
        lookup.defs,
        legend,
        lines,
    );
}

// ─── Factory: procedural ────────────────────────────────────────────────────

/** Create a tilemap with a programmatically filled grid.
 *
 *  `spriteDefs` is an array where the index matches the sprite value stored in
 *  `tiles[y][x]`.
 *
 *  @example
 *  ```ts
 *  const defs: TileDef[] = [
 *    {},                                 // sprite 0 - air
 *    { solid: true, color: '#555' },     // sprite 1 - wall
 *    { solid: true, oneWay: true, color: '#fa0' }, // sprite 2 - platform
 *  ];
 *  const map = createTilemap(64, 64, 16, defs);
 *  ```
 */
export function createTilemap(
    width: number,
    height: number,
    tileSize: number,
    spriteDefs: (TileDef | undefined)[],
    initialValue: number = 0,
): TileMap {
    const tiles: number[][] = [];
    for (let y = 0; y < height; y++) {
        tiles[y] = [];
        for (let x = 0; x < width; x++) tiles[y][x] = initialValue;
    }

    // Build a legend so `tilemap.legend` works for serialisation / debugging.
    const legend: Record<string, TileDef> = {};
    for (let i = 0; i < spriteDefs.length; i++) {
        const def = spriteDefs[i];
        if (def) legend[`s${i}`] = { sprite: i, ...def };
    }

    return buildTileMap(tiles, width, height, tileSize, spriteDefs, legend);
}

// ─── Collision movement ─────────────────────────────────────────────────────

/**
 * Move an AABB through the tilemap, resolving collisions.
 *
 * @param body - The moving AABB.
 * @param velocity - Current velocity.
 * @param tilemap - The tilemap to collide with.
 * @param dt - Frame delta time.
 * @param bodyLayer - Optional layer bitmask for the body.
 */
export function moveTilemap(
    body: AABB,
    velocity: Vec2,
    tilemap: TileMap,
    dt: number,
    bodyLayer?: number,
): MoveResult {
    const residualVel = velocity.clone();
    const step = residualVel.clone().scale(dt);

    const result: MoveResult = {
        pos: body.pos.clone().add(step),
        velocity: residualVel,
        hit: false,
        normal: new Vec2(0, 0),
        colliderIndex: -1,
        touching: { left: false, right: false, top: false, bottom: false },
    };

    // ── 1. Resolve X axis ─────────────────────────────────────────────────

    const testBoxX = {
        pos: new Vec2(result.pos.x, body.pos.y),
        size: body.size,
    };

    if (velocity.x !== 0) {
        const minTile = tilemap.worldToTile(testBoxX.pos.x, testBoxX.pos.y);
        const maxTile = tilemap.worldToTile(
            testBoxX.pos.x + testBoxX.size.x - 0.001,
            testBoxX.pos.y + testBoxX.size.y - 0.001,
        );

        for (let ty = minTile.y; ty <= maxTile.y; ty++) {
            for (let tx = minTile.x; tx <= maxTile.x; tx++) {
                if (!tilemap.isSolid(tx, ty, bodyLayer)) continue;

                // One-way platforms never block horizontal movement
                const tileDef = tilemap.getTileDef(tx, ty);
                if (tileDef?.oneWay) continue;

                const tileWorld = tilemap.tileToWorld(tx, ty);
                const rest = tileDef?.restitution ?? 0;
                const fric = tileDef?.friction ?? 0;

                if (velocity.x > 0) {
                    result.pos.x = tileWorld.x - testBoxX.size.x;
                    result.normal.set(-1, 0);
                    result.hit = true;
                    result.velocity.x = -velocity.x * rest;
                    result.velocity.y *= 1 - fric;
                    result.touching.right = true;
                } else if (velocity.x < 0) {
                    result.pos.x = tileWorld.x + tilemap.tileSize;
                    result.normal.set(1, 0);
                    result.hit = true;
                    result.velocity.x = -velocity.x * rest;
                    result.velocity.y *= 1 - fric;
                    result.touching.left = true;
                }
                testBoxX.pos.x = result.pos.x;
            }
        }
    }

    // ── 2. Resolve Y axis ─────────────────────────────────────────────────

    const testBoxY = {
        pos: new Vec2(result.pos.x, result.pos.y),
        size: body.size,
    };
    const bodyOrigBottom = body.pos.y + body.size.y;

    if (velocity.y !== 0) {
        const minTile = tilemap.worldToTile(testBoxY.pos.x, testBoxY.pos.y);
        const maxTile = tilemap.worldToTile(
            testBoxY.pos.x + testBoxY.size.x - 0.001,
            testBoxY.pos.y + testBoxY.size.y - 0.001,
        );

        for (let ty = minTile.y; ty <= maxTile.y; ty++) {
            for (let tx = minTile.x; tx <= maxTile.x; tx++) {
                if (!tilemap.isSolid(tx, ty, bodyLayer)) continue;

                const tileWorld = tilemap.tileToWorld(tx, ty);
                const tileDef = tilemap.getTileDef(tx, ty);

                // One-way: only block if falling onto it from above
                if (tileDef?.oneWay) {
                    if (!(velocity.y > 0 && bodyOrigBottom <= tileWorld.y + 2))
                        continue;
                }

                const rest = tileDef?.restitution ?? 0;
                const fric = tileDef?.friction ?? 0;

                if (velocity.y > 0) {
                    result.pos.y = tileWorld.y - testBoxY.size.y;
                    result.normal.set(0, -1);
                    result.hit = true;
                    result.velocity.y = -velocity.y * rest;
                    result.velocity.x *= 1 - fric;
                    result.touching.bottom = true;
                } else if (velocity.y < 0) {
                    result.pos.y = tileWorld.y + tilemap.tileSize;
                    result.normal.set(0, 1);
                    result.hit = true;
                    result.velocity.y = -velocity.y * rest;
                    result.velocity.x *= 1 - fric;
                    result.touching.top = true;
                }
                testBoxY.pos.y = result.pos.y;
            }
        }
    }

    return result;
}
