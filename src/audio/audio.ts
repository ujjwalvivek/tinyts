import { activeEngine } from "../core/engine";
import { Vec2, clamp } from "../core/math";

// ═════════════════════════════════════════════════════════════════════════════
// Types
// ═════════════════════════════════════════════════════════════════════════════

/** Supported oscillator waveform types for synthesis. */
export type WaveType = "sine" | "square" | "triangle" | "sawtooth" | "noise";

/** Configuration options for synthesized sounds. */
export interface SynthOptions {
    /** Waveform type (default "square"). */
    wave?: WaveType;
    /** Base frequency in Hz (default 440). */
    frequency?: number;
    /** Frequency slide adjustment in Hz (default 0). */
    frequencySlide?: number;
    /** Time in seconds to reach peak volume (default 0.01). */
    attack?: number;
    /** Time in seconds to drop from peak to sustain level (default 0.1). */
    decay?: number;
    /** Volume level during sustain phase, 0-1 (default 0). Also used as hold time for backward compatibility. */
    sustain?: number;
    /** Time in seconds to hold at sustain level before release (default 0). */
    hold?: number;
    /** Time in seconds to fade from sustain to 0 (default 0.1). */
    release?: number;
    /** Volume level, 0-1 (default 0.3). */
    volume?: number;
    /** Stereo pan, -1 left to 1 right (default 0). */
    pan?: number;
    /** Pitch scaling factor (default 1). */
    pitch?: number;
    /** Audio group name (default "sfx"). */
    group?: string;
    /** Custom tag for mass-stopping or identifying sounds. */
    tag?: string;
}

/** Alias for backward compat */
export type SoundParams = SynthOptions;

/** Options for playing audio clips. */
export interface PlayOptions {
    /** Volume level, 0-1. */
    volume?: number;
    /** Stereo pan, -1 left to 1 right. */
    pan?: number;
    /** Pitch scaling factor. */
    pitch?: number;
    /** Whether to loop the clip. */
    loop?: boolean;
    /** Audio group name. */
    group?: string;
    /** Custom tag for identification. */
    tag?: string;
}

// ═════════════════════════════════════════════════════════════════════════════
// AudioHandle - live control of a playing sound
// ═════════════════════════════════════════════════════════════════════════════

/** Handle for controlling a playing sound in real time. */
export class AudioHandle {
    /** @internal */
    _voice: Voice | null = null;
    _done = false;

    /** True once the sound has finished playing (naturally or via stop). */
    get done(): boolean {
        return this._done;
    }

    /** The group this sound belongs to. */
    get group(): string {
        return this._voice?.group ?? "";
    }

    /** The tag this sound was created with. */
    get tag(): string {
        return this._voice?.tag ?? "";
    }

    /** Callback when the sound finishes. */
    onEnd?: () => void;

    /** Immediately stop the sound. */
    stop(): void {
        this._voice?.stop();
    }

    /** Set playback volume (0-1). */
    setVolume(v: number): void {
        if (this._voice) this._voice.gain.gain.value = clamp(v, 0, 1);
    }

    /** Set stereo pan (-1 left, 0 center, 1 right). */
    setPan(p: number): void {
        if (this._voice) this._voice.panNode.pan.value = clamp(p, -1, 1);
    }

    /** Set playback rate / pitch shift. */
    setPitch(p: number): void {
        this._voice?.setPitch(p);
    }

    /** Fade to a target volume over duration in seconds. */
    fadeTo(vol: number, duration: number): void {
        const v = this._voice;
        if (!v) return;
        const ctx = v.ctx;
        const now = ctx.currentTime;
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(clamp(vol, 0, 1), now + duration);
    }

