import test from 'node:test';
import assert from 'node:assert/strict';

function createFakeContext(canvas) {
  const calls = [];
  const ctx = {
    canvas,
    calls,
    imageSmoothingEnabled: true,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'top',
    setTransform(...args) { calls.push(['setTransform', ...args]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    translate(...args) { calls.push(['translate', ...args]); },
    scale(...args) { calls.push(['scale', ...args]); },
    rotate(...args) { calls.push(['rotate', ...args]); },
    fillRect(...args) { calls.push(['fillRect', ...args]); },
    strokeRect(...args) { calls.push(['strokeRect', ...args]); },
    beginPath() { calls.push(['beginPath']); },
    closePath() { calls.push(['closePath']); },
    moveTo(...args) { calls.push(['moveTo', ...args]); },
    lineTo(...args) { calls.push(['lineTo', ...args]); },
    stroke() { calls.push(['stroke']); },
    arc(...args) { calls.push(['arc', ...args]); },
    arcTo(...args) { calls.push(['arcTo', ...args]); },
    roundRect(...args) { calls.push(['roundRect', ...args]); },
    quadraticCurveTo(...args) { calls.push(['quadraticCurveTo', ...args]); },
    fill() { calls.push(['fill']); },
    drawImage(...args) { calls.push(['drawImage', ...args]); },
    fillText(...args) { calls.push(['fillText', ...args]); },
  };
  return ctx;
}

function createFakeCanvas() {
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    handlers: new Map(),
    parentElement: null,
    context: null,
    getContext(type) {
      assert.equal(type, '2d');
      if (!this.context) this.context = createFakeContext(this);
      return this.context;
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 640, height: 360 };
    },
    addEventListener(type, handler) {
      this.handlers.set(type, handler);
    },
    removeEventListener(type, handler) {
      if (this.handlers.get(type) === handler) this.handlers.delete(type);
    },
    remove() {},
  };
  return canvas;
}

function createFakeDom({ dpr = 1 } = {}) {
  const canvases = [];
  const windowHandlers = new Map();
  let lastRaf = null;
  let rafId = 0;
  let now = 0;

  globalThis.window = {
    innerWidth: 640,
    innerHeight: 360,
    devicePixelRatio: dpr,
    addEventListener(type, handler) {
      const handlers = windowHandlers.get(type) ?? new Set();
      handlers.add(handler);
      windowHandlers.set(type, handlers);
    },
    removeEventListener(type, handler) {
      const handlers = windowHandlers.get(type);
      handlers?.delete(handler);
      if (handlers?.size === 0) windowHandlers.delete(type);
    },
  };
  globalThis.document = {
    body: {
      appendChild(canvas) {
        canvas.parentElement = this;
      },
    },
    createElement(tag) {
      assert.equal(tag, 'canvas');
      const canvas = createFakeCanvas();
      canvases.push(canvas);
      return canvas;
    },
  };
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      getGamepads() {
        return [];
      },
    },
  });
  globalThis.requestAnimationFrame = (callback) => {
    lastRaf = callback;
    return ++rafId;
  };
  globalThis.cancelAnimationFrame = () => {};
  Object.defineProperty(globalThis, 'performance', {
    configurable: true,
    value: {
      now() {
        return now;
      },
    },
  });

  return {
    canvases,
    runFrame(nextNow = 1) {
      now = nextNow;
      const callback = lastRaf;
      assert.equal(typeof callback, 'function');
      callback(nextNow);
    },
  };
}

async function setupEngine(config = {}, domOptions = {}) {
  const dom = createFakeDom(domOptions);
  const mod = await import(`../../index.ts?renderer=${Math.random()}`);
  mod.engineStart({ size: { width: 640, height: 360 }, ...config });
  return { dom, mod };
}

test('Canvas2D clear uses logical dimensions under DPR scaling', async () => {
  const { dom, mod } = await setupEngine({
    render() {
      mod.clear('#123');
    },
  }, { dpr: 2 });

  dom.runFrame(1);
  const ctx = dom.canvases[0].context;

  assert.ok(ctx.calls.some((call) => call.join(',') === 'setTransform,2,0,0,2,0,0'));
  assert.ok(ctx.calls.some((call) => call.join(',') === 'fillRect,0,0,640,360'));
  assert.equal(dom.canvases[0].width, 1280);
  assert.equal(dom.canvases[0].height, 720);

  mod.engineStop();
});

