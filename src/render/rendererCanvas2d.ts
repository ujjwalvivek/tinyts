import type { Vec2 } from '../core/math';
import { getCanvasState } from '../core/canvas';
import { Color } from './color';
import { defaultTextFont, ensureDefaultFontFace } from './font';
import type { Renderer, SpriteOptions, TextOptions, FrameBuffer, RendererStats, PostProcessingConfig } from './types';

function resolveColor(c: string | Color): string {
  return c instanceof Color ? c.toString() : c;
}

/** 2D renderer using the Canvas 2D API. */
export class Canvas2DRenderer implements Renderer {
  /** The rendering backend type. */
  readonly type = 'canvas2d' as const;
  /** The HTML canvas element used for rendering. */
  readonly canvas: HTMLCanvasElement;
  /** The 2D rendering context. */
  readonly ctx: CanvasRenderingContext2D;

  private transformStack: number;
  private offscreenCtx: CanvasRenderingContext2D | null = null;
  private stats: RendererStats = {
    drawCalls: 0,
    batchFlushes: 0,
    textureSwitches: 0,
    shapeSwitches: 0,
    quads: 0,
    overlayLineCalls: 0,
    overlayTextCalls: 0,
  };

  /**
   * Create a Canvas2D renderer.
   * @param canvas - Target canvas element.
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.transformStack = 0;
  }

  private getViewSize(): { width: number; height: number } {
    const state = getCanvasState();
    if (state?.canvas === this.canvas) {
      return { width: state.logicalWidth, height: state.logicalHeight };
    }
    return { width: this.canvas.width, height: this.canvas.height };
  }

  private applyBaseTransform(): void {
    const state = getCanvasState();
    if (state?.canvas === this.canvas) {
      this.ctx.setTransform(state.backingScaleX, 0, 0, state.backingScaleY, 0, 0);
    } else {
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Begin a new render frame. */
  begin(): void {
    this.resetStats();
    this.transformStack = 0;
    this.applyBaseTransform();
  }

  /** End the current render frame and flush pending draws. */
  end(): void {
    while (this.transformStack > 0) {
      this.ctx.restore();
      this.transformStack--;
    }
  }

  /** Clear the screen with a color. */
  clear(color: string | Color): void {
    const ctx = this.getDrawCtx();
    ctx.fillStyle = resolveColor(color);
    if (ctx === this.ctx) {
      const view = this.getViewSize();
      ctx.fillRect(0, 0, view.width, view.height);
    } else {
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  /** Return the Canvas2D context. */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /** Return per-frame renderer instrumentation counters. */
  getStats(): RendererStats {
    return { ...this.stats };
  }

  /** Configure post-processing. Canvas2D currently renders without post effects. */
  setPostProcessing(_config?: PostProcessingConfig): void {}

  private resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.batchFlushes = 0;
    this.stats.textureSwitches = 0;
    this.stats.shapeSwitches = 0;
    this.stats.quads = 0;
    this.stats.overlayLineCalls = 0;
    this.stats.overlayTextCalls = 0;
  }

  /** Set the camera transform. */
  setTransform(pos: Vec2, zoom: number): void {
    const view = this.getViewSize();
    this.ctx.save();
    this.transformStack++;
    this.ctx.translate(view.width / 2, view.height / 2);
    this.ctx.scale(zoom, zoom);
    this.ctx.translate(-pos.x, -pos.y);
  }

  /** Reset the camera transform. */
  resetTransform(): void {
    if (this.transformStack > 0) {
      this.ctx.restore();
      this.transformStack--;
    }
  }

  /** Create an offscreen framebuffer. */
  createFrameBuffer(width: number, height: number): FrameBuffer {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { canvas, ctx, width, height };
  }

  /** Bind a framebuffer as the render target, or null for the main canvas. */
  bindFrameBuffer(fb: FrameBuffer | null): void {
    this.offscreenCtx = fb?.ctx ?? null;
  }

  /** Draw a framebuffer to the screen. */
  drawFrameBuffer(fb: FrameBuffer, x: number, y: number, w: number, h: number): void {
    if (fb.canvas) {
      this.ctx.drawImage(fb.canvas, x, y, w, h);
    }
  }

  private getDrawCtx(): CanvasRenderingContext2D {
    return this.offscreenCtx || this.ctx;
  }

  /** Draw a filled rectangle. */
  drawRect(pos: Vec2, size: Vec2, color: string | Color): void {
    const ctx = this.getDrawCtx();
    ctx.fillStyle = resolveColor(color);
    ctx.fillRect(pos.x, pos.y, size.x, size.y);
  }

  /** Draw a line between two points. */
  drawLine(a: Vec2, b: Vec2, color: string | Color, thickness: number = 1): void {
    const ctx = this.getDrawCtx();
    ctx.strokeStyle = resolveColor(color);
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  /** Draw a filled circle. */
  drawCircle(pos: Vec2, radius: number, color: string | Color): void {
    const ctx = this.getDrawCtx();
    ctx.fillStyle = resolveColor(color);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Draw a sprite or image. */
  drawSprite(image: CanvasImageSource, pos: Vec2, size: Vec2, options?: SpriteOptions): void {
    const ctx = this.getDrawCtx();
    const img = image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
    const sx = options?.sourceX ?? 0;
    const sy = options?.sourceY ?? 0;
    const sw = options?.sourceWidth ?? img.width;
    const sh = options?.sourceHeight ?? img.height;
    const flipX = options?.flipX ?? false;
    const flipY = options?.flipY ?? false;
    const dw = size?.x ?? img.width;
    const dh = size?.y ?? img.height;

    ctx.save();
    ctx.translate(pos.x + dw / 2, pos.y + dh / 2);

    if (options?.angle) {
      ctx.rotate(options.angle);
    }

    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    ctx.restore();
  }

  /** Draw text at a position. */
  drawText(text: string, pos: Vec2, options?: TextOptions): void {
    ensureDefaultFontFace();
    const ctx = this.getDrawCtx();
    const size = options?.size ?? 16;
    ctx.fillStyle = options?.color ? resolveColor(options.color) : '#fff';
    ctx.font = options?.font ?? defaultTextFont(size);
    ctx.textAlign = options?.align ?? 'left';
    ctx.textBaseline = options?.baseline ?? 'top';
    ctx.fillText(text, pos.x, pos.y);
  }

  /** Draw a rectangle outline. */
  drawRectOutline(pos: Vec2, size: Vec2, color: string | Color, thickness: number = 1): void {
    const ctx = this.getDrawCtx();
    ctx.strokeStyle = resolveColor(color);
    ctx.lineWidth = thickness;
    ctx.strokeRect(pos.x, pos.y, size.x, size.y);
  }

  /** Draw a circle outline. */
  drawCircleOutline(pos: Vec2, radius: number, color: string | Color, thickness: number = 1): void {
    const ctx = this.getDrawCtx();
    ctx.strokeStyle = resolveColor(color);
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}
