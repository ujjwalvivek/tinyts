# TinyTS

[![API Quick Reference](https://echopoint.ujjwalvivek.com/svg/badges/custom?bg=111111&badgeColor=7316e4&textColor=e8e8e8&border=7316e4&borderWidth=2&rx=0&px=2&py=2&logo=docs&leftText=Reference&rightText=CHEATSHEET)](https://tinyts.ujjwalvivek.com/documents/REFERENCE)
[![Examples Browser](https://echopoint.ujjwalvivek.com/svg/badges/custom?bg=111111&badgeColor=7316e4&textColor=e8e8e8&border=7316e4&borderWidth=2&rx=0&px=2&py=2&logo=game&leftText=Examples&rightText=DEMO)](https://tinyts.ujjwalvivek.com/examples)
[![Engine API](https://echopoint.ujjwalvivek.com/svg/badges/custom?bg=111111&badgeColor=7316e4&textColor=e8e8e8&border=7316e4&borderWidth=2&rx=0&px=2&py=2&logo=typescript&leftText=ENGINE&rightText=API)](https://tinyts.ujjwalvivek.com)
[![NPM](https://echopoint.ujjwalvivek.com/svg/badges/npm?bg=111111&badgeColor=7316e4&textColor=e8e8e8&border=7316e4&borderWidth=2&rx=0&px=2&py=2&logo=npm&package=tinyts)](https://www.npmjs.com/package/@ujjwalvivek/tinyts)

A tiny, fast, TypeScript-first 2D web game engine.

**~88 KB minified, ~27 KB gzip** - zero runtime dependencies.
Lightweight. Performant. Reliable.

## Quick Start

### Minimal Boilerplate

Load the pre-bundled global build directly via a `<script>` tag.
All engine exports are automatically mapped to the browser's global namespace:

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        ...
    </head>
    <body>
        <script src="dist/tinyts.js"></script>
        <script>
            const pos = vec2(100, 100);

            engineStart({
                size: { width: 480, height: 270 },
                pixelated: true,

                update(dt) {
                    if (keyDown("KeyD")) pos.x += 120 * dt;
                    if (keyDown("KeyA")) pos.x -= 120 * dt;
                },

                render() {
                    clear(Color.fromHSL(235, 0.45, 0.05));
                    drawRect(pos, vec2(16, 16), "#e94560");
                    drawText("USE A/D TO MOVE", vec2(240, 30), {
                        color: "#fff",
                        align: "center",
                        size: 16,
                    });
                },
            });
        </script>
    </body>
</html>
```

### Modern ES Module Import

Install via npm and import components into your build system:

```ts
import { engineStart, vec2, clear, drawRect, Color } from "@ujjwalvivek/tinyts";

engineStart({
    size: { width: 640, height: 360 },
    render() {
        clear("#08080f");
        drawRect(vec2(320, 180), vec2(32, 32), "#f0c040");
    },
});
```

### 3. Scaffolding a TinyTS Game with Vite & TypeScript

Follow these steps to scaffold a project from scratch:

1. **Initialize your project**:

    ```bash
    npm create vite@latest my-tinyts-game -- --template vanilla-ts
    cd my-tinyts-game
    npm install @ujjwalvivek/tinyts
    ```

2. **Configure your files**:

    Update `src/main.ts` with this setup template:

    ```ts
    import { engineStart, vec2, clear, drawRect, keyDown } from "@ujjwalvivek/tinyts";

    const pos = vec2(100, 100);

    const engine = engineStart({
        size: { width: 480, height: 270 },
        pixelated: true,
        update(dt) {
            // Input tracking
            if (keyDown("KeyD") || keyDown("ArrowRight")) pos.x += 120 * dt;
            if (keyDown("KeyA") || keyDown("ArrowLeft")) pos.x -= 120 * dt;
        },
        render() {
            clear("#11111b"); // Clear background
            drawRect(pos, vec2(16, 16), "#89b4fa"); // Draw player
        },
    });

    // Mount engine canvas to index.html container
    const container = document.querySelector("#app");
    if (container) {
        container.appendChild(engine.canvasManager.canvas);
        if (engine.overlayCanvas) {
            container.appendChild(engine.overlayCanvas);
        }
    }
    ```

    Update `index.html`:

    ```html
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <title>My TinyTS Game</title>
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    background: #1e1e2e;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100vw;
                    height: 100vh;
                    overflow: hidden;
                }
                #app {
                    position: relative;
                    width: 100%;
                    height: 100%;
                }
                #app canvas {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%, -50%);
                    max-width: 95%;
                    max-height: 95%;
                    aspect-ratio: 16/9;
                }
            </style>
        </head>
        <body>
            <div id="app"></div>
            <script type="module" src="/src/main.ts"></script>
        </body>
    </html>
    ```

3. **Run the development server**:

    ```bash
    npm run dev
    ```

## Engine Highlights

| Category             | Description                                                                 |
| -------------------- | --------------------------------------------------------------------------- |
| Overall Architecture | Singleton-free, instance-bound, clean module boundaries                     |
| Game Loop            | Fixed-timestep with accumulator, alpha interpolation, frame clamping        |
| Rendering            | Unified interface, WebGL2 batcher with Canvas2D overlay fallback            |
| Input                | Bitmask state tracking, action mapping, gamepad, touch, keyboard and mouse  |
| Audio                | Full ADSR synth, voice stealing, groups, spatial audio, sequencer           |
| Physics              | Swept AABB, tilemap collision, spatial grid, verlet    |
| ECS                  | View caching, component pooling, hierarchy, serialization, event hooks      |
| Particles            | Object pooling, emitter lifecycle, shapes, additive blending, prewarm       |
| API Ergonomics       | Dead-simple global helpers _plus_ full OOP access for power users           |

TinyTS implements a highly disciplined engine design thats fun to work with:

- **Zero memory leaks on restart** - `engineStop()` truly dismantles everything.
- **Embeddable** - can run inside an iframe or component without polluting the host page.
- **Quad batching** - 2000-quad batch buffer with pre-built index buffer
- **State-cached uniforms** - texture, shape, and shape params are tracked to avoid redundant GL calls
- **Canvas2D overlay** - text and lines fall through to a synchronized Canvas2D layer
- **Sprite batching** - rotated/flipped sprites are pre-transformed on CPU and batched, avoiding per-sprite draw calls
- **View caching** with reactive `updateEntityInCaches` on add/remove
- **Component pooling** via `obtain()` with `init()`/`reset()` hooks
- **Entity free list** for ID recycling
- **Serialization** via `registerComponentType` / `serialize` / `deserialize`
- **Event hooks** via `onAdded` / `onRemoved` with unsubscribe handles
- Voice pool with configurable max voices and voice stealing (oldest non-looping first)
- Audio groups (sfx, music, ambient) with per-group volume
- Spatial audio via `playSoundAt` with distance falloff and stereo panning
- `Sequencer` for pattern-based music with MIDI-to-frequency conversion
- Clip caching and `AudioClip` abstraction

## Development & Build

```bash
# Ensure Node.js is installed

# Clone the repository
git clone https://github.com/ujjwalvivek/tinyts.git
cd tinyts
npm install        # Install package dependencies
npm run check      # Typecheck, run ES module / CJS builds, and execute tests
npm run docs       # Generate the API Documentation site locally
npm run serve      # Start a local HTTP utility server to test examples
```

## Is This Reliable?

### Does It "Just Work"?

| Scenario                                                | Reliable?                                      |
| ------------------------------------------------------- | ---------------------------------------------- |
| Drop a `<script>` tag, call `engineStart()`, draw stuff | ✅ Yes                                         |
| Use as ES module with bundler                           | ✅ Yes                                         |
| Pixel art games with integer scaling                    | ✅ Yes                                         |
| Smooth HD games with fractional scaling                 | ✅ Yes                                         |
| Start/stop/restart engine multiple times                | ✅ Yes, zero leaks                             |
| Mobile browser with touch                               | ✅ Yes, touch-to-mouse mapping works           |
| Gamepad support                                         | ✅ Yes, with deadzone                          |
| WebGL2 not available                                    | ✅ Yes, auto-falls back to Canvas2D            |
| Mix Canvas2D calls with engine rendering                | ✅ Yes, `getContext()` exposes the raw context |

### Runs Everywhere?

| Platform                      | Support                                                    |
| ----------------------------- | ---------------------------------------------------------- |
| Chrome / Edge (desktop)       | ✅ Full WebGL2 + Canvas2D                                  |
| Firefox (desktop)             | ✅ Full WebGL2 + Canvas2D                                  |
| Safari 15+ (desktop)          | ✅ WebGL2 + Canvas2D                                       |
| Chrome / Firefox (Android)    | ✅ WebGL2 + Canvas2D + Touch                               |
| Safari (iOS 15+)              | ✅ WebGL2 + Canvas2D + Touch                               |
| Older browsers without WebGL2 | ✅ Canvas2D fallback                                       |
| Node.js (SSR / testing)       | ✅ Headless (math, ECS, physics work; rendering needs DOM) |

### Max Performance Out of the Box?

| Optimization                                              | Present? |
| --------------------------------------------------------- | -------- |
| WebGL2 quad batching (single draw call per texture+shape) | ✅       |
| Pre-allocated batch Float32Array (no per-frame alloc)     | ✅       |
| Pre-built static index buffer                             | ✅       |
| Texture caching                                           | ✅       |
| State-cached uniforms (avoid redundant GL calls)          | ✅       |
| Object pooling (particles, ECS components)                | ✅       |
| SDF shapes (no per-circle geometry)                       | ✅       |
| `imageSmoothingEnabled = false` for pixel art             | ✅       |
| Framerate-independent damping (`Math.pow(damp, dt * 60)`) | ✅       |
| Spatial grid for broad-phase collision                    | ✅       |

## License

MIT License.

`TinyTS` - Designed with zero bloat, maximum performance, and straightforward readability.
