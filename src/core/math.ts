/** 2D vector class for position, velocity, and size calculations. */
export class Vec2 {
  /**
   * @param x - X component.
   * @param y - Y component.
   */
  constructor(
    public x: number = 0,
    public y: number = 0,
  ) {}

  /** Set vector components. */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** Copy components from another vector. */
  copy(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /** Return a new Vec2 copy of this vector. */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /** Add another vector to this one. */
  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** Subtract another vector from this one. */
  subtract(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** Multiply components by a scalar. */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** Calculate dot product with another vector. */
  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  /** Calculate length of the vector. */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** Calculate squared length of the vector. */
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** Scale vector to unit length (length of 1). */
  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /** Distance to another vector. */
  distanceTo(v: Vec2): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Linear interpolation towards another vector. */
  lerp(v: Vec2, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    return this;
  }

  /** Angle of the vector in radians. */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** Rotate the vector by an angle in radians. */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = this.x * cos - this.y * sin;
    const ry = this.x * sin + this.y * cos;
    this.x = rx;
    this.y = ry;
    return this;
  }

  /** Check if components are equal to another vector. */
  equals(v: Vec2): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /** Floor both components. */
  floor(): this {
    this.x = Math.floor(this.x);
    this.y = Math.floor(this.y);
    return this;
  }

  /** Ceil both components. */
  ceil(): this {
    this.x = Math.ceil(this.x);
    this.y = Math.ceil(this.y);
    return this;
  }

  /** Round both components. */
  round(): this {
    this.x = Math.round(this.x);
    this.y = Math.round(this.y);
    return this;
  }

  /** Negate both components. */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /** Rotate the vector 90 degrees counter-clockwise. */
  perp(): this {
    const tx = this.x;
    this.x = -this.y;
    this.y = tx;
    return this;
  }
}

/** Helper to create a Vec2 instance. */
export function vec2(x?: number, y?: number): Vec2 {
  return new Vec2(x, y);
}

/** 2D axis-aligned bounding box or rectangle. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Helper to create a Rect object. */
export function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, w, h };
}

/** Clamp a value between min and max limits. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between numbers a and b. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Map a value from an input range to an output range. */
export function mapRange(
  v: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return outMin + ((v - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Random float in range [min, max). */
export function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in range [min, max] inclusive. */
export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Choose a random element from an array. */
export function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
