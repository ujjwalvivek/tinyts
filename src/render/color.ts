import { clamp } from "../core/math";

/** RGBA color with components in 0-1 range. */
export class Color {
    /**
     * @param r - Red channel (0-1)
     * @param g - Green channel (0-1)
     * @param b - Blue channel (0-1)
     * @param a - Alpha channel (0-1)
     */
    constructor(
        public r: number = 1,
        public g: number = 1,
        public b: number = 1,
        public a: number = 1,
    ) {}

    /** Set all channels. Returns this for chaining. */
    set(r: number, g: number, b: number, a: number = this.a): this {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
        return this;
    }

    /** Copy channels from another Color. Returns this for chaining. */
    copy(c: Color): this {
        this.r = c.r;
        this.g = c.g;
        this.b = c.b;
        this.a = c.a;
        return this;
    }

    /** Return a new Color with the same channel values. */
    clone(): Color {
        return new Color(this.r, this.g, this.b, this.a);
    }

    /** Component-wise multiply by another Color. */
    multiply(c: Color): this {
        this.r *= c.r;
        this.g *= c.g;
        this.b *= c.b;
        this.a *= c.a;
        return this;
    }

    /** Linearly interpolate toward another Color by factor t (0-1). */
    lerp(c: Color, t: number): this {
        this.r += (c.r - this.r) * t;
        this.g += (c.g - this.g) * t;
        this.b += (c.b - this.b) * t;
        this.a += (c.a - this.a) * t;
        return this;
    }

    /** Darken by a factor (0-1). Does not affect alpha. */
    darken(amount: number): this {
        this.r *= 1 - amount;
        this.g *= 1 - amount;
        this.b *= 1 - amount;
        return this;
    }

    /** Lighten by a factor (0-1). Does not affect alpha. */
    lighten(amount: number): this {
        this.r += (1 - this.r) * amount;
        this.g += (1 - this.g) * amount;
        this.b += (1 - this.b) * amount;
        return this;
    }

    /** Convert to a "#rrggbb" hex string. */
    toHex(): string {
        const r = clamp(Math.round(this.r * 255), 0, 255);
        const g = clamp(Math.round(this.g * 255), 0, 255);
        const b = clamp(Math.round(this.b * 255), 0, 255);
        return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
    }

    /** Convert to an "rgba(r,g,b,a)" CSS string. */
    toRGBA(): string {
        const r = clamp(Math.round(this.r * 255), 0, 255);
        const g = clamp(Math.round(this.g * 255), 0, 255);
        const b = clamp(Math.round(this.b * 255), 0, 255);
        const a = clamp(this.a, 0, 1);
        return `rgba(${r},${g},${b},${a})`;
    }

    /** Convert to a CSS color string (hex if opaque, rgba otherwise). */
    toString(): string {
        if (this.a < 1) return this.toRGBA();
        return this.toHex();
    }

    /** Cache of parsed hex/rgba color strings to Color instances. */
    private static hexCache = new Map<string, Color>();

    /** Parse a hex string ("#rgb", "#rrggbb", "#rrggbbaa") or "rgba(...)" into a Color. */
    static fromHex(hex: string): Color {
        const cached = Color.hexCache.get(hex);
        if (cached) return cached;

        let parsed: Color;
        // Handle rgba(r,g,b,a) format
        let m = hex.match(
            /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/,
        );
        if (m) {
            parsed = new Color(
                parseInt(m[1]) / 255,
                parseInt(m[2]) / 255,
                parseInt(m[3]) / 255,
                m[4] !== undefined ? parseFloat(m[4]) : 1,
            );
        } else {
            // Handle hex format (#rgb, #rrggbb, #rrggbbaa)
            const cleanHex = hex.replace("#", "");
            let expandedHex = cleanHex;
            if (cleanHex.length === 3) {
                expandedHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
            }
            const r = parseInt(expandedHex.substring(0, 2), 16) / 255;
            const g = parseInt(expandedHex.substring(2, 4), 16) / 255;
            const b = parseInt(expandedHex.substring(4, 6), 16) / 255;
            const a =
                expandedHex.length === 8 ? parseInt(expandedHex.substring(6, 8), 16) / 255 : 1;
            parsed = new Color(
                isNaN(r) ? 0 : r,
                isNaN(g) ? 0 : g,
                isNaN(b) ? 0 : b,
                isNaN(a) ? 1 : a,
            );
        }

        Color.hexCache.set(hex, parsed);
        return parsed;
    }

    /**
     * Create a Color from HSL values.
     * @param h - Hue in degrees (0-360)
     * @param s - Saturation (0-1)
     * @param l - Lightness (0-1)
     */
    static fromHSL(h: number, s: number, l: number, a: number = 1): Color {
        h = (((h % 360) + 360) % 360) / 360;
        s = clamp(s, 0, 1);
        l = clamp(l, 0, 1);

        if (s === 0) return new Color(l, l, l, a);

        const hue2rgb = (p: number, q: number, t: number): number => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        return new Color(
            hue2rgb(p, q, h + 1 / 3),
            hue2rgb(p, q, h),
            hue2rgb(p, q, h - 1 / 3),
            a,
        );
    }

    /** Create a Color from 0-255 RGB values. */
    static rgb(r: number, g: number, b: number, a?: number): Color {
        return new Color(r / 255, g / 255, b / 255, a);
    }

    /**
     * Create a Color from HSL with percentage saturation/lightness.
     * @param h - Hue in degrees (0-360)
     * @param s - Saturation (0-100)
     * @param l - Lightness (0-100)
     */
    static hsl(h: number, s: number, l: number, a?: number): Color {
        return Color.fromHSL(h, s / 100, l / 100, a);
    }
}

/** Shorthand for Color.rgb(). Create a Color from 0-255 RGB values. */
export function rgb(r: number, g: number, b: number, a?: number): Color {
    return Color.rgb(r, g, b, a);
}

/** Shorthand for Color.hsl(). Create a Color from HSL with percentage s/l. */
export function hsl(h: number, s: number, l: number, a?: number): Color {
    return Color.hsl(h, s, l, a);
}

/** Opaque white. */
export const WHITE = new Color(1, 1, 1);
/** Opaque black. */
export const BLACK = new Color(0, 0, 0);
/** Opaque red. */
export const RED = new Color(1, 0, 0);
/** Opaque green. */
export const GREEN = new Color(0, 1, 0);
/** Opaque blue. */
export const BLUE = new Color(0, 0, 1);
/** Opaque yellow. */
export const YELLOW = new Color(1, 1, 0);
/** Opaque cyan. */
export const CYAN = new Color(0, 1, 1);
/** Opaque magenta. */
export const MAGENTA = new Color(1, 0, 1);
/** Fully transparent black. */
export const TRANSPARENT = new Color(0, 0, 0, 0);
