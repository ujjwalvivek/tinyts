import { createTexture } from "@ujjwalvivek/tinyts";
import { createInteractableAtlas } from "./interactables";
import type { InteractableAtlas } from "./interactables";
import { createWorldAtlas } from "../world/atlas";
import type { WorldAtlas } from "../world/atlas";

export interface GameTextures {
    playerIdle: HTMLCanvasElement;
    playerRunA: HTMLCanvasElement;
    playerRunB: HTMLCanvasElement;
    playerAir: HTMLCanvasElement;
    playerSlash: HTMLCanvasElement;
    worldAtlas: WorldAtlas;
    interactables: InteractableAtlas;
    drone: HTMLCanvasElement;
    laserEmitter: HTMLCanvasElement;
}

export function createGameTextures(): GameTextures {
    const drawOperative = (
        ctx: CanvasRenderingContext2D,
        pose: "idle" | "runA" | "runB" | "air" | "slash",
    ) => {
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, 64, 64);

        const outline = "#05070a";
        const shell = "#d7e1e6";
        const shellShadow = "#8ea1ac";
        const suit = "#17232c";
        const suitDark = "#0a1118";
        const joint = "#4f6572";
        const visor = "#b98238";
        const cyan = "#4d8fb0";

        const runB = pose === "runB";
        const airborne = pose === "air";
        const slash = pose === "slash";
        const bob = pose === "idle" ? 1 : runB ? -1 : 0;
        const lean = slash ? 3 : airborne ? 2 : runB ? 1 : 0;

        const block = (
            x: number,
            y: number,
            w: number,
            h: number,
            fill: string,
        ) => {
            ctx.fillStyle = fill;
            ctx.fillRect(
                Math.round(x),
                Math.round(y),
                Math.round(w),
                Math.round(h),
            );
        };

        // Ground contact.
        ctx.fillStyle = "#020305";
        ctx.fillRect(20, 58, 31, 3);

        // Backtab
        block(21 + lean, 28 + bob, 23, 20, outline);
        block(23 + lean, 30 + bob, 19, 16, "#22313b");
        block(15 + lean, 37, 10, 6, outline);
        block(16 + lean, 38, 8, 4, shellShadow);

        // Legs
        if (pose === "runA") {
            block(27, 41, 9, 18, outline);
            block(30, 43, 4, 14, shellShadow);
            block(22, 57, 12, 4, outline);
            block(40, 42, 8, 15, outline);
            block(42, 44, 4, 11, joint);
            block(45, 55, 11, 4, outline);
        } else if (runB) {
            block(28, 42, 8, 15, outline);
            block(30, 44, 4, 11, shellShadow);
            block(26, 56, 12, 4, outline);
            block(40, 41, 9, 18, outline);
            block(42, 43, 4, 14, joint);
            block(36, 57, 13, 4, outline);
        } else if (airborne || slash) {
            block(28, 41, 8, 16, outline);
            block(30, 43, 4, 12, shellShadow);
            block(25, 56, 12, 4, outline);
            block(41, 42, 8, 13, outline);
            block(43, 44, 4, 9, joint);
            block(47, 53, 10, 4, outline);
        } else {
            block(28, 41, 8, 18, outline);
            block(30, 43, 4, 14, shellShadow);
            block(25, 58, 12, 3, outline);
            block(41, 41, 8, 18, outline);
            block(43, 43, 4, 14, joint);
            block(39, 58, 12, 3, outline);
        }

        // Arms
        if (slash) {
            block(42, 27, 15, 5, outline);
            block(44, 28, 14, 2, shell);
            block(56, 26, 6, 2, visor);
            block(19, 31, 11, 6, outline);
            block(20, 33, 9, 3, shellShadow);
        } else if (airborne) {
            block(19, 24, 12, 5, outline);
            block(20, 25, 10, 3, shell);
            block(42, 28, 12, 6, outline);
            block(43, 30, 10, 3, shellShadow);
        } else {
            block(18, 32, 12, 6, outline);
            block(20, 34, 9, 3, shellShadow);
            block(41, 31, 11, 6, outline);
            block(42, 33, 9, 3, shellShadow);
        }

        // Torso
        block(22 + lean, 23 + bob, 24, 25, outline);
        block(25 + lean, 26 + bob, 18, 19, shell);
        block(25 + lean, 37, 18, 8, shellShadow);
        block(30 + lean, 29 + bob, 8, 8, "#f4f8f9");
        block(33 + lean, 31 + bob, 5, 5, cyan);
        block(36 + lean, 37, 4, 2, suit);

        // Head
        block(25 + lean, 12 + bob, 22, 16, outline);
        block(27 + lean, 14 + bob, 18, 12, shell);
        block(33 + lean, 15 + bob, 12, 7, suitDark);
        block(35 + lean, 17 + bob, 10, 4, visor);
        block(44 + lean, 17 + bob, 2, 4, "#e0a758");
        block(26 + lean, 22 + bob, 5, 4, shellShadow);
        block(28 + lean, 11 + bob, 9, 2, "#ffffff");
    };

    const playerIdle = createTexture(
        (ctx) => {
            drawOperative(ctx, "idle");
        },
        "blackline_player_idle_v3",
        64,
    );

    const playerRunA = createTexture(
        (ctx) => {
            drawOperative(ctx, "runA");
        },
        "blackline_player_run_a_v3",
        64,
    );

    const playerRunB = createTexture(
        (ctx) => {
            drawOperative(ctx, "runB");
        },
        "blackline_player_run_b_v3",
        64,
    );

    const playerAir = createTexture(
        (ctx) => {
            drawOperative(ctx, "air");
        },
        "blackline_player_air_v3",
        64,
    );

    const playerSlash = createTexture(
        (ctx) => {
            drawOperative(ctx, "slash");
        },
        "blackline_player_slash_v3",
        64,
    );

    const worldAtlas = createWorldAtlas();
    const interactables = createInteractableAtlas();

    const drone = createTexture(
        (ctx) => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 64, 64);
            ctx.fillStyle = "#0a1016";
            ctx.strokeStyle = "#26323d";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(14, 8);
            ctx.lineTo(50, 8);
            ctx.lineTo(58, 18);
            ctx.lineTo(58, 46);
            ctx.lineTo(48, 56);
            ctx.lineTo(16, 56);
            ctx.lineTo(6, 46);
            ctx.lineTo(6, 18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = "#111922";
            ctx.fillRect(14, 18, 36, 28);
            ctx.fillStyle = "#9e3f35";
            ctx.beginPath();
            ctx.arc(32, 32, 11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#d08a4a";
            ctx.fillRect(27, 28, 9, 4);
            ctx.fillStyle = "#2f3b46";
            ctx.fillRect(10, 12, 10, 4);
            ctx.fillRect(44, 48, 10, 4);
        },
        "blackline_drone_v2",
        64,
    );

    const laserEmitter = createTexture(
        (ctx) => {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, 64, 64);
            ctx.fillStyle = "#0b1015";
            ctx.strokeStyle = "#9e3f35";
            ctx.lineWidth = 4;
            ctx.fillRect(10, 10, 44, 44);
            ctx.strokeRect(10, 10, 44, 44);
            ctx.fillStyle = "#141c24";
            ctx.fillRect(18, 18, 28, 28);
            ctx.fillStyle = "#9e3f35";
            ctx.fillRect(26, 26, 12, 12);
            ctx.fillStyle = "#b98238";
            ctx.fillRect(20, 12, 24, 4);
            ctx.fillRect(20, 48, 24, 4);
        },
        "blackline_laser_emitter_v2",
        64,
    );

    return {
        playerIdle,
        playerRunA,
        playerRunB,
        playerAir,
        playerSlash,
        worldAtlas,
        interactables,
        drone,
        laserEmitter,
    };
}
