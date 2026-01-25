import { type CanvasManager } from "./canvas";
import { activeEngine } from "./engine";

const globalActionMap: Record<string, string[]> = {};

/** Manages keyboard, mouse, touch, and gamepad input states. */
export class InputManager {
    readonly canvasManager: CanvasManager;
    /** Map of key codes to their pressed, down, or released state bitmasks. */
    readonly keyboardState: Record<string, number> = {};
    /** Action names mapped to a list of key/button codes. */
    readonly actionMap: Record<string, string[]> = {};
    /** Map of action names to their active state bitmasks. */
    readonly actionState: Record<string, number> = {};
    mouseX = 0;
    mouseY = 0;
    mouseBtnDown = 0;
    mouseBtnPressed = 0;
    mouseBtnReleased = 0;
    mouseWheelDelta = 0;

    touchActive = false;
    touchX = 0;
    touchY = 0;
    /** Whether touch events also trigger mouse events. */
    touchMappedToMouse = false;

    /** Active gamepad index, or -1 if none. */
    gamepadIndex = -1;

    private onKeyDownBound: (e: KeyboardEvent) => void;
    private onKeyUpBound: (e: KeyboardEvent) => void;
    private onMouseMoveBound: (e: MouseEvent) => void;
    private onMouseDownBound: (e: MouseEvent) => void;
    private onMouseUpBound: (e: MouseEvent) => void;
    private onWheelBound: (e: WheelEvent) => void;
    private onTouchStartBound: (e: TouchEvent) => void;
    private onTouchMoveBound: (e: TouchEvent) => void;
    private onTouchEndBound: (e: TouchEvent) => void;

    constructor(canvasManager: CanvasManager) {
        this.canvasManager = canvasManager;

        // Copy any action bindings made prior to engine startup
        Object.assign(this.actionMap, globalActionMap);

        this.onKeyDownBound = (e) => this.onKeyDown(e);
        this.onKeyUpBound = (e) => this.onKeyUp(e);
        this.onMouseMoveBound = (e) => this.onMouseMove(e);
        this.onMouseDownBound = (e) => this.onMouseDown(e);
        this.onMouseUpBound = (e) => this.onMouseUp(e);
        this.onWheelBound = (e) => this.onWheel(e);
        this.onTouchStartBound = (e) => this.onTouchStart(e);
        this.onTouchMoveBound = (e) => this.onTouchMove(e);
        this.onTouchEndBound = (e) => this.onTouchEnd(e);

        window.addEventListener("keydown", this.onKeyDownBound);
        window.addEventListener("keyup", this.onKeyUpBound);

        const canvas = this.canvasManager.canvas;
        canvas.addEventListener("mousemove", this.onMouseMoveBound);
        canvas.addEventListener("mousedown", this.onMouseDownBound);
        canvas.addEventListener("mouseup", this.onMouseUpBound);
        canvas.addEventListener("wheel", this.onWheelBound, { passive: true });

        canvas.addEventListener("touchstart", this.onTouchStartBound, {
            passive: true,
        });
        canvas.addEventListener("touchmove", this.onTouchMoveBound, {
            passive: true,
        });
        canvas.addEventListener("touchend", this.onTouchEndBound);
        canvas.addEventListener("touchcancel", this.onTouchEndBound);
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.repeat) return;
        const code = e.code;
        const wasDown = (this.keyboardState[code] ?? 0) & 1;
        this.keyboardState[code] =
            wasDown
                ? (this.keyboardState[code] ?? 0) | 1
                : (this.keyboardState[code] ?? 0) | 3;

