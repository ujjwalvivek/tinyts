import { createTexture } from "@ujjwalvivek/tinyts";

export interface InteractableSprite {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface InteractableAtlas {
    image: HTMLCanvasElement;
    sprites: Record<
        "grappleSocket" | "grappleSocketHot" | "dataShard" | "dataShardHot",
        InteractableSprite
    >;
}

const sprites = {
    grappleSocket: { x: 0, y: 0, w: 64, h: 64 },
    grappleSocketHot: { x: 64, y: 0, w: 64, h: 64 },
    dataShard: { x: 0, y: 72, w: 48, h: 48 },
    dataShardHot: { x: 56, y: 72, w: 48, h: 48 },
} satisfies InteractableAtlas["sprites"];

function drawSocket(
    ctx: CanvasRenderingContext2D,
    hot: boolean,
    ox: number,
    oy: number,
) {
    const blue = hot ? "#78d2f0" : "#4d8fb0";
    const white = hot ? "#d8f3ff" : "#9fd7ec";
    const amber = hot ? "#d9a051" : "#b98238";

    ctx.fillStyle = hot ? "#071017" : "#05070a";
    ctx.fillRect(8 + ox, 15 + oy, 48, 34);
    ctx.fillStyle = hot ? "#142531" : "#0b1118";
    ctx.fillRect(11 + ox, 18 + oy, 42, 28);
    ctx.fillStyle = "#26323d";
    ctx.fillRect(15 + ox, 22 + oy, 34, 20);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(20 + ox, 26 + oy, 24, 12);
    ctx.fillStyle = blue;
    ctx.fillRect(25 + ox, 28 + oy, 14, 8);
    ctx.fillStyle = white;
    ctx.fillRect(28 + ox, 30 + oy, 5, 3);
    ctx.fillStyle = amber;
    ctx.fillRect(13 + ox, 20 + oy, 8, 3);
    ctx.fillRect(43 + ox, 41 + oy, 8, 3);
    ctx.fillStyle = "#3a4854";
    ctx.fillRect(5 + ox, 25 + oy, 8, 14);
    ctx.fillRect(51 + ox, 25 + oy, 8, 14);
    ctx.fillRect(26 + ox, 11 + oy, 12, 6);
    ctx.fillRect(26 + ox, 47 + oy, 12, 6);
    if (hot) {
        ctx.fillStyle = "#244a5d";
        ctx.fillRect(18 + ox, 12 + oy, 28, 1);
        ctx.fillRect(18 + ox, 51 + oy, 28, 1);
        ctx.fillRect(7 + ox, 21 + oy, 1, 22);
        ctx.fillRect(56 + ox, 21 + oy, 1, 22);
    }
}

function drawShard(
    ctx: CanvasRenderingContext2D,
    hot: boolean,
    ox: number,
    oy: number,
) {
    const blue = hot ? "#76dcff" : "#4d8fb0";
    const blue2 = hot ? "#d8f3ff" : "#9fd7ec";
    const amber = hot ? "#e0a758" : "#b98238";

    ctx.fillStyle = "#05070a";
    ctx.fillRect(13 + ox, 7 + oy, 22, 34);
    ctx.fillStyle = hot ? "#112734" : "#101821";
    ctx.fillRect(16 + ox, 10 + oy, 16, 28);
    ctx.fillStyle = blue;
    ctx.fillRect(18 + ox, 13 + oy, 12, 16);
    ctx.fillStyle = blue2;
    ctx.fillRect(20 + ox, 15 + oy, 5, 5);
    ctx.fillStyle = amber;
    ctx.fillRect(17 + ox, 33 + oy, 14, 3);
    ctx.fillStyle = "#3a4854";
    ctx.fillRect(9 + ox, 16 + oy, 5, 16);
    ctx.fillRect(34 + ox, 16 + oy, 5, 16);
    ctx.fillStyle = hot ? "#244a5d" : "#1b2833";
    ctx.fillRect(20 + ox, 5 + oy, 8, 3);
    ctx.fillRect(20 + ox, 40 + oy, 8, 3);
}

export function createInteractableAtlas(): InteractableAtlas {
    const image = createTexture(
        (ctx) => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 128, 128);
            drawSocket(ctx, false, 0, 0);
            drawSocket(ctx, true, 64, 0);
            drawShard(ctx, false, 0, 72);
            drawShard(ctx, true, 56, 72);
        },
        "blackline_interactables_v1",
        128,
    );

    return { image, sprites };
}
