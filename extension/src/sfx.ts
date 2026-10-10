// Sound effects, synthesized with the Web Audio API: no files, no libraries.
// Everything is soft and glassy. The AudioContext is created lazily on the
// first user gesture; when the browser keeps it suspended (autoplay policy)
// sounds are skipped silently.

export type SoundName = "found" | "open" | "marketLive" | "betPlaced" | "softError";

const MASTER_VOLUME = 0.25;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let armed = false;

function ensureContext(): AudioContext | null {
  if (context) return context;
  try {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    return context;
  } catch {
    return null;
  }
}

/** Creates the context on the first gesture inside `root` (or the page). */
export function armSounds(root: EventTarget = document): void {
  if (armed) return;
  armed = true;
  const wake = (): void => {
    const ctx = ensureContext();
    if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  };
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    root.addEventListener(type, wake, { capture: true, passive: true });
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

interface Note {
  /** Hz */
  freq: number;
  /** Seconds after the sound starts. */
  at: number;
  /** Seconds to fade out. */
  decay: number;
  gain?: number;
  type?: OscillatorType;
  /** Second oscillator a few cents off, for a glassy shimmer. */
  detune?: number;
}

function play(notes: Note[], options: { lowpass?: number; echo?: boolean } = {}): void {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx || !master || ctx.state !== "running") return;

  let out: AudioNode = master;
  if (options.lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = options.lowpass;
    filter.connect(master);
    out = filter;
  }
  if (options.echo) {
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.18;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(master);
    const split = ctx.createGain();
    split.connect(out);
    split.connect(delay);
    out = split;
  }

  const now = ctx.currentTime;
  for (const note of notes) {
    const start = now + note.at;
    const peak = note.gain ?? 0.5;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(peak, start + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0008, start + note.decay);
    env.connect(out);
    for (const detune of note.detune ? [0, note.detune] : [0]) {
      const osc = ctx.createOscillator();
      osc.type = note.type ?? "sine";
      osc.frequency.value = note.freq;
      osc.detune.value = detune;
      osc.connect(env);
      osc.start(start);
      osc.stop(start + note.decay + 0.05);
    }
  }
}

const SOUNDS: Record<SoundName, () => void> = {
  // Two quick high notes and a faint sparkle tail, as the stars appear.
  found: () =>
    play(
      [
        { freq: 1318.5, at: 0, decay: 0.35, gain: 0.4, detune: 6 },
        { freq: 1760, at: 0.07, decay: 0.45, gain: 0.4, detune: 6 },
        { freq: 2637, at: 0.16, decay: 0.7, gain: 0.12, type: "triangle" },
      ],
      { echo: true },
    ),
  // A tiny glassy tink.
  open: () => play([{ freq: 1568, at: 0, decay: 0.16, gain: 0.35, detune: 8 }]),
  // A rising sparkly arpeggio: C5 E5 G5 C6 E6.
  marketLive: () =>
    play(
      [523.25, 659.25, 783.99, 1046.5, 1318.5].map((freq, index) => ({
        freq,
        at: index * 0.09,
        decay: 0.5 + index * 0.08,
        gain: 0.38,
        detune: 5,
      })),
      { echo: true },
    ),
  // A warm two-note chime: G5 then C6.
  betPlaced: () =>
    play(
      [
        { freq: 783.99, at: 0, decay: 0.5, gain: 0.45, type: "triangle" },
        { freq: 1046.5, at: 0.16, decay: 0.7, gain: 0.45, type: "triangle" },
      ],
      { lowpass: 2200, echo: true },
    ),
  // One soft low note.
  softError: () => play([{ freq: 220, at: 0, decay: 0.45, gain: 0.4 }], { lowpass: 900 }),
};

export function playSound(name: SoundName): void {
  try {
    SOUNDS[name]();
  } catch {
    // A sound is never worth an error.
  }
}
