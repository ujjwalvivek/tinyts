import type { Vec2 } from "../core/math";
import { getCanvasState } from "../core/canvas";
import { Color } from "./color";
import { defaultTextFont, ensureDefaultFontFace } from "./font";
import type {
    FrameBuffer,
    Renderer,
    RendererStats,
    SpriteOptions,
    TextOptions,
} from "./types";
import { WebGL2Renderer } from "./rendererWebGL2";
import { Canvas2DRenderer } from "./rendererCanvas2d";

type GPUAny = any;
const GPU_BUFFER_USAGE = (globalThis as any).GPUBufferUsage;
const GPU_TEXTURE_USAGE = (globalThis as any).GPUTextureUsage;

// Instance layout: 16 floats (4 × vec4f = 64 bytes) per instance
//
//  [0..3]   posSize:  centerX, centerY, halfW, halfH
//  [4..7]   uvRect:   u0, v0, u1, v1  (atlas coordinates)
//  [8..11]  color:    r, g, b, a
//  [12..15] misc:     shapePacked, shapeParam0, shapeParam1, rotation
//
const FLOATS_PER_INSTANCE = 16;
const INITIAL_CAPACITY = 8192;
const ATLAS_SIZE = 2048;
const ATLAS_PAD = 1;

// WGSL Shader
//
// Instanced quad renderer.  The vertex shader generates quad corners
// procedurally from per-instance data stored in a storage buffer.
// Camera transform is read from the uniforms.  Rotation is performed
// on the GPU if the rotation type dictates.  A single atlas texture
// eliminates texture-switch flushes.
//
const SHADER = `
struct Uniforms {
  viewSize: vec2f,
  camPos: vec2f,
  camZoom: f32,
  _pad0: f32,
  _pad1: vec2f,
};

struct Instance {
  posSize: vec4f,
  uvRect:  vec4f,
  color:   vec4f,
  misc:    vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var<storage, read> instances: array<Instance>;
@group(0) @binding(2) var samp: sampler;
@group(0) @binding(3) var atlas: texture_2d<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) color: vec4f,
  @location(2) @interpolate(flat) shapeInfo: vec4f,
  @location(3) localUV: vec2f,
};

@vertex
fn vs(@builtin(vertex_index) vid: u32, @builtin(instance_index) iid: u32) -> VOut {
  let inst = instances[iid];

  // Corner selector: vid ∈ {0,1,2,3} via index buffer [0,1,2, 2,1,3]
  let right  = f32(vid & 1u);                // 0 left, 1 right
  let bottom = f32((vid & 2u) >> 1u);        // 0 top,  1 bottom

  // Offset from instance centre (±halfW, ±halfH)
  let dx = (right  * 2.0 - 1.0) * inst.posSize.z;
  let dy = (bottom * 2.0 - 1.0) * inst.posSize.w;

  // Unpack shape and rotation type
  let shapePacked = i32(inst.misc.x);
  let shape       = shapePacked % 10;
  let rotType     = shapePacked / 10;

  var sinA = 0.0;
  var cosA = 1.0;

  if (rotType == 1) {
    let angle = inst.misc.w;
    sinA = sin(angle);
    cosA = cos(angle);
  } else if (rotType == 2) {
    sinA = inst.misc.y;
    cosA = inst.misc.z;
  }

  let rx = dx * cosA - dy * sinA;
  let ry = dx * sinA + dy * cosA;

  let worldPos = vec2f(inst.posSize.x + rx, inst.posSize.y + ry);

  // Camera transform
  let s   = (worldPos - u.camPos) * u.camZoom;
  let ndc = s / u.viewSize * 2.0;

  var out: VOut;
  out.pos = vec4f(ndc.x, -ndc.y, 0.0, 1.0);

  // Atlas UV – matches the v-flip convention from the original renderer:
  //   top  verts → v1,  bottom verts → v0
  out.uv = vec2f(
    mix(inst.uvRect.x, inst.uvRect.z, right),
    mix(inst.uvRect.w, inst.uvRect.y, bottom)
  );

  out.color     = inst.color;
  out.shapeInfo = vec4f(f32(shape), inst.misc.y, inst.misc.z, 0.0);
  out.localUV   = vec2f(right, bottom);        // 0‥1 for SDF
  return out;
}

@fragment
fn fs(input: VOut) -> @location(0) vec4f {
  // Always sample atlas × colour.  Non-textured shapes point their
  // UVs at a 1×1 white pixel so sample = (1,1,1,1).
  var base = textureSample(atlas, samp, input.uv) * input.color;

  // SDF shapes
  let shape = i32(input.shapeInfo.x);
  if (shape != 0) {
    let lc = input.localUV;
    let d  = abs(lc - vec2f(0.5, 0.5));
    let aa = clamp(2.0 / (u.viewSize.x + u.viewSize.y), 0.0005, 0.05);

    if (shape == 1) {
      // Filled circle
      let dist = length(lc - vec2f(0.5, 0.5));
      base.a *= 1.0 - smoothstep(0.5 - aa, 0.5 + aa, dist);

    } else if (shape == 2) {
      // Rect outline
      let t     = input.shapeInfo.yz;
      let inner = vec2f(0.5, 0.5) - t;
      let outer = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, max(d.x, d.y));
      let holeX = smoothstep(inner.x - aa, inner.x + aa, d.x);
      let holeY = smoothstep(inner.y - aa, inner.y + aa, d.y);
      base.a *= outer * (1.0 - (1.0 - holeX) * (1.0 - holeY));

    } else if (shape == 3) {
      // Circle outline
      let dist      = length(lc - vec2f(0.5, 0.5));
      let t         = input.shapeInfo.y;
      let outerEdge = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, dist);
      let innerEdge = smoothstep(0.5 - t - aa, 0.5 - t + aa, dist);
      base.a *= outerEdge * innerEdge;
    }
  }

  if (base.a < 0.0039) { discard; }
  return base;
}
`;

