import { vec2, type Vec2 } from "../core/math";
import { type CanvasManager } from "../core/canvas";
import { activeEngine } from "../core/engine";
import type { Color } from "./color";
import type {
    Renderer,
    SpriteOptions,
    TextOptions,
    FrameBuffer,
    RendererStats,
} from "./types";
import { preloadDefaultFontFace } from "./font";
import { WebGL2Renderer } from "./rendererWebGL2";
import { Canvas2DRenderer } from "./rendererCanvas2d";

/**
 * Test WebGL2 shader compilation and context creation on a throwaway canvas.
 * Returns true if the full pipeline (context → compile → link) works,
 * without touching the real game canvas at all.
 * Creates a throwaway canvas + context, compiles + links the shaders,
 * then discards it. Returns true on success.
 */
function probeWebGL2Shaders(): boolean {
    const c = document.createElement("canvas");
    // Some browsers require the canvas to be in the DOM for getContext
    c.width = 2;
    c.height = 2;
    const gl = c.getContext("webgl2", {
        alpha: false,
        antialias: false,
        premultipliedAlpha: false,
    });
    if (!gl) return false;

    try {
        // Use shader source strings directly (same as WebGL2Renderer)
        const vs = `#version 300 es\nin vec2 aPos;\nin vec2 aUV;\nin vec4 aColor;\nuniform vec2 uViewSize;\nuniform vec3 uCamera;\nout vec2 vUV;\nout vec4 vColor;\nvoid main() { vec2 s = (aPos - uCamera.xy) * uCamera.z; vec2 c = s / uViewSize * 2.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); vUV = aUV; vColor = aColor; }`;
        const fs = `#version 300 es\nprecision mediump float;\nin vec2 vUV;\nin vec4 vColor;\nuniform sampler2D uTex;\nuniform int uUseTex;\nuniform int uShape;\nuniform vec4 uShapeParams;\nuniform vec2 uPixelScale;\nout vec4 fragColor;\nvoid main() {\n  vec4 base = texture(uTex, vUV);\n  if (uUseTex == 1) { base *= vColor; } else { base = vColor; }\n  vec2 d = abs(vUV - 0.5);\n  float aa = 2.0 / (uPixelScale.x + uPixelScale.y);\n  aa = clamp(aa, 0.0005, 0.05);\n  if (uShape == 1) {\n    float dist = length(vUV - 0.5);\n    base.a *= 1.0 - smoothstep(0.5 - aa, 0.5 + aa, dist);\n  } else if (uShape == 2) {\n    vec2 t = uShapeParams.xy;\n    vec2 inner = 0.5 - t;\n    float outer = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, max(d.x, d.y));\n    float holeX = smoothstep(inner.x - aa, inner.x + aa, d.x);\n    float holeY = smoothstep(inner.y - aa, inner.y + aa, d.y);\n    base.a *= outer * (1.0 - holeX * holeY);\n  } else if (uShape == 3) {\n    float dist = length(vUV - 0.5);\n    float t = uShapeParams.x;\n    float outerEdge = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, dist);\n    float innerEdge = smoothstep(0.5 - t - aa, 0.5 - t + aa, dist);\n    base.a *= outerEdge * innerEdge;\n  }\n  if (base.a < 0.0039) discard;\n  fragColor = base;\n}`;

        const vsShader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vsShader, vs);
        gl.compileShader(vsShader);
        if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)) {
            console.warn(
                "[tinyts] VS compile error:",
                gl.getShaderInfoLog(vsShader),
            );
            return false;
        }

        const fsShader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fsShader, fs);
        gl.compileShader(fsShader);
        if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)) {
            console.warn(
                "[tinyts] FS compile error:",
                gl.getShaderInfoLog(fsShader),
            );
            return false;
        }

        const program = gl.createProgram()!;
        gl.attachShader(program, vsShader);
        gl.attachShader(program, fsShader);
        gl.linkProgram(program);
        const ok = !!gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!ok) {
            console.warn(
                "[tinyts] Program link error:",
                gl.getProgramInfoLog(program),
            );
        }
        return ok;
    } catch (e) {
        console.warn("[tinyts] Shader probe threw:", e);
        return false;
    }
}

/**
 * Create and configure the rendering backend.
 * @param canvas - Target canvas element.
 * @param useWebGL - Try WebGL2 if true, fallback to Canvas2D if it fails.
 * @param canvasManager - Canvas manager for resizing and dimensions.
 */
export function createRenderer(
    canvas: HTMLCanvasElement,
    useWebGL: boolean,
    canvasManager: CanvasManager,
): {
    renderer: Renderer;
    overlayCanvas: HTMLCanvasElement | null;
    removeResizeListener: (() => void) | null;
} {
    preloadDefaultFontFace();

    if (useWebGL) {
        // Probe shaders first, BEFORE creating a WebGL context on the real canvas
        if (!probeWebGL2Shaders()) {
            console.warn(
                "[tinyts] WebGL2 shader probe failed - falling back to Canvas2D",
            );
        } else {
            const overlay = document.createElement("canvas");
            overlay.style.cssText = "position:absolute;pointer-events:none;";
            overlay.getContext("2d")!.imageSmoothingEnabled = false;
            if (canvas.parentElement) {
                canvas.parentElement.appendChild(overlay);
            }
            syncOverlayCanvas(overlay, canvas, canvasManager);

            try {
                const webglRenderer = new WebGL2Renderer(
                    canvas,
                    overlay.getContext("2d")!,
                );
                const removeResizeListener = canvasManager.addResizeListener(
                    () => {
                        syncOverlayCanvas(overlay, canvas, canvasManager);
                    },
                );
                return {
                    renderer: webglRenderer,
                    overlayCanvas: overlay,
                    removeResizeListener,
                };
            } catch (err) {
                console.warn("[tinyts] WebGL2 init failed:", err);
                overlay.remove();
            }
        }
    }

    // Canvas2D fallback for any non-WebGL or WebGL-failed path.
    // If the canvas has a stale WebGL context (WebGL2Renderer constructor
    // created it before throwing), `getContext('2d')` returns null.
    // In that case we replace the canvas in the DOM with a fresh one.
    let fallbackCanvas = canvas;
    if (!fallbackCanvas.getContext("2d")) {
        fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width = canvas.width;
        fallbackCanvas.height = canvas.height;
        fallbackCanvas.style.cssText = canvas.style.cssText;
        if (canvas.parentElement) {
            canvas.parentElement.replaceChild(fallbackCanvas, canvas);
        }
    }

    const r = new Canvas2DRenderer(fallbackCanvas);
    return { renderer: r, overlayCanvas: null, removeResizeListener: null };
}

