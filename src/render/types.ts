import type { Vec2 } from "../core/math";
import type { Color } from "./color";

/** Configures bloom (glow) post-processing. */
export interface BloomConfig {
    /** Master toggle (default true when object is present). */
    enabled?: boolean;
    /** Luminance threshold for bright-pass extraction (0-1, default 0.72). */
    threshold?: number;
    /** Smooth transition width around the threshold (default 0.16). */
    softKnee?: number;
    /** Bloom brightness multiplier applied during compositing (default 0.35). */
    intensity?: number;
    /** Blur spread radius in pixels (default 1). */
    radius?: number;
    /** Number of separable blur passes (each direction, default 3). */
    passes?: number;
    /** Resolution scale for bloom targets, 1.0 = full res (default 0.5). */
    resolutionScale?: number;
}

/** Configures color grading (contrast, saturation, gamma, etc.). */
export interface ColorGradeConfig {
    /** Brightness offset added before other adjustments (default 0). */
    brightness?: number;
    /** Contrast multiplier (1 = neutral, default 1). */
    contrast?: number;
    /** Saturation multiplier (1 = neutral, default 1). */
    saturation?: number;
    /** Gamma correction exponent (1 = linear, default 1). */
    gamma?: number;
    /** Color temperature shift: negative = cooler (blue), positive = warmer (red, default 0). */
    temperature?: number;
    /** RGB tint multiplier applied before gamma (default [1, 1, 1]). */
    tint?: [number, number, number];
}

/** Configures vignette (screen-edge darkening). */
export interface VignetteConfig {
    /** Darkening intensity (0 = off, default 0). */
    intensity?: number;
    /** Inner radius of the vignette in UV coordinates (default 0.72). */
    radius?: number;
    /** Feather/softness of the vignette edge (default 0.35). */
    softness?: number;
    /** Color applied at the edges (default [0, 0, 0]). */
    color?: [number, number, number];
}

/** Configures film-grain noise. */
export interface GrainConfig {
    /** Noise intensity (0 = off, default 0). */
    amount?: number;
    /** Noise grain scale in pixels (default 1). */
    scale?: number;
    /** Animate the noise pattern each frame (default true). */
    animated?: boolean;
}

/** Configures atmosphere fog rising from the bottom of the screen. */
export interface AtmosphereConfig {
    /** Fog opacity (0-1, default 0). */
    intensity?: number;
    /** Fog tint color (default [0, 0, 0]). */
    color?: [number, number, number];
    /** Normalised height where fog begins (0 = bottom, default 0). */
    start?: number;
    /** Normalised height where fog reaches full strength (0-1, default 1). */
    end?: number;
    /** Amount of procedural noise variation (default 0). */
    noiseAmount?: number;
    /** Scale of the noise pattern in pixels (default 128). */
    noiseScale?: number;
}

/** Top-level configuration for the post-processing stack. */
export interface PostProcessingConfig {
    /** Master toggle. Set to false to skip all post effects (default true when object given). */
    enabled?: boolean;
    /** Global resolution scale for post targets (1.0 = full res, default 1.0). */
    resolutionScale?: number;
    /** Bloom/glow configuration. */
    bloom?: BloomConfig;
    /** Color grading configuration. */
    colorGrade?: ColorGradeConfig;
    /** Vignette configuration. */
    vignette?: VignetteConfig;
    /** Film grain configuration. */
    grain?: GrainConfig;
    /** Atmosphere fog configuration. */
    atmosphere?: AtmosphereConfig;
}

/** Options for drawing a sprite (source rect, rotation, flip, tint). */
export interface SpriteOptions {
    /** Source rectangle X offset in the image. */
    sourceX?: number;
    /** Source rectangle Y offset in the image. */
    sourceY?: number;
    /** Source rectangle width in the image. */
    sourceWidth?: number;
    /** Source rectangle height in the image. */
    sourceHeight?: number;
    /** Rotation angle in radians. */
    angle?: number;
    /** Flip the sprite horizontally. */
    flipX?: boolean;
    /** Flip the sprite vertically. */
    flipY?: boolean;
    /** Tint color applied to the sprite. */
    color?: string | Color;
}

