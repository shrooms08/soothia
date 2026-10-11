// Run with `npm test`. Drives the synth with a recording stand-in for the
// Web Audio API: every variant of every sound must schedule without throwing,
// and no exponential ramp may target zero (Web Audio throws on that).
import assert from "node:assert/strict";
import { test } from "node:test";
import { SOUND_NAMES, SYNTH_STYLES, __synth } from "../src/sfx";

interface Ramp {
  kind: "linear" | "exponential" | "set";
  value: number;
  time: number;
}

function fakeContext(): { ctx: BaseAudioContext; ramps: Ramp[]; nodes: number } {
  const ramps: Ramp[] = [];
  let nodes = 0;
  const param = () => ({
    value: 1,
    setValueAtTime: (value: number, time: number) => ramps.push({ kind: "set", value, time }),
    linearRampToValueAtTime: (value: number, time: number) => ramps.push({ kind: "linear", value, time }),
    exponentialRampToValueAtTime: (value: number, time: number) => ramps.push({ kind: "exponential", value, time }),
  });
  const node = () => {
    nodes++;
    const self = {
      connect: () => self,
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      gain: param(),
      frequency: param(),
      detune: param(),
      type: "sine",
    };
    return self;
  };
  const ctx = { currentTime: 1, createGain: node, createOscillator: node } as unknown as BaseAudioContext;
  return {
    ctx,
    ramps,
    get nodes() {
      return nodes;
    },
  };
}

test("every sound in every style schedules nodes without errors", () => {
  for (const style of SYNTH_STYLES) {
    for (const name of SOUND_NAMES) {
      const fake = fakeContext();
      const into = fake.ctx.createGain();
      const send = fake.ctx.createGain();
      assert.doesNotThrow(() =>
        __synth.synth(fake.ctx, name, __synth.TIMBRES[style as keyof typeof __synth.TIMBRES], into, send),
      );
      assert.ok(fake.nodes > 4, `${style}/${name} made ${fake.nodes} nodes`);
    }
  }
});

test("no exponential ramp targets zero, every envelope starts at the floor and attacks within 15ms", () => {
  for (const style of SYNTH_STYLES) {
    for (const name of SOUND_NAMES) {
      const fake = fakeContext();
      __synth.synth(
        fake.ctx,
        name,
        __synth.TIMBRES[style as keyof typeof __synth.TIMBRES],
        fake.ctx.createGain(),
        fake.ctx.createGain(),
      );
      const exponential = fake.ramps.filter((ramp) => ramp.kind === "exponential");
      assert.ok(exponential.length > 0);
      for (const ramp of exponential) assert.ok(ramp.value > 0, `${style}/${name} ramps to ${ramp.value}`);
      for (const ramp of fake.ramps.filter((r) => r.kind === "set")) assert.equal(ramp.value, __synth.FLOOR);
      // Each envelope: set(floor) then linear(peak) within 15ms.
      const sets = fake.ramps.filter((r) => r.kind === "set");
      const linears = fake.ramps.filter((r) => r.kind === "linear");
      assert.equal(sets.length, linears.length);
      for (const [index, set] of sets.entries()) assert.ok(linears[index].time - set.time <= 0.015);
    }
  }
});

test("marketLive stays under about 1.4 seconds of scheduled notes", () => {
  const notes = __synth.PHRASES.marketLive;
  const lastAt = Math.max(...notes.map((note) => note.at));
  assert.ok(lastAt + __synth.TIMBRES.celesta.decay * 1.3 <= 1.7, "last note plus decay");
  assert.ok(notes.length >= 5 && notes.length <= 7);
});
