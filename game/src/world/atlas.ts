import { createTexture } from "@ujjwalvivek/tinyts";
import { WORLD_PALETTE as P } from "./palette";

export interface AtlasSprite {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface WorldAtlas {
    image: HTMLCanvasElement;
    sprites: Record<
        | "facadeA"
        | "facadeB"
        | "grate"
        | "roofCap"
        | "roofUnder"
        | "edgeLeft"
        | "edgeRight"
        | "rib"
        | "vent"
        | "pipeV"
        | "pipeH"
        | "lightAmber"
        | "lightCyan"
        | "panelSmall"
        | "antenna"
        | "brace"
        | "distantFacadeA"
        | "distantFacadeB",
        AtlasSprite
    >;
}

const sprites = {
    facadeA: { x: 0, y: 0, w: 64, h: 64 },
    facadeB: { x: 64, y: 0, w: 64, h: 64 },
    grate: { x: 128, y: 0, w: 64, h: 64 },
    roofCap: { x: 0, y: 72, w: 128, h: 32 },
    roofUnder: { x: 128, y: 72, w: 128, h: 32 },
    edgeLeft: { x: 264, y: 0, w: 16, h: 128 },
    edgeRight: { x: 288, y: 0, w: 16, h: 128 },
    rib: { x: 312, y: 0, w: 16, h: 128 },
    vent: { x: 0, y: 112, w: 64, h: 32 },
    pipeV: { x: 72, y: 112, w: 16, h: 128 },
    pipeH: { x: 96, y: 112, w: 128, h: 16 },
    lightAmber: { x: 232, y: 112, w: 16, h: 16 },
    lightCyan: { x: 256, y: 112, w: 16, h: 16 },
    panelSmall: { x: 280, y: 136, w: 32, h: 32 },
    antenna: { x: 336, y: 0, w: 64, h: 64 },
    brace: { x: 336, y: 72, w: 64, h: 64 },
    distantFacadeA: { x: 0, y: 256, w: 96, h: 96 },
    distantFacadeB: { x: 104, y: 256, w: 96, h: 96 },
} satisfies WorldAtlas["sprites"];

function panel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    top = "rgba(164, 175, 187, 0.08)",
    bottom = "rgba(0, 0, 0, 0.32)",
) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = top;
    ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = bottom;
    ctx.fillRect(x, y + h - 2, w, 2);
}

function sprite(
    ctx: CanvasRenderingContext2D,
    id: keyof typeof sprites,
    draw: (r: AtlasSprite) => void,
) {
    const r = sprites[id];
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();
    draw(r);
    ctx.restore();
}