// Helpers

interface AtlasRegion {
    x: number;
    y: number;
    w: number;
    h: number;
    u0: number;
    v0: number;
    u1: number;
    v1: number;
}

// Renderer

/**
 * Highly optimized WebGPU renderer utilizing instanced rendering,
 * a GPU-side texture atlas with shelf packing, and hardware-accelerated
 * transformations directly in the vertex shader.
 */
export class WebGPURenderer implements Renderer {
    readonly canvas: HTMLCanvasElement;

    get type(): Renderer["type"] {
        return this.fallback?.type ?? "webgpu";
    }

    // Private state

    private overlay: CanvasRenderingContext2D;
    private fallback: Renderer | null = null;

    // GPU objects
    private device: GPUAny = null;
    private context: GPUAny = null;
    private format = "";
    private pipeline: GPUAny = null;
    private sampler: GPUAny = null;
    private indexBuffer: GPUAny = null;
    private uniformBuffer: GPUAny = null;
    private instanceBuffer: GPUAny = null;
    private bindGroup: GPUAny = null;

    // Atlas
    private atlasTexture: GPUAny = null;
    private atlasView: GPUAny = null;
    private atlasRegions = new WeakMap<CanvasImageSource, AtlasRegion>();
    private shelfX = 0;
    private shelfY = 0;
    private shelfRowH = 0;
    private whiteU = 0;
    private whiteV = 0;

    // Instance ring
    private instanceCapacity = INITIAL_CAPACITY;
    private instanceData = new Float32Array(INITIAL_CAPACITY * FLOATS_PER_INSTANCE);
    private instanceCount = 0;
    private uniformData = new Float32Array(8);

    // Frame state
    private frameTextureView: GPUAny = null;
    private commandEncoder: GPUAny = null;
    private pass: GPUAny = null;

    // Lifecycle flags
    private ready = false;
    private initializing = false;
    private warned = false;
    private configuredWidth = 0;
    private configuredHeight = 0;

    // Camera / viewport (updated each frame)
    private viewWidth = 640;
    private viewHeight = 360;
    private overlayScaleX = 1;
    private overlayScaleY = 1;
    private camPosX = 320;
    private camPosY = 180;
    private camZoom = 1;