        // Update actions
        for (const name of Object.keys(this.actionMap)) {
            if (this.actionMap[name].includes(code)) {
                this.actionState[name] =
                    wasDown
                        ? (this.actionState[name] ?? 0) | 1
                        : (this.actionState[name] ?? 0) | 3;
            }
        }
    }

    private onKeyUp(e: KeyboardEvent): void {
        const code = e.code;
        this.keyboardState[code] = (this.keyboardState[code] ?? 0) & ~1;
        this.keyboardState[code] = (this.keyboardState[code] ?? 0) | 4;

        for (const name of Object.keys(this.actionMap)) {
            if (this.actionMap[name].includes(code)) {
                this.actionState[name] = (this.actionState[name] ?? 0) & ~1;
                this.actionState[name] = (this.actionState[name] ?? 0) | 4;
            }
        }
    }

    private onMouseMove(e: MouseEvent): void {
        const pos = this.canvasManager.clientToLogical(e.clientX, e.clientY);
        this.mouseX = pos.x;
        this.mouseY = pos.y;
    }

    private onMouseDown(e: MouseEvent): void {
        const btn = e.button;
        if (!(this.mouseBtnDown & (1 << btn))) {
            this.mouseBtnPressed |= 1 << btn;
        }
        this.mouseBtnDown |= 1 << btn;

        const code = `Mouse${btn}`;
        const wasDown = (this.keyboardState[code] ?? 0) & 1;
        this.keyboardState[code] = wasDown
            ? (this.keyboardState[code] ?? 0) | 1
            : (this.keyboardState[code] ?? 0) | 3;
        for (const name of Object.keys(this.actionMap)) {
            if (this.actionMap[name].includes(code)) {
                this.actionState[name] = wasDown
                    ? (this.actionState[name] ?? 0) | 1
                    : (this.actionState[name] ?? 0) | 3;
            }
        }
    }

    private onMouseUp(e: MouseEvent): void {
        const btn = e.button;
        this.mouseBtnDown &= ~(1 << btn);
        this.mouseBtnReleased |= 1 << btn;

        const code = `Mouse${btn}`;
        this.keyboardState[code] = (this.keyboardState[code] ?? 0) & ~1;
        this.keyboardState[code] = (this.keyboardState[code] ?? 0) | 4;
        for (const name of Object.keys(this.actionMap)) {
            if (this.actionMap[name].includes(code)) {
                this.actionState[name] = (this.actionState[name] ?? 0) & ~1;
                this.actionState[name] = (this.actionState[name] ?? 0) | 4;
            }
        }
    }

    private onWheel(e: WheelEvent): void {
        this.mouseWheelDelta += e.deltaY;
    }

    private onTouchStart(e: TouchEvent): void {
        const touch = e.touches[0];
        if (!touch) return;
        this.touchActive = true;

        const pos = this.canvasManager.clientToLogical(
            touch.clientX,
            touch.clientY,
        );
        this.touchX = pos.x;
        this.touchY = pos.y;

        if (this.touchMappedToMouse) {
            this.mouseX = this.touchX;
            this.mouseY = this.touchY;
            if (!(this.mouseBtnDown & 1)) {
                this.mouseBtnPressed |= 1;
            }
            this.mouseBtnDown |= 1;
        }
    }

    private onTouchMove(e: TouchEvent): void {
        const touch = e.touches[0];
        if (!touch) return;

        const pos = this.canvasManager.clientToLogical(
            touch.clientX,
            touch.clientY,
        );
        this.touchX = pos.x;
        this.touchY = pos.y;

        if (this.touchMappedToMouse) {
            this.mouseX = this.touchX;
            this.mouseY = this.touchY;
        }
    }

    private onTouchEnd(e: TouchEvent): void {
        if (e.touches.length === 0) {
            this.touchActive = false;
        }

        if (this.touchMappedToMouse && e.touches.length === 0) {
            this.mouseBtnDown &= ~1;
            this.mouseBtnReleased |= 1;
        }
    }

    /** Update gamepad button and axis states. */
    updateGamepad(): void {
        if (typeof navigator.getGamepads !== "function") return;

        const gamepads = navigator.getGamepads();
        for (const gp of gamepads) {
            if (!gp) continue;
            this.gamepadIndex = gp.index;

            for (let i = 0; i < gp.buttons.length; i++) {
                const pressed = gp.buttons[i].pressed;
                const code = `Gamepad${i}`;
                const wasDown = (this.keyboardState[code] ?? 0) & 1;

                if (pressed && !wasDown) {
                    this.keyboardState[code] =
                        (this.keyboardState[code] ?? 0) | 3;
                } else if (pressed) {
                    this.keyboardState[code] =
                        (this.keyboardState[code] ?? 0) | 1;
                } else if (wasDown) {
                    this.keyboardState[code] =
                        (this.keyboardState[code] ?? 0) & ~1;
                    this.keyboardState[code] =
                        (this.keyboardState[code] ?? 0) | 4;
                }
            }
        }
    }

    /** Reset all input states. */
    reset(): void {
        for (const code in this.keyboardState) delete this.keyboardState[code];
        for (const name in this.actionState) delete this.actionState[name];
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseBtnDown = 0;
        this.mouseBtnPressed = 0;
        this.mouseBtnReleased = 0;
        this.mouseWheelDelta = 0;
        this.touchActive = false;
        this.touchX = 0;
        this.touchY = 0;
        this.gamepadIndex = -1;
    }

    /** Clear single-frame transition states (pressed and released). */
    clearTransient(): void {
        for (const code in this.keyboardState) {
            this.keyboardState[code] &= 1;
        }
        for (const name in this.actionState) {
            this.actionState[name] &= 1;
        }
        this.mouseBtnPressed = 0;
        this.mouseBtnReleased = 0;
        this.mouseWheelDelta = 0;
    }

    /** Clean up all event listeners and reset states. */
    destroy(): void {
        window.removeEventListener("keydown", this.onKeyDownBound);
        window.removeEventListener("keyup", this.onKeyUpBound);

        const canvas = this.canvasManager.canvas;
        canvas.removeEventListener("mousemove", this.onMouseMoveBound);
        canvas.removeEventListener("mousedown", this.onMouseDownBound);
        canvas.removeEventListener("mouseup", this.onMouseUpBound);
        canvas.removeEventListener("wheel", this.onWheelBound);

        canvas.removeEventListener("touchstart", this.onTouchStartBound);
        canvas.removeEventListener("touchmove", this.onTouchMoveBound);
        canvas.removeEventListener("touchend", this.onTouchEndBound);
        canvas.removeEventListener("touchcancel", this.onTouchEndBound);
        this.reset();
    }
}