test('drawSprite restores Canvas2D context immediately', async () => {
  const image = { width: 16, height: 16 };
  const { dom, mod } = await setupEngine({
    render() {
      mod.drawSprite(image, mod.vec2(10, 20), mod.vec2(16, 16), { angle: 0.25 });
      mod.drawRect(mod.vec2(0, 0), mod.vec2(1, 1), '#fff');
    },
  });

  dom.runFrame(1);
  const calls = dom.canvases[0].context.calls.map((call) => call[0]);
  const saveIndex = calls.indexOf('save');
  const restoreIndex = calls.indexOf('restore');
  const rectIndex = calls.lastIndexOf('fillRect');

  assert.ok(saveIndex >= 0);
  assert.ok(restoreIndex > saveIndex);
  assert.ok(rectIndex > restoreIndex);

  mod.engineStop();
});

test('Canvas2D framebuffer clear uses framebuffer dimensions', async () => {
  let framebuffer;
  const { dom, mod } = await setupEngine({
    render() {
      framebuffer = mod.createFrameBuffer(32, 16);
      mod.bindFrameBuffer(framebuffer);
      mod.clear('#000');
      mod.bindFrameBuffer(null);
      mod.drawFrameBuffer(framebuffer, 4, 5, 32, 16);
    },
  });

  dom.runFrame(1);

  const fbCtx = framebuffer.ctx;
  const screenCtx = dom.canvases[0].context;
  assert.ok(fbCtx.calls.some((call) => call.join(',') === 'fillRect,0,0,32,16'));
  assert.ok(screenCtx.calls.some((call) => call[0] === 'drawImage' && call[2] === 4 && call[3] === 5));

  mod.engineStop();
});

test('procedural drawing functions invoke correct canvas 2d methods', async () => {
  const mod = await import('../../index.ts');
  const canvas = {
    width: 100,
    height: 100,
    getContext(type) {
      return createFakeContext(this);
    }
  };
  const ctx = canvas.getContext('2d');

  // Test drawProceduralRoundedRect
  mod.drawProceduralRoundedRect(ctx, 10, 10, 50, 50, 5, '#fff', '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'beginPath'));
  assert.ok(ctx.calls.some((call) => call[0] === 'roundRect' || call[0] === 'arcTo'));

  // Test drawProceduralRegularPolygon
  ctx.calls.length = 0;
  mod.drawProceduralRegularPolygon(ctx, 50, 50, 20, 5, 0, '#fff', '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'beginPath'));
  assert.ok(ctx.calls.some((call) => call[0] === 'moveTo'));
  assert.ok(ctx.calls.filter((call) => call[0] === 'lineTo').length >= 4);

  // Test drawProceduralStar
  ctx.calls.length = 0;
  mod.drawProceduralStar(ctx, 50, 50, 5, 10, 20, 0, '#fff', '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'beginPath'));
  assert.ok(ctx.calls.filter((call) => call[0] === 'lineTo').length >= 10);

  // Test drawProceduralRing
  ctx.calls.length = 0;
  mod.drawProceduralRing(ctx, 50, 50, 10, 20, '#fff', '#000', 2);
  assert.ok(ctx.calls.filter((call) => call[0] === 'arc').length === 2);

  // Test drawProceduralSector
  ctx.calls.length = 0;
  mod.drawProceduralSector(ctx, 50, 50, 20, 0, Math.PI, '#fff', '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'arc'));

  // Test drawProceduralCapsule
  ctx.calls.length = 0;
  mod.drawProceduralCapsule(ctx, 10, 10, 50, 50, 5, '#fff', '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'arc'));

  // Test drawProceduralQuadraticCurve
  ctx.calls.length = 0;
  mod.drawProceduralQuadraticCurve(ctx, 10, 10, 20, 20, 30, 30, '#000', 2);
  assert.ok(ctx.calls.some((call) => call[0] === 'quadraticCurveTo'));
});

