import {
    drawLine,
    drawRect,
    drawRectOutline,
    drawText,
    renderParticles,
    vec2,
} from "@ujjwalvivek/tinyts";
export const GAME_TITLE = "Untitled Game";

export const UI = {
    bg: "#05070a",
    panel: "rgba(10, 13, 17, 0.96)",
    panelSoft: "rgba(13, 17, 22, 0.78)",
    ink: "#a4afbb",
    muted: "#56616d",
    faint: "#242b33",
    amber: "#b98238",
    blue: "#4d8fb0",
    red: "#b74437",
    grey: "#2c2c2c",
};

export const MAIN_MENU_BOUNDS = {
    start: { x: 96, y: 400, w: 320, h: 48 },
    options: { x: 96, y: 458, w: 320, h: 48 },
};

export const OPTION_BOUNDS = {
    card: { x: 126, y: 86, w: 1028, h: 548 },
    tabs: {
        audio: { x: 186, y: 200, w: 150, h: 30 },
        keybinds: { x: 346, y: 200, w: 150, h: 30 },
        system: { x: 506, y: 200, w: 150, h: 30 },
    },
    rows: [
        { x: 190, y: 266, w: 900, h: 58 },
        { x: 190, y: 336, w: 900, h: 58 },
        { x: 190, y: 406, w: 900, h: 58 },
    ],
    slider: { x: 720, y: 0, w: 250, h: 18 },
    back: { x: 190, y: 570, w: 260, h: 38 },
    fpsToggle: { x: 956, y: 280, w: 96, h: 28 },
};

export const PAUSE_BOUNDS = {
    panel: { x: 392, y: 150, w: 496, h: 386 },
    resume: { x: 438, y: 278, w: 404, h: 58 },
    quit: { x: 438, y: 354, w: 404, h: 58 },
};

interface MainMenuRenderState {
    selected: number;
    startHover: number;
    optionsHover: number;
}

interface OptionsRenderState {
    tab: "audio" | "keybinds" | "system";
    row: number;
    masterVolIndex: number;
    musicVolIndex: number;
    sfxVolIndex: number;
    volLabels: string[];
    showFPS: boolean;
}

interface PauseRenderState {
    selected: number;
}

function inRect(
    px: number,
    py: number,
    rect: { x: number; y: number; w: number; h: number },
) {
    return (
        px >= rect.x &&
        px <= rect.x + rect.w &&
        py >= rect.y &&
        py <= rect.y + rect.h
    );
}

export function hitTestMainMenu(x: number, y: number) {
    if (inRect(x, y, MAIN_MENU_BOUNDS.start)) return 0;
    if (inRect(x, y, MAIN_MENU_BOUNDS.options)) return 1;
    return -1;
}

export function hitTestPause(x: number, y: number) {
    if (inRect(x, y, PAUSE_BOUNDS.resume)) return 0;
    if (inRect(x, y, PAUSE_BOUNDS.quit)) return 1;
    return -1;
}

export function hitTestOptionsTab(x: number, y: number) {
    if (inRect(x, y, OPTION_BOUNDS.tabs.audio)) return "audio";
    if (inRect(x, y, OPTION_BOUNDS.tabs.keybinds)) return "keybinds";
    if (inRect(x, y, OPTION_BOUNDS.tabs.system)) return "system";
    return null;
}

export function hitTestOptionsRow(
    x: number,
    y: number,
    tab: "audio" | "keybinds" | "system",
) {
    const maxRows = tab === "audio" ? 3 : tab === "system" ? 1 : 0;
    for (let i = 0; i < maxRows; i++) {
        if (inRect(x, y, OPTION_BOUNDS.rows[i])) return i;
    }
    return -1;
}

export function hitTestOptionBack(x: number, y: number) {
    return inRect(x, y, OPTION_BOUNDS.back);
}

export function sliderIndexFromX(x: number) {
    const tickW = 38;
    const gap = 12;
    return Math.max(
        0,
        Math.min(4, Math.floor((x - OPTION_BOUNDS.slider.x) / (tickW + gap))),
    );
}

function drawScreenBase() {
    drawRect(vec2(0, 0), vec2(1280, 720), UI.bg);
    drawRect(vec2(720, 0), vec2(560, 720), "rgba(9, 12, 16, 0.76)");
}

