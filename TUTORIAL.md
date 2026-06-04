# Breakout Tutorial - Build an Arcade Game from Scratch

> **What you'll build:** A complete Breakout clone with screen shake, particles, combo scoring, synth sound effects, paddle squash-stretch, and animated UI - all in under 600 lines of HTML + JS.

<iframe src="../examples/breakout/index.html" width="100%" height="420" style="border:2px solid #cba6f7;border-radius:8px;background:#11111b;display:block;margin:1.5em 0;" loading="lazy"></iframe>

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Game Constants & State](#2-game-constants--state)
3. [The Camera](#3-the-camera)
4. [Paddle & Ball](#4-paddle--ball)
5. [Bricks](#5-bricks)
6. [Audio Setup](#6-audio-setup)
7. [Particles & Juice](#7-particles--juice)
8. [The Game Loop - Update](#8-the-game-loop--update)
9. [The Game Loop - Render](#9-the-game-loop--render)
10. [Wiring It Together](#10-wiring-it-together)

## 1. Project Setup

Create an HTML file anywhere that can reach the TinyTS distribution build. Load the engine via a single `<script>` tag - zero bundler, zero config.

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>TinyTS - Breakout</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                background: #1e1e2e;
                overflow: hidden;
            }
        </style>
    </head>
    <body>
        <div id="canvas-container"></div>
        <script src="../../dist/tinyts.js"></script>
        <script>
            // All our game code goes here
        </script>
    </body>
</html>
```

TinyTS injects a `<canvas>` into the DOM. We'll grab it at the end and append it to `#canvas-container` so we can control layout ourselves.

## 2. Game Constants & State

Define the world size and all mutable game state in one place. This keeps the logic readable and makes resetting the game trivial.

```js
const W = 1280,
    H = 720;

const paddle = { x: W / 2, y: H - 40, w: 135, h: 16, speed: 650 };
const ball = {
    x: W / 2,
    y: H - 64,
    w: 14,
    h: 14,
    vx: 0,
    vy: 0,
    speed: 430,
    stuck: true,
};

let bricks = [];
let score = 0;
let lives = 3;
let gameState = "playing"; // "playing" | "gameover" | "win"
let combo = 0;
```

`ball.stuck` is a simple boolean. When `true`, the ball rides on the paddle. When the player launches, it flips to `false` and the ball moves on its own.

## 3. The Camera

Create a camera that matches your game resolution. The camera handles **screen shake**, **deadzone following**, and **world-bounds clamping**.

```js
const camera = createCamera({
    pos: vec2(W / 2, H / 2),
    size: vec2(W, H),
    zoom: 1,
});
```

Call `camera.apply()` before drawing game objects and `camera.end()` after. Everything drawn between those two calls is transformed by the camera - so screen shake, follow, and zoom all work automatically.

> **Key detail:** `camera.update(dt)` must be called every frame in your `update()` function to advance shake decay and follow interpolation.

## 4. Paddle & Ball

### Paddle Movement

Bind logical actions to keyboard keys, then read them with `actionDown()`:

```js
bindAction("left", ["ArrowLeft", "KeyA"]);
bindAction("right", ["ArrowRight", "KeyD"]);
bindAction("launch", ["Space"]);

// Inside update():
if (actionDown("left")) paddle.x -= paddle.speed * dt;
if (actionDown("right")) paddle.x += paddle.speed * dt;

// Clamp to world bounds
paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
```

For mouse support, use `mousePos()` to gently pull the paddle toward the cursor:

```js
const mp = mousePos();
if (mp.x > 0 && mp.x < W && mp.y > 0 && mp.y < H) {
    paddle.x += (mp.x - paddle.x) * 8 * dt;
}
```

### Paddle Squash & Stretch

Track the previous frame's paddle position to compute velocity, then apply a scale transform. This creates the "juicy" feel of the paddle squashing when the ball hits and stretching when it moves quickly.

```js
let prevPaddleX = paddle.x;
const paddleScale = vec2(1, 1);

// Inside update():
const pVelocityX = Math.abs(paddle.x - prevPaddleX) / dt;
const moveStretch = 1 + (pVelocityX / paddle.speed) * 0.16;
const moveSquash = 1 - (pVelocityX / paddle.speed) * 0.12;
paddleScale.x = lerp(paddleScale.x, moveStretch, 0.35);
paddleScale.y = lerp(paddleScale.y, moveSquash, 0.35);

prevPaddleX = paddle.x;

// Snap back to identity over time
paddleScale.x += (1 - paddleScale.x) * 10 * dt;
paddleScale.y += (1 - paddleScale.y) * 10 * dt;
```

### Ball Launch

When the ball is stuck on the paddle, any press of Space or click launches it at a random angle between ±54° from vertical:

```js
function launchBall() {
    const angle = mapRange(rand(0, 1), 0, 1, -Math.PI * 0.3, Math.PI * 0.3);
    ball.vx = Math.sin(angle) * ball.speed;
    ball.vy = -Math.cos(angle) * ball.speed;
    ball.stuck = false;
}
```

## 5. Bricks

### Creating the Grid

Build an 8×14 grid of bricks with alternating row colors. The top two rows have **2 hit points** (indicated by a darker shade), adding a layer of strategy.

```js
const rowColors = [
    "#f38ba8",
    "#fab387",
    "#f9e2af",
    "#a6e3a1",
    "#94e2d5",
    "#89b4fa",
    "#cba6f7",
    "#b4befe",
];

function createBricks() {
    bricks = [];
    const rows = 8,
        cols = 14;
    const brickW = 78,
        brickH = 22,
        gap = 6;
    const totalW = cols * (brickW + gap) - gap;
    const startX = (W - totalW) / 2;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            bricks.push({
                x: startX + c * (brickW + gap),
                y: 65 + r * (brickH + gap),
                w: brickW,
                h: brickH,
                hp: r < 2 ? 2 : 1,
                color: rowColors[r % rowColors.length],
                shine: rand(0, Math.PI * 2),
            });
        }
    }
}
```

Each brick stores a random `shine` phase offset so the subtle highlight animation isn't uniform.

### Ball–Brick Collision

Use `aabb()` and `aabbOverlap()` / `aabbOverlapResult()` for axis-aligned bounding box collision. When an overlap is detected:

1. Separate the ball along the collision normal
2. Reflect the appropriate velocity axis
3. Damage the brick (decrement `hp`)
4. Accumulate the combo counter
5. Spawn particles and play sound effects

```js
for (let i = bricks.length - 1; i >= 0; i--) {
    const b = bricks[i];
    const ballBox = aabb(
        vec2(ball.x - ball.w / 2, ball.y - ball.h / 2),
        vec2(ball.w, ball.h),
    );
    const brickBox = aabb(vec2(b.x, b.y), vec2(b.w, b.h));
    if (aabbOverlap(ballBox, brickBox)) {
        const overlap = aabbOverlapResult(ballBox, brickBox);
        if (overlap) {
            if (overlap.normal.x !== 0) {
                ball.vx = -ball.vx;
                ball.x += overlap.normal.x * Math.abs(overlap.overlap.x);
            } else {
                ball.vy = -ball.vy;
                ball.y += overlap.normal.y * Math.abs(overlap.overlap.y);
            }
        }
        b.hp--;
        combo++;
        // ... particle + sound effects ...
        if (b.hp <= 0) bricks.splice(i, 1);
        break;
    }
}
```

> **Why `break`?** The ball can only hit one brick per frame. Breaking after the first hit prevents multi-brick tunneling.

## 6. Audio Setup

TinyTS's audio system is Web Audio based. Call `unlockAudio()` on the first user interaction to satisfy browser autoplay policies - this is safe to call multiple times.

```js
unlockAudio();
```

Play synthesized sound effects inline with `playSound()`:

```js
playSound({
    wave: "square",
    frequency: 600,
    frequencySlide: -150,
    attack: 0.01,
    decay: 0.1,
    volume: 0.18,
});
```

The breakout example uses different synth patches for:

- Wall bounce (low square, short decay)
- Paddle bounce (rising square)
- Brick break (rising pitch per combo)
- Combo milestone (ascending sine)
- Death (noise burst)
- Win (sweeping sawtooth)

## 7. Particles & Juice

TinyTS includes a particle system accessible via `emitParticles()` / `updateParticles()` / `renderParticles()`.

### Impact Sparkles

```js
function spawnImpactSparkles(x, y, color) {
    emitParticles({
        pos: vec2(x, y),
        count: 10,
        life: [0.2, 0.45],
        speed: [50, 200],
        size: [3, 7],
        sizeEnd: [1, 2],
        color: [color, "#ffffff"],
        damping: 0.94,
    });
}
```

### Brick Debris

```js
function spawnBrickDebris(x, y, color) {
    emitParticles({
        pos: vec2(x, y),
        count: rand(6, 10),
        life: [0.4, 0.85],
        speed: [70, 220],
        angle: [-Math.PI * 0.95, -Math.PI * 0.05], // upward arc
        size: [4, 8],
        sizeEnd: [1, 2],
        color: [color, "#222226"],
        gravity: 550,
        damping: 0.95,
    });
}
```

### Camera Shake

Call `camera.shake(intensity, duration?)` to add visceral feedback on every impactful event:

```js
camera.shake(4); // paddle bounce
camera.shake(8, 0.14); // brick break
camera.shake(12); // death
```

The camera handles the shake offset and decay automatically in `camera.update(dt)`.

### Floating Score Text

For combo popups, push entries into an array and draw them in the render loop:

```js
const floatingTexts = [];

// Inside update(), on combo milestone:
floatingTexts.push({
    text: `COMBO x${multiplier}!`,
    pos: vec2(b.x + b.w / 2, b.y - 12),
    color: "#f9e2af",
    life: 0.85,
    maxLife: 0.85,
    vy: -45,
});

// Update each frame:
for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.pos.y += ft.vy * dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
}
```

### Ball Trail

Store the last 15 positions and draw them as semi-transparent rectangles:

```js
const ballTrail = [];

// Inside update():
ballTrail.push({ x: ball.x, y: ball.y, life: 1 });
if (ballTrail.length > 15) ballTrail.shift();
for (const t of ballTrail) t.life -= dt * 3.5;

// Inside render():
for (const t of ballTrail) {
    if (t.life <= 0) continue;
    drawRect(
        vec2(t.x - ball.w / 2, t.y - ball.h / 2),
        vec2(ball.w, ball.h),
        `rgba(205, 214, 244, ${t.life * 0.18})`,
    );
}
```

---

## 8. The Game Loop - Update

The `update(dt)` callback receives a **delta time** in seconds. All movement, collision, timers, and particle updates go here. The engine uses a fixed-timestep accumulator internally, so `dt` is stable and frame-rate independent.

```js
const engine = engineStart({
  size: { width: W, height: H },

  update(dt) {
    if (gameState === "gameover" || gameState === "win") {
      if (keyPressed("Space") || mousePressed(0)) {
        // Reset everything
        gameState = "playing";
        score = 0; lives = 3; combo = 0;
        createBricks();
        resetBall();
      }
      camera.update(dt);
      return;
    }

    // 1. Move paddle (keyboard + mouse)
    if (actionDown("left"))  paddle.x -= paddle.speed * dt;
    if (actionDown("right")) paddle.x += paddle.speed * dt;
    const mp = mousePos();
    if (mp.x > 0 && mp.x < W && mp.y > 0 && mp.y < H) {
      paddle.x += (mp.x - paddle.x) * 8 * dt;
    }
    paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);

    // 2. Paddle squash/stretch
    // ... (code from §4) ...

    // 3. If ball is stuck, ride paddle & wait for launch
    if (ball.stuck) {
      ball.x = paddle.x;
      ball.y = paddle.y - 24;
      if (actionPressed("launch") || mousePressed(0)) launchBall();
      camera.update(dt);
      return;
    }

    // 4. Move ball
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // 5. Wall bounces + shake + particles
    // 6. Paddle bounce + angle calculation
    // 7. Brick collision loop
    // 8. Death / win checks
    // 9. Floating text update
    // 10. camera.update(dt) + updateParticles(dt)
  },
```

The full implementation in [`examples/breakout/index.html`](https://github.com/ujjwalvivek/tinyts/blob/main/examples/breakout/index.html) runs through each of these steps in order. The structure is deliberately flat.

## 9. The Game Loop - Render

The `render()` callback runs after update every frame. All drawing commands go here.

### Camera Transform

```js
render() {
  clear("#11111b");
  camera.apply();   // <-- everything after this is camera-transformed

  // Draw ball trail, bricks, paddle, ball, particles, floating text
  // ...

  camera.end();     // <-- restores the identity transform

  // Draw HUD overlay (not camera-transformed)
  drawText(`SCORE: ${score}`, vec2(20, 20), { color: "#a6adc8", size: 20 });
  // ...
}
```

### Drawing the Paddle

Apply the squash/stretch scale by computing effective dimensions before drawing:

```js
const currentW = paddle.w * paddleScale.x;
const currentH = paddle.h * paddleScale.y;
const drawPos = vec2(paddle.x - currentW / 2, paddle.y - currentH / 2);

drawRect(drawPos, vec2(currentW, currentH), "#cba6f7");

// Highlight line on top
drawRect(
    vec2(drawPos.x + 5, drawPos.y + 3),
    vec2(currentW - 10, currentH * 0.3),
    "rgba(205, 214, 244, 0.35)",
);
```

### Drawing Bricks

Each brick gets a base color, a top highlight, and a bottom bevel for a pseudo-3D look:

```js
for (const b of bricks) {
    const c = Color.fromHex(b.color);
    const shade = b.hp > 1 ? c.darken(0.18) : c;
    drawRect(vec2(b.x, b.y), vec2(b.w, b.h), shade);
    const s = 0.15 + 0.05 * Math.sin(time * 2 + b.shine);
    drawRect(
        vec2(b.x + 3, b.y + 3),
        vec2(b.w - 6, b.h * 0.35),
        `rgba(205, 214, 244, ${s})`,
    );
    drawRect(vec2(b.x, b.y + b.h - 2), vec2(b.w, 2), "rgba(17, 17, 27, 0.25)");
}
```

The per-brick `shine` phase causes each highlight to animate independently.

### Particles

One call draws all active particles. Place it after your game objects so particles render on top:

```js
renderParticles();
```

## 10. Wiring It Together

After `engineStart()` returns, grab the canvas instances and append them to your container:

```js
document
    .getElementById("canvas-container")
    .appendChild(engine.canvasManager.canvas);
if (engine.overlayCanvas) {
    document
        .getElementById("canvas-container")
        .appendChild(engine.overlayCanvas);
}
```

`engine.canvasManager.canvas` is the WebGL2 canvas used for all batch-drawn shapes. `engine.overlayCanvas` is the Canvas2D overlay used for text and debug overlays.

For mobile-friendly examples, add an on-screen control overlay after the canvas is attached. The controls emit normal key/action state, so the same `bindAction()` code works on keyboard and touch:

```js
addTouchControls({
    left: "ArrowLeft",
    right: "ArrowRight",
    buttons: [{ id: "launch", label: "GO", keys: "Space" }],
});
```

For click-first games, `setTouchMappedToMouse(true)` maps the primary touch point to `mousePos()` and the left mouse button state.

## Complete Source

The full, working example lives at [`examples/breakout/index.html`](https://github.com/ujjwalvivek/tinyts/blob/main/examples/breakout/index.html).

### What You Learned

| Concept          | TinyTS API                                                                                                              |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Engine lifecycle | `engineStart({ size, update, render })`                                                                                 |
| Input            | `bindAction()`, `actionDown()`, `actionPressed()`, `mousePos()`, `mousePressed()`, `keyPressed()`, `addTouchControls()` |
| Camera           | `createCamera()`, `camera.apply()`, `camera.end()`, `camera.shake()`, `camera.update()`                                 |
| Drawing          | `clear()`, `drawRect()`, `drawText()`                                                                                   |
| Color            | `Color.fromHex()`, `Color.lerp()`, `Color.darken()`                                                                     |
| Vectors          | `vec2()`, `clamp()`, `lerp()`, `mapRange()`                                                                             |
| Collision        | `aabb()`, `aabbOverlap()`, `aabbOverlapResult()`                                                                        |
| Particles        | `emitParticles()`, `updateParticles()`, `renderParticles()`                                                             |
| Audio            | `unlockAudio()`, `playSound()`                                                                                          |
| Tweens           | `addTween()`, `bounceOut`                                                                                               |
| Utilities        | `rand()`, `choose()`, `time`, `stats.fps`                                                                               |

## Next Steps

- Add power-ups (wider paddle, multi-ball, fireball)
- Add a persistent high-score table using `localStorage`
- Add screen-shake intensity slider (respect player preference)
- Check the [Interactive Examples Browser](https://tinyts.ujjwalvivek.com/documents/EXAMPLES) to explore all demos
- Browse the [API Reference](https://tinyts.ujjwalvivek.com/documents/REFERENCE) for all available functions