    private stats: RendererStats = {
        drawCalls: 0,
        batchFlushes: 0,
        textureSwitches: 0,
        shapeSwitches: 0,
        quads: 0,
        overlayLineCalls: 0,
        overlayTextCalls: 0,
    };

    // Constructor

    constructor(canvas: HTMLCanvasElement, overlayCtx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.overlay = overlayCtx;
        const state = getCanvasState();
        this.viewWidth = state?.canvas === canvas ? state.logicalWidth : canvas.width;
        this.viewHeight = state?.canvas === canvas ? state.logicalHeight : canvas.height;
        this.overlayScaleX = state?.canvas === canvas ? state.backingScaleX : 1;
        this.overlayScaleY = state?.canvas === canvas ? state.backingScaleY : 1;
        void this.init();
    }

    // Async initialisation

    private async init(): Promise<void> {
        if (this.initializing) return;
        this.initializing = true;

        const gpu = (navigator as Navigator & { gpu?: GPUAny }).gpu;
        if (!gpu) { this.activateFallback("navigator.gpu is not available"); return; }
        if (!GPU_BUFFER_USAGE || !GPU_TEXTURE_USAGE) {
            this.activateFallback("WebGPU usage constants are not available"); return;
        }

        let adapter: GPUAny = null;
        try { adapter = await gpu.requestAdapter(); }
        catch (err) { this.activateFallback(`requestAdapter() failed: ${String(err)}`); return; }
        if (!adapter) { this.activateFallback("requestAdapter() returned null"); return; }

        try { this.device = await adapter.requestDevice(); }
        catch (err) { this.activateFallback(`requestDevice() failed: ${String(err)}`); return; }

        this.context = this.canvas.getContext("webgpu") as GPUAny;
        if (!this.context) { this.activateFallback("canvas.getContext('webgpu') failed"); return; }

        this.format = gpu.getPreferredCanvasFormat();

        // Sampler (nearest-neighbour for pixel-art)
        this.sampler = this.device.createSampler({
            magFilter: "nearest",
            minFilter: "nearest",
        });

        // Index buffer (6 indices for one quad, reused across all instances)
        const indices = new Uint16Array([0, 1, 2, 2, 1, 3]);
        this.indexBuffer = this.createStaticBuffer(indices, GPU_BUFFER_USAGE.INDEX);

        // Atlas texture
        this.atlasTexture = this.device.createTexture({
            size: [ATLAS_SIZE, ATLAS_SIZE],
            format: "rgba8unorm",
            usage:
                GPU_TEXTURE_USAGE.TEXTURE_BINDING |
                GPU_TEXTURE_USAGE.COPY_DST |
                GPU_TEXTURE_USAGE.RENDER_ATTACHMENT,
        });
        this.atlasView = this.atlasTexture.createView();

        // White pixel at (0, 0)
        this.device.queue.writeTexture(
            { texture: this.atlasTexture, origin: { x: 0, y: 0 } },
            new Uint8Array([255, 255, 255, 255]),
            { bytesPerRow: 4 },
            { width: 1, height: 1 },
        );
        this.whiteU = 0.5 / ATLAS_SIZE;
        this.whiteV = 0.5 / ATLAS_SIZE;
        this.shelfX = 1 + ATLAS_PAD;
        this.shelfRowH = 1 + ATLAS_PAD;

        // Uniform buffer (32 bytes: viewSize + camera + padding)
        this.uniformBuffer = this.device.createBuffer({
            size: 32,
            usage: GPU_BUFFER_USAGE.UNIFORM | GPU_BUFFER_USAGE.COPY_DST,
        });

        // Instance storage buffer
        this.instanceBuffer = this.device.createBuffer({
            size: this.instanceCapacity * FLOATS_PER_INSTANCE * 4,
            usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
        });

        // Pipeline
        const shader = this.device.createShaderModule({ code: SHADER });
        this.pipeline = this.device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: shader,
                entryPoint: "vs",
                // No vertex buffers, everything comes from the storage buffer
            },
            fragment: {
                module: shader,
                entryPoint: "fs",
                targets: [
                    {
                        format: this.format,
                        blend: {
                            color: {
                                srcFactor: "src-alpha",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            },
                            alpha: {
                                srcFactor: "one",
                                dstFactor: "one-minus-src-alpha",
                                operation: "add",
                            },
                        },
                    },
                ],
            },
            primitive: { topology: "triangle-list" },
        });

        // Bind group
        this.bindGroup = this.createBindGroup();

        this.ready = true;
    }

    // Fallback

    private warnUnavailable(reason: string): void {
        if (this.warned) return;
        this.warned = true;
        console.warn(`[tinyts] WebGPU renderer unavailable: ${reason}`);
    }

    private activateFallback(reason: string): void {
        this.warnUnavailable(reason);
        if (this.fallback) return;
        try {
            this.fallback = new WebGL2Renderer(this.canvas, this.overlay);
        } catch (err) {
            console.warn("[tinyts] WebGPU WebGL2 fallback failed:", err);
            if (this.canvas.getContext("2d")) {
                this.fallback = new Canvas2DRenderer(this.canvas);
            }
        }
    }

    // Renderer interface: frame lifecycle

    begin(): void {
        if (this.fallback) { this.fallback.begin(); return; }
        if (!this.ready) return;

        this.resetStats();
        this.instanceCount = 0;

        const state = getCanvasState();
        if (state?.canvas === this.canvas) {
            this.viewWidth = state.logicalWidth;
            this.viewHeight = state.logicalHeight;
            this.overlayScaleX = state.backingScaleX;
            this.overlayScaleY = state.backingScaleY;
            this.configureIfNeeded(state.backingWidth, state.backingHeight);
        }

        this.camPosX = this.viewWidth / 2;
        this.camPosY = this.viewHeight / 2;
        this.camZoom = 1;

        this.frameTextureView = this.context.getCurrentTexture().createView();
        this.commandEncoder = null;
        this.pass = null;

        this.resetOverlayTransform();
    }

    end(): void {
        if (this.fallback) { this.fallback.end(); return; }
        if (!this.ready) return;

        this.flush();

        if (this.pass) {
            this.pass.end();
            this.pass = null;
        }
        if (this.commandEncoder) {
            this.device.queue.submit([this.commandEncoder.finish()]);
            this.commandEncoder = null;
        }
        this.frameTextureView = null;
        this.resetOverlayTransform();
    }

    clear(color: string | Color): void {
        if (this.fallback) { this.fallback.clear(color); return; }
        if (!this.ready) return;

        // Flush and submit any prior work on the current pass
        this.flush();
        if (this.pass) {
            this.pass.end();
            this.pass = null;
        }
        if (this.commandEncoder) {
            this.device.queue.submit([this.commandEncoder.finish()]);
            this.commandEncoder = null;
        }

        const c = color instanceof Color ? color : Color.fromHex(color);
        this.commandEncoder = this.device.createCommandEncoder();
        this.pass = this.commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.frameTextureView,
                    clearValue: { r: c.r, g: c.g, b: c.b, a: c.a },
                    loadOp: "clear",
                    storeOp: "store",
                },
            ],
        });

        // Clear Canvas2D overlay
        this.overlay.save();
        this.overlay.setTransform(1, 0, 0, 1, 0, 0);
        this.overlay.clearRect(0, 0, this.overlay.canvas.width, this.overlay.canvas.height);
        this.overlay.restore();
    }

    // Renderer interface: queries

    getContext(): unknown {
        if (this.fallback) return this.fallback.getContext();
        return this.context ?? this.device;
    }

    getStats(): RendererStats {
        if (this.fallback) return this.fallback.getStats();
        return { ...this.stats };
    }

    // Renderer interface: camera
    // Camera is stored per-instance, so changing it never forces a flush.

    setTransform(pos: Vec2, zoom: number): void {
        if (this.fallback) { this.fallback.setTransform(pos, zoom); return; }
        this.camPosX = pos.x;
        this.camPosY = pos.y;
        this.camZoom = zoom;
        this.applyCameraToOverlay();
    }

    resetTransform(): void {
        if (this.fallback) { this.fallback.resetTransform(); return; }
        this.camPosX = this.viewWidth / 2;
        this.camPosY = this.viewHeight / 2;
        this.camZoom = 1;
        this.resetOverlayTransform();
    }

    // Renderer interface: framebuffers (stubs)

    createFrameBuffer(width: number, height: number): FrameBuffer {
        if (this.fallback) return this.fallback.createFrameBuffer(width, height);
        return { width, height };
    }

    bindFrameBuffer(fb: FrameBuffer | null): void {
        if (this.fallback) { this.fallback.bindFrameBuffer(fb); return; }
        // WebGPU framebuffer support is not yet implemented.
    }

    drawFrameBuffer(fb: FrameBuffer, x: number, y: number, w: number, h: number): void {
        if (this.fallback) { this.fallback.drawFrameBuffer(fb, x, y, w, h); return; }
        // WebGPU framebuffer support is not yet implemented.
    }

    // Renderer interface: draw primitives

    drawRect(pos: Vec2, size: Vec2, color: string | Color): void {
        if (this.fallback) { this.fallback.drawRect(pos, size, color); return; }
        const c = color instanceof Color ? color : Color.fromHex(color);
        const wu = this.whiteU;
        const wv = this.whiteV;
        this.addInstance(
            pos.x + size.x * 0.5, pos.y + size.y * 0.5,
            size.x * 0.5, size.y * 0.5,
            wu, wv, wu, wv,
            c.r, c.g, c.b, c.a,
            0, 0, 0,
            0,
        );
    }

    drawCircle(pos: Vec2, radius: number, color: string | Color): void {
        if (this.fallback) { this.fallback.drawCircle(pos, radius, color); return; }
        const c = color instanceof Color ? color : Color.fromHex(color);
        const wu = this.whiteU;
        const wv = this.whiteV;
        this.addInstance(
            pos.x, pos.y,
            radius, radius,
            wu, wv, wu, wv,
            c.r, c.g, c.b, c.a,
            1, 0, 0,
            0,
        );
    }

    drawLine(a: Vec2, b: Vec2, color: string | Color, thickness = 1): void {
        if (this.fallback) { this.fallback.drawLine(a, b, color, thickness); return; }
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len <= 0) return;
        const c = color instanceof Color ? color : Color.fromHex(color);
        const wu = this.whiteU;
        const wv = this.whiteV;
        // Line = rotated rect.
        // rotType = 2 (pre-calculated sin/cos passed in shapeParam0/shapeParam1).
        // shape = 0.
        // shapePacked = shape + rotType * 10 = 0 + 2 * 10 = 20.
        this.addInstance(
            (a.x + b.x) * 0.5, (a.y + b.y) * 0.5,
            len * 0.5, -(thickness * 0.5),
            wu, wv, wu, wv,
            c.r, c.g, c.b, c.a,
            20, dy / len, dx / len,
            0,
        );
    }

    drawRectOutline(pos: Vec2, size: Vec2, color: string | Color, thickness = 1): void {
        if (this.fallback) { this.fallback.drawRectOutline(pos, size, color, thickness); return; }
        const c = color instanceof Color ? color : Color.fromHex(color);
        const wu = this.whiteU;
        const wv = this.whiteV;
        this.addInstance(
            pos.x + size.x * 0.5, pos.y + size.y * 0.5,
            size.x * 0.5, size.y * 0.5,
            wu, wv, wu, wv,
            c.r, c.g, c.b, c.a,
            2, thickness / Math.max(1, size.x), thickness / Math.max(1, size.y),
            0,
        );
    }

    drawCircleOutline(pos: Vec2, radius: number, color: string | Color, thickness = 1): void {
        if (this.fallback) { this.fallback.drawCircleOutline(pos, radius, color, thickness); return; }
        const c = color instanceof Color ? color : Color.fromHex(color);
        const d = radius * 2;
        const wu = this.whiteU;
        const wv = this.whiteV;
        this.addInstance(
            pos.x, pos.y,
            radius, radius,
            wu, wv, wu, wv,
            c.r, c.g, c.b, c.a,
            3, thickness / Math.max(1, d), 0,
            0,
        );
    }

    drawSprite(
        image: CanvasImageSource,
        pos: Vec2,
        size?: Vec2,
        options?: SpriteOptions,
    ): void {
        if (this.fallback) { this.fallback.drawSprite(image, pos, size, options); return; }
        if (!this.ready) return;

        const region = this.getAtlasRegion(image);
        const dw = size ? size.x : region.w;
        const dh = size ? size.y : region.h;
        if (dw <= 0 || dh <= 0) return;

        let u0 = region.u0;
        let v0 = region.v0;
        let u1 = region.u1;
        let v1 = region.v1;

        if (options) {
            const sx = options.sourceX;
            const sy = options.sourceY;
            const sw = options.sourceWidth;
            const sh = options.sourceHeight;
            if (sx !== undefined || sy !== undefined || sw !== undefined || sh !== undefined) {
                const rx = region.x;
                const ry = region.y;
                const rw = region.w;
                const rh = region.h;
                const x = sx ?? 0;
                const y = sy ?? 0;
                const w = sw ?? rw;
                const h = sh ?? rh;
                u0 = (rx + x) / ATLAS_SIZE;
                v0 = (ry + y) / ATLAS_SIZE;
                u1 = (rx + x + w) / ATLAS_SIZE;
                v1 = (ry + y + h) / ATLAS_SIZE;
            }
            if (options.flipX) { const t = u0; u0 = u1; u1 = t; }
            if (options.flipY) { const t = v0; v0 = v1; v1 = t; }
        }

        let r = 1;
        let g = 1;
        let b = 1;
        let a = 1;

        if (options && options.color) {
            const color = options.color;
            const tint = color instanceof Color ? color : Color.fromHex(color);
            r = tint.r;
            g = tint.g;
            b = tint.b;
            a = tint.a;
        }

        const angle = options ? options.angle ?? 0 : 0;

        this.addInstance(
            pos.x + dw * 0.5, pos.y + dh * 0.5,
            dw * 0.5, dh * 0.5,
            u0, v0, u1, v1,
            r, g, b, a,
            angle !== 0 ? 10 : 0, 0, 0,
            angle,
        );
    }

    drawText(text: string, pos: Vec2, options?: TextOptions): void {
        if (this.fallback) { this.fallback.drawText(text, pos, options); return; }
        ensureDefaultFontFace();
        const sz = options?.size ?? 16;
        this.overlay.font = options?.font ?? defaultTextFont(sz);
        this.overlay.fillStyle =
            options?.color instanceof Color
                ? options.color.toRGBA()
                : (options?.color ?? "#fff");
        this.overlay.textAlign = options?.align ?? "left";
        this.overlay.textBaseline = options?.baseline ?? "top";
        this.overlay.fillText(text, pos.x, pos.y);
        this.stats.overlayTextCalls++;
    }

    // Core: add instance to the ring buffer

    /**
     * Queues a new quad instance in the storage buffer.
     * @param cx - Center X coordinate.
     * @param cy - Center Y coordinate.
     * @param hw - Half-width of the quad.
     * @param hh - Half-height of the quad (can be negative to flip rendering coordinates).
     * @param u0 - Left UV coordinate.
     * @param v0 - Top UV coordinate.
     * @param u1 - Right UV coordinate.
     * @param v1 - Bottom UV coordinate.
     * @param r - Red channel tint (0-1).
     * @param g - Green channel tint (0-1).
     * @param b - Blue channel tint (0-1).
     * @param a - Alpha channel tint (0-1).
     * @param shapePacked - Shape type + rotation mode packed integer (shape + rotType * 10).
     * @param sp0 - First shape parameter or sinA.
     * @param sp1 - Second shape parameter or cosA.
     * @param angle - Rotation angle in radians (used on GPU when rotType is 1).
     */
    private addInstance(
        cx: number, cy: number,
        hw: number, hh: number,
        u0: number, v0: number, u1: number, v1: number,
        r: number, g: number, b: number, a: number,
        shapePacked: number, sp0: number, sp1: number,
        angle: number,
    ): void {
        if (!this.ready) return;
        if (this.instanceCount >= this.instanceCapacity) this.grow();
        const o = this.instanceCount * 16;
        const d = this.instanceData;
        d[o]      = cx;
        d[o + 1]  = cy;
        d[o + 2]  = hw;
        d[o + 3]  = hh;
        d[o + 4]  = u0;
        d[o + 5]  = v0;
        d[o + 6]  = u1;
        d[o + 7]  = v1;
        d[o + 8]  = r;
        d[o + 9]  = g;
        d[o + 10] = b;
        d[o + 11] = a;
        d[o + 12] = shapePacked;
        d[o + 13] = sp0;
        d[o + 14] = sp1;
        d[o + 15] = angle;
        this.instanceCount++;
        this.stats.quads++;
    }

    // Core: flush all queued instances in one draw call

    private flush(): void {
        if (!this.ready || this.instanceCount === 0) return;
        this.ensurePass();

        const byteLen = this.instanceCount * 16 * 4;
        this.device.queue.writeBuffer(
            this.instanceBuffer, 0,
            this.instanceData.buffer,
            this.instanceData.byteOffset,
            byteLen,
        );

        // Uniform: viewSize + camera (written once per flush, 32 bytes, zero alloc)
        this.uniformData[0] = this.viewWidth;
        this.uniformData[1] = this.viewHeight;
        this.uniformData[2] = this.camPosX;
        this.uniformData[3] = this.camPosY;
        this.uniformData[4] = this.camZoom;
        this.device.queue.writeBuffer(this.uniformBuffer, 0, this.uniformData);

        this.pass.setPipeline(this.pipeline);
        this.pass.setIndexBuffer(this.indexBuffer, "uint16");
        this.pass.setBindGroup(0, this.bindGroup);
        this.pass.drawIndexed(6, this.instanceCount);

        this.stats.drawCalls++;
        this.stats.batchFlushes++;
        this.instanceCount = 0;
    }
    // Render pass management

    private ensurePass(): void {
        if (this.pass) return;
        this.commandEncoder = this.device.createCommandEncoder();
        this.pass = this.commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.frameTextureView,
                    loadOp: "load",
                    storeOp: "store",
                },
            ],
        });
    }

    // Instance buffer growth

    private grow(): void {
        this.instanceCapacity *= 2;
        const newData = new Float32Array(this.instanceCapacity * FLOATS_PER_INSTANCE);
        newData.set(this.instanceData);
        this.instanceData = newData;
        // Old buffer will be GC'd after pending GPU work completes.
        this.instanceBuffer = this.device.createBuffer({
            size: this.instanceCapacity * FLOATS_PER_INSTANCE * 4,
            usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
        });
        this.bindGroup = this.createBindGroup();
    }

    // Bind group

    private createBindGroup(): GPUAny {
        return this.device.createBindGroup({
            layout: this.pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: this.uniformBuffer } },
                { binding: 1, resource: { buffer: this.instanceBuffer } },
                { binding: 2, resource: this.sampler },
                { binding: 3, resource: this.atlasView },
            ],
        });
    }

    // Atlas texture management

    /**
     * Retrieves the cached atlas region coordinates for the given image.
     * Uses direct property lookup first for max performance, falling back to Map lookup.
     * @param image - The canvas image source.
     * @returns The resolved AtlasRegion containing location and pre-calculated UVs.
     */
    private getAtlasRegion(image: CanvasImageSource): AtlasRegion {
        let region = (image as any)._tinytsAtlasRegion;
        if (region) return region;
        region = this.atlasRegions.get(image);
        if (region) {
            try {
                (image as any)._tinytsAtlasRegion = region;
            } catch (_) {}
            return region;
        }
        return this.packIntoAtlas(image);
    }

    /**
     * Packs the given image into the atlas texture and copies it to GPU memory.
     * @param image - The canvas image source to pack.
     * @returns The new AtlasRegion coordinates, or a white-pixel region fallback if the atlas is full.
     */
    private packIntoAtlas(image: CanvasImageSource): AtlasRegion {
        const img = image as CanvasImageSource & {
            width?: number; height?: number;
            naturalWidth?: number; naturalHeight?: number;
        };
        const w = img.width ?? img.naturalWidth ?? 0;
        const h = img.height ?? img.naturalHeight ?? 0;

        if (w <= 0 || h <= 0) {
            // Zero-size image → white pixel
            return {
                x: 0, y: 0, w: 1, h: 1,
                u0: this.whiteU, v0: this.whiteV,
                u1: this.whiteU, v1: this.whiteV
            };
        }

        const pw = w + ATLAS_PAD;
        const ph = h + ATLAS_PAD;

        // Shelf packing: try current row, else start a new one
        if (this.shelfX + pw > ATLAS_SIZE) {
            this.shelfY += this.shelfRowH;
            this.shelfX = 0;
            this.shelfRowH = 0;
        }

        if (this.shelfY + ph > ATLAS_SIZE) {
            console.warn("[tinyts] WebGPU texture atlas full, sprite will render as white");
            return {
                x: 0, y: 0, w: 1, h: 1,
                u0: this.whiteU, v0: this.whiteV,
                u1: this.whiteU, v1: this.whiteV
            };
        }

        const region: AtlasRegion = {
            x: this.shelfX,
            y: this.shelfY,
            w,
            h,
            u0: this.shelfX / ATLAS_SIZE,
            v0: this.shelfY / ATLAS_SIZE,
            u1: (this.shelfX + w) / ATLAS_SIZE,
            v1: (this.shelfY + h) / ATLAS_SIZE
        };
        this.shelfX += pw;
        this.shelfRowH = Math.max(this.shelfRowH, ph);

        try {
            this.device.queue.copyExternalImageToTexture(
                { source: image },
                { texture: this.atlasTexture, origin: { x: region.x, y: region.y } },
                { width: w, height: h },
            );
        } catch (err) {
            console.warn("[tinyts] WebGPU atlas upload failed:", err);
            return {
                x: 0, y: 0, w: 1, h: 1,
                u0: this.whiteU, v0: this.whiteV,
                u1: this.whiteU, v1: this.whiteV
            };
        }

        try {
            (image as any)._tinytsAtlasRegion = region;
        } catch (_) {}
        this.atlasRegions.set(image, region);
        return region;
    }

    // GPU buffer helpers

    private createStaticBuffer(data: ArrayBufferView, usage: number): GPUAny {
        const size = Math.max(4, (data.byteLength + 3) & ~3);
        const buffer = this.device.createBuffer({
            size,
            usage,
            mappedAtCreation: true,
        });
        const dst = new Uint8Array(buffer.getMappedRange());
        dst.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        buffer.unmap();
        return buffer;
    }

    // Canvas context configuration

    private configureIfNeeded(width: number, height: number): void {
        if (!this.ready || !this.context) return;
        if (width === this.configuredWidth && height === this.configuredHeight) return;
        this.configuredWidth = width;
        this.configuredHeight = height;
        this.context.configure({
            device: this.device,
            format: this.format,
            alphaMode: "opaque",
        });
    }

    // Overlay helpers

    private resetOverlayTransform(): void {
        this.overlay.setTransform(this.overlayScaleX, 0, 0, this.overlayScaleY, 0, 0);
        this.overlay.imageSmoothingEnabled = false;
    }

    private applyCameraToOverlay(): void {
        this.resetOverlayTransform();
        this.overlay.translate(this.viewWidth / 2, this.viewHeight / 2);
        this.overlay.scale(this.camZoom, this.camZoom);
        this.overlay.translate(-this.camPosX, -this.camPosY);
    }

    // Stats

    private resetStats(): void {
        this.stats.drawCalls = 0;
        this.stats.batchFlushes = 0;
        this.stats.textureSwitches = 0;
        this.stats.shapeSwitches = 0;
        this.stats.quads = 0;
        this.stats.overlayLineCalls = 0;
        this.stats.overlayTextCalls = 0;
    }
}
