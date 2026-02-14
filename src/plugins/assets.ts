import {
    createTexture,
    drawProceduralRect,
    drawProceduralCircle,
    drawProceduralPolygon,
} from "../render/procedural";

/** Create a player texture. */
export function makePlayerTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 2 * s, 0, 12 * s, 14 * s, "#6af");
        drawProceduralRect(ctx, 0, 10 * s, 16 * s, 4 * s, "#4a8adf");
        drawProceduralRect(
            ctx,
            3 * s,
            1 * s,
            10 * s,
            3 * s,
            "rgba(255,255,255,0.2)",
        );
        drawProceduralRect(ctx, 4 * s, 4 * s, 3 * s, 3 * s, "#fff");
        drawProceduralRect(ctx, 9 * s, 4 * s, 3 * s, 3 * s, "#fff");
    }, "player");
}

/** Create a coin texture. */
export function makeCoinTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralCircle(ctx, 8 * s, 8 * s, 7 * s, "#f0c040");
        drawProceduralCircle(ctx, 7 * s, 6 * s, 2.5 * s, "#fff3b0");
        ctx.fillStyle = "#d4a020";
        ctx.beginPath();
        ctx.arc(8 * s, 8 * s, 5 * s, 0, Math.PI);
        ctx.fill();
    }, "coin");
}

/** Create an enemy texture. */
export function makeEnemyTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 1 * s, 0, 14 * s, 14 * s, "#e94560");
        drawProceduralRect(ctx, 3 * s, 2 * s, 10 * s, 8 * s, "#ff6b6b");
        drawProceduralRect(ctx, 3 * s, 3 * s, 3 * s, 3 * s, "#fff");
        drawProceduralRect(ctx, 10 * s, 3 * s, 3 * s, 3 * s, "#fff");
        drawProceduralRect(ctx, 4 * s, 4 * s, 2 * s, 2 * s, "#000");
        drawProceduralRect(ctx, 11 * s, 4 * s, 2 * s, 2 * s, "#000");
        drawProceduralRect(ctx, 0, 12 * s, 4 * s, 4 * s, "#1a1a2e");
        drawProceduralRect(ctx, 12 * s, 12 * s, 4 * s, 4 * s, "#1a1a2e");
    }, "enemy");
}

/** Create a wall texture. */
export function makeWallTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#3a3a5a");
        drawProceduralRect(ctx, 0, 0, 8 * s, 8 * s, "#4a4a6a");
        drawProceduralRect(ctx, 8 * s, 8 * s, 8 * s, 8 * s, "#4a4a6a");
        drawProceduralRect(ctx, 8 * s, 0, 8 * s, 8 * s, "#2a2a4a");
        drawProceduralRect(ctx, 0, 8 * s, 8 * s, 8 * s, "#2a2a4a");
        drawProceduralRect(
            ctx,
            1 * s,
            1 * s,
            6 * s,
            6 * s,
            "rgba(255,255,255,0.04)",
        );
        drawProceduralRect(
            ctx,
            9 * s,
            9 * s,
            6 * s,
            6 * s,
            "rgba(255,255,255,0.04)",
        );
    }, "wall");
}

