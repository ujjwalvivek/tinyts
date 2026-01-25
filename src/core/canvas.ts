import { activeEngine } from './engine';

export type ScaleMode = 'fit' | 'integer' | 'integer-or-fit' | 'stretch';
export type CanvasState = CanvasManager;

/** Configuration options for creating a CanvasManager. */
export interface CanvasOptions {
  /** Optional existing canvas element to manage. */
  canvas?: HTMLCanvasElement;
  /** Logical resolution in pixels. */
  size: { width: number; height: number };
  /** Canvas scaling mode. */
  scaleMode?: ScaleMode;
  /** Enable nearest-neighbor pixelated rendering. */
  pixelated?: boolean;
  /** Parent element to append the created canvas to. */
  parent?: HTMLElement;
}

export type CanvasResizeListener = (manager: CanvasManager) => void;

/** Manages canvas sizing, resolution, scaling, and event coordination. */
export class CanvasManager {
  /** Managed HTML canvas element. */
  readonly canvas: HTMLCanvasElement;
  /** Whether the canvas was created by the manager. */
  readonly ownsCanvas: boolean;

  /** Logical canvas width. */
  logicalWidth: number;
  /** Logical canvas height. */
  logicalHeight: number;
  /** CSS display width in pixels. */
  displayWidth: number = 0;
  /** CSS display height in pixels. */
  displayHeight: number = 0;
  /** Physical backing store width in pixels. */
  backingWidth: number = 0;
  /** Physical backing store height in pixels. */
  backingHeight: number = 0;
  /** X backing store scale factor. */
  backingScaleX: number = 1;
  /** Y backing store scale factor. */
  backingScaleY: number = 1;
  /** Device pixel ratio. */
  dpr: number = 1;
  /** CSS horizontal scale factor. */
  scaleX: number = 1;
  /** CSS vertical scale factor. */
  scaleY: number = 1;
  /** CSS horizontal offset in pixels. */
  offsetX: number = 0;
  /** CSS vertical offset in pixels. */
  offsetY: number = 0;

  private resizeFn: () => void;
  private resizeListeners = new Set<CanvasResizeListener>();

  constructor(options: CanvasOptions) {
    this.canvas = options.canvas ?? document.createElement('canvas');
    this.ownsCanvas = !options.canvas;
    this.logicalWidth = options.size.width;
    this.logicalHeight = options.size.height;

    if (this.ownsCanvas) {
      this.canvas.style.display = 'block';
      const parent = options.parent ?? document.body;
      parent.appendChild(this.canvas);
    }

    const pixelated = options.pixelated ?? true;
    const scaleMode = options.scaleMode ?? 'integer-or-fit';

    this.resizeFn = () => this.handleResize(pixelated, scaleMode);
    window.addEventListener('resize', this.resizeFn);
    this.handleResize(pixelated, scaleMode);
  }

  /**
   * Add a listener for canvas resize events.
   * @param listener - Callback triggered when canvas is resized.
   * @returns Unsubscribe function.
   */
  addResizeListener(listener: CanvasResizeListener): () => void {
    this.resizeListeners.add(listener);
    listener(this);
    return () => {
      this.resizeListeners.delete(listener);
    };
  }

  private handleResize(pixelated: boolean, mode: ScaleMode): void {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;

    const scale = computeScale(
      windowW,
      windowH,
      this.logicalWidth,
      this.logicalHeight,
      mode,
    );

    this.scaleX = scale.scaleX;
    this.scaleY = scale.scaleY;
    this.offsetX = scale.offsetX;
    this.offsetY = scale.offsetY;
    this.displayWidth = this.logicalWidth * this.scaleX;
    this.displayHeight = this.logicalHeight * this.scaleY;
    this.dpr = Math.max(1, window.devicePixelRatio || 1);
    this.backingWidth = Math.max(1, Math.round(this.displayWidth * this.dpr));
    this.backingHeight = Math.max(1, Math.round(this.displayHeight * this.dpr));
    this.backingScaleX = this.backingWidth / this.logicalWidth;
    this.backingScaleY = this.backingHeight / this.logicalHeight;

    if (this.canvas.width !== this.backingWidth) {
      this.canvas.width = this.backingWidth;
    }
    if (this.canvas.height !== this.backingHeight) {
      this.canvas.height = this.backingHeight;
    }

    this.applyCanvasStyle(pixelated);
    for (const listener of this.resizeListeners) {
      listener(this);
    }
  }

