import type { Vec2 } from "../core/math";
import { getCanvasState } from "../core/canvas";
import { Color } from "./color";
import { defaultTextFont, ensureDefaultFontFace } from "./font";
import type {
    Renderer,
    SpriteOptions,
    TextOptions,
    FrameBuffer,
    RendererStats,
} from "./types";

const VS = `#version 300 es
in vec2 aPos;
in vec2 aUV;
in vec4 aColor;
uniform vec2 uViewSize;
uniform vec3 uCamera;
out vec2 vUV;
out vec4 vColor;
void main() {
  vec2 s = (aPos - uCamera.xy) * uCamera.z;
  vec2 c = s / uViewSize * 2.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
  vUV = aUV;
  vColor = aColor;
}`;

// SDF-based shape renderer.
// uShape: 0=rect, 1=circle, 2=rect-outline, 3=circle-outline
// uShapeParams:
//   shape=2: (thickness_uv_x, thickness_uv_y, 0, 0)
//   shape=3: (thickness_uv, 0, 0, 0)
const FS = `#version 300 es
precision mediump float;
in vec2 vUV;
in vec4 vColor;
uniform sampler2D uTex;
uniform int uUseTex;
uniform int uShape;
uniform vec4 uShapeParams;
uniform vec2 uPixelScale;
out vec4 fragColor;
void main() {
  vec4 base = texture(uTex, vUV);
  if (uUseTex == 1) {
    base *= vColor;
  } else {
    base = vColor;
  }

  vec2 d = abs(vUV - 0.5);

  // Anti-alias width in UV space - estimate ~1 pixel
  // A quad covering the full viewport has uv-size 1.0,
  // so 1 pixel ~ 1.0 / uPixelScale
  // For smaller quads the AA is slightly wider, which is acceptable.
  float aa = 1.0 / (uPixelScale.x + uPixelScale.y) * 2.0;
  aa = clamp(aa, 0.0005, 0.05);

  if (uShape == 1) {
    // Circle (inscribed in the quad)
    float dist = length(vUV - 0.5);
    float radius = 0.5;
    float alpha = 1.0 - smoothstep(radius - aa, radius + aa, dist);
    base.a *= alpha;

  } else if (uShape == 2) {
    // Rect outline (border region)
    vec2 t = uShapeParams.xy;
    vec2 inner = 0.5 - t;
    float outer = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, max(d.x, d.y));
    float holeX = smoothstep(inner.x - aa, inner.x + aa, d.x);
    float holeY = smoothstep(inner.y - aa, inner.y + aa, d.y);
    float alpha = outer * (1.0 - (1.0 - holeX) * (1.0 - holeY));
    base.a *= alpha;

  } else if (uShape == 3) {
    // Circle outline (ring)
    float dist = length(vUV - 0.5);
    float outerR = 0.5;
    float t = uShapeParams.x;
    float innerR = outerR - t;
    float outerEdge = 1.0 - smoothstep(outerR - aa, outerR + aa, dist);
    float innerEdge = smoothstep(innerR - aa, innerR + aa, dist);
    float alpha = outerEdge * innerEdge;
    base.a *= alpha;
  }

  if (base.a < 0.0039) discard;
  fragColor = base;
}`;

const MAX_QUADS = 8192;
const FLOATS_PER_VERT = 8;
const VERTS_PER_QUAD = 4;
const FLOATS_PER_QUAD = FLOATS_PER_VERT * VERTS_PER_QUAD;

function compileShader(
    gl: WebGL2RenderingContext,
    type: number,
    src: string,
): WebGLShader {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(`Shader compile error: ${gl.getShaderInfoLog(s)}`);
    }
    return s;
}

function createProgram(
    gl: WebGL2RenderingContext,
    vsSrc: string,
    fsSrc: string,
): WebGLProgram {
    const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
        throw new Error(`Program link error: ${gl.getProgramInfoLog(p)}`);
    }
    return p;
}

/** 2D renderer using WebGL2. */
export class WebGL2Renderer implements Renderer {
    /** The rendering backend type. */
    readonly type = "webgl2" as const;
    /** The HTML canvas element used for rendering. */
    readonly canvas: HTMLCanvasElement;
    /** The WebGL2 rendering context. */
    readonly gl: WebGL2RenderingContext;

