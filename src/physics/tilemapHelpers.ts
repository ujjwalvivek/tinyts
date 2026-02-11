import type { TileMap } from "./tilemap";

// ─── Tile manipulation helpers ───────────────────────────────────────────────
//  These operate directly on a TileMap's `tiles` buffer. Collision and
//  rendering automatically reflect any change, no rebuild needed.
// ─────────────────────────────────────────────────────────────────────────────

/** Fill a rectangular region of the tilemap with a single sprite index. */
export function fillTiles(
    map: TileMap,
    x: number,
    y: number,
    w: number,
    h: number,
    sprite: number,
): void {
    const x1 = Math.max(0, x);
    const y1 = Math.max(0, y);
    const x2 = Math.min(map.width, x + w);
    const y2 = Math.min(map.height, y + h);
    for (let row = y1; row < y2; row++) {
        for (let col = x1; col < x2; col++) {
            map.tiles[row][col] = sprite;
        }
    }
}

/** Draw a 1-tile-wide Bresenham line of sprites. */
export function drawLineTiles(
    map: TileMap,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    sprite: number,
): void {
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    let cx = x0;
    let cy = y0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (cx >= 0 && cx < map.width && cy >= 0 && cy < map.height) {
            map.tiles[cy][cx] = sprite;
        }
        if (cx === x1 && cy === y1) break;
        const e2 = err * 2;
        if (e2 >= dy) {
            err += dy;
            cx += sx;
        }
        if (e2 <= dx) {
            err += dx;
            cy += sy;
        }
    }
}

/** Draw a filled circle of sprites using the midpoint algorithm. */
export function drawCircleTiles(
    map: TileMap,
    cx: number,
    cy: number,
    radius: number,
    sprite: number,
): void {
    const r2 = radius * radius;
    const yMin = Math.max(0, cy - radius);
    const yMax = Math.min(map.height - 1, cy + radius);
    const xMin = Math.max(0, cx - radius);
    const xMax = Math.min(map.width - 1, cx + radius);

    for (let y = yMin; y <= yMax; y++) {
        const dy = y - cy;
        const halfWidth = Math.sqrt(Math.max(0, r2 - dy * dy)) | 0;
        const lx = Math.max(xMin, cx - halfWidth);
        const rx = Math.min(xMax, cx + halfWidth);
        for (let x = lx; x <= rx; x++) {
            map.tiles[y][x] = sprite;
        }
    }
}

/** Stamp a 2D numeric array of sprites into the tilemap. */
export function stampTiles(
    map: TileMap,
    destX: number,
    destY: number,
    source: number[][],
): void {
    for (let sy = 0; sy < source.length; sy++) {
        const ty = destY + sy;
        if (ty < 0 || ty >= map.height) continue;
        for (let sx = 0; sx < source[sy].length; sx++) {
            const tx = destX + sx;
            if (tx < 0 || tx >= map.width) continue;
            map.tiles[ty][tx] = source[sy][sx];
        }
    }
}

/** Stamp a region of a source tilemap into a destination tilemap. */
export function stampTilemap(
    map: TileMap,
    destX: number,
    destY: number,
    source: TileMap,
    srcX: number = 0,
    srcY: number = 0,
    srcW: number = source.width,
    srcH: number = source.height,
): void {
    const w = Math.min(srcW, source.width - srcX);
    const h = Math.min(srcH, source.height - srcY);
    for (let sy = 0; sy < h; sy++) {
        const ty = destY + sy;
        if (ty < 0 || ty >= map.height) continue;
        const row = source.tiles[srcY + sy];
        for (let sx = 0; sx < w; sx++) {
            const tx = destX + sx;
            if (tx < 0 || tx >= map.width) continue;
            map.tiles[ty][tx] = row[srcX + sx];
        }
    }
}
