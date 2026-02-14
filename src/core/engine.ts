import { CanvasManager, type ScaleMode } from './canvas';
export type { ScaleMode };
import { InputManager } from './input';
import { createRenderer, beginFrame, endFrame } from '../render/renderer2d';
import type { Renderer } from '../render/types';
import { consumeGlobalTweenManager, TweenManager } from './easing';
import { processTextInput, stopTextInput } from './textInput';
import { consumeGlobalAudioManager, AudioManager } from '../audio/audio';
import { ParticleSystem } from '../fx/particles';

/** Lifecycle hooks for extending the engine. */
export interface EnginePlugin {
  /** Unique plugin identifier. */
  name: string;
  /** Called once when the plugin is registered. */
  init?(engine: Engine): void;
  /** Called each frame during the update phase. */
  update?(engine: Engine, dt: number): void;
  /** Called each frame during the render phase. */
  render?(engine: Engine, alpha: number): void;
  /** Called when the engine is destroyed. */
  destroy?(engine: Engine): void;
}

/** Configuration for creating an Engine instance. */
export interface EngineConfig {
  /** Logical resolution in pixels. */
  size: { width: number; height: number };
  /** How the canvas scales to fit the window. */
  scaleMode?: ScaleMode;
  /** Enable nearest-neighbor scaling (default true). */
  pixelated?: boolean;
  /** Use WebGL renderer instead of Canvas2D. */
  webgl?: boolean;
  /** Fixed update rate in Hz (default 60). */
  fixedHz?: number;
  /** Max fixed steps per frame to prevent spiral of death (default 5). */
  maxSteps?: number;
  /** Max frame delta in seconds, clamped to avoid large jumps (default 0.25). */
  maxFrameDt?: number;
  /** Fixed-timestep update callback. */
  update?: (dt: number) => void;
  /** Variable-timestep render callback. */
  render?: (alpha: number) => void;
}

/** Per-frame performance statistics. */
export interface EngineStats {
  /** Smoothed frames per second. */
  fps: number;
  /** Average FPS over the sample window. */
  avgFps: number;
  /** Last frame duration in milliseconds. */
  frameMs: number;
  /** Number of fixed-update steps taken this frame. */
  fixedSteps: number;
  /** Configured fixed-update rate in Hz. */
  fixedHz: number;
}

const FPS_SAMPLES = 60;
const DEFAULT_FIXED_HZ = 60;
const DEFAULT_MAX_STEPS = 5;
const DEFAULT_MAX_FRAME_DT = 0.25;

/**
 * Core game engine - owns the main loop, renderer, input, audio, and subsystems.
 *
 * @example
 * ```ts
 * const engine = engineStart({ size: { width: 320, height: 240 }, update: (dt) => {}, render: (alpha) => {} });
 * ```
 */
export class Engine {
  readonly config: EngineConfig;
  readonly canvasManager: CanvasManager;
  readonly inputManager: InputManager;
  readonly renderer: Renderer;
  readonly audioManager: AudioManager;
  readonly particleSystem: ParticleSystem;
  readonly tweenManager: TweenManager;
  private overlayCanvas: HTMLCanvasElement | null = null;
  private removeResizeListener: (() => void) | null = null;
  private readonly plugins: EnginePlugin[] = [];

  /** Register a plugin and immediately call its init hook. */
  registerPlugin(plugin: EnginePlugin): void {
    this.plugins.push(plugin);
    plugin.init?.(this);
  }

  /** Retrieve a registered plugin by name. */
  getPlugin<T extends EnginePlugin>(name: string): T | undefined {
    return this.plugins.find((p) => p.name === name) as T | undefined;
  }

  /** Whether the engine loop is active. */
  running = false;
  /** Current requestAnimationFrame ID. */
  rafId = 0;
  /** Total elapsed simulation time in seconds. */
  time = 0;
  /** Total number of fixed-update steps executed. */
  frameCount = 0;
  /** Interpolation alpha between the last two fixed updates (0-1). */
  alpha = 0;

  /** Live performance statistics, updated each frame. */
  stats: EngineStats = {
    fps: 0,
    avgFps: 0,
    frameMs: 0,
    fixedSteps: 0,
    fixedHz: DEFAULT_FIXED_HZ,
  };

  private accumulator = 0;
  private lastTime = 0;
  private fpsSamples: number[] = [];

