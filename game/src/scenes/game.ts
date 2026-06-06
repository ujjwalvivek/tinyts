import {
    Scene,
    Vec2,
    vec2,
    aabb,
    moveAABB,
    playSound,
    Sequencer,
    Pattern,
    clear,
    drawRect,
    drawLine,
    drawCircle,
    drawSprite,
    drawText,
    drawRectOutline,
    choose,
    rand,
    randInt,
    clamp,
    lerp,
    time,
    keyPressed,
    keyDown,
    mousePos,
    mouseDown,
    mousePressed,
    mouseReleased,
    bindAction,
    actionPressed,
    actionDown,
    createCamera,
    emitParticles,
    updateParticles,
    renderParticles,
    sfx,
    getAudioContext,
    unlockAudio,
    getAudioManager,
    setMasterVolume,
} from "@ujjwalvivek/tinyts";
import type { ColliderEntry } from "@ujjwalvivek/tinyts";
import { createGameTextures } from "../game/textures";
import type { GameTextures } from "../game/textures";
import type { InteractableSprite } from "../game/interactables";
import type {
    Building,
    Bullet,
    CyberDrone,
    DataCore,
    FloatingText,
    GrappleAnchor,
    LaserBarrier,
} from "../game/types";
import {
    renderBuilding,
    renderMenuCityForeground,
    renderWorldBackground,
} from "../world/renderer";
import {
    OPTION_BOUNDS,
    hitTestMainMenu,
    hitTestOptionBack,
    hitTestOptionsRow,
    hitTestOptionsTab,
    hitTestPause,
    renderMainMenu,
    renderOptionsScreen,
    renderPauseOverlay,
    renderSplashScreen,
    sliderIndexFromX,
} from "../ui/screens";

const WORLD_COLORS = {
    bg: "#05070a",
    farBuilding: "rgba(6, 9, 13, 0.72)",
    farBuildingEdge: "rgba(77, 143, 176, 0.035)",
    building: "rgba(7, 10, 14, 0.96)",
    buildingEdge: "rgba(77, 90, 105, 0.42)",
    buildingEdgeHot: "rgba(185, 130, 56, 0.42)",
    window: "rgba(77, 143, 176, 0.075)",
    cable: "rgba(77, 143, 176, 0.52)",
    cableCore: "rgba(164, 175, 187, 0.72)",
    target: "#4d8fb0",
    blue: "#4d8fb0",
    amber: "#b98238",
    red: "#9e3f35",
    text: "#a4afbb",
    muted: "#56616d",
    faint: "#242b33",
};

const GRAPPLE_MIN_LENGTH = 58;
const GRAPPLE_MAX_LENGTH = 320;
const GRAPPLE_REEL_SPEED = 230;
const GRAPPLE_TANGENT_THRUST = 760;
const GRAPPLE_GRAVITY = 720;
const GRAPPLE_ATTACH_IMPULSE = 520;
const BREACH_SPEED = 980;
const BREACH_DURATION = 0.14;
const BREACH_RECOVERY = 0.28;
const BREACH_MISS_COOLDOWN = 0.75;
const BREACH_HIT_COOLDOWN = 0.08;
const PLAYER_RENDER_SIZE = vec2(47, 60);
const PLAYER_VISUAL_Y_OFFSET = 4;
const CITY_BASE_Y = 1120;
const DEATH_Y = 1040;

export class GameScene extends Scene {
    // Game state variables
    private player = {
        pos: vec2(100, 200),
        size: vec2(28, 44),
        velocity: vec2(0, 0),
        isGrounded: false,
        isGrappling: false,
        isDashing: false,
        dashTimer: 0,
        dashCooldown: 0,
        slashRecovery: 0,
        slashHit: false,
        canWallJump: true,
        wallJumpResetSide: 0,
        facing: 1,
        visualLean: 0,
        trail: [] as {
            pos: Vec2;
            angle: number;
            run: boolean;
            facing: number;
        }[],
        health: 3,
        dead: false,
        score: 0,
        combo: 0,
        comboMultiplier: 1,
        comboTimer: 0,
    };

    private camera = createCamera({
        pos: vec2(640, 360),
        size: vec2(1280, 720),
        zoom: 1,
    });
    private textures!: GameTextures;

    // Level elements lists
    private buildings: Building[] = [];
    private anchors: GrappleAnchor[] = [];
    private cores: DataCore[] = [];
    private drones: CyberDrone[] = [];
    private lasers: LaserBarrier[] = [];
    private bullets: Bullet[] = [];
    private floatingTexts: FloatingText[] = [];

    // Grapple cable
    private grappleAnchor: Vec2 | null = null;
    private grappleRopeLength = 0;

    // Level gen marker
    private lastGeneratedX = 0;

    // Audio Sequencers
    private menuSequencer: Sequencer | null = null;
    private gameSequencer: Sequencer | null = null;

    // Controls bindings
    private grappleRange = GRAPPLE_MAX_LENGTH;
    private targetedAnchor: GrappleAnchor | null = null;

    private gameState: "splash" | "start" | "playing" | "paused" | "gameover" =
        "splash";
    private splashTimer = 0;
    private gameOverTimer = 0;
    private menuOption = 0; // 0 = resume/play, 1 = restart/quit
    private backgroundStars: {
        pos: Vec2;
        size: number;
        speed: number;
        phase: number;
    }[] = [];

    // Options & Sub-menu state variables
    private menuState: "main" | "options" = "main";
    private mainMenuOption = 0; // 0 = START GAME, 1 = OPTIONS
    private optionsTab: "audio" | "keybinds" | "system" = "audio";
    private optionsRow = 0; // Selected setting row in Options tab
    private showFPS = false;
    private currentFPS = 60;
    private startHoverTime = 0;
    private optHoverTime = 0;

    // Volume configuration
    private masterVolIndex = 4; // Default to 100%
    private musicVolIndex = 4; // Default to 100%
    private sfxVolIndex = 4; // Default to 100%
    private volLevels = [0, 0.25, 0.5, 0.75, 1.0];
    private volLabels = ["MUTED", "25%", "50%", "75%", "100%"];

    constructor() {
        super("game");
    }

    onEnter() {
        // Make sure controls are mapped
        bindAction("left", ["KeyA", "ArrowLeft"]);
        bindAction("right", ["KeyD", "ArrowRight"]);
        bindAction("up", ["KeyW", "ArrowUp"]);
        bindAction("down", ["KeyS", "ArrowDown"]);
        bindAction("restart", ["KeyR"]);
        bindAction("dash", ["Space"]);
        bindAction("pause", ["Escape", "KeyP"]);

        // Generate stars
        this.backgroundStars = [];
        for (let i = 0; i < 42; i++) {
            this.backgroundStars.push({
                pos: vec2(rand(0, 1280), rand(0, 520)),
                size: rand(0.45, 1.05),
                speed: rand(0.15, 0.75),
                phase: rand(0, Math.PI * 2),
            });
        }

        this.textures = createGameTextures();

        // Start audio sequencer loops
        this.initSequencers();

        // Generate initial terrain
        this.resetGame();

        // Start menu sequencer
        if (this.menuSequencer) {
            this.menuSequencer.play();
        }
    }

    onExit() {
        if (this.menuSequencer) {
            this.menuSequencer.stop();
            this.menuSequencer = null;
        }
        if (this.gameSequencer) {
            this.gameSequencer.stop();
            this.gameSequencer = null;
        }
    }

    private resetGame() {
        // Reset player
        this.player.pos.set(100, 100);
        this.player.velocity.set(150, 0);
        this.player.isGrounded = false;
        this.player.isGrappling = false;
        this.player.isDashing = false;
        this.player.dashTimer = 0;
        this.player.dashCooldown = 0;
        this.player.slashRecovery = 0;
        this.player.slashHit = false;
        this.player.canWallJump = true;
        this.player.wallJumpResetSide = 0;
        this.player.facing = 1;
        this.player.visualLean = 0;
        this.player.health = 3;
        this.player.dead = false;
        this.player.score = 0;
        this.player.combo = 0;
        this.player.comboMultiplier = 1;
        this.player.comboTimer = 0;
        this.player.trail = [];
        this.gameOverTimer = 0;

        // Reset lists
        this.buildings = [];
        this.anchors = [];
        this.cores = [];
        this.drones = [];
        this.lasers = [];
        this.bullets = [];
        this.floatingTexts = [];
        this.grappleAnchor = null;
        this.grappleRopeLength = 0;

        // Reset camera position
        this.camera.pos.set(640, 360);

        // Initial procedural skyline generators
        this.lastGeneratedX = -200;

        // Spawn floor below player to start safely
        this.buildings.push({
            aabb: aabb(vec2(-200, 400), vec2(400, CITY_BASE_Y - 400)),
            color: WORLD_COLORS.building,
            borderColor: WORLD_COLORS.buildingEdgeHot,
        });
        this.lastGeneratedX = 200;

        for (let i = 0; i < 6; i++) {
            this.generateNextBuilding();
        }
    }

