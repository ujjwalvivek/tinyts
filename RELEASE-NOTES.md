# TinyTS v0.1.4 - Release Notes

#### Performance & WebGPU Upgrades

The WebGPU rendering backend has been added as an opt-in feature to bypass CPU bottlenecks, yielding massive scaling performance:

- Sprite rotations are now computed natively on the GPU. The CPU no longer runs expensive trig functions (`Math.sin`/`Math.cos`) per sprite.
- The instance structure is now a streamlined, 16-float (64-byte) aligned layout, reducing data payload copying in the draw loop by 20%. A little nicer memorty layout.
- Camera data is uploaded once per frame to the uniform buffer, eliminating redundant camera writes per sprite.
- Texture atlas region lookups bypass `WeakMap` query hashes entirely via a direct object-property cache on the source images.
- Added a static cache to `Color.fromHex()` to prevent garbage collection pressure and CPU overhead from repeated parsing of identical color strings.
- The stress test stats panel now explicitly shows which renderer backend is currently active (e.g. `(webgpu)`, `(webgl2)`, or `(canvas2d)`).

#### Benchmark Comparison (v0.1.3 vs v0.1.4 at 60fps)

* **Firefox (WebGPU)**: Quads and circles performance doubled from **92k to 184k** (a **+100% boost**); sprite count went from **32k to 40k** (a **+25% boost**).
* **Chromium (WebGPU)**: Quads and circles peaked at **202k** (up from 142k, a **+42% boost**); sprites rose from **82k to 110k** (a **+34% boost**).