function syncOverlayCanvas(
    overlay: HTMLCanvasElement,
    canvas: HTMLCanvasElement,
    canvasManager: CanvasManager,
): void {
    overlay.width = canvasManager.backingWidth;
    overlay.height = canvasManager.backingHeight;
    overlay.style.width = canvas.style.width;
    overlay.style.height = canvas.style.height;
    overlay.style.left = canvas.style.left;
    overlay.style.top = canvas.style.top;
    overlay.style.imageRendering = canvas.style.imageRendering;
    overlay.getContext("2d")!.imageSmoothingEnabled = false;
}

function getRenderer(): Renderer {
    if (!activeEngine?.renderer) {
        throw new Error("Renderer not initialized. Call engineStart first.");
    }
    return activeEngine.renderer;
}

/** Get the currently active renderer. */
export function getActiveRenderer(): Renderer | null {
    return activeEngine?.renderer ?? null;
}

/** Get the underlying rendering context. */
export function getContext(): unknown {
    return getRenderer().getContext();
}

/** Get per-frame renderer instrumentation counters. */
export function getRendererStats(): RendererStats {
    return getRenderer().getStats();
}

/** Begin a new render frame. */
export function beginFrame(): void {
    getRenderer().begin();
}

/** End the current render frame and flush pending draws. */
export function endFrame(): void {
    getRenderer().end();
}

/** Clear the screen with a color. */
export function clear(color: string | Color): void {
    getRenderer().clear(color);
}

/** Draw a filled rectangle. */
export function drawRect(pos: Vec2, size: Vec2, color: string | Color): void {
    getRenderer().drawRect(pos, size, color);
}

/** Draw a line between two points. */
export function drawLine(
    a: Vec2,
    b: Vec2,
    color: string | Color,
    thickness: number = 1,
): void {
    getRenderer().drawLine(a, b, color, thickness);
}

/** Draw a filled circle. */
export function drawCircle(
    pos: Vec2,
    radius: number,
    color: string | Color,
): void {
    getRenderer().drawCircle(pos, radius, color);
}

/** Draw a sprite or image. */
export function drawSprite(
    image: CanvasImageSource,
    pos: Vec2,
    size?: Vec2,
    options?: SpriteOptions,
): void {
    if (!size) size = imageSourceSize(image);
    getRenderer().drawSprite(image, pos, size, options);
}

/** Draw text at a position. */
export function drawText(text: string, pos: Vec2, options?: TextOptions): void {
    getRenderer().drawText(text, pos, options);
}

/** Draw a rectangle outline. */
export function drawRectOutline(
    pos: Vec2,
    size: Vec2,
    color: string | Color,
    thickness: number = 1,
): void {
    getRenderer().drawRectOutline(pos, size, color, thickness);
}

/** Draw a circle outline. */
export function drawCircleOutline(
    pos: Vec2,
    radius: number,
    color: string | Color,
    thickness: number = 1,
): void {
    getRenderer().drawCircleOutline(pos, radius, color, thickness);
}

/** Set the camera translation and zoom. */
export function setRenderTransform(pos: Vec2, zoom: number): void {
    getRenderer().setTransform(pos, zoom);
}

/** Reset the camera transform to default. */
export function resetRenderTransform(): void {
    getRenderer().resetTransform();
}

/** Create an offscreen framebuffer. */
export function createFrameBuffer(width: number, height: number): FrameBuffer {
    return getRenderer().createFrameBuffer(width, height);
}

/** Bind a framebuffer as the render target, or null for the main canvas. */
export function bindFrameBuffer(fb: FrameBuffer | null): void {
    getRenderer().bindFrameBuffer(fb);
}

/** Draw a framebuffer to the screen. */
export function drawFrameBuffer(
    fb: FrameBuffer,
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    getRenderer().drawFrameBuffer(fb, x, y, w, h);
}

function imageSourceSize(image: CanvasImageSource): Vec2 {
    if ("displayWidth" in image && "displayHeight" in image) {
        return vec2(image.displayWidth, image.displayHeight);
    }

    if ("videoWidth" in image && "videoHeight" in image) {
        return vec2(image.videoWidth, image.videoHeight);
    }

    const sized = image as {
        width?: number | SVGAnimatedLength;
        height?: number | SVGAnimatedLength;
    };

    const width =
        typeof sized.width === "number"
            ? sized.width
            : (sized.width?.baseVal.value ?? 0);
    const height =
        typeof sized.height === "number"
            ? sized.height
            : (sized.height?.baseVal.value ?? 0);

    return vec2(width, height);
}