// Compatibility Global Helpers
/** Check if a key is held down. */
export function keyDown(code: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    return (mgr.keyboardState[code] ?? 0) & 1 ? true : false;
}

/** Check if a key was pressed this frame. */
export function keyPressed(code: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    return (mgr.keyboardState[code] ?? 0) & 2 ? true : false;
}

/** Check if a key was released this frame. */
export function keyReleased(code: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    return (mgr.keyboardState[code] ?? 0) & 4 ? true : false;
}

/** Get logical mouse coordinates. */
export function mousePos(): { x: number; y: number } {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return { x: 0, y: 0 };
    return { x: mgr.mouseX, y: mgr.mouseY };
}

/** Check if a mouse button is held down. */
export function mouseDown(button?: number): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    if (button === undefined) return mgr.mouseBtnDown !== 0;
    return (mgr.mouseBtnDown & (1 << button)) !== 0;
}

/** Check if a mouse button was pressed this frame. */
export function mousePressed(button?: number): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    if (button === undefined) return mgr.mouseBtnPressed !== 0;
    return (mgr.mouseBtnPressed & (1 << button)) !== 0;
}

/** Check if a mouse button was released this frame. */
export function mouseReleased(button?: number): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    if (button === undefined) return mgr.mouseBtnReleased !== 0;
    return (mgr.mouseBtnReleased & (1 << button)) !== 0;
}

/** Get mouse wheel scroll delta. */
export function mouseWheel(): number {
    return activeEngine?.inputManager?.mouseWheelDelta ?? 0;
}

/**
 * Bind an action name to a set of keys or buttons.
 * @param keys - Key or button codes.
 */
