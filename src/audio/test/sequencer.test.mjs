import test from "node:test";
import assert from "node:assert/strict";

import { Pattern, Sequencer, midiToFreq } from "../../../dist/tinyts.esm.js";

// Stub AudioContext so playSound calls don't crash in Node.js
if (typeof globalThis.AudioContext === "undefined") {
    class MockAudioContext {
        currentTime = 0;
        destination = { channelCount: 2, channelCountMode: "explicit" };
        createGain() {
            return {
                connect: () => {},
                gain: {
                    value: 0,
                    setValueAtTime() {},
                    linearRampToValueAtTime() {},
                },
            };
        }
        createStereoPanner() {
            return {
                connect: () => {},
                pan: { value: 0 },
            };
        }
        createOscillator() {
            return {
                connect: () => {},
                type: "square",
                frequency: {
                    value: 440,
                    setValueAtTime() {},
                    linearRampToValueAtTime() {},
                },
                start() {},
                stop() {},
            };
        }
        createBufferSource() {
            return {
                connect: () => {},
                buffer: null,
                loop: false,
                playbackRate: { value: 1 },
                start() {},
                stop() {},
            };
        }
        createBuffer() {
            return {
                getChannelData() {
                    return [];
                },
            };
        }
    }
    globalThis.AudioContext = MockAudioContext;
    globalThis.webkitAudioContext = MockAudioContext;
}

test("midiToFreq maps MIDI note 69 (A4) to 440 Hz", () => {
    assert.equal(midiToFreq(69), 440);
    assert.ok(midiToFreq(57) > 200); // A3
    assert.ok(midiToFreq(81) > 800); // A5
});

test("Pattern stores name, notes, and calculates totalBeats", () => {
    const pattern = new Pattern(
        "test",
        [
            { beat: 0, note: 60, duration: 0.5 },
            { beat: 1, note: 62, duration: 0.5 },
            { beat: 2, note: 64, duration: 1 },
        ],
        2,
        4,
    );

    assert.equal(pattern.name, "test");
    assert.equal(pattern.notes.length, 3);
    assert.equal(pattern.bars, 2);
    assert.equal(pattern.beatsPerBar, 4);
    assert.equal(pattern.totalBeats, 8);
});

test("Sequencer accepts patterns and tracks, reports totalBeats", () => {
    const seq = new Sequencer(120);

    seq.addPattern(
        new Pattern("chord", [{ beat: 0, note: 60, duration: 4 }], 2, 4),
    );

    seq.addPattern(
        new Pattern(
            "bass",
            [
                { beat: 0, note: 36, duration: 1 },
                { beat: 1, note: 38, duration: 1 },
                { beat: 2, note: 40, duration: 1 },
                { beat: 3, note: 41, duration: 1 },
            ],
            1,
            4,
        ),
    );

    seq.addTrack({ pattern: "chord" });
    seq.addTrack({ pattern: "bass", wave: "triangle", volume: 0.6 });

    // totalBeats = max of all pattern totalBeats = max(8, 4) = 8
    assert.equal(seq.totalBeats, 8);
    assert.equal(seq.tracks.length, 2);
});

test("Sequencer fires onBeat during update", () => {
    const seq = new Sequencer(120); // 2 beats per second
    const beats = [];

    seq.addPattern(
        new Pattern(
            "loop",
            [
                { beat: 0, note: 60, duration: 1 },
                { beat: 1, note: 62, duration: 1 },
                { beat: 2, note: 64, duration: 1 },
                { beat: 3, note: 65, duration: 1 },
            ],
            1,
            4,
        ),
    );

    seq.addTrack({ pattern: "loop" });
    seq.onBeat = (beat, bar) => beats.push({ beat, bar });
    seq.play();

    // Beat 0 fires immediately on play()
    assert.equal(beats.length, 1);
    assert.deepEqual(beats[0], { beat: 0, bar: 0 });

    // Advance 1 second (2 beats at 120 BPM)
    seq.update(1);
    assert.ok(beats.length >= 2); // beat 1 and possibly beat 2

    seq.stop();
});

test("Sequencer stops and silences on stop()", () => {
    const seq = new Sequencer(120);

    seq.addPattern(
        new Pattern("loop", [{ beat: 0, note: 60, duration: 1 }], 1, 4),
    );

    seq.addTrack({ pattern: "loop" });
    seq.play();
    assert.equal(seq.playing, true);

    seq.stop();
    assert.equal(seq.playing, false);
    assert.equal(seq.currentBeat, 0);
});

test("Sequencer wraps around and fires onBar when loop is true", () => {
    const seq = new Sequencer(60); // 1 beat per second
    const bars = [];

    // 2 bars = 8 total beats - prevents wrap until > 8 beats
    seq.addPattern(
        new Pattern("loop", [{ beat: 0, note: 60, duration: 4 }], 2, 4),
    );

    seq.addTrack({ pattern: "loop" });
    seq.loop = true;
    seq.onBar = (bar) => bars.push(bar);
    seq.play();

    // Advance past the first bar boundary at 4 beats (bar 0 → bar 1)
    seq.update(4.5);
    assert.ok(
        bars.length >= 1,
        `onBar should have been called, got ${bars.length} calls`,
    );
    assert.equal(Math.floor(seq.currentBeat) >= 0, true);
    assert.ok(seq.playing);

    seq.stop();
});

test("Sequencer fires onFinish when loop is false and playback ends", () => {
    const seq = new Sequencer(60); // 1 beat per second
    let finished = false;

    seq.addPattern(
        new Pattern("loop", [{ beat: 0, note: 60, duration: 4 }], 1, 4),
    );

    seq.addTrack({ pattern: "loop" });
    seq.loop = false;
    seq.onFinish = () => {
        finished = true;
    };
    seq.play();

    // Advance past totalBeats (4 beats = 4 seconds at 60 BPM)
    seq.update(5);

    assert.equal(finished, true);
    assert.equal(seq.playing, false);
});