    private generateNextBuilding() {
        const w = randInt(180, 360);
        const gap = randInt(70, 160);
        const h = randInt(200, 480);

        const x = this.lastGeneratedX + gap;
        const y = 720 - h;

        // Add building
        this.buildings.push({
            aabb: aabb(vec2(x, y), vec2(w, CITY_BASE_Y - y)),
            color: WORLD_COLORS.building,
            borderColor: choose([
                WORLD_COLORS.buildingEdge,
                WORLD_COLORS.buildingEdgeHot,
            ]),
        });

        // Spawn Grapple Anchor in the gap
        this.anchors.push({
            pos: vec2(x - gap / 2, randInt(100, 220)),
            pulseTimer: rand(0, Math.PI),
        });

        // Spawn Data Cores in an arc
        const numCores = randInt(2, 4);
        for (let i = 0; i < numCores; i++) {
            const t = (i + 1) / (numCores + 1);
            const cx = this.lastGeneratedX + gap * t;
            // Parabolic arc height
            const cy = 200 - 80 * Math.sin(t * Math.PI);
            this.cores.push({
                pos: vec2(cx - 10, cy - 10),
                active: true,
            });
        }

        // Spawn Security Drone above building (70% chance)
        if (rand(0, 1) < 0.7) {
            const dronePatrol = w - 40;
            this.drones.push({
                pos: vec2(x + 20, y - randInt(60, 120)),
                startPos: vec2(x + 20, y - randInt(60, 120)),
                patrolRange: dronePatrol,
                dir: 1,
                shootCooldown: rand(0.5, 1.5),
                dead: false,
            });
        }

        // Spawn Laser Barrier (30% chance)
        if (rand(0, 1) < 0.3) {
            const lx = x + w / 2;
            const ly1 = y;
            const ly2 = y - 120;
            this.lasers.push({
                emitter1: vec2(lx, ly1),
                emitter2: vec2(lx, ly2),
                active: true,
                timer: rand(0, 2),
                disabled: false,
            });
        }

        this.lastGeneratedX = x + w;
    }

    private initSequencers() {
        // 1. Menu Sequencer - extremely calm spacey ambient (no hats)
        this.menuSequencer = new Sequencer(65);

        // Menu Pad
        this.menuSequencer.addPattern(
            new Pattern(
                "menu_pad",
                [
                    { beat: 0.0, note: 57, duration: 3.5, velocity: 0.25 },
                    { beat: 0.1, note: 60, duration: 3.4, velocity: 0.25 },
                    { beat: 0.2, note: 64, duration: 3.3, velocity: 0.25 },
                    { beat: 4.0, note: 53, duration: 3.5, velocity: 0.25 },
                    { beat: 4.1, note: 57, duration: 3.4, velocity: 0.25 },
                    { beat: 4.2, note: 60, duration: 3.3, velocity: 0.25 },
                    { beat: 8.0, note: 48, duration: 3.5, velocity: 0.25 },
                    { beat: 8.1, note: 64, duration: 3.4, velocity: 0.25 },
                    { beat: 8.2, note: 67, duration: 3.3, velocity: 0.25 },
                    { beat: 12.0, note: 52, duration: 3.5, velocity: 0.25 },
                    { beat: 12.1, note: 55, duration: 3.4, velocity: 0.25 },
                    { beat: 12.2, note: 59, duration: 3.3, velocity: 0.25 },
                ],
                4,
            ),
        );
        this.menuSequencer.addTrack({
            pattern: "menu_pad",
            wave: "sine",
            volume: 0.15,
        });

        // Menu Bass
        this.menuSequencer.addPattern(
            new Pattern(
                "menu_bass",
                [
                    { beat: 0.0, note: 45, duration: 3.8, velocity: 0.35 },
                    { beat: 4.0, note: 41, duration: 3.8, velocity: 0.35 },
                    { beat: 8.0, note: 36, duration: 3.8, velocity: 0.35 },
                    { beat: 12.0, note: 40, duration: 3.8, velocity: 0.35 },
                ],
                4,
            ),
        );
        this.menuSequencer.addTrack({
            pattern: "menu_bass",
            wave: "triangle",
            volume: 0.18,
            pitchOffset: -12,
        });

        // Menu Melody (echoing space bells)
        this.menuSequencer.addPattern(
            new Pattern(
                "menu_melody",
                [
                    { beat: 1.0, note: 64, duration: 1.0, velocity: 0.22 },
                    { beat: 2.0, note: 67, duration: 1.0, velocity: 0.22 },
                    { beat: 3.0, note: 72, duration: 1.0, velocity: 0.22 },
                    { beat: 5.0, note: 65, duration: 1.0, velocity: 0.22 },
                    { beat: 6.0, note: 69, duration: 1.0, velocity: 0.22 },
                    { beat: 7.0, note: 72, duration: 1.0, velocity: 0.22 },
                    { beat: 9.0, note: 67, duration: 1.0, velocity: 0.22 },
                    { beat: 10.0, note: 72, duration: 1.0, velocity: 0.22 },
                    { beat: 11.0, note: 76, duration: 1.0, velocity: 0.22 },
                    { beat: 13.0, note: 64, duration: 1.0, velocity: 0.22 },
                    { beat: 14.0, note: 67, duration: 1.0, velocity: 0.22 },
                    { beat: 15.0, note: 71, duration: 1.0, velocity: 0.22 },
                ],
                4,
            ),
        );
        this.menuSequencer.addTrack({
            pattern: "menu_melody",
            wave: "sine",
            volume: 0.08,
        });

        // 2. Gameplay Sequencer - smooth active synthwave
        this.gameSequencer = new Sequencer(80);

        // Gameplay Pad
        this.gameSequencer.addPattern(
            new Pattern(
                "game_pad",
                [
                    { beat: 0, note: 57, duration: 3.5, velocity: 0.2 },
                    { beat: 0.1, note: 60, duration: 3.4, velocity: 0.2 },
                    { beat: 0.2, note: 64, duration: 3.3, velocity: 0.2 },
                    { beat: 4, note: 53, duration: 3.5, velocity: 0.2 },
                    { beat: 4.1, note: 57, duration: 3.4, velocity: 0.2 },
                    { beat: 4.2, note: 60, duration: 3.3, velocity: 0.2 },
                    { beat: 8, note: 48, duration: 3.5, velocity: 0.2 },
                    { beat: 8.1, note: 64, duration: 3.4, velocity: 0.2 },
                    { beat: 8.2, note: 67, duration: 3.3, velocity: 0.2 },
                    { beat: 12, note: 55, duration: 3.5, velocity: 0.2 },
                    { beat: 12.1, note: 59, duration: 3.4, velocity: 0.2 },
                    { beat: 12.2, note: 62, duration: 3.3, velocity: 0.2 },
                ],
                4,
            ),
        );
        this.gameSequencer.addTrack({
            pattern: "game_pad",
            wave: "sine",
            volume: 0.16,
        });

        // Gameplay Bass
        this.gameSequencer.addPattern(
            new Pattern(
                "game_bass",
                [
                    { beat: 0, note: 45, duration: 3.8, velocity: 0.4 },
                    { beat: 4, note: 41, duration: 3.8, velocity: 0.4 },
                    { beat: 8, note: 36, duration: 3.8, velocity: 0.4 },
                    { beat: 12, note: 43, duration: 3.8, velocity: 0.4 },
                ],
                4,
            ),
        );
        this.gameSequencer.addTrack({
            pattern: "game_bass",
            wave: "triangle",
            volume: 0.2,
            pitchOffset: -12,
        });

        // Gameplay Melody
        this.gameSequencer.addPattern(
            new Pattern(
                "game_melody",
                [
                    { beat: 0.5, note: 69, duration: 0.2, velocity: 0.35 },
                    { beat: 1.0, note: 72, duration: 0.2, velocity: 0.35 },
                    { beat: 1.5, note: 76, duration: 0.2, velocity: 0.3 },
                    { beat: 2.0, note: 81, duration: 0.2, velocity: 0.2 },
                    { beat: 2.5, note: 76, duration: 0.2, velocity: 0.15 },
                    { beat: 4.5, note: 65, duration: 0.2, velocity: 0.35 },
                    { beat: 5.0, note: 69, duration: 0.2, velocity: 0.35 },
                    { beat: 5.5, note: 72, duration: 0.2, velocity: 0.3 },
                    { beat: 6.0, note: 77, duration: 0.2, velocity: 0.2 },
                    { beat: 6.5, note: 72, duration: 0.2, velocity: 0.15 },
                    { beat: 8.5, note: 67, duration: 0.2, velocity: 0.35 },
                    { beat: 9.0, note: 72, duration: 0.2, velocity: 0.35 },
                    { beat: 9.5, note: 76, duration: 0.2, velocity: 0.3 },
                    { beat: 10.0, note: 79, duration: 0.2, velocity: 0.2 },
                    { beat: 10.5, note: 76, duration: 0.2, velocity: 0.15 },
                    { beat: 12.5, note: 67, duration: 0.2, velocity: 0.35 },
                    { beat: 13.0, note: 71, duration: 0.2, velocity: 0.35 },
                    { beat: 13.5, note: 74, duration: 0.2, velocity: 0.3 },
                    { beat: 14.0, note: 79, duration: 0.2, velocity: 0.2 },
                    { beat: 14.5, note: 74, duration: 0.2, velocity: 0.15 },
                ],
                4,
            ),
        );
        this.gameSequencer.addTrack({
            pattern: "game_melody",
            wave: "sine",
            volume: 0.08,
        });

        // Hi-hat (Very soft noise ticks)
        this.gameSequencer.addPattern(
            new Pattern(
                "game_hats",
                [
                    { beat: 0, note: 42, duration: 0.02, velocity: 0.06 },
                    { beat: 1, note: 42, duration: 0.02, velocity: 0.04 },
                    { beat: 2, note: 42, duration: 0.02, velocity: 0.06 },
                    { beat: 3, note: 42, duration: 0.02, velocity: 0.04 },
                ],
                1,
            ),
        );
        this.gameSequencer.addTrack({
            pattern: "game_hats",
            wave: "noise",
            volume: 0.02,
        });
    }

