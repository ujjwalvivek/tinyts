# TinyTS v0.1.0 - Release Notes

TinyTS is a tiny, fast, TypeScript-first 2D web game engine (~88 KB minified, ~27 KB gzip) with zero runtime dependencies.

This release represents the complete core implementation of the engine, including fully tested rendering, audio, physics, and ECS pipelines.

## Development Timeline

1. **Initial Project Setup**: Setup package configs, TypeScript environment, and baseline Timer.
2. **Math Utilities**: Vector math (`Vec2`), interpolation, and PRNG algorithms.
3. **Color & HSL**: Hex, RGB, and HSL parsing helpers.
4. **Renderer Specs**: Unified interface for renderer backends and option shapes.
5. **Procedural Draw**: Canvas and WebGL implementations of SDF shapes.
6. **Sprite Animation**: Accumulator-driven frame updates with frame skipping.
7. **ECS Registry**: Implementation of entity views, pools, and hierarchies.
8. **Noise Maps**: 2D value noise and fractal fBm noise.
9. **Collision Resolvers**: Continuous swept AABB checks.
10. **Spatial Hash Grid**: Acceleration structures for broad-phase queries.
11. **Verlet Solver**: Particle and constraints-based physics.
12. **Asset Loader Helper**: Abstract loading wrapper.
13. **Engine Core Loop**: Input systems, loop timers, and plugin hooks.
14. **WebGL2 & Canvas2D Backends**: Real-time batch renderer with fallback handlers.
15. **Easing & Tweens**: Timing curves and procedural animations.
16. **Audio Engine**: Synthesis, sequencing, and envelope controls.
17. **Camera Controller**: Scaling, viewport limits, screen shake, and target tracking.
18. **Tilemaps**: Grid-based levels, drawing APIs, and raycast collisions.
19. **Particle Systems**: Pool-backed emitters and customizable lifecycles.
20. **Asset Manager**: Asset loaders for files, images, JSON, and sound bytes.
21. **Debug Overlays**: Live FPS/performance instrumentation.
22. **Preset Libraries**: Ready-made sound effects (shoot, hit, jump) and particle layouts.
23. **Tests**: 86 unit tests covering all engine modules, test runners, and builds.