  constructor(config: EngineConfig) {
    this.config = config;
    const fixedHz = config.fixedHz ?? DEFAULT_FIXED_HZ;
    this.stats.fixedHz = fixedHz;

    this.canvasManager = new CanvasManager({
      size: config.size,
      scaleMode: config.scaleMode,
      pixelated: config.pixelated,
    });

    const renderSetup = createRenderer(this.canvasManager.canvas, config.webgl ?? false, this.canvasManager);
    this.renderer = renderSetup.renderer;
    this.overlayCanvas = renderSetup.overlayCanvas;
    this.removeResizeListener = renderSetup.removeResizeListener;
    this.inputManager = new InputManager(this.canvasManager);

    const globalAudio = consumeGlobalAudioManager();
    if (globalAudio) {
      this.audioManager = globalAudio;
    } else {
      this.audioManager = new AudioManager();
    }

    this.particleSystem = new ParticleSystem();
    const globalTweens = consumeGlobalTweenManager();
    if (globalTweens) {
      this.tweenManager = globalTweens;
    } else {
      this.tweenManager = new TweenManager();
    }

    this.running = true;
    this.lastTime = performance.now();

    window.addEventListener('keydown', processTextInput);

    this.loop = this.loop.bind(this);
    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop(now: number): void {
    if (!this.running) return;

    this.rafId = requestAnimationFrame(this.loop);

    const maxFrameDt = this.config.maxFrameDt ?? DEFAULT_MAX_FRAME_DT;
    const frameDt = Math.min((now - this.lastTime) / 1000, maxFrameDt);
    this.lastTime = now;

    this.fpsSamples.push(frameDt);
    if (this.fpsSamples.length > FPS_SAMPLES) this.fpsSamples.shift();
    const avgDt = this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length;
    this.stats.fps = avgDt > 0 ? Math.round(1 / avgDt) : 0;
    this.stats.avgFps = this.stats.fps;
    this.stats.frameMs = frameDt * 1000;

    this.tweenManager.update(frameDt);

    for (const plugin of this.plugins) {
      plugin.update?.(this, frameDt);
    }

    const fixedHz = this.config.fixedHz ?? DEFAULT_FIXED_HZ;
    const fixedDt = 1 / fixedHz;
    const maxSteps = this.config.maxSteps ?? DEFAULT_MAX_STEPS;

    this.accumulator += frameDt;
    let steps = 0;

    this.inputManager.updateGamepad();

    while (this.accumulator >= fixedDt && steps < maxSteps) {
      this.config.update?.(fixedDt);
      this.accumulator -= fixedDt;
      steps++;
      this.frameCount++;
      this.time += fixedDt;
    }

    this.stats.fixedSteps = steps;
    this.alpha = this.accumulator / fixedDt;

    // Synchronize globals for backward compatibility:
    updateGlobals(this);

    beginFrame();
    this.config.render?.(this.alpha);
    for (const plugin of this.plugins) {
      plugin.render?.(this, this.alpha);
    }
    endFrame();

    if (steps > 0) {
      this.inputManager.clearTransient();
    }
  }

  /** Stop the engine loop and release all resources. */
  destroy(): void {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    window.removeEventListener('keydown', processTextInput);
    stopTextInput();
    for (const plugin of this.plugins) {
      plugin.destroy?.(this);
    }
    this.plugins.length = 0;
    this.inputManager.destroy();
    this.audioManager.destroy();
    this.particleSystem.clear();
    this.tweenManager.clear();
    this.removeResizeListener?.();
    this.overlayCanvas?.remove();
    this.canvasManager.destroy(true);
  }
}

/** Currently active engine instance, or null if not started. */
export let activeEngine: Engine | null = null;
/** Global mirror of `Engine.frameCount`, updated each frame. */
export let frameCount = 0;
/** Global mirror of `Engine.time`, updated each frame. */
export let time = 0;
/** Global mirror of `Engine.alpha`, updated each frame. */
export let alpha = 0;
/** Global mirror of `Engine.stats`, updated each frame. */
export let stats: EngineStats = {
  fps: 0,
  avgFps: 0,
  frameMs: 0,
  fixedSteps: 0,
  fixedHz: DEFAULT_FIXED_HZ,
};

function updateGlobals(engine: Engine): void {
  frameCount = engine.frameCount;
  time = engine.time;
  alpha = engine.alpha;
  stats.fps = engine.stats.fps;
  stats.avgFps = engine.stats.avgFps;
  stats.frameMs = engine.stats.frameMs;
  stats.fixedSteps = engine.stats.fixedSteps;
  stats.fixedHz = engine.stats.fixedHz;
}

/** Return the currently active engine instance, or null. */
export function getActiveEngine(): Engine | null {
  return activeEngine;
}

/**
 * Create and start the engine. Returns the existing instance if already running.
 *
 * @example
 * ```ts
 * const engine = engineStart({
 *   size: { width: 320, height: 240 },
 *   update(dt) { // physics },
 *   render(alpha) { // draw },
 * });
 * ```
 */
export function engineStart(config: EngineConfig): Engine {
  if (activeEngine) return activeEngine;
  activeEngine = new Engine(config);
  updateGlobals(activeEngine);
  return activeEngine;
}

/** Stop the active engine and release all resources. */
export function engineStop(): void {
  if (!activeEngine) return;
  activeEngine.destroy();
  activeEngine = null;
}