    private getPlayerCenter(): Vec2 {
        return vec2(
            this.player.pos.x + this.player.size.x / 2,
            this.player.pos.y + this.player.size.y / 2,
        );
    }

    private releaseGrapple() {
        this.player.isGrappling = false;
        this.grappleAnchor = null;
        this.grappleRopeLength = 0;
    }

    private attachGrapple(anchor: GrappleAnchor, playerCenter: Vec2) {
        this.player.isGrappling = true;
        this.grappleAnchor = anchor.pos.clone();
        this.grappleRopeLength = clamp(
            playerCenter.distanceTo(this.grappleAnchor),
            GRAPPLE_MIN_LENGTH,
            this.grappleRange,
        );
        this.player.canWallJump = true;
        this.player.wallJumpResetSide = 0;

        const pullDir = this.grappleAnchor.clone().subtract(playerCenter);
        if (pullDir.length() > 0.001) {
            pullDir.normalize();
            const inwardSpeed = Math.max(0, this.player.velocity.dot(pullDir));
            const neededImpulse = Math.max(0, GRAPPLE_ATTACH_IMPULSE - inwardSpeed);
            this.player.velocity.add(pullDir.scale(neededImpulse));
        }

        playSound(sfx.blip({ volume: 0.12, pitch: 1.35 }));
        this.camera.shake(2);

        emitParticles({
            pos: this.grappleAnchor.clone(),
            count: 10,
            life: [0.12, 0.25],
            speed: [40, 130],
            size: [1.5, 4],
            color: [WORLD_COLORS.blue, WORLD_COLORS.amber],
            damping: 0.9,
        });
    }

    private resolveGrappleConstraint() {
        if (!this.player.isGrappling || !this.grappleAnchor) return;

        const center = this.getPlayerCenter();
        const outward = center.clone().subtract(this.grappleAnchor);
        const dist = outward.length();
        if (dist < 0.001) return;

        if (dist > this.grappleRopeLength) {
            const dir = outward.scale(1 / dist);
            const targetCenter = this.grappleAnchor
                .clone()
                .add(dir.clone().scale(this.grappleRopeLength));
            const correction = targetCenter.subtract(center);
            this.player.pos.add(correction);

            const radialSpeed = this.player.velocity.dot(dir);
            if (radialSpeed > 0) {
                this.player.velocity.subtract(dir.clone().scale(radialSpeed));
            }
        }
    }

    private updatePlayerVisualState(dt: number) {
        if (this.player.velocity.x > 18) {
            this.player.facing = 1;
        } else if (this.player.velocity.x < -18) {
            this.player.facing = -1;
        }

        let targetLean = clamp(this.player.velocity.x / 900, -1, 1) * 0.16;
        if (this.player.isDashing) {
            targetLean = this.player.facing * 0.22;
        }
        this.player.visualLean = lerp(
            this.player.visualLean,
            targetLean,
            clamp(12 * dt, 0, 1),
        );
    }

    private getPlayerSprite(running: boolean): HTMLCanvasElement {
        if (this.player.isDashing) {
            return this.textures.playerSlash;
        }
        if (!this.player.isGrounded || this.player.isGrappling) {
            return this.textures.playerAir;
        }
        if (running) {
            return Math.floor(time * 12) % 2 === 0
                ? this.textures.playerRunA
                : this.textures.playerRunB;
        }
        return this.textures.playerIdle;
    }

    private getBreachDirection(): Vec2 {
        const dir = vec2(0, 0);
        if (keyDown("KeyA") || actionDown("left")) dir.x -= 1;
        if (keyDown("KeyD") || actionDown("right")) dir.x += 1;
        if (keyDown("KeyW") || actionDown("up")) dir.y -= 0.42;
        if (keyDown("KeyS") || actionDown("down")) dir.y += 0.32;

        if (dir.length() < 0.01) {
            if (Math.abs(this.player.velocity.x) > 70) {
                dir.x = Math.sign(this.player.velocity.x);
            } else {
                dir.x = this.player.facing;
            }
        }

        if (dir.length() > 0.01) {
            dir.normalize();
        } else {
            dir.set(this.player.facing, 0);
        }
        return dir;
    }

    private drawInteractableSprite(
        id: keyof GameTextures["interactables"]["sprites"],
        pos: Vec2,
        size: Vec2,
    ) {
        const sprite: InteractableSprite = this.textures.interactables.sprites[id];
        drawSprite(this.textures.interactables.image, pos, size, {
            sourceX: sprite.x,
            sourceY: sprite.y,
            sourceWidth: sprite.w,
            sourceHeight: sprite.h,
        });
    }

