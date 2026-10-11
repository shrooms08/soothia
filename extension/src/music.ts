// Onboarding music for welcome.html only. Never loaded by content scripts.
// Plays through the sounds' AudioContext, starts on the first gesture,
// fades in low, loops, ducks under UI sounds, and fades out on leaving.
import { getContext, isMuted, onAudioState, setDuckHook } from "./sfx";

const VOLUME = 0.14;
const FADE_IN_S = 2;
const FADE_OUT_S = 1.2;
const DUCK_S = 0.6;
const DUCK_LEVEL = 0.7;

let gain: GainNode | null = null;
let source: AudioBufferSourceNode | null = null;
let buffer: AudioBuffer | null = null;
let playing = false;
let stopping = false;

function ramp(target: number, seconds: number): void {
  const ctx = getContext();
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(Math.max(0.0001, gain.gain.value), now);
  gain.gain.linearRampToValueAtTime(Math.max(0.0001, target), now + seconds);
}

export function isMusicPlaying(): boolean {
  return playing && !stopping;
}

/** Starts (or restarts) the loop; safe to call before the context is running. */
export async function startMusic(url: string): Promise<boolean> {
  const ctx = getContext();
  if (!ctx || ctx.state !== "running" || playing) return playing;
  try {
    if (!buffer) buffer = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
    if (!gain) {
      gain = ctx.createGain();
      gain.gain.value = 0.0001;
      gain.connect(ctx.destination);
    }
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    playing = true;
    stopping = false;
    ramp(isMuted() ? 0.0001 : VOLUME, FADE_IN_S);
    return true;
  } catch {
    return false;
  }
}

export function stopMusic(fadeSeconds = FADE_OUT_S): void {
  if (!playing || stopping) return;
  stopping = true;
  ramp(0.0001, fadeSeconds);
  const ending = source;
  setTimeout(
    () => {
      try {
        ending?.stop();
      } catch {
        // Already stopped.
      }
      if (source === ending) {
        source = null;
        playing = false;
        stopping = false;
      }
    },
    fadeSeconds * 1000 + 50,
  );
}

/** Dips the music briefly under a UI sound. */
function duck(): void {
  if (!playing || stopping || isMuted()) return;
  const ctx = getContext();
  if (!ctx || !gain) return;
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(VOLUME * DUCK_LEVEL, now + 0.05);
  gain.gain.linearRampToValueAtTime(VOLUME, now + DUCK_S);
}

/** Wires ducking and the shared mute. Call once on the welcome page. */
export function installMusicHooks(): void {
  setDuckHook(duck);
  onAudioState((state) => {
    if (playing && !stopping) ramp(state.muted ? 0.0001 : VOLUME, 0.3);
  });
}