function drawCornerFrame(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
) {
    const l = 18;
    drawLine(vec2(x, y), vec2(x + l, y), color, 2);
    drawLine(vec2(x, y), vec2(x, y + l), color, 2);
    drawLine(vec2(x + w, y), vec2(x + w - l, y), color, 2);
    drawLine(vec2(x + w, y), vec2(x + w, y + l), color, 2);
    drawLine(vec2(x, y + h), vec2(x + l, y + h), color, 2);
    drawLine(vec2(x, y + h), vec2(x, y + h - l), color, 2);
    drawLine(vec2(x + w, y + h), vec2(x + w - l, y + h), color, 2);
    drawLine(vec2(x + w, y + h), vec2(x + w, y + h - l), color, 2);
}

function drawButton(
    rect: { x: number; y: number; w: number; h: number },
    label: string,
    selected: boolean,
    slide = 0,
) {
    drawRect(
        vec2(rect.x, rect.y),
        vec2(rect.w, rect.h),
        selected ? "rgba(216, 162, 74, 1.0)" : "rgba(16, 19, 24, 1.0)",
    );
    drawRectOutline(
        vec2(rect.x, rect.y - 1),
        vec2(rect.w + 2, rect.h + 2),
        selected ? "rgba(185, 130, 56, 0.66)" : "rgba(77, 90, 105, 0.16)",
        1.5,
    );
    drawRect(
        vec2(rect.x, rect.y),
        vec2(4, rect.h),
        selected ? UI.amber : "rgba(77, 90, 105, 0.24)",
    );
    drawText(label, vec2(rect.x + 32 + slide, rect.y + rect.h / 2 + 2), {
        color: selected ? UI.grey : UI.muted,
        font: selected ? "bold 14px TinyTS" : "14px TinyTS",
        align: "left",
        baseline: "middle",
    });
    drawText(
        selected ? "enter" : "",
        vec2(rect.x + rect.w - 28, rect.y + rect.h / 2 + 2),
        {
            color: selected ? UI.amber : UI.faint,
            font: "9px TinyTS",
            align: "right",
            baseline: "middle",
        },
    );
}

export function renderSplashScreen(splashTimer: number) {
    const pct = Math.min(1, splashTimer / 2.5);

    drawRect(vec2(0, 0), vec2(1280, 720), "rgba(15, 18, 23, 1.0)");
    drawRect(vec2(388, 280), vec2(504, 134), "rgba(15, 18, 23, 0.52)");
    drawRectOutline(
        vec2(388, 280),
        vec2(504, 134),
        "rgba(77, 90, 105, 0.20)",
        1.5,
    );
    drawCornerFrame(388, 280, 504, 134, "rgba(185, 130, 56, 0.72)");
    drawText("TinyTS Games", vec2(640, 345), {
        color: UI.ink,
        font: "bold 31px TinyTS",
        align: "center",
        baseline: "middle",
    });
    drawRect(vec2(450, 390), vec2(380, 3), "rgba(77, 90, 105, 0.18)");
    drawRect(vec2(450, 390), vec2(380 * pct, 3), UI.amber);

    renderParticles();
}

export function renderMainMenu(state: MainMenuRenderState, worldBackplate = false) {
    if (!worldBackplate) {
        drawScreenBase();
    }

    drawText("TinyTS Games", vec2(96, 40), {
        color: UI.muted,
        font: "11px TinyTS",
        align: "left",
    });
    drawLine(vec2(96, 60), vec2(228, 60), "rgba(185, 130, 56, 0.38)", 3);
    drawText("Untitled", vec2(96, 86), {
        color: UI.ink,
        font: "bold 32px TinyTS",
        align: "left",
        baseline: "top",
    });
    drawText("Game", vec2(96, 130), {
        color: UI.amber,
        font: "bold 32px TinyTS",
        align: "left",
        baseline: "top",
    });
    drawButton(
        MAIN_MENU_BOUNDS.start,
        "Start Game",
        state.selected === 0,
        state.startHover * 10,
    );
    drawButton(
        MAIN_MENU_BOUNDS.options,
        "Options",
        state.selected === 1,
        state.optionsHover * 10,
    );
}

