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
        drawProceduralRect(ctx, 3 * s, 1 * s, 10 * s, 12 * s, "#23406a");
        drawProceduralRect(ctx, 2 * s, 3 * s, 12 * s, 9 * s, "#4f8fd8");
        drawProceduralRect(ctx, 4 * s, 0, 8 * s, 3 * s, "#82b8f4");
        drawProceduralRect(ctx, 0, 10 * s, 16 * s, 4 * s, "#1d2c4a");
        drawProceduralRect(ctx, 2 * s, 10 * s, 12 * s, 2 * s, "#2f63ad");
        drawProceduralRect(ctx, 4 * s, 4 * s, 8 * s, 4 * s, "#dbeafe");
        drawProceduralRect(ctx, 5 * s, 5 * s, 2 * s, 2 * s, "#11111b");
        drawProceduralRect(ctx, 10 * s, 5 * s, 2 * s, 2 * s, "#11111b");
        drawProceduralRect(ctx, 3 * s, 2 * s, 10 * s, 1 * s, "#b8d9ff");
        drawProceduralRect(ctx, 4 * s, 13 * s, 4 * s, 3 * s, "#111827");
        drawProceduralRect(ctx, 10 * s, 13 * s, 4 * s, 3 * s, "#111827");
    }, "player");
}

/** Create a coin texture. */
export function makeCoinTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralCircle(ctx, 8 * s, 8 * s, 7 * s, "#8f5f10");
        drawProceduralCircle(ctx, 8 * s, 8 * s, 6 * s, "#f2c94c");
        drawProceduralCircle(ctx, 7 * s, 6 * s, 2.5 * s, "#fff3b0");
        drawProceduralRect(ctx, 7 * s, 3 * s, 2 * s, 10 * s, "#b7791f");
        drawProceduralRect(ctx, 8 * s, 3 * s, 1 * s, 10 * s, "#ffe08a");
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
        drawProceduralRect(ctx, 1 * s, 1 * s, 14 * s, 12 * s, "#7f1d2d");
        drawProceduralRect(ctx, 2 * s, 0, 12 * s, 12 * s, "#e54b65");
        drawProceduralRect(ctx, 4 * s, 2 * s, 8 * s, 3 * s, "#ff7a84");
        drawProceduralRect(ctx, 3 * s, 4 * s, 4 * s, 4 * s, "#f8fafc");
        drawProceduralRect(ctx, 9 * s, 4 * s, 4 * s, 4 * s, "#f8fafc");
        drawProceduralRect(ctx, 5 * s, 5 * s, 2 * s, 2 * s, "#11111b");
        drawProceduralRect(ctx, 9 * s, 5 * s, 2 * s, 2 * s, "#11111b");
        drawProceduralRect(ctx, 5 * s, 10 * s, 6 * s, 1 * s, "#45111d");
        drawProceduralRect(ctx, 0, 12 * s, 5 * s, 4 * s, "#111827");
        drawProceduralRect(ctx, 11 * s, 12 * s, 5 * s, 4 * s, "#111827");
    }, "enemy");
}

/** Create a wall texture. */
export function makeWallTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#171923");

        // Dark staggered bricks with thin mortar lines.
        drawProceduralRect(ctx, 0, 0, 8 * s, 7 * s, "#202230");
        drawProceduralRect(ctx, 8 * s, 0, 8 * s, 7 * s, "#1b1d29");
        drawProceduralRect(ctx, 0, 8 * s, 4 * s, 7 * s, "#191b27");
        drawProceduralRect(ctx, 4 * s, 8 * s, 8 * s, 7 * s, "#222434");
        drawProceduralRect(ctx, 12 * s, 8 * s, 4 * s, 7 * s, "#181a25");

        drawProceduralRect(ctx, 0, 7 * s, 16 * s, 1 * s, "#0e1018");
        drawProceduralRect(ctx, 0, 15 * s, 16 * s, 1 * s, "#0e1018");
        drawProceduralRect(ctx, 8 * s, 0, 1 * s, 7 * s, "#0e1018");
        drawProceduralRect(ctx, 4 * s, 8 * s, 1 * s, 7 * s, "#0e1018");
        drawProceduralRect(ctx, 12 * s, 8 * s, 1 * s, 7 * s, "#0e1018");

        drawProceduralRect(ctx, 1 * s, 1 * s, 6 * s, 1 * s, "#2a2d3d");
        drawProceduralRect(ctx, 9 * s, 1 * s, 6 * s, 1 * s, "#242737");
        drawProceduralRect(ctx, 5 * s, 9 * s, 6 * s, 1 * s, "#2b2e40");
    }, "wall");
}