/** Options for drawing text (font, size, alignment). */
export interface TextOptions {
    /** Text color. */
    color?: string | Color;
    /** CSS font string, e.g. "16px monospace". */
    font?: string;
    /** Font size in pixels (used when `font` is not specified). */
    size?: number;
    /** Horizontal alignment of the text. */
    align?: CanvasTextAlign;
    /** Vertical baseline of the text. */
    baseline?: CanvasTextBaseline;
}

/** Per-frame renderer instrumentation counters. */
export interface RendererStats {
    /** GPU draw calls submitted by the renderer this frame. */
    drawCalls: number;
    /** Number of non-empty batch flushes this frame. */
    batchFlushes: number;
    /** Number of texture binding changes this frame. */
    textureSwitches: number;
    /** Number of shape uniform/state changes this frame. */
    shapeSwitches: number;
    /** Number of quads queued this frame. */
    quads: number;
    /** Number of line calls that used the Canvas2D overlay this frame. */
    overlayLineCalls: number;
    /** Number of text calls that used the Canvas2D overlay this frame. */
    overlayTextCalls: number;
}

/** Offscreen render target. Holds either a Canvas2D surface, WebGL2 FBO, or backend texture. */
export interface FrameBuffer {
    /** Canvas element (Canvas2D backend only). */
    canvas?: HTMLCanvasElement;
    /** 2D context (Canvas2D backend only). */
    ctx?: CanvasRenderingContext2D;
    /** GL texture attachment (WebGL2 backend only). */
    texture?: WebGLTexture;
    /** GL framebuffer object (WebGL2 backend only). */
    fbo?: WebGLFramebuffer;
    /** GPU texture attachment (WebGPU backend only). */
    gpuTexture?: unknown;
    /** Width of the framebuffer in pixels. */
    width: number;
    /** Height of the framebuffer in pixels. */
    height: number;
}

/** Backend-agnostic 2D renderer interface. */
export interface Renderer {
    /** The HTML canvas element used for rendering. */
    readonly canvas: HTMLCanvasElement;
    /** The rendering backend type. */
    readonly type: "canvas2d" | "webgl2" | "webgpu";

    /** Begin a new render frame. */
    begin(): void;
    /** End the current render frame and flush pending draws. */
    end(): void;
    /** Clear the screen with a solid color. */
    clear(color: string | Color): void;
    /** Return the underlying rendering context (CanvasRenderingContext2D or WebGL2RenderingContext). */
    getContext(): unknown;
    /** Return per-frame renderer instrumentation counters. */
    getStats(): RendererStats;
    /** Configure post-processing. Unsupported backends may ignore this. */
    setPostProcessing(config?: PostProcessingConfig): void;

    /** Apply camera transform (center position and zoom). */
    setTransform(pos: Vec2, zoom: number): void;
    /** Reset to the default (identity) transform. */
    resetTransform(): void;

    /** Create an offscreen framebuffer of the given size. */
    createFrameBuffer(width: number, height: number): FrameBuffer;
    /** Bind a framebuffer as the render target, or null for the main canvas. */
    bindFrameBuffer(fb: FrameBuffer | null): void;
    /** Draw a framebuffer's contents to the screen. */
    drawFrameBuffer(
        fb: FrameBuffer,
        x: number,
        y: number,
        w: number,
        h: number,
    ): void;

    /** Draw a filled rectangle. */
    drawRect(pos: Vec2, size: Vec2, color: string | Color): void;
    /** Draw a line between two points. */
    drawLine(a: Vec2, b: Vec2, color: string | Color, thickness?: number): void;
    /** Draw a filled circle. */
    drawCircle(pos: Vec2, radius: number, color: string | Color): void;
    /** Draw an image or sprite sheet frame. */
    drawSprite(
        image: CanvasImageSource,
        pos: Vec2,
        size?: Vec2,
        options?: SpriteOptions,
    ): void;
    /** Draw text at a position. */
    drawText(text: string, pos: Vec2, options?: TextOptions): void;
    /** Draw a rectangle outline (stroke only). */
    drawRectOutline(
        pos: Vec2,
        size: Vec2,
        color: string | Color,
        thickness?: number,
    ): void;
    /** Draw a circle outline (stroke only). */
    drawCircleOutline(
        pos: Vec2,
        radius: number,
        color: string | Color,
        thickness?: number,
    ): void;
}