    update(dt: number) {
        // Smooth FPS tracking
        const currentFrameFPS = 1 / Math.max(0.001, dt);
        this.currentFPS = lerp(this.currentFPS, currentFrameFPS, 5 * dt);

        // 1. Update star positions for parallax background
        for (const star of this.backgroundStars) {
            star.pos.x -= star.speed * dt;
            if (star.pos.x < 0) {
                star.pos.x = 1280;
                star.pos.y = rand(0, 520);
            }
        }

        // Ensure menu music plays if audio context was unlocked on user gesture
        const audioCtx = getAudioContext();
        if (audioCtx && audioCtx.state === "running") {
            if (
                this.gameState === "splash" ||
                this.gameState === "start" ||
                this.gameState === "gameover"
            ) {
                if (this.menuSequencer && !this.menuSequencer.playing) {
                    this.menuSequencer.play();
                }
            }
        }

        // 2. State Machine Update
        if (this.gameState === "splash") {
            this.splashTimer += dt;
            if (this.splashTimer >= 2.5) {
                this.gameState = "start";
            }

            if (mousePressed(0) || keyPressed("Enter") || keyPressed("Space")) {
                unlockAudio();
            }

            if (this.menuSequencer) {
                this.menuSequencer.update(dt);
            }
            if (this.splashTimer > 0.25 && rand(0, 1) < 0.18) {
                emitParticles({
                    pos: vec2(rand(450, 830), rand(294, 394)),
                    count: 1,
                    life: [0.6, 1.2],
                    speed: [10, 32],
                    angle: [-Math.PI * 0.55, -Math.PI * 0.45],
                    size: [1.5, 3],
                    sizeEnd: [0, 0.6],
                    color: ["#d8a24a", "#7dd3fc"],
                    damping: 0.96,
                    gravity: -12,
                });
            }

            updateParticles(dt);
            return;
        }

        if (this.gameState === "start") {
            if (
                mousePressed(0) ||
                keyPressed("Enter") ||
                keyPressed("Space") ||
                keyPressed("KeyA") ||
                keyPressed("KeyD") ||
                keyPressed("KeyW") ||
                keyPressed("KeyS")
            ) {
                unlockAudio();
            }

            // Keep menu sequencer running for ambient music
            if (this.menuSequencer) {
                this.menuSequencer.update(dt);
            }

            if (this.menuState === "main") {
                const mp = mousePos();
                const hoveredMainOption = hitTestMainMenu(mp.x, mp.y);
                if (
                    hoveredMainOption !== -1 &&
                    this.mainMenuOption !== hoveredMainOption
                ) {
                    this.mainMenuOption = hoveredMainOption;
                    playSound(
                        sfx.blip({ volume: 0.05, pitch: 1.0, decay: 0.05 }),
                    );
                }

                // Lerp hover transition factors
                this.startHoverTime = lerp(
                    this.startHoverTime,
                    this.mainMenuOption === 0 ? 1 : 0,
                    15 * dt,
                );
                this.optHoverTime = lerp(
                    this.optHoverTime,
                    this.mainMenuOption === 1 ? 1 : 0,
                    15 * dt,
                );

                // Navigation on main start menu
                if (keyPressed("KeyW") || keyPressed("ArrowUp")) {
                    this.mainMenuOption = 0; // START GAME
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }),
                    );
                }
                if (keyPressed("KeyS") || keyPressed("ArrowDown")) {
                    this.mainMenuOption = 1; // OPTIONS
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }),
                    );
                }

                // Selection
                if (keyPressed("Enter") || keyPressed("Space")) {
                    if (this.mainMenuOption === 0) {
                        // Start Game
                        playSound(
                            sfx.powerup({
                                volume: 0.1,
                                pitch: 1.5,
                                decay: 0.2,
                            }),
                        );
                        if (this.menuSequencer) {
                            this.menuSequencer.stop();
                        }
                        this.resetGame();
                        this.gameState = "playing";
                        if (this.gameSequencer) {
                            this.gameSequencer.play();
                        }
                    } else {
                        // Open Options
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 1.1, decay: 0.08 }),
                        );
                        this.menuState = "options";
                        this.optionsTab = "audio";
                        this.optionsRow = 0;
                    }
                }

                // Mouse click support for main menu options
                if (mousePressed(0)) {
                    const clickedMainOption = hitTestMainMenu(mp.x, mp.y);
                    if (clickedMainOption !== -1) {
                        if (clickedMainOption === 0) {
                            playSound(
                                sfx.powerup({
                                    volume: 0.1,
                                    pitch: 1.5,
                                    decay: 0.2,
                                }),
                            );
                            if (this.menuSequencer) {
                                this.menuSequencer.stop();
                            }
                            this.resetGame();
                            this.gameState = "playing";
                            if (this.gameSequencer) {
                                this.gameSequencer.play();
                            }
                        } else {
                            playSound(
                                sfx.blip({
                                    volume: 0.08,
                                    pitch: 1.1,
                                    decay: 0.08,
                                }),
                            );
                            this.menuState = "options";
                            this.optionsTab = "audio";
                            this.optionsRow = 0;
                        }
                    }
                }
            } else {
                // --- Inside Options Menu ---
                const mp = mousePos();
                const hoveredTab = hitTestOptionsTab(mp.x, mp.y);
                if (hoveredTab && this.optionsTab !== hoveredTab) {
                    this.optionsTab = hoveredTab;
                    this.optionsRow = 0;
                    playSound(sfx.blip({ volume: 0.05, pitch: 0.9 }));
                }

                const hoveredRow = hitTestOptionsRow(
                    mp.x,
                    mp.y,
                    this.optionsTab,
                );
                if (hoveredRow !== -1) {
                    this.optionsRow = hoveredRow;
                }

                // Option adjusting helper (keyboard)
                const changeVal = (dir: number) => {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 1.0, decay: 0.05 }),
                    );
                    if (this.optionsTab === "audio") {
                        if (this.optionsRow === 0) {
                            this.masterVolIndex = clamp(
                                this.masterVolIndex + dir,
                                0,
                                4,
                            );
                            setMasterVolume(
                                this.volLevels[this.masterVolIndex],
                            );
                        } else if (this.optionsRow === 1) {
                            this.musicVolIndex = clamp(
                                this.musicVolIndex + dir,
                                0,
                                4,
                            );
                            getAudioManager().setGroupVolume(
                                "music",
                                this.volLevels[this.musicVolIndex],
                            );
                        } else if (this.optionsRow === 2) {
                            this.sfxVolIndex = clamp(
                                this.sfxVolIndex + dir,
                                0,
                                4,
                            );
                            getAudioManager().setGroupVolume(
                                "sfx",
                                this.volLevels[this.sfxVolIndex],
                            );
                        }
                    } else if (this.optionsTab === "system") {
                        if (this.optionsRow === 0) {
                            this.showFPS = !this.showFPS;
                        }
                    }
                };

                // Exit back to Main Menu
                if (keyPressed("Escape") || keyPressed("Backspace")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.7, decay: 0.08 }),
                    );
                    this.menuState = "main";
                    return;
                }

                // Tab Navigation shortcuts (Q/E or Tab or 1/2/3)
                if (keyPressed("KeyQ") || keyPressed("Tab")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.9, decay: 0.05 }),
                    );
                    if (this.optionsTab === "audio") this.optionsTab = "system";
                    else if (this.optionsTab === "keybinds")
                        this.optionsTab = "audio";
                    else if (this.optionsTab === "system")
                        this.optionsTab = "keybinds";
                    this.optionsRow = 0;
                }
                if (keyPressed("KeyE")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.9, decay: 0.05 }),
                    );
                    if (this.optionsTab === "audio")
                        this.optionsTab = "keybinds";
                    else if (this.optionsTab === "keybinds")
                        this.optionsTab = "system";
                    else if (this.optionsTab === "system")
                        this.optionsTab = "audio";
                    this.optionsRow = 0;
                }
                if (keyPressed("Digit1")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.9, decay: 0.05 }),
                    );
                    this.optionsTab = "audio";
                    this.optionsRow = 0;
                }
                if (keyPressed("Digit2")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.9, decay: 0.05 }),
                    );
                    this.optionsTab = "keybinds";
                    this.optionsRow = 0;
                }
                if (keyPressed("Digit3")) {
                    playSound(
                        sfx.blip({ volume: 0.08, pitch: 0.9, decay: 0.05 }),
                    );
                    this.optionsTab = "system";
                    this.optionsRow = 0;
                }

                // Row navigation
                let maxRows = 0;
                if (this.optionsTab === "audio") maxRows = 3;
                else if (this.optionsTab === "keybinds") maxRows = 0;
                else if (this.optionsTab === "system") maxRows = 1;

                if (maxRows > 0) {
                    if (keyPressed("KeyW") || keyPressed("ArrowUp")) {
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }),
                        );
                        this.optionsRow =
                            (this.optionsRow - 1 + maxRows) % maxRows;
                    }
                    if (keyPressed("KeyS") || keyPressed("ArrowDown")) {
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }),
                        );
                        this.optionsRow = (this.optionsRow + 1) % maxRows;
                    }

                    if (keyPressed("KeyA") || keyPressed("ArrowLeft")) {
                        changeVal(-1);
                    }
                    if (
                        keyPressed("KeyD") ||
                        keyPressed("ArrowRight") ||
                        keyPressed("Enter") ||
                        keyPressed("Space")
                    ) {
                        changeVal(1);
                    }
                }

                // Mouse click support for options tabs & settings adjustments
                if (mousePressed(0)) {
                    if (hitTestOptionBack(mp.x, mp.y)) {
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 0.7, decay: 0.08 }),
                        );
                        this.menuState = "main";
                        return;
                    }

                    // Click-adjust volume sliders in audio tab
                    if (
                        this.optionsTab === "audio" &&
                        mp.x >= OPTION_BOUNDS.slider.x &&
                        mp.x <= OPTION_BOUNDS.slider.x + OPTION_BOUNDS.slider.w
                    ) {
                        const clickedIndex = sliderIndexFromX(mp.x);
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 1.0, decay: 0.05 }),
                        );

                        if (this.optionsRow === 0) {
                            this.masterVolIndex = clickedIndex;
                            setMasterVolume(
                                this.volLevels[this.masterVolIndex],
                            );
                        } else if (this.optionsRow === 1) {
                            this.musicVolIndex = clickedIndex;
                            getAudioManager().setGroupVolume(
                                "music",
                                this.volLevels[this.musicVolIndex],
                            );
                        } else if (this.optionsRow === 2) {
                            this.sfxVolIndex = clickedIndex;
                            getAudioManager().setGroupVolume(
                                "sfx",
                                this.volLevels[this.sfxVolIndex],
                            );
                        }
                    } else if (
                        this.optionsTab === "system" &&
                        mp.x >= OPTION_BOUNDS.fpsToggle.x &&
                        mp.x <=
                            OPTION_BOUNDS.fpsToggle.x +
                                OPTION_BOUNDS.fpsToggle.w &&
                        mp.y >= OPTION_BOUNDS.fpsToggle.y &&
                        mp.y <=
                            OPTION_BOUNDS.fpsToggle.y +
                                OPTION_BOUNDS.fpsToggle.h
                    ) {
                        // Toggle FPS
                        this.showFPS = !this.showFPS;
                        playSound(
                            sfx.blip({ volume: 0.08, pitch: 1.0, decay: 0.05 }),
                        );
                    }
                }
            }
            return;
        }

        if (this.gameState === "paused") {
            // Keep music sequencer running during pause
            if (this.gameSequencer) {
                this.gameSequencer.update(dt);
            }

            const mp = mousePos();
            const hoveredPauseOption = hitTestPause(mp.x, mp.y);
            if (
                hoveredPauseOption !== -1 &&
                this.menuOption !== hoveredPauseOption
            ) {
                this.menuOption = hoveredPauseOption;
                playSound(sfx.blip({ volume: 0.05, pitch: 1.0, decay: 0.05 }));
            }

            // Menu navigation
            if (keyPressed("KeyW") || keyPressed("ArrowUp")) {
                this.menuOption = 0; // Resume
                playSound(sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }));
            }
            if (keyPressed("KeyS") || keyPressed("ArrowDown")) {
                this.menuOption = 1; // Quit
                playSound(sfx.blip({ volume: 0.08, pitch: 0.8, decay: 0.05 }));
            }

            // Toggle Pause with Escape or P
            if (keyPressed("Escape") || keyPressed("KeyP")) {
                this.gameState = "playing";
                playSound(sfx.blip({ volume: 0.06, pitch: 1.2, decay: 0.1 }));
                return;
            }

            // Confirm menu choice (keyboard or mouse click)
            if (keyPressed("Enter") || keyPressed("Space") || mousePressed(0)) {
                let triggered = false;
                let choice = this.menuOption;
                if (mousePressed(0)) {
                    const clickedPauseOption = hitTestPause(mp.x, mp.y);
                    if (clickedPauseOption !== -1) {
                        choice = clickedPauseOption;
                        triggered = true;
                    }
                } else {
                    triggered = true;
                }

                if (triggered) {
                    if (choice === 0) {
                        this.gameState = "playing";
                        playSound(
                            sfx.blip({ volume: 0.06, pitch: 1.2, decay: 0.1 }),
                        );
                    } else {
                        this.gameState = "start";
                        playSound(
                            sfx.blip({ volume: 0.06, pitch: 0.7, decay: 0.1 }),
                        );
                        if (this.gameSequencer) {
                            this.gameSequencer.stop();
                        }
                        if (this.menuSequencer) {
                            this.menuSequencer.play();
                        }
                    }
                }
            }
            return;
        }

        if (this.player.dead && this.gameState !== "gameover") {
            this.gameState = "gameover";
            this.gameOverTimer = 0;
        }

        if (this.gameState === "gameover") {
            this.gameOverTimer += dt;
            if (keyPressed("Space") || mousePressed(0) || keyPressed("Enter")) {
                playSound(sfx.powerup({ volume: 0.1, pitch: 1.5, decay: 0.2 }));
                if (this.menuSequencer) {
                    this.menuSequencer.stop();
                }
                this.resetGame();
                this.gameState = "playing";
                if (this.gameSequencer) {
                    this.gameSequencer.play();
                }
            }
            this.camera.update(dt);
            updateParticles(dt);

            if (this.menuSequencer) {
                this.menuSequencer.update(dt);
            }
            return;
        }

        // --- Active Gameplay Update Loop ---
        if (this.gameSequencer) {
            this.gameSequencer.update(dt);
        }

        // Toggle Pause
        if (keyPressed("Escape") || keyPressed("KeyP")) {
            this.gameState = "paused";
            this.menuOption = 0;
            playSound(sfx.hit({ volume: 0.06, pitch: 0.5, decay: 0.15 }));
            return;
        }

        const pCenter = this.getPlayerCenter();

        // Find closest grapple anchor inside screen
        this.targetedAnchor = null;
        let closestDist = this.grappleRange;
        for (const a of this.anchors) {
            const d = pCenter.distanceTo(a.pos);
            if (d < closestDist && a.pos.x > pCenter.x - 100) {
                // Prioritize forward anchors
                closestDist = d;
                this.targetedAnchor = a;
            }
        }

        // Hold mouse to maintain grapple; release preserves momentum.
        if (
            mouseDown(0) &&
            !this.player.isGrappling &&
            this.targetedAnchor &&
            this.player.slashRecovery <= 0
        ) {
            this.attachGrapple(this.targetedAnchor, pCenter);
        }
        if (
            this.player.isGrappling &&
            (!mouseDown(0) || mouseReleased(0))
        ) {
            this.releaseGrapple();
            playSound(sfx.blip({ volume: 0.07, pitch: 0.85 }));
        }

        // Breach slash: high-commit burst. Hit something to reset; miss and recover.
        if (
            actionPressed("dash") ||
            keyPressed("Space") ||
            mousePressed(2)
        ) {
            if (
                this.player.dashCooldown <= 0 &&
                this.player.slashRecovery <= 0
            ) {
                this.player.isDashing = true;
                this.player.dashTimer = BREACH_DURATION;
                this.player.dashCooldown = BREACH_MISS_COOLDOWN;
                this.player.slashRecovery = 0;
                this.player.slashHit = false;

                // Disconnect rope
                this.releaseGrapple();

                const dashDir = this.getBreachDirection();

                // Apply committed breach velocity with a horizontal bias.
                this.player.velocity.copy(dashDir.clone().scale(BREACH_SPEED));

                // Play synth laser/slash SFX
                playSound(
                    sfx.laser({
                        wave: "sawtooth",
                        frequency: 600,
                        frequencySlide: 300,
                        decay: 0.12,
                        volume: 0.12,
                    }),
                );
                this.camera.shake(6);

                // Sword slash particle arc
                emitParticles({
                    pos: pCenter.clone(),
                    count: 20,
                    life: [0.18, 0.35],
                    speed: [150, 400],
                    angle: [dashDir.angle() - 0.6, dashDir.angle() + 0.6],
                    size: [2, 6],
                    sizeEnd: [1, 2],
                    color: [WORLD_COLORS.red, WORLD_COLORS.amber],
                    damping: 0.94,
                });
            }
        }

        // Update cooldown timers
        if (this.player.dashCooldown > 0) this.player.dashCooldown -= dt;
        if (this.player.slashRecovery > 0) this.player.slashRecovery -= dt;
        if (this.player.isDashing) {
            this.player.dashTimer -= dt;
            if (this.player.dashTimer <= 0) {
                this.player.isDashing = false;
                if (this.player.slashHit) {
                    this.player.dashCooldown = BREACH_HIT_COOLDOWN;
                    this.player.velocity.scale(0.78);
                } else {
                    this.player.slashRecovery = BREACH_RECOVERY;
                    this.player.velocity.scale(0.46);
                }
            }
        }

        // Physics and movement integration
        if (this.player.isDashing) {
            this.player.velocity.x *= Math.pow(0.985, dt * 60);
            this.player.velocity.y *= Math.pow(0.975, dt * 60);
        } else if (this.player.isGrappling && this.grappleAnchor) {
            this.player.velocity.y += GRAPPLE_GRAVITY * dt;

            const outward = pCenter.clone().subtract(this.grappleAnchor);
            const dist = outward.length();
            if (dist > 0.001) {
                const radial = outward.scale(1 / dist);
                const tangent = vec2(radial.y, -radial.x);

                let thrust = 0;
                if (keyDown("KeyA") || actionDown("left")) thrust -= 1;
                if (keyDown("KeyD") || actionDown("right")) thrust += 1;
                if (thrust !== 0) {
                    this.player.velocity.add(
                        tangent.scale(
                            thrust * GRAPPLE_TANGENT_THRUST * dt,
                        ),
                    );
                }

                if (keyDown("KeyW") || actionDown("up")) {
                    this.grappleRopeLength = Math.max(
                        GRAPPLE_MIN_LENGTH,
                        this.grappleRopeLength - GRAPPLE_REEL_SPEED * dt,
                    );
                }
                if (keyDown("KeyS") || actionDown("down")) {
                    this.grappleRopeLength = Math.min(
                        this.grappleRange,
                        this.grappleRopeLength + GRAPPLE_REEL_SPEED * dt,
                    );
                }

                const outwardSpeed = this.player.velocity.dot(radial);
                if (dist >= this.grappleRopeLength && outwardSpeed > 0) {
                    this.player.velocity.subtract(
                        radial.clone().scale(outwardSpeed),
                    );
                }
            }

            this.player.velocity.x *= Math.pow(0.992, dt * 60);
            this.player.velocity.y *= Math.pow(0.996, dt * 60);
        } else {
            // Normal physics: apply gravity
            this.player.velocity.y += 620 * dt;

            // Ground jump input
            if (
                this.player.isGrounded &&
                (keyPressed("KeyW") ||
                    actionPressed("up") ||
                    keyPressed("ArrowUp"))
            ) {
                this.player.velocity.y = -350;
                this.player.isGrounded = false;
                playSound(sfx.jump({ volume: 0.1 }));
                emitParticles({
                    pos: pCenter.clone(),
                    count: 10,
                    life: [0.15, 0.35],
                    speed: [40, 120],
                    size: [2, 4],
                    color: [WORLD_COLORS.blue, WORLD_COLORS.text],
                    damping: 0.92,
                });
            }

            // Left/Right ground & air controls (snappy on ground)
            const recoveryScale = this.player.slashRecovery > 0 ? 0.25 : 1;
            const lerpSpeed = (this.player.isGrounded ? 22 : 10) * recoveryScale;
            const targetSpeed = 280;
            if (keyDown("KeyA") || actionDown("left")) {
                this.player.velocity.x = lerp(
                    this.player.velocity.x,
                    -targetSpeed,
                    lerpSpeed * dt,
                );
            } else if (keyDown("KeyD") || actionDown("right")) {
                this.player.velocity.x = lerp(
                    this.player.velocity.x,
                    targetSpeed,
                    lerpSpeed * dt,
                );
            } else if (this.player.isGrounded) {
                // Floor friction: smooth stop
                this.player.velocity.x = lerp(
                    this.player.velocity.x,
                    0,
                    18 * dt,
                );
            } else {
                // Air resistance
                this.player.velocity.x *= Math.pow(0.85, dt * 60);
            }
        }

        // Cap horizontal velocity
        this.player.velocity.x = clamp(this.player.velocity.x, -950, 950);
        this.player.velocity.y = clamp(this.player.velocity.y, -700, 700);

        // Resolve AABB collisions with buildings
        const colliders: ColliderEntry[] = this.buildings.map((b) => ({
            aabb: b.aabb,
            restitution: 0.0,
            friction: 0.1,
        }));

        const moveRes = moveAABB(
            aabb(this.player.pos, this.player.size),
            this.player.velocity,
            colliders,
            dt,
        );

        this.player.pos.copy(moveRes.pos);
        this.player.velocity.copy(moveRes.velocity);
        this.player.isGrounded = moveRes.touching.bottom;
        if (this.player.isGrounded) {
            this.player.canWallJump = true;
            this.player.wallJumpResetSide = 0;
        }

        // Wall slide & jump logic
        const isWallSliding =
            (moveRes.touching.left || moveRes.touching.right) &&
            !this.player.isGrounded &&
            this.player.velocity.y > 0;
        if (isWallSliding) {
            const wallSide = moveRes.touching.left ? -1 : 1;
            if (wallSide !== this.player.wallJumpResetSide) {
                this.player.canWallJump = true;
            }

            // Reduce fall speed
            this.player.velocity.y = Math.min(this.player.velocity.y, 90);

            // Wall jump input
            if (
                this.player.canWallJump &&
                (keyPressed("KeyW") ||
                    actionPressed("up") ||
                    keyPressed("ArrowUp"))
            ) {
                this.player.velocity.y = -360;
                this.player.velocity.x = moveRes.touching.left ? 280 : -280;
                this.player.canWallJump = false;
                this.player.wallJumpResetSide = wallSide;
                playSound(sfx.jump({ volume: 0.1 }));
                emitParticles({
                    pos: pCenter.clone(),
                    count: 8,
                    life: [0.15, 0.3],
                    speed: [50, 150],
                    size: [2, 4],
                    color: [WORLD_COLORS.blue, WORLD_COLORS.bg],
                    damping: 0.9,
                });
            }
        }

        this.resolveGrappleConstraint();
        this.updatePlayerVisualState(dt);

        // Update Trail Effect
        this.player.trail.push({
            pos: this.player.pos.clone(),
            angle: this.player.visualLean,
            run:
                this.player.isGrounded && Math.abs(this.player.velocity.x) > 20,
            facing: this.player.facing,
        });
        if (this.player.trail.length > 12) {
            this.player.trail.shift();
        }

        const currentCenter = this.getPlayerCenter();

        // Combat Slash & Drone collision checking
        if (this.player.isDashing) {
            const slashRadius = 60;
            for (const d of this.drones) {
                if (d.dead) continue;
                const dCenter = vec2(d.pos.x + 16, d.pos.y + 16);
                if (currentCenter.distanceTo(dCenter) < slashRadius) {
                    // Drone Slashed!
                    d.dead = true;
                    this.player.slashHit = true;
                    this.player.dashCooldown = BREACH_HIT_COOLDOWN;
                    this.player.slashRecovery = 0;
                    this.player.velocity.scale(1.08);
                    this.player.score += 200 * this.player.comboMultiplier;
                    this.increaseCombo();

                    // Particle explosion
                    emitParticles({
                        pos: dCenter,
                        count: 24,
                        speed: [100, 320],
                        color: [WORLD_COLORS.red, WORLD_COLORS.amber],
                    });

                    playSound(sfx.explosion({ volume: 0.16, decay: 0.35 }));
                    this.camera.shake(12);

                    // Pop score text
                    this.floatingTexts.push({
                        text: `+200 x${this.player.comboMultiplier}`,
                        pos: vec2(dCenter.x, dCenter.y - 20),
                        color: WORLD_COLORS.red,
                        life: 0.9,
                        vy: -40,
                    });
                }
            }

            // Slice through Lasers emitters
            for (const l of this.lasers) {
                if (l.disabled) continue;
                const em2Center = vec2(l.emitter2.x + 16, l.emitter2.y + 16);
                if (currentCenter.distanceTo(em2Center) < slashRadius) {
                    // Laser disabled!
                    l.disabled = true;
                    l.active = false;
                    this.player.slashHit = true;
                    this.player.dashCooldown = BREACH_HIT_COOLDOWN;
                    this.player.slashRecovery = 0;
                    this.player.velocity.scale(1.04);
                    this.player.score += 150 * this.player.comboMultiplier;

                    emitParticles({
                        pos: em2Center,
                        count: 12,
                        color: [WORLD_COLORS.red, WORLD_COLORS.text],
                        speed: [50, 150],
                    });

                    playSound(
                        sfx.explosion({
                            wave: "square",
                            frequency: 180,
                            decay: 0.15,
                            volume: 0.1,
                        }),
                    );
                    this.camera.shake(6);

                    this.floatingTexts.push({
                        text: "LASER OFFLINE",
                        pos: vec2(em2Center.x, em2Center.y - 20),
                        color: WORLD_COLORS.blue,
                        life: 0.8,
                        vy: -35,
                    });
                }
            }
        }

        // Update drones and AI actions
        for (const d of this.drones) {
            if (d.dead) continue;

            // Patrol horizontal
            d.pos.x += d.dir * 45 * dt;
            if (d.pos.x > d.startPos.x + d.patrolRange) {
                d.dir = -1;
            } else if (d.pos.x < d.startPos.x) {
                d.dir = 1;
            }

            // Combat AI shooting
            d.shootCooldown -= dt;
            if (
                d.shootCooldown <= 0 &&
                currentCenter.distanceTo(d.pos) < 360 &&
                d.pos.x > currentCenter.x
            ) {
                d.shootCooldown = 2.2;
                // Shoot at player
                const dCenter = vec2(d.pos.x + 16, d.pos.y + 16);
                const bulletDir = currentCenter
                    .clone()
                    .subtract(dCenter)
                    .normalize();
                this.bullets.push({
                    pos: dCenter,
                    vel: bulletDir.scale(230),
                    life: 3.5,
                });
                // Play synth shoot SFX
                playSound({
                    wave: "sawtooth",
                    frequency: 400,
                    frequencySlide: -200,
                    attack: 0.002,
                    decay: 0.06,
                    volume: 0.05,
                });
            }
        }

        // Update Laser cycles
        for (const l of this.lasers) {
            if (l.disabled) continue;
            l.timer += dt;
            if (l.active && l.timer >= 2.0) {
                l.active = false;
                l.timer = 0;
            } else if (!l.active && l.timer >= 1.5) {
                l.active = true;
                l.timer = 0;
            }

            // Check collision if active
            if (l.active) {
                const lx = l.emitter1.x;
                const lyMin = Math.min(l.emitter1.y, l.emitter2.y);
                const lyMax = Math.max(l.emitter1.y, l.emitter2.y);

                if (
                    Math.abs(currentCenter.x - lx) <
                        this.player.size.x / 2 + 3 &&
                    currentCenter.y >= lyMin &&
                    currentCenter.y <= lyMax &&
                    !this.player.isDashing
                ) {
                    this.damagePlayer();
                }
            }
        }

        // Update bullets and check player collision
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.pos.add(b.vel.clone().scale(dt));
            b.life -= dt;

            if (b.life <= 0) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Check player collision
            if (
                currentCenter.distanceTo(b.pos) < 14 &&
                !this.player.isDashing
            ) {
                this.bullets.splice(i, 1);
                this.damagePlayer();
            }
        }

        // Collect Data Cores
        for (const c of this.cores) {
            if (!c.active) continue;
            const cCenter = vec2(c.pos.x + 16, c.pos.y + 16);
            if (currentCenter.distanceTo(cCenter) < 24) {
                c.active = false;
                if (this.player.isDashing) {
                    this.player.slashHit = true;
                    this.player.dashCooldown = BREACH_HIT_COOLDOWN;
                    this.player.slashRecovery = 0;
                    this.player.velocity.scale(1.03);
                }
                this.player.score += 50 * this.player.comboMultiplier;
                this.increaseCombo();

                // Sound and particles
                playSound(sfx.powerup({ volume: 0.1, pitch: 1.2 }));
                emitParticles({
                    pos: cCenter,
                    count: 10,
                    life: [0.2, 0.45],
                    speed: [40, 120],
                    size: [2, 5],
                    color: [WORLD_COLORS.blue, WORLD_COLORS.text],
                    damping: 0.93,
                });

                this.floatingTexts.push({
                    text: `+50 x${this.player.comboMultiplier}`,
                    pos: vec2(cCenter.x, cCenter.y - 15),
                    color: WORLD_COLORS.blue,
                    life: 0.7,
                    vy: -30,
                });
            }
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.life -= dt;
            ft.pos.y += ft.vy * dt;
            if (ft.life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update combo timers
        if (this.player.combo > 0) {
            this.player.comboTimer -= dt;
            if (this.player.comboTimer <= 0) {
                this.player.combo = 0;
                this.player.comboMultiplier = 1;
            }
        }

        // Infinite scroller level gen check
        if (this.player.pos.x + 800 > this.lastGeneratedX) {
            this.generateNextBuilding();
        }

        // Cull out-of-screen objects to save performance
        const cullLimit = this.camera.pos.x - 700;
        this.buildings = this.buildings.filter(
            (b) => b.aabb.pos.x + b.aabb.size.x > cullLimit,
        );
        this.anchors = this.anchors.filter((a) => a.pos.x > cullLimit);
        this.cores = this.cores.filter((c) => c.pos.x > cullLimit);
        this.drones = this.drones.filter((d) => d.pos.x + 32 > cullLimit);
        this.lasers = this.lasers.filter((l) => l.emitter1.x > cullLimit);

        // Player fell down off screen bottom
        if (this.player.pos.y > DEATH_Y) {
            this.killPlayer();
        }

        // Camera scroll and follow logic
        const targetCamX =
            this.player.pos.x + 200 + this.player.velocity.x * 0.25;
        const targetCamY = clamp(this.player.pos.y - 30, 200, 620);
        this.camera.pos.x = lerp(this.camera.pos.x, targetCamX, 6 * dt);
        this.camera.pos.y = lerp(this.camera.pos.y, targetCamY, 4 * dt);

        // Zoom out as velocity rises
        const speedRatio = this.player.velocity.length() / 850;
        const targetZoom = clamp(1.0 - speedRatio * 0.15, 0.85, 1.0);
        this.camera.zoom = lerp(this.camera.zoom, targetZoom, 2 * dt);

        this.camera.update(dt);
        updateParticles(dt);
    }

    private increaseCombo() {
        this.player.combo++;
        this.player.comboTimer = 3.5; // Combo resets in 3.5 seconds
        this.player.comboMultiplier = Math.min(
            8,
            1 + Math.floor(this.player.combo / 4),
        );
    }

    private damagePlayer() {
        this.player.health--;
        playSound(sfx.hit({ volume: 0.18 }));
        this.camera.shake(15);

        // Blood-like sparks
        emitParticles({
            pos: vec2(
                this.player.pos.x + this.player.size.x / 2,
                this.player.pos.y + this.player.size.y / 2,
            ),
            count: 14,
            life: [0.2, 0.5],
            speed: [80, 220],
            size: [3, 6],
            color: [WORLD_COLORS.red, "#3a0d0a"],
            damping: 0.94,
        });

        if (this.player.health <= 0) {
            this.killPlayer();
        } else {
            // Small velocity knockback
            this.player.velocity.set(-180, -220);
        }
    }

    private killPlayer() {
        if (this.player.dead) return;
        this.player.dead = true;
        this.player.velocity.set(0, 0);
        if (this.player.isGrappling) {
            this.releaseGrapple();
        }

        playSound(
            sfx.death({
                wave: "noise",
                frequency: 100,
                frequencySlide: -50,
                decay: 0.6,
                volume: 0.25,
            }),
        );
        this.camera.shake(28);

        // Dynamic explosion particles
        emitParticles({
            pos: vec2(
                this.player.pos.x + this.player.size.x / 2,
                this.player.pos.y + this.player.size.y / 2,
            ),
            count: 40,
            color: [WORLD_COLORS.red, WORLD_COLORS.amber],
            speed: [100, 380],
        });

        if (this.gameSequencer) {
            this.gameSequencer.stop();
        }
        if (this.menuSequencer) {
            this.menuSequencer.play();
        }
    }

    render() {
        // 1. Draw solid background styling (matte deep graphite slate)
        clear(WORLD_COLORS.bg);
        if (this.gameState === "splash") {
            renderSplashScreen(this.splashTimer);
            return;
        }

        if (this.gameState === "start") {
            renderWorldBackground(
                vec2(920 + Math.sin(time * 0.08) * 36, 360),
                this.backgroundStars,
                this.textures.worldAtlas,
            );
            renderMenuCityForeground(this.textures.worldAtlas);
            if (this.menuState === "main") {
                renderMainMenu({
                    selected: this.mainMenuOption,
                    startHover: this.startHoverTime,
                    optionsHover: this.optHoverTime,
                }, true);
            } else {
                renderOptionsScreen({
                    tab: this.optionsTab,
                    row: this.optionsRow,
                    masterVolIndex: this.masterVolIndex,
                    musicVolIndex: this.musicVolIndex,
                    sfxVolIndex: this.sfxVolIndex,
                    volLabels: this.volLabels,
                    showFPS: this.showFPS,
                });
            }
            return;
        }

        // 3. Game/Playing & Paused States Rendering
        renderWorldBackground(
            this.camera.pos,
            this.backgroundStars,
            this.textures.worldAtlas,
        );

        // Apply Camera transforms
        this.camera.apply();

        // Draw taut grapple cable.
        if (this.player.isGrappling && this.grappleAnchor) {
            const playerCenter = this.getPlayerCenter();
            drawLine(
                this.grappleAnchor,
                playerCenter,
                "rgba(0, 0, 0, 0.42)",
                5,
            );
            drawLine(
                this.grappleAnchor,
                playerCenter,
                WORLD_COLORS.cable,
                2,
            );
            drawLine(
                this.grappleAnchor,
                playerCenter,
                WORLD_COLORS.cableCore,
                1,
            );

            const cable = playerCenter.clone().subtract(this.grappleAnchor);
            const cableLength = cable.length();
            if (cableLength > 0.001) {
                const dir = cable.scale(1 / cableLength);
                const normal = vec2(-dir.y, dir.x);
                const tickCount = Math.floor(cableLength / 28);
                for (let i = 1; i < tickCount; i++) {
                    const p = this.grappleAnchor
                        .clone()
                        .add(dir.clone().scale(i * 28));
                    drawLine(
                        p.clone().add(normal.clone().scale(-2)),
                        p.clone().add(normal.clone().scale(2)),
                        "rgba(185, 130, 56, 0.42)",
                        1,
                    );
                }
            }
        }

        // Draw active buildings
        for (const b of this.buildings) {
            renderBuilding(b, this.textures.worldAtlas, this.camera.pos);
        }

        // Draw game objects: anchors, cores, lasers, bullets, drones
        for (const a of this.anchors) {
            const hot = a === this.targetedAnchor;
            this.drawInteractableSprite(
                hot ? "grappleSocketHot" : "grappleSocket",
                vec2(a.pos.x - 15, a.pos.y - 15),
                vec2(30, 30),
            );
            const scan = 0.35 + 0.35 * Math.sin(time * 4 + a.pulseTimer);
            drawLine(
                vec2(a.pos.x - 10, a.pos.y - 18),
                vec2(a.pos.x + 10, a.pos.y - 18),
                hot ? "#9fd7ec" : `rgba(77, 143, 176, ${scan})`,
                1,
            );
        }

        if (this.targetedAnchor) {
            const p = this.targetedAnchor.pos;
            drawLine(
                vec2(p.x - 19, p.y - 19),
                vec2(p.x - 10, p.y - 19),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x - 19, p.y - 19),
                vec2(p.x - 19, p.y - 10),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x + 19, p.y - 19),
                vec2(p.x + 10, p.y - 19),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x + 19, p.y - 19),
                vec2(p.x + 19, p.y - 10),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x - 19, p.y + 19),
                vec2(p.x - 10, p.y + 19),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x - 19, p.y + 19),
                vec2(p.x - 19, p.y + 10),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x + 19, p.y + 19),
                vec2(p.x + 10, p.y + 19),
                WORLD_COLORS.target,
                2,
            );
            drawLine(
                vec2(p.x + 19, p.y + 19),
                vec2(p.x + 19, p.y + 10),
                WORLD_COLORS.target,
                2,
            );
        }

        for (const c of this.cores) {
            if (c.active) {
                const bounceOffset = 4 * Math.sin(time * 6 + c.pos.x);
                const pulse = 0.5 + 0.5 * Math.sin(time * 5 + c.pos.x);
                drawRect(
                    vec2(c.pos.x - 3, c.pos.y + bounceOffset - 3),
                    vec2(26, 26),
                    pulse > 0.5 ? "#132530" : "#0a151d",
                );
                this.drawInteractableSprite(
                    "dataShardHot",
                    vec2(c.pos.x - 2, c.pos.y + bounceOffset - 2),
                    vec2(24, 24),
                );
            }
        }

        for (const l of this.lasers) {
            if (l.disabled) continue;
            drawSprite(
                this.textures.laserEmitter,
                vec2(l.emitter2.x - 16, l.emitter2.y - 16),
                vec2(32, 32),
            );
            if (l.active) {
                drawLine(l.emitter1, l.emitter2, "rgba(158, 63, 53, 0.34)", 8);
                drawLine(l.emitter1, l.emitter2, WORLD_COLORS.red, 2);
            } else {
                drawLine(l.emitter1, l.emitter2, "rgba(158, 63, 53, 0.08)", 1);
            }
        }

        for (const d of this.drones) {
            if (!d.dead) {
                drawSprite(this.textures.drone, d.pos, vec2(32, 32));
            }
        }

        for (const b of this.bullets) {
            drawCircle(b.pos, 4, WORLD_COLORS.red);
            drawCircle(b.pos, 2, WORLD_COLORS.amber);
        }

        // Player sprite & trail
        if (!this.player.dead) {
            if (this.player.isDashing) {
                const count = this.player.trail.length;
                const start = Math.max(0, count - 5);
                for (let i = start; i < count; i++) {
                    const t = this.player.trail[i];
                    const alphaRatio = ((i - start + 1) / (count - start + 1)) * 0.18;
                    const trailPos = vec2(
                        t.pos.x + (this.player.size.x - PLAYER_RENDER_SIZE.x) / 2,
                        t.pos.y +
                            this.player.size.y -
                            PLAYER_RENDER_SIZE.y +
                            PLAYER_VISUAL_Y_OFFSET,
                    );
                    drawSprite(this.textures.playerSlash, trailPos, PLAYER_RENDER_SIZE, {
                        angle: t.angle,
                        flipX: t.facing < 0,
                        flipY: true,
                        color: `rgba(185, 130, 56, ${alphaRatio})`,
                    });
                }
            }

            const speed = this.player.velocity.length();
            const stretch = clamp(1 + (speed / 900) * 0.25, 1, 1.25);
            const squash = clamp(1 - (speed / 900) * 0.15, 0.75, 1);
            const drawSize = vec2(
                PLAYER_RENDER_SIZE.x * squash,
                PLAYER_RENDER_SIZE.y * stretch,
            );
            const drawOffset = vec2(
                this.player.pos.x + (this.player.size.x - drawSize.x) / 2,
                this.player.pos.y +
                    this.player.size.y -
                    drawSize.y +
                    PLAYER_VISUAL_Y_OFFSET,
            );
            const angle = this.player.visualLean;
            const running =
                this.player.isGrounded && Math.abs(this.player.velocity.x) > 20;

            const playerSprite = this.getPlayerSprite(running);
            const rimOffsets = [
                vec2(-1, 0),
                vec2(1, 0),
                vec2(0, -1),
            ];
            for (const rim of rimOffsets) {
                drawSprite(
                    playerSprite,
                    drawOffset.clone().add(rim),
                    drawSize,
                    {
                        angle,
                        flipX: this.player.facing < 0,
                        flipY: true,
                        color: "rgba(237, 244, 246, 0.26)",
                    },
                );
            }
            drawSprite(playerSprite, drawOffset, drawSize, {
                angle,
                flipX: this.player.facing < 0,
                flipY: true,
            });
        }

        // Floating text objects
        for (const ft of this.floatingTexts) {
            drawText(ft.text, ft.pos, {
                color: ft.color,
                font: "bold 11px TinyTS",
                align: "center",
            });
        }

        renderParticles();

        // Restore Camera
        this.camera.end();

        // Draw HUD
        this.renderHUD();
        if (this.gameState === "paused") {
            renderPauseOverlay({ selected: this.menuOption });
        }
    }

    private renderHUD() {
        if (this.gameState === "splash" || this.gameState === "start") return;

        if (this.gameState === "gameover") {
            this.renderGameOverOverlay();
            return;
        }

        // HUD: LEFT ALIGNED LAYOUT
        // Score
        drawText(
            `SCORE: ${this.player.score.toString().padStart(6, "0")}`,
            vec2(30, 26),
            {
                color: WORLD_COLORS.text,
                font: "bold 16px TinyTS",
            },
        );

        // Combo
        if (this.player.combo > 0) {
            drawText(`COMBO: X${this.player.comboMultiplier}`, vec2(30, 50), {
                color: WORLD_COLORS.blue,
                font: "bold 14px TinyTS",
            });
            const timerWidth = 80 * (this.player.comboTimer / 3.5);
            drawRect(vec2(30, 64), vec2(80, 2), "rgba(77, 90, 105, 0.18)");
            drawRect(vec2(30, 64), vec2(timerWidth, 2), WORLD_COLORS.blue);
        }

        // Health (Battery UI)
        drawText("SHIELD", vec2(1180, 22), {
            color: WORLD_COLORS.muted,
            font: "10px TinyTS",
        });
        for (let i = 0; i < 3; i++) {
            const hasHealth = i < this.player.health;
            drawRect(
                vec2(1180 + i * 22, 32),
                vec2(18, 10),
                hasHealth ? WORLD_COLORS.blue : "rgba(77, 90, 105, 0.12)",
            );
            drawRectOutline(
                vec2(1180 + i * 22, 32),
                vec2(18, 10),
                hasHealth ? WORLD_COLORS.blue : WORLD_COLORS.faint,
                1,
            );
        }

        // Top center FPS counter
        if (this.showFPS) {
            drawText(`FPS: ${Math.round(this.currentFPS)}`, vec2(640, 22), {
                color: WORLD_COLORS.muted,
                font: "14px TinyTS",
                align: "center",
            });
        }

    }

    private renderGameOverOverlay() {
        const blackout = clamp(this.gameOverTimer / 0.7, 0, 1);
        drawRect(
            vec2(0, 0),
            vec2(1280, 720),
            `rgba(2, 3, 5, ${0.72 + blackout * 0.28})`,
        );
        if (blackout >= 1) {
            drawRect(vec2(0, 0), vec2(1280, 720), "#020305");
        }

        const boxX = 92;
        const boxY = 408;
        const boxW = 430;

        drawText("RUN STATUS", vec2(boxX + 34, boxY + 30), {
            color: WORLD_COLORS.muted,
            font: "10px TinyTS",
            align: "left",
        });
        drawText("TERMINATED", vec2(boxX + 34, boxY + 70), {
            color: WORLD_COLORS.red,
            font: "bold 24px TinyTS",
            align: "left",
            baseline: "middle",
        });
        drawRectOutline(
            vec2(boxX + 34, boxY + 104),
            vec2(boxW - 68, 40),
            WORLD_COLORS.faint,
            2,
        );
        drawText(`FINAL SCORE`, vec2(boxX + 50, boxY + 126), {
            color: WORLD_COLORS.muted,
            font: "10px TinyTS",
            align: "left",
            baseline: "middle",
        });
        drawText(
            this.player.score.toString().padStart(6, "0"),
            vec2(boxX + boxW - 50, boxY + 128),
            {
                color: WORLD_COLORS.text,
                font: "bold 18px TinyTS",
                align: "right",
                baseline: "middle",
            },
        );

        const pulseText = 0.45 + 0.45 * Math.sin(time * 5);
        drawText("[SPACE/CLICK/ENTER]", vec2(boxX + 34, boxY + 178), {
            color: `rgba(77, 143, 176, ${0.28 + pulseText * 0.5})`,
            font: "bold 11px TinyTS",
            align: "left",
            baseline: "middle",
        });
        drawText("RESTART RUN", vec2(boxX + boxW - 34, boxY + 178), {
            color: WORLD_COLORS.amber,
            font: "bold 11px TinyTS",
            align: "right",
            baseline: "middle",
        });
    }
}
