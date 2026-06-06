import { TINYTS_FONT_BASE64 } from "./embeddedFont";

export const DEFAULT_FONT_FAMILY = "TinyTS";
export const DEFAULT_FONT_STACK = `"${DEFAULT_FONT_FAMILY}", "Courier New", Courier, monospace`;

let defaultFontInjected = false;
let defaultFontLoadStarted = false;
let defaultFontReady: Promise<void> | null = null;

export function defaultTextFont(size: number): string {
    return `${size}px ${DEFAULT_FONT_STACK}`;
}

export function ensureDefaultFontFace(): void {
    if (
        defaultFontInjected ||
        typeof document === "undefined" ||
        !document.head
    ) {
        return;
    }
    defaultFontInjected = true;

    const style = document.createElement("style");
    style.setAttribute("data-tinyts-font", DEFAULT_FONT_FAMILY);
    style.textContent = `
@font-face {
  font-family: "${DEFAULT_FONT_FAMILY}";
  src:
    url("/src/font/tinyTS.woff2") format("woff2"),
    url("/dist/font/tinyTS.woff2") format("woff2"),
    url("./font/tinyTS.woff2") format("woff2"),
    url("./dist/font/tinyTS.woff2") format("woff2"),
    url("../dist/font/tinyTS.woff2") format("woff2"),
    url("../../dist/font/tinyTS.woff2") format("woff2"),
    url("./src/font/tinyTS.woff2") format("woff2"),
    url("../src/font/tinyTS.woff2") format("woff2"),
    url("../../src/font/tinyTS.woff2") format("woff2"),
    url("data:font/woff2;base64,${TINYTS_FONT_BASE64}") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: block;
}`;
    document.head.appendChild(style);
}

export function preloadDefaultFontFace(): void {
    void loadDefaultFontFace();
}

export function loadDefaultFontFace(): Promise<void> {
    ensureDefaultFontFace();
    if (defaultFontReady) return defaultFontReady;

    if (
        defaultFontLoadStarted ||
        typeof document === "undefined" ||
        !("fonts" in document)
    ) {
        defaultFontReady = Promise.resolve();
        return defaultFontReady;
    }

    defaultFontLoadStarted = true;
    defaultFontReady = document.fonts
        .load(`16px "${DEFAULT_FONT_FAMILY}"`)
        .then(() => undefined)
        .catch(() => undefined);
    return defaultFontReady;
}