    private overlay: CanvasRenderingContext2D;
    private program: WebGLProgram;
    private vao: WebGLVertexArrayObject;
    private buffer: WebGLBuffer;
    private indexBuffer: WebGLBuffer;
    private batchData: Float32Array;
    private batchCount: number;
    private currentTex: WebGLTexture | null = null;
    private texCache: Map<
        HTMLImageElement | HTMLCanvasElement | ImageBitmap,
        WebGLTexture
    >;
    private whiteTex: WebGLTexture;

    private uViewSize: WebGLUniformLocation;
    private uCamera: WebGLUniformLocation;
    private uTex: WebGLUniformLocation;
    private uUseTex: WebGLUniformLocation;
    private uShape: WebGLUniformLocation;
    private uShapeParams: WebGLUniformLocation;
    private uPixelScale: WebGLUniformLocation;

    private currentUseTex = -1;
    private currentShape = -1;
    private currentShapeParams: [number, number, number, number] = [0, 0, 0, 0];
    private stats: RendererStats = {
        drawCalls: 0,
        batchFlushes: 0,
        textureSwitches: 0,
        shapeSwitches: 0,
        quads: 0,
        overlayLineCalls: 0,
        overlayTextCalls: 0,
    };

    private camPosX = 0;
    private camPosY = 0;
    private camZoom = 1;

    private setUseTex(val: number): void {
        if (this.currentUseTex !== val) {
            this.gl.uniform1i(this.uUseTex, val);
            this.currentUseTex = val;
        }
    }

    /**
     * Set the shape uniform for subsequent quads in the batch.
     * Flushes the current batch if the shape or params differ,
     * since uniforms apply per-draw-call and cannot change mid-batch.
     *
     * @param shape  0=rect, 1=circle, 2=rect-outline, 3=circle-outline
     * @param params Optional shape parameters (interpretation depends on shape)
     */
    private setShape(
        shape: number,
        ...params: [number, number, number, number]
    ): void {
        if (
            this.currentShape !== shape ||
            this.currentShapeParams[0] !== params[0] ||
            this.currentShapeParams[1] !== params[1] ||
            this.currentShapeParams[2] !== params[2] ||
            this.currentShapeParams[3] !== params[3]
        ) {
            this.flush();
            this.stats.shapeSwitches++;
            this.gl.uniform1i(this.uShape, shape);
            this.gl.uniform4f(
                this.uShapeParams,
                params[0],
                params[1],
                params[2],
                params[3],
            );
            this.currentShape = shape;
            this.currentShapeParams = params;
        }
    }

    private viewWidth: number;
    private viewHeight: number;
    private overlayScaleX: number;
    private overlayScaleY: number;

    /**
     * Create a WebGL2 renderer.
     * @param canvas - Target canvas element.
     * @param overlayCtx - Canvas2D context for overlay drawing.
     */
    constructor(
        canvas: HTMLCanvasElement,
        overlayCtx: CanvasRenderingContext2D,
    ) {
        this.canvas = canvas;
        this.overlay = overlayCtx;
        const state = getCanvasState();
        this.viewWidth =
            state?.canvas === canvas ? state.logicalWidth : canvas.width;
        this.viewHeight =
            state?.canvas === canvas ? state.logicalHeight : canvas.height;
        this.overlayScaleX = state?.canvas === canvas ? state.backingScaleX : 1;
        this.overlayScaleY = state?.canvas === canvas ? state.backingScaleY : 1;

        const gl = canvas.getContext("webgl2", {
            alpha: false,
            antialias: false,
            premultipliedAlpha: false,
        })!;
        this.gl = gl;

        this.program = createProgram(gl, VS, FS);
        gl.useProgram(this.program);

        this.uViewSize = gl.getUniformLocation(this.program, "uViewSize")!;
        this.uCamera = gl.getUniformLocation(this.program, "uCamera")!;
        this.uTex = gl.getUniformLocation(this.program, "uTex")!;
        this.uUseTex = gl.getUniformLocation(this.program, "uUseTex")!;
        this.uShape = gl.getUniformLocation(this.program, "uShape")!;
        this.uShapeParams = gl.getUniformLocation(
            this.program,
            "uShapeParams",
        )!;
        this.uPixelScale = gl.getUniformLocation(this.program, "uPixelScale")!;

        gl.uniform2f(this.uViewSize, this.viewWidth, this.viewHeight);
        gl.uniform1i(this.uTex, 0);
        gl.uniform1i(this.uShape, 0);
        gl.uniform4f(this.uShapeParams, 0, 0, 0, 0);
        gl.uniform2f(this.uPixelScale, this.viewWidth, this.viewHeight);

        // Batch buffer
        this.batchData = new Float32Array(MAX_QUADS * FLOATS_PER_QUAD);
        this.batchCount = 0;

        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        this.buffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.batchData.byteLength,
            gl.DYNAMIC_DRAW,
        );

