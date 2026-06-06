import {
    Vec2,
    vec2,
    aabb,
    drawRect,
    drawSprite,
    drawCircle,
    drawLine,
    time,
} from "@ujjwalvivek/tinyts";
import type { Building } from "../game/types";
import type { AtlasSprite, WorldAtlas } from "./atlas";
import { WORLD_PALETTE as P } from "./palette";

export interface BackgroundStar {
    pos: Vec2;
    size: number;
    speed: number;
    phase: number;
}

const TILE_SIZE = 64;
const ROOF_HEIGHT = 32;

function hash(n: number) {
    return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

function spriteOptions(s: AtlasSprite) {
    return {
        sourceX: s.x,
        sourceY: s.y,
        sourceWidth: s.w,
        sourceHeight: s.h,
    };
}

function drawAtlasSprite(
    atlas: WorldAtlas,
    id: keyof WorldAtlas["sprites"],
    pos: Vec2,
    size: Vec2,
) {
    drawSprite(atlas.image, pos, size, spriteOptions(atlas.sprites[id]));
}

function drawEmissiveRect(pos: Vec2, size: Vec2, core: string, glow: string) {
    drawRect(vec2(pos.x - 1, pos.y - 1), vec2(size.x + 2, size.y + 2), glow);
    drawRect(pos, size, core);
}

function drawBrokenLine(
    start: Vec2,
    length: number,
    horizontal: boolean,
    color: string,
    seed: number,
    minSegment = 18,
    maxSegment = 54,
) {
    let cursor = 0;
    while (cursor < length) {
        const segmentSeed = hash(seed + cursor * 0.17);
        const gap = 8 + Math.floor(segmentSeed * 18);
        const segment =
            minSegment +
            Math.floor(hash(seed + cursor * 0.31) * (maxSegment - minSegment));
        cursor += gap;
        if (cursor >= length) break;
        const drawLength = Math.min(segment, length - cursor);
        if (segmentSeed > 0.32) {
            drawRect(
                horizontal
                    ? vec2(start.x + cursor, start.y)
                    : vec2(start.x, start.y + cursor),
                horizontal ? vec2(drawLength, 1) : vec2(1, drawLength),
                color,
            );
        }
        cursor += segment;
    }
}

function drawShootingStar(seed: number, y: number, speed: number) {
    const cycle = 12 + hash(seed) * 9;
    const t = ((time * speed + seed * 97) % cycle) / cycle;
    if (t > 0.12) return;

    const progress = t / 0.12;
    const x = 1200 - progress * 380 + hash(seed + 3) * 120;
    const sy = y + progress * 180;
    const fade = progress < 0.18 ? progress / 0.18 : 1 - progress;
    const core = fade > 0.45 ? "#d8e8ef" : "#6f8798";
    const tail = fade > 0.45 ? "#435969" : "#263541";
    drawRect(vec2(x, sy), vec2(2, 1), core);
    drawLine(vec2(x + 5, sy - 3), vec2(x + 34, sy - 20), tail, 1);
    drawLine(vec2(x + 30, sy - 18), vec2(x + 58, sy - 34), "#17232c", 1);
}

function drawTiledAtlasSprite(
    atlas: WorldAtlas,
    id: keyof WorldAtlas["sprites"],
    pos: Vec2,
    size: Vec2,
    tileSize: Vec2,
    cameraPos: Vec2,
    yLimit?: number,
) {
    const sprite = atlas.sprites[id];
    const visibleLeft = cameraPos.x - 760;
    const visibleRight = cameraPos.x + 760;
    const visibleTop = cameraPos.y - 440;
    const visibleBottom = cameraPos.y + 460;
    const startX = Math.max(pos.x, visibleLeft);
    const endX = Math.min(pos.x + size.x, visibleRight);
    const startY = Math.max(pos.y, visibleTop);
    const endY = Math.min(
        pos.y + size.y,
        yLimit ?? visibleBottom,
        visibleBottom,
    );
    if (endX <= startX || endY <= startY) return;

    const firstCol = Math.floor((startX - pos.x) / tileSize.x);
    const lastCol = Math.floor((endX - pos.x - 0.001) / tileSize.x);
    const firstRow = Math.floor((startY - pos.y) / tileSize.y);
    const lastRow = Math.floor((endY - pos.y - 0.001) / tileSize.y);

    for (let row = firstRow; row <= lastRow; row++) {
        for (let col = firstCol; col <= lastCol; col++) {
            const tileX = pos.x + col * tileSize.x;
            const tileY = pos.y + row * tileSize.y;
            const drawX = Math.max(tileX, pos.x);
            const drawY = Math.max(tileY, pos.y);
            const drawW = Math.min(tileX + tileSize.x, pos.x + size.x) - drawX;
            const drawH =
                Math.min(
                    tileY + tileSize.y,
                    pos.y + size.y,
                    yLimit ?? Infinity,
                ) - drawY;
            if (drawW <= 0 || drawH <= 0) continue;

            drawSprite(atlas.image, vec2(drawX, drawY), vec2(drawW, drawH), {
                sourceX: sprite.x + ((drawX - tileX) / tileSize.x) * sprite.w,
                sourceY: sprite.y + ((drawY - tileY) / tileSize.y) * sprite.h,
                sourceWidth: (drawW / tileSize.x) * sprite.w,
                sourceHeight: (drawH / tileSize.y) * sprite.h,
            });
        }
    }
}

function drawParallaxLayer(
    atlas: WorldAtlas,
    cameraX: number,
    parallax: number,
    baseY: number,
    spacing: number,
    color: string,
    detailColor: string,
    heightMin: number,
    heightRange: number,
    detailStrength: number,
) {
    const viewX = cameraX - 640;
    const layerX = viewX * parallax;
    const start = Math.floor(layerX / spacing) - 2;
    for (let i = start; i < start + 13; i++) {
        const seed = hash(i * 19.7 + parallax * 100);
        const w = 90 + Math.floor(seed * 140);
        const h = heightMin + Math.floor(hash(i * 5.1) * heightRange);
        const x = i * spacing - layerX;
        const y = baseY - h;

        drawRect(vec2(x, y), vec2(w, h), color);
        drawTiledAtlasSprite(
            atlas,
            seed > 0.5 ? "distantFacadeA" : "distantFacadeB",
            vec2(x, y + 16),
            vec2(w, Math.max(0, h - 16)),
            vec2(96, 96),
            vec2(640, 360),
        );
        drawRect(vec2(x, y), vec2(w, 14), "rgba(0, 0, 0, 0.18)");

        const lightRows = Math.floor(h / 70);
        for (let row = 0; row < lightRows; row++) {
            const lit = hash(i * 11.3 + row * 5.7 + parallax * 8);
            if (lit < 1 - detailStrength) continue;
            const lx =
                x + 18 + Math.floor(hash(row + i * 0.4) * Math.max(10, w - 42));
            const ly = y + 34 + row * 66 + Math.floor(hash(i + row) * 18);
            const warm = lit > 0.93;
            drawRect(
                vec2(lx, ly),
                vec2(warm ? 4 : 6, 1),
                warm ? P.distantWarm : P.distantLight,
            );
        }

        if (seed > 0.76) {
            drawRect(vec2(x + w * 0.5 - 3, y - 34), vec2(6, 34), color);
            drawRect(vec2(x + w * 0.5 - 15, y - 22), vec2(30, 3), detailColor);
        }
    }
}

function drawLowerCity(cameraX: number) {
    const viewX = cameraX - 640;
    const layerX = viewX * 0.48;
    const spacing = 150;
    const start = Math.floor(layerX / spacing) - 2;

    for (let i = start; i < start + 13; i++) {
        const seed = hash(i * 8.3);
        const w = 86 + Math.floor(seed * 130);
        const h = 58 + Math.floor(hash(i * 4.9) * 78);
        const x = i * spacing - layerX;
        const y = 720 - h;
        const topStep = 12 + Math.floor(hash(i + 2) * 22);

        drawRect(vec2(x, y + topStep), vec2(w, h - topStep), "#06090d");
        drawRect(vec2(x + 12, y), vec2(w - 24, topStep + 18), "#080c11");
        drawRect(vec2(x + w - 18, y + topStep + 8), vec2(10, h), "#030507");
        if (seed > 0.55) {
            drawRect(vec2(x + 18, y + topStep + 24), vec2(34, 1), "#1a242e");
        }
        if (seed > 0.78) {
            drawRect(
                vec2(x + w - 46, y + topStep + 42),
                vec2(18, 1),
                "#263a48",
            );
        }
    }
}

export function renderWorldBackground(
    cameraPos: Vec2,
    stars: BackgroundStar[],
    atlas: WorldAtlas,
) {
    const skyBands = [
        ["#07090d", 0, 96],
        ["#080b10", 96, 96],
        ["#090d13", 192, 96],
        ["#0a1016", 288, 96],
        ["#0b1118", 384, 104],
        ["#0c1218", 488, 96],
    ] as const;
    for (const [color, y, h] of skyBands) {
        drawRect(vec2(0, y), vec2(1280, h), color);
    }
    drawRect(vec2(0, 0), vec2(1280, 110), "#06080c");

    for (const star of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(time * 1.6 + star.phase);
        const isBright = star.size > 0.9 && twinkle > 0.78;
        const color = isBright ? "#b6c7d3" : "#4f7890";
        const pixel = isBright ? 1.25 : 1;
        if (star.size > 0.88 && twinkle > 0.84) {
            drawCircle(star.pos, 0.8, color);
        } else {
            drawRect(star.pos, vec2(pixel, pixel), color);
        }
    }
    drawShootingStar(1.7, 64, 0.62);
    drawShootingStar(4.3, 118, 0.52);

    drawParallaxLayer(
        atlas,
        cameraPos.x,
        0.11,
        720,
        180,
        P.farMassDeep,
        "rgba(86, 97, 109, 0.02)",
        220,
        300,
        0.08,
    );
    drawParallaxLayer(
        atlas,
        cameraPos.x,
        0.22,
        748,
        150,
        P.farMass,
        "rgba(86, 97, 109, 0.035)",
        170,
        260,
        0.14,
    );
    drawParallaxLayer(
        atlas,
        cameraPos.x,
        0.38,
        780,
        130,
        P.midMass,
        "rgba(86, 97, 109, 0.055)",
        110,
        210,
        0.2,
    );

    drawLowerCity(cameraPos.x);
}

export function renderBuilding(
    building: Building,
    atlas: WorldAtlas,
    cameraPos: Vec2,
) {
    const top = building.aabb.pos.y;
    const left = building.aabb.pos.x;
    const width = building.aabb.size.x;
    const height = building.aabb.size.y;
    const facadeTop = top + ROOF_HEIGHT;
    const facadeHeight = Math.max(0, height - ROOF_HEIGHT);
    const seedBase = Math.floor(left / 37);
    const facade = seedBase % 2 === 0 ? "facadeA" : "facadeB";
    const hasLeftService = hash(seedBase + 1.8) > 0.58;
    const hasRightService = hash(seedBase + 2.4) > 0.48;

    drawRect(building.aabb.pos, building.aabb.size, P.building);

    if (hasLeftService) {
        const serviceW = 18 + Math.floor(hash(seedBase + 6.2) * 16);
        const serviceH = 80 + Math.floor(hash(seedBase + 7.2) * 120);
        const serviceY =
            top + ROOF_HEIGHT + 46 + Math.floor(hash(seedBase + 8.2) * 80);
        drawRect(
            vec2(left - serviceW + 2, serviceY),
            vec2(serviceW, serviceH),
            "#060a0e",
        );
        drawRect(
            vec2(left - serviceW + 2, serviceY),
            vec2(3, serviceH),
            "#111922",
        );
        drawBrokenLine(
            vec2(left - serviceW + 8, serviceY + 12),
            serviceH - 24,
            false,
            "#26323d",
            seedBase + 9.5,
            12,
            28,
        );
    }

    if (hasRightService) {
        const serviceW = 16 + Math.floor(hash(seedBase + 12.2) * 18);
        const serviceH = 100 + Math.floor(hash(seedBase + 13.2) * 160);
        const serviceY =
            top + ROOF_HEIGHT + 34 + Math.floor(hash(seedBase + 14.2) * 90);
        drawRect(
            vec2(left + width - 2, serviceY),
            vec2(serviceW, serviceH),
            "#070b10",
        );
        drawRect(
            vec2(left + width + serviceW - 6, serviceY),
            vec2(4, serviceH),
            "#121b24",
        );
        if (hash(seedBase + 15.2) > 0.68) {
            drawEmissiveRect(
                vec2(left + width + serviceW - 10, serviceY + 18),
                vec2(4, 2),
                "#5eb0d4",
                P.interactGlow,
            );
        }
    }

    drawTiledAtlasSprite(
        atlas,
        facade,
        vec2(left, facadeTop),
        vec2(width, facadeHeight),
        vec2(TILE_SIZE, TILE_SIZE),
        cameraPos,
    );
    drawTiledAtlasSprite(
        atlas,
        "roofCap",
        vec2(left, top),
        vec2(width, ROOF_HEIGHT),
        vec2(128, ROOF_HEIGHT),
        cameraPos,
        top + ROOF_HEIGHT,
    );
    drawTiledAtlasSprite(
        atlas,
        "roofUnder",
        vec2(left, top + ROOF_HEIGHT - 2),
        vec2(width, 26),
        vec2(128, 32),
        cameraPos,
        top + ROOF_HEIGHT + 26,
    );

    drawTiledAtlasSprite(
        atlas,
        "edgeLeft",
        vec2(left, top),
        vec2(16, height),
        vec2(16, 128),
        cameraPos,
    );
    drawTiledAtlasSprite(
        atlas,
        "edgeRight",
        vec2(left + width - 16, top),
        vec2(16, height),
        vec2(16, 128),
        cameraPos,
    );

    const visibleTop = cameraPos.y - 440;
    const visibleBottom = cameraPos.y + 460;
    const detailTop = Math.max(facadeTop + 18, visibleTop);
    const detailBottom = Math.min(top + height - 80, visibleBottom);

    const ribSpacing = seedBase % 3 === 0 ? 128 : 160;
    for (let x = left + 48; x < left + width - 42; x += ribSpacing) {
        if (x < cameraPos.x - 780 || x > cameraPos.x + 780) continue;
        drawTiledAtlasSprite(
            atlas,
            "rib",
            vec2(x, facadeTop + 8),
            vec2(16, facadeHeight - 16),
            vec2(16, 128),
            cameraPos,
        );
    }

    for (let x = left + 34; x < left + width - 72; x += 116) {
        const localSeed = hash(seedBase + x * 0.017);
        const y = facadeTop + 56 + Math.floor(localSeed * 4) * 88;
        if (y < detailTop || y > detailBottom) continue;
        drawAtlasSprite(
            atlas,
            localSeed > 0.5 ? "vent" : "panelSmall",
            vec2(x, y),
            localSeed > 0.5 ? vec2(64, 32) : vec2(32, 32),
        );
    }

    for (let x = left + 70; x < left + width - 30; x += 210) {
        if (hash(seedBase + x) < 0.55) continue;
        drawTiledAtlasSprite(
            atlas,
            "pipeV",
            vec2(x, facadeTop + 20),
            vec2(16, Math.min(320, facadeHeight - 30)),
            vec2(16, 128),
            cameraPos,
        );
    }

    for (let y = detailTop + 58; y < detailBottom; y += 190) {
        if (hash(seedBase + y * 0.23) < 0.64) continue;
        drawAtlasSprite(
            atlas,
            "pipeH",
            vec2(left + 30, y),
            vec2(Math.min(width - 60, 160), 16),
        );
    }

    for (let x = left + 28; x < left + width - 24; x += 94) {
        const local = hash(seedBase * 2.3 + x * 0.071);
        const yStart = facadeTop + 58 + Math.floor(local * 30);
        for (
            let y = yStart;
            y < detailBottom;
            y += 120 + Math.floor(local * 42)
        ) {
            const h = hash(seedBase + x * 0.19 + y * 0.07);
            if (h < 0.68) continue;
            const isCyan = h > 0.93;
            const w = h > 0.86 ? 8 : 4;
            drawEmissiveRect(
                vec2(x + Math.floor(hash(y + x) * 18), y),
                vec2(w, 2),
                isCyan ? "#5eb0d4" : "#cd8b43",
                isCyan ? P.interactGlow : P.hazardGlow,
            );
        }
    }

    for (let x = left + 24; x < left + width - 24; x += 118) {
        const h = hash(seedBase + x * 0.31);
        if (h > 0.78) {
            const isCyan = h > 0.92;
            drawEmissiveRect(
                vec2(x + 4, top + 14),
                vec2(7, 3),
                isCyan ? "#5eb0d4" : "#cd8b43",
                isCyan ? P.interactGlow : P.hazardGlow,
            );
            drawAtlasSprite(
                atlas,
                isCyan ? "lightCyan" : "lightAmber",
                vec2(x, top + 8),
                vec2(16, 16),
            );
        }
    }

    if (width > 220 && hash(seedBase) > 0.45) {
        const propX = left + width - 82 - Math.floor(hash(seedBase + 4) * 70);
        drawAtlasSprite(atlas, "antenna", vec2(propX, top - 58), vec2(64, 64));
    }

    const parapetCount = Math.max(1, Math.floor(width / 120));
    for (let i = 0; i < parapetCount; i++) {
        const t = (i + 0.5) / parapetCount;
        const px =
            left +
            Math.floor(width * t) -
            18 +
            Math.floor(hash(seedBase + i * 3.1) * 28);
        const pw = 28 + Math.floor(hash(seedBase + i * 5.6) * 34);
        const ph = 5 + Math.floor(hash(seedBase + i * 7.4) * 9);
        drawRect(
            vec2(px, top - ph + 2),
            vec2(Math.min(pw, left + width - px), ph),
            "#0b1118",
        );
        drawRect(
            vec2(px + 4, top - ph + 4),
            vec2(Math.max(8, pw - 10), 1),
            "#26323d",
        );
    }

    drawBrokenLine(
        vec2(left + 10, top),
        width - 20,
        true,
        "#26323d",
        seedBase + 21.4,
        24,
        72,
    );
    for (let x = left + 18; x < left + width - 30; x += 72) {
        const h = hash(seedBase + x * 0.43);
        if (h < 0.68) continue;
        const segmentW = 8 + Math.floor(hash(x + seedBase) * 16);
        drawEmissiveRect(
            vec2(x, top + 5),
            vec2(segmentW, 1),
            "#b98238",
            "#2a2116",
        );
    }
    drawRect(vec2(left, top + ROOF_HEIGHT - 3), vec2(width, 3), P.shadow);
    drawRect(vec2(left, top + ROOF_HEIGHT + 18), vec2(width, 28), "#06080b");
    drawRect(vec2(left, top), vec2(24, height), "#040609");
    drawRect(vec2(left + width - 12, top), vec2(12, height), "#0c1117");
    drawRect(vec2(left, top + height - 36), vec2(width, 36), "#05070a");
    drawBrokenLine(
        vec2(left, top + 14),
        height - 48,
        false,
        "#26323d",
        seedBase + 25.8,
        26,
        88,
    );
    drawBrokenLine(
        vec2(left + width - 1, top + 18),
        height - 54,
        false,
        "#1b2630",
        seedBase + 29.2,
        24,
        80,
    );
}

export function renderMenuCityForeground(atlas: WorldAtlas) {
    const cameraPos = vec2(640, 360);
    const menuBuildings: Building[] = [
        {
            aabb: aabb(vec2(-80, 560), vec2(250, 260)),
            color: P.building,
            borderColor: P.buildingEdge,
        },
        {
            aabb: aabb(vec2(190, 500), vec2(310, 320)),
            color: P.building,
            borderColor: P.buildingEdge,
        },
        {
            aabb: aabb(vec2(540, 540), vec2(260, 280)),
            color: P.building,
            borderColor: P.buildingEdge,
        },
        {
            aabb: aabb(vec2(850, 470), vec2(330, 350)),
            color: P.building,
            borderColor: P.buildingEdge,
        },
        {
            aabb: aabb(vec2(1210, 535), vec2(220, 285)),
            color: P.building,
            borderColor: P.buildingEdge,
        },
    ];

    for (const building of menuBuildings) {
        renderBuilding(building, atlas, cameraPos);
    }
}
