import { activeEngine } from './engine';

/** An easing function mapping normalized time `t` in [0,1] to an eased value. */
export type EasingFn = (t: number) => number;

/** Linear easing - no acceleration. */
export function linear(t: number): number {
  return t;
}

/** Quadratic ease-in - accelerating from zero. */
export function quadIn(t: number): number {
  return t * t;
}

/** Quadratic ease-out - decelerating to zero. */
export function quadOut(t: number): number {
  return t * (2 - t);
}

/** Quadratic ease-in-out - accelerates then decelerates. */
export function quadInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Cubic ease-in - accelerating from zero. */
export function cubicIn(t: number): number {
  return t * t * t;
}

/** Cubic ease-out - decelerating to zero. */
export function cubicOut(t: number): number {
  return (--t) * t * t + 1;
}

/** Cubic ease-in-out - accelerates then decelerates. */
export function cubicInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

/** Elastic ease-out - overshoots then settles. */
export function elasticOut(t: number): number {
  return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
}

/** Bounce ease-out - simulates a bouncing stop. */
export function bounceOut(t: number): number {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
}

/** Back ease-out - overshoots target then returns. */
export function backOut(t: number): number {
  return (--t) * t * ((1.70158 + 1) * t + 1.70158) + 1;
}

// ─── Tween ──────────────────────────────────────────────────────────

/** Configuration for creating a tween animation. */
export interface TweenConfig {
  /** Starting values keyed by property name. */
  from: Record<string, number>;
  /** Target values keyed by property name. */
  to: Record<string, number>;
  /** Duration in seconds. */
  duration: number;
  /** Delay in seconds before the tween starts. */
  delay?: number;
  /** Easing function, defaults to `quadOut`. */
  easing?: EasingFn;
  /** Called each frame with interpolated values. */
  onUpdate?: (values: Record<string, number>) => void;
  /** Called once when the tween completes. */
  onComplete?: () => void;
}

/** A running tween instance. Call `update(dt)` each frame. */
export interface Tween {
  /** Whether the tween has completed. */
  readonly done: boolean;
  /** Advance the tween by `dt` seconds. */
  update(dt: number): void;
}

/** Create a standalone tween from the given config. */
export function tween(config: TweenConfig): Tween {
  let elapsed = -(config.delay ?? 0);
  const easing = config.easing ?? quadOut;
  const current: Record<string, number> = {};
  for (const k in config.from) current[k] = config.from[k];
  let done = false;
  let completed = false;

  return {
    get done() { return done; },

    update(dt: number) {
      if (done) return;
      elapsed += dt;

      if (elapsed < 0) return;

      const t = Math.min(elapsed / config.duration, 1);
      const e = easing(t);

      for (const k in config.from) {
        current[k] = config.from[k] + (config.to[k] - config.from[k]) * e;
      }

      config.onUpdate?.(current);

      if (t >= 1 && !completed) {
        completed = true;
        done = true;
        config.onComplete?.();
      }
    },
  };
}

// ─── Tween Manager ──────────────────────────────────────────────────

/** Manages a collection of active tweens, removing them when complete. */
export class TweenManager {
  /** Currently running tweens. */
  readonly activeTweens: Tween[] = [];

  /** Create and track a new tween. */
  add(config: TweenConfig): Tween {
    const t = tween(config);
    this.activeTweens.push(t);
    return t;
  }

  /** Advance all active tweens and remove completed ones. */
  update(dt: number): void {
    for (let i = this.activeTweens.length - 1; i >= 0; i--) {
      this.activeTweens[i].update(dt);
      if (this.activeTweens[i].done) {
        this.activeTweens.splice(i, 1);
      }
    }
  }

  /** Remove all active tweens. */
  clear(): void {
    this.activeTweens.length = 0;
  }
}

let globalTweenManager: TweenManager | null = null;

/** Get the active engine's TweenManager, or a global fallback instance. */
export function getTweenManager(): TweenManager {
  if (activeEngine?.tweenManager) {
    return activeEngine.tweenManager;
  }
  if (!globalTweenManager) {
    globalTweenManager = new TweenManager();
  }
  return globalTweenManager;
}

/** @internal Take ownership of the global TweenManager, clearing the reference. */
export function consumeGlobalTweenManager(): TweenManager | null {
  const mgr = globalTweenManager;
  globalTweenManager = null;
  return mgr;
}

/** Convenience - add a tween to the active TweenManager. */
export function addTween(config: TweenConfig): Tween {
  return getTweenManager().add(config);
}

/** Convenience - update all tweens in the active TweenManager. */
export function updateTweens(dt: number): void {
  getTweenManager().update(dt);
}

/** Convenience - clear all tweens in the active TweenManager. */
export function clearTweens(): void {
  getTweenManager().clear();
}