/** Create a ground texture. */
export function makeGroundTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#2f2419");
        drawProceduralRect(ctx, 0, 4 * s, 16 * s, 12 * s, "#4a3322");
        drawProceduralRect(ctx, 0, 5 * s, 7 * s, 4 * s, "#5a3d29");
        drawProceduralRect(ctx, 8 * s, 6 * s, 8 * s, 4 * s, "#3e2b1e");
        drawProceduralRect(ctx, 3 * s, 11 * s, 9 * s, 4 * s, "#5b3f2a");
        drawProceduralRect(ctx, 0, 0, 16 * s, 4 * s, "#1f6b3a");
        drawProceduralRect(ctx, 0, 0, 16 * s, 1 * s, "#56b96a");
        drawProceduralRect(ctx, 1 * s, 1 * s, 3 * s, 3 * s, "#43a857");
        drawProceduralRect(ctx, 6 * s, 1 * s, 4 * s, 3 * s, "#5ecb6c");
        drawProceduralRect(ctx, 12 * s, 1 * s, 3 * s, 3 * s, "#3f9f4f");
        drawProceduralRect(ctx, 2 * s, 7 * s, 2 * s, 1 * s, "#7a5537");
        drawProceduralRect(ctx, 10 * s, 12 * s, 3 * s, 1 * s, "#7a5537");
    }, "ground");
}

/** Create a spike texture. */
export function makeSpikeTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 2 * s, 14 * s, 12 * s, 2 * s, "#111827");
        drawProceduralPolygon(
            ctx,
            [
                { x: 8 * s, y: 0 },
                { x: 16 * s, y: 10 * s },
                { x: 12 * s, y: 16 * s },
                { x: 4 * s, y: 16 * s },
                { x: 0, y: 10 * s },
            ],
            "#7f1d2d",
        );
        drawProceduralPolygon(
            ctx,
            [
                { x: 8 * s, y: 3 * s },
                { x: 12 * s, y: 8 * s },
                { x: 8 * s, y: 12 * s },
                { x: 4 * s, y: 8 * s },
            ],
            "#f43f5e",
        );
        drawProceduralPolygon(
            ctx,
            [
                { x: 8 * s, y: 3 * s },
                { x: 9.5 * s, y: 8 * s },
                { x: 8 * s, y: 11 * s },
                { x: 6.5 * s, y: 8 * s },
            ],
            "#fecdd3",
        );
    }, "spike");
}

/** Create a checkpoint texture. */
export function makeCheckpointTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 6 * s, 1 * s, 4 * s, 15 * s, "#1e3a5f");
        drawProceduralRect(ctx, 7 * s, 0, 2 * s, 16 * s, "#7dd3fc");
        drawProceduralRect(ctx, 3 * s, 2 * s, 4 * s, 11 * s, "#2563eb");
        drawProceduralRect(ctx, 9 * s, 4 * s, 4 * s, 9 * s, "#1d4ed8");
        drawProceduralRect(ctx, 4 * s, 3 * s, 9 * s, 2 * s, "#93c5fd");
        drawProceduralRect(ctx, 5 * s, 12 * s, 8 * s, 2 * s, "#172554");
        drawProceduralCircle(ctx, 8 * s, 8 * s, 3 * s, "#38bdf8");
        drawProceduralCircle(ctx, 8 * s, 8 * s, 1.5 * s, "#eff6ff");
    }, "checkpoint");
}