  private applyCanvasStyle(pixelated: boolean): void {
    this.canvas.style.width = `${this.displayWidth}px`;
    this.canvas.style.height = `${this.displayHeight}px`;
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = `${this.offsetX}px`;
    this.canvas.style.top = `${this.offsetY}px`;
    this.canvas.style.imageRendering = pixelated ? 'pixelated' : 'auto';
  }

  /**
   * Convert client (screen) coordinates to logical coordinates.
   * @param clientX - Screen X coordinate.
   * @param clientY - Screen Y coordinate.
   */
  clientToLogical(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * this.logicalWidth,
      y: ((clientY - rect.top) / rect.height) * this.logicalHeight,
    };
  }

  /**
   * Clean up event listeners and optionally remove the owned canvas.
   * @param removeOwnedCanvas - Whether to remove the canvas from the DOM.
   */
  destroy(removeOwnedCanvas: boolean = false): void {
    window.removeEventListener('resize', this.resizeFn);
    this.resizeListeners.clear();
    if (removeOwnedCanvas && this.ownsCanvas) {
      this.canvas.remove();
    }
  }
}

function computeScale(
  windowW: number,
  windowH: number,
  logicalW: number,
  logicalH: number,
  mode: ScaleMode,
): { scaleX: number; scaleY: number; offsetX: number; offsetY: number } {
  const ratioX = windowW / logicalW;
  const ratioY = windowH / logicalH;

  switch (mode) {
    case 'stretch':
      return { scaleX: ratioX, scaleY: ratioY, offsetX: 0, offsetY: 0 };

    case 'integer': {
      const s = Math.max(1, Math.floor(Math.min(ratioX, ratioY)));
      const w = logicalW * s;
      const h = logicalH * s;
      return {
        scaleX: s,
        scaleY: s,
        offsetX: Math.floor((windowW - w) / 2),
        offsetY: Math.floor((windowH - h) / 2),
      };
    }

    case 'integer-or-fit': {
      const integerScale = Math.floor(Math.min(ratioX, ratioY));
      if (integerScale >= 1) {
        const w = logicalW * integerScale;
        const h = logicalH * integerScale;
        return {
          scaleX: integerScale,
          scaleY: integerScale,
          offsetX: Math.floor((windowW - w) / 2),
          offsetY: Math.floor((windowH - h) / 2),
        };
      }
    }

    default: {
      const s = Math.min(ratioX, ratioY);
      const w = Math.floor(logicalW * s);
      const h = Math.floor(logicalH * s);
      return {
        scaleX: s,
        scaleY: s,
        offsetX: Math.floor((windowW - w) / 2),
        offsetY: Math.floor((windowH - h) / 2),
      };
    }
  }
}

/** Get the canvas manager of the active engine. */
export function getCanvasState(): CanvasManager | null {
  return activeEngine?.canvasManager ?? null;
}

/**
 * Add a resize listener to the active engine's canvas manager.
 * @param listener - Callback triggered when canvas is resized.
 * @returns Function to unsubscribe the listener.
 */
export function addCanvasResizeListener(listener: CanvasResizeListener): () => void {
  const manager = activeEngine?.canvasManager;
  if (!manager) return () => {};
  return manager.addResizeListener(listener);
}

/**
 * Convert client coordinates to logical coordinates using canvas state.
 * @param state - The CanvasManager state.
 * @param clientX - Screen X coordinate.
 * @param clientY - Screen Y coordinate.
 */
export function clientToLogical(
  state: CanvasManager,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  return state.clientToLogical(clientX, clientY);
}