/** Create a ground texture. */
export function makeGroundTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#5a4a3a");
        drawProceduralRect(ctx, 0, 0, 8 * s, 4 * s, "#6a5a4a");
        drawProceduralRect(ctx, 8 * s, 4 * s, 8 * s, 4 * s, "#6a5a4a");
        drawProceduralRect(ctx, 4 * s, 8 * s, 8 * s, 4 * s, "#6a5a4a");
        drawProceduralRect(ctx, 0, 12 * s, 8 * s, 4 * s, "#6a5a4a");
        drawProceduralRect(ctx, 8 * s, 0, 8 * s, 4 * s, "#4a3a2a");
        drawProceduralRect(ctx, 0, 4 * s, 8 * s, 4 * s, "#4a3a2a");
        drawProceduralRect(ctx, 4 * s, 12 * s, 8 * s, 4 * s, "#4a3a2a");
        drawProceduralRect(ctx, 0, 8 * s, 4 * s, 4 * s, "#4a3a2a");
        drawProceduralRect(ctx, 0, 0, 16 * s, 2 * s, "#4a8a3a");
        drawProceduralRect(ctx, 1 * s, 0, 3 * s, 3 * s, "#5a9a4a");
        drawProceduralRect(ctx, 7 * s, 0, 4 * s, 3 * s, "#5a9a4a");
        drawProceduralRect(ctx, 12 * s, 0, 3 * s, 3 * s, "#5a9a4a");
    }, "ground");
}

/** Create a spike texture. */
export function makeSpikeTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralPolygon(
            ctx,
            [
                { x: 8 * s, y: 0 },
                { x: 16 * s, y: 10 * s },
                { x: 12 * s, y: 16 * s },
                { x: 4 * s, y: 16 * s },
                { x: 0, y: 10 * s },
            ],
            "#e94560",
        );
        drawProceduralPolygon(
            ctx,
            [
                { x: 8 * s, y: 3 * s },
                { x: 12 * s, y: 8 * s },
                { x: 8 * s, y: 12 * s },
                { x: 4 * s, y: 8 * s },
            ],
            "#ff6b6b",
        );
    }, "spike");
}

/** Create a checkpoint texture. */
export function makeCheckpointTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 6 * s, 0, 4 * s, 16 * s, "#6af");
        drawProceduralRect(ctx, 3 * s, 2 * s, 3 * s, 12 * s, "#4a8adf");
        drawProceduralRect(ctx, 10 * s, 4 * s, 3 * s, 10 * s, "#4a8adf");
        drawProceduralRect(ctx, 5 * s, 1 * s, 6 * s, 2 * s, "#8cf");
        drawProceduralRect(ctx, 7 * s, 12 * s, 2 * s, 4 * s, "#8cf");
    }, "checkpoint");
}

/** Create a UI border texture. */
export function makeUITexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#1a1a2e");
        drawProceduralRect(ctx, 1 * s, 1 * s, 14 * s, 14 * s, "#2a2a44");
        drawProceduralRect(ctx, 2 * s, 2 * s, 12 * s, 12 * s, "#3a3a5a");
    }, "ui");
}

/** Create a heart texture. */
export function makeHeartTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        ctx.fillStyle = "#e94560";
        ctx.beginPath();
        ctx.moveTo(8 * s, 14 * s);
        ctx.bezierCurveTo(0, 10 * s, 0, 4 * s, 4 * s, 2 * s);
        ctx.bezierCurveTo(6 * s, 1 * s, 8 * s, 3 * s, 8 * s, 5 * s);
        ctx.bezierCurveTo(8 * s, 3 * s, 10 * s, 1 * s, 12 * s, 2 * s);
        ctx.bezierCurveTo(16 * s, 4 * s, 16 * s, 10 * s, 8 * s, 14 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.moveTo(8 * s, 12 * s);
        ctx.bezierCurveTo(3 * s, 9 * s, 3 * s, 5 * s, 5 * s, 3.5 * s);
        ctx.bezierCurveTo(6.5 * s, 2.5 * s, 8 * s, 4 * s, 8 * s, 5.5 * s);
        ctx.bezierCurveTo(8 * s, 4 * s, 9.5 * s, 2.5 * s, 11 * s, 3.5 * s);
        ctx.bezierCurveTo(13 * s, 5 * s, 13 * s, 9 * s, 8 * s, 12 * s);
        ctx.closePath();
        ctx.fill();
    }, "heart");
}

// ─── New: tiles and environment ──────────────────────────────────────────────

