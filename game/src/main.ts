import { engineStart, SceneManager, unlockAudio } from "@ujjwalvivek/tinyts";
import { GameScene } from "./scenes/game";

const sm = new SceneManager();
const gameScene = new GameScene();
sm.push(gameScene);

const engine = engineStart({
    size: { width: 1280, height: 720 },
    scaleMode: "fit",
    pixelated: true,
    webgpu: true,
    post: {
        bloom: {
            threshold: 0.46,
            softKnee: 0.2,
            intensity: 0.82,
            radius: 1.15,
            passes: 2,
            resolutionScale: 1.0,
        },
        colorGrade: {
            contrast: 1.04,
            saturation: 1.03,
            gamma: 0.98,
            temperature: -0.02,
        },
        vignette: {
            intensity: 0.11,
            radius: 0.78,
            softness: 0.42,
        },
        grain: {
            amount: 0.0050,
            scale: 1.5,
            animated: true,
        },
        atmosphere: {
            intensity: 0.85,
            color: [0.07, 0.1, 0.13],
            start: 0.0,
            end: 0.45,
            noiseAmount: 0.0015,
            noiseScale: 128,
        },
    },
    update(dt) {
        sm.update(dt);
    },
    render() {
        sm.render();
    },
});

const container = document.querySelector("#app");
if (container) {
    container.appendChild(engine.canvasManager.canvas);
    if (engine.overlayCanvas) {
        container.appendChild(engine.overlayCanvas);
    }
}

const unlockHandler = () => {
    unlockAudio();
    window.removeEventListener("click", unlockHandler);
    window.removeEventListener("keydown", unlockHandler);
};
window.addEventListener("click", unlockHandler);
window.addEventListener("keydown", unlockHandler);