export function renderOptionsScreen(state: OptionsRenderState, worldBackplate = true) {
    if (!worldBackplate) {
        drawScreenBase();
    }
    const { card } = OPTION_BOUNDS;
    drawRect(vec2(card.x, card.y), vec2(card.w, card.h), UI.panel);
    drawRectOutline(
        vec2(card.x, card.y),
        vec2(card.w, card.h),
        "rgba(77, 90, 105, 0.20)",
        1.5,
    );
    drawCornerFrame(card.x, card.y, card.w, card.h, "rgba(216, 162, 74, 0.72)");

    drawText("Options", vec2(card.x + 58, card.y + 62), {
        color: UI.ink,
        font: "bold 20px TinyTS",
        align: "left",
        baseline: "middle",
    });

    const tabs: Array<["audio" | "keybinds" | "system", string]> = [
        ["audio", "AUDIO"],
        ["keybinds", "KEYBINDS"],
        ["system", "SYSTEM"],
    ];
    for (const [tab, label] of tabs) {
        const rect = OPTION_BOUNDS.tabs[tab];
        const selected = state.tab === tab;
        drawRect(
            vec2(rect.x, rect.y),
            vec2(rect.w, rect.h),
            selected ? "rgba(216, 162, 74, 0.14)" : "rgba(77, 90, 105, 0.07)",
        );
        drawRectOutline(
            vec2(rect.x, rect.y),
            vec2(rect.w, rect.h),
            selected ? "rgba(216, 162, 74, 0.82)" : "rgba(77, 90, 105, 0.14)",
            1,
        );
        drawText(label, vec2(rect.x + rect.w / 2, rect.y + rect.h / 2 + 2), {
            color: selected ? UI.grey : UI.ink,
            font: selected ? "bold 13px TinyTS" : "12px TinyTS",
            align: "center",
            baseline: "middle",
        });
    }

    if (state.tab === "audio") {
        const rows = [
            ["MASTER", state.masterVolIndex],
            ["MUSIC", state.musicVolIndex],
            ["SFX", state.sfxVolIndex],
        ] as const;

        for (let i = 0; i < rows.length; i++) {
            const row = OPTION_BOUNDS.rows[i];
            const selected = state.row === i;
            drawRect(
                vec2(row.x, row.y),
                vec2(row.w, row.h),
                selected
                    ? "rgba(216, 162, 74, 0.09)"
                    : "rgba(77, 90, 105, 0.055)",
            );
            drawRectOutline(
                vec2(row.x, row.y),
                vec2(row.w, row.h),
                selected
                    ? "rgba(216, 162, 74, 0.48)"
                    : "rgba(77, 90, 105, 0.11)",
                1,
            );
            drawRect(
                vec2(row.x, row.y),
                vec2(3, row.h),
                selected ? UI.amber : UI.faint,
            );
            drawText(rows[i][0], vec2(row.x + 28, row.y + row.h / 2), {
                color: selected ? UI.grey : UI.ink,
                font: selected ? "bold 14px TinyTS" : "13px TinyTS",
                align: "left",
                baseline: "middle",
            });
            drawText(
                state.volLabels[rows[i][1]],
                vec2(640, row.y + row.h / 2),
                {
                    color: selected ? UI.grey : UI.ink,
                    font: "12px TinyTS",
                    align: "right",
                    baseline: "middle",
                },
            );

            for (let t = 0; t < 5; t++) {
                const filled = t <= rows[i][1];
                const x = OPTION_BOUNDS.slider.x + t * 50;
                drawRect(
                    vec2(x, row.y + 20),
                    vec2(38, 18),
                    filled ? UI.amber : "rgba(77, 90, 105, 0.09)",
                );
                drawRectOutline(
                    vec2(x, row.y + 20),
                    vec2(38, 18),
                    filled
                        ? "rgba(216, 162, 74, 0.7)"
                        : "rgba(77, 90, 105, 0.16)",
                    1,
                );
            }
        }
    } else if (state.tab === "keybinds") {
        const bindings = [
            ["A / D", "SWING LEFT / RIGHT"],
            ["W / S", "CLIMB OR LOWER ROPE"],
            ["W", "JUMP FROM GROUND OR WALL"],
            ["MOUSE 1", "FIRE OR RELEASE GRAPPLE"],
            ["SPACE", "IMPACT SLASH"],
            ["ESC / P", "PAUSE RUN"],
        ];
        for (let i = 0; i < bindings.length; i++) {
            const y = 288 + i * 36;
            drawText(bindings[i][0], vec2(218, y), {
                color: UI.amber,
                font: "bold 13px TinyTS",
                align: "left",
            });
            drawText(bindings[i][1], vec2(430, y), {
                color: UI.ink,
                font: "13px TinyTS",
                align: "left",
            });
        }
    } else {
        const row = OPTION_BOUNDS.rows[0];
        drawRect(
            vec2(row.x, row.y),
            vec2(row.w, row.h),
            "rgba(216, 162, 74, 0.09)",
        );
        drawRectOutline(
            vec2(row.x, row.y),
            vec2(row.w, row.h),
            "rgba(216, 162, 74, 0.48)",
            1,
        );
        drawRect(vec2(row.x, row.y), vec2(3, row.h), UI.amber);
        drawText("SHOW FPS", vec2(row.x + 28, row.y + row.h / 2), {
            color: UI.grey,
            font: "bold 14px TinyTS",
            align: "left",
            baseline: "middle",
        });
        drawRect(
            vec2(OPTION_BOUNDS.fpsToggle.x, OPTION_BOUNDS.fpsToggle.y),
            vec2(OPTION_BOUNDS.fpsToggle.w, OPTION_BOUNDS.fpsToggle.h),
            state.showFPS
                ? "rgba(216, 162, 74, 0.18)"
                : "rgba(77, 90, 105, 0.09)",
        );
        drawRectOutline(
            vec2(OPTION_BOUNDS.fpsToggle.x, OPTION_BOUNDS.fpsToggle.y),
            vec2(OPTION_BOUNDS.fpsToggle.w, OPTION_BOUNDS.fpsToggle.h),
            state.showFPS ? UI.amber : "rgba(77, 90, 105, 0.20)",
            1,
        );
        drawText(
            state.showFPS ? "ON" : "OFF",
            vec2(
                OPTION_BOUNDS.fpsToggle.x + OPTION_BOUNDS.fpsToggle.w / 2,
                OPTION_BOUNDS.fpsToggle.y + OPTION_BOUNDS.fpsToggle.h / 2,
            ),
            {
                color: state.showFPS ? UI.amber : UI.muted,
                font: "bold 11px TinyTS",
                align: "center",
                baseline: "middle",
            },
        );
    }
    drawText(
        "[ESC] BACK",
        vec2(OPTION_BOUNDS.back.x, OPTION_BOUNDS.back.y + 20),
        {
            color: UI.amber,
            font: "bold 12px TinyTS",
            align: "left",
            baseline: "middle",
        },
    );
    drawText(
        "[W/S/A/D] ADJUST  |  [Q/E] TABS  |  [MOUSE] SUPPORTED",
        vec2(card.x + card.w - 58, card.y + card.h - 44),
        {
            color: UI.muted,
            font: "10px TinyTS",
            align: "right",
            baseline: "middle",
        },
    );
}

