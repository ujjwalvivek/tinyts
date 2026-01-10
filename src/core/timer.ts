import { activeEngine } from './engine';

/**
 * A simple stopwatch-style timer using engine time or wall-clock time.
 *
 * Useful for cooldowns, timed events, lap timing, spawn intervals, etc.
 *
 * ```ts
 * // 5-second cooldown using engine time (respects fixed-step)
 * const cooldown = new Timer();
 * if (cooldown.done(5)) {
 *   fireBullet();
 *   cooldown.reset();
 * }
 *
 * // Real-time profiling using wall clock
 * const profile = new Timer(false);
 * heavyComputation();
 * console.log(`took ${profile.elapsed().toFixed(2)}ms`);
 * ```
 */
export class Timer {
  private start: number;
  private paused = false;
  private pauseOffset = 0;

  /**
   * @param useEngineTime - Whether to use the engine's fixed-step time (default: true).
   */
  constructor(private useEngineTime = true) {
    this.start = this.now();
  }

  /** Reset the timer back to zero. */
  reset(): void {
    this.start = this.now();
    this.paused = false;
    this.pauseOffset = 0;
  }

  /** Seconds elapsed since start (or since last resume). */
  elapsed(): number {
    if (this.paused) return this.pauseOffset;
    return this.now() - this.start;
  }

  /** Milliseconds elapsed (convenience for `elapsed() * 1000`). */
  elapsedMs(): number {
    return this.elapsed() * 1000;
  }

  /** Pause the timer. `elapsed()` will freeze until `resume()`. */
  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.pauseOffset = this.now() - this.start;
  }

  /** Resume a paused timer. */
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.start = this.now() - this.pauseOffset;
    this.pauseOffset = 0;
  }

  /** Returns true if `duration` seconds have elapsed. */
  done(duration: number): boolean {
    return this.elapsed() >= duration;
  }

  /**
   * Returns the fraction `[0, 1]` of `duration` completed.
   * Clamped so it never exceeds 1.
   */
  progress(duration: number): number {
    return Math.min(this.elapsed() / duration, 1);
  }

  /**
   * Returns the remaining seconds before `duration` is reached.
   * Returns 0 if already done.
   */
  remaining(duration: number): number {
    return Math.max(0, duration - this.elapsed());
  }

  /** Returns true if the timer is currently paused. */
  isPaused(): boolean {
    return this.paused;
  }

  private now(): number {
    if (this.useEngineTime) {
      return activeEngine?.time ?? performance.now() / 1000;
    }
    return performance.now() / 1000;
  }
}