/** Create a UI border texture. */
export function makeUITexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#0f111a");
        drawProceduralRect(ctx, 1 * s, 1 * s, 14 * s, 14 * s, "#232536");
        drawProceduralRect(ctx, 2 * s, 2 * s, 12 * s, 12 * s, "#31354a");
        drawProceduralRect(ctx, 2 * s, 2 * s, 12 * s, 1 * s, "#6c7086");
        drawProceduralRect(ctx, 2 * s, 13 * s, 12 * s, 1 * s, "#111827");
        drawProceduralRect(ctx, 4 * s, 4 * s, 8 * s, 1 * s, "#454a60");
    }, "ui");
}

/** Create a heart texture. */
export function makeHeartTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        ctx.fillStyle = "#7f1d2d";
        ctx.beginPath();
        ctx.moveTo(8 * s, 14 * s);
        ctx.bezierCurveTo(0, 10 * s, 0, 4 * s, 4 * s, 2 * s);
        ctx.bezierCurveTo(6 * s, 1 * s, 8 * s, 3 * s, 8 * s, 5 * s);
        ctx.bezierCurveTo(8 * s, 3 * s, 10 * s, 1 * s, 12 * s, 2 * s);
        ctx.bezierCurveTo(16 * s, 4 * s, 16 * s, 10 * s, 8 * s, 14 * s);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f43f5e";
        ctx.beginPath();
        ctx.moveTo(8 * s, 12 * s);
        ctx.bezierCurveTo(3 * s, 9 * s, 3 * s, 5 * s, 5 * s, 3.5 * s);
        ctx.bezierCurveTo(6.5 * s, 2.5 * s, 8 * s, 4 * s, 8 * s, 5.5 * s);
        ctx.bezierCurveTo(8 * s, 4 * s, 9.5 * s, 2.5 * s, 11 * s, 3.5 * s);
        ctx.bezierCurveTo(13 * s, 5 * s, 13 * s, 9 * s, 8 * s, 12 * s);
        ctx.closePath();
        ctx.fill();
        drawProceduralCircle(ctx, 5 * s, 5 * s, 1.4 * s, "#fecdd3");
    }, "heart");
}

// ─── New: tiles and environment ──────────────────────────────────────────────

/** Create a tree texture. */
export function makeTreeTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 6 * s, 8 * s, 4 * s, 8 * s, "#4a2f1c");
        drawProceduralRect(ctx, 7 * s, 8 * s, 1 * s, 8 * s, "#8a5a34");
        drawProceduralCircle(ctx, 8 * s, 6 * s, 6.5 * s, "#14532d");
        drawProceduralCircle(ctx, 5 * s, 7 * s, 4 * s, "#166534");
        drawProceduralCircle(ctx, 11 * s, 7 * s, 4 * s, "#166534");
        drawProceduralCircle(ctx, 8 * s, 4 * s, 4 * s, "#22c55e");
        drawProceduralCircle(ctx, 6 * s, 4 * s, 1.5 * s, "#86efac");
    }, "tree");
}

/** Create a water texture. */
export function makeWaterTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#0f3a5f");
        drawProceduralRect(ctx, 0, 0, 16 * s, 5 * s, "#145c8a");
        drawProceduralRect(ctx, 0, 5 * s, 16 * s, 5 * s, "#0f4f7a");
        drawProceduralRect(ctx, 0, 10 * s, 16 * s, 6 * s, "#0b3558");
        drawProceduralRect(ctx, 1 * s, 2 * s, 6 * s, 1 * s, "#67e8f9");
        drawProceduralRect(ctx, 9 * s, 6 * s, 5 * s, 1 * s, "#38bdf8");
        drawProceduralRect(ctx, 3 * s, 12 * s, 7 * s, 1 * s, "#1e88bd");
        drawProceduralCircle(ctx, 12 * s, 3 * s, 1.5 * s, "#bae6fd");
    }, "water");
}