export function renderPauseOverlay(state: PauseRenderState) {
    drawRect(vec2(0, 0), vec2(1280, 720), "rgba(5, 7, 10, 0.92)");

    const { panel } = PAUSE_BOUNDS;
    drawRect(vec2(panel.x, panel.y), vec2(panel.w, panel.h), UI.panel);
    drawRectOutline(
        vec2(panel.x, panel.y),
        vec2(panel.w, panel.h),
        "rgba(77, 90, 105, 0.20)",
        1.5,
    );
    drawCornerFrame(
        panel.x,
        panel.y,
        panel.w,
        panel.h,
        "rgba(216, 162, 74, 0.76)",
    );

    drawText("Game Paused", vec2(640, panel.y + 70), {
        color: UI.ink,
        font: "bold 25px TinyTS",
        align: "center",
        baseline: "middle",
    });

    drawButton(PAUSE_BOUNDS.resume, "Resume Game", state.selected === 0, 0);
    drawButton(PAUSE_BOUNDS.quit, "Return to Menu", state.selected === 1, 0);

    drawText(
        "ESC TO RESUME  |  ENTER TO CONFIRM",
        vec2(640, panel.y + panel.h - 42),
        {
            color: UI.muted,
            font: "10px TinyTS",
            align: "center",
            baseline: "middle",
        },
    );
}
