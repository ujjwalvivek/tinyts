/**
 * Lightweight scene management using a stack-based scene graph.
 *
 * Useful for menus, gameplay, pause overlays, and level transitions.
 *
 * ```ts
 * class MenuScene extends Scene {
 *   onEnter() { console.log('menu started'); }
 *   render()  { drawText('Press SPACE', ...); }
 * }
 *
 * const sm = new SceneManager();
 * sm.push(new MenuScene('menu'));
 *
 * // In your game loop:
 * engineStart({
 *   update(dt) { sm.current?.update(dt); },
 *   render()   { sm.current?.render(); },
 * });
 * ```
 */
export abstract class Scene {
    /** Human-readable scene identifier. */
    name: string;

    constructor(name: string) {
        this.name = name;
    }

    /** Called when the scene becomes active (first pushed, or resumed after pop). */
    onEnter(): void {}

    /** Called when the scene is no longer active (popped or replaced). */
    onExit(): void {}

    /** Called every frame while this scene is active. */
    update(_dt: number): void {}

    /** Called every frame while this scene is active. */
    render(): void {}
}

/** Controls how scenes are rendered by the manager. */
export type SceneRenderMode = "top" | "stack";

/** Configuration options for SceneManager. */
export interface SceneManagerConfig {
    /**
     * How to render scenes.
     * - `'top'`:   only the topmost (active) scene is rendered.
     * - `'stack'`: all scenes are rendered bottom-to-top, useful for pause overlays
     *              where the paused scene should still be visible underneath.
     * @default 'top'
     */
    renderMode?: SceneRenderMode;
}

/**
 * Stack-based scene manager.
 *
 * Supports push/pop/replace operations with automatic onEnter/onExit lifecycle.
 * Only the topmost scene receives `update()`. call `sm.update(dt)` from your game loop.
 * `render()` behaviour depends on `renderMode`.
 *
 * ```ts
 * const sm = new SceneManager({ renderMode: 'stack' });
 * sm.push(new MenuScene('menu'));
 *
 * engineStart({
 *   update(dt) { sm.update(dt); },
 *   render()   { sm.render(); },
 * });
 *
 * sm.push(new GameScene('level1'));
 * sm.push(new PauseScene('pause'));  // game still visible underneath
 * sm.pop();                          // back to game
 * ```
 */
export class SceneManager {
    private stack: Scene[] = [];
    private readonly config: Required<SceneManagerConfig>;

    constructor(config?: SceneManagerConfig) {
        this.config = { renderMode: config?.renderMode ?? "top" };
    }

    /** Currently active scene (top of stack), or undefined if empty. */
    get current(): Scene | undefined {
        return this.stack[this.stack.length - 1];
    }

    /** Number of scenes on the stack. */
    get depth(): number {
        return this.stack.length;
    }

    /**
     * Push a new scene onto the stack.
     * The previous scene is paused (onExit called), the new scene starts (onEnter called).
     */
    push(scene: Scene): void {
        this.current?.onExit();
        this.stack.push(scene);
        scene.onEnter();
    }

    /**
     * Pop the top scene from the stack.
     * The popped scene is destroyed (onExit called), the previous scene resumes (onEnter called).
     */
    pop(): Scene | undefined {
        const scene = this.stack.pop();
        scene?.onExit();
        this.current?.onEnter();
        return scene;
    }

    /**
     * Replace the top scene without growing the stack.
     * The old scene is destroyed (onExit called), the new scene starts (onEnter called).
     */
    replace(scene: Scene): void {
        const old = this.stack.pop();
        old?.onExit();
        this.stack.push(scene);
        scene.onEnter();
    }

    /** Remove all scenes from the stack. */
    clear(): void {
        while (this.stack.length > 0) {
            this.stack.pop()?.onExit();
        }
    }

    /**
     * Update the active scene. Call this from your game loop.
     * Always delegates to the topmost scene only, regardless of renderMode.
     */
    update(dt: number): void {
        this.current?.update(dt);
    }

    /**
     * Render scenes according to renderMode.
     * - `'top'`:   renders only the active scene.
     * - `'stack'`: renders all scenes bottom-to-top (paused scenes still visible).
     * Call this from your game loop.
     */
    render(): void {
        if (this.config.renderMode === "stack") {
            for (let i = 0; i < this.stack.length; i++) {
                this.stack[i].render();
            }
        } else {
            this.current?.render();
        }
    }
}