/** Create a stone texture. */
export function makeStoneTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#3f4652");
        drawProceduralRect(ctx, 1 * s, 1 * s, 6 * s, 6 * s, "#586170");
        drawProceduralRect(ctx, 9 * s, 2 * s, 5 * s, 5 * s, "#505967");
        drawProceduralRect(ctx, 4 * s, 10 * s, 8 * s, 4 * s, "#626b78");
        drawProceduralRect(ctx, 0, 7 * s, 16 * s, 1 * s, "#252a33");
        drawProceduralRect(ctx, 8 * s, 0, 1 * s, 7 * s, "#252a33");
        drawProceduralRect(ctx, 3 * s, 3 * s, 3 * s, 1 * s, "#7d8795");
        drawProceduralRect(ctx, 10 * s, 3 * s, 3 * s, 1 * s, "#737d8a");
        drawProceduralRect(ctx, 5 * s, 12 * s, 6 * s, 1 * s, "#7d8795");
    }, "stone");
}

/** Create a sand texture. */
export function makeSandTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#b99045");
        drawProceduralRect(ctx, 0, 0, 16 * s, 4 * s, "#e0c57a");
        drawProceduralRect(ctx, 2 * s, 5 * s, 4 * s, 2 * s, "#c9a75a");
        drawProceduralRect(ctx, 10 * s, 7 * s, 4 * s, 2 * s, "#a87f3a");
        drawProceduralRect(ctx, 5 * s, 12 * s, 3 * s, 2 * s, "#d5b765");
        drawProceduralRect(ctx, 1 * s, 2 * s, 2 * s, 1 * s, "#fff0a8");
        drawProceduralRect(ctx, 13 * s, 12 * s, 2 * s, 1 * s, "#7a5a28");
    }, "sand");
}

/** Create a snow texture. */
export function makeSnowTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#b9d5e4");
        drawProceduralRect(ctx, 0, 0, 16 * s, 5 * s, "#f8fbff");
        drawProceduralRect(ctx, 2 * s, 2 * s, 3 * s, 3 * s, "#dcecf6");
        drawProceduralRect(ctx, 10 * s, 4 * s, 4 * s, 4 * s, "#eef7ff");
        drawProceduralRect(ctx, 6 * s, 10 * s, 3 * s, 3 * s, "#d7e8f2");
        drawProceduralCircle(ctx, 8 * s, 3 * s, 1 * s, "#8fb4c8");
        drawProceduralCircle(ctx, 3 * s, 11 * s, 1 * s, "#8fb4c8");
        drawProceduralCircle(ctx, 12 * s, 8 * s, 1 * s, "#8fb4c8");
    }, "snow");
}

/** Create a ladder texture. */
export function makeLadderTexture(): HTMLCanvasElement {
    return createTexture((ctx, w, _h) => {
        const s = w / 16;
        drawProceduralRect(ctx, 0, 0, 16 * s, 16 * s, "#1b140f");
        drawProceduralRect(ctx, 0, 0, 3 * s, 16 * s, "#6b4427");
        drawProceduralRect(ctx, 13 * s, 0, 3 * s, 16 * s, "#6b4427");
        drawProceduralRect(ctx, 1 * s, 0, 1 * s, 16 * s, "#a36a3b");
        drawProceduralRect(ctx, 14 * s, 0, 1 * s, 16 * s, "#a36a3b");
        for (let i = 0; i < 5; i++) {
            drawProceduralRect(
                ctx,
                2 * s,
                (i * 3 + 1) * s,
                12 * s,
                s,
                "#8b5a34",
            );
            drawProceduralRect(
                ctx,
                2 * s,
                (i * 3 + 2) * s,
                12 * s,
                s,
                "#3f2819",
            );
        }
    }, "ladder");
}