        const stride = FLOATS_PER_VERT * 4;
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
        gl.enableVertexAttribArray(2);

        // Index buffer (static, 6 indices per quad)
        const maxIndices = MAX_QUADS * 6;
        const indices = new Uint16Array(maxIndices);
        for (let i = 0; i < MAX_QUADS; i++) {
            const off = i * 4;
            const idx = i * 6;
            indices[idx] = off;
            indices[idx + 1] = off + 1;
            indices[idx + 2] = off + 2;
            indices[idx + 3] = off + 2;
            indices[idx + 4] = off + 1;
            indices[idx + 5] = off + 3;
        }
        this.indexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        gl.bindVertexArray(null);

        // Textures
        this.texCache = new Map();
        this.whiteTex = this.createWhiteTexture();

        // Default state
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 1);
        this.camPosX = this.viewWidth / 2;
        this.camPosY = this.viewHeight / 2;
        this.camZoom = 1;
        gl.uniform3f(this.uCamera, this.camPosX, this.camPosY, this.camZoom);
    }

    private createWhiteTexture(): WebGLTexture {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            1,
            1,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([255, 255, 255, 255]),
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        return tex;
    }

    private getOrCreateTexture(
        img: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    ): WebGLTexture {
        let tex = this.texCache.get(img);
        if (!tex) {
            tex = this.uploadTexture(img);
            this.texCache.set(img, tex);
        }
        return tex;
    }

    private uploadTexture(img: TexImageSource): WebGLTexture {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            img,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    private flush(): void {
        if (this.batchCount === 0) return;

        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            this.batchData.byteLength,
            gl.DYNAMIC_DRAW,
        );
        gl.bufferSubData(
            gl.ARRAY_BUFFER,
            0,
            this.batchData.subarray(0, this.batchCount * FLOATS_PER_QUAD),
        );

        gl.bindVertexArray(this.vao);
        gl.drawElements(
            gl.TRIANGLES,
            this.batchCount * 6,
            gl.UNSIGNED_SHORT,
            0,
        );
        gl.bindVertexArray(null);

        this.stats.drawCalls++;
        this.stats.batchFlushes++;
        this.batchCount = 0;
        this.currentTex = null;
        this.currentShape = -1;
        this.currentShapeParams = [0, 0, 0, 0];
    }

    private addQuad(
        x: number,
        y: number,
        w: number,
        h: number,
        u0: number,
        v0: number,
        u1: number,
        v1: number,
        r: number,
        g: number,
        b: number,
        a: number,
    ): void {
        if (this.batchCount >= MAX_QUADS) this.flush();

        const offset = this.batchCount * FLOATS_PER_QUAD;
        const d = this.batchData;

        // BL
        let vo = offset;
        d[vo] = x;
        d[vo + 1] = y;
        d[vo + 2] = u0;
        d[vo + 3] = v1;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // BR
        vo += FLOATS_PER_VERT;
        d[vo] = x + w;
        d[vo + 1] = y;
        d[vo + 2] = u1;
        d[vo + 3] = v1;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // TL
        vo += FLOATS_PER_VERT;
        d[vo] = x;
        d[vo + 1] = y + h;
        d[vo + 2] = u0;
        d[vo + 3] = v0;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // TR
        vo += FLOATS_PER_VERT;
        d[vo] = x + w;
        d[vo + 1] = y + h;
        d[vo + 2] = u1;
        d[vo + 3] = v0;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        this.batchCount++;
        this.stats.quads++;
    }

    private addTransformedQuad(
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        x3: number,
        y3: number,
        u0: number,
        v0: number,
        u1: number,
        v1: number,
        r: number,
        g: number,
        b: number,
        a: number,
    ): void {
        if (this.batchCount >= MAX_QUADS) this.flush();

        const offset = this.batchCount * FLOATS_PER_QUAD;
        const d = this.batchData;

        // BL
        let vo = offset;
        d[vo] = x0;
        d[vo + 1] = y0;
        d[vo + 2] = u0;
        d[vo + 3] = v1;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // BR
        vo += FLOATS_PER_VERT;
        d[vo] = x1;
        d[vo + 1] = y1;
        d[vo + 2] = u1;
        d[vo + 3] = v1;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // TL
        vo += FLOATS_PER_VERT;
        d[vo] = x2;
        d[vo + 1] = y2;
        d[vo + 2] = u0;
        d[vo + 3] = v0;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        // TR
        vo += FLOATS_PER_VERT;
        d[vo] = x3;
        d[vo + 1] = y3;
        d[vo + 2] = u1;
        d[vo + 3] = v0;
        d[vo + 4] = r;
        d[vo + 5] = g;
        d[vo + 6] = b;
        d[vo + 7] = a;

        this.batchCount++;
        this.stats.quads++;
    }

    /** Begin a new render frame. */
    begin(): void {
        this.resetStats();
        const state = getCanvasState();
        if (state?.canvas === this.canvas) {
            this.viewWidth = state.logicalWidth;
            this.viewHeight = state.logicalHeight;
            this.overlayScaleX = state.backingScaleX;
            this.overlayScaleY = state.backingScaleY;
            this.gl.viewport(0, 0, state.backingWidth, state.backingHeight);
            this.gl.uniform2f(this.uViewSize, this.viewWidth, this.viewHeight);
            this.gl.uniform2f(
                this.uPixelScale,
                this.viewWidth,
                this.viewHeight,
            );
        }
        this.batchCount = 0;
        this.currentTex = null;
        this.currentUseTex = -1;
        this.currentShape = -1;
        this.currentShapeParams = [0, 0, 0, 0];
        this.camPosX = this.viewWidth / 2;
        this.camPosY = this.viewHeight / 2;
        this.camZoom = 1;
        this.gl.uniform3f(
            this.uCamera,
            this.camPosX,
            this.camPosY,
            this.camZoom,
        );
        this.resetOverlayTransform();
    }

    /** End the current render frame and flush pending draws. */
    end(): void {
        this.flush();
        this.resetOverlayTransform();
    }

    private resetOverlayTransform(): void {
        this.overlay.setTransform(
            this.overlayScaleX,
            0,
            0,
            this.overlayScaleY,
            0,
            0,
        );
        this.overlay.imageSmoothingEnabled = false;
    }

    private applyCameraToOverlay(): void {
        this.resetOverlayTransform();
        this.overlay.translate(this.viewWidth / 2, this.viewHeight / 2);
        this.overlay.scale(this.camZoom, this.camZoom);
        this.overlay.translate(-this.camPosX, -this.camPosY);
    }

    /** Clear the screen with a color. */
    clear(color: string | Color): void {
        this.flush();
        const c = color instanceof Color ? color : Color.fromHex(color);
        const gl = this.gl;
        gl.clearColor(c.r, c.g, c.b, c.a);
        gl.clear(gl.COLOR_BUFFER_BIT);

        // Clear Canvas2D overlay (used by text)
        this.overlay.save();
        this.overlay.setTransform(1, 0, 0, 1, 0, 0);
        this.overlay.clearRect(
            0,
            0,
            this.overlay.canvas.width,
            this.overlay.canvas.height,
        );
        this.overlay.restore();
    }

    /** Return the WebGL2 rendering context. */
    getContext(): WebGL2RenderingContext {
        return this.gl;
    }

    /** Return per-frame renderer instrumentation counters. */
    getStats(): RendererStats {
        const snapshot = { ...this.stats };
        if (this.batchCount > 0) {
            snapshot.drawCalls++;
            snapshot.batchFlushes++;
        }
        return snapshot;
    }

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
        this.flush();
        this.camPosX = pos.x;
        this.camPosY = pos.y;
        this.camZoom = zoom;
        const gl = this.gl;
        gl.uniform3f(this.uCamera, this.camPosX, this.camPosY, this.camZoom);
    }

    /** Reset the camera transform. */
    resetTransform(): void {
        this.flush();
        this.camPosX = this.viewWidth / 2;
        this.camPosY = this.viewHeight / 2;
        this.camZoom = 1;
        const gl = this.gl;
        gl.uniform3f(this.uCamera, this.camPosX, this.camPosY, this.camZoom);
    }

    /** Create an offscreen WebGL framebuffer. */
    createFrameBuffer(width: number, height: number): FrameBuffer {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            null,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const fbo = gl.createFramebuffer()!;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            tex,
            0,
        );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        return { texture: tex, fbo, width, height };
    }

    /** Bind a framebuffer as the render target, or null for the main canvas. */
    bindFrameBuffer(fb: FrameBuffer | null): void {
        this.flush();
        const gl = this.gl;
        if (fb && fb.fbo) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb.fbo);
            gl.viewport(0, 0, fb.width, fb.height);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            gl.uniform2f(this.uViewSize, this.viewWidth, this.viewHeight);
        }
    }

    /** Draw a framebuffer to the screen. */
    drawFrameBuffer(
        fb: FrameBuffer,
        x: number,
        y: number,
        w: number,
        h: number,
    ): void {
        if (!fb.texture) return;
        this.flush();
        this.bindTexture(fb.texture);
        this.setUseTex(1);
        this.setShape(0, 0, 0, 0, 0);
        this.addQuad(x, y, w, h, 0, 0, 1, 1, 1, 1, 1, 1);
    }

    // ─── Batched shapes (WebGL, via SDF fragment shader) ────────

    /** Draw a filled rectangle. */
    drawRect(pos: Vec2, size: Vec2, color: string | Color): void {
        const c = color instanceof Color ? color : Color.fromHex(color);
        this.bindTexture(null);
        this.setUseTex(0);
        this.setShape(0, 0, 0, 0, 0);
        this.addQuad(
            pos.x,
            pos.y,
            size.x,
            size.y,
            0,
            0,
            1,
            1,
            c.r,
            c.g,
            c.b,
            c.a,
        );
    }

    /** Draw a filled circle. */
    drawCircle(pos: Vec2, radius: number, color: string | Color): void {
        const c = color instanceof Color ? color : Color.fromHex(color);
        this.bindTexture(null);
        this.setUseTex(0);
        this.setShape(1, 0, 0, 0, 0);
        const d = radius * 2;
        this.addQuad(
            pos.x - radius,
            pos.y - radius,
            d,
            d,
            0,
            0,
            1,
            1,
            c.r,
            c.g,
            c.b,
            c.a,
        );
    }

    /** Draw a rectangle outline. */
    drawRectOutline(
        pos: Vec2,
        size: Vec2,
        color: string | Color,
        thickness: number = 1,
    ): void {
        const c = color instanceof Color ? color : Color.fromHex(color);
        this.bindTexture(null);
        this.setUseTex(0);
        const tx = thickness / size.x;
        const ty = thickness / size.y;
        this.setShape(2, tx, ty, 0, 0);
        this.addQuad(
            pos.x,
            pos.y,
            size.x,
            size.y,
            0,
            0,
            1,
            1,
            c.r,
            c.g,
            c.b,
            c.a,
        );
    }

    /** Draw a circle outline. */
    drawCircleOutline(
        pos: Vec2,
        radius: number,
        color: string | Color,
        thickness: number = 1,
    ): void {
        const c = color instanceof Color ? color : Color.fromHex(color);
        this.bindTexture(null);
        this.setUseTex(0);
        const d = radius * 2;
        const t = thickness / d;
        this.setShape(3, t, 0, 0, 0);
        this.addQuad(
            pos.x - radius,
            pos.y - radius,
            d,
            d,
            0,
            0,
            1,
            1,
            c.r,
            c.g,
            c.b,
            c.a,
        );
    }

    // ─── Textured sprites (WebGL, shape=0 rect) ────────────

    /** Draw a sprite or image. */
    drawSprite(
        image: CanvasImageSource,
        pos: Vec2,
        size: Vec2,
        options?: SpriteOptions,
    ): void {
        const img = image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
        const dw = size?.x ?? img.width;
        const dh = size?.y ?? img.height;

        const tex = this.getOrCreateTexture(img);
        this.bindTexture(tex);

        const sx = options?.sourceX ?? 0;
        const sy = options?.sourceY ?? 0;
        const sw = options?.sourceWidth ?? img.width;
        const sh = options?.sourceHeight ?? img.height;
        const iw = img.width;
        const ih = img.height;

        const u0 = sx / iw;
        const v0 = sy / ih;
        const u1 = (sx + sw) / iw;
        const v1 = (sy + sh) / ih;

        const flipX = options?.flipX ?? false;
        const flipY = options?.flipY ?? false;
        const angle = options?.angle ?? 0;

        this.setUseTex(1);
        this.setShape(0, 0, 0, 0, 0);
        const tint = options?.color
            ? options.color instanceof Color
                ? options.color
                : Color.fromHex(options.color)
            : null;
        const r = tint ? tint.r : 1;
        const g = tint ? tint.g : 1;
        const b = tint ? tint.b : 1;
        const a = tint ? tint.a : 1;

        // Calculate geometry with CPU rotations & flips
        const cx = pos.x + dw / 2;
        const cy = pos.y + dh / 2;
        const hw = dw / 2;
        const hh = dh / 2;

        const scaleX = flipX ? -1 : 1;
        const scaleY = flipY ? -1 : 1;

        let x0 = -hw * scaleX,
            y0 = -hh * scaleY; // BL
        let x1 = hw * scaleX,
            y1 = -hh * scaleY; // BR
        let x2 = -hw * scaleX,
            y2 = hh * scaleY; // TL
        let x3 = hw * scaleX,
            y3 = hh * scaleY; // TR

        if (angle !== 0) {
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            const rx0 = x0 * cos - y0 * sin;
            const ry0 = x0 * sin + y0 * cos;
            const rx1 = x1 * cos - y1 * sin;
            const ry1 = x1 * sin + y1 * cos;
            const rx2 = x2 * cos - y2 * sin;
            const ry2 = x2 * sin + y2 * cos;
            const rx3 = x3 * cos - y3 * sin;
            const ry3 = x3 * sin + y3 * cos;

            x0 = rx0;
            y0 = ry0;
            x1 = rx1;
            y1 = ry1;
            x2 = rx2;
            y2 = ry2;
            x3 = rx3;
            y3 = ry3;
        }

        this.addTransformedQuad(
            cx + x0,
            cy + y0, // BL
            cx + x1,
            cy + y1, // BR
            cx + x2,
            cy + y2, // TL
            cx + x3,
            cy + y3, // TR
            u0,
            v0,
            u1,
            v1,
            r,
            g,
            b,
            a,
        );
    }

    private bindTexture(tex: WebGLTexture | null): void {
        if (tex === this.currentTex) return;
        this.flush();
        this.stats.textureSwitches++;
        const t = tex || this.whiteTex;
        this.gl.bindTexture(this.gl.TEXTURE_2D, t);
        this.currentTex = tex;
    }

    // ─── Lines and Canvas2D text overlay ──────

    /** Draw a line between two points. */
    drawLine(
        a: Vec2,
        b: Vec2,
        color: string | Color,
        thickness: number = 1,
    ): void {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        if (len <= 0 || thickness <= 0) return;

        const c = color instanceof Color ? color : Color.fromHex(color);
        const half = thickness / 2;
        const nx = (-dy / len) * half;
        const ny = (dx / len) * half;

        this.bindTexture(null);
        this.setUseTex(0);
        this.setShape(0, 0, 0, 0, 0);
        this.addTransformedQuad(
            a.x - nx,
            a.y - ny,
            b.x - nx,
            b.y - ny,
            a.x + nx,
            a.y + ny,
            b.x + nx,
            b.y + ny,
            0,
            0,
            1,
            1,
            c.r,
            c.g,
            c.b,
            c.a,
        );
    }

    /** Draw text at a position. */
    drawText(text: string, pos: Vec2, options?: TextOptions): void {
        this.flush();
        this.stats.overlayTextCalls++;
        ensureDefaultFontFace();
        const size = options?.size ?? 16;
        this.applyCameraToOverlay();
        this.overlay.fillStyle = options?.color
            ? options.color instanceof Color
                ? options.color.toString()
                : options.color
            : "#fff";
        this.overlay.font = options?.font ?? defaultTextFont(size);
        this.overlay.textAlign = options?.align ?? "left";
        this.overlay.textBaseline = options?.baseline ?? "top";
        this.overlay.fillText(text, pos.x, pos.y);
    }
}