    /** Fade out to silence over duration in seconds, then stop. */
    fadeOut(duration: number): void {
        const v = this._voice;
        if (!v) return;
        const ctx = v.ctx;
        const now = ctx.currentTime;
        v.gain.gain.cancelScheduledValues(now);
        v.gain.gain.setValueAtTime(v.gain.gain.value, now);
        v.gain.gain.linearRampToValueAtTime(0, now + duration);
        // Schedule stop slightly after ramp completion
        v.source.stop(now + duration + 0.05);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Voice - internal tracking of a single active sound
// ═════════════════════════════════════════════════════════════════════════════

export class Voice {
    readonly ctx: AudioContext;
    readonly source: AudioScheduledSourceNode;
    readonly gain: GainNode;
    readonly panNode: StereoPannerNode;
    readonly handle: AudioHandle;
    readonly startedAt: number;
    readonly group: string;
    readonly tag: string;
    loop: boolean;
    /** Base oscillator frequency (for setPitch on synth sounds) */
    _baseFreq: number = 0;

    constructor(
        ctx: AudioContext,
        source: AudioScheduledSourceNode,
        gain: GainNode,
        panNode: StereoPannerNode,
        handle: AudioHandle,
        group: string,
        tag: string,
        loop: boolean,
    ) {
        this.ctx = ctx;
        this.source = source;
        this.gain = gain;
        this.panNode = panNode;
        this.handle = handle;
        this.startedAt = ctx.currentTime;
        this.group = group;
        this.tag = tag;
        this.loop = loop;
    }

    setPitch(p: number): void {
        const v = Math.max(0.01, p);
        if ("playbackRate" in this.source) {
            (this.source as AudioBufferSourceNode).playbackRate.value = v;
        } else if (this._baseFreq > 0) {
            (this.source as OscillatorNode).frequency.value =
                this._baseFreq * v;
        }
    }

    stop(): void {
        try {
            this.source.stop();
        } catch {
            // May already have ended
        }
        try {
            this.source.disconnect();
        } catch {}
        try {
            this.gain.disconnect();
        } catch {}
        try {
            this.panNode.disconnect();
        } catch {}
        this.handle._done = true;
        this.handle._voice = null;
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// AudioClip - loaded sound buffer with convenient play()
// ═════════════════════════════════════════════════════════════════════════════

/** Loaded audio clip wrapper. */
export class AudioClip {
    /** Raw AudioBuffer containing audio data. */
    readonly buffer: AudioBuffer;
    /** Duration of the clip in seconds. */
    readonly duration: number;

    constructor(buffer: AudioBuffer) {
        this.buffer = buffer;
        this.duration = buffer.duration;
    }

    /** Play this audio clip. */
    play(opts?: PlayOptions): AudioHandle {
        return playAudio(this, opts);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// AudioManager - voice pool, groups, master volume, tags
// ═════════════════════════════════════════════════════════════════════════════

const DEFAULT_GROUPS = ["sfx", "music", "ambient"] as const;

/** Manages audio context, active voices, groups, and volumes. */
export class AudioManager {
    /** The Web Audio API context. */
    ctx: AudioContext | null = null;
    /** The master GainNode. */
    masterGain: GainNode | null = null;
    /** The master volume level (0-1). */
    masterVolume = 1;
    /** Whether the audio context is unlocked. */
    unlocked = false;

    /** Maximum active voices allowed simultaneously. */
    maxVoices = 32;

    private _voices: Voice[] = [];
    private _groupGains = new Map<string, GainNode>();
    private _groupVolumes = new Map<string, number>();

    // ── Lifecycle ──────────────────────────────────────────────────────

    /** Initialize and resume the audio context. */
    init(): AudioContext {
        if (!this.ctx) {
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.ctx.destination);

            // Create default group gain nodes
            for (const g of DEFAULT_GROUPS) {
                this._ensureGroup(g, 1);
            }
        }

        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }

        return this.ctx;
    }

    /** Unlock the audio context on user interaction. */
    unlock(): void {
        if (this.unlocked) return;
        this.unlocked = true;
        this.init();
    }

    /** Stop all sounds and clean up audio resources. */
    destroy(): void {
        this.stopAll();
        if (this.ctx) {
            try {
                this.ctx.close();
            } catch {}
        }
        this.ctx = null;
        this.masterGain = null;
        this._groupGains.clear();
        this._groupVolumes.clear();
        this._voices.length = 0;
    }

    // ── Volume / Groups ────────────────────────────────────────────────

    /** Set the master volume level (0-1). */
    setMasterVolume(v: number): void {
        this.masterVolume = v;
        if (this.masterGain) this.masterGain.gain.value = v;
    }

    /** Get the current master volume level. */
    getMasterVolume(): number {
        return this.masterVolume;
    }

    /** Set the volume level for a specific group. */
    setGroupVolume(group: string, vol: number): void {
        this._groupVolumes.set(group, vol);
        const gn = this._ensureGroup(group, vol);
        gn.gain.value = vol;
    }

    /** Get the volume level of a specific group. */
    getGroupVolume(group: string): number {
        return this._groupVolumes.get(group) ?? 1;
    }

    // ── Stop ───────────────────────────────────────────────────────────

    /** Stop all active sounds. */
    stopAll(): void {
        for (const v of [...this._voices]) v.stop();
        this._voices.length = 0;
    }

    /** Stop all active sounds with a matching tag. */
    stopSoundsWithTag(tag: string): void {
        for (const v of this._voices) {
            if (v.tag === tag) v.stop();
        }
    }

    // ── Stats ──────────────────────────────────────────────────────────

    /** Get the number of currently active voices. */
    get activeVoiceCount(): number {
        return this._voices.length;
    }

    // ── Internal ────────────────────────────────────────────────────────

    _ensureGroup(group: string, defaultVol: number): GainNode {
        let gn = this._groupGains.get(group);
        if (!gn && this.masterGain) {
            gn = this.ctx!.createGain();
            gn.gain.value = defaultVol;
            gn.connect(this.masterGain);
            this._groupGains.set(group, gn);
            if (!this._groupVolumes.has(group)) {
                this._groupVolumes.set(group, defaultVol);
            }
        }
        return gn!;
    }

    _addVoice(voice: Voice): void {
        this._voices.push(voice);

        // Voice stealing
        if (this._voices.length > this.maxVoices) {
            for (const v of this._voices) {
                if (!v.loop) {
                    v.stop();
                    break;
                }
            }
        }

        // Cleanup on natural end
        voice.source.onended = () => {
            this._removeVoice(voice);
            voice.handle._done = true;
            voice.handle._voice = null;
            const cb = voice.handle.onEnd;
            voice.handle.onEnd = undefined;
            cb?.();
        };
    }

    _removeVoice(voice: Voice): void {
        const idx = this._voices.indexOf(voice);
        if (idx >= 0) this._voices.splice(idx, 1);
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Module-level state
// ═════════════════════════════════════════════════════════════════════════════

let globalAudioManager: AudioManager | null = null;

/** Get the global AudioManager instance. */
export function getAudioManager(): AudioManager {
    if (activeEngine?.audioManager) return activeEngine.audioManager;
    if (!globalAudioManager) globalAudioManager = new AudioManager();
    return globalAudioManager;
}

function ensureCtx(): AudioContext | null {
    const mgr = getAudioManager();
    const ctx = mgr.init();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
}

// ═════════════════════════════════════════════════════════════════════════════
// Noise buffer cache
// ═════════════════════════════════════════════════════════════════════════════

let _noiseBuffer: AudioBuffer | null = null;

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (_noiseBuffer && _noiseBuffer.sampleRate === ctx.sampleRate)
        return _noiseBuffer;
    const sr = ctx.sampleRate;
    const len = sr * 0.5;
    const buf = ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    _noiseBuffer = buf;
    return buf;
}

// ═════════════════════════════════════════════════════════════════════════════
// Play: Synthesized sounds
// ═════════════════════════════════════════════════════════════════════════════

/** Play a synthesized sound. */
export function playSound(params: SynthOptions): AudioHandle {
    const mgr = getAudioManager();
    const ctx = ensureCtx();
    if (!ctx) {
        const h = new AudioHandle();
        h._done = true;
        return h;
    }

    const now = ctx.currentTime;
    const wave = params.wave ?? "square";
    const frequency = params.frequency ?? 440;
    const frequencySlide = params.frequencySlide ?? 0;
    const attack = params.attack ?? 0.01;
    const decay = params.decay ?? 0.1;
    const sustain = params.sustain ?? 0;
    const hold = params.hold ?? 0;
    const release = params.release ?? 0.1;
    const volume = clamp(params.volume ?? 0.3, 0, 1);
    const pan = clamp(params.pan ?? 0, -1, 1);
    const pitch = params.pitch ?? 1;
    const group = params.group ?? "sfx";
    const tag = params.tag ?? "";

    // Calculate total duration for stop scheduling
    // sustain is used as sustain level AND as additional hold time (backward compat)
    const dur = attack + decay + hold + release;
    const finalDur = Math.max(dur, 0.01);

    // Nodes
    const gain = ctx.createGain();
    const panNode = ctx.createStereoPanner();
    panNode.pan.value = pan;

    // Connect: source → gain → pan → groupGain → masterGain
    const groupGain = mgr._ensureGroup(group, 1);
    gain.connect(panNode);
    panNode.connect(groupGain);

    // Source
    let source: AudioScheduledSourceNode;

    if (wave === "noise") {
        const ns = ctx.createBufferSource();
        ns.buffer = getNoiseBuffer(ctx);
        ns.loop = true;
        source = ns;
    } else {
        const osc = ctx.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(frequency, now);
        if (frequencySlide !== 0) {
            osc.frequency.linearRampToValueAtTime(
                frequency + frequencySlide,
                now + finalDur,
            );
        }
        if (pitch !== 1) {
            osc.frequency.value = frequency * pitch;
        }
        source = osc;
    }

    source.connect(gain);

    // ADSR envelope with proper hold phase
    // Stage 1: Attack - ramp from 0 to peak volume
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);

    // Stage 2: Decay - ramp from peak to sustain level
    gain.gain.linearRampToValueAtTime(volume * sustain, now + attack + decay);

    // Stage 3: Hold - stay at sustain level for the hold duration
    const holdEnd = now + attack + decay + hold;
    if (hold > 0) {
        gain.gain.setValueAtTime(volume * sustain, holdEnd);
    }

    // Stage 4: Release - ramp from sustain level to 0
    gain.gain.linearRampToValueAtTime(0, holdEnd + release);

    // Schedule stop
    source.start(now);
    source.stop(now + finalDur + 0.05);

    // Handle
    const handle = new AudioHandle();
    const voice = new Voice(
        ctx,
        source,
        gain,
        panNode,
        handle,
        group,
        tag,
        false,
    );

    // Store base oscillator frequency for later pitch changes
    if (wave !== "noise") {
        voice._baseFreq = frequency * pitch;
    }

    handle._voice = voice;
    mgr._addVoice(voice);

    return handle;
}

// ═════════════════════════════════════════════════════════════════════════════
// Play: Positional (synthesized)
// ═════════════════════════════════════════════════════════════════════════════

/** Play a synthesized sound with 2D panning and distance falloff. */
export function playSoundAt(
    params: SynthOptions,
    worldPos: Vec2,
    listenerPos: Vec2,
    falloff: number = 300,
): AudioHandle {
    const dx = worldPos.x - listenerPos.x;
    const dy = worldPos.y - listenerPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const pan = clamp(dx / (falloff * 0.5), -1, 1);
    const volScale = clamp(1 - dist / falloff, 0, 1);

    return playSound({
        ...params,
        volume: (params.volume ?? 0.3) * volScale,
        pan,
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Play: Loaded audio clips
// ═════════════════════════════════════════════════════════════════════════════

/** Play an audio clip. */
export function playAudio(clip: AudioClip, opts?: PlayOptions): AudioHandle {
    const mgr = getAudioManager();
    const ctx = ensureCtx();
    if (!ctx) {
        const h = new AudioHandle();
        h._done = true;
        return h;
    }

    const now = ctx.currentTime;
    const volume = clamp(opts?.volume ?? 1, 0, 1);
    const pan = clamp(opts?.pan ?? 0, -1, 1);
    const pitch = opts?.pitch ?? 1;
    const loop = opts?.loop ?? false;
    const group = opts?.group ?? "sfx";
    const tag = opts?.tag ?? "";

    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = loop;
    source.playbackRate.value = pitch;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    const panNode = ctx.createStereoPanner();
    panNode.pan.value = pan;

    const groupGain = mgr._ensureGroup(group, 1);
    source.connect(gain);
    gain.connect(panNode);
    panNode.connect(groupGain);

    source.start(now);

    const handle = new AudioHandle();
    const voice = new Voice(
        ctx,
        source,
        gain,
        panNode,
        handle,
        group,
        tag,
        loop,
    );
    handle._voice = voice;
    mgr._addVoice(voice);

    return handle;
}

// ═════════════════════════════════════════════════════════════════════════════
// Load audio files
// ═════════════════════════════════════════════════════════════════════════════

const _clipCache = new Map<string, AudioClip>();

/** Load and cache an audio file from a URL. */
export function loadAudio(url: string): Promise<AudioClip> {
    // Return from cache if available
    const cached = _clipCache.get(url);
    if (cached) return Promise.resolve(cached);

    const ctx = ensureCtx()!;
    return fetch(url)
        .then((r) => {
            if (!r.ok)
                throw new Error(`Failed to load audio: ${url} (${r.status})`);
            return r.arrayBuffer();
        })
        .then((buf) => ctx.decodeAudioData(buf))
        .then((ab) => {
            const clip = new AudioClip(ab);
            _clipCache.set(url, clip);
            return clip;
        });
}

// ═════════════════════════════════════════════════════════════════════════════
// Mass stop
// ═════════════════════════════════════════════════════════════════════════════

/** Stop all active sounds. */
export function stopAll(): void {
    getAudioManager().stopAll();
}

/** Stop all active sounds with a specific tag. */
export function stopSoundsWithTag(tag: string): void {
    getAudioManager().stopSoundsWithTag(tag);
}

// ═════════════════════════════════════════════════════════════════════════════
// Backward-compatible API
// ═════════════════════════════════════════════════════════════════════════════

/** Initialize the audio context. */
export function initAudio(): AudioContext {
    return getAudioManager().init();
}

/** Unlock the audio context. */
export function unlockAudio(): void {
    getAudioManager().unlock();
}

/** Get the current AudioContext. */
export function getAudioContext(): AudioContext | null {
    return getAudioManager().ctx;
}

/** Set the master volume level (0-1). */
export function setMasterVolume(volume: number): void {
    getAudioManager().setMasterVolume(volume);
}

/** Get the master volume level. */
export function getMasterVolume(): number {
    return getAudioManager().getMasterVolume();
}

/**
 * Play a loaded AudioBuffer directly (legacy).
 * Prefer using playAudio or AudioClip.play.
 */
export function playLoadedAudio(
    buffer: AudioBuffer,
    options?: {
        volume?: number;
        pan?: number;
        loop?: boolean;
    },
): AudioHandle {
    return playAudio(new AudioClip(buffer), options);
}

/** Consume and return the global AudioManager, resetting the reference. */
export function consumeGlobalAudioManager(): AudioManager | null {
    const mgr = globalAudioManager;
    globalAudioManager = null;
    return mgr;
}

// ═════════════════════════════════════════════════════════════════════════════
// Sequencer - pattern-based music tracker
// ═════════════════════════════════════════════════════════════════════════════

/** A single note event in a pattern. */
export interface TimedNote {
    /** Beat position (0-indexed within the pattern). */
    beat: number;
    /** MIDI note number (e.g. 60 = C4). */
    note: number;
    /** Note duration in beats. */
    duration: number;
    /** Note velocity / volume level (0-1). */
    velocity?: number;
    /** Frequency slide in Hz. */
    slide?: number;
}

/** A named pattern of timed notes spanning a number of bars. */
export class Pattern {
    /** Name of the pattern. */
    readonly name: string;
    /** Array of timed notes. */
    readonly notes: TimedNote[];
    /** Number of bars in the pattern. */
    readonly bars: number;
    /** Number of beats in each bar. */
    readonly beatsPerBar: number;

    constructor(
        name: string,
        notes: TimedNote[],
        bars: number = 1,
        beatsPerBar: number = 4,
    ) {
        this.name = name;
        this.notes = notes;
        this.bars = bars;
        this.beatsPerBar = beatsPerBar;
    }

    /** Total beats in the pattern. */
    get totalBeats(): number {
        return this.bars * this.beatsPerBar;
    }
}

/** Track definition mapping a pattern to an instrument. */
export interface TrackDef {
    /** Name of the pattern referenced by this track. */
    pattern: string;
    /** Waveform type. */
    wave?: WaveType;
    /** Track volume level (0-1). */
    volume?: number;
    /** Track stereo pan (-1 left to 1 right). */
    pan?: number;
    /** Pitch offset in semitones. */
    pitchOffset?: number;
}

/** Convert a MIDI note number to frequency in Hz. */
export function midiToFreq(note: number): number {
    return 440 * Math.pow(2, (note - 69) / 12);
}

/**
 * Pattern-based music sequencer.
 *
 * Uses the synth engine internally - call `update(dt)` each frame.
 *
 * @example
 * ```ts
 * const seq = new Sequencer(140);
 * seq.addPattern(new Pattern('bass', [
 *   { beat: 0, note: 36, duration: 1 },
 *   { beat: 1, note: 43, duration: 1 },
 *   { beat: 2, note: 40, duration: 1 },
 *   { beat: 3, note: 38, duration: 1 },
 * ], 1));
 * seq.addTrack({ pattern: 'bass', wave: 'square', volume: 0.3 });
 * seq.play();
 * // in update loop:
 * seq.update(dt);
 * ```
 */
export class Sequencer {
    /** Beats per minute. */
    bpm: number;
    /** Whether to loop when all patterns finish. */
    loop: boolean = true;

    /** Registered patterns. */
    readonly patterns = new Map<string, Pattern>();
    /** Tracks in the sequence. */
    readonly tracks: TrackDef[] = [];

    /** True while the sequencer is actively playing. */
    playing: boolean = false;

    /** Current absolute beat position. */
    currentBeat: number = 0;

    /** Current bar (0-indexed). */
    currentBar: number = 0;

    /** Fired on each beat. */
    onBeat?: (beat: number, bar: number) => void;
    /** Fired on each bar boundary. */
    onBar?: (bar: number) => void;
    /** Fired when playback reaches the end (only if loop is false). */
    onFinish?: () => void;

    private _lastNoteIdx: number[] = [];
    private _activeHandles: AudioHandle[] = [];
    private _lastBeatInt: number = -1;

    constructor(bpm: number = 120) {
        this.bpm = bpm;
    }

    /** Register a pattern. */
    addPattern(pattern: Pattern): void {
        this.patterns.set(pattern.name, pattern);
    }

    /** Add a track referencing a named pattern. */
    addTrack(track: TrackDef): void {
        this.tracks.push(track);
        this._lastNoteIdx.push(0);
    }

    /** Remove a track by index. */
    removeTrack(index: number): void {
        this.tracks.splice(index, 1);
        this._lastNoteIdx.splice(index, 1);
    }

    /** Start playback from the beginning. */
    play(): void {
        this.playing = true;
        this.currentBeat = 0;
        this.currentBar = 0;
        this._lastBeatInt = -1;
        this._lastNoteIdx = this.tracks.map(() => 0);
        this._activeHandles = [];

        // Fire beat 0 immediately
        this.onBeat?.(0, 0);
        this._lastBeatInt = 0;
    }

    /** Stop playback and silence all active notes. */
    stop(): void {
        this.playing = false;
        this.currentBeat = 0;
        this.currentBar = 0;
        this._lastBeatInt = -1;

        // Kill all active notes
        for (const h of this._activeHandles) {
            h.stop();
        }
        this._activeHandles = [];
    }

    /**
     * Advance the sequencer by dt seconds.
     * Call this every frame from your game loop.
     */
    update(dt: number): void {
        if (!this.playing) return;

        const prevBeat = this.currentBeat;
        this.currentBeat += dt * (this.bpm / 60);

        const tb = this.totalBeats;
        let wrapped = false;

        if (this.currentBeat >= tb) {
            if (this.loop) {
                this.currentBeat -= tb;
                this.currentBar = 0;
                this._lastNoteIdx = this.tracks.map(() => 0);
                wrapped = true;
            } else {
                this.playing = false;
                this.onFinish?.();
                return;
            }
        }

        // Fire notes: handle wrap-around by scheduling in two segments
        if (wrapped) {
            this._fireNotesBetween(prevBeat, tb);
            this._fireNotesBetween(-0.001, this.currentBeat);
        } else {
            this._fireNotesBetween(prevBeat, this.currentBeat);
        }

        // Beat callback
        this._beatCallback(this.currentBeat);

        // Bar callback
        const bar = Math.floor(this.currentBeat / 4);
        if (bar !== this.currentBar) {
            this.currentBar = bar;
            this.onBar?.(bar);
        }

        // Clean finished handles
        this._activeHandles = this._activeHandles.filter((h) => !h.done);
    }

    /** Total beats of the longest pattern in the sequence. */
    get totalBeats(): number {
        let maxB = 0;
        for (const track of this.tracks) {
            const pat = this.patterns.get(track.pattern);
            if (pat && pat.totalBeats > maxB) maxB = pat.totalBeats;
        }
        return maxB || 16;
    }

    /** Fire any notes that should start between prevBeat and currentBeat. */
    private _fireNotesBetween(prevBeat: number, currBeat: number): void {
        for (let t = 0; t < this.tracks.length; t++) {
            const track = this.tracks[t];
            const pattern = this.patterns.get(track.pattern);
            if (!pattern) continue;

            const notes = pattern.notes;
            let idx = this._lastNoteIdx[t];

            while (idx < notes.length) {
                const note = notes[idx];
                // note.beat is already an absolute position within the pattern
                const absBeat = note.beat;

                if (absBeat >= currBeat) break;

                if (absBeat >= prevBeat) {
                    this._fireNote(track, note);
                    this._lastNoteIdx[t] = idx + 1;
                }

                idx++;
            }
        }
    }

    private _fireNote(track: TrackDef, note: TimedNote): void {
        const freq = midiToFreq(note.note + (track.pitchOffset ?? 0));
        const vol = (note.velocity ?? 0.3) * (track.volume ?? 1);

        // Convert note duration from beats to seconds
        const durSec = (note.duration * 60) / this.bpm;

        // ADSR: quick attack, slight dip to sustain level, hold for body, release at end
        const att = 0.004;
        const dec = 0.02;
        const susLevel = 0.85; // sustain at 85% volume for body
        const bodySec = Math.max(durSec - 0.1, 0); // hold time = note duration minus attack/decay/release overhead
        const rel = Math.min(durSec * 0.3 + 0.02, 0.6); // release fade proportional to note

        const handle = playSound({
            wave: track.wave ?? "square",
            frequency: freq,
            frequencySlide: note.slide,
            volume: vol,
            pan: track.pan,
            attack: att,
            decay: dec,
            sustain: susLevel,
            hold: bodySec,
            release: rel,
            group: "music",
            tag: "sequencer",
        });

        this._activeHandles.push(handle);
    }

    private _beatCallback(beat: number): void {
        const beatInt = Math.floor(beat);
        if (beatInt !== this._lastBeatInt) {
            this._lastBeatInt = beatInt;
            this.onBeat?.(beatInt, Math.floor(beatInt / 4));
        }
    }
}