/** Create a tree texture. */
export function makeTreeTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        // trunk
        drawProceduralRect(ctx, 6 * s, 8 * s, 4 * s, 8 * s, "#6a4a2a");
        // canopy (layered circles)
        drawProceduralCircle(ctx, 8 * s, 5 * s, 6 * s, "#3a8a3a");
        drawProceduralCircle(ctx, 5 * s, 6 * s, 4 * s, "#4a9a4a");
        drawProceduralCircle(ctx, 11 * s, 6 * s, 4 * s, "#4a9a4a");
        drawProceduralCircle(ctx, 8 * s, 4 * s, 4 * s, "#5aaa5a");
    }, "tree");
}

/** Create a water texture. */
export function makeWaterTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#2266aa");
        // wave highlights
        for (let i = 0; i < 5; i++) {
            const wy = (i * 3 + 1) * s;
            drawProceduralRect(ctx, 0, wy, 16 * s, s, "rgba(255,255,255,0.08)");
        }
        drawProceduralCircle(
            ctx,
            4 * s,
            6 * s,
            2 * s,
            "rgba(255,255,255,0.06)",
        );
        drawProceduralCircle(
            ctx,
            12 * s,
            10 * s,
            3 * s,
            "rgba(255,255,255,0.06)",
        );
    }, "water");
}

/** Create a stone texture. */
export function makeStoneTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#6a7a8a");
        drawProceduralRect(ctx, 0, 0, 6 * s, 7 * s, "#7a8a9a");
        drawProceduralRect(ctx, 9 * s, 2 * s, 5 * s, 5 * s, "#7a8a9a");
        drawProceduralRect(ctx, 4 * s, 10 * s, 8 * s, 4 * s, "#7a8a9a");
        drawProceduralRect(ctx, 1 * s, 1 * s, 3 * s, 3 * s, "rgba(0,0,0,0.08)");
        drawProceduralRect(
            ctx,
            11 * s,
            4 * s,
            3 * s,
            2 * s,
            "rgba(0,0,0,0.08)",
        );
    }, "stone");
}

/** Create a sand texture. */
export function makeSandTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#d4b878");
        drawProceduralRect(ctx, 2 * s, 3 * s, 3 * s, 2 * s, "#c4a868");
        drawProceduralRect(ctx, 10 * s, 6 * s, 4 * s, 2 * s, "#c4a868");
        drawProceduralRect(ctx, 5 * s, 11 * s, 3 * s, 3 * s, "#c4a868");
        drawProceduralRect(ctx, 1 * s, 1 * s, 2 * s, 1 * s, "rgba(0,0,0,0.04)");
    }, "sand");
}

/** Create a snow texture. */
export function makeSnowTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#dce8f0");
        drawProceduralRect(ctx, 2 * s, 2 * s, 3 * s, 3 * s, "#e8f4fc");
        drawProceduralRect(ctx, 10 * s, 4 * s, 4 * s, 4 * s, "#e8f4fc");
        drawProceduralRect(ctx, 6 * s, 10 * s, 3 * s, 3 * s, "#e8f4fc");
        drawProceduralCircle(ctx, 8 * s, 3 * s, 1 * s, "#b0c8d8");
        drawProceduralCircle(ctx, 3 * s, 11 * s, 1 * s, "#b0c8d8");
        drawProceduralCircle(ctx, 12 * s, 8 * s, 1 * s, "#b0c8d8");
    }, "snow");
}

/** Create a ladder texture. */
export function makeLadderTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#5a4a3a");
        drawProceduralRect(ctx, 0, 0, 3 * s, 16 * s, "#7a6a5a");
        drawProceduralRect(ctx, 13 * s, 0, 3 * s, 16 * s, "#7a6a5a");
        for (let i = 0; i < 5; i++) {
            drawProceduralRect(
                ctx,
                2 * s,
                (i * 3 + 1) * s,
                12 * s,
                s,
                "#7a6a5a",
            );
        }
    }, "ladder");
}
