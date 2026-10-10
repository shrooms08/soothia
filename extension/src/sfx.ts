// Sound effects, synthesized with the Web Audio API: bell and celesta tones
// built from inharmonic partials, pentatonic notes in a high register, a
// shared soft reverb, and a little sparkle dust. No files, no libraries,
// unless the optional "files" style is dropped into public/sfx/.
//
// One AudioContext per page. It is created, and resumed, on the first
// pointer/key/touch gesture (capture phase, on the window and inside our
// shadow root). A sound asked for while the context is still suspended is
// queued, one at a time, and played right after resume if it is fresh.

export type SoundName = "found" | "open" | "marketLive" | "betPlaced" | "softError";
export type SfxStyle = "musicbox" | "celesta" | "chimes" | "files";
export const SOUND_NAMES: SoundName[] = ["found", "open", "marketLive", "betPlaced", "softError"];
export const SYNTH_STYLES: SfxStyle[] = ["musicbox", "celesta", "chimes"];
export const DEFAULT_STYLE = "celesta" satisfies SfxStyle;

const MASTER_VOLUME = 0.25;
const FLOOR = 0.0001;
const PENDING_MAX_AGE_MS = 1500;
const REVERB_SECONDS = 1.6;

export interface AudioState {
  context: "not created" | "suspended" | "running" | "closed" | "interrupted";
  muted: boolean;
  style: SfxStyle;
  /** Last sound played, or why it was skipped. */
  last: string;
}

let context: AudioContext | null = null;
let master: GainNode | null = null;
let reverbSend: GainNode | null = null;
let muted = false;
let style: SfxStyle = DEFAULT_STYLE;
let last = "–";
let pending: { name: SoundName; at: number } | null = null;
const armedRoots = new WeakSet<EventTarget>();
const listeners = new Set<(state: AudioState) => void>();
/** Lets the welcome page duck its music when a sound plays. */
let onPlay: (() => void) | null = null;

function notify(): void {
  const state = getAudioState();
  for (const listener of listeners) listener(state);
}

export function getAudioState(): AudioState {
  return { context: context ? (context.state as AudioState["context"]) : "not created", muted, style, last };
}

