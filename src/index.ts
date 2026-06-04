export {
    Vec2,
    vec2,
    rect,
    clamp,
    lerp,
    mapRange,
    rand,
    randInt,
    choose,
} from "./core/math";
export type { Rect } from "./core/math";

export {
    Engine,
    engineStart,
    engineStop,
    activeEngine,
    getActiveEngine,
    stats,
    frameCount,
    time,
    alpha,
} from "./core/engine";
export type {
    EngineConfig,
    EngineStats,
    ScaleMode,
    EnginePlugin,
} from "./core/engine";

export {
    keyDown,
    keyPressed,
    keyReleased,
    mousePos,
    mouseDown,
    mousePressed,
    mouseReleased,
    mouseWheel,
    bindAction,
    actionDown,
    actionPressed,
    actionReleased,
    gamepadIsDown,
    gamepadStick,
    isTouchActive,
    touchPos,
    setTouchMappedToMouse,
    addTouchControls,
    removeTouchControls,
} from "./core/input";
export type {
    TouchControlButtonConfig,
    TouchControlsConfig,
    TouchControlsVisibility,
} from "./core/input";

export {
    clear,
    drawRect,
    drawLine,
    drawCircle,
    drawSprite,
    drawText,
    drawRectOutline,
    drawCircleOutline,
    getContext,
    setRenderTransform,
    resetRenderTransform,
    getActiveRenderer,
    createFrameBuffer,
    bindFrameBuffer,
    drawFrameBuffer,
    getRendererStats,
} from "./render/renderer2d";
export { SpriteAnimation } from "./render/spriteAnimation";
export type { SpriteAnimationConfig } from "./render/spriteAnimation";
export type { FrameBuffer, RendererStats } from "./render/types";

export {
    Color,
    rgb,
    hsl,
    WHITE,
    BLACK,
    RED,
    GREEN,
    BLUE,
    YELLOW,
    CYAN,
    MAGENTA,
    TRANSPARENT,
} from "./render/color";

export { loadImage, loadText, loadJson, loadAssets } from "./core/assets";
export type { AssetManifest, AssetBundle } from "./core/assets";

export {
    aabb,
    aabbOverlap,
    aabbOverlapResult,
    pointInRect,
    moveAABB,
    sweepAABB,
    aabbExpand,
    aabbCenter,
} from "./physics/aabb";
export type {
    AABB,
    OverlapResult,
    MoveResult,
    SweepResult,
    ColliderEntry,
} from "./physics/aabb";

export {
    tilemapFromString,
    createTilemap,
    moveTilemap,
} from "./physics/tilemap";
export type { TileDef, TileMap } from "./physics/tilemap";

export {
    fillTiles,
    drawLineTiles,
    drawCircleTiles,
    stampTiles,
    stampTilemap,
} from "./physics/tilemapHelpers";

export { noise2D, fractalNoise2D } from "./physics/noise";

export {
    createVerletPoint,
    createVerletStick,
    createVerletRope,
    verletIntegrate,
    verletSolveStick,
    updateVerletRope,
} from "./physics/verlet";
export type { VerletPoint, VerletStick, VerletRope } from "./physics/verlet";

export { createSpatialGrid } from "./physics/spatialGrid";
export type { SpatialGrid } from "./physics/spatialGrid";

export { Camera, createCamera } from "./render/camera";
export type { CameraConfig } from "./render/camera";

export {
    initAudio,
    unlockAudio,
    getAudioContext,
    setMasterVolume,
    getMasterVolume,
    playSound,
    loadAudio,
    playLoadedAudio,
    playSoundAt,
    stopAll,
    stopSoundsWithTag,
    AudioManager,
    AudioClip,
    AudioHandle,
    getAudioManager,
} from "./audio/audio";
export { Sequencer, Pattern, midiToFreq } from "./audio/audio";
export type {
    SoundParams,
    SynthOptions,
    PlayOptions,
    WaveType,
    TimedNote,
    TrackDef,
} from "./audio/audio";

export {
    emitParticles,
    updateParticles,
    renderParticles,
    clearParticles,
    getActiveParticleCount,
    ParticleSystem,
    Emitter,
} from "./fx/particles";
export type { Particle, EmitParams, EmitterConfig } from "./fx/particles";

export {
    tween,
    addTween,
    updateTweens,
    clearTweens,
    linear,
    quadIn,
    quadOut,
    quadInOut,
    cubicIn,
    cubicOut,
    cubicInOut,
    elasticOut,
    bounceOut,
    backOut,
} from "./core/easing";
export type { EasingFn, Tween, TweenConfig } from "./core/easing";

export {
    startTextInput,
    stopTextInput,
    getTextInput,
    processTextInput,
} from "./core/textInput";
export type { TextInputState } from "./core/textInput";

export { DebugOverlayPlugin } from "./plugins/debugOverlayPlugin";

export {
    createTexture,
    clearTextureCache,
    drawProceduralRect,
    drawProceduralCircle,
    drawProceduralLine,
    drawProceduralPolygon,
    drawProceduralArc,
    drawProceduralEllipse,
    drawProceduralBezierCurve,
    drawProceduralText,
    drawProceduralGradientRect,
    drawProceduralGridPattern,
    drawProceduralRoundedRect,
    drawProceduralRegularPolygon,
    drawProceduralStar,
    drawProceduralRing,
    drawProceduralSector,
    drawProceduralCapsule,
    drawProceduralQuadraticCurve,
} from "./render/procedural";

export * as assets from "./plugins/assets";
export * as fx from "./plugins/particlePresets";
export * as sfx from "./plugins/audioPresets";

export { Registry, Parent, Children } from "./core/ecs";
export type { Entity, Component } from "./core/ecs";

export { Timer } from "./core/timer";
export { Scene, SceneManager } from "./core/scene";
export type { SceneRenderMode, SceneManagerConfig } from "./core/scene";
