import { Engine, EnginePlugin } from "../core/engine";
import {
    drawRect,
    drawText,
    drawRectOutline,
    getActiveRenderer,
} from "../render/renderer2d";
import { Vec2 } from "../core/math";
import { stats, time } from "../core/engine";
import { Color } from "../render/color";
import { getActiveParticleCount } from "../fx/particles";
import { getCanvasState } from "../core/canvas";

const BG = new Color(0.04, 0.04, 0.08, 0.92);
const BORDER = new Color(0.35, 0.55, 0.85, 0.25);
const TITLE = new Color(0.94, 0.75, 0.25, 1);
const LABEL = new Color(0.55, 0.55, 0.6, 1);
const VALUE = new Color(0.85, 0.85, 0.92, 1);
const ACCENT = new Color(0.48, 0.72, 1, 1);
const DIM = new Color(0.25, 0.25, 0.3, 1);
const GRAPH_BG = new Color(0, 0, 0, 0.35);
const BAR_GOOD = new Color(0.29, 0.87, 0.5, 1);
const BAR_BAD = new Color(0.91, 0.27, 0.38, 1);

/** Engine plugin that renders a debug overlay. */
export class DebugOverlayPlugin implements EnginePlugin {
    /** Plugin name. */
    readonly name = "debugOverlay";
    private showOverlay = false;
    private frameTimeHistory: number[] = [];
    private readonly HISTORY_LEN = 60;
    private f1WasDown = false;

    /** Initialize the plugin. */
    init(_engine: Engine): void {
        // Initialization code
    }

    /** Update the plugin logic, checking for toggle input. */
    update(engine: Engine, _dt: number): void {
        // Edge-detect F1 on bit 0 (held) instead of bit 1 (transient pressed).
        // Bit 1 can be lost if clearTransient runs before the next update,
        // or double-fire if clearTransient is skipped (0 fixed steps).
        // Edge detection on bit 0 is robust regardless of timing.
        const f1Down =
            ((engine.inputManager.keyboardState["F1"] ?? 0) & 1) !== 0;
        if (f1Down && !this.f1WasDown) {
            this.showOverlay = !this.showOverlay;
        }
        this.f1WasDown = f1Down;
    }

    /** Render the debug overlay. */
    render(_engine: Engine, _alpha: number): void {
        if (!this.showOverlay) return;

        const renderer = getActiveRenderer();
        const canvasState = getCanvasState();
        const w = canvasState?.logicalWidth ?? renderer?.canvas.width ?? 640;
        const h = canvasState?.logicalHeight ?? renderer?.canvas.height ?? 360;

        const panelW = 190;
        const panelH = 200;

        // Panel background
        drawRect(new Vec2(4, 4), new Vec2(panelW, panelH), BG);
        // Subtle border
        drawRectOutline(new Vec2(4, 4), new Vec2(panelW, panelH), BORDER, 1);

        let y = 12;
        const gap = 14;
        const fontSize = 10;

        drawText("DEBUG", new Vec2(10, y), { color: TITLE, size: 11 });
        y += 18;

        // FPS - color-coded
        const fpsColor =
            stats.fps >= 55 ? VALUE : stats.fps >= 30 ? TITLE : BAR_BAD;
        drawText(`FPS`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${stats.fps}`, new Vec2(panelW - 10, y), {
            color: fpsColor,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Frame`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${stats.frameMs.toFixed(1)}ms`, new Vec2(panelW - 10, y), {
            color: VALUE,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Steps`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${stats.fixedSteps}`, new Vec2(panelW - 10, y), {
            color: VALUE,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Time`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${time.toFixed(1)}s`, new Vec2(panelW - 10, y), {
            color: VALUE,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Renderer`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${renderer?.type ?? "none"}`, new Vec2(panelW - 10, y), {
            color: ACCENT,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Canvas`, new Vec2(10, y), { color: LABEL, size: fontSize });
        drawText(`${w}\u00D7${h}`, new Vec2(panelW - 10, y), {
            color: ACCENT,
            size: fontSize,
            align: "right",
        });
        y += gap;

        drawText(`Particles`, new Vec2(10, y), {
            color: LABEL,
            size: fontSize,
        });
        drawText(`${getActiveParticleCount()}`, new Vec2(panelW - 10, y), {
            color: VALUE,
            size: fontSize,
            align: "right",
        });
        y += gap + 2;

        // Frame time sparkline graph
        this.frameTimeHistory.push(stats.frameMs);
        if (this.frameTimeHistory.length > this.HISTORY_LEN)
            this.frameTimeHistory.shift();

        if (this.frameTimeHistory.length > 1) {
            const graphY = y + 2;
            const graphH = 30;
            const graphW = panelW - 20;
            const maxMs = Math.max(...this.frameTimeHistory, 16.67);

            drawRect(new Vec2(10, graphY), new Vec2(graphW, graphH), GRAPH_BG);

            for (let i = 0; i < this.frameTimeHistory.length; i++) {
                const x = 10 + (i / this.HISTORY_LEN) * graphW;
                const barH = Math.max(
                    1,
                    (this.frameTimeHistory[i] / maxMs) * graphH,
                );
                const barY = graphY + graphH - barH;
                const barColor =
                    this.frameTimeHistory[i] > 16.67 ? BAR_BAD : BAR_GOOD;
                const barW = Math.max(2, Math.floor(graphW / this.HISTORY_LEN));
                drawRect(new Vec2(x, barY), new Vec2(barW, barH), barColor);
            }

            drawText("16.67ms", new Vec2(10, graphY + graphH + 1), {
                color: DIM,
                size: 7,
            });
        }

        drawText("[F1] toggle", new Vec2(panelW - 10, panelH - 6), {
            color: DIM,
            size: 8,
            align: "right",
        });
    }

    /** Clean up the plugin. */
    destroy(_engine: Engine): void {
        this.showOverlay = false;
        this.frameTimeHistory.length = 0;
    }
}