export function onAudioState(listener: (state: AudioState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDuckHook(hook: (() => void) | null): void {
  onPlay = hook;
}

export function getContext(): AudioContext | null {
  return context;
}

/** A 1.6s decaying-noise impulse with a gentle high cut, for the shared reverb. */
function impulse(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let smooth = 0;
    for (let i = 0; i < length; i++) {
      const decay = Math.pow(1 - i / length, 2.6);
      // One-pole low-pass on the noise softens the top end.
      smooth += (Math.random() * 2 - 1 - smooth) * 0.35;
      data[i] = smooth * decay;
    }
  }
  return buffer;
}

function ensureContext(): AudioContext | null {
  if (context) return context;
  try {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    const reverb = context.createConvolver();
    reverb.buffer = impulse(context);
    reverbSend = context.createGain();
    reverbSend.gain.value = 0.3;
    reverbSend.connect(reverb).connect(master);
  } catch {
    context = null;
  }
  notify();
  return context;
}

function wake(): void {
  const ctx = ensureContext();
  if (!ctx || ctx.state === "running") return;
  ctx.resume().then(
    () => {
      notify();
      if (pending && Date.now() - pending.at <= PENDING_MAX_AGE_MS) playSound(pending.name);
      pending = null;
    },
    () => {},
  );
}

/** Watches for gestures on `root` (the window, or our shadow root). */
export function armSounds(root: EventTarget = window): void {
  if (armedRoots.has(root)) return;
  armedRoots.add(root);
  for (const type of ["pointerdown", "keydown", "touchstart"]) {
    root.addEventListener(type, wake, { capture: true, passive: true });
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  notify();
}

export function isMuted(): boolean {
  return muted;
}

export function setStyle(value: SfxStyle): void {
  style = value;
  notify();
}

export function getStyle(): SfxStyle {
  return style;
}

// ---- Synthesis ----

// C major pentatonic from C6: semitones above C6 for degrees 0..9.
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
const C6 = 1046.5;

function pitch(degree: number): number {
  return C6 * Math.pow(2, PENTATONIC[Math.max(0, Math.min(PENTATONIC.length - 1, degree))] / 12);
}

const humanSeconds = (): number => (Math.random() * 2 - 1) * 0.012;
const cents = (): number => (Math.random() * 2 - 1) * 8;

export interface Timbre {
  /** Inharmonic partial ratios of a struck bell. */
  ratios: number[];
  /** Relative gain per partial. */
  gains: number[];
  /** How much of the base decay each partial keeps (uppers die faster). */
  partialDecay: number[];
  attack: number;
  /** Base decay in seconds, scaled per note. */
  decay: number;
  reverb: number;
  dust: boolean;
}

const TIMBRES: Record<Exclude<SfxStyle, "files">, Timbre> = {
  // Plucked, delicate, short, a touch of tine brightness.
  musicbox: { ratios: [1, 2.76, 5.4, 8.93], gains: [1, 0.42, 0.18, 0.06], partialDecay: [1, 0.55, 0.3, 0.18], attack: 0.004, decay: 0.42, reverb: 0.25, dust: false },
  // Brighter, clear bells.
  celesta: { ratios: [1, 2.76, 5.4, 8.93], gains: [1, 0.55, 0.3, 0.12], partialDecay: [1, 0.6, 0.35, 0.2], attack: 0.008, decay: 0.7, reverb: 0.32, dust: true },
  // Airy, dreamy, lots of shimmer.
  chimes: { ratios: [1, 2.76, 5.4, 8.93], gains: [1, 0.5, 0.35, 0.16], partialDecay: [1, 0.7, 0.5, 0.35], attack: 0.012, decay: 1.4, reverb: 0.45, dust: true },
};

export interface Note {
  degree: number;
  /** Seconds after the sound starts. */
  at: number;
  gain?: number;
  /** Multiplies the timbre's decay. */
  length?: number;
  /** Multiplies upper-partial gains: lower for warmth. */
  bright?: number;
}

/** One bell: a few inharmonic sine partials, each with its own envelope. */
function bell(ctx: BaseAudioContext, out: AudioNode, timbre: Timbre, freq: number, at: number, gain: number, length: number, bright: number): void {
  const detune = cents();
  const start = Math.max(ctx.currentTime, at + humanSeconds());
  for (const [index, ratio] of timbre.ratios.entries()) {
    const partialGain = gain * timbre.gains[index] * (index === 0 ? 1 : bright);
    if (partialGain < 0.004) continue;
    const decay = timbre.decay * length * timbre.partialDecay[index];
    const env = ctx.createGain();
    env.gain.setValueAtTime(FLOOR, start);
    env.gain.linearRampToValueAtTime(partialGain, start + timbre.attack);
    env.gain.exponentialRampToValueAtTime(FLOOR, start + timbre.attack + decay);
    env.connect(out);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq * ratio;
    osc.detune.value = detune;
    osc.connect(env);
    osc.start(start);
    osc.stop(start + timbre.attack + decay + 0.05);
  }
}

/** A handful of very quiet, very high pentatonic pings over about 250ms. */
function dust(ctx: BaseAudioContext, out: AudioNode, timbre: Timbre, at: number): void {
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const degree = 6 + Math.floor(Math.random() * 4);
    bell(ctx, out, timbre, pitch(degree), at + Math.random() * 0.25, 0.05, 0.35, 0.5);
  }
}

const PHRASES: Record<SoundName, Note[]> = {
  // Three notes rising, like a star appearing: G6 C7 E7.
  found: [{ degree: 3, at: 0 }, { degree: 5, at: 0.09 }, { degree: 7, at: 0.18, gain: 0.8 }],
  // One tiny bell: A6.
  open: [{ degree: 4, at: 0, gain: 0.7, length: 0.7 }],
  // C6 D6 E6 G6 A6 C7, then a bright E7 with sparkle.
  marketLive: [
    { degree: 0, at: 0 }, { degree: 1, at: 0.11 }, { degree: 2, at: 0.22 }, { degree: 3, at: 0.33 },
    { degree: 4, at: 0.44 }, { degree: 5, at: 0.55, gain: 0.9 }, { degree: 7, at: 0.7, gain: 0.8, length: 1.3 },
  ],
  // Root, major third, fifth: C6 E6 G6, warm.
  betPlaced: [{ degree: 0, at: 0, bright: 0.5, length: 1.2 }, { degree: 2, at: 0.18, bright: 0.5, length: 1.2 }, { degree: 3, at: 0.36, bright: 0.55, length: 1.5 }],
  // Two soft bells stepping down, an octave below the main register.
  softError: [{ degree: 1, at: 0, gain: 0.55, bright: 0.35, length: 1.1 }, { degree: 0, at: 0.28, gain: 0.5, bright: 0.3, length: 1.4 }],
};

const OCTAVE: Partial<Record<SoundName, number>> = { softError: 0.5 };

function synth(ctx: BaseAudioContext, name: SoundName, timbre: Timbre, into: AudioNode, send: AudioNode): void {
  const dry = ctx.createGain();
  dry.gain.value = 1;
  dry.connect(into);
  const wet = ctx.createGain();
  wet.gain.value = timbre.reverb;
  wet.connect(send);
  const out = ctx.createGain();
  out.connect(dry);
  out.connect(wet);

  const now = ctx.currentTime + 0.02;
  const octave = OCTAVE[name] ?? 1;
  let end = 0;
  for (const note of PHRASES[name]) {
    bell(ctx, out, timbre, pitch(note.degree) * octave, now + note.at, (note.gain ?? 0.6) * 0.5, note.length ?? 1, note.bright ?? 1);
    end = Math.max(end, note.at);
  }
  if (timbre.dust && (name === "found" || name === "marketLive")) dust(ctx, out, timbre, now + end);
}

// ---- Optional audio files (public/sfx/<sound>.mp3 or .wav) ----

const fileBuffers = new Map<SoundName, AudioBuffer | null>();
let filesAvailable: boolean | null = null;

function fileUrl(name: SoundName, ext: string): string {
  return typeof chrome !== "undefined" && chrome.runtime?.getURL ? chrome.runtime.getURL(`sfx/${name}.${ext}`) : `sfx/${name}.${ext}`;
}

/**
 * True when public/sfx/open.mp3 (or .wav) ships with the extension. Looked
 * up through the package directory, so a missing file logs nothing.
 */
export async function filesStyleAvailable(): Promise<boolean> {
  if (filesAvailable !== null) return filesAvailable;
  filesAvailable = false;
  const runtime = (typeof chrome !== "undefined" ? chrome.runtime : undefined) as
    | { getPackageDirectoryEntry?: (callback: (root: FileSystemDirectoryEntry) => void) => void }
    | undefined;
  if (!runtime?.getPackageDirectoryEntry) return false;
  const root = await new Promise<FileSystemDirectoryEntry | null>((resolve) => {
    try {
      runtime.getPackageDirectoryEntry!((entry) => resolve(entry));
    } catch {
      resolve(null);
    }
  });
  if (!root) return false;
  for (const ext of ["mp3", "wav"]) {
    const found = await new Promise<boolean>((resolve) => root.getFile(`sfx/open.${ext}`, {}, () => resolve(true), () => resolve(false)));
    if (found) {
      filesAvailable = true;
      break;
    }
  }
  return filesAvailable;
}

async function playFile(ctx: AudioContext, name: SoundName): Promise<boolean> {
  if (!master) return false;
  if (!fileBuffers.has(name)) {
    fileBuffers.set(name, null);
    for (const ext of ["mp3", "wav"]) {
      try {
        const response = await fetch(fileUrl(name, ext));
        if (!response.ok) continue;
        fileBuffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
        break;
      } catch {
        // Try the next extension.
      }
    }
  }
  const buffer = fileBuffers.get(name);
  if (!buffer) return false;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(master);
  source.start();
  return true;
}

// ---- Public ----

/** Plays a sound in the chosen style, or in `override`. */
export function playSound(name: SoundName, override?: SfxStyle): void {
  const chosen = override ?? style;
  try {
    if (muted) {
      last = `${name} skipped: muted`;
      notify();
      return;
    }
    const ctx = ensureContext();
    if (!ctx || !master || !reverbSend) {
      last = `${name} skipped: no audio`;
      notify();
      return;
    }
    if (ctx.state !== "running") {
      pending = { name, at: Date.now() };
      last = `${name} queued: ${ctx.state}`;
      notify();
      return;
    }
    onPlay?.();
    if (chosen === "files") {
      const into = master;
      const send = reverbSend;
      void playFile(ctx, name).then((played) => {
        if (!played) synth(ctx, name, TIMBRES[DEFAULT_STYLE], into, send);
      });
    } else {
      synth(ctx, name, TIMBRES[chosen as Exclude<SfxStyle, "files">], master, reverbSend);
    }
    last = `${name} (${chosen})`;
    notify();
  } catch {
    last = `${name} failed`;
    notify();
  }
}

/** Test hook: the synth internals, so envelopes can be checked without a browser. */
export const __synth = { TIMBRES, PHRASES, synth, FLOOR };