export function bindAction(name: string, keys: string[]): void {
    globalActionMap[name] = keys;
    if (activeEngine?.inputManager) {
        activeEngine.inputManager.actionMap[name] = keys;
    }
}

/** Check if an action is currently held down. */
export function actionDown(name: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    mgr.updateGamepad();
    const state = mgr.actionState[name] ?? 0;
    if (state & 1) return true;

    const keys = mgr.actionMap[name];
    if (keys) {
        for (const key of keys) {
            const mouseButton = mouseButtonFromCode(key);
            const isDown =
                mouseButton !== null
                    ? (mgr.mouseBtnDown & (1 << mouseButton)) !== 0
                    : (mgr.keyboardState[key] ?? 0) & 1
                      ? true
                      : false;
            if (isDown) return true;
        }
    }
    return false;
}

/** Check if an action was pressed this frame. */
export function actionPressed(name: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    mgr.updateGamepad();
    const state = mgr.actionState[name] ?? 0;
    if (state & 2) return true;

    const keys = mgr.actionMap[name];
    if (keys) {
        for (const key of keys) {
            const mouseButton = mouseButtonFromCode(key);
            const isPressed =
                mouseButton !== null
                    ? (mgr.mouseBtnPressed & (1 << mouseButton)) !== 0
                    : (mgr.keyboardState[key] ?? 0) & 2
                      ? true
                      : false;
            if (isPressed) return true;
        }
    }
    return false;
}

/** Check if an action was released this frame. */
export function actionReleased(name: string): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    mgr.updateGamepad();
    const state = mgr.actionState[name] ?? 0;
    if (state & 4) return true;

    const keys = mgr.actionMap[name];
    if (keys) {
        for (const key of keys) {
            const mouseButton = mouseButtonFromCode(key);
            const isReleased =
                mouseButton !== null
                    ? (mgr.mouseBtnReleased & (1 << mouseButton)) !== 0
                    : (mgr.keyboardState[key] ?? 0) & 4
                      ? true
                      : false;
            if (isReleased) return true;
        }
    }
    return false;
}

/** Check if a gamepad button is held down. */
export function gamepadIsDown(button: number): boolean {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return false;
    mgr.updateGamepad();
    return (mgr.keyboardState[`Gamepad${button}`] ?? 0) & 1 ? true : false;
}

/**
 * Get the x and y axes of a gamepad stick.
 * @param stick - Stick index (0 for left, 1 for right).
 */
export function gamepadStick(stick: number): { x: number; y: number } {
    const result = { x: 0, y: 0 };
    const mgr = activeEngine?.inputManager;
    if (!mgr) return result;

    if (typeof navigator.getGamepads !== "function") return result;
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
        if (!gp || gp.index !== mgr.gamepadIndex) continue;
        if (stick === 0) {
            result.x = gp.axes[0] ?? 0;
            result.y = gp.axes[1] ?? 0;
        } else {
            result.x = gp.axes[2] ?? 0;
            result.y = gp.axes[3] ?? 0;
        }

        const deadZone = 0.15;
        if (Math.abs(result.x) < deadZone) result.x = 0;
        if (Math.abs(result.y) < deadZone) result.y = 0;
        break;
    }
    return result;
}

/** Check if touch input is currently active. */
export function isTouchActive(): boolean {
    return activeEngine?.inputManager?.touchActive ?? false;
}

/** Get logical touch coordinates. */
export function touchPos(): { x: number; y: number } {
    const mgr = activeEngine?.inputManager;
    if (!mgr) return { x: 0, y: 0 };
    return { x: mgr.touchX, y: mgr.touchY };
}

/** Set whether touch events also trigger mouse events. */
export function setTouchMappedToMouse(enabled: boolean): void {
    const mgr = activeEngine?.inputManager;
    if (mgr) {
        mgr.touchMappedToMouse = enabled;
    }
}

function mouseButtonFromCode(code: string): number | null {
    if (!code.startsWith("Mouse")) return null;
    const button = Number(code.slice(5));
    return Number.isInteger(button) && button >= 0 ? button : null;
}
