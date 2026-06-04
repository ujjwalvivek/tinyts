import type { Vec2 } from '../core/math';
import type { Color } from './color';

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

/** Offscreen render target. Holds either a Canvas2D surface or a WebGL2 FBO. */
export interface FrameBuffer {
  /** Canvas element (Canvas2D backend only). */
  canvas?: HTMLCanvasElement;
  /** 2D context (Canvas2D backend only). */
  ctx?: CanvasRenderingContext2D;
  /** GL texture attachment (WebGL2 backend only). */
  texture?: WebGLTexture;
  /** GL framebuffer object (WebGL2 backend only). */
  fbo?: WebGLFramebuffer;
  /** Width of the framebuffer in pixels. */
  width: number;
  /** Height of the framebuffer in pixels. */
  height: number;
}

/** Backend-agnostic 2D renderer interface (Canvas2D or WebGL2). */
export interface Renderer {
  /** The HTML canvas element used for rendering. */
  readonly canvas: HTMLCanvasElement;
  /** The rendering backend type. */
  readonly type: 'canvas2d' | 'webgl2';

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

  /** Apply camera transform (center position and zoom). */
  setTransform(pos: Vec2, zoom: number): void;
  /** Reset to the default (identity) transform. */
  resetTransform(): void;

  /** Create an offscreen framebuffer of the given size. */
  createFrameBuffer(width: number, height: number): FrameBuffer;
  /** Bind a framebuffer as the render target, or null for the main canvas. */
  bindFrameBuffer(fb: FrameBuffer | null): void;
  /** Draw a framebuffer's contents to the screen. */
  drawFrameBuffer(fb: FrameBuffer, x: number, y: number, w: number, h: number): void;

  /** Draw a filled rectangle. */
  drawRect(pos: Vec2, size: Vec2, color: string | Color): void;
  /** Draw a line between two points. */
  drawLine(a: Vec2, b: Vec2, color: string | Color, thickness?: number): void;
  /** Draw a filled circle. */
  drawCircle(pos: Vec2, radius: number, color: string | Color): void;
  /** Draw an image or sprite sheet frame. */
  drawSprite(image: CanvasImageSource, pos: Vec2, size?: Vec2, options?: SpriteOptions): void;
  /** Draw text at a position. */
  drawText(text: string, pos: Vec2, options?: TextOptions): void;
  /** Draw a rectangle outline (stroke only). */
  drawRectOutline(pos: Vec2, size: Vec2, color: string | Color, thickness?: number): void;
  /** Draw a circle outline (stroke only). */
  drawCircleOutline(pos: Vec2, radius: number, color: string | Color, thickness?: number): void;
}