export function createWorldAtlas(): WorldAtlas {
    const image = createTexture(
        (ctx) => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 512, 512);

            sprite(ctx, "facadeA", (r) => {
                ctx.fillStyle = P.steel0;
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let y = 0; y < 64; y += 16) {
                    for (let x = 0; x < 64; x += 16) {
                        const shade = (x + y) % 32 === 0 ? P.steel2 : P.steel1;
                        panel(ctx, r.x + x, r.y + y, 16, 16, shade);
                    }
                }
                ctx.fillStyle = P.void;
                for (let x = 16; x < 64; x += 16)
                    ctx.fillRect(r.x + x - 1, r.y, 2, 64);
                for (let y = 16; y < 64; y += 16)
                    ctx.fillRect(r.x, r.y + y - 1, 64, 2);
                ctx.fillStyle = "rgba(77, 143, 176, 0.16)";
                ctx.fillRect(r.x + 8, r.y + 9, 9, 3);
                ctx.fillRect(r.x + 35, r.y + 20, 12, 3);
                ctx.fillRect(r.x + 20, r.y + 44, 8, 3);
                ctx.fillStyle = "rgba(185, 130, 56, 0.14)";
                ctx.fillRect(r.x + 49, r.y + 50, 3, 5);
                ctx.fillStyle = "rgba(164, 175, 187, 0.08)";
                ctx.fillRect(r.x + 5, r.y + 30, 20, 1);
                ctx.fillRect(r.x + 38, r.y + 5, 16, 1);
            });

            sprite(ctx, "facadeB", (r) => {
                ctx.fillStyle = "#05080c";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let y = 0; y < 64; y += 8) {
                    panel(
                        ctx,
                        r.x,
                        r.y + y,
                        64,
                        8,
                        y % 16 === 0 ? "#0d141c" : "#091017",
                    );
                }
                ctx.fillStyle = "rgba(77, 90, 105, 0.22)";
                ctx.fillRect(r.x + 8, r.y + 2, 3, 60);
                ctx.fillRect(r.x + 52, r.y + 2, 3, 60);
                ctx.fillStyle = "rgba(77, 143, 176, 0.11)";
                for (let y = 6; y < 60; y += 13) {
                    ctx.fillRect(r.x + 18, r.y + y, 13, 2);
                    ctx.fillRect(r.x + 36, r.y + y + 5, 11, 2);
                }
                ctx.fillStyle = "rgba(185, 130, 56, 0.13)";
                ctx.fillRect(r.x, r.y + 22, 64, 1);
                ctx.fillRect(r.x, r.y + 46, 64, 1);
            });

            sprite(ctx, "grate", (r) => {
                ctx.fillStyle = "#06090d";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let i = 0; i < 64; i += 8) {
                    ctx.fillStyle = i % 16 === 0 ? "#141d26" : "#0b1118";
                    ctx.fillRect(r.x, r.y + i, 64, 4);
                    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
                    ctx.fillRect(r.x, r.y + i + 5, 64, 2);
                }
                ctx.fillStyle = "rgba(86, 97, 109, 0.22)";
                for (let x = 6; x < 64; x += 14)
                    ctx.fillRect(r.x + x, r.y + 4, 2, 56);
            });

            sprite(ctx, "distantFacadeA", (r) => {
                ctx.fillStyle = "#070b0f";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let y = 0; y < 96; y += 24) {
                    for (let x = 0; x < 96; x += 24) {
                        ctx.fillStyle =
                            (x + y) % 48 === 0 ? "#0b1117" : "#080d12";
                        ctx.fillRect(r.x + x, r.y + y, 23, 23);
                        ctx.fillStyle = "#05080c";
                        ctx.fillRect(r.x + x, r.y + y + 22, 23, 2);
                        ctx.fillRect(r.x + x + 22, r.y + y, 2, 23);
                    }
                }
                ctx.fillStyle = "#111922";
                ctx.fillRect(r.x + 10, r.y + 18, 1, 62);
                ctx.fillRect(r.x + 52, r.y + 6, 1, 84);
                ctx.fillStyle = "#18222b";
                ctx.fillRect(r.x + 16, r.y + 28, 14, 1);
                ctx.fillRect(r.x + 62, r.y + 42, 18, 1);
                ctx.fillRect(r.x + 34, r.y + 73, 12, 1);
                ctx.fillStyle = "#233442";
                ctx.fillRect(r.x + 70, r.y + 16, 4, 1);
                ctx.fillStyle = "#2a2116";
                ctx.fillRect(r.x + 22, r.y + 58, 3, 1);
            });

            sprite(ctx, "distantFacadeB", (r) => {
                ctx.fillStyle = "#05090d";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let y = 4; y < 96; y += 14) {
                    ctx.fillStyle = y % 28 === 4 ? "#0c1218" : "#080d12";
                    ctx.fillRect(r.x, r.y + y, r.w, 8);
                    ctx.fillStyle = "#040609";
                    ctx.fillRect(r.x, r.y + y + 8, r.w, 2);
                }
                ctx.fillStyle = "#121b24";
                ctx.fillRect(r.x + 14, r.y + 8, 2, 80);
                ctx.fillRect(r.x + 76, r.y + 14, 2, 72);
                ctx.fillStyle = "#1b2833";
                ctx.fillRect(r.x + 24, r.y + 20, 18, 1);
                ctx.fillRect(r.x + 45, r.y + 36, 28, 1);
                ctx.fillRect(r.x + 20, r.y + 66, 20, 1);
                ctx.fillStyle = "#263a48";
                ctx.fillRect(r.x + 58, r.y + 54, 5, 1);
                ctx.fillStyle = "#322718";
                ctx.fillRect(r.x + 30, r.y + 82, 4, 1);
            });

            sprite(ctx, "roofCap", (r) => {
                panel(ctx, r.x, r.y, r.w, 10, "#151f29", P.hazardSoft);
                ctx.fillStyle = "#070a0e";
                ctx.fillRect(r.x, r.y + 10, r.w, 12);
                ctx.fillStyle = P.shadow;
                ctx.fillRect(r.x, r.y + 24, r.w, 8);
                ctx.fillStyle = "rgba(164, 175, 187, 0.14)";
                ctx.fillRect(r.x + 12, r.y + 5, 28, 2);
                ctx.fillRect(r.x + 76, r.y + 6, 30, 2);
                ctx.fillStyle = P.hazardSoft;
                for (let x = 4; x < 128; x += 28)
                    ctx.fillRect(r.x + x, r.y + 15, 10, 3);
            });

            sprite(ctx, "roofUnder", (r) => {
                ctx.fillStyle = "#030507";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                for (let x = 0; x < 128; x += 16) {
                    ctx.fillStyle = x % 32 === 0 ? "#0b1118" : "#070b10";
                    ctx.fillRect(r.x + x, r.y, 12, 32);
                }
                ctx.fillStyle = "rgba(77, 90, 105, 0.18)";
                ctx.fillRect(r.x, r.y + 8, r.w, 2);
                ctx.fillRect(r.x, r.y + 22, r.w, 2);
            });

            sprite(ctx, "edgeLeft", (r) => {
                ctx.fillStyle = P.shadow;
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#121b24";
                ctx.fillRect(r.x + 8, r.y, 5, r.h);
                ctx.fillStyle = "rgba(164, 175, 187, 0.08)";
                ctx.fillRect(r.x + 13, r.y, 1, r.h);
            });

            sprite(ctx, "edgeRight", (r) => {
                ctx.fillStyle = "#040609";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#17212a";
                ctx.fillRect(r.x + 3, r.y, 5, r.h);
                ctx.fillStyle = "rgba(164, 175, 187, 0.1)";
                ctx.fillRect(r.x + 2, r.y, 1, r.h);
            });

            sprite(ctx, "rib", (r) => {
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#17212a";
                ctx.fillRect(r.x + 5, r.y, 6, r.h);
                ctx.fillStyle = "#05070a";
                for (let y = 10; y < 128; y += 22)
                    ctx.fillRect(r.x + 3, r.y + y, 10, 3);
                ctx.fillStyle = "rgba(164, 175, 187, 0.12)";
                ctx.fillRect(r.x + 11, r.y, 1, r.h);
            });

            sprite(ctx, "vent", (r) => {
                panel(ctx, r.x, r.y, r.w, r.h, "#101821");
                ctx.fillStyle = "#05070a";
                for (let y = 7; y < 28; y += 6)
                    ctx.fillRect(r.x + 8, r.y + y, 48, 2);
                ctx.fillStyle = "rgba(164, 175, 187, 0.12)";
                ctx.fillRect(r.x + 6, r.y + 4, 52, 1);
            });

            sprite(ctx, "pipeV", (r) => {
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#1b2630";
                ctx.fillRect(r.x + 5, r.y, 6, r.h);
                ctx.fillStyle = "#070a0e";
                for (let y = 12; y < 128; y += 24)
                    ctx.fillRect(r.x + 3, r.y + y, 10, 5);
                ctx.fillStyle = "rgba(164, 175, 187, 0.1)";
                ctx.fillRect(r.x + 10, r.y, 1, r.h);
            });

            sprite(ctx, "pipeH", (r) => {
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#1b2630";
                ctx.fillRect(r.x, r.y + 5, r.w, 6);
                ctx.fillStyle = "#070a0e";
                for (let x = 14; x < 128; x += 26)
                    ctx.fillRect(r.x + x, r.y + 3, 5, 10);
                ctx.fillStyle = "rgba(164, 175, 187, 0.1)";
                ctx.fillRect(r.x, r.y + 4, r.w, 1);
            });

            for (const id of ["lightAmber", "lightCyan"] as const) {
                sprite(ctx, id, (r) => {
                    const color = id === "lightAmber" ? P.hazard : P.interact;
                    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
                    ctx.fillRect(r.x + 2, r.y + 2, 12, 12);
                    ctx.fillStyle = color;
                    ctx.fillRect(r.x + 5, r.y + 5, 6, 6);
                    ctx.fillStyle =
                        id === "lightAmber"
                            ? "rgba(185, 130, 56, 0.2)"
                            : "rgba(77, 143, 176, 0.2)";
                    ctx.fillRect(r.x + 3, r.y + 3, 10, 10);
                });
            }

            sprite(ctx, "panelSmall", (r) => {
                panel(ctx, r.x, r.y, r.w, r.h, "#0e151d");
                ctx.fillStyle = "rgba(77, 143, 176, 0.1)";
                ctx.fillRect(r.x + 7, r.y + 7, 18, 2);
                ctx.fillRect(r.x + 7, r.y + 15, 11, 2);
                ctx.fillStyle = P.hazardSoft;
                ctx.fillRect(r.x + 23, r.y + 23, 4, 4);
            });

            sprite(ctx, "antenna", (r) => {
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.fillStyle = "#1b2630";
                ctx.fillRect(r.x + 30, r.y + 10, 4, 48);
                ctx.fillRect(r.x + 20, r.y + 22, 24, 3);
                ctx.fillRect(r.x + 24, r.y + 38, 16, 3);
                ctx.fillStyle = P.hazard;
                ctx.fillRect(r.x + 29, r.y + 6, 6, 4);
            });

            sprite(ctx, "brace", (r) => {
                ctx.fillStyle = "rgba(0, 0, 0, 0)";
                ctx.fillRect(r.x, r.y, r.w, r.h);
                ctx.strokeStyle = "#17212a";
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(r.x + 6, r.y + 58);
                ctx.lineTo(r.x + 58, r.y + 6);
                ctx.moveTo(r.x + 6, r.y + 6);
                ctx.lineTo(r.x + 58, r.y + 58);
                ctx.stroke();
                ctx.fillStyle = "rgba(164, 175, 187, 0.08)";
                ctx.fillRect(r.x + 5, r.y + 30, 54, 2);
            });
        },
        "blackline_world_atlas_v1",
        512,
    );

    return { image, sprites };
}
