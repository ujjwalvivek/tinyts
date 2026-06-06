import type { AABB, Vec2 } from "@ujjwalvivek/tinyts";

export interface Building {
    aabb: AABB;
    color: string;
    borderColor: string;
}

export interface GrappleAnchor {
    pos: Vec2;
    pulseTimer: number;
}

export interface DataCore {
    pos: Vec2;
    active: boolean;
}

export interface CyberDrone {
    pos: Vec2;
    startPos: Vec2;
    patrolRange: number;
    dir: number;
    shootCooldown: number;
    dead: boolean;
}

export interface LaserBarrier {
    emitter1: Vec2;
    emitter2: Vec2;
    active: boolean;
    timer: number;
    disabled: boolean;
}

export interface Bullet {
    pos: Vec2;
    vel: Vec2;
    life: number;
}

export interface FloatingText {
    text: string;
    pos: Vec2;
    color: string;
    life: number;
    vy: number;
}
